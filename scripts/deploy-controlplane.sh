#!/usr/bin/env bash
# Build and push the app image to Control Plane.
# Usage: ./scripts/deploy-controlplane.sh YOUR_ORG_NAME [image:tag]
set -e

ORG_NAME="${1:?Usage: $0 ORG_NAME [image:tag]}"
IMAGE_TAG="${2:-tessak22-assistant:latest}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "Building and pushing image: $IMAGE_TAG to org: $ORG_NAME"
cpln image build --name "$IMAGE_TAG" --push --org "$ORG_NAME"

echo "Done. Update the workload to use the new image (e.g. via console or workload update)."
