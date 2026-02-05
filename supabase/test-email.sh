#!/bin/bash

# Email Notification Test Script
# This script tests the send-support-notification Edge Function

# STEP 1: Get your Service Role Key
# Go to: https://supabase.com/dashboard/project/ajxtouqthtdenhqcvdft/settings/api
# Copy the "service_role" key (NOT the anon key)
# Replace YOUR_SERVICE_ROLE_KEY below with the actual key

SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"

# STEP 2: Run this script
# bash test-email.sh

echo "Testing Email Notification Function..."
echo ""

curl -X POST https://ajxtouqthtdenhqcvdft.supabase.co/functions/v1/send-support-notification \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "1234567890",
    "message": "This is a test support message to verify email notifications are working"
  }'

echo ""
echo ""
echo "Check learnirwair@gmail.com for the test email!"
