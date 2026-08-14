# MolScience Frontend

本目录是独立部署的 MolScience React/Vite 前端。后端代码位于
`MolScienceX/molscience-database` 仓库，前后端只通过 HTTP API 连接。

## 本地开发

首次安装依赖：

```bash
cd frontend
npm ci
```

复制示例配置并按需修改本机文件：

```bash
cp .env.example .env.local
```

默认配置连接本地 FastAPI：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

启动固定端口的本地前端：

```bash
npm run dev -- --port 5173 --strictPort
```

浏览器访问 `http://localhost:5173`。后端 `CORS_ORIGINS` 需要包含这个完整 origin。

## 环境变量边界

`VITE_API_BASE_URL` 是公开的后端 origin，会在构建时写入浏览器 JavaScript。所有
`VITE_` 变量都必须视为公开信息，不得保存数据库密码、`AUTH_TOKEN_SECRET`、
Supabase Service Role Key、私有 API Key 或管理员 Token。

本机使用的 `.env.local` 已被 Git 忽略；提交到仓库的 `.env.production` 统一指定
`https://api.molscience.org`，供生产构建使用；`.env.example` 只记录本地公开示例。
前端代码通过 `src/api/config.ts` 统一读取并校验 API 地址，业务组件不应硬编码环境 URL。

### 配置文件选取逻辑

Vite 根据运行模式选择配置，而不是根据命令是否在本机执行：

| 命令 | Vite 模式 | 实际 API 地址 | 用途 |
| --- | --- | --- | --- |
| `npm run dev` | `development` | `.env.local` 中的 `http://127.0.0.1:8000` | 本地联调 |
| `npm run build` | `production` | `.env.production` 中的 `https://api.molscience.org` | 本机、GitHub 和 Cloudflare 的生产构建 |
| `npm run build -- --mode development` | `development` | `.env.local` 中的 `http://127.0.0.1:8000` | 在本机构建连接本地后端的版本 |

`.env.local` 会参与本地开发模式；生产构建还会加载模式专用的 `.env.production`，且
`.env.production` 中的同名变量优先，因此即使两个文件同时存在，本机执行
`npm run build` 也不会将 `127.0.0.1` 写入生产产物。直接在终端或构建平台设置的同名
环境变量优先级最高，通常不应额外设置。修改配置后需要重新启动开发服务器或重新构建。

## GitHub Pages

GitHub Actions 执行 `npm run build` 时，Vite 会自动读取仓库中的 `.env.production`。
不需要额外配置 Repository Variable。

## Cloudflare

Cloudflare 执行同一个 `npm run build`，因此也会自动读取 `.env.production`，不需要
在 Cloudflare 后台重复配置构建变量，也不要将其写入 `wrangler.jsonc` 的运行时变量。

API 域名变化时，统一修改 `.env.production` 并重新构建。后端 `CORS_ORIGINS` 仍需
保留实际使用的前端来源。
