#!/bin/bash

# Load environment variables
export $(grep -v '^#' .env.local | xargs)

# Run the test
npx tsx src/lib/ai/test/test-compliance-sentinel.ts