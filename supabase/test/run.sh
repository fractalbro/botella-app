#!/bin/sh
# Uso: PGHOST=/tmp PGPORT=5499 PGUSER=postgres sh supabase/test/run.sh
set -e
cd "$(dirname "$0")"
psql -q -c 'drop database if exists botella_test' -c 'create database botella_test' >/dev/null 2>&1
psql -q -d botella_test -f mock.sql >/dev/null 2>&1
psql -q -d botella_test -v ON_ERROR_STOP=1 -f ../schema.sql >/dev/null 2>&1
psql -q -d botella_test -v ON_ERROR_STOP=1 -f ../schema.sql >/dev/null 2>&1   # se puede correr dos veces
psql -q -d botella_test -v ON_ERROR_STOP=1 -f flow.sql 2>&1 | grep -E 'ok ·|FALL|ERROR|TODO OK' | sed 's/^.*NOTICE:  //'
