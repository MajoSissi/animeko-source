const fs = require('fs');
const path = require('path');
const { log, rootDir } = require('./utils');
const config = require('./config.js');

const REPO = process.env.GITHUB_REPOSITORY || 'MajoSissi/animeko-source';

function updateReadme() {
    const readmePath = path.join(rootDir, 'README.md');
    let readmeContent = '';
    if (fs.existsSync(readmePath)) {
        readmeContent = fs.readFileSync(readmePath, 'utf8');
    }

    let mixedSection = '## 聚合三方订阅源\n\n';

    const allFileName = "all.json";
    const allRawUrl = `https://raw.githubusercontent.com/${REPO}/main/dist/${allFileName}`;
    mixedSection += '- **在线+BT**\n\n';
    mixedSection += `\`\`\`\n${allRawUrl}\n\`\`\`\n`;
    config.proxy.forEach((proxyUrl) => {
        const shortRawUrl = allRawUrl.replace(/^https?:\/\//, '');
        const fullUrl = proxyUrl + shortRawUrl;
        mixedSection += `\`\`\`\n${fullUrl}\n\`\`\`\n`;
    });
    mixedSection += '\n';

    for (const source of config.sources) {
        const displayName = source.name;
        const fileName = `${source.tag}.json`;
        const rawUrl = `https://raw.githubusercontent.com/${REPO}/main/dist/${fileName}`;

        mixedSection += `- **${displayName}**\n\n`;
        mixedSection += `\`\`\`\n${rawUrl}\n\`\`\`\n`;
        config.proxy.forEach((proxyUrl) => {
            const shortRawUrl = rawUrl.replace(/^https?:\/\//, '');
            const fullUrl = proxyUrl + shortRawUrl;
            mixedSection += `\`\`\`\n${fullUrl}\n\`\`\`\n`;
        });
        mixedSection += '\n';
    }

    let originalSection = '## 三方订阅源\n\n';

    const onlineSources = config.sources.filter(s => s.tag === 'online');
    const btSources = config.sources.filter(s => s.tag === 'bt');

    originalSection += '### 在线源\n\n';
    for (const source of onlineSources) {
        for (const link of source.urls) {
            let url = link;
            let srcText = '';

            if (typeof link === 'object' && link !== null) {
                url = link.url;
                if (link.src) {
                    srcText = ` - ${link.src}`;
                }
            }

            const name = path.basename(url).replace('.json', '');
            originalSection += `- **${name}**${srcText}\n\`\`\`\n${url}\n\`\`\`\n`;
        }
    }
    originalSection += '\n';

    originalSection += '### BT源\n\n';
    for (const source of btSources) {
        for (const link of source.urls) {
            let url = link;
            let srcText = '';

            if (typeof link === 'object' && link !== null) {
                url = link.url;
                if (link.src) {
                    srcText = ` - ${link.src}`;
                }
            }

            const name = path.basename(url).replace('.json', '');
            originalSection += `- **${name}**${srcText}\n\`\`\`\n${url}\n\`\`\`\n`;
        }
    }

    const startMarker = '<!-- AUTO_GENERATED_START -->';
    const endMarker = '<!-- AUTO_GENERATED_END -->';
    const newContent = `${startMarker}\n\n${mixedSection}\n${originalSection}\n${endMarker}`;

    if (readmeContent.includes(startMarker) && readmeContent.includes(endMarker)) {
        const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
        readmeContent = readmeContent.replace(regex, newContent);
    } else {
        readmeContent += `\n\n${newContent}`;
    }

    fs.writeFileSync(readmePath, readmeContent, 'utf8');
    log('README.md updated.');
}

if (require.main === module) {
    updateReadme();
}

module.exports = updateReadme;
