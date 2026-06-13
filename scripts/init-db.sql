-- Database initialization script for Kombe (SSCO)
-- This script sets up the database with required extensions and basic configuration

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone to Vietnam
SET timezone = 'Asia/Ho_Chi_Minh';

-- ULID generator function (Universally Unique Lexicographically Sortable Identifier)
-- Returns 26-char Crockford base32 string: 10 timestamp chars + 16 random chars
CREATE OR REPLACE FUNCTION generate_ulid() RETURNS TEXT AS $$
DECLARE
  encoding BYTEA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  ts_ms    BIGINT;
  rand     BYTEA;
  result   TEXT = '';
BEGIN
  ts_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  rand  := gen_random_bytes(10);

  -- Timestamp: 10 chars (48-bit ms, 5 bits per char, big-endian)
  result :=
      chr(get_byte(encoding, ((ts_ms >> 45) & 31)::int))
   || chr(get_byte(encoding, ((ts_ms >> 40) & 31)::int))
   || chr(get_byte(encoding, ((ts_ms >> 35) & 31)::int))
   || chr(get_byte(encoding, ((ts_ms >> 30) & 31)::int))
   || chr(get_byte(encoding, ((ts_ms >> 25) & 31)::int))
   || chr(get_byte(encoding, ((ts_ms >> 20) & 31)::int))
   || chr(get_byte(encoding, ((ts_ms >> 15) & 31)::int))
   || chr(get_byte(encoding, ((ts_ms >> 10) & 31)::int))
   || chr(get_byte(encoding, ((ts_ms >>  5) & 31)::int))
   || chr(get_byte(encoding, ( ts_ms        & 31)::int));

  -- Randomness: 16 chars (80 bits from 10 bytes, 5 bits per char)
  result := result
   || chr(get_byte(encoding,  (get_byte(rand, 0) >> 3) & 31))
   || chr(get_byte(encoding, ((get_byte(rand, 0) << 2) | (get_byte(rand, 1) >> 6)) & 31))
   || chr(get_byte(encoding,  (get_byte(rand, 1) >> 1) & 31))
   || chr(get_byte(encoding, ((get_byte(rand, 1) << 4) | (get_byte(rand, 2) >> 4)) & 31))
   || chr(get_byte(encoding, ((get_byte(rand, 2) << 1) | (get_byte(rand, 3) >> 7)) & 31))
   || chr(get_byte(encoding,  (get_byte(rand, 3) >> 2) & 31))
   || chr(get_byte(encoding, ((get_byte(rand, 3) << 3) | (get_byte(rand, 4) >> 5)) & 31))
   || chr(get_byte(encoding,   get_byte(rand, 4)        & 31))
   || chr(get_byte(encoding,  (get_byte(rand, 5) >> 3) & 31))
   || chr(get_byte(encoding, ((get_byte(rand, 5) << 2) | (get_byte(rand, 6) >> 6)) & 31))
   || chr(get_byte(encoding,  (get_byte(rand, 6) >> 1) & 31))
   || chr(get_byte(encoding, ((get_byte(rand, 6) << 4) | (get_byte(rand, 7) >> 4)) & 31))
   || chr(get_byte(encoding, ((get_byte(rand, 7) << 1) | (get_byte(rand, 8) >> 7)) & 31))
   || chr(get_byte(encoding,  (get_byte(rand, 8) >> 2) & 31))
   || chr(get_byte(encoding, ((get_byte(rand, 8) << 3) | (get_byte(rand, 9) >> 5)) & 31))
   || chr(get_byte(encoding,   get_byte(rand, 9)        & 31));

  RETURN result;
END
$$ LANGUAGE plpgsql VOLATILE;

-- Create a simple health check function
CREATE OR REPLACE FUNCTION health_check()
RETURNS TEXT AS $$
BEGIN
    RETURN 'Database is healthy at ' || NOW();
END;
$$ LANGUAGE plpgsql;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully';
    RAISE NOTICE 'Extensions enabled: pg_trgm, pgcrypto';
    RAISE NOTICE 'Functions: generate_ulid(), health_check()';
    RAISE NOTICE 'Timezone set to: Asia/Ho_Chi_Minh';
END $$;
