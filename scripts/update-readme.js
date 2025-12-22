const fs = require('fs');
const path = require('path');
const { log, rootDir } = require('./utils');
const config = require('../config.js');

// 仓库信息，用于生成链接
const REPO = process.env.GITHUB_REPOSITORY || 'MajoSissi/animeko-source';

function updateReadme() {
    const readmePath = path.join(rootDir, 'README.md');
    let readmeContent = '';
    if (fs.existsSync(readmePath)) {
        readmeContent = fs.readFileSync(readmePath, 'utf8');
    }

    // Generate Mixed Sources Table (Markdown)
    let mixedTable = '### 聚合三方订阅源 (已去重)\n\n';
    mixedTable += '| 分 类 | 链 接 (除了第一个都是加速链接, 订阅其中一个即可)|\n';
    mixedTable += '|---|---|\n';

    // Add "综合资源" first
    const allName = "在线+BT";
    const allFileName = "all.json";
    const allRawUrl = `https://raw.githubusercontent.com/${REPO}/main/dist/${allFileName}`;
    let allLinksHtml = `${allRawUrl}`;
    config.proxy.forEach((proxyUrl) => {
        const shortRawUrl = allRawUrl.replace(/^https?:\/\//, '');
        const fullUrl = proxyUrl + shortRawUrl;
        allLinksHtml += `<br><br>${fullUrl}`;
    });
    mixedTable += `| ${allName} | ${allLinksHtml} |\n`;

    for (const source of config.sources) {
        const category = source.tag;
        const displayName = source.name;
        const fileName = `${category}.json`;
        const rawUrl = `https://raw.githubusercontent.com/${REPO}/main/dist/${fileName}`;
        
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
    let originalTable = '### 三方订阅源 (散)\n\n';
    originalTable += '| 分 类 | 来 源 | 链 接 |\n|---|---|---|\n';
    
    for (const source of config.sources) {
        const displayName = source.name;
        for (const link of source.urls) {
            let url = link;
            let srcLink = '';

            if (typeof link === 'object' && link !== null) {
                url = link.url;
                if (link.src) {
                    srcLink = `[源](${link.src})`;
                }
            }

            originalTable += `| ${displayName} | ${srcLink} | ${url} |\n`;
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

if (require.main === module) {
    updateReadme();
}

module.exports = updateReadme;
