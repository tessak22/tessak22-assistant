# Deploy Ivy Lee Task Tracker to Control Plane

Multi-user Ivy Lee Task Tracker with PostgreSQL database and email authentication.

## Prerequisites

- [Control Plane CLI](https://docs.controlplane.com/cli-reference/installation) installed and logged in
- [Docker](https://www.docker.com/get-started) installed and running
- Your Control Plane org name: `tessak22`
- [Resend API key](https://resend.com) for email magic links

## Step-by-Step Deployment

### 1. Create GVC (if needed)

```bash
cpln gvc create \
  --name tessak22-assistant \
  --location aws-us-west-2 \
  --org tessak22
```

### 2. Create PostgreSQL Database

```bash
# Check available Postgres versions (optional)
cpln workload get-stateful-templates --org tessak22

# Create PostgreSQL workload
cpln workload create \
  --name tessak22-assistant-db \
  --type postgres \
  --version 15 \
  --storage-size 10Gi \
  --cpu 500m \
  --memory 1Gi \
  --gvc tessak22-assistant \
  --org tessak22
```

Wait for the database to be ready (check with `cpln workload get tessak22-assistant-db --org tessak22`).

### 3. Get Database Connection String

```bash
# Get the internal connection string
cpln workload get tessak22-assistant-db \
  --gvc tessak22-assistant \
  --org tessak22 \
  --output json | grep -i "connection"
```

The connection string will be in the format:
```
postgresql://postgres:PASSWORD@tessak22-assistant-db.cpln.local:5432/postgres
```

### 4. Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

### 5. Build and Push Docker Image

```bash
# Build and push the image
cpln image build \
  --name tessak22-assistant:latest \
  --push \
  --org tessak22
```

### 6. Create App Workload with Environment Variables

```bash
cpln workload create \
  --name tessak22-assistant \
  --image //image/tessak22-assistant:latest \
  --port 3001 \
  --public \
  --gvc tessak22-assistant \
  --org tessak22 \
  --env DATABASE_URL="postgresql://postgres:PASSWORD@tessak22-assistant-db.cpln.local:5432/postgres" \
  --env NEXTAUTH_URL="https://YOUR-WORKLOAD-URL" \
  --env NEXTAUTH_SECRET="YOUR-GENERATED-SECRET" \
  --env RESEND_API_KEY="YOUR-RESEND-API-KEY" \
  --env EMAIL_FROM="noreply@yourdomain.com" \
  --env NODE_ENV="production"
```

**Important:** Replace the placeholder values:
- `PASSWORD` - from database connection string
- `YOUR-WORKLOAD-URL` - you'll get this after deployment (e.g., https://tessak22-assistant-abc123.cpln.app)
- `YOUR-GENERATED-SECRET` - from step 4
- `YOUR-RESEND-API-KEY` - from Resend dashboard
- `noreply@yourdomain.com` - your verified domain in Resend

### 7. Update NEXTAUTH_URL (After First Deploy)

After the workload is created, you'll get a public URL. Update the environment variable:

```bash
cpln workload update tessak22-assistant \
  --gvc tessak22-assistant \
  --org tessak22 \
  --env NEXTAUTH_URL="https://your-actual-url.cpln.app"
```

### 8. Initialize Database Schema

The database schema will auto-initialize on first connection. To verify:

1. Visit your app URL
2. Try to sign in
3. Check logs: `cpln workload logs tessak22-assistant --gvc tessak22-assistant --org tessak22`

You should see "✅ Database schema initialized" in the logs.

## Environment Variables Summary

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:pass@db.cpln.local:5432/postgres` |
| `NEXTAUTH_URL` | Your app's public URL | `https://tessak22-assistant.cpln.app` |
| `NEXTAUTH_SECRET` | Random secret for JWT | Generate with `openssl rand -base64 32` |
| `RESEND_API_KEY` | Resend API key for emails | `re_...` from resend.com |
| `EMAIL_FROM` | Sender email address | `noreply@yourdomain.com` |
| `NODE_ENV` | Environment | `production` |

## Updating the Deployment

After code changes:

```bash
# 1. Commit and push changes
git add -A
git commit -m "Your changes"
git push

# 2. Build and push new image
cpln image build --name tessak22-assistant:latest --push --org tessak22

# 3. Restart workload to pull new image
cpln workload update tessak22-assistant --gvc tessak22-assistant --org tessak22
```

## Using the Deploy Script

For convenience, use the deployment script:

```bash
./scripts/deploy-controlplane.sh tessak22
```

This script:
1. Builds the Docker image
2. Pushes to Control Plane registry
3. Updates the workload

## Email Configuration (Resend)

### Development/Testing
Use `onboarding@resend.dev` as EMAIL_FROM (no domain verification needed).

### Production
1. Add your domain in [Resend Dashboard](https://resend.com/domains)
2. Add DNS records (SPF, DKIM, DMARC)
3. Wait for verification
4. Update `EMAIL_FROM` to use your domain

## Troubleshooting

### Database Connection Issues
```bash
# Check database status
cpln workload get tessak22-assistant-db --gvc tessak22-assistant --org tessak22

# View database logs
cpln workload logs tessak22-assistant-db --gvc tessak22-assistant --org tessak22
```

### App Not Starting
```bash
# View app logs
cpln workload logs tessak22-assistant --gvc tessak22-assistant --org tessak22 --tail

# Check environment variables
cpln workload get tessak22-assistant --gvc tessak22-assistant --org tessak22
```

### Authentication Not Working
- Verify NEXTAUTH_URL matches your actual workload URL
- Check NEXTAUTH_SECRET is set
- Verify RESEND_API_KEY is valid
- Check EMAIL_FROM domain is verified (or use onboarding@resend.dev for testing)

### Schema Not Initializing
The app auto-initializes the database schema on first connection. If it fails:
1. Check DATABASE_URL is correct
2. Check database is running
3. View logs for error messages

## Monitoring

View real-time logs:
```bash
cpln workload logs tessak22-assistant \
  --gvc tessak22-assistant \
  --org tessak22 \
  --follow
```

Check workload status:
```bash
cpln workload get tessak22-assistant \
  --gvc tessak22-assistant \
  --org tessak22
```

## Scaling (Optional)

Scale the app workload:
```bash
cpln workload update tessak22-assistant \
  --gvc tessak22-assistant \
  --org tessak22 \
  --replicas 2
```

## Security Notes

- Database credentials are automatically managed by Control Plane
- NEXTAUTH_SECRET should be kept secret and never committed to git
- Use environment-specific Resend API keys (test vs production)
- HTTPS is enforced automatically by Control Plane
- Session cookies are httpOnly and secure
