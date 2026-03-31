-- =============================================================================
-- 01_EXTENSIONS.SQL
-- =============================================================================
-- PostgreSQL extensions required for the application.
-- Run this FIRST before any other scripts.
-- =============================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trigram similarity for fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Unaccent for accent-insensitive search
CREATE EXTENSION IF NOT EXISTS "unaccent";
