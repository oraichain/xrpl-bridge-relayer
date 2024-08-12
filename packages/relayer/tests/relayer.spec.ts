import {
  HandleCustomMsgFunction,
  QueryCustomMsgFunction,
  SimulateCosmWasmClient,
} from "@oraichain/cw-simulate";
import { deployContract } from "@oraichain/xrpl-bridge-contracts-build";
import {
  CwXrplClient,
  CwXrplTypes,
} from "@oraichain/xrpl-bridge-contracts-sdk";
import { beforeAll, describe, it } from "vitest";
import {
  handleTokenFactory,
  queryTokenFactory,
} from "../src/cw-simulate/tokenfactory";
import { generateXrplAddress, generateXrplPubkey } from "../src/utils";
import { deployTokenFactory } from "./common";

const receiverAddress = "orai1e9rxz3ssv5sqf4n23nfnlh4atv3uf3fs5wgm66";
const senderAddress = "orai19xtunzaq20unp8squpmfrw8duclac22hd7ves2";

describe("Test relayer", () => {
  const handleCustomMsg: HandleCustomMsgFunction = async (sender, msg) => {
    let response = await handleTokenFactory(client, sender, msg);
    return response;
  };

  const queryCustomMsg: QueryCustomMsgFunction = (request) => {
    let response = queryTokenFactory([], request);
    if (response) return response;
  };

  const client = new SimulateCosmWasmClient({
    chainId: "Oraichain",
    bech32Prefix: "orai",
    handleCustomMsg,
    queryCustomMsg,
  });

  let cwXrpl: CwXrplClient;
  let tokenFactoryAddr: string;

  beforeAll(async () => {
    tokenFactoryAddr = await deployTokenFactory(client, senderAddress);
    const xrplContract = await deployContract(
      client,
      senderAddress,
      {
        owner: senderAddress,
        relayers: [
          {
            cosmos_address: senderAddress,
            xrpl_address: generateXrplAddress(),
            xrpl_pub_key: generateXrplPubkey(),
          },
        ],
        evidence_threshold: 1,
        used_ticket_sequence_threshold: 50,
        trust_set_limit_amount: "1000000000000000000",
        bridge_xrpl_address: generateXrplAddress(),
        xrpl_base_fee: 10,
        token_factory_addr: tokenFactoryAddr,
        issue_token: true,
      } as CwXrplTypes.InstantiateMsg,
      "",
      "cw-xrpl"
    );

    cwXrpl = new CwXrplClient(
      client,
      senderAddress,
      xrplContract.contractAddress
    );
  });

  it("Start basic relayer should claim fees", async () => {});
});
