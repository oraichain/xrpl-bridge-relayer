import { AccountInfoResponse, Client } from "xrpl";

export namespace XRPLRpcClient {
  export const accountInfo = async (
    client: Client,
    account: string
  ): Promise<AccountInfoResponse> => {
    const [accountInfo, accountObjs] = await Promise.all([
      client.request({ command: "account_info", account }),
      client.request({ command: "account_objects", account }),
    ]);

    accountInfo.result.signer_lists = accountObjs.result.account_objects as any;

    return accountInfo;
  };

  export const accountTransactions = async (
    client: Client,
    account: string,
    minLedger: number,
    maxLedger: number,
    marker?: any
  ) => {
    const response = await client.request({
      command: "account_tx",
      account,
      ledger_index_min: minLedger,
      ledger_index_max: maxLedger,
      marker,
    });

    return response;
  };
}

export default XRPLRpcClient;
