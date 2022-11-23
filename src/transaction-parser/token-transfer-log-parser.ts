import { ethers, BigNumber } from 'ethers';
import { Log } from '@ethersproject/abstract-provider';

import { LogParser } from './log-parser';
import { TokenTransferData } from './types';

const TOKEN_TRANSFER_ABI_HASH = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Transfer (index_topic_1 address from, index_topic_2 address to, uint256 value)

export class TokenTransferLogParser extends LogParser {
  abiCoder: ethers.utils.AbiCoder;
  name = 'token_transfer';

  public targetHash = TOKEN_TRANSFER_ABI_HASH;
  public encodedDataTypes = ['uint256'];

  private constructor(abiCoder: ethers.utils.AbiCoder) {
    super();
    this.abiCoder = abiCoder;
  }

  static getLogParser(abiCoder: ethers.utils.AbiCoder): LogParser {
    return new TokenTransferLogParser(abiCoder);
  }

  decode(log: Log): TokenTransferData {
    const { transactionHash, blockHash, blockNumber, transactionIndex, topics, data, logIndex, address } = log;
    console.log('>>> Log ::', log);

    // Note: Filter ERC20 token transfers
    if (topics.length !== 3 || topics[0] !== this.targetHash) {
      return { done: false };
    }

    const [opHash, from, to] = topics;
    try {
      const result = this.abiCoder.decode(this.encodedDataTypes, data);
      const transferValue = result[0] as BigNumber;
      return {
        done: true,
        txHash: transactionHash,
        txIndex: transactionIndex,
        value: transferValue.toString(),
        result,
        from,
        to,
        address,
        logIndex,
        blockHash,
        blockNumber
      };
    } catch (err) {
      return { done: false };
    }
  }
}
