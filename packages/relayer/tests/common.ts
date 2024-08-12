import { SimulateCosmWasmClient } from "@oraichain/cw-simulate";
import { readFileSync } from "fs";
import { resolve } from "path";

export const deployTokenFactory = async (client: SimulateCosmWasmClient, senderAddress: string) => {
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