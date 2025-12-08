const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const logPath = path.join(rootDir, 'log');

function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

function log(message) {
    const timestamp = getTimestamp();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(logPath, logMessage + '\n');
}

function logError(message) {
    const timestamp = getTimestamp();
    const logMessage = `[${timestamp}] ERROR: ${message}`;
    console.error(logMessage);
    fs.appendFileSync(logPath, logMessage + '\n');
}

async function downloadFile(fileUrl) {
    const response = await fetch(fileUrl);
    if (!response.ok) {
        throw new Error(`Status code: ${response.status}`);
    }
    return await response.text();
}

module.exports = {
    log,
    logError,
    downloadFile,
    rootDir
};
