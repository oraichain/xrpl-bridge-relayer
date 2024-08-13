import { CwXrplClient } from "@oraichain/xrpl-bridge-contracts-sdk";
import {
  Evidence,
  TransactionResult,
} from "@oraichain/xrpl-bridge-contracts-sdk/build/CwXrpl.types";
import { XrplClient, XRPLTxResult } from "src/type";
import { decodeOraiRecipientFromMemo } from "src/xrpl/memo";
import {
  isCreatedNode,
  IssuedCurrencyAmount,
  Payment,
  TransactionAndMetadata,
  TransactionMetadataBase,
} from "xrpl";

export default class XrplToOrai {
  constructor(
    protected readonly cwXrplClient: CwXrplClient,
    protected readonly xrplClient: XrplClient,
    protected readonly bridgeXRPLAddress: string
  ) {}

  async start() {}

  async processTx(tx: TransactionAndMetadata) {
    if (!this.txIsFinal(tx)) {
      console.log(
        `Transaction is not final, txStatus:  ${tx.metadata.TransactionResult})`
      );
      return;
    }

    if (this.bridgeXRPLAddress == tx.transaction.Account) {
      return this.processOutgoingTx(tx);
    }
    return this.processIncomingTx(tx);
  }

  async processIncomingTx(tx: TransactionAndMetadata) {
    const txType = tx.transaction.TransactionType;
    if (tx.metadata.TransactionResult != XRPLTxResult.Success) {
      console.log(
        ` Skipping not successful transaction,type: ${txType}, txResult:  ${tx.metadata.TransactionResult})`
      );
      return;
    }

    console.log(`Start processing of XRPL incoming tx, type: ${txType}`);
    // we process only incoming payment transactions, other transactions are ignored
    if (txType != "Payment") {
      console.log(`Skipping not payment transaction, type: ${txType}`);
      return;
    }
    const paymentTx: Payment = tx.transaction;
    const oraiRecipient = decodeOraiRecipientFromMemo(paymentTx.Memos);
    if (oraiRecipient == "") {
      console.log(
        `Bridge memo does not include expected structure, memos: ${paymentTx.Memos})`
      );
      return;
    }

    const deliveredXRPLAmount = tx.metadata
      .DeliveredAmount as IssuedCurrencyAmount;
    // TODO: convert to oraiAmount
    const oraiAmount = deliveredXRPLAmount.value;
    if (oraiAmount == "0") {
      console.log("Nothing to send, amount is zero");
      return;
    }

    const evidence: Evidence = {
      xrpl_to_cosmos_transfer: {
        amount: oraiAmount,
        currency: deliveredXRPLAmount.currency,
        issuer: deliveredXRPLAmount.issuer,
        recipient: oraiRecipient,
        tx_hash: tx.transaction.AccountTxnID, // FIXME: use tx_hash instead of accountTxnId
      },
    };

    let txRes = await this.cwXrplClient.saveEvidence({ evidence });

    // TODO: check teRes
    console.log("Success save evidence");
  }

  async processOutgoingTx(tx: TransactionAndMetadata) {
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
        console.log(`Skipped expected tx type, txType: ${txType}, tx: ${tx})`);
        return;
      default:
        console.log(`Found unexpected transaction type, tx: ${tx}`);
        return;
    }
  }

  async sendXRPLTicketsAllocationTransactionResultEvidence(
    tx: TransactionAndMetadata
  ) {
    const tickets = this.extractTicketSequencesFromMetaData(tx.metadata);
    const txResult = this.getTransactionResult(tx);

    const evidence: Evidence = {
      xrpl_transaction_result: {
        transaction_result: txResult,
        tx_hash: tx.transaction.AccountTxnID,
        operation_result: {
          tickets_allocation: { tickets },
        },
      },
    };

    if (tx.transaction.Sequence != 0) {
      evidence.xrpl_transaction_result.account_sequence =
        tx.transaction.Sequence;
    }
    if (tx.transaction?.TicketSequence != 0) {
      evidence.xrpl_transaction_result.ticket_sequence =
        tx.transaction.TicketSequence;
    }

    let txRes = await this.cwXrplClient.saveEvidence({ evidence });

    // TODO: verify txResponse
    return;
  }

  async sendXRPLTrustSetTransactionResultEvidence(tx: TransactionAndMetadata) {
    const evidence: Evidence = {
      xrpl_transaction_result: {
        transaction_result: this.getTransactionResult(tx),
        tx_hash: tx.transaction.AccountTxnID,
        ticket_sequence: tx.transaction.TicketSequence,
      },
    };

    let txRes = await this.cwXrplClient.saveEvidence({ evidence });

    // TODO: verify txResponse
    return;
  }

  async sendOraiToXRPLTransferTransactionResultEvidence(
    tx: TransactionAndMetadata
  ) {
    const evidence: Evidence = {
      xrpl_transaction_result: {
        transaction_result: this.getTransactionResult(tx),
        tx_hash: tx.transaction.AccountTxnID,
        ticket_sequence: tx.transaction.TicketSequence,
      },
    };

    let txRes = await this.cwXrplClient.saveEvidence({ evidence });

    // TODO: verify txResponse
    return;
  }

  async sendKeysRotationTransactionResultEvidence(tx: TransactionAndMetadata) {
    if (!tx.transaction.Signers || tx.transaction.Signers.length == 0) {
      console.log(
        `Skipping the evidence sending for the tx, since the SignerListSet tx was sent initially for the bridge bootstrapping. tx: ${tx}`
      );
      return;
    }
    const evidence: Evidence = {
      xrpl_transaction_result: {
        transaction_result: this.getTransactionResult(tx),
        tx_hash: tx.transaction.AccountTxnID,
      },
    };

    if (tx.transaction?.TicketSequence != 0) {
      evidence.xrpl_transaction_result.ticket_sequence =
        tx.transaction.TicketSequence;
    }

    let txRes = await this.cwXrplClient.saveEvidence({ evidence });

    // TODO: verify txResponse
    return;
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
    // TODO: detect a tx is final
    return true;
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

      if ("ticket" != createdNode.LedgerEntryType) {
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
}
