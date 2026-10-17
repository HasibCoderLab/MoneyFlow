-- Runs only when the PostgreSQL data volume is created for the first time
-- (docker-entrypoint-initdb.d). Creates the throwaway integration-test
-- database, kept separate from the development data
-- (docs/architecture/database-and-testing.md, ADR-0007).
--
-- If your volume already exists, create it once by hand instead:
--   docker compose --env-file .env -f infrastructure/docker/docker-compose.yml \
--     exec postgres createdb -U "$POSTGRES_USER" moneyflow_test
CREATE DATABASE moneyflow_test;
