/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { edb } from "@/common/db";
import { logger } from "@/common/logger";
import { formatEth, fromBuffer, toBuffer } from "@/common/utils";

const version = "v1";

export const getSalesBulkV1Options: RouteOptions = {
  description: "Get bulk access to historical sales",
  notes:
    "Get recent sales for a contract or token. For pagination API expect to receive the continuation from previous result",
  tags: ["api", "2. Aggregator"],
  plugins: {
    "hapi-swagger": {
      order: 52,
    },
  },
  validate: {
    query: Joi.object({
      contract: Joi.string()
        .lowercase()
        .pattern(/^0x[a-f0-9]{40}$/)
        .description(
          "Filter to a particular contract, e.g. `0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63`"
        ),
      token: Joi.string()
        .lowercase()
        .pattern(/^0x[a-f0-9]{40}:[0-9]+$/)
        .description(
          "Filter to a particular token, e.g. `0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:123`"
        ),
      limit: Joi.number().integer().min(1).max(1000).default(100),
      continuation: Joi.string().pattern(/^(\d+)_(\d+)_(\d+)$/),
    }),
  },
  response: {
    schema: Joi.object({
      sales: Joi.array().items(
        Joi.object({
          token: Joi.object({
            contract: Joi.string()
              .lowercase()
              .pattern(/^0x[a-f0-9]{40}$/),
            tokenId: Joi.string().pattern(/^[0-9]+$/),
          }),
          orderSide: Joi.string().valid("ask", "bid"),
          from: Joi.string()
            .lowercase()
            .pattern(/^0x[a-f0-9]{40}$/),
          to: Joi.string()
            .lowercase()
            .pattern(/^0x[a-f0-9]{40}$/),
          amount: Joi.string(),
          txHash: Joi.string()
            .lowercase()
            .pattern(/^0x[a-f0-9]{64}$/),
          timestamp: Joi.number(),
          price: Joi.number().unsafe().allow(null),
        })
      ),
      continuation: Joi.string()
        .pattern(/^(\d+)_(\d+)_(\d+)$/)
        .allow(null),
    }).label(`getSalesBulk${version.toUpperCase()}Response`),
    failAction: (_request, _h, error) => {
      logger.error(
        `get-sales-bulk-${version}-handler`,
        `Wrong response schema: ${error}`
      );
      throw error;
    },
  },
  handler: async (request: Request) => {
    const query = request.query as any;

    let paginationFilter = "";
    let tokenFilter = "";

    // Filters
    if (query.contract) {
      (query as any).contract = toBuffer(query.contract);
      tokenFilter = `WHERE fill_events_2.contract = $/contract/`;
    }
    if (query.token) {
      const [contract, tokenId] = query.token.split(":");

      (query as any).contract = toBuffer(contract);
      (query as any).tokenId = tokenId;
      tokenFilter = `WHERE fill_events_2.contract = $/contract/ AND fill_events_2.token_id = $/tokenId/`;
    }

    if (query.continuation) {
      const [block, logIndex, batchIndex] = query.continuation.split("_");
      (query as any).block = block;
      (query as any).logIndex = logIndex;
      (query as any).batchIndex = batchIndex;

      paginationFilter = `
        ${tokenFilter == "" ? "WHERE " : " AND "}
        (fill_events_2.block, fill_events_2.log_index, fill_events_2.batch_index) < ($/block/, $/logIndex/, $/batchIndex/)
      `;
    }

    try {
      const baseQuery = `
        SELECT
          fill_events_2_data.*
        FROM (
          SELECT
            fill_events_2.contract,
            fill_events_2.token_id,
            fill_events_2.order_side,
            fill_events_2.maker,
            fill_events_2.taker,
            fill_events_2.amount,
            fill_events_2.tx_hash,
            fill_events_2.timestamp,
            fill_events_2.price,
            fill_events_2.block,
            fill_events_2.log_index,
            fill_events_2.batch_index
          FROM fill_events_2
            ${tokenFilter}
            ${paginationFilter}
          ORDER BY
            fill_events_2.block DESC,
            fill_events_2.log_index DESC,
            fill_events_2.batch_index DESC
          LIMIT $/limit/
        ) AS fill_events_2_data
      `;

      const rawResult = await edb.manyOrNone(baseQuery, query);

      let continuation = null;
      if (rawResult.length === query.limit) {
        continuation =
          rawResult[rawResult.length - 1].block +
          "_" +
          rawResult[rawResult.length - 1].log_index +
          "_" +
          rawResult[rawResult.length - 1].batch_index;
      }

      const result = rawResult.map((r) => ({
        token: {
          contract: fromBuffer(r.contract),
          tokenId: r.token_id,
        },
        orderSide: r.order_side === "sell" ? "ask" : "bid",
        from: fromBuffer(r.maker),
        to: fromBuffer(r.taker),
        amount: String(r.amount),
        txHash: fromBuffer(r.tx_hash),
        timestamp: r.timestamp,
        price: r.price ? formatEth(r.price) : null,
      }));

      return {
        sales: result,
        continuation,
      };
    } catch (error) {
      logger.error(
        `get-sales-bulk-${version}-handler`,
        `Handler failure: ${error}`
      );
      throw error;
    }
  },
};