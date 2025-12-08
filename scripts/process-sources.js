const fs = require('fs');
const path = require('path');
const { log, logError, downloadFile, rootDir } = require('./utils');
const config = require('../config.js');

const sourceBaseDir = path.join(rootDir, 'source');
const distBaseDir = path.join(rootDir, 'dist');

function checkFilter(value, filter) {
    if (!filter) return true;
    if (!value) return false;

    const regexMatch = filter.match(/^\/(.*?)\/([gim]*)$/);
    if (regexMatch) {
        try {
            const regex = new RegExp(regexMatch[1], regexMatch[2]);
            return regex.test(value);
        } catch (e) {
            return false;
        }
    }
    return value.includes(filter);
}

async function processSources() {
    fs.writeFileSync(path.join(rootDir, 'log'), ''); // Clear log file
    log('Starting update process...');

    if (!fs.existsSync(distBaseDir)) {
        fs.mkdirSync(distBaseDir, { recursive: true });
    }

    let allMediaSources = [];
    const allSeenDomains = new Set();

    for (const source of config.sources) {
        const category = source.tag;
        const links = source.urls;
        const globalFilter = source.filter;
        const globalExcludeFilter = source.excludeFilter;

        log('================================================================================');
        log(`Processing category: ${category} (${source.name})`);
        log('================================================================================');
        
        const categorySourceDir = path.join(sourceBaseDir, category);
        if (!fs.existsSync(categorySourceDir)) {
            fs.mkdirSync(categorySourceDir, { recursive: true });
        }

        let mergedMediaSources = [];
        const seenDomains = new Set();
        const configuredFiles = new Set();

        for (const link of links) {
            if (typeof link !== 'object' || link === null) {
                logError(`Invalid link configuration (must be object): ${JSON.stringify(link)}`);
                continue;
            }
            if (!link.file) {
                logError(`Missing 'file' property in link configuration: ${JSON.stringify(link)}`);
                continue;
            }

            const downloadUrl = link.url;
            const fileName = link.file;
            const itemFilter = link.filter;
            const itemExcludeFilter = link.excludeFilter;

            configuredFiles.add(fileName);

            const filePath = path.join(categorySourceDir, fileName);
            let content = '';

            try {
                if (downloadUrl) {
                    log(`Downloading ${downloadUrl}...`);
                    content = await downloadFile(downloadUrl);
                    // 验证是否为有效 JSON
                    JSON.parse(content);
                    fs.writeFileSync(filePath, content, 'utf8');
                } else {
                    // 如果没有 url，尝试直接读取本地文件
                    if (fs.existsSync(filePath)) {
                        log(`Using local file: ${fileName}`);
                        content = fs.readFileSync(filePath, 'utf8');
                    } else {
                        logError(`No URL provided and local file not found: ${fileName}`);
                        continue;
                    }
                }
            } catch (err) {
                logError(`Failed to download ${downloadUrl}: ${err.message}`);
                if (fs.existsSync(filePath)) {
                    log(`Using cached file for ${downloadUrl}`);
                    content = fs.readFileSync(filePath, 'utf8');
                } else {
                    logError(`No cache available for ${downloadUrl}, skipping.`);
                    continue;
                }
            }

            try {
                const json = JSON.parse(content);
                if (json.exportedMediaSourceDataList && Array.isArray(json.exportedMediaSourceDataList.mediaSources)) {
                    for (const sourceItem of json.exportedMediaSourceDataList.mediaSources) {
                        let domain = null;
                        let searchUrl = null;
                        try {
                            searchUrl = sourceItem.arguments?.searchConfig?.searchUrl;
                            if (searchUrl) {
                                domain = new URL(searchUrl).hostname;
                            }
                        } catch (e) {
                            // Ignore URL parsing errors
                        }

                        if (globalFilter && !checkFilter(domain, globalFilter)) {
                            log(`[Filter] Skipped ${sourceItem.arguments?.name} (${domain}) - Global Filter: ${globalFilter}`);
                            continue;
                        }
                        if (itemFilter && !checkFilter(domain, itemFilter)) {
                            log(`[Filter] Skipped ${sourceItem.arguments?.name} (${domain}) - Item Filter: ${itemFilter}`);
                            continue;
                        }

                        if (globalExcludeFilter && checkFilter(domain, globalExcludeFilter)) {
                            log(`[Filter] Skipped ${sourceItem.arguments?.name} (${domain}) - Global Exclude Filter: ${globalExcludeFilter}`);
                            continue;
                        }
                        if (itemExcludeFilter && checkFilter(domain, itemExcludeFilter)) {
                            log(`[Filter] Skipped ${sourceItem.arguments?.name} (${domain}) - Item Exclude Filter: ${itemExcludeFilter}`);
                            continue;
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
                logError(`Error parsing JSON from ${link.file}: ${e.message}`);
            }
        }

        // Clean up unconfigured files
        try {
            if (fs.existsSync(categorySourceDir)) {
                const existingFiles = fs.readdirSync(categorySourceDir);
                for (const file of existingFiles) {
                    if (!configuredFiles.has(file) && file.endsWith('.json')) {
                        fs.unlinkSync(path.join(categorySourceDir, file));
                        log(`Deleted unconfigured file: ${file}`);
                    }
                }
            }
        } catch (e) {
            logError(`Error cleaning up files in ${categorySourceDir}: ${e.message}`);
        }

        const distFilePath = path.join(distBaseDir, `${category}.json`);
        const result = {
            exportedMediaSourceDataList: {
                mediaSources: mergedMediaSources
            }
        };

        fs.writeFileSync(distFilePath, JSON.stringify(result, null, 2), 'utf8');
        log(`Saved merged file to ${distFilePath}`);
    }

    // Save all.json
    const allFilePath = path.join(distBaseDir, 'all.json');
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
