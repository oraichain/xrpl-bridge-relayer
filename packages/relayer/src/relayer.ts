import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { OfflineSigner } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import { ORAI } from "@oraichain/common";
import {
  CwXrplClient,
  CwXrplInterface,
} from "@oraichain/xrpl-bridge-contracts-sdk";
import { WebhookClient } from "discord.js";
import { setTimeout } from "timers/promises";
import { Client, Wallet } from "xrpl";
import { Argv } from "yargs";
import OraiToXrpl from "./actions/orai-to-xrpl";
import XrplToOrai from "./actions/xrpl-to-orai";
import { PROCESS_INTERVAL } from "./constants";
import { getOraiSigner, getXRPLWallet } from "./helper";
import { RelayerAction, XrplClient } from "./type";

export class XrplBridgeRelayer {
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
      try {
        for (const relayerAction of this.relayerActions) {
          await relayerAction.takeAction();
        }
      } catch (err) {
        console.log(err);
      }
      await setTimeout(PROCESS_INTERVAL);
    }
  }
}

export default async (yargs: Argv) => {
  const oraiRpcUrl = process.env.ORAI_RPC_URL || "https://rpc.orai.io";
  const xrplServer = process.env.XRPL_SERVER || "wss://xrplcluster.com/";
  const lastLedger = Number(process.env.LAST_LEDGER) || -1;

  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

  const webhookClient = new WebhookClient({
    url: discordWebhookUrl,
  });

  const oraiSigner = await getOraiSigner();
  if (typeof oraiSigner === "string") {
    throw new Error("Cannot get orai signer - err: " + oraiSigner);
  }

  const xrplClient = new Client(xrplServer);
  await xrplClient.connect();
  let xrplWallet = getXRPLWallet();

  let xrplBridgeAddr = process.env.XRPL_MULTISIG;
  let cwBridgeAddr = process.env.CW_BRIDGE_ADDRESS;

  let bridgeAdapter = await XrplBridgeRelayer.connect(
    oraiRpcUrl,
    oraiSigner,
    cwBridgeAddr,
    xrplClient,
    xrplWallet
  );

  // register action
  let oraiToXrplAction = new OraiToXrpl(
    bridgeAdapter.cwClient,
    bridgeAdapter.xrplClient,
    xrplBridgeAddr,
    webhookClient
  );
  let xrplToOraiAction = new XrplToOrai(
    bridgeAdapter.cwClient,
    bridgeAdapter.xrplClient,
    xrplBridgeAddr,
    lastLedger,
    webhookClient
  );

  bridgeAdapter.withRelayerActions([xrplToOraiAction, oraiToXrplAction]);
  bridgeAdapter.relay();
};
