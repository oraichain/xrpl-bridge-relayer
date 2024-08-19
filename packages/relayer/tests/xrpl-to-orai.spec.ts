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
import { generateSeed } from "ripple-keypairs";
import { beforeAll, describe, expect, it } from "vitest";
import { Client, Wallet } from "xrpl";
import OraiToXrpl from "../src/actions/orai-to-xrpl";
import XrplToOrai from "../src/actions/xrpl-to-orai";
import {
  handleTokenFactory,
  queryTokenFactory,
} from "../src/cw-simulate/tokenfactory";
import { convertAmountToIssuedCurrencyAmount } from "../src/xrpl/currency";
import { decodeOraiRecipientFromMemo } from "../src/xrpl/memo";
import {
  deployTokenFactory,
  generateSingerListSetTransactions,
  generateTicketAllocationTransaction,
  generateTransferIssuedTokenFromXrplToOraiTransactionWithSourceXRPL,
  generateTransferXRPFromXrplToOraiTx,
  generateTrustSetTransaction,
} from "./common";

const receiverAddress = "orai1e9rxz3ssv5sqf4n23nfnlh4atv3uf3fs5wgm66";
const senderAddress = "orai19xtunzaq20unp8squpmfrw8duclac22hd7ves2";

type Relayer = {
  xrpl: Wallet;
  orai: string;
  xrplToOrai?: XrplToOrai;
  oraiToXrpl?: OraiToXrpl;
};

describe("Test xrpl to orai", () => {
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
  let bridge_xrpl_address: string;
  let xrplClient: Client;
  let signer1: Relayer;
  let signer2: Relayer;
  let signer3: Relayer;
  let signer4: Relayer;

  beforeAll(async () => {
    tokenFactoryAddr = await deployTokenFactory(client, senderAddress);
    xrplClient = new Client("wss://s.altnet.rippletest.net:51233");
    await xrplClient.connect();
    bridge_xrpl_address = "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU";

    // init relayer
    let wallet_1 = Wallet.fromSeed(generateSeed());
    let oraiRelayer_1 = "orai1knzg7jdc49ghnc2pkqg6vks8ccsk6efzfgv6gv";
    let wallet_2 = Wallet.fromSeed(generateSeed());
    let oraiRelayer_2 = "orai1gu0vpuv4vkyhzllqqnxmkkehdqvtmltu9gkrpe";
    let wallet_3 = Wallet.fromSeed(generateSeed());
    let oraiRelayer_3 = "orai1hf2x7qu24qp5efh76ndcuc66e2qms2gk96ssqu";

    const xrplContract = await deployContract(
      client,
      senderAddress,
      {
        owner: senderAddress,
        relayers: [
          {
            cosmos_address: oraiRelayer_1,
            xrpl_address: wallet_1.address,
            xrpl_pub_key: wallet_1.publicKey,
          },
          {
            cosmos_address: oraiRelayer_2,
            xrpl_address: wallet_2.address,
            xrpl_pub_key: wallet_2.publicKey,
          },
          {
            cosmos_address: oraiRelayer_3,
            xrpl_address: wallet_3.address,
            xrpl_pub_key: wallet_3.publicKey,
          },
        ],
        evidence_threshold: 2,
        used_ticket_sequence_threshold: 50,
        trust_set_limit_amount: "1000000000000000000",
        bridge_xrpl_address,
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

    signer1 = {
      orai: oraiRelayer_1,
      xrpl: wallet_1,
      xrplToOrai: new XrplToOrai(
        cwXrpl,
        {
          wallet: wallet_1,
          client: xrplClient,
          relayerAddr: oraiRelayer_1,
        },
        bridge_xrpl_address
      ),
      oraiToXrpl: new OraiToXrpl(
        cwXrpl,
        {
          wallet: wallet_1,
          client: xrplClient,
          relayerAddr: oraiRelayer_1,
        },
        bridge_xrpl_address
      ),
    };

    signer2 = {
      orai: oraiRelayer_2,
      xrpl: wallet_2,
      xrplToOrai: new XrplToOrai(
        cwXrpl,
        {
          wallet: wallet_2,
          client: xrplClient,
          relayerAddr: oraiRelayer_2,
        },
        bridge_xrpl_address
      ),
      oraiToXrpl: new OraiToXrpl(
        cwXrpl,
        {
          wallet: wallet_2,
          client: xrplClient,
          relayerAddr: oraiRelayer_2,
        },
        bridge_xrpl_address
      ),
    };

    signer3 = {
      orai: oraiRelayer_3,
      xrpl: wallet_3,
      xrplToOrai: new XrplToOrai(
        cwXrpl,
        {
          wallet: wallet_3,
          client: xrplClient,
          relayerAddr: oraiRelayer_3,
        },
        bridge_xrpl_address
      ),
      oraiToXrpl: new OraiToXrpl(
        cwXrpl,
        {
          wallet: wallet_3,
          client: xrplClient,
          relayerAddr: oraiRelayer_3,
        },
        bridge_xrpl_address
      ),
    };
  });

  it("Test send ticket allocation transaction", async () => {
    let tx = generateTicketAllocationTransaction();
    // init TicketAllocation ops
    await cwXrpl.recoverTickets({
      accountSequence: tx.transaction.Sequence || 0,
      numberOfTickets: 60,
    });

    // signer 1, threshold don't reach
    cwXrpl.sender = signer1.orai;
    await signer1.xrplToOrai?.processTx(tx);
    // query available ticket sequence
    let availableTickets = await cwXrpl.availableTickets();
    expect(availableTickets).toEqual({ tickets: [] });

    // signer 2, reach threshold
    cwXrpl.sender = signer2.orai;
    await signer2.xrplToOrai?.processTx(tx);
    // query available ticket sequence
    availableTickets = await cwXrpl.availableTickets();
    expect(availableTickets).toEqual({ tickets: [2748925, 2748927, 2748945] });
  });

  it("Test register xrpl token", async () => {
    // register xrpl token
    cwXrpl.sender = senderAddress;
    await cwXrpl.registerXrplToken({
      bridgingFee: "10",
      currency: "OCH",
      issuer: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
      maxHoldingAmount: "1000000000000000000",
      sendingPrecision: 6,
    });
    // query pending operation
    let pendingOps = await cwXrpl.pendingOperations({});

    expect(pendingOps.operations.length).toEqual(1);

    let xrplKey = "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqpOCH";
    // query xrpl tokens
    let xrplToken = await cwXrpl.xrplToken({ key: xrplKey });
    expect(xrplToken.issuer).toEqual("rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp");
    expect(xrplToken.currency).toEqual("OCH");
    expect(xrplToken.state).toEqual("processing");

    //skip step build tx on XRPL
    let trustSetTx = generateTrustSetTransaction();
    // signer 1 submit to orai
    cwXrpl.sender = signer1.orai;
    await signer1.xrplToOrai?.processTx(trustSetTx);

    // signer 2 submit to orai
    cwXrpl.sender = signer2.orai;
    await signer2.xrplToOrai?.processTx(trustSetTx);

    // after verify, query again, and state = enabled
    xrplToken = await cwXrpl.xrplToken({ key: xrplKey });
    expect(xrplToken.state).toEqual("enabled");
  });

  it("Test register cosmos token", async () => {
    // register cosmos token, don't need execute TrustSet
    cwXrpl.sender = senderAddress;
    await cwXrpl.registerCosmosToken({
      bridgingFee: "10",
      decimals: 15,
      denom: "ORAI",
      maxHoldingAmount: "1000000000000000000",
      sendingPrecision: 6,
    });

    // query cosmos token, only one token
    let cosmosTokens = await cwXrpl.cosmosTokens({});
    expect(cosmosTokens.tokens.length).toEqual(1);
    expect(cosmosTokens.tokens[0].state).toEqual("enabled");
    expect(cosmosTokens.tokens[0].denom).toEqual("ORAI");
    expect(cosmosTokens.tokens[0].decimals).toEqual(15);
  });

  it("Test send issued token from xrpl to Orai", async () => {
    let tx =
      generateTransferIssuedTokenFromXrplToOraiTransactionWithSourceXRPL();

    let bridgeAmount = convertAmountToIssuedCurrencyAmount(
      tx.metadata.delivered_amount ?? {
        value: "",
        issuer: "",
        currency: "",
      }
    );
    let cosmosTokens = await cwXrpl.xrplTokens({ limit: 100 });
    let tokenBridging = cosmosTokens.tokens.find(
      (token) =>
        token.issuer == bridgeAmount.issuer &&
        token.currency == bridgeAmount.currency
    );
    let oraiReceiver = decodeOraiRecipientFromMemo(tx.transaction.Memos ?? []);
    let xrpDenom = tokenBridging?.cosmos_denom ?? "";
    let balanceBefore = await client.getBalance(oraiReceiver, xrpDenom);
    expect(balanceBefore.amount).toEqual("0");

    // signer 1 submit to orai
    cwXrpl.sender = signer1.orai;
    await signer1.xrplToOrai?.processTx(tx);

    // signer 2 submit to orai
    cwXrpl.sender = signer2.orai;
    await signer2.xrplToOrai?.processTx(tx);

    let balanceAfter = await client.getBalance(oraiReceiver, xrpDenom);
    expect(balanceAfter.amount).toEqual("999000000000");
  });

  it("Test send XRP token from xrpl to Orai", async () => {
    // load tx
    let tx = generateTransferXRPFromXrplToOraiTx();

    // query bank balance before
    let oraiReceiver = decodeOraiRecipientFromMemo(tx.transaction.Memos ?? []);
    let xrpDenom = `factory/${tokenFactoryAddr}/XRP`;
    let balanceBefore = await client.getBalance(oraiReceiver, xrpDenom);
    expect(balanceBefore.amount).toEqual("0");

    // signer 1 submit to orai
    cwXrpl.sender = signer1.orai;
    await signer1.xrplToOrai?.processTx(tx);

    // signer 2 submit to orai
    cwXrpl.sender = signer2.orai;
    await signer2.xrplToOrai?.processTx(tx);

    // query balance after
    let balanceAfter = await client.getBalance(oraiReceiver, xrpDenom);
    expect(balanceAfter.amount).toEqual(tx.metadata.delivered_amount);
  });

  it("Test rotate key", async () => {
    // submit tx rotate key
    let oraiRelayer_4 = "orai18rr2d53nl56nweanpnkg65dyj7ulua6myh4xvn";
    let wallet_4 = Wallet.fromSeed(generateSeed());
    signer4 = {
      orai: oraiRelayer_4,
      xrpl: wallet_4,
      xrplToOrai: new XrplToOrai(
        cwXrpl,
        {
          wallet: wallet_4,
          client: xrplClient,
          relayerAddr: oraiRelayer_4,
        },
        bridge_xrpl_address
      ),
      oraiToXrpl: new OraiToXrpl(
        cwXrpl,
        {
          wallet: wallet_4,
          client: xrplClient,
          relayerAddr: oraiRelayer_4,
        },
        bridge_xrpl_address
      ),
    };
    cwXrpl.sender = senderAddress;
    await cwXrpl.rotateKeys({
      newEvidenceThreshold: 2,
      newRelayers: [
        {
          cosmos_address: signer1.orai,
          xrpl_address: signer1.xrpl.address,
          xrpl_pub_key: signer1.xrpl.publicKey,
        },
        {
          cosmos_address: signer2.orai,
          xrpl_address: signer2.xrpl.address,
          xrpl_pub_key: signer2.xrpl.publicKey,
        },
        {
          cosmos_address: oraiRelayer_4,
          xrpl_address: wallet_4.address,
          xrpl_pub_key: wallet_4.publicKey,
        },
      ],
    });

    // relayer relay tx success on XRPL
    let tx = generateSingerListSetTransactions();
    // signer 1 submit to orai
    cwXrpl.sender = signer1.orai;
    await signer1.xrplToOrai?.processTx(tx);

    // signer 3 submit to orai
    cwXrpl.sender = signer3.orai;
    await signer3.xrplToOrai?.processTx(tx);

    // query current relayer
    let config = await cwXrpl.config();
    expect(config.evidence_threshold).toEqual(2);
    expect(config.relayers).toEqual([
      {
        cosmos_address: signer1.orai,
        xrpl_address: signer1.xrpl.address,
        xrpl_pub_key: signer1.xrpl.publicKey,
      },
      {
        cosmos_address: signer2.orai,
        xrpl_address: signer2.xrpl.address,
        xrpl_pub_key: signer2.xrpl.publicKey,
      },
      {
        cosmos_address: oraiRelayer_4,
        xrpl_address: wallet_4.address,
        xrpl_pub_key: wallet_4.publicKey,
      },
    ]);
  });
});
