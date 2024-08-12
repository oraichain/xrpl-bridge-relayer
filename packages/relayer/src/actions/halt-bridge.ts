import { CwXrplInterface } from "@oraichain/xrpl-bridge-contracts-sdk";

export default class HaltBridgeAction {
  constructor(private readonly client: CwXrplInterface) {}

  async takeAction() {
    return this.client.haltBridge("auto");
  }
}
