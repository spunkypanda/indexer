import { ethers, BigNumber } from 'ethers';

// TODO: Add definite type for TokenTransferLog
export type TokenTransferLog = Record<string, any>;

export interface TokenTransferData {
  done: boolean;
  result?: ethers.utils.Result;
  value?: BigNumber | string;
  from?: string;
  txHash?: string;
  txIndex?: number;
  to?: string;
  address?: string;
  logIndex?: number,
  blockHash?: string,
  blockNumber?: number,
};
