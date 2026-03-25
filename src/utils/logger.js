const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '../../logs/auth.log');

if (!fs.existsSync(path.dirname(logPath))) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
}

const logger = {
  info: (message) => {
    const log = `[${new Date().toISOString()}] INFO: ${message}\n`;
    console.log(log.trim());
    fs.appendFileSync(logPath, log);
  },
  warn: (message) => {
    const log = `[${new Date().toISOString()}] WARN: ${message}\n`;
    console.warn(log.trim());
    fs.appendFileSync(logPath, log);
  },
  error: (message, error) => {
    const log = `[${new Date().toISOString()}] ERROR: ${message} - ${error?.message || error}\n`;
    console.error(log.trim());
    fs.appendFileSync(logPath, log);
    if (error?.stack) {
      fs.appendFileSync(logPath, `STACK: ${error.stack}\n`);
    }
  },
};

module.exports = logger;
