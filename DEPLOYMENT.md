# MolScience 前端部署

正式前端位于 `frontend/`，Cloudflare 仅发布 Vite 生成的 `frontend/dist/`。

## Cloudflare 原生自动部署

Cloudflare Workers Builds 连接 GitHub 仓库后，在 `main` 更新时自动拉取代码、执行构建并发布。GitHub Actions 只负责 Pull Request 的前端构建检查，不负责部署。

Cloudflare 构建配置：

- Production branch：`main`
- Root directory：`/`
- Build command：`npm ci --prefix frontend && npm run build --prefix frontend`
- Deploy command：`npx wrangler deploy --config wrangler.jsonc`

需要一次性授权 Cloudflare GitHub App 访问 `MolScienceX/molsciencex.github.io`。不需要在 GitHub 中保存 Cloudflare API Token 或 Account ID。

部署使用仓库根目录的 `wrangler.jsonc`。不要重新添加指向仓库根目录的静态资源配置，否则可能把源码当作网站资源上传。

## 本地验证

在 `frontend/` 目录运行：

```bash
npm ci
npm run build
npm run preview
```

React 使用浏览器路由，Wrangler 已配置 `single-page-application` 回退，因此 `/about`、`/search` 和 `/molecule/...` 可以直接访问或刷新。
