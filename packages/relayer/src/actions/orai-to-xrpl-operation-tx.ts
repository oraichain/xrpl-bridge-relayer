import { Operation } from "@oraichain/xrpl-bridge-contracts-sdk/build/CwXrpl.types";
import {
  Amount,
  Payment,
  SignerEntry,
  SignerListSet,
  TicketCreate,
  TrustSet,
} from "xrpl";
import { getMultisigningFee } from "../xrpl/fee";

// BuildTicketCreateTxForMultiSigning builds TicketCreate transaction operation from the contract operation.
export function buildTicketCreateTxForMultiSigning(
  bridgeXRPLAddress: string,
  operation: Operation
) {
  if (!("allocate_tickets" in operation.operation_type)) {
    throw new Error("Invalid operation type, expected allocate_tickets");
  }
  const tx: TicketCreate = {
    TicketCount: operation.operation_type.allocate_tickets.number,
    TransactionType: "TicketCreate",
    Account: bridgeXRPLAddress,
  };

  if (operation.ticket_sequence) {
    tx.TicketSequence = operation.ticket_sequence;
  } else {
    tx.Sequence = operation.account_sequence;
  }

  //   important for the multi-signing
  tx.SigningPubKey = "";
  tx.Sequence = 0;

  tx.Fee = getMultisigningFee(operation.xrpl_base_fee).toFixed(0);

  return tx;
}

// BuildTrustSetTxForMultiSigning builds TrustSet transaction operation from the contract operation.
export function buildTrustSetTxForMultiSigning(
  bridgeXRPLAddress: string,
  operation: Operation
) {
  if (!("trust_set" in operation.operation_type)) {
    throw new Error("Invalid operation type, expected trust_set");
  }
  const trustSetType = operation.operation_type.trust_set;

  const tx: TrustSet = {
    TransactionType: "TrustSet",
    LimitAmount: {
      value: trustSetType.trust_set_limit_amount,
      currency: trustSetType.currency,
      issuer: trustSetType.issuer,
    },
    Account: bridgeXRPLAddress,
  };
  tx.TicketSequence = operation.ticket_sequence;
  // important for the multi-signing
  tx.SigningPubKey = "";
  tx.Sequence = 0;

  tx.Fee = getMultisigningFee(operation.xrpl_base_fee).toFixed(0);

  return tx;
}

// BuildOraiToXRPLXRPLOriginatedTokenTransferPaymentTxForMultiSigning builds Payment transaction for
// XRPL originated token from the contract operation.
export function buildToXRPLXRPLOriginatedTokenTransferPaymentTxForMultiSigning(
  bridgeXRPLAddress: string,
  operation: Operation
) {
  if (!("cosmos_to_xrpl_transfer" in operation.operation_type)) {
    throw new Error("Invalid operation type, expected trust_set");
  }
  const oraiToXRPLTransferOperationType =
    operation.operation_type.cosmos_to_xrpl_transfer;

  const amount: Amount =
    oraiToXRPLTransferOperationType.currency == "XRP"
      ? oraiToXRPLTransferOperationType.amount
      : {
          value: oraiToXRPLTransferOperationType.amount,
          currency: oraiToXRPLTransferOperationType.currency,
          issuer: oraiToXRPLTransferOperationType.issuer,
        };

  // if the max amount was provided set it or use nil
  let maxAmount: Amount;
  if (oraiToXRPLTransferOperationType.max_amount) {
    maxAmount =
      oraiToXRPLTransferOperationType.currency == "XRP"
        ? oraiToXRPLTransferOperationType.max_amount
        : {
            value: oraiToXRPLTransferOperationType.max_amount,
            currency: oraiToXRPLTransferOperationType.currency,
            issuer: oraiToXRPLTransferOperationType.issuer,
          };
  }

  const tx = buildPaymentTx(bridgeXRPLAddress, operation, amount, maxAmount);

  return tx;
}

// BuildSignerListSetTxForMultiSigning builds SignerListSet transaction operation from the contract operation.
export function buildSignerListSetTxForMultiSigning(
  bridgeXRPLAddress: string,
  operation: Operation
) {
  if (!("rotate_keys" in operation.operation_type)) {
    throw new Error("Invalid operation type, expected rotate_keys");
  }
  const rotateKeysOperationType = operation.operation_type.rotate_keys;

  const signerEntries: SignerEntry[] = [];

  for (const relayer of rotateKeysOperationType.new_relayers) {
    const xrplRelayerAddress = relayer.xrpl_address;
    signerEntries.push({
      SignerEntry: {
        Account: xrplRelayerAddress,
        SignerWeight: 1,
      },
    });
  }

  const tx: SignerListSet = {
    SignerQuorum: rotateKeysOperationType.new_evidence_threshold,

    Account: bridgeXRPLAddress,
    TransactionType: "SignerListSet",

    SignerEntries: signerEntries,
  };
  if (operation.ticket_sequence) {
    tx.TicketSequence = operation.ticket_sequence;
  } else {
    tx.Sequence = operation.account_sequence;
  }
  // important for the multi-signing
  tx.SigningPubKey = "";
  tx.Sequence = 0;

  tx.Fee = getMultisigningFee(operation.xrpl_base_fee).toFixed(0);

  return tx;
}

export function buildPaymentTx(
  bridgeXRPLAddress: string,
  operation: Operation,
  amount: Amount,
  maxAmount: Amount
) {
  if (!("cosmos_to_xrpl_transfer" in operation.operation_type)) {
    throw new Error("Invalid operation type, expected trust_set");
  }
  const recipient = operation.operation_type.cosmos_to_xrpl_transfer.recipient;
  const tx: Payment = {
    Destination: recipient,
    Account: bridgeXRPLAddress,
    TransactionType: "Payment",
    Amount: amount,
    SendMax: maxAmount,
  };
  tx.TicketSequence = operation.ticket_sequence;
  // important for the multi-signing
  tx.SigningPubKey = "";
  tx.Sequence = 0;

  tx.Fee = getMultisigningFee(operation.xrpl_base_fee).toFixed(0);
  return tx;
}
