# 🐛 Debug ITP API Issues - Docker Testing Guide

This guide helps you test and debug the ITP API issues we're seeing with the 500 errors.

## 🚀 Quick Start

### 1. Check Prerequisites

Make sure you have:

- ✅ Docker and Docker Compose installed
- ✅ `.env.local` file with your Supabase credentials

```bash
# Copy environment template if needed
cp .env.example .env.local
# Edit .env.local with your actual Supabase credentials
```

### 2. Run the Complete Test Suite

```bash
./docker-test.sh
```

This will:

- ✅ Build the Docker image
- ✅ Start Redis and the web application
- ✅ Run health checks
- ✅ Test API endpoints
- ✅ Debug ITP API issues specifically
- ✅ Generate a detailed report

### 3. Quick Debugging Only

If the app is already running:

```bash
./docker-test.sh debug
```

## 🔍 Manual Debugging Steps

### Check Container Status

```bash
docker-compose ps
```

### View Live Logs

```bash
# Web application logs
docker-compose logs -f web

# Redis logs
docker-compose logs -f redis
```

### Test API Endpoints Manually

```bash
# Health check
curl -s http://localhost:3000/api/health

# ITP templates (requires auth)
curl -s http://localhost:3000/api/itp/templates

# Check specific lot ITP instances (replace IDs)
curl -s http://localhost:3000/api/projects/89253127-a60a-48a7-a511-ce89c316d3af/lots/f497f453-fb01-49fe-967a-3182a61a5a1b/itp
```

### Check Environment Variables

```bash
docker-compose exec web env | grep SUPABASE
```

### Inspect Built API Routes

```bash
# Check if our new routes are built properly
docker-compose exec web find /app/apps/web/.next/server/app/api -name "route.js" | grep itp
```

## 🐛 Common Issues and Solutions

### Issue 1: 500 Error on ITP Instance Loading

**Error**: `/api/projects/.../lots/.../itp` returns 500

**Debugging**:

```bash
# Check if the route exists in the build
docker-compose exec web ls -la /app/apps/web/.next/server/app/api/projects/*/lots/*/itp/

# Check the logs for specific error
docker-compose logs web | grep -i "itp.*error"
```

**Possible Causes**:

- ❌ Route not properly built/deployed
- ❌ Database connection issues
- ❌ Missing environment variables
- ❌ TypeScript compilation errors

### Issue 2: 500 Error on ITP Assignment

**Error**: `/api/itp/instances/assign` returns 500

**Debugging**:

```bash
# Check if the assign route exists
docker-compose exec web ls -la /app/apps/web/.next/server/app/api/itp/instances/assign/

# Test the API call format
curl -X POST http://localhost:3000/api/itp/instances/assign \
  -H "Content-Type: application/json" \
  -d '{"templateIds":["test-id"],"projectId":"test","lotId":"test"}'
```

**Possible Causes**:

- ❌ Incorrect request body format
- ❌ Database constraint violations
- ❌ Authentication/authorization issues

### Issue 3: Environment Variables

**Error**: Database connection fails

**Debugging**:

```bash
# Check all environment variables
docker-compose exec web env

# Test Supabase connection
docker-compose exec web node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('Client created:', !!client);
"
```

## 📝 Testing Workflow

### Step 1: Build and Start

```bash
./docker-test.sh
```

### Step 2: Open Browser

Navigate to `http://localhost:3000` and:

1. Log in with your credentials
2. Go to a project → lot
3. Open browser dev tools (F12)
4. Check Console and Network tabs

### Step 3: Test ITP Functionality

1. ✅ Check if ITP instances load (no mock data)
2. ✅ Try adding a new ITP template
3. ✅ Look for 500 errors in console

### Step 4: Review Logs

```bash
# In another terminal
docker-compose logs -f web
```

## 🛠️ Fixes to Apply

Based on the debugging results, you might need to:

### Fix 1: Rebuild with Latest Changes

```bash
docker-compose down
docker-compose build --no-cache web
docker-compose up -d
```

### Fix 2: Check Database Schema

The error might be related to database table structure. Check if:

- `itp_instances` table exists
- Columns match the API expectations
- Foreign key constraints are correct

### Fix 3: Verify Route Files

Ensure these files exist and are properly built:

- `/api/projects/[id]/lots/[lotId]/itp/route.ts`
- `/api/projects/[id]/lots/[lotId]/itp/[itpId]/route.ts`
- `/api/itp/instances/assign/route.ts`

## 🔧 Emergency Reset

If everything fails:

```bash
# Complete cleanup
./docker-test.sh clean

# Or manual cleanup
docker-compose down --volumes --remove-orphans
docker system prune -af

# Rebuild from scratch
./docker-test.sh
```

## 📊 Success Indicators

You'll know it's working when:

- ✅ Health check returns 200
- ✅ No 500 errors in browser console
- ✅ ITP instances load properly (not mock data)
- ✅ ITP assignment works without errors
- ✅ Docker logs show no database connection errors

## 🆘 Getting Help

If you're still seeing issues:

1. Run the full debug: `./docker-test.sh debug`
2. Save the output and container logs
3. Check the generated test report
4. Look for specific error messages in the logs

The most important logs to check:

- Container startup logs
- API request/response logs
- Database connection logs
- TypeScript compilation errors
