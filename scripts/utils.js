const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const logPath = path.join(rootDir, 'log.txt');

function log(message) {
    const timestamp = new Date().toLocaleString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(logPath, logMessage + '\n');
}

function logError(message) {
    const timestamp = new Date().toLocaleString();
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
