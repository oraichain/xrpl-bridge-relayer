# XRPL - bridge - relayer



## Installation

You can install xrplRelayer globally using npm `npm install -g @oraichain/xrpl-bridge-relayer` or yarn `yarn global add @oraichain/xrpl-bridge-relayer`

## Installation from source

1. Clone this repository
```https://github.com/oraichain/xrpl-bridge-sdk```

2. Run ```yarn``` to install all dependencies <br>

3. Create .env file with same structure like .env.example

4. Run ```yarn build```

5. Run ```cd packages/relayer```

6. Run ```yarn start```

## Usage

Type `xrplRelayer`

```bash
xrplRelayer [command]

Commands:
  xrplRelayer start  start relay packet between Oraichain and XRP Ledger

Options:
  -h, --help     Show help                                             [boolean]
      --version  Show version number                                   [boolean]
      --env      Path to JSON config file                      [default: ".env"]
```
