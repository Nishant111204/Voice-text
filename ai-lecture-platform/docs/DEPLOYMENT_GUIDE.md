# Deployment Guide

## 🚀 Deployment Options

### Option 1: Docker Compose (Local/VM)

**Best for**: Local testing, single server deployment

```bash
# Clone repository
git clone <repo-url>
cd ai-lecture-platform

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- AI Engine: http://localhost:8000

---

### Option 2: Cloud Deployment (Railway/Render)

#### Railway (Recommended for MVP)

**Steps:**
1. Create account at railway.app
2. New Project → Deploy from GitHub
3. Create 4 services:
   - **MongoDB**: Use Railway's MongoDB template
   - **Backend**: Select `server` directory, add env vars
   - **AI Engine**: Select `ai_engine` directory
   - **Frontend**: Select `client` directory

**Environment Variables:**

**Backend Service:**
```
PORT=5000
NODE_ENV=production
MONGO_URI=${{MongoDB.DATABASE_URL}}
JWT_SECRET=your_secret_here
AI_SERVICE_URL=${{AI_ENGINE.RAILWAY_PUBLIC_URL}}
```

**AI Engine Service:**
```
MONGO_URI=${{MongoDB.DATABASE_URL}}
```

**Frontend Service:**
```
NEXT_PUBLIC_API_URL=${{BACKEND.RAILWAY_PUBLIC_URL}}/api
```

---

### Option 3: AWS Deployment

#### Architecture:
- **EC2**: Backend & AI Engine
- **S3**: File storage
- **MongoDB Atlas**: Database
- **CloudFront**: CDN for frontend
- **Route 53**: DNS

#### Steps:

**1. Setup MongoDB Atlas**
```bash
# Create free tier cluster
# Whitelist your EC2 IP
# Copy connection string
```

**2. Launch EC2 Instance**
```bash
# Ubuntu 22.04, t2.medium or larger
ssh -i keypair.pem ubuntu@<public-ip>

# Install Docker
sudo apt update
sudo apt install docker.io docker-compose -y

# Clone repo
git clone <repo-url>
cd ai-lecture-platform

# Update .env files with production values
# Start services
docker-compose up -d
```

**3. Configure Nginx Reverse Proxy**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
    }

    location /api {
        proxy_pass http://localhost:5000;
    }
}
```

**4. SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

### Option 4: Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel):**
```bash
cd client
vercel
# Follow prompts
# Set env: NEXT_PUBLIC_API_URL=<railway-backend-url>/api
```

**Backend + AI (Railway):**
- Deploy as per Option 2

---

## 🔐 Security Checklist

- [ ] Change default JWT secret
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS (SSL certificate)
- [ ] Set CORS to specific domains
- [ ] Add rate limiting to API
- [ ] Sanitize file uploads
- [ ] Use environment variables (never commit `.env`)

---

## 📊 Monitoring

### Logs
```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f ai-engine

# System metrics
docker stats
```

### Health Checks
- Backend: `GET /`
- AI Engine: `GET /`
- Database: Use MongoDB Compass

---

## 🧪 Production Testing

1. **Upload Test**: Upload a real lecture
2. **Concurrent Users**: Simulate 10+ users
3. **Error Handling**: Test with invalid files
4. **Database Backup**: Test restore procedure

---

## 🔄 CI/CD (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway up
```

---

## 📞 Support

For deployment issues, contact:
- Email: [your-email]
- GitHub Issues: [repo-url]/issues
