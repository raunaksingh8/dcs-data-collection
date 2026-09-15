const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "backend.log");
const errFile = path.join(__dirname, "backend.err.log");

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  console.log(line.trim());
  fs.appendFile(logFile, line, () => { });
}

function logError(message) {
  const line = `[${new Date().toISOString()}] ERROR: ${message}\n`;
  console.error(line.trim());
  fs.appendFile(errFile, line, () => { });
}

module.exports = { log, logError };
