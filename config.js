/**
 * 配置说明:
 * filter (包含过滤器) / excludeFilter (排除过滤器):
 *   - 字符串: 简单的包含匹配 (例如 "baidu" 会匹配 "www.baidu.com")
 *   - 正则格式字符串: 使用 "/pattern/flags" 格式 (例如 "/^baidu\\.com$/i")
 * 
 * 优先级:
 *   - urls 中的 filter/excludeFilter 仅对该 url 下载的内容生效
 *   - sources 中的 filter/excludeFilter 对该分类下所有内容生效
 *   - 两者是"与"的关系，即同时满足(如果都存在)
 * 
 * 示例:
 * {
 *     name: "示例分类",
 *     tag: "example",
 *     filter: "/(baidu|google)/i", // 整合过滤,只保留域名中包含 baidu 或 google 的源
 *     excludeFilter: "ad",          // 整合排除, 排除域名中包含 "ad" 的源
 *     urls: [
 *         {
 *             file: "example.json",
 *             src: "https://example.com",
 *  *          filter: null,         // 单独设置，覆盖默认行为(注意：目前逻辑是叠加过滤，不是覆盖，具体看 process-sources.js 实现)
 *             // 修正：根据代码逻辑，itemFilter 和 globalFilter 是同时生效的 (&& 关系)
 *             excludeFilter: "/test/i" // 排除包含 test 的源
 *             url: "https://example.com/data.json",

 *         }
 *     ]
 * }
 */

module.exports = {
    // 更新readme用的
    proxy: [
        "https://ghfast.top/",
        "https://gh-proxy.com/"
    ],
    sources: [
        {
            name: "在线",
            tag: "online",
            urls: [
                {
                    file: "ani-yuan.json",
                    src: "https://github.com/cxay666/ani-yuan",
                    url: "https://raw.githubusercontent.com/cxay666/ani-yuan/main/ani-yuan.json"
                },
                {
                    file: "css.json",
                    src: "https://github.com/Nier4ever/ani-sub",
                    url: "https://raw.githubusercontent.com/Nier4ever/ani-sub/main/css.json"
                },
                {
                    file: "H.json",
                    src: "https://gitee.com/wan0ge/extract-pure-links",
                    excludeFilter: "sukebei.nyaa.si",
                    url: "https://gitee.com/wan0ge/extract-pure-links/raw/Ani_Pages/H.json"
                }
            ]
        },
        {
            name: "BT",
            tag: "bt",
            urls: [
                {
                    file: "anibt.json",
                    url: "https://masofod.github.io/anibt.json"
                },
                {
                    file: "H.json",
                    src: "https://gitee.com/wan0ge/extract-pure-links",
                    filter: "sukebei.nyaa.si",
                    url: "https://gitee.com/wan0ge/extract-pure-links/raw/Ani_Pages/H.json"
                }
            ]
        }
    ]
};
