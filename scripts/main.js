const processSources = require('./process-sources');
const { logError } = require('./utils');

async function main() {
    try {
        await processSources();
        updateReadme();
    } catch (err) {
        logError(err);
        process.exit(1);
    }
}

main();
