import {
  ExecuteResult,
  SigningCosmWasmClient,
} from "@cosmjs/cosmwasm-stargate";
import { OfflineSigner } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import { ORAI } from "@oraichain/common";
import {
  CwXrplClient,
  CwXrplInterface,
} from "@oraichain/xrpl-bridge-contracts-sdk";
import ClaimRelayerFeesAction from "./actions/claim-fees";
import HaltBridgeAction from "./actions/halt-bridge";

export default class XrplBridgeRelayer {
  // FIXME: until we find a common interface for relayer actions, let's keep it simple by injecting the dependencies directly
  private claimRelayerFeesAction: ClaimRelayerFeesAction;
  private haltBridgeAction: HaltBridgeAction;

  constructor(public readonly client: CwXrplInterface) {
    this.claimRelayerFeesAction = new ClaimRelayerFeesAction(client);
    this.haltBridgeAction = new HaltBridgeAction(client);
  }

  // dep injection, help for testing
  withClaimRelayerAction(claimRelayerFeesAction: ClaimRelayerFeesAction) {
    this.claimRelayerFeesAction = claimRelayerFeesAction;
    return this;
  }

  withHaltBridgeAction(haltBridgeAction: HaltBridgeAction) {
    this.haltBridgeAction = haltBridgeAction;
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
    let actions: Promise<ExecuteResult>[] = [];
    actions.push(this.claimRelayerFeesAction.takeAction());
    const results = await Promise.allSettled(actions);
    for (const result of results) {
      if (result.status === "rejected") {
        // TODO: feed to discord
        console.error(result.reason);
      }
    }
  }
}
