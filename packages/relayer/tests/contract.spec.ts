import { coin } from "@cosmjs/amino";
import {
  HandleCustomMsgFunction,
  QueryCustomMsgFunction,
  SimulateCosmWasmClient,
} from "@oraichain/cw-simulate";
import {
  CwXrplClient,
  CwXrplTypes,
} from "@oraichain/xrpl-bridge-contracts-sdk";
import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  handleTokenFactory,
  queryTokenFactory,
} from "../src/cw-simulate/tokenfactory";
import { generateXrplAddress, generateXrplPubkey } from "../src/utils";
import {deployContract} from '@oraichain/xrpl-bridge-contracts-build'

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
const receiverAddress = "orai1e9rxz3ssv5sqf4n23nfnlh4atv3uf3fs5wgm66";
const senderAddress = "orai19xtunzaq20unp8squpmfrw8duclac22hd7ves2";

const deployTokenFactory = async () => {
  const tokenFactoryCode = readFileSync(
    resolve(__dirname, "testdata", "tokenfactory.wasm")
  );
  const { codeId } = await client.upload(
    senderAddress,
    tokenFactoryCode,
    "auto"
  );
  const { contractAddress } = await client.instantiate(
    senderAddress,
    codeId,
    {},
    "tokenfactory"
  );
  return contractAddress;
};

describe("Test contract", () => {
  it("init contract", async () => {
    const tokenFactoryAddr = await deployTokenFactory();
    const xrplContract = await deployContract(client, senderAddress, {
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
    } as CwXrplTypes.InstantiateMsg, '', 'cw-xrpl');
    
    const cwXrpl = new CwXrplClient(client, senderAddress, xrplContract.contractAddress);

    await cwXrpl.createCosmosToken({
      subdenom: "UTEST",
      decimals: 6,
      initialBalances: [
        {
          address: receiverAddress,
          amount: "100000000",
        },
      ],
      symbol: "TEST",
      description: "description",
    });

    const denom = `factory/${tokenFactoryAddr}/UTEST`;
    const balance = await client.getBalance(receiverAddress, denom);
    expect(coin("100000000", denom)).toEqual(balance);

    // Register Cosmos originated token
    await cwXrpl.registerCosmosToken({
      denom,
      decimals: 6,
      sendingPrecision: 4,
      maxHoldingAmount: "10000000000",
      bridgingFee: "300000",
    });

    const cosmosToken = await cwXrpl.cosmosToken({ key: denom });
    console.log("cosmos token: ", cosmosToken);
    expect(cosmosToken.denom).toEqual(denom);
    expect(cosmosToken.decimals).toEqual(6);
    expect(cosmosToken.max_holding_amount).toEqual("10000000000");
  });
});
