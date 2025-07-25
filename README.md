# Rose Bud Thorn - Daily Reflection App

A daily reflection app for recording your rose, thorn, and bud.

### Prerequisites

- Node.js 18+
- Docker Desktop
- Yarn 4.0+

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd rose-bud-thorn
yarn install
```

### 2. Environment Setup

```bash
# Copy environment template (backend)
cp backend/.env.example backend/.env

# Copy environment template (frontend)
cp frontend/.env.local.example frontend/.env.local
```

Edit the files with your configuration

### 3. Start Ngrok Tunnel

```bash
# Start Ngrok
ngrok http http://localhost:3001
```

Copy the forwarding URL into `backend/.env` GOOGLE_CALLBACK_URL

### 4. Configure Google OAuth Client

1. Create or update [Google Client](https://console.cloud.google.com/)
1. Copy the Client ID and Client secret `backend/.env` GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
1. Update the Authorized JavaScript origins with the Ngrok forwarding URL
1. Update the Authorized redirect URIs with GOOGLE_CALLBACK_URL

### 5. Start Services

```bash
# Start PostgreSQL and Redis
yarn db:up

# Run database migrations
yarn migration:run

# Start backend and frontend
yarn dev
```

### 6. Access the Application

- Backend: http://localhost:3001
- Frontend: http://localhost:3000
- Health Check: http://localhost:3001/health

## Testing

The project includes comprehensive unit and integration tests for both backend and frontend.

```bash
# Run all backend and frontend unit tests
yarn test

# Run all backend and frontend unit tests and e2e tests
yarn test:all

# Run backend tests
yarn workspace backend test

# Run backend e2e tests
yarn yarn workspace backend test:e2e

# Run frontend tests
yarn yarn workspace frontend test
```

### Database Management

```bash
# Start PostgreSQL container
yarn db:up

# Stop PostgreSQL container
yarn db:down

# Run TypeORM migrations
yarn migration:run

# Show TypeORM migrations
yarn migration:run

# View database logs
docker compose logs -f postgres

# Connect to database directly
docker compose exec postgres psql -U postgres -d rose_bud_thorn
```

#### Redis Management

```bash
# Connect to Redis CLI
docker compose exec redis redis-cli

# View all cached keys
docker compose exec redis redis-cli keys "*"

# Get specific cache entry
docker compose exec redis redis-cli get "entry:2025-07-20"

# Monitor Redis operations in real-time
docker compose exec redis redis-cli monitor
```

## Bulk Upload Script

Upload multiple entries from a CSV file:

```bash
cd backend
npx ts-node --project tsconfig.json ../scripts/bulk_upload.ts <csv_file_path> <auth_token>
```

**CSV Format:**

```csv
date,rose,thorn,bud
2024-01-15,"Great presentation","Long commute","Weekend trip"
2024-01-16,"Sunny weather","","Movie night"
```

**Getting the Auth Token:**

1. Log in to the frontend application at http://localhost:3000
2. Open browser developer tools (F12)
3. Go to Application/Storage → Local Storage → http://localhost:3000
4. Find the `token` key and copy its value (should start with "eyJ...")
5. Use this complete token string as the auth_token parameter
