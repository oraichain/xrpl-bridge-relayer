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
import { Operation } from "@oraichain/xrpl-bridge-contracts-sdk/build/CwXrpl.types";
import { generateSeed } from "ripple-keypairs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { BaseTransaction, Client, Wallet } from "xrpl";
import OraiToXrpl from "../src/actions/orai-to-xrpl";
import XrplToOrai from "../src/actions/xrpl-to-orai";
import {
  handleTokenFactory,
  queryTokenFactory,
} from "../src/cw-simulate/tokenfactory";
import XRPLRpcClient from "../src/xrpl/xrpl_rpc";
import {
  deployTokenFactory,
  generateTicketAllocationTransaction,
} from "./common";

const receiverAddress = "orai1e9rxz3ssv5sqf4n23nfnlh4atv3uf3fs5wgm66";
const senderAddress = "orai19xtunzaq20unp8squpmfrw8duclac22hd7ves2";

type Relayer = {
  xrpl: Wallet;
  orai: string;
  xrplToOrai?: XrplToOrai;
  oraiToXrpl?: OraiToXrpl;
};

describe("Orai to xrpl", () => {
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

  it("Test get bridge signers", async () => {
    let accountWeights: { [account: string]: number } = {};
    accountWeights[signer1.xrpl.address] = 1;
    accountWeights[signer2.xrpl.address] = 1;
    accountWeights[signer3.xrpl.address] = 1;
    vi.spyOn(
      signer1.oraiToXrpl,
      "getBridgeXRPLSignerAccountsWithWeights"
    ).mockReturnValue([accountWeights, 2]);
    vi.spyOn(
      signer2.oraiToXrpl,
      "getBridgeXRPLSignerAccountsWithWeights"
    ).mockReturnValue([accountWeights, 2]);
    vi.spyOn(
      signer3.oraiToXrpl,
      "getBridgeXRPLSignerAccountsWithWeights"
    ).mockReturnValue([accountWeights, 2]);
    let bridgeSigners = await signer1.oraiToXrpl?.getBridgeSigners();
    console.log(bridgeSigners);
  });

  it.each<[Operation, boolean]>([
    [
      {
        account_sequence: 100,
        id: "100",
        operation_type: {
          trust_set: {
            currency: "OCH",
            issuer: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
            trust_set_limit_amount: "1000000000000000",
          },
        },
        signatures: [
          {
            relayer_cosmos_address:
              "orai1knzg7jdc49ghnc2pkqg6vks8ccsk6efzfgv6gv",
            signature: "relayer_sign_1",
          },
        ],
        ticket_sequence: 0,
        version: 1,
        xrpl_base_fee: 10,
      },
      true,
    ],
    [
      {
        account_sequence: 100,
        id: "100",
        operation_type: {
          trust_set: {
            currency: "OCH",
            issuer: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
            trust_set_limit_amount: "1000000000000000",
          },
        },
        signatures: [],
        ticket_sequence: 0,
        version: 1,
        xrpl_base_fee: 10,
      },
      true,
    ],
    [
      {
        account_sequence: 100,
        id: "100",
        operation_type: {
          allocate_tickets: { number: 0 },
        },
        signatures: [],
        ticket_sequence: 0,
        version: 1,
        xrpl_base_fee: 10,
      },
      true,
    ],
    [
      {
        account_sequence: 100,
        id: "100",
        operation_type: {
          allocate_tickets: { number: 100 },
        },
        signatures: [],
        ticket_sequence: 0,
        version: 1,
        xrpl_base_fee: 10,
      },
      true,
    ],
    [
      {
        account_sequence: 10,
        id: "100",
        operation_type: {
          allocate_tickets: { number: 100 },
        },
        signatures: [],
        ticket_sequence: 0,
        version: 1,
        xrpl_base_fee: 10,
      },
      false,
    ],
  ])("Test pre-validate operation", async (operation, validateResult) => {
    vi.spyOn(XRPLRpcClient, "accountInfo").mockReturnValue({
      result: { account_data: { Sequence: 100 } },
    });
    let res = await signer1.oraiToXrpl?.preValidateOperation(operation);
    expect(res).toEqual(validateResult);
  });

  it.each<[Operation, number]>([
    [{ ticket_sequence: 0, account_sequence: 1 }, 1],
    [{ ticket_sequence: 10, account_sequence: 0 }, 10],
  ])("Test get operation id", (operation, id) => {
    expect(signer1.oraiToXrpl?.getOperationId(operation)).toEqual(id);
  });

  it.each<[Operation, BaseTransaction]>([
    [
      {
        account_sequence: 100,
        id: "100",
        operation_type: {
          allocate_tickets: { number: 20 },
        },
        signatures: [],
        ticket_sequence: 0,
        version: 1,
        xrpl_base_fee: 10,
      },
      {
        TicketCount: 20,
        TransactionType: "TicketCreate",
        Account: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
        Sequence: 100,
        SigningPubKey: "",
        Fee: "330",
      },
    ],
    [
      {
        account_sequence: 0,
        id: "100",
        operation_type: {
          trust_set: {
            currency: "OCH",
            issuer: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
            trust_set_limit_amount: "1000000000000000",
          },
        },
        signatures: [],
        ticket_sequence: 10,
        version: 1,
        xrpl_base_fee: 10,
      },
      {
        TransactionType: "TrustSet",
        LimitAmount: {
          value: "1000000000000000",
          currency: "OCH",
          issuer: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
        },
        Account: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
        TicketSequence: 10,
        SigningPubKey: "",
        Fee: "330",
      },
    ],
    [
      {
        account_sequence: 0,
        id: "100",
        operation_type: {
          rotate_keys: {
            new_evidence_threshold: 2,
            new_relayers: [
              {
                cosmos_address: "Addr",
                xrpl_address: "xrpl_address",
                xrpl_pub_key: "xrpl_pub_key",
              },
            ],
          },
        },
        signatures: [],
        ticket_sequence: 10,
        version: 1,
        xrpl_base_fee: 10,
      },
      {
        SignerQuorum: 2,
        Account: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
        TransactionType: "SignerListSet",
        SignerEntries: [
          { SignerEntry: { Account: "xrpl_address", SignerWeight: 1 } },
        ],
        TicketSequence: 10,
        SigningPubKey: "",
        Fee: "330",
      },
    ],
    [
      {
        account_sequence: 0,
        id: "100",
        operation_type: {
          cosmos_to_xrpl_transfer: {
            amount: "1000000",
            currency: "OCH",
            issuer: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
            max_amount: "1000000",
            recipient: "rEuLyBCvcw4CFmzv8RepSiAoNgF8tTGJQC",
            sender: "orai1hf2x7qu24qp5efh76ndcuc66e2qms2gk96ssqu",
          },
        },
        signatures: [],
        ticket_sequence: 10,
        version: 1,
        xrpl_base_fee: 10,
      },
      {
        Destination: "rEuLyBCvcw4CFmzv8RepSiAoNgF8tTGJQC",
        Account: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
        TransactionType: "Payment",
        Amount: {
          value: "1000000",
          currency: "OCH",
          issuer: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
        },
        SendMax: {
          value: "1000000",
          currency: "OCH",
          issuer: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
        },
        TicketSequence: 10,
        SigningPubKey: "",
        Sequence: 0,
        Fee: "330",
      },
    ],
  ])("Test build xrpl tx from operation", (operation, expectedTx) => {
    let res = signer1.oraiToXrpl?.buildXRPLTxFromOperation(operation);
    expect(res).toEqual(expectedTx);
  });

  it("Test register tx signature", async () => {
    // create ticketSeqOperation
    // init TicketAllocation ops
    cwXrpl.sender = senderAddress;
    await cwXrpl.recoverTickets({
      accountSequence: 10,
      numberOfTickets: 60,
    });

    let pendingOps = await cwXrpl.pendingOperations({});
    expect(pendingOps.operations.length).toEqual(1);

    cwXrpl.sender = signer1.orai;
    await signer1.oraiToXrpl?.registerTxSignature(pendingOps.operations[0]);

    pendingOps = await cwXrpl.pendingOperations({});
    expect(pendingOps.operations[0].signatures.length).toEqual(1);
    // remove action
    cwXrpl.sender = senderAddress;
  });

  it("Test build submittable transaction", async () => {
    // num of signature = 1 => not reach threshold
    let pendingOps = await cwXrpl.pendingOperations({});
    let bridgeSigners = await signer1.oraiToXrpl?.getBridgeSigners();

    let res = await signer1.oraiToXrpl?.buildSubmittableTransaction(
      pendingOps.operations[0],
      bridgeSigners
    );
    expect(res).toEqual([undefined, false]);

    // signer 2 submit tx
    cwXrpl.sender = signer2.orai;
    await signer2.oraiToXrpl?.registerTxSignature(pendingOps.operations[0]);

    // query again
    pendingOps = await cwXrpl.pendingOperations({});
    res = await signer1.oraiToXrpl?.buildSubmittableTransaction(
      pendingOps.operations[0],
      bridgeSigners
    );

    expect(res[1]).toEqual(true);
    expect(res[0].TransactionType).toEqual("TicketCreate");
    expect(res[0].Signers?.length).toEqual(2);
  });

  it("Test bridge from Orai to Xrpl", async () => {
    // allocate ticket first
    // clear all pending ticker allocation tx
    let pendingOps = await cwXrpl.pendingOperations({});
    for (let ops of pendingOps.operations) {
      cwXrpl.sender = senderAddress;
      await cwXrpl.cancelPendingOperation({
        operationId: Number(ops.account_sequence),
      });
    }
    // allocate ticket
    cwXrpl.sender = senderAddress;
    let tx = generateTicketAllocationTransaction();
    // init TicketAllocation ops
    await cwXrpl.recoverTickets({
      accountSequence: tx.transaction.Sequence || 0,
      numberOfTickets: 60,
    });
    // signer 1, threshold don't reach
    cwXrpl.sender = signer1.orai;
    await signer1.xrplToOrai?.processTx(tx);
    // signer 2, reach threshold
    cwXrpl.sender = signer2.orai;
    await signer2.xrplToOrai?.processTx(tx);
    let xrplDenom = `factory/${tokenFactoryAddr}/XRP`;
    client.app.bank.setBalance(senderAddress, [
      { denom: xrplDenom, amount: "1000000000" },
    ]);

    // send xrp from orai to xrpl
    cwXrpl.sender = senderAddress;

    await cwXrpl.sendToXrpl(
      {
        recipient: "rNY2x1JcUL7bLtKmW1gEDu54YTQu4jjxok",
      },
      "auto",
      undefined,
      [{ denom: xrplDenom, amount: "10000" }]
    );

    pendingOps = await cwXrpl.pendingOperations({});
    expect(pendingOps.operations.length).toEqual(1);

    // submit tx
    vi.spyOn(xrplClient, "submit").mockReturnValue({} as any);

    // signer1
    cwXrpl.sender = signer1.orai;
    await signer1.oraiToXrpl?.takeAction();
    // signer2
    cwXrpl.sender = signer2.orai;
    await signer2.oraiToXrpl?.takeAction();

    // signer 3: no need to  sign
    cwXrpl.sender = signer3.orai;
    await signer3.oraiToXrpl?.takeAction();
  });
});
