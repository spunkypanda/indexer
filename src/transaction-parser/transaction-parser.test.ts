import { TransactionParser } from './transaction-parser';

import txLogData from './sample-data.json';


describe('TransactionParser', () => {
  test.skip('Should return parsed txn logs result', () => {
    const transactionParser = new TransactionParser();
    // const result = transactionParser.decodeTransactionLogs(txLogData);
    // expect(result.token_transfer).toBeDefined();
    // expect(result.token_transfer).toBeInstanceOf(Array);
    // expect(result.token_transfer.length).toEqual(txLogData.logs.length);
  });
});
