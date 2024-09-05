import { CwXrplInterface } from "@oraichain/xrpl-bridge-contracts-sdk";
import { Operation } from "@oraichain/xrpl-bridge-contracts-sdk/build/CwXrpl.types";
import { time, WebhookClient } from "discord.js";
import { decode } from "ripple-binary-codec";
import { multisign, Signer, SubmittableTransaction } from "xrpl";
import { XRPL_ERROR_CODE, XRPLTxResult } from "../constants";
import { BridgeSigners, RelayerAction, XrplClient } from "../type";
import XRPLRpcClient from "../xrpl/xrpl_rpc";
import {
  buildSignerListSetTxForMultiSigning,
  buildTicketCreateTxForMultiSigning,
  buildToXRPLXRPLOriginatedTokenTransferPaymentTxForMultiSigning,
  buildTrustSetTxForMultiSigning,
} from "./orai-to-xrpl-operation-tx";

export default class OraiToXrpl implements RelayerAction {
  constructor(
    protected readonly cwXrplClient: CwXrplInterface,
    protected readonly xrplClient: XrplClient,
    protected readonly bridgeXRPLAddress: string,
    protected readonly webhookClient?: WebhookClient
  ) {}

  // process pending operations
  async takeAction() {
    try {
      let pendingOps = await this.cwXrplClient.pendingOperations({});
      if (pendingOps.operations.length == 0) {
        console.log("No pending operations to process");
        return;
      }

      console.log("Pending operations: ", pendingOps.operations.length);

      let bridgeSigners = await this.getBridgeSigners();

      for (let operation of pendingOps.operations) {
        const date: Date = new Date();
        try {
          let res = await this.signOrSubmitOperation(operation, bridgeSigners);
          console.log(res);
          await this.webhookClient.send(
            `:receipt:` + res + ` at ${time(date)}`
          );
        } catch (error) {
          await this.webhookClient.send(
            `:red_circle:` + error + ` at ${time(date)}`
          );
          // continue handle other operation
          console.log(
            `Error handle operation ${JSON.stringify(
              operation
            )}, got error: ${error}`
          );
        }
      }
    } catch (error) {
      console.error(
        "error querying unprocessed transactions orai to xrpl: ",
        error
      );
      // try reconnect
      await this.xrplClient.client.connect();
      return;
    }
  }

  async getBridgeSigners(): Promise<BridgeSigners> {
    const [xrplWeights, xrplWeightsQuorum] =
      await this.getBridgeXRPLSignerAccountsWithWeights();
    const contractConfig = await this.cwXrplClient.config();

    const xrplPubKeys: { [account: string]: string } = {};
    const oraiToXRPLAccount: { [account: string]: string } = {};
    for (const relayer of contractConfig.relayers) {
      const xrplAcc = relayer.xrpl_address;
      const accPubKey = relayer.xrpl_pub_key;

      xrplPubKeys[xrplAcc] = accPubKey;
      oraiToXRPLAccount[relayer.cosmos_address] = xrplAcc;
    }

    return {
      XRPLWeights: xrplWeights,
      XRPLWeightsQuorum: xrplWeightsQuorum,
      XRPLPubKeys: xrplPubKeys,
      OraiToXRPLAccount: oraiToXRPLAccount,
    };
  }

  async getBridgeXRPLSignerAccountsWithWeights(): Promise<
    [
      {
        [account: string]: number;
      },
      number
    ]
  > {
    const accountInfo = await XRPLRpcClient.accountInfo(
      this.xrplClient.client,
      this.bridgeXRPLAddress
    );

    const signerList = accountInfo.result.signer_lists;

    if (signerList.length != 1) {
      throw new Error("received unexpected length of the signer list");
    }
    const signerData = accountInfo.result.signer_lists[0];
    const weightsQuorum = signerData.SignerQuorum;
    const accountWeights: { [account: string]: number } = {};
    for (let signerEntry of signerData.SignerEntries) {
      accountWeights[signerEntry.SignerEntry.Account] =
        signerEntry.SignerEntry.SignerWeight;
    }

    return [accountWeights, weightsQuorum];
  }

  async signOrSubmitOperation(
    operation: Operation,
    bridgeSigners: BridgeSigners
  ): Promise<string> {
    const valid = await this.preValidateOperation(operation);

    if (!valid) {
      console.log("Operation is invalid", operation);
      console.log("Sending invalid tx evidence");
      let txHash = (
        await this.cwXrplClient.saveEvidence({
          evidence: {
            xrpl_transaction_result: {
              transaction_result: "invalid",
              account_sequence: operation.account_sequence,
            },
          },
        })
      ).transactionHash;
      let res = `Success send invalid tx evidence, operations: ${JSON.stringify(
        operation
      )}, txHash: ${txHash}`;
      return res;
    }
    console.log(
      `Pre-validation of the operation passed, operation is valid, operation, ${JSON.stringify(
        operation
      )})`
    );

    let [tx, quorumIsReached] = await this.buildSubmittableTransaction(
      operation,
      bridgeSigners
    );

    if (!quorumIsReached) {
      return await this.registerTxSignature(operation);
    }

    // submit tx to XRPL chain
    const txRes = await this.xrplClient.client.submit(multisign([tx]));
    if (txRes.result.engine_result == XRPLTxResult.Success) {
      let res = `XRPL multi-sign transaction has been successfully submitted, txHash: ${txRes.result.tx_json.hash}`;
      return res;
    }

    // These codes indicate that the transaction failed, but it was applied to a ledger to apply the transaction cost.
    if (
      txRes.result.engine_result.startsWith(XRPL_ERROR_CODE.TecTxResultPrefix)
    ) {
      let res = `The transaction has been sent, but will be reverted, code: ${txRes.result.engine_result}`;
      return res;
    }

    let res;
    switch (txRes.result.engine_result) {
      case XRPLTxResult.TefNO_TICKET:
      case XRPLTxResult.TefPAST_SEQ:
        res = "Transaction has been already submitted";
        break;
      case XRPLTxResult.TelINSUF_FEE_P:
        res =
          "The Fee from the transaction is not high enough to meet the server's current transaction cost requirement.";
        break;
      default:
        res = `failed to submit transaction, received unexpected result, code:${JSON.stringify(
          txRes
        )}, tx: ${JSON.stringify(tx)}`;
    }
    return res;
  }

  // preValidateOperation checks if the operation is valid, and it makes sense to submit the corresponding transaction
  // or the operation should be canceled with the `invalid` state. For now the main purpose of the function is to filter
  // out the `AllocateTickets` operation with the invalid sequence.
  async preValidateOperation(operation: Operation): Promise<boolean> {
    // no need to check if the current relayer has already provided the signature
    // this check prevents the state when relayer votes and then changes its vote because of different current state
    for (const signature of operation.signatures) {
      if (signature.relayer_cosmos_address == this.xrplClient.relayerAddr) {
        return true;
      }
    }

    // currently we validate only the allocate tickets operation with not zero sequence
    if (
      !("allocate_tickets" in operation.operation_type) ||
      !operation.operation_type.allocate_tickets.number ||
      !operation.account_sequence
    ) {
      return true;
    }

    let bridgeXRPLAccInfo = await XRPLRpcClient.accountInfo(
      this.xrplClient.client,
      this.bridgeXRPLAddress
    );
    // sequence is valid
    if (
      bridgeXRPLAccInfo.result.account_data.Sequence ==
      operation.account_sequence
    ) {
      return true;
    }
    console.log(
      `Invalid bridge account sequence, expected ${bridgeXRPLAccInfo.result.account_data.Sequence}, inOperation ${operation.account_sequence}`
    );
    return false;
  }

  async buildSubmittableTransaction(
    operation: Operation,
    bridgeSigners: BridgeSigners
  ): Promise<[SubmittableTransaction, boolean]> {
    const txSigners: Signer[] = [];
    let signedWeight = 0;
    let signingThresholdIsReached = false;

    for (const signature of operation.signatures) {
      if (
        !(signature.relayer_cosmos_address in bridgeSigners.OraiToXRPLAccount)
      ) {
        console.log(
          `Found unknown signer, oraiAddress: ${signature.relayer_cosmos_address}`
        );
        continue;
      }
      const xrplAcc =
        bridgeSigners.OraiToXRPLAccount[signature.relayer_cosmos_address];
      if (!(xrplAcc in bridgeSigners.XRPLPubKeys)) {
        console.log(
          `Found orai signer address without pub key in the contract, xrplAddress: ${xrplAcc})`
        );
        continue;
      }
      const xrplPubKey = bridgeSigners.XRPLPubKeys[xrplAcc];

      if (!(xrplAcc in bridgeSigners.XRPLWeights)) {
        console.log(
          `Found orai signer address without weight, xrplAddress: ${xrplAcc})`
        );
        continue;
      }
      const xrplAccWeight = bridgeSigners.XRPLWeights[xrplAcc];

      const txSigner: Signer = {
        Signer: {
          Account: xrplAcc,
          TxnSignature: signature.signature,
          SigningPubKey: xrplPubKey,
        },
      };

      // TODO: validate tx signatures of other signer

      txSigners.push(txSigner);
      signedWeight += xrplAccWeight;
      // the fewer signatures we use the less fee we pay
      if (signedWeight >= bridgeSigners.XRPLWeightsQuorum) {
        signingThresholdIsReached = true;
        break;
      }
    }

    // quorum is not reached
    if (!signingThresholdIsReached) {
      return [undefined, false];
    }
    // build tx one more time to be sure that it is not affected
    const tx = this.buildXRPLTxFromOperation(operation);

    tx.Signers = txSigners;

    return [tx, true];
  }

  async registerTxSignature(operation: Operation): Promise<string> {
    const tx = this.buildXRPLTxFromOperation(operation);

    // sign and submit signatures to contract bridge
    const decodedData: any = decode(
      this.xrplClient.wallet.sign(tx, this.bridgeXRPLAddress).tx_blob
    );
    const signers: Signer[] = Array.isArray(decodedData?.Signers)
      ? decodedData.Signers
      : [];
    if (signers.length === 0)
      throw new Error("Empty signer to sign transaction relaying to XRPL");

    let txHas = (
      await this.cwXrplClient.saveSignature({
        operationId: this.getOperationId(operation),
        operationVersion: operation.version,
        signature: signers[0].Signer.TxnSignature,
      })
    ).transactionHash;

    let res = `Success save signature for operation, ${JSON.stringify(
      operation
    )}, txHash: ${txHas}`;
    return res;
  }

  buildXRPLTxFromOperation(operation: Operation) {
    switch (true) {
      case this.isAllocateTicketsOperation(operation):
        return buildTicketCreateTxForMultiSigning(
          this.bridgeXRPLAddress,
          operation
        );
      case this.isTrustSetOperation(operation):
        return buildTrustSetTxForMultiSigning(
          this.bridgeXRPLAddress,
          operation
        );
      case this.isCosmosToXRPLTransferOperation(operation):
        return buildToXRPLXRPLOriginatedTokenTransferPaymentTxForMultiSigning(
          this.bridgeXRPLAddress,
          operation
        );
      case this.isRotateKeysOperation(operation):
        return buildSignerListSetTxForMultiSigning(
          this.bridgeXRPLAddress,
          operation
        );
      default:
      // handle default case if needed
    }
  }

  isAllocateTicketsOperation(operation: Operation): boolean {
    return (
      "allocate_tickets" in operation.operation_type &&
      operation.operation_type.allocate_tickets.number > 0
    );
  }

  isTrustSetOperation(operation: Operation): boolean {
    return (
      "trust_set" in operation.operation_type &&
      !!operation.operation_type.trust_set.issuer &&
      !!operation.operation_type.trust_set.currency
    );
  }

  isCosmosToXRPLTransferOperation(operation: Operation): boolean {
    return (
      "cosmos_to_xrpl_transfer" in operation.operation_type &&
      !!operation.operation_type.cosmos_to_xrpl_transfer.issuer &&
      !!operation.operation_type.cosmos_to_xrpl_transfer.currency &&
      operation.operation_type.cosmos_to_xrpl_transfer.amount != "0" &&
      !!operation.operation_type.cosmos_to_xrpl_transfer.recipient
    );
  }

  isRotateKeysOperation(operation: Operation): boolean {
    return (
      "rotate_keys" in operation.operation_type &&
      operation.operation_type.rotate_keys.new_relayers.length != 0 &&
      operation.operation_type.rotate_keys.new_evidence_threshold > 0
    );
  }

  getOperationId(operation: Operation): number {
    return operation.ticket_sequence
      ? operation.ticket_sequence
      : operation.account_sequence;
  }
}
