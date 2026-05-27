#!/bin/bash
# Alpe Games Jam HQ - VPS Setup Script
# Run this on the VPS as root: bash vps-setup.sh
set -e

echo "=== Alpe Games Jam HQ - VPS Setup ==="

# 1. Update system
echo "[1/6] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# 2. Install Node.js 20
echo "[2/6] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. Install Nginx
echo "[3/6] Installing Nginx..."
apt-get install -y nginx

# 4. Install git and other tools
echo "[4/6] Installing utilities..."
apt-get install -y git curl build-essential

# 5. Create app directory
echo "[5/6] Setting up app directory..."
mkdir -p /opt/alpegames/jam-hq
mkdir -p /opt/alpegames/games

# 6. Configure Nginx
echo "[6/6] Configuring Nginx..."
cat > /etc/nginx/sites-available/jam.alpegames.cl << 'NGINX'
server {
    listen 80;
    server_name jam.alpegames.cl;

    # Jam HQ Admin App
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Game hosting (static files)
    location /games/ {
        alias /opt/alpegames/games/;
        autoindex on;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/jam.alpegames.cl /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 7. Set up systemd service for Next.js
cat > /etc/systemd/system/jam-hq.service << 'SERVICE'
[Unit]
Description=Alpe Games Jam HQ Admin App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/alpegames/jam-hq
ExecStart=/usr/bin/node /opt/alpegames/jam-hq/.next/standalone/server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
Environment=JAM_HQ_DATA_DIR=/opt/alpegames/jam-hq-data

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload

echo ""
echo "=== Setup Complete ==="
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Nginx: $(nginx -v 2>&1)"
echo ""
echo "Next steps:"
echo "  1. Deploy the app: bash scripts/deploy.sh"
echo "  2. Set up SSL: certbot or Cloudflare proxy"
echo ""
