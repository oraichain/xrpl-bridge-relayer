import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { stringToPath } from "@cosmjs/crypto";
import { DirectSecp256k1HdWallet, OfflineSigner } from "@cosmjs/proto-signing";
import crypto from "crypto";
import readlineSync from "readline-sync";
import { Wallet } from "xrpl";

export type RetryOptions = {
  retry?: number;
  timeout?: number;
  callback?: (retry: number) => void;
};

export type UserWallet = { address: string; client: SigningCosmWasmClient };

export const decrypt = (password: string, val: string) => {
  const hashedPassword = crypto.createHash("sha256").update(password).digest();
  const encryptedText = Buffer.from(val, "base64");
  const IV = encryptedText.subarray(0, 16);
  const encrypted = encryptedText.subarray(16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", hashedPassword, IV);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString();
};

export const fetchRetry = async (
  url: RequestInfo | URL,
  opts: RequestInit & RetryOptions = {}
) => {
  let { retry = 3, callback, timeout = 10000, ...init } = opts;
  init.signal = AbortSignal.timeout(timeout);
  while (retry > 0) {
    try {
      return await fetch(url, init);
    } catch (e) {
      callback?.(retry);
      retry--;
      if (retry === 0) {
        throw e;
      }
    }
  }
};

export const decryptMnemonic = (
  question: string,
  encryptedMnemonic: string
) => {
  const password = readlineSync.question(question, {
    hideEchoBack: true,
  });
  return decrypt(password, encryptedMnemonic);
};

export const getOraiSigner = async (): Promise<OfflineSigner | string> => {
  try {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
      process.env.MNEMONIC ??
        decryptMnemonic(
          "enter orai passphrase: ",
          process.env.MNEMONIC_ENCRYPTED
        ),
      {
        hdPaths: [stringToPath(process.env.HD_PATH || "m/44'/118'/0'/0/0")],
        prefix: "orai",
      }
    );

    return wallet;
  } catch (error: any) {
    console.log({ error: error.message });
    return "Error: " + error.message;
  }
};

export const getXRPLWallet = (): Wallet => {
  return Wallet.fromSeed(
    process.env.XRPL_SEED ||
      decryptMnemonic("enter ton passphrase: ", process.env.XRPL_SEED_ENCRYPTED)
  );
};
