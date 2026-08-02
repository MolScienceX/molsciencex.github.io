import { Lang } from "./data";

type Localized = Record<Lang, string>;

export type AboutContent = {
  title: string;
  lead: string;
  platform: string;
  architectureIntro: string;
  pipelineIntro: string;
  team: string;
  guide: string;
  contribute: string;
  contact: string;
  mail: string;
  docs: string;
  nav: string[];
  challenges: { title: string; text: string }[];
  architecture: { code: string; title: string; text: string; output: string }[];
  pipeline: { title: string; text: string }[];
  principles: { title: string; text: string }[];
};

const localized = (zh: string, en: string): Localized => ({ zh, en });

const copy = {
  title: localized("连接分子、实验数据与可信来源", "Connecting molecules, experiments and trusted sources"),
  lead: localized(
    "MolScience 面向人工智能时代建设自主可控、标准化、可扩展的分子数据基础设施，让数据能够被检索、核验，也能够被模型可靠调用。",
    "MolScience is building sovereign, standardized and extensible molecular data infrastructure for the AI era—data that can be searched, verified and reliably used by models."
  ),
  platform: localized(
    "分子数据散落在数据库、文献与实验记录中：同一分子存在多套名称和标识符，同一性质也可能对应不同条件下的实验值。MolScience 不只存储结果，还统一标识、保留条件、比较记录并连接原始来源。",
    "Molecular data is scattered across databases, literature and laboratory records. A molecule may have many names and identifiers, while a property may have multiple values under different conditions. MolScience unifies identifiers, preserves conditions, compares records and connects every result to its source."
  ),
  architectureIntro: localized(
    "单一数据库无法同时做好精确属性查询、化学关系分析与语义检索。平台以关系型、图和向量数据库协同工作，为检索、建模与分子设计提供同一套可信数据底座。",
    "No single database is ideal for exact property queries, chemical relationship analysis and semantic retrieval. Relational, graph and vector stores work together as one trusted foundation for search, modeling and molecular design."
  ),
  pipelineIntro: localized(
    "从多源数据进入平台开始，每一步都产生可检查的中间结果；最终交付给用户与模型的不是孤立数值，而是带有标识、条件、质量和来源的数据对象。",
    "Every stage produces an inspectable result from ingestion onward. What reaches researchers and models is not an isolated value, but a data object with identity, conditions, quality and provenance."
  ),
  team: localized(
    "MolScience 由分子科学、数据治理和软件工程方向的成员共同建设。核心成员的姓名、职责与所属机构将在正式发布前由团队统一补充。",
    "MolScience is built by contributors working across molecular science, data governance and software engineering. Names, roles and affiliations of the core team will be added before the public release."
  ),
  guide: localized(
    "从名称、别名、CAS、分子式、SMILES、InChI 或 InChIKey 开始检索；也可以绘制结构执行精确检索，或上传 ID 文件批量查找。结果页解释命中方式，详情页展示推荐实验值、完整记录、条件和来源。",
    "Search by name, alias, CAS, formula, SMILES, InChI or InChIKey. You can draw a structure for exact matching or upload an ID file for batch lookup. Results explain the match; detail pages expose recommended values, complete records, conditions and sources."
  ),
  contribute: localized(
    "MolScience 接受分子记录、实验物性、谱学数据、来源、代码、文档和问题反馈。所有数据提交都经过格式检查、来源核验和科研审核。",
    "MolScience welcomes molecular records, experimental properties, spectra, sources, code, documentation and issue reports. Data submissions pass format checks, source verification and scientific review."
  ),
  contact: localized(
    "用于研究合作、数据贡献与问题反馈的正式邮箱、GitHub 和所属机构信息将在发布前补充。",
    "Official email, GitHub and institutional details for research collaboration, data contributions and feedback will be added before release."
  ),
  mail: localized("项目邮箱", "Project email"),
  docs: localized("GitHub", "GitHub"),
};

export function getAboutContent(lang: Lang): AboutContent {
  const zh = lang === "zh";
  return {
    title: copy.title[lang],
    lead: copy.lead[lang],
    platform: copy.platform[lang],
    architectureIntro: copy.architectureIntro[lang],
    pipelineIntro: copy.pipelineIntro[lang],
    team: copy.team[lang],
    guide: copy.guide[lang],
    contribute: copy.contribute[lang],
    contact: copy.contact[lang],
    mail: copy.mail[lang],
    docs: copy.docs[lang],
    nav: zh
      ? ["平台缘起", "技术架构", "数据方法", "核心团队", "使用指南", "参与贡献"]
      : ["Why MolScience", "Architecture", "Data method", "Core team", "User guide", "Contributing"],
    challenges: zh
      ? [
          { title: "架构单一", text: "传统关系查询难以直接表达反应网络、结构邻域和语义关系。" },
          { title: "标准不一", text: "名称、标识符、单位与实验条件不统一，使记录难以可靠比较。" },
          { title: "智能化缺失", text: "数据与模型彼此割裂，检索结果难以直接进入预测和设计流程。" },
        ]
      : [
          { title: "Siloed architecture", text: "Conventional relational queries cannot directly express reaction networks, structural neighborhoods and semantic relationships." },
          { title: "Inconsistent standards", text: "Names, identifiers, units and experimental conditions vary, making records difficult to compare reliably." },
          { title: "Disconnected intelligence", text: "Data and models remain separated, so search results cannot flow directly into prediction and design." },
        ],
    architecture: zh
      ? [
          { code: "SQL", title: "关系型数据库", text: "管理规范化标识符、实验物性、谱学记录和审核状态。", output: "精确查询 · 事务一致性" },
          { code: "GRAPH", title: "图数据库", text: "表达分子、反应、文献、来源与研究对象之间的关系。", output: "关系分析 · 路径发现" },
          { code: "VECTOR", title: "向量数据库", text: "承载结构、文本和多模态表征，用于相似性与语义召回。", output: "相似检索 · 模型应用" },
        ]
      : [
          { code: "SQL", title: "Relational database", text: "Manages normalized identifiers, experimental properties, spectra and review state.", output: "Exact queries · Transactions" },
          { code: "GRAPH", title: "Graph database", text: "Connects molecules, reactions, literature, sources and research entities.", output: "Relationship analysis · Paths" },
          { code: "VECTOR", title: "Vector database", text: "Stores structural, textual and multimodal representations for similarity and semantic recall.", output: "Similarity · Model applications" },
        ],
    pipeline: zh
      ? [
          { title: "数据整合", text: "接入数据库、文献和实验记录" },
          { title: "标准治理", text: "统一标识符、格式、单位与字段" },
          { title: "质量审核", text: "验证来源、条件和记录一致性" },
          { title: "特征构建", text: "生成结构指纹与模型可用表征" },
          { title: "分子建模", text: "支持性质预测、筛选与设计" },
          { title: "智能交互", text: "连接检索、自然语言与科研工作流" },
        ]
      : [
          { title: "Integrate", text: "Ingest databases, literature and laboratory records" },
          { title: "Standardize", text: "Unify identifiers, formats, units and fields" },
          { title: "Review", text: "Verify sources, conditions and record consistency" },
          { title: "Represent", text: "Generate fingerprints and model-ready features" },
          { title: "Model", text: "Enable property prediction, screening and design" },
          { title: "Interact", text: "Connect search, natural language and research workflows" },
        ],
    principles: zh
      ? [
          { title: "统一标识", text: "连接名称、别名、CAS 与结构标识符。" },
          { title: "保留条件", text: "实验值不脱离温度、压力、相态与方法。" },
          { title: "比较记录", text: "推荐值之外保留可比较的完整记录。" },
          { title: "追溯来源", text: "让每条数据回到数据库、文献与贡献记录。" },
        ]
      : [
          { title: "Unify identifiers", text: "Connect names, aliases, CAS and structure identifiers." },
          { title: "Preserve conditions", text: "Keep temperature, pressure, phase and method with values." },
          { title: "Compare records", text: "Preserve comparable records beyond the recommendation." },
          { title: "Trace sources", text: "Link every datum to databases, literature and contributors." },
        ],
  };
}
