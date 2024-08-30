import { Memo } from "xrpl";

const bridgeMemoType = "oraibridge-xrpl-v1";
export interface BridgeMemo {
  type: string;
  orai_recipient: string;
  memo: string;
}

export function decodeOraiRecipientFromMemo(memos?: Memo[]): [string, string] {
  if (memos == undefined) return ["", ""];

  for (let memo of memos) {
    if (memo.Memo.MemoData.length == 0) {
      continue;
    }

    try {
      let bridgeMemo: BridgeMemo = JSON.parse(
        Buffer.from(memo.Memo.MemoData, "hex").toString("ascii")
      );
      if (bridgeMemo.type != bridgeMemoType) {
        return ["", ""];
      }
      return [bridgeMemo.orai_recipient, bridgeMemo.memo];
    } catch (err) {
      continue;
    }
  }

  return ["", ""];
}

// EncodeCoreumRecipientToMemo encodes the bridge memo with the coreum recipient.
export function encodeOraiRecipientToMemo(oraiRecipient: string): Memo {
  let bridgeMemo: BridgeMemo = {
    type: bridgeMemoType,
    orai_recipient: oraiRecipient,
    memo: "",
  };

  return {
    Memo: {
      MemoData: Buffer.from(JSON.stringify(bridgeMemo), "utf-8").toString(
        "hex"
      ),
    },
  };
}
