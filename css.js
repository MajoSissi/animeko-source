const fs = require('fs');
const path = require('path');

// 1. 读取custom目录下的所有文件
const customDir = path.join(__dirname, 'custom');
const files = fs.readdirSync(customDir);

// 2. 初始化合并后的数组
const mergedMediaSources = [];

// 3. 遍历处理每个文件
files.forEach((file) => {
  const filePath = path.join(customDir, file);

  // 读取文件内容
  const content = fs.readFileSync(filePath, 'utf8');

  // 解析JSON并合并数组
  try {
    const { mediaSources } = JSON.parse(content);
    console.log(mediaSources);
    if (Array.isArray(mediaSources)) {
      mergedMediaSources.push(...mediaSources);
    }
  } catch (e) {
    console.error(`Error processing file ${file}:`, e.message);
  }
});

// 4. 构建最终数据结构
const result = {
  exportedMediaSourceDataList: {
    mediaSources: mergedMediaSources
  }
};

// 5. 写入css.json（使用格式化输出）
fs.writeFileSync(path.join(__dirname, 'source', 'ani.json'), JSON.stringify(result, null, 2));

console.log('合并完成！');
