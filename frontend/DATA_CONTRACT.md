# MolScience 前端数据契约

> 状态：Phase 1.0 当前接口基线
> 更新：2026-08-11

## 1. 数据链路

```text
PostgreSQL / Supabase
  → SQLAlchemy 模型与查询
  → FastAPI JSON 接口
  → frontend/src/api.ts 映射
  → 页面领域模型与组件
```

前端不得直接连接 SQL、持有数据库密码或根据数据库表结构拼接查询。浏览器只访问
`VITE_API_BASE_URL` 指向的 FastAPI 服务。

本地默认地址为 `http://127.0.0.1:8000`。生产环境必须显式配置 API 地址，不能依赖
本地默认值。

## 2. 当前分子接口

### `GET /molecules`

用途：搜索、分页和获取最近入库的分子身份记录。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `q` | string | 检索公开编号、名称、分子式、SMILES、InChI、InChIKey、CAS |
| `record_status` | `ACTIVE \| DEPRECATED` | 记录生命周期筛选 |
| `standardization_status` | `PENDING \| STANDARDIZED \| FAILED` | 结构标准化状态 |
| `sort` | `id \| created_at_desc \| created_at_asc \| name` | 排序方式 |
| `offset` | integer | 从 0 开始的偏移量 |
| `limit` | integer | 1–100 |

默认接口不返回逻辑删除的记录。正式搜索页默认请求 `ACTIVE`，详情页允许通过稳定 UUID
访问仍可公开查阅的 `DEPRECATED` 记录并显示明确提示。

### `GET /molecules/{molecule_id}`

`molecule_id` 是数据库 UUID，不是公开的 `molscience_id`。页面路由和 API 请求必须明确
区分这两个标识符。

## 3. 当前分子响应

身份字段：

- `id`：内部 UUID；
- `molscience_id`：公开稳定编号；
- `compound_name`、`iupac_name`；
- `molecular_formula`、`molecular_weight`；
- `smiles_original`、`smiles_canonical`、`smiles_isomeric`；
- `inchi`、`inchi_key`、`cas_number`、`pubchem_cid`；
- `description`。

状态与审计字段：

- `standardization_status`、`standardization_version`；
- `record_status`；
- `created_at`、`updated_at`、`deleted_at`；
- `created_by_id`。

前端不得丢弃状态字段后把记录统一标记为“已审核”或“已标准化”。缺少值时显示明确的
空状态，不使用示例值填充正式记录。

## 4. 状态呈现规则

| 后端状态 | 前端行为 |
| --- | --- |
| `ACTIVE` | 允许进入默认搜索结果 |
| `DEPRECATED` | 详情页显示历史记录警告，不作为默认搜索结果 |
| `DELETED` | 后端不返回；前端按不存在处理 |
| `STANDARDIZED` | 可以显示标准化版本；不等同于实验数据已审核 |
| `PENDING` | 显示“待标准化”，不得暗示结构已经验证 |
| `FAILED` | 显示警告，标识符和结构图需要谨慎使用 |

HTTP 状态：

- `404`：展示不存在页面；
- 其他非 2xx：展示可重试错误，不暴露内部端口、堆栈或数据库信息；
- 请求中止：不显示错误；
- 网络恢复后：用户可以重新加载，后续可增加自动后台刷新。

## 5. 尚未接入的科学数据

当前接口只提供分子身份与记录状态。以下内容不得由前端静态数据冒充正式 SQL 数据：

- 实验性质和原始测量记录；
- 推荐实验值及推荐依据；
- 谱图和结构化峰表；
- GHS 与地区化安全记录；
- 文献、DOI、数据集版本和记录级来源；
- 来源冲突、审核状态与贡献者记录。

在对应接口接入前，相关页面显示“暂无数据”或“接口尚未接入”，筛选器保持隐藏或禁用。

## 6. 后续来源模型

记录级来源至少需要：

```ts
type Provenance = {
  sourceName: string;
  citation?: string;
  doi?: string;
  permanentUrl?: string;
  datasetVersion?: string;
  retrievedAt: string;
  reviewStatus: "reviewed" | "pending" | "conflict";
};
```

每条实验记录直接引用来源。页面底部的来源汇总不能替代记录级关联。

## 7. 静态数据边界

`src/data.ts` 中的历史示例分子只用于开发和信息架构参考。生产请求不得自动回退到这批
数据，否则后端故障会被伪装成真实查询结果。后续应移动到显式的 `fixtures/` 测试目录。
