# MolScience 前端架构

> 状态：渐进迁移方案
> 更新：2026-08-11

## 1. 选择

MolScience 是包含检索、分子身份、实验记录、谱学、安全和来源追踪的数据型产品，采用
“页面负责组合、业务模块负责规则、共享层负责基础能力”的渐进式 feature-oriented
结构。

当前版本不进行一次性目录重写。只有当代码被实际抽取时才创建目录，不建立空占位结构。

## 2. 目标边界

```text
src/
├── app/          # 路由、主题、语言和全局错误边界
├── pages/        # Home、Search、Molecule、About 的路由级组合
├── features/     # search、batch-search、identity、properties、spectroscopy、provenance
├── components/   # 跨业务复用的状态、布局和基础 UI
├── services/     # HTTP 客户端与共享基础设施
├── styles/       # tokens、base、themes 和共享模式
└── fixtures/     # 明确标记的测试/预览数据，不参与生产回退
```

目录只在相应能力拥有状态、规则、API 映射、多个组件或测试时创建。

## 3. 当前模块职责

- `App.tsx`：当前承担应用壳、路由以及搜索/详情页面；迁移后只保留应用组合。
- `PortalViews.tsx`：当前承担首页、介绍页和多个检索工具；优先按页面拆分。
- `api.ts`：FastAPI 传输模型到前端领域模型的适配器。
- `data.ts`：领域类型、输入识别和历史 fixtures；类型与 fixtures 后续分离。
- `components/DataRequestState.tsx`：跨搜索和详情复用的加载、失败和重试状态。
- `styles.css`：当前包含多轮历史样式覆盖；按令牌、基础、组件和页面逐步拆分。

## 4. 依赖方向

```text
app → pages → features → components/services
                         ↓
                       domain types
```

规则：

- 页面组合业务模块，不实现 SQL/API 映射和复杂业务判断；
- feature 可以使用共享组件和 service；
- 共享组件不得导入具体 feature；
- API 响应映射靠近拥有该数据的 feature 或 service；
- 分子、实验记录和来源类型不能全部堆入全局 `utils`；
- 样式令牌与基础组件保持领域中立，实验记录表属于 properties feature。

## 5. 数据与状态归属

- URL 拥有搜索词、排序、分页和可分享筛选条件；
- Search feature 拥有查询请求、结果状态和批量搜索映射；
- Molecule page 拥有当前分子 UUID 和分区导航；
- Properties、spectroscopy、safety、provenance 各自拥有 API 和局部状态；
- 主题、语言和全局错误边界属于 app；
- 后端数据不得自动回退到 fixtures。

## 6. 迁移顺序

1. 固定 `DATA_CONTRACT.md`，让 SQL、API 和页面状态一致；
2. 抽取共享请求状态组件并补齐重试；
3. 将 SearchPage 与 MoleculePage 从 `App.tsx` 抽离；
4. 将首页与 About 页从 `PortalViews.tsx` 拆开；
5. 按真实接口拆出 properties、spectroscopy、safety、provenance；
6. 将静态数据移动到 fixtures；
7. 整理 CSS 历史覆盖并删除 `--green` 等兼容别名。

每一步都必须保持路由和公开行为稳定，并在完成后运行 TypeScript 构建和关键流程检查。

## 7. 测试边界

- service/API：参数编码、错误分类、响应映射；
- search：名称、CAS、分子式、SMILES、InChI/InChIKey、空结果和网络失败；
- molecule：不存在、待标准化、标准化失败、废弃和部分数据；
- accessibility：键盘焦点、对话框、44px 触控目标和状态播报；
- responsive：1440×900、768×1024、390×844，中英文和深浅主题。
