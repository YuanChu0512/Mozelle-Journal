# Mozelle Journal

一个以二次元为主视觉的个人博客：白昼为伊蕾娜主题，夜晚为 Mon3tr / 明日方舟风格，同时记录电子、硬件、超频、游戏与 Cosplay。

**正式站点：** [www.mozelle.top](https://www.mozelle.top)

## 主要功能

- 白昼 / 黑夜双主题与针对移动端、低配置设备优化的切换动画
- 文章分类、文章详情与 Markdown 富文本展示
- 独立控制后台：文章草稿、立即发布、定时发布、封面和正文图片管理
- 服务端后台密码登录，以及可选的 GitHub OAuth 管理员备用登录
- PostgreSQL 数据库、文章修订记录与持久化图片目录
- Docker Compose + Caddy，一条命令在 VPS 上启动并自动申请 HTTPS 证书

## 本地检查

```bash
npm ci
npm run build
npm run api:check
```

后台必须连接 API 才能登录，口令只由服务端环境变量验证；VPS 部署后会使用真实数据库、持久化图片存储和服务端身份验证。

## VPS 部署

完整步骤见 [VPS 部署说明](docs/VPS_DEPLOYMENT.md)。部署配置由 `compose.yaml`、`Dockerfile` 与 `Caddyfile` 组成。

> `.env` 包含数据库密码、OAuth 密钥和会话密钥，绝不能提交到 GitHub。仓库只保留安全的 `.env.example` 模板。
