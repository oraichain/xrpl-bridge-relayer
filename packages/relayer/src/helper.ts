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
          process.env.ORAI_MNEMONIC_ENCRYPTED
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

export function getXRPLWallet(): Wallet {
  const {
    XRPL_SEED,
    XRPL_SEED_ENCRYPTED,
    XRPL_MNEMONIC_ENCRYPTED,
    XRPL_SECRET_ENCRYPTED,
  } = process.env;
  let wallet: Wallet;

  switch (true) {
    case !!XRPL_SEED:
      wallet = Wallet.fromSeed(XRPL_SEED);
      break;
    case !!XRPL_SEED_ENCRYPTED:
      wallet = Wallet.fromSeed(
        decryptMnemonic("enter xrpl passphrase: ", XRPL_SEED_ENCRYPTED)
      );
      break;
    case !!XRPL_MNEMONIC_ENCRYPTED:
      wallet = Wallet.fromMnemonic(
        decryptMnemonic("enter xrpl passphrase: ", XRPL_MNEMONIC_ENCRYPTED)
      );
      break;
    case !!XRPL_SECRET_ENCRYPTED:
      wallet = Wallet.fromSecret(
        decryptMnemonic("enter xrpl passphrase: ", XRPL_SECRET_ENCRYPTED)
      );
      break;
    default:
      throw new Error("Only support xrpl seed, mnemonic, secret");
  }

  return wallet;
}
