# DEPLOYMENT.md — WatchMate Production Deployment Guide

This guide covers the complete steps to deploy WatchMate to a production Linux server using Docker Compose, Nginx reverse proxy, Coturn TURN relay, and Let's Encrypt SSL.

---

## Infrastructure Requirements

| Component | Minimum Spec |
|-----------|-------------|
| VPS / Cloud VM | 2 vCPU, 2 GB RAM |
| OS | Ubuntu 22.04 LTS |
| Open Ports | 80, 443, 3478 (UDP/TCP), 5349 (TLS), 49152–65535 (UDP) |
| Domain | Fully qualified domain name (e.g. `watchmate.example.com`) |

---

## Step 1 — Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Add current user to docker group
sudo usermod -aG docker $USER && newgrp docker
```

---

## Step 2 — Clone the Repository

```bash
git clone https://github.com/your-org/watchmate.git
cd watchmate
```

---

## Step 3 — Obtain SSL/TLS Certificates

WatchMate requires valid HTTPS for `getDisplayMedia()` and `getUserMedia()` in production browsers.

```bash
# Install Certbot
sudo apt install certbot -y

# Obtain certificate for your domain (stop Nginx if running on port 80)
sudo certbot certonly --standalone -d your-domain.com

# Certificates will be saved at:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

---

## Step 4 — Configure Environment Variables

```bash
cp .env.production.example .env.production
nano .env.production
```

Fill in your actual values:

```bash
DOMAIN=your-domain.com
CLIENT_URL=https://your-domain.com
VITE_API_URL=https://your-domain.com
VITE_SOCKET_URL=https://your-domain.com
VITE_TURN_URL=turns:your-domain.com:5349
VITE_TURN_USERNAME=watchmate
VITE_TURN_PASSWORD=your-very-strong-password
TURN_SECRET=your-64-char-random-secret
```

---

## Step 5 — Configure Coturn

Edit `coturn/turnserver.conf`:

```bash
nano coturn/turnserver.conf
```

Set:
```
realm=your-domain.com
user=watchmate:your-very-strong-password
```

Ensure paths to your TLS certificates are correct.

---

## Step 6 — Update Nginx Config

Edit `nginx/nginx.conf` and replace `your-domain.com` with your actual domain:

```bash
sed -i 's/your-domain.com/youractualdomain.com/g' nginx/nginx.conf
```

---

## Step 7 — Deploy with Docker Compose

```bash
docker compose --env-file .env.production up -d --build
```

---

## Step 8 — Verify Deployment

```bash
# Check all containers are healthy
docker compose ps

# Check backend health endpoint
curl https://your-domain.com/api/health

# Check logs
docker compose logs server
docker compose logs nginx
docker compose logs coturn
```

Expected health response:
```json
{"status":"ok","redis":"connected","uptime":12.3}
```

---

## Step 9 — Verify TURN Connectivity

Use [Trickle ICE](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/) to confirm your TURN server is reachable:

1. Open https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
2. Add your TURN credentials:
   - URI: `turns:your-domain.com:5349`
   - Username: `watchmate`
   - Password: your TURN password
3. Click **Gather candidates**
4. Confirm a `relay` candidate appears in the results.

---

## Firewall Rules (UFW)

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp
sudo ufw allow 49152:65535/udp
sudo ufw enable
```

---

## Certificate Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot auto-renewal timer is active by default via systemd
systemctl status certbot.timer
```

After renewal, restart containers:
```bash
docker compose restart nginx coturn
```

---

## Rollback Plan

```bash
# To roll back to the previous git commit
git checkout dev
git revert HEAD --no-edit
docker compose --env-file .env.production up -d --build
```

---

## Useful Commands

```bash
# View all container logs live
docker compose logs -f

# Restart specific service
docker compose restart server

# Stop everything
docker compose down

# Rebuild and restart everything
docker compose --env-file .env.production up -d --build --force-recreate
```
