import { CwXrplInterface } from "@oraichain/xrpl-bridge-contracts-sdk";
import { RelayerAction } from "src/type";

export default class HaltBridgeAction implements RelayerAction {
  constructor(private readonly client: CwXrplInterface) {}

  async takeAction() {
    return this.client.haltBridge("auto");
  }
}
