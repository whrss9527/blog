# goblog

了迹奇有没的博客。2.0 起是**纯静态的页面应用**：没有服务器、没有数据库、没有后台。
构建脚本读取内容仓库 [blog-data](https://github.com/whrss9527/blog-data)，生成整站静态文件，用 GitHub Pages 托管在 <https://blog.whrss.com>。

- **像 App 一样切换页面**：每个页面都预渲染成 HTML（没开 JavaScript、搜索引擎都能读到全文）；在站内点链接时，浏览器用同一套模板直接渲染下一页，配合 View Transitions 过渡，卡片标题会「飞」进文章页，不整页刷新。
- **玻璃质感**：缓慢漂移的极光背景、跟随指针的柔光、带高光描边的毛玻璃卡片（指针移上去会轻微倾斜、有反光）、液态滑动的导航指示器、从按钮处圆形扩散的明暗主题切换。系统设了「减少动态效果」「降低透明度」时自动收敛。
- **搜索**：<kbd>⌘K</kbd> / <kbd>Ctrl K</kbd> / <kbd>/</kbd> 呼出，搜标题、标签和全文，键盘上下选择、回车打开。
- **阅读**：文章目录（宽屏侧栏，窄屏底部抽屉）、阅读进度条、代码块一键复制、图片点击放大、上一篇 / 下一篇、相关文章、过时提醒（写于两年前的技术文章）。
- **评论**：giscus（GitHub Discussions），快滚到时才加载；按文章的**原地址**找讨论，以前的评论都在。
- **订阅与 SEO**：Atom 订阅（`/feed.xml`，旧地址 `/feed` 照常可用）、sitemap、canonical、Open Graph、JSON-LD。
- **离线阅读**：Service Worker，读过的文章断网也能打开。
- **旧地址全部可用**：`/posts/<文章>`、`/pages/<页面>`、`/archive`、`/tags`、`/reading`、`/stats`、`/random`、`/intro`、`/?tag_id=`、`/?category_id=`、`/?keyword=`；文章里的 `#标题锚点` 规则不变。

## 目录

```
.
├── blog.config.json        站点名称、域名、导航、评论、统计
├── scripts/
│   ├── build.mjs           构建入口：blog-data → dist/
│   ├── serve.mjs           本地预览服务器（按 GitHub Pages 的规则响应）
│   └── lib/
│       ├── content.mjs     读取文章、页面、分类、标签、书单
│       ├── markdown.mjs    Markdown → HTML（marked，兼容 editor.md 的写法）
│       └── extras.mjs      订阅、sitemap、manifest、Service Worker
├── src/
│   ├── render.js           页面模板：构建时预渲染、浏览器里站内跳转，用的是同一份
│   ├── app.js              浏览器端：路由、搜索、主题、动效、目录、评论
│   └── style.css           样式
├── public/                 原样复制的文件：图标、logo、/intro 简历页
├── test/                   node:test 测试和一份小的样例内容
└── .github/workflows/      CI（测试 + 构建）、Deploy（构建 + 发布到 GitHub Pages）
```

## 本地运行

需要 Node.js 20 以上。

```bash
git clone https://github.com/whrss9527/goblog.git
cd goblog
git clone https://github.com/whrss9527/blog-data.git   # 内容放在仓库里的 blog-data/（已在 .gitignore 里）
npm ci
npm run dev        # 构建并在 http://localhost:4173 预览
npm test           # 测试
npm run preview    # 另外生成 dist/preview.html：整站打包成一个文件，双击就能看
```

内容仓库在别处时：`node scripts/build.mjs --data ../blog-data`，或者设置环境变量 `BLOG_DATA`。

## 写文章

文章就是 blog-data 里的 `posts/<地址>.md`，文件名就是文章地址（`/posts/<地址>`）。文件头：

```yaml
---
title: "标题"
status: 1                  # 1 发布；其他值是草稿，不会出现在网站上
created_at: 2026-10-01T09:00:00+08:00
updated_at: 2026-10-01T09:00:00+08:00
category_id: 1             # categories.json 里的 id
tag_ids: [46, 47]          # tags.json 里的 id
is_top: 0                  # 1 置顶
description: "一两句摘要，用在卡片、搜索结果和分享卡片上"
word_count: 1268           # 可省略，省略时按正文字数算
---
```

正文是 Markdown，写法和以前的编辑器（editor.md）一致：单个换行就是换行，`--`、`...`、引号会变成排版用的符号，支持表格、任务列表、`:fa-rocket:` 这类表情短码。可以写少量 HTML，但脚本、事件属性这类会被去掉。
`pages/<id>.md` 是独立页面（`/pages/<id>`），`books.json` 是阅读页的书单，封面放在 `covers/`。

推到 blog-data 之后，网站一小时内自动更新；想马上更新，在本仓库的 Actions 里手动运行 **Deploy**，或者让 blog-data 推送时通知本仓库（见下面「内容更新后自动发布」）。

`views.json` 里的阅读数是静态版之前的统计，网站上还会显示，但不再增长。

## 发布到 GitHub Pages（一次性设置）

1. 本仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
2. 合并到 `main`（或在 Actions 里手动运行 **Deploy**）。第一次发布后，站点在 `https://whrss9527.github.io/<仓库名>/` 上就能完整预览（构建会自动带上这个子路径）。仓库改名后地址跟着变，不用改代码。
3. 确认没问题后切换域名：
   1. DNS（Cloudflare）：`blog` 改成 `CNAME` → `whrss9527.github.io`，**仅 DNS**（灰色云朵），GitHub 才能签发证书。
   2. **Settings → Pages → Custom domain** 填 `blog.whrss.com` 并保存，证书签好后勾上 **Enforce HTTPS**。
   3. 在 Actions 里手动运行一次 **Deploy**：子路径去掉，所有链接回到根路径。
4. 旧的 goblog 服务（systemd）可以停掉了。

### 内容更新后自动发布（可选）

在 blog-data 里加一个工作流，推送后通知本仓库重新发布。需要一个对本仓库有 Contents 读写权限的 fine-grained token，存成 blog-data 的 Secret `BLOG_DISPATCH_TOKEN`：

```yaml
# blog-data/.github/workflows/notify.yml
on: push
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -X POST -H "Authorization: Bearer ${{ secrets.BLOG_DISPATCH_TOKEN }}" \
            -H "Accept: application/vnd.github+json" \
            https://api.github.com/repos/whrss9527/goblog/dispatches \
            -d '{"event_type":"blog-data-updated"}'
```

不加也行：Deploy 每小时检查一次，blog-data 有新提交才发布。仓库改名后记得改这里的地址。

## 隐私与安全

- 构建只读取 `posts/`、`pages/`、`categories.json`、`tags.json`、`books.json`、`views.json`、`covers/`，**不会**把 `users.json` 带进网站（测试里有检查）。
  blog-data 是公开仓库，`users.json` 里的密码哈希任何人都能下载；静态版不再需要它，建议从 blog-data 里删掉，并换掉在别处用过的同一个密码。
- Google Analytics 只在正式域名上加载，本机和局域网地址不会加载。

## 从 1.x 升级

1.x 是 Go 写的服务端渲染博客（Gin + 管理后台）。2.0 去掉了服务端：

| 1.x | 2.0 |
| --- | --- |
| 管理后台写文章 | 直接在 blog-data 里写 Markdown（任何编辑器、GitHub 网页都行） |
| 服务端渲染 Markdown | 构建时渲染，规则不变 |
| `/api/search` | 浏览器里搜索（全文索引随站点一起生成） |
| 点赞、实时阅读数 | 去掉了（需要服务端）；历史阅读数保留展示 |
| systemd 部署 | GitHub Pages |

最后一个服务端版本是 [v1.10.0](https://github.com/whrss9527/goblog/tree/v1.10.0)，需要时可以从那里找回。
