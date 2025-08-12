# VAPI Integration

This system handles automated calls using VAPI for the Thikana Portal. The system supports multi-language calling with advanced voice configuration and transcription capabilities.

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local` file:

**Default Phone Number**: The system uses **+1 (762) 254-5834** as the default outbound calling number.

```
# VAPI API Keys
VAPI_PRIVATE_API_KEY=920f89b3-fa61-46ac-af48-7fc5c4e71e0a
VAPI_PUBLIC_API_KEY=e23b7383-04f4-45e5-859f-57401f4b746c

# Base URL for webhooks (required for webhook functionality)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Secret token for scheduled tasks (optional but recommended)
CRON_SECRET_TOKEN=your_random_secret_token
```

### 2. Supported Features

#### Languages

- **English (en)**: Default language
- **Hindi (hi)**: With Deepgram Nova-2 transcription support

#### Voice Configuration

- **Provider**: 11Labs (default), PlayHT, Azure
- **Default Voice**: Bobby (Indian Male) from 11Labs
- **Models**: Eleven Turbo v2.5 (fastest), Eleven Turbo v2, Eleven Multilingual v2

#### AI Assistant

- **Provider**: OpenAI
- **Model**: GPT-4o Mini Cluster
- **Features**: Function calling for booking extraction, natural conversation flow

#### Transcription

- **Provider**: Deepgram
- **Model**: Nova-2
- **Languages**: English and Hindi support

## How It Works

1. **Script Creation**:

   - Businesses create scripts with language selection (English/Hindi)
   - Voice configuration with provider, voice, and model selection
   - Advanced transcription settings based on language

2. **Call Initiation**:

   - System creates a VAPI assistant with the configured settings
   - Initiates outbound call using VAPI API
   - Supports function calling for extracting structured booking data

3. **Call Processing**:

   - Real-time transcription in selected language
   - AI assistant follows the script while adapting to customer responses
   - Automatic extraction of booking information when relevant

4. **Webhook Updates**:

   - VAPI sends updates to webhook endpoint as call progresses
   - System updates call status, transcript, and booking information
   - Function calls are processed for data extraction

5. **Multi-language Support**:
   - English: Standard configuration
   - Hindi: Uses Deepgram Nova-2 for accurate transcription
   - Voice models support multilingual capabilities

## API Endpoints

### `/api/vapi` (POST)

Main endpoint for initiating calls with assistant creation.

### `/api/vapi/initiate-call` (POST)

Direct call initiation with detailed configuration options.

### `/api/vapi/webhook` (POST)

Webhook endpoint for receiving VAPI status updates.

### `/api/vapi/call-details` (GET)

Retrieve detailed call information and transcripts.

### `/api/vapi/auto-call-handler` (POST)

Automated call processing for pending requests.

## Configuration Options

### Voice Settings

```javascript
{
  voiceProvider: "11labs",        // 11labs, playht, azure
  voiceId: "bIHbv24MWmeRgasZH58o", // Bobby (Indian Male)
  voiceModel: "eleven_turbo_v2_5"  // Model for voice synthesis
}
```

### Transcription Settings

```javascript
{
  provider: "deepgram",
  model: "nova-2",
  language: "en" | "hi"  // Auto-configured based on script language
}
```

### Assistant Configuration

```javascript
{
  provider: "openai",
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 500
}
```

## Function Calling

The system supports automatic extraction of booking information through function calls:

```javascript
{
  name: "save_booking_info",
  parameters: {
    customer_name: "string",
    phone_number: "string",
    email: "string",
    booking_date: "string",
    booking_time: "string",
    number_of_people: "number",
    special_requests: "string"
  }
}
```

## Troubleshooting

1. **Missing Environment Variables**:
   Check that you've set VAPI_PRIVATE_API_KEY and NEXT_PUBLIC_BASE_URL.

2. **Language Issues**:

   - English calls: Standard configuration
   - Hindi calls: Ensure Deepgram Nova-2 is configured with language: "hi"

3. **Voice Configuration**:

   - Verify voice IDs are valid for the selected provider
   - Bobby (bIHbv24MWmeRgasZH58o) is the default Indian male voice

4. **Webhook Issues**:
   Ensure NEXT_PUBLIC_BASE_URL is publicly accessible for webhook delivery.

5. **Call Failures**:
   - Check phone number format (E.164: +countrycode + number)
   - Verify assistant creation succeeded before call initiation
   - Monitor logs for VAPI API errors

## Migration from Bland AI

The system has been migrated from Bland AI to VAPI with the following improvements:

- Multi-language support (English/Hindi)
- Advanced voice configuration options
- Better transcription accuracy with Deepgram
- Enhanced AI assistant capabilities with OpenAI GPT-4o Mini
- Structured data extraction through function calling
- Real-time webhook processing for better call tracking
