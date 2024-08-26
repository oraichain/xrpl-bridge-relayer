import { SimulateCosmWasmClient } from "@oraichain/cw-simulate";
import { readFileSync } from "fs";
import { resolve } from "path";
import { XrplTransactionAndMetadataWrap } from "../src/type";

export const deployTokenFactory = async (
  client: SimulateCosmWasmClient,
  senderAddress: string
) => {
  const tokenFactoryCode = readFileSync(
    resolve(__dirname, "testdata", "tokenfactory.wasm")
  );
  const { codeId } = await client.upload(
    senderAddress,
    tokenFactoryCode,
    "auto"
  );
  const { contractAddress } = await client.instantiate(
    senderAddress,
    codeId,
    {},
    "tokenfactory"
  );
  return contractAddress;
};

export const generateTicketAllocationTransaction =
  (): XrplTransactionAndMetadataWrap => {
    return {
      transaction: {
        Account: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
        Fee: "396",
        Sequence: 2748885,
        Signers: [
          {
            Signer: {
              Account: "rNY2x1JcUL7bLtKmW1gEDu54YTQu4jjxok",
              SigningPubKey:
                "ED72C80CFBB7F8E66F5B5FFDCEBACB8A81091D8B9C97709EF4E7A3CD1EAFEDC99F",
              TxnSignature:
                "65E17EC2ED076FBC74520B4B2E359CF7CE41F738E4B6D66AF26532FA8EF02169185194B1EA58A7BE2290FBE367F5B53722C43B3E6A4315C9C55DD6D28E06AB08",
            },
          },
          {
            Signer: {
              Account: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
              SigningPubKey:
                "ED6E8F5E1FFF79E37FA5F996546D3B464F4B313C0CB2C80C3602F8102505F46430",
              TxnSignature:
                "370D3A6C7065B6FE8804C60F8574C140395A3B97FDAD81AC45B307C8A498A43D6CD5DB8BF37854DBD6D107DB4659BE6785B0050CD13BF9838B3CB017AA96AF02",
            },
          },
        ],
        SigningPubKey: "",
        TicketCount: 60,
        TransactionType: "TicketCreate",
      },
      metadata: {
        TransactionIndex: 1,
        TransactionResult: "tesSUCCESS",
        AffectedNodes: [
          {
            CreatedNode: {
              LedgerEntryType: "Ticket",
              LedgerIndex:
                "04AC67591510CF5FEBC6BCC94251D49BE48C1822FA98345E82937EA35683C3A5",
              NewFields: {
                Account: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
                OwOwnerNode: "1",
                TicketSequence: 2748925,
              },
            },
          },
          {
            CreatedNode: {
              LedgerEntryType: "Ticket",
              LedgerIndex:
                "0B1A495EBCE0173A2F7F4F277CF4D2D7FEF5869BBFE14DA0533C81AC3F08505A",
              NewFields: {
                Account: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
                OwOwnerNode: "1",
                TicketSequence: 2748927,
              },
            },
          },
          {
            CreatedNode: {
              LedgerEntryType: "Ticket",
              LedgerIndex:
                "1679C413200BF0B2E4E8C7529813AE826C73279886BCE6AD5799AEFED100EF02",
              NewFields: {
                Account: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
                OwOwnerNode: "1",
                TicketSequence: 2748945,
              },
            },
          },
        ],
      },
      hash: "46560115B8E7C485341AFF7EA159AF78FE90DE11E6F3125549C8F3BA792925B4",
    };
  };

export const generateTrustSetTransaction =
  (): XrplTransactionAndMetadataWrap => {
    return {
      transaction: {
        Account: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
        Fee: "396",
        Sequence: 0,
        TicketSequence: 2748925,
        Signers: [
          {
            Signer: {
              Account: "rNY2x1JcUL7bLtKmW1gEDu54YTQu4jjxok",
              SigningPubKey:
                "ED72C80CFBB7F8E66F5B5FFDCEBACB8A81091D8B9C97709EF4E7A3CD1EAFEDC99F",
              TxnSignature:
                "65E17EC2ED076FBC74520B4B2E359CF7CE41F738E4B6D66AF26532FA8EF02169185194B1EA58A7BE2290FBE367F5B53722C43B3E6A4315C9C55DD6D28E06AB08",
            },
          },
          {
            Signer: {
              Account: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
              SigningPubKey:
                "ED6E8F5E1FFF79E37FA5F996546D3B464F4B313C0CB2C80C3602F8102505F46430",
              TxnSignature:
                "370D3A6C7065B6FE8804C60F8574C140395A3B97FDAD81AC45B307C8A498A43D6CD5DB8BF37854DBD6D107DB4659BE6785B0050CD13BF9838B3CB017AA96AF02",
            },
          },
        ],
        LimitAmount: {
          currency: "OCH",
          issuer: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
          value: "10000000000",
        },
        SigningPubKey: "",
        TransactionType: "TrustSet",
      },
      metadata: {
        TransactionIndex: 1,
        TransactionResult: "tesSUCCESS",
        AffectedNodes: [
          {
            ModifiedNode: {
              LedgerEntryType: "AccountRoot",
              LedgerIndex:
                "4B11FDB66F1C20049BDDD349E418F2903540B8A3AB068F1CE64DD5ECA70278B7",
              PreviousTxnID:
                "890CF4D0B23E425753391C3F30AB9CFC20E6456574149CBA293E8543AB243AFC",
              PreviousTxnLgrSeq: 3140366,
            },
          },
          {
            CreatedNode: {
              LedgerEntryType: "RippleState",
              LedgerIndex:
                "8C452A45EC10413134637CCD24575D2B6990B58FEB571DC875EAF6616E71B1F7",
              NewFields: {
                Balance: {
                  currency: "OCH",
                  issuer: "rrrrrrrrrrrrrrrrrrrrBZbvji",
                  value: "0",
                },
                Flags: 65536,
                HighLimit: {
                  currency: "OCH",
                  issuer: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
                  value: "0",
                },
                HighNode: "1",
                LowLimit: {
                  currency: "OCH",
                  issuer: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
                  value: "10000000000",
                },
              },
            },
          },
          {
            ModifiedNode: {
              FinalFields: {
                Account: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
                Balance: "99999976",
                Flags: 0,
                OwnerCount: 1,
                Sequence: 3098546,
              },
              LedgerEntryType: "AccountRoot",
              LedgerIndex:
                "94DDD67F4CFA1415F86E5A13C0F7BC53E925013BCAD980F2277C95E24F5FA138",
              PreviousFields: {
                Balance: "99999988",
                OwnerCount: 0,
                Sequence: 3098545,
              },
              PreviousTxnID:
                "D2EB7F74EF2775CEC8280DADD1B45CD26922CCB9314371B7B7057F2BE758B97A",
              PreviousTxnLgrSeq: 3140018,
            },
          },
          {
            CreatedNode: {
              LedgerEntryType: "DirectoryNode",
              LedgerIndex:
                "AD1A5E589C54F2A3D6EE6975D170CEAFF6EC1E8A177970E703510F1302A0F075",
              NewFields: {
                Owner: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
                RootIndex:
                  "AD1A5E589C54F2A3D6EE6975D170CEAFF6EC1E8A177970E703510F1302A0F075",
              },
            },
          },
          {
            ModifiedNode: {
              FinalFields: {
                Flags: 0,
                Owner: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
                RootIndex:
                  "A5C04EF2D9CF45162F10037C7CB0F7446822424FA8C0F17A0A370B7794CA528B",
              },
              LedgerEntryType: "DirectoryNode",
              LedgerIndex:
                "FCDCBC3909937179BBE37676F8468796FFF46F64FBD1F9025C61E48874605D6A",
            },
          },
        ],
      },
      hash: "F36487525F531187CD5628FFCD719A5F7730E429343E2AB87923985FD2BBF118",
    };
  };

export const generateTransferXRPFromXrplToOraiTx =
  (): XrplTransactionAndMetadataWrap => {
    return {
      transaction: {
        Account: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
        Amount: "10000",
        Destination: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
        DestinationTag: 100,
        Fee: "12",
        Flags: 0,
        LastLedgerSequence: 3223727,
        Memos: [
          {
            Memo: {
              MemoData:
                "7B2274797065223A226F7261696272696467652D7872706C2D7631222C226F7261695F726563697069656E74223A226F726169317A6130376A73786C396868776D75336B7468337539337371386A73747A64356D76727076716B227D",
            },
          },
        ],
        Sequence: 3098560,
        SigningPubKey:
          "ED6E8F5E1FFF79E37FA5F996546D3B464F4B313C0CB2C80C3602F8102505F46430",
        TransactionType: "Payment",
        TxnSignature:
          "0EA39C3BFB8F6BA515BB2E9AC02CB7F74FE8A0EA005AA6E231FD66F39837749765F64E86E4F0FBBF0668A246CC0169689C24219262ECB805E699E1AD9DF8430E",
      },
      metadata: {
        AffectedNodes: [
          {
            ModifiedNode: {
              FinalFields: {
                Account: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
                Balance: "2620841963",
                Flags: 9043968,
                OwnerCount: 57,
                Sequence: 2748957,
                TicketCount: 56,
              },
              LedgerEntryType: "AccountRoot",
              LedgerIndex:
                "4B11FDB66F1C20049BDDD349E418F2903540B8A3AB068F1CE64DD5ECA70278B7",
              PreviousFields: { Balance: "2620831963" },
              PreviousTxnID:
                "85549A8883C8B25F942F199B532A469B9BDBAB0972B07445EC6662DA23EE9163",
              PreviousTxnLgrSeq: 3160190,
            },
          },
          {
            ModifiedNode: {
              FinalFields: {
                Account: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
                Balance: "99989796",
                Flags: 0,
                OwnerCount: 2,
                Sequence: 3098561,
              },
              LedgerEntryType: "AccountRoot",
              LedgerIndex:
                "94DDD67F4CFA1415F86E5A13C0F7BC53E925013BCAD980F2277C95E24F5FA138",
              PreviousFields: { Balance: "99999808", Sequence: 3098560 },
              PreviousTxnID:
                "D49AED4B3773C92E00A0AC83B8673F4878E8D5650F4ABFB3FF2C99A1CF40D335",
              PreviousTxnLgrSeq: 3193666,
            },
          },
        ],
        TransactionIndex: 2,
        TransactionResult: "tesSUCCESS",
        delivered_amount: "10000",
      },
      hash: "795237D25562B5F6F6D975264121D4786CE52AF8A86A8F018436ABEE04822DBA",
    };
  };

export const generateTransferIssuedTokenFromXrplToOraiTransactionWithSourceXRPL =
  (): XrplTransactionAndMetadataWrap => {
    return {
      transaction: {
        Account: "rNY2x1JcUL7bLtKmW1gEDu54YTQu4jjxok",
        Amount: {
          currency: "OCH",
          issuer: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
          value: "1000000000000000e-3",
        },
        Destination: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
        DestinationTag: 100,
        Fee: "12",
        Flags: 0,
        LastLedgerSequence: 3193684,
        Memos: [
          {
            Memo: {
              MemoData:
                "7B2274797065223A226F7261696272696467652D7872706C2D7631222C226F7261695F726563697069656E74223A226F726169316D79636D6879726D64366475737034303872746A677A6C6B3737333876687467717968787874227D",
            },
          },
        ],
        Sequence: 3098559,
        SigningPubKey:
          "ED6E8F5E1FFF79E37FA5F996546D3B464F4B313C0CB2C80C3602F8102505F46430",
        TransactionType: "Payment",
        TxnSignature:
          "EB2A59ADB226835E8C7EE1DD5302CCBE9DDBB6C5EFAEF09E30E50F640F215E170B317F206A8CE5F210BE8A219342EB6DCE3AE1BC967A8E65FC82E7E4EF983A0F",
      },
      metadata: {
        AffectedNodes: [
          {
            ModifiedNode: {
              FinalFields: {
                Balance: {
                  currency: "636F736D6F736633333963366536613300000000",
                  issuer: "rrrrrrrrrrrrrrrrrrrrBZbvji",
                  value: "9899999697998900e4",
                },
                Flags: 65536,
                HighLimit: {
                  currency: "636F736D6F736633333963366536613300000000",
                  issuer: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
                  value: "0",
                },
                HighNode: "1",
                LowLimit: {
                  currency: "636F736D6F736633333963366536613300000000",
                  issuer: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
                  value: "1000000000000000e7",
                },
                LowNode: "0",
              },
              LedgerEntryType: "RippleState",
              LedgerIndex:
                "44C73EB2E93F23B08A1FA4DA5569E1595D39E6B74D141A9B381A3CA230DD6AE0",
              PreviousFields: {
                Balance: {
                  currency: "636F736D6F736633333963366536613300000000",
                  issuer: "rrrrrrrrrrrrrrrrrrrrBZbvji",
                  value: "9899999797998900e4",
                },
              },
              PreviousTxnID:
                "46560115B8E7C485341AFF7EA159AF78FE90DE11E6F3125549C8F3BA792925B4",
              PreviousTxnLgrSeq: 3193292,
            },
          },
          {
            ModifiedNode: {
              FinalFields: {
                Account: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
                Balance: "99999808",
                Flags: 0,
                OwnerCount: 2,
                Sequence: 3098560,
              },
              LedgerEntryType: "AccountRoot",
              LedgerIndex:
                "94DDD67F4CFA1415F86E5A13C0F7BC53E925013BCAD980F2277C95E24F5FA138",
              PreviousFields: { Balance: "99999820", Sequence: 3098559 },
              PreviousTxnID:
                "46560115B8E7C485341AFF7EA159AF78FE90DE11E6F3125549C8F3BA792925B4",
              PreviousTxnLgrSeq: 3193292,
            },
          },
        ],
        TransactionIndex: 0,
        TransactionResult: "tesSUCCESS",
        delivered_amount: {
          currency: "OCH",
          issuer: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
          value: "1000000000000000e-3",
        },
      },
      hash: "D49AED4B3773C92E00A0AC83B8673F4878E8D5650F4ABFB3FF2C99A1CF40D335",
    };
  };

export const generateSingerListSetTransactions =
  (): XrplTransactionAndMetadataWrap => {
    return {
      transaction: {
        Account: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
        Fee: "48",
        Flags: 0,
        LastLedgerSequence: 3235396,
        Sequence: 0,
        SignerEntries: [
          {
            SignerEntry: {
              Account: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
              SignerWeight: 1,
            },
          },
          {
            SignerEntry: {
              Account: "rNY2x1JcUL7bLtKmW1gEDu54YTQu4jjxok",
              SignerWeight: 1,
            },
          },
          {
            SignerEntry: {
              Account: "rNHwJcYfvkmJCUpMX6vyR6PGFurKonVqJP",
              SignerWeight: 1,
            },
          },
        ],
        SignerQuorum: 2,
        Signers: [
          {
            Signer: {
              Account: "rU4gm7sxVrefzCRd4LTcVj5CR7xxkpEUA",
              SigningPubKey:
                "ED6F9EC68D92087B053128F04AD15A28EB6BBEE52F6A2D3A6173E95CD554B98BA0",
              TxnSignature:
                "030E94DB432245D6F819AA5C81395E29F86DA5C5ACA7A2DD603A32BE4F67774126F459FC656817680883C43C31FEE1341734FBA4750E1CF2058527B2F4732200",
            },
          },
          {
            Signer: {
              Account: "rNY2x1JcUL7bLtKmW1gEDu54YTQu4jjxok",
              SigningPubKey:
                "ED72C80CFBB7F8E66F5B5FFDCEBACB8A81091D8B9C97709EF4E7A3CD1EAFEDC99F",
              TxnSignature:
                "9F859F8360D17259A2EF56273DBAECA4E68F81D94FE3CB83317E09BCCB0460C8F368811F08722CCBC305CDA8354F58BBE9A842AEA79DF900E3F66FF178C76D02",
            },
          },
          {
            Signer: {
              Account: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
              SigningPubKey:
                "ED6E8F5E1FFF79E37FA5F996546D3B464F4B313C0CB2C80C3602F8102505F46430",
              TxnSignature:
                "FBA577E66E5E6894A08824DF546014D8ED647359AA952309797BC31D547D0B775FC3B5D181B37059CCC059481934350E6B90E2D4DA83E78DF9CAE2775C8D2B0E",
            },
          },
        ],
        SigningPubKey: "",
        TicketSequence: 2748927,
        TransactionType: "SignerListSet",
      },
      metadata: {
        AffectedNodes: [
          {
            ModifiedNode: {
              FinalFields: {
                Flags: 65536,
                OwnerNode: "1",
                SignerEntries: [
                  {
                    SignerEntry: {
                      Account: "rNHwJcYfvkmJCUpMX6vyR6PGFurKonVqJP",
                      SignerWeight: 1,
                    },
                  },
                  {
                    SignerEntry: {
                      Account: "rNY2x1JcUL7bLtKmW1gEDu54YTQu4jjxok",
                      SignerWeight: 1,
                    },
                  },
                  {
                    SignerEntry: {
                      Account: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
                      SignerWeight: 1,
                    },
                  },
                ],
                SignerListID: 0,
                SignerQuorum: 2,
              },
              LedgerEntryType: "SignerList",
              LedgerIndex:
                "1903B6975C6147F13A20B812B802DD9BA09ACF8700EA532613CFDA42A184E213",
              PreviousFields: {
                SignerEntries: [
                  {
                    SignerEntry: {
                      Account: "rU4gm7sxVrefzCRd4LTcVj5CR7xxkpEUA",
                      SignerWeight: 1,
                    },
                  },
                  {
                    SignerEntry: {
                      Account: "rNY2x1JcUL7bLtKmW1gEDu54YTQu4jjxok",
                      SignerWeight: 1,
                    },
                  },
                  {
                    SignerEntry: {
                      Account: "rEBrXvKRhhQRbSc4PYYgyPdbDSU8DjvCqp",
                      SignerWeight: 1,
                    },
                  },
                ],
              },
            },
          },
          {
            ModifiedNode: {
              FinalFields: {
                Account: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
                Balance: "2620841771",
                Flags: 9043968,
                OwnerCount: 54,
                Sequence: 2748958,
                TicketCount: 53,
              },
              LedgerEntryType: "AccountRoot",
              LedgerIndex:
                "4B11FDB66F1C20049BDDD349E418F2903540B8A3AB068F1CE64DD5ECA70278B7",
              PreviousFields: {
                Balance: "2620841819",
                OwnerCount: 55,
                TicketCount: 54,
              },
              PreviousTxnID:
                "FE46499B3F7E4FC08678CD9E48FBF7561282642985CEDB276A5A855F4B9EC7A2",
              PreviousTxnLgrSeq: 3235366,
            },
          },
          {
            ModifiedNode: {
              FinalFields: {
                Flags: 0,
                IndexNext: "1",
                IndexPrevious: "1",
                Owner: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
                RootIndex:
                  "A5C04EF2D9CF45162F10037C7CB0F7446822424FA8C0F17A0A370B7794CA528B",
              },
              LedgerEntryType: "DirectoryNode",
              LedgerIndex:
                "A5C04EF2D9CF45162F10037C7CB0F7446822424FA8C0F17A0A370B7794CA528B",
            },
          },
          {
            DeletedNode: {
              FinalFields: {
                Account: "rK6GUy3ki2DFxbqe6CyZiSNZvgiUmDBPZU",
                Flags: 0,
                OwnerNode: "0",
                PreviousTxnID:
                  "F3D3AC0C4A1C182E85981EACC6FB6443F4119BAEDE9506B669408995244E43D2",
                PreviousTxnLgrSeq: 3132943,
                TicketSequence: 2748912,
              },
              LedgerEntryType: "Ticket",
              LedgerIndex:
                "D74F462611557247B4684AD718314F13FBEA34AFC68711613AF4CE6EC6F18412",
            },
          },
        ],
        TransactionIndex: 0,
        TransactionResult: "tesSUCCESS",
      },
      hash: "A9778515C739B26E4377131056E7190AD914AFBBD37568BE04645704D1FC2651",
    };
  };
