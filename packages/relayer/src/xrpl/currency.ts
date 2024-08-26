import { Amount, IssuedCurrencyAmount } from "xrpl";

export function convertAmountToIssuedCurrencyAmount(
  amount: Amount
): IssuedCurrencyAmount {
  if (typeof amount == "string") {
    return {
      issuer: "rrrrrrrrrrrrrrrrrrrrrhoLvTp",
      currency: "XRP",
      value: Number(amount).toLocaleString("fullwide", {
        useGrouping: false,
      }),
    };
  }

  return {
    ...amount,
    value: Number(amount.value).toLocaleString("fullwide", {
      useGrouping: false,
    }),
  };
}
