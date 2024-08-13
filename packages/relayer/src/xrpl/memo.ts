import { Memo } from "xrpl";

const bridgeMemoType = "oraibridge-xrpl-v1";
export interface BridgeMemo {
  type: string;
  oraiRecipient: string;
}

export function decodeOraiRecipientFromMemo(memos: Memo[]): string {
  for (let memo of memos) {
    if (memo.Memo.MemoData.length == 0) {
      continue;
    }

    try {
      let bridgeMemo: BridgeMemo = JSON.parse(
        Buffer.from(memo.Memo.MemoData, "hex").toString("ascii")
      );
      if (bridgeMemo.type != bridgeMemoType) {
        return "";
      }
      return bridgeMemo.oraiRecipient;
    } catch (err) {
      continue;
    }
  }

  return "";
}

// EncodeCoreumRecipientToMemo encodes the bridge memo with the coreum recipient.
export function encodeOraiRecipientToMemo(oraiRecipient: string): Memo {
  let bridgeMemo: BridgeMemo = {
    type: bridgeMemoType,
    oraiRecipient,
  };

  return {
    Memo: {
      MemoData: Buffer.from(JSON.stringify(bridgeMemo), "utf-8").toString(
        "hex"
      ),
    },
  };
}
