#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/push-to-github.sh <GITHUB_REPO_URL>"
  echo "Example: ./scripts/push-to-github.sh https://github.com/your-username/your-repo.git"
  exit 1
fi

REPO_URL="$1"

# Check if origin already exists
if git remote | grep -q "^origin$"; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

git branch -M main
echo "Pushing to $REPO_URL on branch main..."
git push -u origin main
echo "Successfully pushed to GitHub!"
