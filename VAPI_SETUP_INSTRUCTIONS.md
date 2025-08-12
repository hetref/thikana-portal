# VAPI Migration Setup Instructions

## Important: Environment Variables Setup

You need to add the following environment variables to your `.env.local` file (create it in your project root if it doesn't exist):

```bash
# VAPI API Keys
VAPI_PRIVATE_API_KEY=920f89b3-fa61-46ac-af48-7fc5c4e71e0a
VAPI_PUBLIC_API_KEY=e23b7383-04f4-45e5-859f-57401f4b746c

# Twilio Configuration (required for VAPI phone calls)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Base URL for webhooks (required for webhook functionality)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Gemini AI for script generation (already in your env.local)
GEMINI_API_KEY=your_gemini_api_key

# Optional: Secret token for scheduled tasks
CRON_SECRET_TOKEN=your_random_secret_token
```

**Note**: Replace `https://yourdomain.com` with your actual domain URL. For local development, you can use `http://localhost:3000` but webhooks won't work locally unless you use a service like ngrok.

**Default Phone Number**: The system is configured to use **+1 (762) 254-5834** as the default outbound calling number.

**Twilio Setup Required**: VAPI now requires Twilio configuration for phone calls. You need to:

1. Create a Twilio account
2. Get your Account SID and Auth Token
3. Add them to your `.env.local` file
4. Configure the phone number `+1 (762) 254-5834` in your Twilio account

## Gemini AI Script Generation

The system now includes AI-powered script generation using Google's Gemini AI:

- **Models Used**: `gemini-1.5-flash` (primary) with fallback to `gemini-1.5-pro`
- **Features**: Generate professional call scripts in English or Hindi
- **Usage**: Enter business name, select call type, and click "Generate with AI"
- **Test Endpoint**: `/api/test-gemini` to verify API connectivity

## Enhanced Call Summary System

The VAPI integration now includes robust call summary processing:

- **Automatic Processing**: Call details are automatically fetched when calls end (with 5s initial delay)
- **Retry Logic**: Built-in retry mechanism with extended exponential backoff (4s, 8s, 16s, 32s, 64s delays)
- **Manual Processing**: "Load Summary" button for calls that failed to process
- **Batch Retry**: "Retry Failed Calls" button to process all failed calls at once
- **Rich Display**: Shows call duration, transcript, topics discussed, and booking info
- **Error Handling**: Graceful fallbacks and clear error messages
- **Test Endpoint**: `/api/vapi/test-call-details?call_id=YOUR_CALL_ID` to test call details availability

### Recent Fixes

- **Assistant Name Length**: Fixed "name must be shorter than 40 characters" error
- **Call Details Timing**: Added longer delays and more retries for VAPI call details processing
- **Enhanced Error Handling**: Better error messages and 404 handling for call details not yet available
- **VAPI API Structure**: Fixed phoneNumber configuration to use Twilio format
- **Webhook Configuration**: Changed serverPath to serverUrl for proper webhook setup
- **Twilio Integration**: Added required Twilio Account SID and Auth Token configuration

## What Has Been Changed

### 🔄 Migrated API Endpoints

- **FROM**: `/api/bland-ai/*`
- **TO**: `/api/vapi/*`

### 🆕 New Features Added

#### 1. Language Support

- **English** (default)
- **Hindi** with Deepgram Nova-2 transcription

#### 2. Voice Configuration

- **Provider**: 11Labs (default), PlayHT, Azure
- **Default Voice**: Bobby (Indian Male)
- **Models**: Eleven Turbo v2.5, Eleven Turbo v2, Eleven Multilingual v2

#### 3. AI Assistant

- **Provider**: OpenAI
- **Model**: GPT-4o Mini Cluster
- **Enhanced**: Function calling for booking extraction

#### 4. Transcription

- **Provider**: Deepgram
- **Model**: Nova-2
- **Languages**: Auto-configured based on script language

### 📁 New API Endpoints Created

1. `/api/vapi/route.js` - Main call initiation
2. `/api/vapi/webhook/route.js` - Webhook handler
3. `/api/vapi/initiate-call/route.js` - Direct call initiation
4. `/api/vapi/call-details/route.js` - Call details retrieval
5. `/api/vapi/auto-call-handler/route.js` - Automated call processing
6. `/api/vapi/process-pending-calls/route.js` - Batch processing
7. `/api/vapi/test-webhook/route.js` - Testing endpoint

### 🔧 Updated Components

#### CallAutomationSettings.jsx

- Added language selection (English/Hindi)
- Added voice provider configuration
- Added voice model selection
- Updated API calls to use VAPI

#### CallScriptManager.jsx

- Added language field to forms
- Added voice configuration fields
- Updated script creation/editing to include new fields
- Sample scripts now include voice/language settings

#### RequestCallsManager.jsx

- Updated to use VAPI endpoints
- Enhanced call details with new VAPI features
- Added support for booking info extraction

## 🚀 How to Test

1. **Set Environment Variables**: Add the VAPI keys to your `.env.local` file
2. **Restart Development Server**: `npm run dev`
3. **Create a Call Script**:
   - Go to profile → calls → Call Scripts tab
   - Click "Add New Script"
   - Select language (English/Hindi)
   - Configure voice settings
   - Save the script
4. **Test a Call**:
   - Go to "Make a Call" tab
   - Select your script
   - Enter a phone number in E.164 format (e.g., +1234567890)
   - Click "Start Call"

## 🔍 Features to Test

### Language Support

- Create scripts in English and Hindi
- Verify transcription works in both languages
- Test voice synthesis quality

### Voice Configuration

- Try different voices (Bobby, Adam, Bella, Arnold)
- Test different models (Turbo v2.5, Multilingual v2)
- Verify voice quality and responsiveness

### Data Extraction

- Test calls that involve booking information
- Check if booking data is extracted and saved
- Verify function calling works properly

### Webhook Processing

- Monitor call status updates in real-time
- Check transcript updates
- Verify call completion handling

## 🐛 Troubleshooting

### Common Issues

1. **"Missing VAPI_PRIVATE_API_KEY"**

   - Ensure you've added the environment variable
   - Restart your development server

2. **Webhook Not Working**

   - Check NEXT_PUBLIC_BASE_URL is set correctly
   - For local testing, use ngrok for public URL

3. **Voice Not Working**

   - Verify voice ID is correct for 11Labs
   - Check voice model compatibility

4. **Language Issues**

   - Hindi: Ensure Deepgram is configured properly
   - English: Should work with default settings

5. **Call Fails to Initiate**
   - Check phone number format (E.164)
   - Verify VAPI API keys are valid
   - Check assistant creation logs

### Debug Mode

Enable debug mode by checking browser console for detailed logs during call creation and processing.

## 📊 Monitoring

Monitor the following for successful operation:

- Call creation success rate
- Webhook delivery
- Transcript quality
- Booking extraction accuracy
- Voice synthesis quality

## 🔄 Rollback Plan

If you need to revert to Bland AI:

1. Change API endpoints back to `/api/bland-ai/*`
2. Remove language and voice configuration fields
3. Update environment variables to use `BLAND_AI_API_KEY`
4. Restore original component configurations

## 📈 Next Steps

After successful testing:

1. Update production environment variables
2. Monitor call quality and success rates
3. Gather user feedback on new features
4. Consider adding more languages if needed
5. Optimize voice configurations based on usage

---

**Status**: ✅ Migration Complete
**Testing Required**: Yes
**Production Ready**: After environment setup and testing
