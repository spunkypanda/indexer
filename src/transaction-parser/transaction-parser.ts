import { ethers } from 'ethers';

import { TokenTransferLog } from './types';
import { LogParser } from './log-parser';
import { TokenTransferLogParser } from './token-transfer-log-parser';

export class TransactionParser {
  private abiCoder: ethers.utils.AbiCoder;
  private parsers: LogParser[];

  constructor(parser?: LogParser) {
    // this.abiCoder = new ethers.utils.AbiCoder();
    this.abiCoder = ethers.utils.defaultAbiCoder;
    this.parsers = [TokenTransferLogParser.getLogParser(this.abiCoder)];
  }

  decodeTransactionLog(txLog: Record<string, any>): TokenTransferLog {
    const tokenTransferLog: TokenTransferLog = {};
    return this.parsers.reduce((acc, parser) => {
      const parserName = parser.getName();
      const decodedData = parser.decodeLogs(txLog.logs);
      // console.log('>> decodedData :', decodedData);
      acc[parserName] = decodedData;
      return acc;
    }, tokenTransferLog);
  }

  decodeTransactionLogs(txLogs: Record<string, any>[]): TokenTransferLog[] {
    return txLogs.map(this.decodeTransactionLog);
  }

  // async getTransactionLogsForAddress(address: string): Promise<TransactionLogs[]> {}
  async getTransactionLogsForAddress(address: string): Promise<TokenTransferLog[]> {
    const txLogs: Record<string, any>[] = [];
    return this.decodeTransactionLogs(txLogs);
  }
}
