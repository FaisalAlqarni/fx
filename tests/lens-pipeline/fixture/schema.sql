-- Table for outbound campaign sends.
CREATE TABLE sends (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL,
  recipient_id BIGINT NOT NULL,
  state VARCHAR(20),
  provider_message_id VARCHAR(64),
  amount FLOAT
);
