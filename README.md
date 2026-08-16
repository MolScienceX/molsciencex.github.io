# MolScience 官网

> 面向人工智能时代的化学分子数据库构建与智能化应用

本仓库存放 [MolScience](https://molsciencex.github.io/) 项目官网的前端代码与部署配置。MolScience 是由中国人民大学化学与生命资源学院本科生团队发起的科研项目，致力于构建一个**标准化、可扩展、智能化**的化学分子数据库基础设施。

## 项目简介

MolScience 以人工智能时代科学研究范式转变为背景，围绕"**数据—模型—应用**"三位一体展开，目标是推动分子数据库从传统"数据存储工具"向"智能知识引擎"升级。

核心目标包括：

- 构建自主可控的分子数据库体系
- 实现分子数据的标准化与高效检索
- 打造数据驱动的分子性质预测与设计能力
- 建立自然语言驱动的智能化交互范式

该项目已完成初步平台开发，拥有 1.2 亿分子数据基础与 4 万+ 行代码实现，并正在持续推进系统化建设。

> 更多项目背景与技术细节请参阅 [MolScience 项目白皮书](./MolScience_introduction.md)。

## 技术架构

| 层级 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| 前端框架 | React + Vite + TypeScript | 位于 [`frontend/`](./frontend) 目录 |
| 部署平台 | Cloudflare Workers | 通过 `wrangler.jsonc` 配置 |
| 后端服务 | FastAPI | 独立仓库 [MolScienceX/molscience-database](https://github.com/MolScienceX/molscience-database) |
| 持续集成 | GitHub Actions | Pull Request 自动构建检查 |

前后端通过 HTTP API 连接，前端默认通过 `VITE_API_BASE_URL` 环境变量指定后端地址。

## 目录结构

```
.
├── .github/workflows/    # GitHub Actions  CI 配置
├── frontend/             # 前端源码（React + Vite）
│   ├── src/              # 应用源代码
│   ├── assets/           # 静态资源（字体等）
│   ├── .env.example      # 环境变量示例
│   ├── .env.production   # 生产环境配置
│   ├── DESIGN.md         # 前端设计文档
│   └── README.md         # 前端开发说明
├── .gitignore
├── DEPLOYMENT.md         # 部署文档
├── MolScience_introduction.md  # 项目白皮书
└── wrangler.jsonc        # Cloudflare Workers 部署配置
```

## 本地开发

### 前置要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
cd frontend
npm ci
```

### 配置环境变量

复制示例配置并按需修改：

```bash
cp .env.example .env.local
```

默认配置连接本地 FastAPI 后端：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 启动开发服务器

```bash
npm run dev -- --port 5173 --strictPort
```

浏览器访问 `http://localhost:5173`。后端 `CORS_ORIGINS` 需要包含该完整 origin。

> 前端开发的完整说明（环境变量边界、配置文件选取逻辑等）请参阅 [`frontend/README.md`](./frontend/README.md)。

## 部署

本项目通过 **Cloudflare Workers Builds** 实现自动部署：`main` 分支更新时自动拉取代码、执行构建并发布。GitHub Actions 与其相互独立——Pull Request 只执行构建检查，`main` 更新时部署 GitHub Pages。

Cloudflare 构建配置：

- **Production branch**: `main`
- **Root directory**: `/`
- **Build command**: `npm ci --prefix frontend && npm run build --prefix frontend`
- **Deploy command**: `npx wrangler deploy --config wrangler.jsonc`

生产 API 地址由 `frontend/.env.production` 统一指定（`https://api.molscience.org`），GitHub Actions 和 Cloudflare 执行 Vite 生产构建时都会自动读取该文件。

> 完整部署流程与注意事项请参阅 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 相关仓库

| 仓库 | 说明 |
| :--- | :--- |
| [MolScienceX/molscience-database](https://github.com/MolScienceX/molscience-database) | 后端服务（FastAPI）与分子数据库 |
| [MolScienceX/molscience-docs](https://github.com/MolScienceX/molscience-docs) | 平台开放文档（VitePress） |
| [MolScienceX/.github](https://github.com/MolScienceX/.github) | 组织公开资料 |

## 文档

- [项目白皮书](./MolScience_introduction.md) — 项目背景、目标与技术路线
- [部署文档](./DEPLOYMENT.md) — Cloudflare 部署配置与本地验证
- [前端开发说明](./frontend/README.md) — 本地开发、环境变量与构建配置
- [前端设计文档](./frontend/DESIGN.md) — 前端架构与设计规范
- [在线文档](https://docs.molscience.org) — MolScience 平台使用手册

## 团队

MolScience 是中国人民大学 ChemAI 团队旗下项目。

- 官网：<https://molscience.org/>
- 文档：<https://docs.molscience.org/>
- 邮箱：<team@molscience.org>

## 许可证

本项目为科研开源项目，具体许可证信息请参阅仓库内的 LICENSE 文件（如有）。
