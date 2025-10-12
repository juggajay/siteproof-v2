#!/bin/bash

# Simple Docker-based Playwright test for diary persistence

echo "🧪 Running Diary Persistence Test with Docker..."

# Run Playwright in Docker
docker run --rm \
  --network="host" \
  -v $(pwd):/work \
  -w /work \
  --ipc=host \
  mcr.microsoft.com/playwright:v1.40.0-jammy \
  /bin/bash -c "
    cd apps/web && \
    npm install @faker-js/faker && \
    npx playwright test tests/diary-persistence.spec.ts \
      --grep 'should display all saved data' \
      --headed=false \
      --reporter=list
  "