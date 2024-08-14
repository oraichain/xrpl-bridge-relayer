import { AccountInfoResponse, Client } from "xrpl";

export namespace XRPLRpcClient {
  export const accountInfo = async (
    client: Client,
    account: string
  ): Promise<AccountInfoResponse> => {
    const response = await client.request({
      command: "account_info",
      account: account,
    });
    return response;
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
      limit: 3,
    });

    return response;
  };
}

export default XRPLRpcClient;
