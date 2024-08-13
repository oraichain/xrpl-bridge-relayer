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
}

export default XRPLRpcClient;
