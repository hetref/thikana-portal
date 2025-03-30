# Automated Call System

This system handles automated calls using Bland AI for the Thikana Portal. When a user requests a call, the system automatically initiates the call without requiring manual intervention from the business.

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local` file:

```
# Bland AI API Key
BLAND_AI_API_KEY=your_bland_ai_api_key

# Base URL for webhooks (required for webhook functionality)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Secret token for scheduled tasks (optional but recommended)
CRON_SECRET_TOKEN=your_random_secret_token
```

### 2. Scheduled Tasks (Optional)

For improved reliability, set up a scheduled task to process any pending calls that weren't automatically handled. You can use a service like [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) or any other scheduler.

Configure your scheduler to call:

```
https://yourdomain.com/api/bland-ai/process-pending-calls
```

Add the `Authorization` header with your secret token:

```
Authorization: Bearer your_random_secret_token
```

Recommended frequency: Every 15-30 minutes

## How It Works

1. **Call Request**:

   - When a user requests a call, an entry is created in the business's `requestCalls` subcollection
   - The system immediately tries to initiate the call using Bland AI

2. **Call Processing**:

   - If the call is successfully initiated, its status is updated to "in_progress"
   - If there's an error, the request remains in "pending" status for retry

3. **Call Status Updates**:

   - Bland AI sends updates to the webhook endpoint as the call progresses
   - The system updates the call request with status information
   - Call transcripts are stored when available

4. **Retry Mechanism**:
   - The scheduled task checks for pending calls that haven't been processed
   - It attempts to initiate these calls automatically
   - After 3 failures, the call is marked as failed

## Troubleshooting

1. **Missing Environment Variables**:
   Check that you've set the required environment variables, especially `BLAND_AI_API_KEY` and `NEXT_PUBLIC_BASE_URL`.

2. **Webhook Issues**:
   Ensure that your `NEXT_PUBLIC_BASE_URL` is publicly accessible. If using localhost for development, consider using a service like ngrok to create a public URL.

3. **Call Not Initiated**:

   - Check that the user has a phone number in their profile
   - Verify that the business has created call types and scripts
   - Check the server logs for errors from the Bland AI API

4. **Bland AI API Errors**:
   If you see "task" parameter errors, ensure the API call is correctly formatted with "task" instead of "script".
