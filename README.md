# Oraichain XRPL Bridge SDK

```bash
# build code:
cwtools build ../cw-xrpl-bridge/contracts/* -o packages/contracts-build/data
# build schema
cwtools build ../cw-xrpl-bridge/contracts/* -s
# gen code:
cwtools gents ../cw-xrpl-bridge/contracts/* -o packages/contracts-sdk/src
# gen doc:
yarn docs

# patch a package:
yarn patch-package @cosmjs/cosmwasm-stargate
```
