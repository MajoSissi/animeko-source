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

    // 确保输出目录存在
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
        log(`处理分类: ${category} (${source.name})`);
        log('================================================================================');
        
        const categorySourceDir = path.join(sourceBaseDir, category);
        // 确保分类的源目录存在
        if (!fs.existsSync(categorySourceDir)) {
            fs.mkdirSync(categorySourceDir, { recursive: true });
        }

        let mergedMediaSources = [];
        const seenDomains = new Set();
        const configuredFiles = new Set();

        for (const link of links) {
            // 链接配置必须为对象并包含 file 字段
            if (typeof link !== 'object' || link === null) {
                logError(`无效的链接配置（必须为对象）： ${JSON.stringify(link)}`);
                continue;
            }
            if (!link.file) {
                logError(`链接配置缺少 'file' 字段： ${JSON.stringify(link)}`);
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
                    // 有下载地址则尝试下载并保存到本地缓存
                    log(`下载中： ${downloadUrl} ...`);
                    content = await downloadFile(downloadUrl);
                    // 验证是否为有效 JSON
                    JSON.parse(content);
                    fs.writeFileSync(filePath, content, 'utf8');
                } else {
                    // 无 url 时尝试读取本地已有文件
                    if (fs.existsSync(filePath)) {
                        log(`使用本地文件： ${fileName}`);
                        content = fs.readFileSync(filePath, 'utf8');
                    } else {
                        logError(`未提供 URL，且本地文件不存在： ${fileName}`);
                        continue;
                    }
                }
            } catch (err) {
                logError(`下载失败： ${downloadUrl}，错误： ${err.message}`);
                if (fs.existsSync(filePath)) {
                    log(`使用缓存文件： ${fileName}`);
                    content = fs.readFileSync(filePath, 'utf8');
                } else {
                    logError(`没有可用缓存，跳过： ${downloadUrl}`);
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
                            // 忽略 URL 解析错误
                        }

                        // 全局 / 项目级别的包含/排除过滤
                        if (globalFilter && !checkFilter(domain, globalFilter)) {
                            log(`[过滤] 跳过 ${sourceItem.arguments?.name} (${domain}) - 全局包含过滤: ${globalFilter}`);
                            continue;
                        }
                        if (itemFilter && !checkFilter(domain, itemFilter)) {
                            log(`[过滤] 跳过 ${sourceItem.arguments?.name} (${domain}) - 条目包含过滤: ${itemFilter}`);
                            continue;
                        }

                        if (globalExcludeFilter && checkFilter(domain, globalExcludeFilter)) {
                            log(`[过滤] 跳过 ${sourceItem.arguments?.name} (${domain}) - 全局排除过滤: ${globalExcludeFilter}`);
                            continue;
                        }
                        if (itemExcludeFilter && checkFilter(domain, itemExcludeFilter)) {
                            log(`[过滤] 跳过 ${sourceItem.arguments?.name} (${domain}) - 条目排除过滤: ${itemExcludeFilter}`);
                            continue;
                        }

                        // 分类级别去重
                        let addToCategory = true;
                        if (domain) {
                            if (seenDomains.has(domain)) {
                                log(`分类内重复，跳过： ${sourceItem.arguments?.name} (${domain})`);
                                addToCategory = false;
                            } else {
                                seenDomains.add(domain);
                            }
                        }
                        if (addToCategory) {
                            mergedMediaSources.push(sourceItem);
                        }

                        // 全局级别去重
                        let addToAll = true;
                        if (domain) {
                            if (allSeenDomains.has(domain)) {
                                // log(`全局中重复，跳过： ${sourceItem.arguments?.name} (${domain})`);
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

        // 清理未在配置中声明的本地文件
        try {
            if (fs.existsSync(categorySourceDir)) {
                const existingFiles = fs.readdirSync(categorySourceDir);
                for (const file of existingFiles) {
                    if (!configuredFiles.has(file) && file.endsWith('.json')) {
                        fs.unlinkSync(path.join(categorySourceDir, file));
                        log(`删除未配置的文件： ${file}`);
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

    // 保存合并后的 all.json
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
