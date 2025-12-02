module.exports = {
    // 更新readme用的
    proxy: [
        "https://ghfast.top/",
        "https://gh-proxy.com/"
    ],
    sources: [
        {
            tag: "online",
            name: "在线资源",
            urls: [
                // 官方
                "https://sub.creamycake.org/v1/css1.json",
                // 其他
                "https://raw.githubusercontent.com/cxay666/ani-yuan/main/ani-yuan.json",
                "https://raw.githubusercontent.com/Nier4ever/ani-sub/main/css.json",
                "https://gitee.com/wan0ge/extract-pure-links/raw/Ani_Pages/H.json"
            ]
        },
        {
            tag: "bt",
            name: "BT资源",
            urls: [
                // 官方
                "https://sub.creamycake.org/v1/bt1.json",
                // 其他
                "https://masofod.github.io/anibt.json"
            ]
        }
    ]
};
