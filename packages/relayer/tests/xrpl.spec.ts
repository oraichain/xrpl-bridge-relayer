import { describe, expect, it } from "vitest";
import { Amount, IssuedCurrencyAmount, Memo } from "xrpl";
import { XRPL_CONFIG } from "../src/constants";
import { convertAmountToIssuedCurrencyAmount } from "../src/xrpl/currency";
import { getMultisigningFee } from "../src/xrpl/fee";
import { decodeOraiRecipientFromMemo } from "../src/xrpl/memo";

describe("Test xrpl", () => {
  it.each<[Memo[], string]>([
    [[], ""],
    [[{ Memo: { MemoData: "" } }], ""],
    [[{ Memo: { MemoData: "7b122" } }], ""],
    [
      [
        {
          Memo: {
            MemoData:
              "7b2274797065223a226f7261696272696467652d7872706c222c226f7261695f726563697069656e74223a226f726169316d79636d6879726d64366475737034303872746a677a6c6b3737333876687467717968787874227d",
          },
        },
      ],
      "",
    ],
    [
      [
        {
          Memo: {
            MemoData:
              "7b2274797065223a226f7261696272696467652d7872706c2d7631222c226f7261695f726563697069656e74223a226f726169316673323575737a3635747372796630663864356370666d7167723078777570346b6a71706130227d",
          },
        },
      ],
      "orai1fs25usz65tsryf0f8d5cpfmqgr0xwup4kjqpa0",
    ],
  ])("Decode Orai receipient from memo", (memos, oraiReceipient) => {
    expect(oraiReceipient).toEqual(decodeOraiRecipientFromMemo(memos));
  });

  it("Get multisigning fee", () => {
    expect(getMultisigningFee(10)).toEqual(
      10 * (1 + XRPL_CONFIG.MaxAllowedXRPLSigners)
    );
  });

  it.each<[Amount, IssuedCurrencyAmount]>([
    [
      "1000",
      { value: "1000", currency: "XRP", issuer: "rrrrrrrrrrrrrrrrrrrrrhoLvTp" },
    ],
    [
      "100e5",
      {
        value: "10000000",
        currency: "XRP",
        issuer: "rrrrrrrrrrrrrrrrrrrrrhoLvTp",
      },
    ],
    [
      {
        value: "100",
        currency: "OCH",
        issuer: "rrrrrrrrrrrrrrrrrrrrrhoLvTp",
      },
      {
        value: "100",
        currency: "OCH",
        issuer: "rrrrrrrrrrrrrrrrrrrrrhoLvTp",
      },
    ],
    [
      {
        value: "100e6",
        currency: "OCH",
        issuer: "rrrrrrrrrrrrrrrrrrrrrhoLvTp",
      },
      {
        value: "100000000",
        currency: "OCH",
        issuer: "rrrrrrrrrrrrrrrrrrrrrhoLvTp",
      },
    ],
  ])("Convert amount to IssuedCurrencyAmount", (amount, issuedCurrency) => {
    expect(convertAmountToIssuedCurrencyAmount(amount)).toEqual(issuedCurrency);
  });
});
