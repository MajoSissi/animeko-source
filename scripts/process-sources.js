const fs = require('fs');
const path = require('path');
const { log, logError, downloadFile, rootDir } = require('./utils');
const config = require('../config.js');

const sourceBaseDir = path.join(rootDir, 'source');
const mixedBaseDir = path.join(rootDir, 'mixed');

async function processSources() {
    fs.writeFileSync(path.join(rootDir, 'log.txt'), ''); // Clear log file
    log('Starting update process...');

    if (!fs.existsSync(mixedBaseDir)) {
        fs.mkdirSync(mixedBaseDir, { recursive: true });
    }

    let allMediaSources = [];
    const allSeenDomains = new Set();

    for (const source of config.sources) {
        const category = source.tag;
        const links = source.urls;
        log(`Processing category: ${category} (${source.name})`);
        
        const categorySourceDir = path.join(sourceBaseDir, category);
        if (!fs.existsSync(categorySourceDir)) {
            fs.mkdirSync(categorySourceDir, { recursive: true });
        }

        let mergedMediaSources = [];
        const seenDomains = new Set();

        for (const link of links) {
            let fileName = path.basename(new URL(link).pathname);
            if (!fileName || fileName === '.') fileName = 'index.json';
            if (!fileName.endsWith('.json')) fileName += '.json';

            const filePath = path.join(categorySourceDir, fileName);
            let content = '';

            try {
                log(`Downloading ${link}...`);
                content = await downloadFile(link);
                // 验证是否为有效 JSON
                JSON.parse(content);
                fs.writeFileSync(filePath, content, 'utf8');
            } catch (err) {
                logError(`Failed to download ${link}: ${err.message}`);
                if (fs.existsSync(filePath)) {
                    log(`Using cached file for ${link}`);
                    content = fs.readFileSync(filePath, 'utf8');
                } else {
                    logError(`No cache available for ${link}, skipping.`);
                    continue;
                }
            }

            try {
                const json = JSON.parse(content);
                if (json.exportedMediaSourceDataList && Array.isArray(json.exportedMediaSourceDataList.mediaSources)) {
                    for (const sourceItem of json.exportedMediaSourceDataList.mediaSources) {
                        let domain = null;
                        try {
                            const searchUrl = sourceItem.arguments?.searchConfig?.searchUrl;
                            if (searchUrl) {
                                domain = new URL(searchUrl).hostname;
                            }
                        } catch (e) {
                            // Ignore URL parsing errors
                        }

                        // Category level deduplication
                        let addToCategory = true;
                        if (domain) {
                            if (seenDomains.has(domain)) {
                                log(`Duplicate source skipped in category: ${sourceItem.arguments?.name} (${domain})`);
                                addToCategory = false;
                            } else {
                                seenDomains.add(domain);
                            }
                        }
                        if (addToCategory) {
                            mergedMediaSources.push(sourceItem);
                        }

                        // Global level deduplication
                        let addToAll = true;
                        if (domain) {
                            if (allSeenDomains.has(domain)) {
                                // log(`Duplicate source skipped in all: ${sourceItem.arguments?.name} (${domain})`);
                                addToAll = false;
                            } else {
                                allSeenDomains.add(domain);
                            }
                        }
                        if (addToAll) {
                            allMediaSources.push(sourceItem);
                        }
                    }
                }
            } catch (e) {
                logError(`Error parsing JSON from ${link}: ${e.message}`);
            }
        }

        const mixedFilePath = path.join(mixedBaseDir, `${category}.json`);
        const result = {
            exportedMediaSourceDataList: {
                mediaSources: mergedMediaSources
            }
        };

        fs.writeFileSync(mixedFilePath, JSON.stringify(result, null, 2), 'utf8');
        log(`Saved merged file to ${mixedFilePath}`);
    }

    // Save all.json
    const allFilePath = path.join(mixedBaseDir, 'all.json');
    const allResult = {
        exportedMediaSourceDataList: {
            mediaSources: allMediaSources
        }
    };
    fs.writeFileSync(allFilePath, JSON.stringify(allResult, null, 2), 'utf8');
    log(`Saved merged file to ${allFilePath}`);
    
    log('Source processing completed.');
}

if (require.main === module) {
    processSources().catch(err => {
        logError(err);
        process.exit(1);
    });
}

module.exports = processSources;
