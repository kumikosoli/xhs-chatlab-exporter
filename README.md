# 小红书网页版 → ChatLab JSON 导出器

从**已经登录的小红书网页**读取指定私聊或群聊，按时间范围加载历史消息，并导出为 [ChatLab 标准格式 v0.0.2](https://docs.chatlab.fun/cn/standard/chatlab-format) JSON。可选嵌入成员头像，或生成包含聊天图片、表情、卡片封面和音视频的 ZIP 归档。

项目提供两种使用方式：适用于 Windows、macOS、Linux 的 Chrome/Edge 扩展，以及仅适用于 macOS 的 Safari 本地工具。两种方式使用相同的消息解析与 ChatLab 转换核心；都不依赖 Computer Use，不靠截图或 OCR，也不会读取 Cookie、调用私有接口或发送消息。

## 重要：账号区域限制

- 使用中国大陆手机号注册或归属中国大陆地区的小红书账号，可以登录 `xiaohongshu.com`；网页版提供聊天记录界面时，本工具可以导出。
- 国际账号（使用非中国大陆手机号）只能登录 `rednote.com`。RedNote 网页目前没有聊天记录界面，因此无法使用本工具导出聊天记录。
- 这一限制与 Google 账号所在地区无关，关键在于小红书账号所属区域以及对应网站是否提供聊天界面。
- 本工具不会也不能绕过小红书或 RedNote 的账号区域与产品功能限制。

## 选择使用方式

| 使用方式 | 支持系统 | 浏览器 | 是否需要 Node.js | 适合场景 |
|---|---|---|---|---|
| Chrome/Edge 扩展 | Windows、macOS、Linux | Chrome/Edge 116+ | 直接加载成品时不需要 | 跨平台使用；在浏览器里选择会话并下载 JSON/ZIP |
| Safari 本地版 | 仅 macOS | Safari | 需要 Node.js 20+ | 使用本地网页控制台或命令行；保留本地原件并支持脚本化 |

macOS 用户可以任选一种方式。Windows 和 Linux 用户请使用 Chrome/Edge 扩展；它不要求 Mac，也不需要 Safari。

## 能做什么

- 按联系人名、群名或小红书 `data-conv-id` 选择会话
- 提供本地网页控制台，可从页面打开官方登录、搜索会话和下载结果
- 自动区分私聊和群聊，也可用 `--kind` 强制校验
- 用 `--start` / `--end` 设置包含端点的时间范围
- 可按文字、图片、语音、视频、表情、分享卡片、回复、系统/撤回和其他消息分别勾选
- 自动滚动到所需历史时间；尚未到达时不会静默输出残缺结果
- 导出文字、图片、表情、笔记分享、回复、系统提示、撤回，以及未知消息的可读占位
- 可将成员头像下载并以内嵌 Data URL 写入 ChatLab
- 图片、语音、视频、表情和卡片封面可分别选择是否下载到 ZIP
- 保留原始 `platformMessageId`，便于 ChatLab 去重
- 输出前执行本地严格校验
- 零运行时 npm 依赖

## 方法一：Chrome / Edge 扩展

仓库中的 `chrome-extension/` 是已经构建完成、可直接加载的 Manifest V3 扩展。

也可以下载仓库内的 [Chrome/Edge v0.5.0 ZIP](./releases/xhs-chatlab-exporter-chrome-edge-v0.5.0.zip)，解压后再加载该文件夹。

支持 Windows、macOS 和 Linux。直接加载仓库内的成品扩展不需要安装 Node.js。

1. 下载或克隆本仓库。
2. Chrome 打开 `chrome://extensions/`；Edge 打开 `edge://extensions/`。
3. 开启“开发者模式”。
4. 点击“加载已解压的扩展”，选择仓库中的整个 `chrome-extension` 文件夹。
5. 打开并登录 `https://www.xiaohongshu.com/chat/`，进入任意聊天。
6. 点击工具栏中的“小红书聊天归档器”，选择会话、日期、消息类型、头像与需要下载的资源。

扩展的全部抓取、头像嵌入和 ZIP 打包都在本机浏览器中完成。关闭弹窗后，已启动的导出仍会继续；完成时由 Chrome/Edge 显示保存对话框。

日期与内容都可以精确控制：

- 时间可以选择“全部可访问记录”，也可以指定包含端点的开始日期和结束日期。
- 消息内容可分别勾选：文字、图片、语音、视频、表情、分享卡片、回复、系统/撤回和其他。
- “嵌入成员头像”独立控制；开启后，头像以 Base64 Data URL 写入 ChatLab JSON。
- ZIP 资源可分别勾选图片、语音、视频、表情和卡片封面。勾选任意一项就生成 ZIP；一项都不勾选则只下载 ChatLab JSON。
- 消息类型与资源下载相互独立。例如可以在 JSON 中保留图片消息及原始 URL，但不把图片文件下载进 ZIP。

如需从源码重新构建：

```bash
npm install
npm run build:extension
npm run package:extension
```

构建目录为 `chrome-extension/`，ZIP 安装包输出到 `releases/`。最低支持 Chrome/Edge 116。

## 方法二：macOS Safari 本地版

Safari 本地版由本机 Node.js 程序控制当前已登录的小红书 Safari 标签页，提供网页控制台和命令行两种入口。它只支持 macOS，不适用于 Windows 或 Linux。

### 环境要求

- macOS
- Safari
- Node.js 20 或更高版本
- 小红书网页版聊天页已登录并保持打开，例如：

  ```text
  https://www.xiaohongshu.com/chat/<会话 ID>
  ```

- Safari 已开启：

  ```text
  开发 → 允许来自 Apple 事件的 JavaScript
  ```

如果菜单栏没有“开发”，先在 Safari 设置的高级/开发者选项中显示开发菜单。首次运行时，macOS 也可能要求允许当前终端自动化控制 Safari。

### 网页控制台（推荐）

以下网页控制台属于 Safari 本地版；Windows 和 Linux 用户直接使用上面的 Chrome/Edge 扩展即可。

在仓库目录运行：

```bash
npm run web
```

浏览器会自动打开：

```text
http://127.0.0.1:4177
```

页面中的操作顺序：

1. 点击“打开小红书登录”，在 Safari 官方页面完成扫码或账号登录。
2. 回到控制台点击“刷新连接”。
3. 搜索并选择联系人或群聊。
4. 选择全部历史或日期范围。
5. 分别勾选需要的消息类型、Base64 成员头像，以及要下载到 ZIP 的图片、语音、视频、表情或卡片封面。
6. 点击“开始导出”。页面会显示聊天加载、头像、媒体和打包进度。
7. 完成后下载 JSON/ZIP，或在 Finder 中显示本地原件。

“直接登录”指控制台负责打开小红书官方登录页，并在登录后自动连接。账号、密码和扫码过程不会进入本工具，也不会把小红书页面嵌入不受信任的 iframe。

网页导出的本地原件保存在仓库的 `exports/` 目录，该目录默认不会进入 Git。服务只监听 `127.0.0.1`，每次启动还会生成随机令牌保护写操作。

“嵌入成员头像”默认开启。头像会成为 JSON 内的 `data:image/...;base64,...`，因此单个 JSON 文件就能保留头像。图片、语音、视频、表情和卡片封面默认不下载；勾选任意资源类型后，下载结果是 ZIP：

```text
xiaohongshu-会话名-时间/
├── chatlab.json
├── README.txt
└── media/
    ├── manifest.json
    ├── images/
    ├── stickers/
    ├── card-covers/
    ├── audio/
    └── videos/
```

媒体消息的 `content` 同时保留小红书原始 URL 和 ZIP 内的 `[本地文件] media/...` 路径。`manifest.json` 记录本次选择的资源类型、各类型统计、原始 URL、本地路径、类型、大小和 SHA-256；个别资源下载失败时也会记录原因，不会让整次导出作废。

如不想自动打开浏览器：

```bash
npm run web -- --no-open
```

### 命令行使用

仓库没有第三方运行时依赖，可以直接执行：

```bash
cd /path/to/xhs-chat-exporter
node ./bin/xhs-chat-export.js --list
```

按名称导出私聊：

```bash
node ./bin/xhs-chat-export.js \
  --conversation "联系人名称" \
  --start 2026-07-01 \
  --end 2026-07-29 \
  --self-name "我的显示名称" \
  --output ./contact.chatlab.json
```

同时嵌入头像，并只下载图片、表情和卡片封面：

```bash
node ./bin/xhs-chat-export.js \
  --conversation "联系人名称" \
  --start 2026-07-01 \
  --end 2026-07-29 \
  --embed-avatars \
  --download-media \
  --media-kinds image,emoji,card-cover \
  --output ./contact.chatlab.json
```

此时媒体默认写入同目录的 `contact.chatlab.media/`；可用 `--media-directory` 指定其他目录。命令行模式保留 JSON 和媒体目录两个可直接访问的输出，网页控制台则将它们打包成 ZIP。

按 ID 导出群聊：

```bash
node ./bin/xhs-chat-export.js \
  --conversation 137999752897687566 \
  --kind group \
  --start 2026-07-29T09:00:00 \
  --end 2026-07-29T18:00:00 \
  --output ./group.chatlab.json
```

也可以使用 npm 脚本：

```bash
npm run export -- --conversation "群聊名称" --start 2026-07-01
```

不提供 `--start` 时，脚本会持续向上加载，直到页面不再提供更早的消息；很长的聊天建议明确给出起始时间。

## 时间规则

默认时区是 `Asia/Shanghai`。以下格式都可用：

```text
2026-07-15
2026-07-15T22:43:00
2026-07-15T22:43:00+08:00
1784126580
```

- 只有日期的 `--start` 表示当天 `00:00:00`
- 只有日期的 `--end` 表示当天 `23:59:59`
- 时间范围是闭区间：`start <= timestamp <= end`
- 可用 `--timezone America/Los_Angeles` 等 IANA 时区覆盖默认值

小红书网页没有把每条消息的时间直接显示在 DOM 文本里，但原始消息 ID 的最后一段含秒级时间。导出器按以下规则解码：

```text
unixSeconds = (hex(lastMessageIdSegment) >> 24) - 0x180000000
```

页面中一条显示为 `2026-07-15 22:43` 的真实消息由此解码为 `2026-07-15 22:43:20 +08:00`。导出器使用这个精确时间，不根据时间分隔符猜测。

## 命令行参数

```text
-c, --conversation <值>   私聊联系人、群名或 data-conv-id
    --start <时间>        起始时间（包含）
    --end <时间>          结束时间（包含）
    --timezone <IANA>     默认 Asia/Shanghai
    --self-name <名称>    默认“我”
    --kind <auto|private|group>
    --message-types <列表>
                           仅导出指定 ChatLab 类型，如 0,1,5,25
    --embed-avatars        下载头像并以 Data URL 写入 ChatLab JSON
    --download-media       下载聊天资源；未指定种类时下载全部支持类型
    --media-kinds <列表>   仅下载 image,audio,video,emoji,card-cover 中的指定类型
    --media-directory <目录>
                           媒体保存目录；默认位于 JSON 文件旁
-o, --output <文件>       输出路径
    --max-pages <数量>    最多加载历史页数，默认 500
    --settle-ms <毫秒>    每页最短等待时间，默认 800
    --tab-url-contains <值>
                           选择 Safari 标签页的 URL 片段
    --list                列出会话
    --dry-run             抓取并校验，但不写文件
    --force               覆盖已有文件
-h, --help                帮助
    --version             版本
```

输出文件默认权限为 `0600`。已有文件默认不会被覆盖，必须显式添加 `--force`。

## ChatLab 字段与消息映射

输出始终包含四个标准区块：

```text
chatlab + meta + members + messages
```

`meta.platform` 使用可扩展的小写标识 `xiaohongshu`。每条消息都有秒级 `timestamp`、`sender`、`accountName`、数值 `type`、`content` 和原始 `platformMessageId`。

| 小红书网页结构 | ChatLab 类型 |
|---|---:|
| 文字 | `0` TEXT |
| 图片 | `1` IMAGE |
| 检测到的语音 | `2` VOICE |
| 检测到的视频 | `3` VIDEO |
| 表情/贴纸 | `5` EMOJI |
| 笔记卡片/分享 | `24` SHARE |
| 引用回复 | `25` REPLY |
| 加群、状态等提示 | `80` SYSTEM |
| 撤回 | `81` RECALL |
| 未知结构 | `99` OTHER |

ChatLab v0.0.2 的消息 `content` 是纯文本或 `null`。因此图片、表情和笔记封面的远程地址以普通文本保留，例如：

```text
[图片] https://...
```

启用媒体下载后，同一字段会增加本地归档路径：

```text
[图片] https://...
[本地文件] media/images/...
```

启用头像嵌入后，成员的 `avatar`（以及可取得时的 `meta.groupAvatar`）是符合规范的 Data URL。未启用时不写入头像内容。群聊页面没有暴露发送者的原始用户 ID，所以群成员 `platformId` 由头像资源标识进行 SHA-256 派生，不会把头像 URL 原文写进成员字段。若用户更换头像，跨批次导出时可能被识别为新成员。

## 校验

运行仓库测试：

```bash
npm test
npm run check
```

使用 ChatLab 官方 CLI 做最终校验：

```bash
npm install -g chatlab-cli
chatlab validate "/absolute/path/to/output.chatlab.json" --json
chatlab import "/absolute/path/to/output.chatlab.json" --dry-run --json
```

`--dry-run` 只预演导入，不写入 ChatLab 数据库。

仓库中的 [examples/example.chatlab.json](./examples/example.chatlab.json) 是不含真实聊天内容的最小示例。

## 工作方式

Safari 本地版：

1. 枚举 Safari 里 URL 含 `xiaohongshu.com/chat/` 的标签页。
2. 从侧栏读取会话的名称、ID 和类型。
3. 点击目标会话；只有给出明确 ID 且侧栏找不到时才直接导航到对应 URL。
4. 将 `.xhs-im-msg-list` 滚到顶部，等待网页按页加载更早消息。
5. 用消息 ID 的内嵌时间判断是否到达 `--start`。
6. 从 DOM 提取消息并转换成 ChatLab v0.0.2。
7. 按选项下载头像与媒体，并将本地路径写入消息。
8. 去重、排序、过滤、校验，然后原子写入 JSON 或打包 ZIP。

Chrome/Edge 扩展使用相同的 DOM 提取和 ChatLab 转换核心，但由内容脚本加载历史、扩展离屏页面下载资源并生成 Blob/ZIP，最后交给浏览器下载管理器保存，因此不需要 Safari、Apple Events 或本地 Node 服务。

## 已知限制

- 依赖小红书网页版当前的 DOM 类名；网站改版后可能需要更新 `src/page-scripts.js`。
- 只能导出网页向当前账号提供的历史记录。
- 小红书 CDN 链接可能过期；需要永久保留媒体时应在链接仍有效时启用媒体下载。
- 下载是否成功取决于当前网络和小红书 CDN；失败项目会写进 `media/manifest.json`。
- Chrome/Edge 扩展为避免浏览器内存耗尽，将单次媒体归档限制为约 768 MiB；超大记录建议分日期导出。
- 页面没有提供引用消息的原始消息 ID，因此回复会映射为 `type: 25` 并把引用文字写入 `content`，但不会伪造 `replyToMessageId`。
- JSON 适合少于约一百万条消息的中小型记录。ChatLab 规范建议更大的记录使用 JSONL；当前版本按需求只生成 JSON。

## 隐私与安全

- 不读取或导出浏览器 Cookie
- 不拦截网络请求
- 不调用小红书未公开 API
- 不点击发送按钮，不修改聊天
- 不上传聊天内容
- 网页控制台只绑定本机回环地址，并用随机令牌保护导出和登录操作
- Chrome/Edge 扩展仅申请小红书页面、静态资源域名、下载、离屏打包和本地设置权限
- 实际聊天文件已被 `.gitignore` 排除

请只导出你有权保存和处理的聊天记录，并妥善保管输出文件。

## Contributors

- [kumikosoli](https://github.com/kumikosoli) — 项目维护者
- OpenAI Codex — AI 编程协作者
