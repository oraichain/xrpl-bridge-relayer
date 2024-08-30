import { CwXrplInterface } from "@oraichain/xrpl-bridge-contracts-sdk";
import {
  Evidence,
  TransactionResult,
} from "@oraichain/xrpl-bridge-contracts-sdk/build/CwXrpl.types";
import { time, WebhookClient } from "discord.js";
import {
  isCreatedNode,
  Payment,
  TransactionAndMetadata,
  TransactionMetadataBase,
} from "xrpl";
import { XRPL_ERROR_CODE, XRPLTxResult } from "../constants";
import {
  RelayerAction,
  XrplClient,
  XrplTransactionAndMetadataWrap,
} from "../type";
import { convertAmountToIssuedCurrencyAmount } from "../xrpl/currency";
import { decodeOraiRecipientFromMemo } from "../xrpl/memo";
import XRPLScanner from "../xrpl/scanner";

export default class XrplToOrai implements RelayerAction {
  scanners: XRPLScanner;
  constructor(
    protected readonly cwXrplClient: CwXrplInterface,
    protected readonly xrplClient: XrplClient,
    protected readonly bridgeXRPLAddress: string,
    minLedger: number = -1,
    protected readonly webhookClient?: WebhookClient
  ) {
    this.scanners = new XRPLScanner(
      xrplClient.client,
      bridgeXRPLAddress,
      minLedger
    );
  }

  withXRPLScanner(xrplScanner: XRPLScanner) {
    this.scanners = xrplScanner;
    return this;
  }

  // process XRPL transactions
  async takeAction() {
    try {
      const transactions = await this.scanners.scanTransactions();
      console.log("unprocessed transactions: ", transactions.length);
      // since we query our transactions from latest to earliest -> process the latest txs first
      for (const tx of transactions) {
        const date: Date = new Date();
        try {
          let res = await this.processTx(tx);
          console.log(res);
          await this.webhookClient.send(
            `:receipt:` + res + ` at ${time(date)}`
          );
        } catch (error) {
          await this.webhookClient.send(
            `:red_circle:` + error + ` at ${time(date)}`
          );
          console.error("error processing transaction: ", error);
        }
      }
    } catch (error) {
      // reset latestProcessedTxHash so we can start over to prevent missed txs in case of having errors
      console.error(
        "error querying unprocessed transactions xrpl to orai: ",
        error
      );
      // try reconnect
      await this.xrplClient.client.connect();
      return;
    }
  }

  async processTx(tx: XrplTransactionAndMetadataWrap): Promise<string> {
    if (!this.txIsFinal(tx)) {
      let res = `Transaction is not final, txStatus:  ${tx.metadata.TransactionResult})`;
      // console.log(res);
      return res;
    }

    if (this.bridgeXRPLAddress == tx.transaction.Account) {
      return this.processOutgoingTx(tx);
    }
    return this.processIncomingTx(tx);
  }

  async processIncomingTx(tx: XrplTransactionAndMetadataWrap): Promise<string> {
    const txType = tx.transaction.TransactionType;
    if (tx.metadata.TransactionResult != XRPLTxResult.Success) {
      let res = ` Skipping not successful transaction,type: ${txType}, txResult:  ${tx.metadata.TransactionResult})`;
      // console.log(res);
      return res;
    }

    console.log(`Start processing of XRPL incoming tx, type: ${txType}`);
    // we process only incoming payment transactions, other transactions are ignored
    if (txType != "Payment") {
      let res = `Skipping not payment transaction, type: ${txType}`;
      return res;
    }
    const paymentTx: Payment = tx.transaction;
    const [oraiRecipient, memo] = decodeOraiRecipientFromMemo(paymentTx.Memos);
    if (oraiRecipient == "") {
      let res = `Bridge memo does not include expected structure, memos: ${paymentTx.Memos})`;
      // console.log(res);
      return res;
    }

    const deliveredXRPLAmount = convertAmountToIssuedCurrencyAmount(
      tx.metadata.delivered_amount
    );
    const oraiAmount = deliveredXRPLAmount.value;

    if (oraiAmount == "0") {
      // console.log("Nothing to send, amount is zero");
      return "Nothing to send, amount is zero";
    }

    const evidence: Evidence = {
      xrpl_to_cosmos_transfer: {
        amount: oraiAmount,
        currency: deliveredXRPLAmount.currency,
        issuer: deliveredXRPLAmount.issuer,
        recipient: oraiRecipient,
        tx_hash: tx.hash,
        memo,
      },
    };

    let txHash = await this.saveEvidence(evidence);

    let res = `Success save evidence for tx bridge from XRPL to ORAI, txHash: ${txHash}`;
    // console.log(res);
    return res;
  }

  async processOutgoingTx(tx: XrplTransactionAndMetadataWrap): Promise<string> {
    const txType = tx.transaction.TransactionType;
    console.log(`Start processing of XRPL outgoing tx, type: ${txType})`);
    switch (txType) {
      case "TicketCreate":
        return this.sendXRPLTicketsAllocationTransactionResultEvidence(tx);
      case "TrustSet":
        return this.sendXRPLTrustSetTransactionResultEvidence(tx);
      case "Payment":
        return this.sendOraiToXRPLTransferTransactionResultEvidence(tx);
      case "SignerListSet":
        return this.sendKeysRotationTransactionResultEvidence(tx);
      case "AccountSet":
        console.log(
          `Skipped expected tx type, txType: ${txType}, tx: ${JSON.stringify(
            tx
          )})`
        );
        return "Skipped Account Set tx";
      default:
        let res = `Found unexpected transaction type, tx: ${JSON.stringify(
          tx
        )}`;
        // console.log(res);
        return res;
    }
  }

  async sendXRPLTicketsAllocationTransactionResultEvidence(
    tx: XrplTransactionAndMetadataWrap
  ): Promise<string> {
    const tickets = this.extractTicketSequencesFromMetaData(tx.metadata);
    const txResult = this.getTransactionResult(tx);

    const evidence: Evidence = {
      xrpl_transaction_result: {
        transaction_result: txResult,
        tx_hash: tx.hash,
        operation_result: {
          tickets_allocation: { tickets },
        },
      },
    };

    if (tx.transaction.Sequence) {
      evidence.xrpl_transaction_result.account_sequence =
        tx.transaction.Sequence;
    }
    if (tx.transaction?.TicketSequence) {
      evidence.xrpl_transaction_result.ticket_sequence =
        tx.transaction.TicketSequence;
    }

    let txHash = await this.saveEvidence(evidence);

    let res = `Success sendXRPLTicketsAllocationTransactionResultEvidence, txHash:${txHash}`;
    // console.log(res);
    return res;
  }

  async sendXRPLTrustSetTransactionResultEvidence(
    tx: XrplTransactionAndMetadataWrap
  ): Promise<string> {
    const evidence: Evidence = {
      xrpl_transaction_result: {
        transaction_result: this.getTransactionResult(tx),
        tx_hash: tx.hash,
        ticket_sequence: tx.transaction.TicketSequence,
      },
    };

    let txHash = await this.saveEvidence(evidence);

    let res = `Success sendXRPLTrustSetTransactionResultEvidence, txHash:${txHash}`;
    // console.log(res);
    return res;
  }

  async sendOraiToXRPLTransferTransactionResultEvidence(
    tx: XrplTransactionAndMetadataWrap
  ): Promise<string> {
    const evidence: Evidence = {
      xrpl_transaction_result: {
        transaction_result: this.getTransactionResult(tx),
        tx_hash: tx.hash,
        ticket_sequence: tx.transaction.TicketSequence,
      },
    };

    let txHash = await this.saveEvidence(evidence);

    let res = `Success sendOraiToXRPLTransferTransactionResultEvidence, txHash:${txHash}`;
    // console.log(res);
    return res;
  }

  async sendKeysRotationTransactionResultEvidence(
    tx: XrplTransactionAndMetadataWrap
  ) {
    if (!tx.transaction.Signers || tx.transaction.Signers.length == 0) {
      let res = `Skipping the evidence sending for the tx, since the SignerListSet tx was sent initially for the bridge bootstrapping`;
      // console.log(res);
      return res;
    }
    const evidence: Evidence = {
      xrpl_transaction_result: {
        transaction_result: this.getTransactionResult(tx),
        tx_hash: tx.hash,
      },
    };

    if (tx.transaction?.TicketSequence) {
      evidence.xrpl_transaction_result.ticket_sequence =
        tx.transaction.TicketSequence;
    }

    let txHash = await this.saveEvidence(evidence);
    let res = `Success sendKeysRotationTransactionResultEvidence, txHash:${txHash}`;
    // console.log(res);
    return res;
  }

  // txIsFinal returns value which indicates whether the transaction if final and can be used.
  // Result Code	 Finality.
  // tesSUCCESS	 Final when included in a validated ledger.
  // Any tec code	 Final when included in a validated ledger.
  // Any tem code	 Final unless the protocol changes to make the transaction valid.
  // tefPAST_SEQ	 Final when another transaction with the same sequence number is included in a validated ledger.
  // tefMAX_LEDGER Final when a validated ledger has a ledger index higher than the transaction's LastLedgerSequence
  // field, and no validated ledger includes the transaction.
  txIsFinal(tx: TransactionAndMetadata): boolean {
    let txResult = tx.metadata.TransactionResult;
    return (
      txResult == XRPLTxResult.Success ||
      txResult.startsWith(XRPL_ERROR_CODE.TecTxResultPrefix) ||
      txResult.startsWith(XRPL_ERROR_CODE.TemTxResultPrefix) ||
      txResult === "TefPAST_SEQ" ||
      txResult == "TefMAX_LEDGER"
    );
  }

  getTransactionResult(tx: TransactionAndMetadata): TransactionResult {
    if (tx.metadata.TransactionResult == XRPLTxResult.Success) {
      return "accepted";
    }
    return "rejected";
  }

  extractTicketSequencesFromMetaData(
    metaData: TransactionMetadataBase
  ): number[] {
    const ticketSequences: number[] = [];
    for (const node of metaData.AffectedNodes) {
      if (!isCreatedNode(node)) {
        continue;
      }
      const createdNode = node.CreatedNode;

      const newFields = createdNode.NewFields;

      if ("Ticket" != createdNode.LedgerEntryType) {
        continue;
      }
      const ticketSeq = newFields.TicketSequence;
      if (!ticketSeq) {
        continue;
      }
      ticketSequences.push(Number(ticketSeq));
    }
    return ticketSequences;
  }

  async saveEvidence(evidence: Evidence): Promise<string> {
    let numAttempts = 0;

    while (numAttempts < 3) {
      try {
        return (await this.cwXrplClient.saveEvidence({ evidence }))
          .transactionHash;
      } catch (err) {
        numAttempts++;
        if (numAttempts === 3) {
          throw new Error(err);
        }
      }
    }
  }
}
