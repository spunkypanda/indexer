-- Up Migration

CREATE TABLE "token_transfers" (
  "hash" BYTEA NOT NULL,
  "from" BYTEA NOT NULL,
  "to" BYTEA NOT NULL,
  "value" text NOT NULL,
  "address" BYTEA NOT NULL,
  "block" int NOT NULL,
  "block_hash" BYTEA NOT NULL,
  "tx_index" int NOT NULL,
  "log_index" int NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Down Migration

DROP TABLE "rate_limit_rules";