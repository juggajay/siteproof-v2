#!/bin/bash
# Emergency Rollback Script for Design System V2
# Usage: ./scripts/emergency-rollback.sh "Reason for rollback"

set -e

REASON="${1:-Unknown reason}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚨 EMERGENCY ROLLBACK INITIATED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Reason: $REASON"
echo "Time: $TIMESTAMP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check required environment variables
if [ -z "$FLAGSMITH_API_TOKEN" ]; then
    echo "❌ Error: FLAGSMITH_API_TOKEN not set"
    exit 1
fi

# 1. Disable all new design flags via Flagsmith API
echo "Step 1/5: Disabling feature flags..."
curl -X PUT \
  "${FLAGSMITH_API_URL:-https://flagsmith.siteproof.com}/api/v1/features/design-system-v2/" \
  -H "Authorization: Token ${FLAGSMITH_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"enabled\": false,
    \"description\": \"Emergency rollback: $REASON\"
  }" \
  --silent --show-error

echo "✅ Feature flags disabled"

# 2. Set environment variable override (if using Vercel)
if command -v vercel &> /dev/null; then
    echo ""
    echo "Step 2/5: Setting environment variable override..."
    vercel env add NEXT_PUBLIC_FORCE_OLD_DESIGN true production --yes || true
    echo "✅ Environment override set"
else
    echo ""
    echo "⚠️  Step 2/5: Vercel CLI not found, skipping environment variable override"
fi

# 3. Trigger immediate revalidation
if [ -n "$REVALIDATE_TOKEN" ]; then
    echo ""
    echo "Step 3/5: Triggering cache revalidation..."
    curl -X POST "${SITE_URL:-https://siteproof.com}/api/revalidate" \
      -H "Authorization: Bearer ${REVALIDATE_TOKEN}" \
      --silent --show-error
    echo "✅ Cache revalidated"
else
    echo ""
    echo "⚠️  Step 3/5: REVALIDATE_TOKEN not set, skipping cache revalidation"
fi

# 4. Log rollback event to file
echo ""
echo "Step 4/5: Logging rollback event..."
ROLLBACK_LOG="./logs/rollbacks.log"
mkdir -p ./logs
echo "[$TIMESTAMP] Emergency Rollback - Reason: $REASON" >> "$ROLLBACK_LOG"
echo "✅ Event logged to $ROLLBACK_LOG"

# 5. Notify team (Slack webhook)
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    echo ""
    echo "Step 5/5: Notifying team..."
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"text\": \"🚨 EMERGENCY ROLLBACK EXECUTED\",
        \"blocks\": [
          {
            \"type\": \"header\",
            \"text\": {
              \"type\": \"plain_text\",
              \"text\": \"🚨 Emergency Rollback\"
            }
          },
          {
            \"type\": \"section\",
            \"fields\": [
              {
                \"type\": \"mrkdwn\",
                \"text\": \"*Reason:*\n$REASON\"
              },
              {
                \"type\": \"mrkdwn\",
                \"text\": \"*Time:*\n$TIMESTAMP\"
              }
            ]
          },
          {
            \"type\": \"section\",
            \"text\": {
              \"type\": \"mrkdwn\",
              \"text\": \"*Actions Taken:*\n• Feature flags disabled\n• Environment override set\n• Cache revalidated\"
            }
          },
          {
            \"type\": \"context\",
            \"elements\": [
              {
                \"type\": \"mrkdwn\",
                \"text\": \"Verify at: ${SITE_URL:-https://siteproof.com}\"
              }
            ]
          }
        ]
      }" \
      --silent --show-error
    echo "✅ Team notified"
else
    echo ""
    echo "⚠️  Step 5/5: SLACK_WEBHOOK_URL not set, skipping team notification"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ROLLBACK COMPLETED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Verify rollback: ${SITE_URL:-https://siteproof.com}"
echo "2. Run verification script: npm run verify:rollback"
echo "3. Monitor error rates in Sentry"
echo "4. Update incident report"
echo ""
