#!/bin/bash
# Runs once when the MySQL container first initializes its data volume
# (docker-library/mysql sources every *.sh file here, with MYSQL_* env vars
# already set, before the server accepts other connections).
#
# The app user only has full privileges on its own database by default
# (granted automatically via MYSQL_USER/MYSQL_DATABASE). `prisma migrate dev`
# additionally needs to create and drop its own temporary shadow database,
# which requires schema privileges beyond that one database. This container
# is local-only and disposable, so granting them here is safe.
set -euo pipefail

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
	GRANT CREATE, ALTER, DROP, REFERENCES, INDEX ON *.* TO '${MYSQL_USER}'@'%';
	FLUSH PRIVILEGES;
EOSQL
