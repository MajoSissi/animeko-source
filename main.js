const processSources = require('./scripts/process-sources');
const updateReadme = require('./scripts/update-readme');
const { logError } = require('./scripts/utils');

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
