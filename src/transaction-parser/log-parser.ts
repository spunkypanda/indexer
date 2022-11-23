import { ethers } from 'ethers';
import { Log } from '@ethersproject/abstract-provider';
import { TokenTransferData } from './types';


export abstract class LogParser {
  public abstract name: string;
  public abstract targetHash: string;
  public abstract encodedDataTypes: string[];

  // abstract getLogParser(abiCoder: ethers.utils.AbiCoder, targetHash: string, encodedDataTypes: []): LogParser;
  static getLogParser(abiCoder: ethers.utils.AbiCoder, targetHash: string, encodedDataTypes: []): any {}
  abstract decode(logs: Log): TokenTransferData;

  getName(): string {
    return this.name;
  }

  decodeLogs(logs: Log[]): TokenTransferData[] {
    const tokenTransferData: TokenTransferData[] = [];
    for (const log of logs) {
      const decodedData = this.decode(log);
      tokenTransferData.push(decodedData);
    }

    return tokenTransferData;
  }
}
