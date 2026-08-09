---
title: 用 Hexo 搭建个人博客并部署到 GitHub Pages
date: 2026-08-09 01:00:00
categories: [技术]
tags: [Hexo, GitHub, 博客搭建]
---

这篇文章记录一下我是如何搭建这个博客的，方便以后维护，也分享给想搭建自己博客的朋友。

## 技术栈

- **Hexo**：快速、简洁、高效的静态博客框架
- **NexT** 主题：Gemini 方案 + 自定义深灰配色
- **GitHub Pages**：免费托管，通过 GitHub Actions 自动构建发布
- **giscus**：基于 GitHub Discussions 的免费评论区

## 核心步骤

### 1. 安装 Hexo

```bash
npm install -g hexo-cli
```

### 2. 初始化项目

```bash
hexo init my-blog
cd my-blog
npm install
```

### 3. 安装 NexT 主题

NexT 8.x 已迁移到新仓库：

```bash
git clone https://github.com/next-theme/hexo-theme-next themes/next
```

然后在站点 `_config.yml` 中启用：

```yaml
theme: next
```

### 4. 写作

```bash
hexo new "文章标题"
```

文章是 Markdown 格式，`front-matter` 里可以配置标题、分类、标签：

```markdown
---
title: 我的文章
date: 2026-08-09 01:00:00
categories: [技术]
tags: [Hexo]
---
```

### 5. 本地预览

```bash
hexo server
```

打开 `http://localhost:4000` 即可预览。

### 6. 部署

仓库创建为 `你的用户名.github.io`，配置 GitHub Actions 工作流后，每次 `git push` 都会自动构建并发布，无需手动操作。

## 常用命令速查

| 命令 | 作用 |
|------|------|
| `hexo new "标题"` | 新建文章 |
| `hexo server` | 本地预览 |
| `hexo clean && hexo g` | 清理并重新生成 |
| `git push` | 发布（自动部署） |
