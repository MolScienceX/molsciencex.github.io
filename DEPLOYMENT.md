# MolScience 前端部署

正式前端位于 `frontend/`，Cloudflare 仅发布 Vite 生成的 `frontend/dist/`。

## Cloudflare 原生自动部署

Cloudflare Workers Builds 连接 GitHub 仓库后，在 `main` 更新时自动拉取代码、执行构建并发布。
GitHub Actions 与其相互独立：Pull Request 只执行构建检查，`main` 更新时部署 GitHub Pages。

Cloudflare 构建配置：

- Production branch：`main`
- Root directory：`/`
- Build command：`npm ci --prefix frontend && npm run build --prefix frontend`
- Deploy command：`npx wrangler deploy --config wrangler.jsonc`

需要一次性授权 Cloudflare GitHub App 访问 `MolScienceX/molsciencex.github.io`。不需要在 GitHub 中保存 Cloudflare API Token 或 Account ID。

部署使用仓库根目录的 `wrangler.jsonc`。不要重新添加指向仓库根目录的静态资源配置，否则可能把源码当作网站资源上传。

生产 API 地址由 `frontend/.env.production` 统一提供。GitHub Actions 和 Cloudflare
执行 Vite 生产构建时都会自动读取该文件，不需要分别配置 `VITE_API_BASE_URL`。

## 本地验证

在 `frontend/` 目录运行：

```bash
npm ci
npm run build
npm run preview
```

这里的 `npm run build` 即使在本机执行也属于生产模式，会读取 `.env.production` 并连接
`https://api.molscience.org`。日常本地联调使用 `npm run dev`，它读取未提交的
`.env.local` 并连接 `http://127.0.0.1:8000`。如需构建一个连接本地后端的静态版本，
执行 `npm run build -- --mode development`。

React 使用浏览器路由，Wrangler 已配置 `single-page-application` 回退，因此 `/about`、`/search` 和 `/molecule/...` 可以直接访问或刷新。
