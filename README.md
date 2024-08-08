# Oraichain XRPL Bridge SDK

<p align="center" width="100%">
  <br />
   <a href="https://github.com/oraichain/xrpl-bridge-sdk/blob/master/LICENSE"><img height="20" src="https://img.shields.io/badge/License-GNU%20GPL-blue.svg"></a>
   <a href="https://www.npmjs.com/package/@oraichain/xrpl-bridge-contracts-sdk"><img height="20" src="https://img.shields.io/github/package-json/v/oraichain/xrpl-bridge-sdk?filename=packages%2Fcontracts-sdk%2Fpackage.json"></a>
</p>

:information_desk_person: This repository holds contains several useful packages for the XRPL Bridge with Oraichain and is managed by the [Oraichain Labs](https://orai.io/) team.

## 📦 Packages

| Name                                                                                        | Description                                  |
| ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [@oraichain/xrpl-bridge-contracts-build](https://github.com/oraichain/xrpl-bridge-sdk/tree/master/packages/contracts-build) | Storing production XRPL Bridge CW contract builds and a helper function to deploy them. |
| [@oraichain/xrpl-bridge-contracts-sdk](https://github.com/oraichain/xrpl-bridge-sdk/tree/master/packages/contracts-sdk) | Storing production XRPL Bridge CW contract client and types in TypeScript to simplify contract interaction. |
| [@oraichain/xrpl-bridge-relayer](https://github.com/oraichain/xrpl-bridge-sdk/tree/master/packages/relayer) | A program responsible for relaying packets between XRPL and Oraichain. |

## 🛠 Developing

### Prerequisites

You should install the following dependencies beforehand:

- NPM
- Yarn (Yarn Berry 4.x is recommended)

Checkout the repository and bootstrap the yarn workspace:

```sh
# Clone the repo.
git clone https://github.com/oraichain/xrpl-bridge-sdk
cd xrpl-bridge-sdk
yarn
```

### Updating the packages

If you want to change the build and sdk packages, you can follow our [contract management pattern](https://docs.orai.io/developer-guides/cosmwasm-contract/manage-contract-pattern). Below are the commands we use to build the contract and generate types:

```sh
# build code:
cwtools build ../cw-xrpl-bridge/contracts/* -o packages/contracts-build/data
# build schema
cwtools build ../cw-xrpl-bridge/contracts/* -s
# gen code:
cwtools gents ../cw-xrpl-bridge/contracts/* -o packages/contracts-sdk/src
# gen doc:
yarn docs
```

### Testing

```sh
# Run all tests
yarn test

# ES lint
yarn eslint
```

### Building

```sh
yarn build
```

### Publishing

```sh
yarn deploy
```

### Patch a package

```sh
yarn patch-package @cosmjs/cosmwasm-stargate
```

For publishing onto NPM, you will need an credential key. Hence, it's best to let the github workflow do the work.

## Credits

🛠 Built by Oraichain Labs — if you like our tools, please consider delegating to [OWallet validators ⚛️](https://owallet.dev/validators)

## 🪪 License

All packages are [GPL 3.0](https://www.gnu.org/licenses/gpl-3.0.en.html) licensed.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED “AS IS”, AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
