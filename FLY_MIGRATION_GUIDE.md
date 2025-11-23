# StandupSnap - Fly.io Migration Guide

This document outlines the steps taken to migrate StandupSnap from Docker to Fly.io.

## Deployed URLs
- **Frontend**: https://standupsnap.fly.dev
- **Backend**: https://standupsnap-backend.fly.dev
- **Database**: standupsnap-db (Fly Postgres)

---

## 1. Prerequisites

### Install Fly CLI
```powershell
# Install on Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Add to PATH permanently
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Users\user\.fly\bin", "User")

# Restart PowerShell, then login
fly auth login
```

---

## 2. Files Created

### Backend Files

**backend/Dockerfile.fly** - Production multi-stage build
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

**backend/fly.toml** - Fly configuration
```toml
app = 'standupsnap-backend'
primary_region = 'ord'

[build]
  dockerfile = 'Dockerfile.fly'

[env]
  NODE_ENV = 'production'
  PORT = '3000'

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = '512mb'
  cpu_kind = 'shared'
  cpus = 1
```

### Frontend Files

**frontend/Dockerfile.fly** - Production build with nginx
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npx vite build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

**frontend/nginx.conf** - nginx config for SPA
```nginx
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**frontend/fly.toml** - Fly configuration
```toml
app = 'standupsnap'
primary_region = 'ord'

[build]
  dockerfile = 'Dockerfile.fly'
  [build.args]
    VITE_API_URL = 'https://standupsnap-backend.fly.dev/api'

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  size = 'shared-cpu-1x'
```

---

## 3. Code Changes

### app.module.ts - Database URL Support
Updated TypeORM config to support both `DATABASE_URL` (Fly) and individual env vars (local):

```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => {
    const databaseUrl = configService.get('DATABASE_URL');

    if (databaseUrl) {
      // Use DATABASE_URL (Fly.io format)
      return {
        type: 'postgres',
        url: databaseUrl,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Set to false after stable
        logging: process.env.NODE_ENV === 'development',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      };
    }

    // Fallback to individual env vars (local development)
    return {
      type: 'postgres',
      host: configService.get('DATABASE_HOST'),
      port: +configService.get('DATABASE_PORT'),
      username: configService.get('DATABASE_USER'),
      password: configService.get('DATABASE_PASSWORD'),
      database: configService.get('DATABASE_NAME'),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
    };
  },
  inject: [ConfigService],
}),
```

### main.ts - Listen on 0.0.0.0 and CORS
```typescript
// Enable CORS with FRONTEND_URL
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.enableCors({
  origin: allowedOrigins,
  credentials: true,
});

// Listen on 0.0.0.0 for container environments
const port = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV !== 'production') {
  await killPortProcess(port);
}
await app.listen(port, '0.0.0.0');
```

---

## 4. Deploy Backend

```powershell
cd backend

# Create app
fly launch --no-deploy

# Create Postgres database
fly postgres create --name standupsnap-db

# Attach database to app
fly postgres attach standupsnap-db

# Set secrets (use your actual values from backend/.env)
fly secrets set JWT_SECRET="your-jwt-secret" GROQ_API_KEY="gsk_xxx" GROQ_MODEL="llama-3.3-70b-versatile" FRONTEND_URL="https://standupsnap.fly.dev"

# IMPORTANT: Set your actual Groq API key from backend/.env
fly secrets set GROQ_API_KEY=your-groq-api-key GROQ_MODEL=llama-3.3-70b-versatile -a standupsnap-backend

# Verify secrets are set
fly ssh console -a standupsnap-backend -C "printenv GROQ_API_KEY && printenv GROQ_MODEL"

# Set email (SendGrid) secrets from backend/.env
fly secrets set MAIL_HOST=smtp.sendgrid.net MAIL_PORT=587 MAIL_SECURE=false MAIL_USER=apikey MAIL_PASSWORD=SG.your-sendgrid-api-key MAIL_FROM=standupsnap@gmail.com -a standupsnap-backend

# Deploy
fly deploy
```

---

## 5. Deploy Frontend

```powershell
cd frontend

# Create app
fly launch --no-deploy

# Deploy
fly deploy
```

---

## 6. Database Migration

### Export from local
```powershell
# Create backup inside container
docker exec standupsnap-postgres pg_dump -U postgres -d standupsnap -F c -f /tmp/backup.dump

# Copy to local
docker cp standupsnap-postgres:/tmp/backup.dump C:\Users\user\Desktop\StandupSnap\standupsnap_backup.dump
```

### Import to Fly Postgres

```powershell
# Terminal 1: Start proxy
fly proxy 15432:5432 -a standupsnap-db

# Terminal 2: Get password
fly ssh console -a standupsnap-backend -C "printenv DATABASE_URL"
# Extract password from: postgres://standupsnap_backend:PASSWORD@...

# Restore
cd C:\Users\user\Desktop\StandupSnap
docker run --rm -v ${PWD}:/backup -e PGPASSWORD=YOUR_PASSWORD postgres:15-alpine pg_restore --clean --if-exists --host=host.docker.internal --port=15432 --username=standupsnap_backend --dbname=standupsnap_backend /backup/standupsnap_backup.dump
```

---

## 7. Useful Commands

### Status & Logs
```powershell
fly status -a standupsnap-backend
fly logs -a standupsnap-backend
```

### Start/Stop Machines
```powershell
fly machine start -a standupsnap-backend
fly machine stop -a standupsnap-backend
```

### SSH into App
```powershell
fly ssh console -a standupsnap-backend
```

### Update Secrets
```powershell
fly secrets set KEY=value -a standupsnap-backend
fly secrets list -a standupsnap-backend
```

### Database Connection
```powershell
fly postgres connect -a standupsnap-db -d standupsnap_backend
```

### Redeploy After Changes
```powershell
cd backend && fly deploy
cd frontend && fly deploy
```

---

## 8. Important Notes

### synchronize Setting
Currently `synchronize: true` for initial setup. After stable, change to `false` in `app.module.ts` line 36 for production safety.

### Environment Variables on Fly
- DATABASE_URL - Auto-set by Fly Postgres
- JWT_SECRET - Your JWT secret
- GROQ_API_KEY - Your Groq API key
- GROQ_MODEL - llama-3.3-70b-versatile
- FRONTEND_URL - https://standupsnap.fly.dev
- MAIL_HOST - smtp.sendgrid.net
- MAIL_PORT - 587
- MAIL_SECURE - false
- MAIL_USER - apikey
- MAIL_PASSWORD - Your SendGrid API key
- MAIL_FROM - standupsnap@gmail.com

### Auto-Stop Machines
Fly machines auto-stop when idle to save costs. They auto-start on incoming requests (may cause ~2s delay on first request).

### Local Development
Continue using Docker Compose for local development:
```powershell
docker-compose up
```

Then access at http://localhost:5173

---

## 9. Troubleshooting

### 502/503 Errors
- Check logs: `fly logs -a standupsnap-backend`
- Ensure app listens on `0.0.0.0:3000`
- Verify DATABASE_URL is set

### CORS Errors
- Check FRONTEND_URL secret matches actual frontend URL
- No trailing slash: `https://standupsnap.fly.dev` (not `/`)

### Database Connection Issues
- Verify Postgres is attached: `fly postgres attach standupsnap-db`
- Check DATABASE_URL: `fly ssh console -a standupsnap-backend -C "printenv DATABASE_URL"`

### Machine Won't Start
```powershell
fly machine start -a standupsnap-backend
fly status -a standupsnap-backend
```

Export from Fly Postgres

  # Terminal 1: Start proxy
  fly proxy 15432:5432 -a standupsnap-db

  # Terminal 2: Export
  docker run --rm -v ${PWD}:/backup -e PGPASSWORD=bZ5xvBVwceA6Z9R postgres:15-alpine pg_dump --host=host.docker.internal --port=15432 --username=standupsnap_backend
  --dbname=standupsnap_backend -F c -f /backup/fly_backup.dump

  Import to Local

  # Restore to local Docker Postgres
  docker exec -i standupsnap-postgres pg_restore -U postgres -d standupsnap --clean --if-exists < fly_backup.dump

  Or using Docker:
  docker run --rm -v ${PWD}:/backup --network host postgres:15-alpine pg_restore -h localhost -p 5432 -U postgres -d standupsnap --clean --if-exists
  /backup/fly_backup.dump

  This will overwrite your local data with the Fly database data.
