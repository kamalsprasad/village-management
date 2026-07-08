#!/bin/bash
# Restore Appwrite from demo-data snapshot

set -e

# Get the home directory of the user who invoked sudo (or current user if no sudo)
if [ -n "$SUDO_USER" ]; then
    REAL_HOME=$(getent passwd $SUDO_USER | cut -d: -f6)
    REAL_USER=$SUDO_USER
else
    REAL_HOME=$HOME
    REAL_USER=$USER
fi

SNAPSHOT_DIR="$REAL_HOME/appwrite-demo-snapshot"

if [ ! -d "$SNAPSHOT_DIR" ]; then
    echo "Error: Snapshot directory not found at $SNAPSHOT_DIR"
    echo "Run snapshot-demo.sh first to create a snapshot"
    exit 1
fi

echo "Stopping services..."
pm2 stop village-app || true
cd $REAL_HOME/appwrite && docker compose down

echo "Restoring configuration files..."
sudo cp $SNAPSHOT_DIR/.env $REAL_HOME/appwrite/
sudo cp $SNAPSHOT_DIR/docker-compose.yml $REAL_HOME/appwrite/
sudo chown $REAL_USER:$REAL_USER $REAL_HOME/appwrite/.env $REAL_HOME/appwrite/docker-compose.yml

echo "Restoring Docker volumes..."
# Restore MariaDB volume (appwrite_appwrite-mariadb contains the actual data)
docker run --rm -v appwrite_appwrite-mariadb:/data -v $SNAPSHOT_DIR:/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/mariadb-data.tar.gz -C /data"

# Restore Redis volume
docker run --rm -v appwrite-redis-data:/data -v $SNAPSHOT_DIR:/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/redis-data.tar.gz -C /data"

# Restore Appwrite storage volume
docker run --rm -v appwrite-storage-data:/data -v $SNAPSHOT_DIR:/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/storage-data.tar.gz -C /data"

# Restore Appwrite uploads volume (appwrite_appwrite-uploads)
docker run --rm -v appwrite_appwrite-uploads:/data -v $SNAPSHOT_DIR:/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/uploads-data.tar.gz -C /data"

echo "Starting Appwrite..."
cd $REAL_HOME/appwrite
docker compose up -d

echo "Waiting for Appwrite to be ready..."
sleep 15

# Optionally import SQL dump as a safety check
if [ -f "$SNAPSHOT_DIR/database.sql" ]; then
    echo "Importing SQL dump as a safety check..."
    docker exec -i $(docker ps -qf "name=appwrite-mariadb") \
        mariadb -u root -p$(grep _APP_DB_ROOT_PASS $REAL_HOME/appwrite/.env | cut -d= -f2) \
        appwrite < "$SNAPSHOT_DIR/database.sql"
fi

echo "Restarting app..."
pm2 start village-app || true

echo "Restore complete. Demo data is ready at https://[YOUR_DOMAIN].com"
