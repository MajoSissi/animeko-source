const fs = require('fs');
const path = require('path');

const config = require('./config.js');
const sourceBaseDir = path.join(__dirname, 'source');
const mixedBaseDir = path.join(__dirname, 'mixed');
const logPath = path.join(__dirname, 'log.txt');

// 仓库信息，用于生成链接
const REPO = process.env.GITHUB_REPOSITORY || 'MajoSissi/animeko-source';

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

function updateReadme() {
    const readmePath = path.join(__dirname, 'README.md');
    let readmeContent = '';
    if (fs.existsSync(readmePath)) {
        readmeContent = fs.readFileSync(readmePath, 'utf8');
    }

    // Generate Mixed Sources Table (Markdown)
    let mixedTable = '### 聚合订阅源 (已去重)\n\n';
    mixedTable += '| 分 类 | 链 接 (除了第一个都是加速链接, 订阅其中一个即可)|\n';
    mixedTable += '|---|---|\n';

    for (const source of config.sources) {
        const category = source.tag;
        const displayName = source.name;
        const fileName = `${category}.json`;
        const rawUrl = `https://raw.githubusercontent.com/${REPO}/main/mixed/${fileName}`;
        
        let linksHtml = `${rawUrl}`;
        
        // Proxy Links
        config.proxy.forEach((proxyUrl, index) => {
            const shortRawUrl = rawUrl.replace(/^https?:\/\//, '');
            const fullUrl = proxyUrl + shortRawUrl;
            linksHtml += `<br><br>${fullUrl}`;
        });

        mixedTable += `| ${displayName} | ${linksHtml} |\n`;
    }

    // Generate Original Sources Table
    let originalTable = '### 原始订阅源 (上面已包含)\n\n';
    originalTable += '| 分 类 | 链 接 |\n|---|---|\n';
    
    for (const source of config.sources) {
        const displayName = source.name;
        for (const link of source.urls) {
            originalTable += `| ${displayName} | ${link} |\n`;
        }
    }

    const startMarker = '<!-- AUTO_GENERATED_START -->';
    const endMarker = '<!-- AUTO_GENERATED_END -->';
    const newContent = `${startMarker}\n\n${mixedTable}\n${originalTable}\n${endMarker}`;

    if (readmeContent.includes(startMarker) && readmeContent.includes(endMarker)) {
        const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
        readmeContent = readmeContent.replace(regex, newContent);
    } else {
        // Try to find old markers to replace if they exist
        const oldStart = '<!-- PROXY_LINKS_START -->';
        const oldEnd = '<!-- PROXY_LINKS_END -->';
        if (readmeContent.includes(oldStart) && readmeContent.includes(oldEnd)) {
             const regex = new RegExp(`${oldStart}[\\s\\S]*?${oldEnd}`);
             readmeContent = readmeContent.replace(regex, newContent);
        } else {
             readmeContent += `\n\n${newContent}`;
        }
    }

    fs.writeFileSync(readmePath, readmeContent, 'utf8');
    log('README.md updated.');
}

async function processSources() {
    fs.writeFileSync(logPath, ''); // Clear log file
    log('Starting update process...');

    if (!fs.existsSync(mixedBaseDir)) {
        fs.mkdirSync(mixedBaseDir, { recursive: true });
    }

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
                    for (const source of json.exportedMediaSourceDataList.mediaSources) {
                        let domain = null;
                        try {
                            const searchUrl = source.arguments?.searchConfig?.searchUrl;
                            if (searchUrl) {
                                domain = new URL(searchUrl).hostname;
                            }
                        } catch (e) {
                            // Ignore URL parsing errors
                        }

                        if (domain) {
                            if (seenDomains.has(domain)) {
                                log(`Duplicate source skipped: ${source.arguments?.name} (${domain})`);
                                continue;
                            }
                            seenDomains.add(domain);
                        }
                        mergedMediaSources.push(source);
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
    
    updateReadme();
    log('Update process completed.');
}

processSources().catch(err => {
    logError(err);
    process.exit(1);
});
