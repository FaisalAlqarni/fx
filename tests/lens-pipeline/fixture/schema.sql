-- A missing index on a foreign key. This is the database lens's finding.
-- The pipeline lens must say nothing about this file.
CREATE TABLE sends (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL,
  state VARCHAR(20),
  amount FLOAT
);
