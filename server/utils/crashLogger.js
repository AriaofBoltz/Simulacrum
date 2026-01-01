const fs = require('fs');
const path = require('path');

// Function to get a random funny message from crashlogmessages.txt
function getRandomFunnyMessage() {
  const messagesFilePath = path.join(__dirname, '../../crashlogmessages.txt');
  
  try {
    // Check if the file exists
    if (!fs.existsSync(messagesFilePath)) {
      return "WARNING: crashlogmessages.txt not found. Here's a default message: Oops! Something went wrong.";
    }
    
    // Read the file and split into lines
    const messages = fs.readFileSync(messagesFilePath, 'utf-8').split('\n').filter(line => line.trim() !== '');
    
    // Return a random message
    if (messages.length > 0) {
      return messages[Math.floor(Math.random() * messages.length)];
    }
    
    return "No funny messages available.";
  } catch (err) {
    return `WARNING: Error reading crashlogmessages.txt: ${err.message}`;
  }
}

// Function to log crashes with title and funny message
function logCrash(error, context = {}) {
  const timestamp = new Date().toISOString();
  const funnyMessage = getRandomFunnyMessage();
  
  // Create logs directory if it doesn't exist
  const logsDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Format the crash log
  const crashLog = `
========================================
          CRASH REPORT - ${timestamp}
========================================

💥 ${funnyMessage}

Error: ${error.message}
Stack: ${error.stack}

Context:
${Object.entries(context).map(([key, value]) => `  ${key}: ${value}`).join('\n')}

========================================
`;
  
  // Write to crash log file
  const crashLogPath = path.join(logsDir, 'crash.log');
  fs.appendFileSync(crashLogPath, crashLog);
  
  return crashLog;
}

module.exports = { logCrash };