#!/bin/bash
# Helper script to push using environment credentials if available

set -e

# Check if .env exists and load it
if [ -f .env ]; then
  source .env
fi

# If GITHUB_TOKEN is set, use it; otherwise rely on git credential store
if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_USERNAME" ]; then
  echo "Pushing using credentials from .env..."
  git push https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/tybradle/ats-chd-tools.git "$@"
else
  echo "Pushing using git credential store..."
  git push "$@"
fi
