# Chrome / Edge 扩展安装

本目录是可直接“加载已解压扩展”的构建结果。

1. Chrome 打开 `chrome://extensions/`；Edge 打开 `edge://extensions/`。
2. 开启右上角“开发者模式”。
3. 点击“加载已解压的扩展”，选择整个 `chrome-extension` 文件夹。
4. 打开并登录 `https://www.xiaohongshu.com/chat/`，进入任意聊天。
5. 点击浏览器工具栏中的“小红书聊天归档器”。
6. 选择全部历史或明确的起止日期，并分别勾选要保留的消息类型。
7. 按需嵌入 Base64 成员头像，或分别下载图片、语音、视频、表情和卡片封面。

勾选任意媒体资源类型时会生成含 `chatlab.json`、所选媒体和 `manifest.json` 的 ZIP；不勾选媒体资源时直接生成 ChatLab JSON。聊天内容在浏览器本地处理，不会上传到第三方服务器。

国际账号（非中国大陆手机号）只能登录 `rednote.com`，而 RedNote 网页目前没有聊天记录界面，因此无法导出。这与 Google 账号地区无关。

最低版本：Chrome / Edge 116。
