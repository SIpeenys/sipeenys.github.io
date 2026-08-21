# 博客搭建全纪录 & 经验总结（Skill）

> 本文档沉淀本次「从零搭建个人博客」的全部经验：最终架构、技术选型决策、踩过的坑、可复用的处理思路。下次遇到同类问题直接查这里。

---

## 一、最终架构一览

```
┌─ 内容层：本地 D:\zsbsth（Hexo 源文件）
│    ├── source/_posts/*.md     文章（Markdown）
│    ├── themes/next            NexT 主题（深灰定制）
│    ├── source/_data/          自定义变量/样式/页面注入
│    └── source/comments/       评论区组件（Supabase）
│
├─ 触发层：git push → GitHub
│    └── .github/workflows/deploy-pages.yml 自动构建
│
├─ 构建层：GitHub Actions（Node 24 + Hexo 8）
│    └── hexo generate → 静态 HTML
│
├─ 托管层：GitHub Pages → https://sipeenys.github.io
│
└─ 数据层：Supabase 数据库（评论区，独立于 git）
```

**关键认知**：博客 = 静态网站（push 时烧制好网页）；评论 = 独立数据库系统。两者分离。

---

## 二、技术选型决策记录

| 决策点 | 最终选择 | 理由 |
|---|---|---|
| 博客框架 | **Hexo** | 中文生态大、上手快、GitHub Pages 一键托管 |
| 主题 | **NexT v8（Gemini 方案）** | 简洁优雅、自定义强、深灰配色定制方便 |
| 托管 | **GitHub Pages** | 免费、国内可直连（实测 200 OK 无需梯子） |
| 自动部署 | **GitHub Actions** | push 即发布，零维护 |
| 评论区 | **Supabase（审核模式）** | 匿名留言（用户核心需求）、免费、免服务器 |
| 访问统计 | **不蒜子** | 免费免注册、中文、只需开一个开关 |
| 搜索/RSS | hexo-generator-searchdb / feed | 本地搜索 + RSS 订阅 |

**评论区方案演进（重点经验）**：
- ❌ **giscus**：免维护但**必须登录 GitHub 才能留言**（用户需求是匿名）
- ❌ **Waline + Vercel**：vercel.app 国内被 DNS 污染，且 Vercel 部署保护/框架部署坑多
- ❌ **Waline + CloudBase**：网页流程有 bug（region 参数 JS 错误），试用环境数据库未开通（RESOURCE_NOT_FOUND）
- ✅ **Supabase + 自写组件**：免部署服务器、匿名、审核模式、国内可访问

---

## 三、踩坑大全（按主题分类）

### 🕐 1. Hexo 版本兼容性
- **坑**：git clone 的 NexT 默认是 v7.8（`.swig` 模板），**与 Hexo 8 不兼容**（Hexo 7+ 移除了 swig 渲染）。
- **解**：NexT v8 在 `next-theme/hexo-theme-next` 仓库（`.njk` 模板）。`git clone https://github.com/next-theme/hexo-theme-next themes/next`
- 教训：**先确认主题版本与 Hexo 大版本匹配再选模板**。

### 🕐 2. 时区导致 URL 不一致（经典坑）
- **现象**：permalink 含日期 `:year/:month/:day/:title/` 时，本地（+8 时区）生成 `2026/08/09/xxx`，CI（UTC）生成 `2026/08/08/xxx`，URL 不一致。
- **原因**：Hexo 的 `post_permalink` 格式化日期时**不套用 timezone 配置**，直接用进程本地时区。
- **解**：`permalink: :title/` —— URL 不含日期，彻底免疫时区问题，且 URL 永久稳定。
- 教训：**静态站生成器的 URL 不要放日期，除非你确认构建环境时区一致**。

### 🕐 3. 包管理器/网络
- **坑**：pnpm 在部分环境反复超时卡死；npm install 超过工具 30s 超时。
- **解**：统一用 **npm**（国内 npmmirror 镜像很快）；长命令用 `Start-Process` 后台跑 + 日志轮询。
- 教训：**国内环境优先 npm + npmmirror；交互式/长命令不要在前台等超时**。

### 🕐 4. vercel.app 国内 DNS 污染（重要）
- **现象**：`vercel.app` 域名解析出假 IP（`face:b00c` IPv6 特征、Facebook/Dropbox 的 IP），3 个公共 DNS 全部被污染。
- **结论**：**国内不挂代理的访客无法访问 vercel.app**。用户浏览器能开是因为系统代理（127.0.0.1:7890）。
- 教训：**选型前先测目标域名在国内的可达性**（`nslookup` + `curl` 直连）。

### 🕐 5. Vercel 部署保护（SSO）
- **坑**：Vercel 新建项目默认开启 Deployment Protection，部署 URL 会 302 跳登录页，访客无法访问。
- **解**：Settings → Deployment Protection → Vercel Authentication 设为 Disabled。
- 教训：**部署后必须验证 URL 是否公开可访问**（curl 看是否 302 到登录）。

### 🕐 6. CloudBase 全家桶的坑
- 网页一键部署流程有 bug（URL 里 `region=[object Object]` 是控制台 JS 错误）。
- CLI 3.x 的 framework deploy 在 webpack standalone 版上无法动态加载插件（MODULE_NOT_FOUND，文件明明存在）。
- 手动部署云函数可行，但**试用（体验版）环境数据库返回 RESOURCE_NOT_FOUND**，数据库未真正开通。
- Waline 的 `@waline/cloudbase` 自动建集合逻辑与 CloudBase 报错码不匹配（期望 `DATABASE_COLLECTION_NOT_EXIST`，实际抛 `RESOURCE_NOT_FOUND`）。
- 教训：**国内云服务商网页流程 bug 多时，果断换方案，别硬磕**。

### 🕐 7. Supabase RLS 的经典误判（本次最关键的一课）
- **现象**：插入被拒 `42501 new row violates row-level security policy`，反复重建策略无效。
- **真相**：RLS 策略本身没问题！报错来自我的测试请求带了 `Prefer: return=representation` 头——PostgREST 插入后要回读刚插入的行，而该行是 `pending` 状态，被 SELECT 策略（只读 approved）挡下。
- **解**：客户端插入**不带 return=representation 头**即可正常；最终方案用 `with check (true)` + **BEFORE INSERT 触发器强制 status='pending'**，双重保险。
- 教训：**RLS 报错时先检查请求头/回读行为，别急着改策略**；PostgREST 的 `Prefer` 头行为差异要注意。

### 🕐 8. Windows 环境命令坑
- **坑 1**：PowerShell 里 `curl -d '{"a":1}'` 单引号会被吃掉，服务端报 "Empty or invalid json"。
- **解**：JSON 写入文件，用 `--data-binary @file.json`。
- **坑 2**：Windows schannel 报 `CRYPT_E_REVOCATION_OFFLINE`（吊销检查连不上）。
- **解**：curl 加 `--ssl-no-revoke`（浏览器一般不受影响）。
- **坑 3**：`Select-String -SimpleMatch` 会把 `|` 当字面量，正则要多重转义。
- 教训：**Windows + curl + JSON = 用文件传 body**。

### 🕐 9. 从 JWT 提取 Supabase 项目 ID
- anon key 是 JWT，payload 里 `ref` 字段就是项目引用。用 `Buffer.from(payload, 'base64url')` 解码即可拿到 Project URL 后缀。
- 教训：**别靠肉眼读 base64，用命令解码**（我这次就看走眼一次）。

---

## 四、可复用的"下次思路"

1. **选评论系统前**：先问核心需求（是否匿名/免登录）→ 再看国内可达性（DNS + 直连测试）→ 再评估部署复杂度。
2. **遇到 RLS/权限报错**：先复现最小请求（去掉可疑头）→ 再查策略 → 最后加触发器兜底。
3. **静态站 URL 设计**：避免日期，用 `:title/`。
4. **长部署命令**：后台运行 + 日志轮询，避免超时。
5. **验证线上**：curl 直连看状态码 + 关键内容标记（giscus/waline/sc-comments）。
6. **密钥安全**：暴露过的 API 密钥用完立即禁用/轮换。

---

## 五、当前系统关键信息速查

| 项目 | 值 |
|---|---|
| 博客网址 | https://sipeenys.github.io |
| 博客仓库 | `SIpeenys/sipeenys.github.io` |
| 本地目录 | `D:\zsbsth` |
| 当前主题 | **Butterfly 5.7.0**（备用：NexT 8.29 保留在 themes/next） |
| 主题切换 | 改 `_config.yml` 一行 `theme: butterfly/next` |
| Supabase 项目 | https://supabase.com/dashboard/project/mxurcwwkezdpyjmjqkmi |
| 评论表 | `public.comments`（status: pending→approved） |
| 评论区组件 | `source/comments/comments.js` |
| 灰白配色 CSS | `source/css/butterfly-gray.css` |
| 部署工作流 | `.github/workflows/deploy-pages.yml` |

---

## 六、Butterfly 主题适配记录（2026-08-10 新增）

### 决策背景
用户想试试蝴蝶主题的颜值，但要求「原来的别删，不好可以弄回去」。

### 方案设计
- NexT 所有文件**完全保留**（themes/next、source/_data/variables.styl、styles.styl 等）
- 切换 = `_config.yml` 一行 `theme: butterfly` ↔ `theme: next`
- 黑白切换零风险

### 适配要点
1. **灰白配色**：Butterfly 使用 CSS 变量（`--card-bg`/`--font-color`/`--global-bg` 等），`source/css/butterfly-gray.css` 里默认（浅色）改 `:root` 变量、深色模式改 `[data-theme='dark']` 变量；顶部导航浅蓝色在「顶部栏：浅蓝色」的 `#nav` 规则里。
2. **评论区注入**：Butterfly 不支持 Supabase 内置，通过 `inject.bottom` 注入脚本：检测文章页（`#article-container.post-content`）→ 动态创建评论容器 → 加载 comments.js。
3. **Butterfly 5.7.0 与 Hexo 8 兼容**：需要额外安装 `hexo-renderer-pug`（和 NexT 的 ejs 可共存）。
4. **搜索**：搜索插件 hexo-generator-searchdb 生成 search.xml，Butterfly 设置 `search.use: local_search` 即可复用。
5. **代码高亮**：从 `light` 改为 `darker`（深色主题匹配）。
6. **默认浅色**：`display_mode: light`，默认灰白浅色；深色模式变量（`[data-theme='dark']`）保留，改回 `display_mode: dark` 即为深灰暗色。
7. **顶部图**：`disable_top_img: true`（保持干净无 Banner）。
8. **侧边栏**：author 卡片（头像+GitHub链接）、公告卡片（毛姆名言）、最新文章、标签分类。

### 回退方案
改 `_config.yml` 的 `theme: butterfly` → `theme: next`，push 即可。NexT 的深灰配色、自定义样式、评论区全部原样Ready。
