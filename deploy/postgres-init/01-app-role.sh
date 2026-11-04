#!/bin/sh
# Creates the application role. It must NOT be a superuser: superusers bypass
# PostgreSQL Row-Level Security, which is the second layer of tenant isolation.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
CREATE ROLE mcvc LOGIN PASSWORD '${APP_DB_PASSWORD}' NOSUPERUSER NOCREATEROLE NOBYPASSRLS;
CREATE DATABASE mcvc OWNER mcvc;
SQL
