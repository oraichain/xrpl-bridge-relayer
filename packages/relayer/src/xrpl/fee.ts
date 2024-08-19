import { XRPL_CONFIG } from "../constants";

export function getMultisigningFee(xrplBaseFee: number): number {
  // GetMultiSigningTxFee is static fee we use for the XRPL transaction submission.
  // According to https://xrpl.org/transaction-cost.html multisigned transaction require fee equal to
  // xrpl_base_fee * (1 + Number of Signatures Provided).
  // For simplicity, we assume that there are maximum 32 signatures.
  return xrplBaseFee * (1 + XRPL_CONFIG.MaxAllowedXRPLSigners);
}

// ComputeXRPLBaseFee computes the required XRPL base with load factor.
// Check https://xrpl.org/transaction-cost.html#server_state for more detail.
export function computeXRPLBaseFee(
  baseFee: number,
  loadFactor: number,
  loadBase: number
): number {
  return (baseFee * loadFactor) / loadBase;
}
