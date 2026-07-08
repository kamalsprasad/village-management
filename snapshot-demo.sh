#!/bin/bash
# Create complete snapshot of Appwrite demo-data state
# Backs up: database, Docker volumes, configuration files

set -e

# Get the home directory of the user who invoked sudo (or current user if no sudo)
if [ -n "$SUDO_USER" ]; then
    REAL_HOME=$(getent passwd $SUDO_USER | cut -d: -f6)
    REAL_USER=$SUDO_USER
else
    REAL_HOME=$HOME
    REAL_USER=$USER
fi

BACKUP_DIR="$REAL_HOME/appwrite-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_DIR="$BACKUP_DIR/demo-snapshot-$TIMESTAMP"

echo "Creating backup directory..."
mkdir -p $SNAPSHOT_DIR

echo "Exporting Appwrite database..."
cd $REAL_HOME/appwrite
docker exec appwrite-mariadb mariadb-dump -u root -p$(grep _APP_DB_ROOT_PASS .env | cut -d '=' -f2) appwrite > $SNAPSHOT_DIR/database.sql 2>/dev/null || {
    echo "Warning: Database export failed. Continuing with volume backup..."
}

echo "Backing up Docker volumes..."
# Backup MariaDB volume (appwrite_appwrite-mariadb contains the actual data)
docker run --rm -v appwrite_appwrite-mariadb:/data -v $SNAPSHOT_DIR:/backup alpine tar czf /backup/mariadb-data.tar.gz -C /data .

# Backup Redis volume
docker run --rm -v appwrite-redis-data:/data -v $SNAPSHOT_DIR:/backup alpine tar czf /backup/redis-data.tar.gz -C /data .

# Backup Appwrite storage volume
docker run --rm -v appwrite-storage-data:/data -v $SNAPSHOT_DIR:/backup alpine tar czf /backup/storage-data.tar.gz -C /data .

# Backup Appwrite uploads volume
docker run --rm -v appwrite_appwrite-uploads:/data -v $SNAPSHOT_DIR:/backup alpine tar czf /backup/uploads-data.tar.gz -C /data .

echo "Backing up configuration files..."
cp .env docker-compose.yml $SNAPSHOT_DIR/

echo "Creating symlink to latest snapshot..."
rm -f $REAL_HOME/appwrite-demo-snapshot
ln -s $SNAPSHOT_DIR $REAL_HOME/appwrite-demo-snapshot

echo "Snapshot created at $SNAPSHOT_DIR"
echo "Latest symlink: $REAL_HOME/appwrite-demo-snapshot"
echo ""
echo "Backup includes:"
echo "  - Database SQL export"
echo "  - MariaDB volume"
echo "  - Redis volume"
echo "  - Storage volume"
echo "  - Uploads volume"
echo "  - Configuration files"
