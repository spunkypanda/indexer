import { bn, toTime } from "@/common/utils";
import { getSupportedChainName } from "@/websockets/opensea/utils";
import { ItemListedEventPayload } from "@opensea/stream-js/dist/types";
import { PartialOrderComponents } from "@/orderbook/orders/seaport";
import _ from "lodash";

export const handleEvent = (payload: ItemListedEventPayload): PartialOrderComponents | null => {
  if (getSupportedChainName() != payload.item.chain.name) {
    return null;
  }

  if (_.indexOf([null, "dutch"], payload.listing_type) === -1) {
    return null;
  }

  const [, contract, tokenId] = payload.item.nft_id.split("/");

  return {
    kind: "single-token",
    side: "sell",
    hash: payload.order_hash,
    price: bn(payload.base_price).div(payload.quantity).toString(),
    paymentToken: payload.payment_token.address,
    amount: payload.quantity,
    startTime: toTime(payload.listing_date),
    endTime: toTime(payload.expiration_date),
    contract,
    tokenId,
    offerer: payload.maker.address,
    taker: payload.taker?.address,
    isDynamic: !_.isNull(payload.listing_type),
    collectionSlug: payload.collection.slug,
  };
};
