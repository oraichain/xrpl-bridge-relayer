import { toDisplay } from "@oraichain/common";
import { CwXrplInterface } from "@oraichain/xrpl-bridge-contracts-sdk";

export default class ClaimRelayerFeesAction {
  private readonly MIN_RELAYER_FEES_TO_CLAIM = 1; // 1*10^6

  constructor(private readonly client: CwXrplInterface) {}

  private async queryAvailableClaimFees() {
    const fees = await this.client.feesCollected({
      relayerAddress: this.client.sender,
    });
    return fees.fees_collected.filter(
      (fees) => toDisplay(fees.amount) > this.MIN_RELAYER_FEES_TO_CLAIM
    );
  }

  async takeAction() {
    const feesCollected = await this.queryAvailableClaimFees();
    if (feesCollected.length === 0) return;
    return this.client.claimRelayerFees({ amounts: feesCollected }, "auto");
  }
}
