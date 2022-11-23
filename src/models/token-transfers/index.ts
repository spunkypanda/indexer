import { Log } from "@ethersproject/abstract-provider";
import _ from "lodash";

import { idb, pgp } from "@/common/db";
import { fromBuffer, toBuffer } from "@/common/utils";

export type TokenTransfer = {
  hash: string;
  from: string;
  to: string;
  value: string;
  address: string;
  blockHash: string;
  blockNumber: string;
  txIndex: string;
  logIndex: string;
};

export const saveTokenTransfers = async (tokenTransfers: TokenTransfer[]) => {
  if (_.isEmpty(tokenTransfers)) {
    return;
  }

  try {
    const columns = new pgp.helpers.ColumnSet(
      [
        "hash",
        "from",
        "to",
        "value",
        "address",
        "block",
        "block_hash",
        "tx_index",
        "log_index",
      ],
      { table: "token_transfers" }
    );

    const tokenTransferValues = _.map(tokenTransfers, (tokenTransfer) => ({
      hash: toBuffer(tokenTransfer.hash),
      from: toBuffer(tokenTransfer.from),
      to: toBuffer(tokenTransfer.to),
      value: tokenTransfer.value,
      address: toBuffer(tokenTransfer.address),
      block: tokenTransfer.blockNumber,
      block_hash: toBuffer(tokenTransfer.blockHash),
      tx_index: tokenTransfer.txIndex,
      log_index: tokenTransfer.logIndex,
    }));

    await idb.none(
      `
        INSERT INTO token_transfers (
          hash,
          "from",
          "to",
          "value",
          "address",
          "block",
          "block_hash",
          "tx_index",
          "log_index"
        ) VALUES ${pgp.helpers.values(tokenTransferValues, columns)}
        ON CONFLICT DO NOTHING
      `
    );

    console.log('>>>>> token transfer', tokenTransfers.length);
    return tokenTransfers;
  } catch (err) {
    console.error('>>>>> error', err);
    return [];
  }
};

export const getTokenTransfers = async (hash: string): Promise<TokenTransfer[]> => {
  const result = await idb.manyOrNone(
    `
      SELECT
        token_transfers.hash,
        token_transfers.from,
        token_transfers.to,
        token_transfers.value,
        token_transfers.address,
        token_transfers.block,
        token_transfers.block_hash,
        token_transfers.tx_index,
        token_transfers.log_index
      FROM token_transfers 
      WHERE token_transfers.hash = $/hash/
    `,
    { hash: toBuffer(hash) }
  );

  return result.map(item => ({
    hash: fromBuffer(item.hash),
    from: fromBuffer(item.from),
    to: fromBuffer(item.to),
    value: item.value,
    address: item.address,
    blockNumber: item.block,
    blockHash: fromBuffer(item.block_hash),
    txIndex: item.tx_index,
    logIndex: item.log_index,
  }));
};
