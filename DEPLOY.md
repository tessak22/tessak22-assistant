# Deploy to Control Plane

This app is ready to deploy to [Control Plane](https://controlplane.com) using the CLI.

## Prerequisites

- [Control Plane CLI](https://docs.controlplane.com/cli-reference/installation) installed and [logged in](https://docs.controlplane.com/cli-reference/commands/login)
- [Docker](https://www.docker.com/get-started) installed and running
- Your Control Plane **org name** (from the CLI profile or console)

## Quick deploy

From the project root:

```bash
# 1. Build the image and push to your org's registry (use your org name)
cpln image build --name tessak22-assistant:latest --push --org YOUR_ORG_NAME

# 2. Create a GVC (if you don't have one yet)
cpln gvc create --name tessak22-assistant --location aws-us-west-2 --org YOUR_ORG_NAME

# 3. Create the workload (app listens on port 3000)
cpln workload create \
  --name tessak22-assistant \
  --image //image/tessak22-assistant:latest \
  --port 3000 \
  --public \
  --gvc tessak22-assistant \
  --org YOUR_ORG_NAME
```

Replace `YOUR_ORG_NAME` with your actual org name. If you use a different GVC name, use it in both step 2 and the `--gvc` flag in step 3.

After a few minutes, the CLI output will show an **endpoint URL** (HTTPS). Open it in a browser to use the app.

## Data persistence (optional)

By default, the app uses SQLite in the container filesystem. Restarts or new deployments will lose data unless you add a volume and set the database path.

1. In the Control Plane console, create a **Volume Set** in your GVC and attach it to the workload at a path (e.g. `/data`).
2. Set the workload environment variable:
   - **Name:** `DATABASE_PATH`  
   - **Value:** `/data/ivy-lee.db`

The app will then store the SQLite database on the volume so it survives restarts.

## Updating the deployment

After code changes:

```bash
# Build and push a new image (bump the tag if you want versioning)
cpln image build --name tessak22-assistant:latest --push --org YOUR_ORG_NAME

# Restart the workload so it pulls the new image (via console or CLI)
cpln workload update tessak22-assistant --gvc tessak22-assistant --org YOUR_ORG_NAME
```

## Script

You can use the script for a one-command deploy (build + push only; create GVC and workload once in the console or CLI):

```bash
./scripts/deploy-controlplane.sh YOUR_ORG_NAME
```

Create the GVC and workload the first time using the commands in **Quick deploy** above.
