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
VITE_API_BASE_URL=http://localhost:8000
```

启动固定端口的本地前端：

```bash
npm run dev -- --port 5173 --strictPort
```

浏览器访问 `http://localhost:5173`。后端 `CORS_ORIGINS` 需要包含这个完整 origin。
本地前后端统一使用 `localhost`，不要混用 `127.0.0.1`。

## 账户中心与认证

账户相关路由：

| 路由 | 功能 |
| --- | --- |
| `/login` | 登录、记住登录、找回密码、返回原站内页面 |
| `/account` | 账户概览、验证状态、有效权限、快捷入口 |
| `/account/profile` | 修改昵称和组织，支持清除可选值 |
| `/account/security` | 修改密码、会话列表与撤销、退出本环境全部会话 |
| `/account/developer` | 只读 API 密钥列表、创建、一次性展示、撤销和调用示例 |
| `/register`、`/verify-email`、`/forgot-password`、`/reset-password` | 注册与账户恢复 |

认证实现边界：

- 统一请求层位于 `src/services/http.ts`，自动拼接 `/api/v1` 前缀，保持 origin 校验；
- Access Token 只保存在内存，不写入 `localStorage` 或 `sessionStorage`；
- Refresh Token 由后端写入 HttpOnly Cookie，前端不可读；
- Cookie 操作（刷新、退出）通过可读 CSRF Cookie 构造 `X-CSRF-Token`；
- 并发刷新使用单飞 Promise，并在可用时通过 `navigator.locks` 协调多标签页；
- 网络失败保留登录状态并提供重试，不把网络错误当作未登录；
- 启动时清理旧版 `molscience-access-token` / `molscience-current-user` 存储；
- 登录后的 `next` 只接受同源站内路径，拒绝外部跳转；
- 页面按错误码分支，不依赖后端文案；后端授权仍是唯一安全边界。

认证状态由 `src/features/auth/AuthProvider.tsx` 提供，账户页面位于
`src/pages/account/`，注册、验证与密码恢复仍保留在 `src/AuthViews.tsx`。

## 构建与检查

```bash
npm run build
```

`npm run build` 会先执行 TypeScript 检查，再由 Vite 打包。构建通过不能代替浏览器
联调；关键页面还需在桌面、390px 移动端、中英文和深浅主题下检查。

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
| `npm run dev` | `development` | `.env.local` 中的 `http://localhost:8000` | 本地联调 |
| `npm run build` | `production` | `.env.production` 中的 `https://api.molscience.org` | 本机、GitHub 和 Cloudflare 的生产构建 |
| `npm run build -- --mode development` | `development` | `.env.local` 中的 `http://localhost:8000` | 在本机构建连接本地后端的版本 |

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
