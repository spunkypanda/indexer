/* eslint-disable @typescript-eslint/no-explicit-any */

import { Queue, QueueScheduler, Worker } from "bullmq";
import { randomUUID } from "crypto";

import { logger } from "@/common/logger";
import { redis, redisDuplicate } from "@/common/redis";
import { config } from "@/config/index";
import * as syncEventsUtils from "@/events-sync/utils";
import { TransactionParser } from '../../transaction-parser/transaction-parser';
import { saveTokenTransfers, TokenTransfer } from '@/models/token-transfers';
import { Transaction } from '@/models/transactions';

const QUEUE_NAME = "backfill-token-transfers-queue";

export const queue = new Queue(QUEUE_NAME, {
  connection: redis.duplicate(),
  defaultJobOptions: {
    attempts: 10,
    removeOnComplete: 10000,
    removeOnFail: 10000,
  },
});
new QueueScheduler(QUEUE_NAME, { connection: redis.duplicate() });

// BACKGROUND WORKER ONLY
if (config.doBackgroundWork) {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { hash } = job.data;

      const txnParser = new TransactionParser();
      const currentTxnLogs = await syncEventsUtils.fetchTransactionLogs(hash);
      const { token_transfer: tokenTransferRecords } = txnParser.decodeTransactionLog(currentTxnLogs);

      const tokenTransfers: TokenTransfer[] = [];
      for (const tokenTransferRecord of tokenTransferRecords) {
        if (!tokenTransferRecord.done) continue;

        const tokenTransfer: TokenTransfer = {
          hash: tokenTransferRecord.txHash,
          from: tokenTransferRecord.from,
          to: tokenTransferRecord.to,
          value: tokenTransferRecord.value,
          address: tokenTransferRecord.address,
          blockNumber: tokenTransferRecord.blockNumber,
          blockHash: tokenTransferRecord.blockHash,
          txIndex: tokenTransferRecord.txIndex,
          logIndex: tokenTransferRecord.logIndex,
        };
        tokenTransfers.push(tokenTransfer);
      }

      try {
        await saveTokenTransfers(tokenTransfers);
      } catch (err) {
        console.error('Error encountered while backfilling token transfers:', err);
        await job.retry();
      }
    },
    { connection: redis.duplicate(), concurrency: 10 }
  );

  worker.on("error", (error) => {
    logger.error(QUEUE_NAME, `Worker errored: ${error}`);
  });


  console.log('>>>>>>>>>> WORKER STARTED >>>>>>>>>>'); 

  // !!! DISABLED

  // redlock
  //   .acquire([`${QUEUE_NAME}-lock-5`], 60 * 60 * 24 * 30 * 1000)
  //   .then(async () => {
  //     await addToQueue("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
  //   })
  //   .catch(() => {
  //     // Skip on any errors
  //   });
}

export const addJobsToQueue = async (transactions: Transaction[]) => {
  for await (const txn of transactions) {
    await queue.add(randomUUID(), { hash: txn.hash });
  }
};

export const addToQueue = async (hash: string) => {
  await queue.add(randomUUID(), { hash });
};
