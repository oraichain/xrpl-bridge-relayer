import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { OfflineSigner } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import { ORAI } from "@oraichain/common";
import {
  CwXrplClient,
  CwXrplInterface,
} from "@oraichain/xrpl-bridge-contracts-sdk";
import { setTimeout } from "timers/promises";
import { Client, Wallet } from "xrpl";
import { PROCESS_INTERVAL } from "./constants";
import { RelayerAction, XrplClient } from "./type";

export default class XrplBridgeRelayer {
  private relayerActions: RelayerAction[];

  constructor(
    public readonly cwClient: CwXrplInterface,
    public readonly xrplClient: XrplClient
  ) {}

  withRelayerActions(actions: RelayerAction[]) {
    this.relayerActions = actions;
    return this;
  }

  static async connect(
    oraiRpc: string,
    signer: OfflineSigner,
    xrplBridgeAddress: string,
    xrplClient: Client,
    xrplWallet: Wallet
  ) {
    // const oraichain side
    const cosmwasmClient = await SigningCosmWasmClient.connectWithSigner(
      oraiRpc,
      signer,
      { gasPrice: GasPrice.fromString(`0.001${ORAI}`) }
    );
    const sender = await signer.getAccounts();

    const oraiClient = new CwXrplClient(
      cosmwasmClient,
      sender[0].address,
      xrplBridgeAddress
    );

    return new XrplBridgeRelayer(oraiClient, {
      wallet: xrplWallet,
      client: xrplClient,
      relayerAddr: xrplWallet.address,
    });
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
