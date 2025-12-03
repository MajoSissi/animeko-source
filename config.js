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
                "https://raw.githubusercontent.com/cxay666/ani-yuan/main/ani-yuan.json",
                "https://raw.githubusercontent.com/Nier4ever/ani-sub/main/css.json",
                "https://gitee.com/wan0ge/extract-pure-links/raw/Ani_Pages/H.json"
            ]
        },
        {
            name: "BT",
            tag: "bt",
            urls: [
                "https://masofod.github.io/anibt.json"
            ]
        }
    ]
};
