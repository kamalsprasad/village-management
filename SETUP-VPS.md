# VPS Deployment Guide - [YOUR_DOMAIN].com

Deploy the Village Management System to your Oracle Cloud VPS (Ubuntu) with demo data and reset capability.

## Prerequisites

- Oracle Cloud VPS running Ubuntu 22.04+
- Domain `[YOUR_DOMAIN].com` pointing to your VPS IP
- SSH access to the server
- Sudo privileges

## Quick Summary

1. Install Docker, Node.js, nginx
2. Deploy Appwrite (backend)
3. Build and serve the Quasar app
4. Configure nginx + SSL
5. Load demo data via OOBE
6. Create reset snapshot script

---

## Step 1: Prepare the VPS

### 1.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Docker

```bash
# Remove any conflicting packages
sudo apt remove docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc 2>/dev/null || true

# Install prerequisites
sudo apt update
sudo apt install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update and install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

### 1.3 Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # v20.x.x
```

### 1.4 Install nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 1.5 Install PM2 (process manager)

```bash
sudo npm install -g pm2
```

---

## Step 2: Deploy Appwrite

### 2.1 Create Appwrite Directory

```bash
mkdir -p ~/appwrite
cd ~/appwrite
```

### 2.2 Install Appwrite

```bash
docker run -it --rm \
    --volume /var/run/docker.sock:/var/run/docker.sock \
    --volume "$(pwd)"appwrite:/usr/src/code/appwrite:rw \
    --entrypoint="install" \
    appwrite/appwrite:1.8.1
```

**Prompts:**

- HTTP port: `8080` (we'll proxy through nginx)
- HTTPS port: `8443` (or skip)
- Hostname: `localhost`

### 2.3 Configure Appwrite for Production

Edit `~/appwrite/.env`:

```bash
# Change these values
_APP_ENV=production
_APP_DOMAIN=[YOURDOMAIN].com
_APP_DOMAIN_TARGET=[YOURDOMAIN].com
_APP_CONSOLE_WHITELIST_ROOT=enabled
```

Restart Appwrite:

```bash
cd ~/appwrite && docker compose up -d
```

### 2.4 Initial Appwrite Setup

1. Visit `http://YOUR_VPS_IP:8080`
2. Create admin account
3. Create new project named `Village Management`
4. Save the **Project ID** ( you'll need it later)

---

## Step 3: Build and Deploy the App

### 3.1 Clone Repository

```bash
cd ~
git clone https://github.com/kamalsprasad/village-management.git
cd village-management
```

### 3.2 Configure Environment

Create `.env.production`:

```bash
cp .env.example .env.production
```

Edit `.env.production`:

```env
# Appwrite (via nginx proxy)
VITE_APPWRITE_ENDPOINT=https://[YOUR_DOMAIN].com/v1
VITE_APPWRITE_PROJECT_ID=your-project-id-from-step-2-4

# Function IDs (set after deployment)
VITE_APPWRITE_FUNCTION_CHECK_USERS=checkUsersExist
VITE_APPWRITE_FUNCTION_WIPE_DATA=wipeAllData
```

### 3.3 Install Dependencies

```bash
npm install
# or
yarn
```

### 3.4 Set Up Database and Functions

**Create API Key in Appwrite Console:**

1. Go to `http://YOUR_VPS_IP:8080`
2. Settings → API Keys → Create
3. Name: `VPS Setup`
4. Scopes: Database (all), Users (read), Functions (all)
5. Copy the key

**Add to env and setup:**

```bash
export APPWRITE_ENDPOINT=http://localhost:8080/v1
export APPWRITE_PROJECT_ID=your-project-id
export APPWRITE_API_KEY=your-api-key

npm run setup:appwrite
npm run seed:roles
```

### 3.5 Deploy Functions

```bash
cd server/

# Install Appwrite CLI locally if not using global
npm install -g appwrite-cli@16.0.0

# Login (use your admin credentials)
appwrite login --endpoint http://localhost:8080/v1

# Deploy
appwrite push functions
```

**Set function environment variables** in Appwrite Console:

- `APPWRITE_ENDPOINT`: see note below
- `APPWRITE_PROJECT_ID`: your project ID
- `APPWRITE_API_KEY`: your API key

> **Linux VPS Note:** `host.docker.internal` does not work on Linux. Appwrite functions run on
> the `runtimes` Docker network, which is separate from the `appwrite` network. Use the
> `appwrite` network gateway IP instead:
>
> ```bash
> docker network inspect appwrite --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}'
> ```
>
> Set `APPWRITE_ENDPOINT` to `http://<gateway-ip>:8080/v1` (e.g. `http://172.20.0.1:8080/v1`).
> This IP can change if Docker recreates the network — re-run the command above to confirm after
> any `docker compose down/up` cycle.

**Update .env.production** with function IDs from console.

### 3.6 Build for Production

```bash
cd ~/village-management

# Build SSR for production
npx quasar build -m ssr
```

### 3.7 Start with PM2

```bash
# Navigate to SSR dist
cd dist/ssr

# Start with PM2
pm2 start index.js --name village-app \
    --env production \
    --cwd ~/village-management/dist/ssr

# Save PM2 config
pm2 save
pm2 startup
```

---

## Step 4: Configure nginx + SSL

### 4.1 Create nginx Config

```bash
sudo nano /etc/nginx/sites-available/village
```

Add:

```nginx
server {
    listen 80;
    server_name [YOUR_DOMAIN].com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name [YOUR_DOMAIN].com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Quasar SSR app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy Appwrite API
    location /v1/ {
        proxy_pass http://localhost:8080/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase limits for file uploads
        client_max_body_size 100M;
        proxy_read_timeout 300s;
    }

    # Proxy Appwrite realtime (websockets)
    location ~ ^/v1/realtime {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/village /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.2 Get SSL Certificate (Certbot)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d [YOUR_DOMAIN].com

# Auto-renewal is set up automatically
```

---

## Step 5: Load Demo Data (OOBE)

### 5.1 First Visit

1. Visit `https://[YOUR_DOMAIN].com`
2. The setup wizard will appear (no existing settings detected)
3. Select **"Explore with Sample Data"**
4. Wait for seeding to complete

### 5.2 Verify Demo Data

Login with seeded admin account:

- **Email:** Check the sample data seed for admin credentials
- Or create a new admin account through the setup wizard

You should see:

- 6 households
- 20+ residents
- 3 council members
- Sample farm data (plots, crops, plantings)

---

## Step 6: Create Reset Capability

To reset to "just after demo data load" state, we'll create a database snapshot script.

### 6.1 Create Reset Script

```bash
sudo nano /usr/local/bin/reset-village-demo.sh
```

Add:

```bash
#!/bin/bash
# Reset Village Management to post-demo-data state

set -e

echo "Stopping app..."
pm2 stop village-app

echo "Creating Appwrite backup before reset..."
cd ~/appwrite
docker exec appwrite mariadb-dump -u user -ppassword appwrite > ~/backups/appwrite-pre-reset-$(date +%Y%m%d-%H%M%S).sql 2>/dev/null || true

echo "Stopping Appwrite..."
docker compose down

echo "Resetting Appwrite volumes (keeping project structure)..."
# Option A: Keep project, wipe user data only
# This requires identifying which collections are "user data" vs "system"

echo "Restarting Appwrite..."
docker compose up -d

echo "Waiting for Appwrite to be ready..."
sleep 10

echo "Re-seeding roles..."
cd ~/village-management
export APPWRITE_ENDPOINT=http://localhost:8080/v1
export APPWRITE_PROJECT_ID=your-project-id
export APPWRITE_API_KEY=your-api-key
npm run seed:roles

echo "Restarting app..."
pm2 start village-app

echo "Reset complete. Visit https://[YOUR_DOMAIN].com and select 'Explore with Sample Data'"
```

Make executable:

```bash
sudo chmod +x /usr/local/bin/reset-village-demo.sh
```

### 6.2 Create Snapshot-Based Reset (Recommended)

A more reliable approach: create a complete backup of Appwrite including database, volumes, and configuration after initial demo load.

**Important:** The default Appwrite Docker setup uses named volumes (stored in `/var/lib/docker/volumes/`), not in the `~/appwrite` directory. Simply copying `~/appwrite` will NOT capture your database data.

#### Create Snapshot Script

```bash
# After loading demo data, create a snapshot
sudo nano /usr/local/bin/snapshot-demo.sh
```

Add:

```bash
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
docker exec appwrite mariadb-dump -u root -p$(grep _APP_DB_PASSWORD .env | cut -d '=' -f2) appwrite > $SNAPSHOT_DIR/database.sql 2>/dev/null || {
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
```

#### Create Restore Script

```bash
sudo nano /usr/local/bin/restore-demo.sh
```

Add:

```bash
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

echo "Restarting app..."
pm2 start village-app || true

echo "Restore complete. Demo data is ready at https://[YOUR_DOMAIN].com"
```

Make executable and create initial snapshot:

```bash
sudo chmod +x /usr/local/bin/snapshot-demo.sh
sudo chmod +x /usr/local/bin/restore-demo.sh

# After loading demo data in browser, run:
#/usr/local/bin/snapshot-demo.sh
```

---

## Step 7: Update DNS

Point `[YOUR_DOMAIN].com` to your Oracle VPS IP:

1. Log into your DNS provider
2. Create an A record:
   - Name: `village`
   - Value: `YOUR_VPS_IP`
   - TTL: 300 (5 minutes)

Wait for DNS propagation, then test: `https://[YOUR_DOMAIN].com`

---

## Maintenance Commands

```bash
# View logs
pm2 logs village-app

# Restart app
pm2 restart village-app

# Restart Appwrite
cd ~/appwrite && docker compose restart

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Renew SSL (auto-renews, but manual if needed)
sudo certbot renew

# Reset to demo state
sudo /usr/local/bin/restore-demo.sh

# Create fresh snapshot (after loading demo data)
sudo /usr/local/bin/snapshot-demo.sh
```

---

## Troubleshooting

### Appwrite won't start

```bash
cd ~/appwrite && docker compose logs appwrite
```

### 502 Bad Gateway

```bash
# Check if app is running
pm2 status

# Check nginx config
sudo nginx -t

# Check ports
sudo netstat -tlnp | grep -E '3000|8080'
```

### Demo data not loading

```bash
# Check browser console for CORS errors
# Ensure VITE_APPWRITE_ENDPOINT matches your domain
```

### SSL certificate issues

```bash
# Force renew
sudo certbot renew --force-renewal

# Or recreate
sudo certbot delete -d [YOUR_DOMAIN].com
sudo certbot --nginx -d [YOUR_DOMAIN].com
```

---

## Security Notes

1. **Firewall:** Open only ports 80, 443, and 22 (SSH)

   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

2. **Appwrite Console:** Disable signup after initial admin creation:
   - Appwrite Console → Auth → Settings → Disable "Users can register"

3. **API Key:** Store securely, rotate periodically

4. **Backups:** Set up automated snapshots of `~/appwrite-demo-snapshot`

---

## Summary

| URL                            | Purpose                |
| ------------------------------ | ---------------------- |
| `https://[YOUR_DOMAIN].com`    | Village Management App |
| `https://[YOUR_DOMAIN].com/v1` | Appwrite API           |

| Command                                | Action                   |
| -------------------------------------- | ------------------------ |
| `sudo /usr/local/bin/restore-demo.sh`  | Reset to demo state      |
| `sudo /usr/local/bin/snapshot-demo.sh` | Create new demo snapshot |
| `pm2 logs village-app`                 | View app logs            |
| `cd ~/appwrite && docker compose logs` | View Appwrite logs       |
