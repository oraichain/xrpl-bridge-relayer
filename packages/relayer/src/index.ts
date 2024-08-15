import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { OfflineSigner } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import { ORAI } from "@oraichain/common";
import {
  CwXrplClient,
  CwXrplInterface,
} from "@oraichain/xrpl-bridge-contracts-sdk";
import { setTimeout } from "timers/promises";
import { PROCESS_INTERVAL } from "./constants";
import { RelayerAction } from "./type";

export default class XrplBridgeRelayer {
  private relayerActions: RelayerAction[];

  constructor(public readonly client: CwXrplInterface) {}

  withRelayerActions(actions: RelayerAction[]) {
    this.relayerActions = actions;
    return this;
  }

  static async connect(
    rpc: string,
    signer: OfflineSigner,
    contractAddress: string
  ) {
    const cosmwasmClient = await SigningCosmWasmClient.connectWithSigner(
      rpc,
      signer,
      { gasPrice: GasPrice.fromString(`0.001${ORAI}`) }
    );
    const sender = await signer.getAccounts();
    const client = new CwXrplClient(
      cosmwasmClient,
      sender[0].address,
      contractAddress
    );
    return new XrplBridgeRelayer(client);
  }

  async relay() {
    while (true) {
      for (const relayerAction of this.relayerActions) {
        await relayerAction.takeAction();
      }
      await setTimeout(PROCESS_INTERVAL);
    }
  }
}
