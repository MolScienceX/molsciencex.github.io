import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Lang, Molecule, Property, detectType, structureImage } from "./data";
import { getMolecule, getMolecules } from "./api";
import { AboutHub, PortalHome } from "./PortalViews";
import { DataRequestState } from "./components/DataRequestState";

const words = {
 zh: { database:"分子数据库",about:"平台介绍",docs:"文档",placeholder:"搜索名称、CAS、分子式、SMILES、InChI…",search:"搜索",hero:"探索分子与实验性质",lead:"从一个入口检索分子标识符、实验物性、谱学信息、安全属性与数据来源。",support:"支持名称、别名、CAS、分子式、SMILES、InChI 和 InChIKey",try:"试试这些示例",experience:"围绕科研工作流组织数据",experienceText:"第一阶段专注做好检索、结果、详情和来源之间的完整闭环。",one:"统一检索入口",oneText:"自动理解常见分子标识符，并优先返回可靠的精确匹配。",experiment:"实验值优先",experimentText:"推荐值只从实验记录中产生，同时保留全部数值和实验条件。",trace:"来源可追溯",traceText:"每个推荐值都连接其数据来源，并为后续文献级溯源预留结构。",result:"检索结果",identified:"系统将该输入识别为",count:"条结果",demo:"结果由 MolScience 后端从数据库检索；当前接口提供分子身份与标准化状态。",category:"数据类别",all:"全部",numeric:"数值物性",spectra:"谱学数据",safety:"安全属性",match:"标识符或名称匹配",sourceCount:"个数据来源",detail:"查看详情",none:"未找到匹配的分子",noneText:"请检查输入格式，或尝试使用名称、CAS、分子式及其他标准标识符。",overview:"分子概览",identifiers:"分子标识符",properties:"数值物性",spectroscopy:"谱学物性",safetyInfo:"安全属性",sources:"来源及其他信息",recommended:"平台推荐实验值",allValues:"查看全部",records:"条记录",copy:"复制",copied:"已复制",available:"有可用数据",sourceNote:"第一版展示数据库级来源；文献 DOI、实验数据表及贡献者等精细溯源将在后续版本扩展。",value:"数值",condition:"实验条件",type:"数据类型",method:"方法",quality:"质量",experimental:"实验值",close:"关闭",danger:"危险",notFound:"没有找到该分子",back:"返回数据库首页",aboutHero:"让分子数据更易检索、更可信，也更适合科研计算。",aboutLead:"MolScience 正在建设自主可控、标准化和可扩展的分子数据基础设施。",mission:"我们从数据可信度开始",missionText:"面对分散、重复且条件不完整的多源数据，我们优先解决标识符规范化、实验记录聚合、推荐值选择和来源追踪问题。",phase1:"完成“检索—结果—详情—来源”闭环，支持七类常用分子查询方式。",score:"综合评分推荐",scoreText:"第一版只比较实验值，综合来源、条件完整度、审核状态和记录一致性选出推荐值。",phase2:"扩展子结构与相似性搜索、交互谱图、文献级溯源，并逐步接入性质预测、热力学模块和 AI 问答。" },
 en: { database:"Database",about:"About",docs:"Docs",placeholder:"Search names, CAS, formula, SMILES, InChI…",search:"Search",hero:"Explore molecules and experimental properties",lead:"Search molecular identifiers, experimental properties, spectra, safety attributes and data sources from one place.",support:"Names, aliases, CAS, formula, SMILES, InChI and InChIKey supported",try:"Try an example",experience:"Data organized around research workflows",experienceText:"Phase one focuses on a complete path from search to results, details and provenance.",one:"One search entry",oneText:"Recognizes common molecular identifiers and prioritizes reliable exact matches.",experiment:"Experimental first",experimentText:"Recommended values come from experiments while all values and conditions remain accessible.",trace:"Traceable sources",traceText:"Every recommended value connects to a source, with room for literature-level provenance.",result:"Search results",identified:"Input identified as",count:"results",demo:"Results are queried from the database by the MolScience backend; the current API exposes molecular identity and standardization status.",category:"Data categories",all:"All",numeric:"Numeric properties",spectra:"Spectroscopy",safety:"Safety",match:"Identifier or name match",sourceCount:"data sources",detail:"View details",none:"No matching molecule found",noneText:"Check the input or try a name, CAS number, formula, or another standard identifier.",overview:"Overview",identifiers:"Identifiers",properties:"Numeric properties",spectroscopy:"Spectroscopy",safetyInfo:"Safety",sources:"Sources and other information",recommended:"Recommended experimental value",allValues:"View all",records:"records",copy:"Copy",copied:"Copied",available:"Data available",sourceNote:"Phase one shows database-level sources. DOI, experimental tables and contributor provenance will follow.",value:"Value",condition:"Condition",type:"Data type",method:"Method",quality:"Quality",experimental:"Experimental",close:"Close",danger:"Danger",notFound:"Molecule not found",back:"Back to database",aboutHero:"Molecular data that is easier to find, trust and compute with.",aboutLead:"MolScience is building sovereign, standardized and extensible infrastructure for molecular data.",mission:"Trust starts with the data",missionText:"Across fragmented and duplicated sources, we first solve identifier normalization, experimental record aggregation, value recommendation and provenance.",phase1:"Complete the search—results—details—sources loop across seven common query formats.",score:"Composite scoring",scoreText:"The first release compares experimental values only, considering source quality, condition completeness, review status and agreement.",phase2:"Add substructure and similarity search, interactive spectra and literature-level provenance, followed by prediction, thermodynamics and AI Q&A." }
};
type Text = typeof words.zh;
type Theme = "light" | "dark";

function getInitialTheme():Theme{
 const saved=localStorage.getItem("molscience-theme");
 if(saved==="light"||saved==="dark")return saved;
 return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
}

export default function App(){
 const [lang,setLang]=useState<Lang>(()=>localStorage.getItem("molscience-language")==="en"?"en":"zh");
 const [theme,setTheme]=useState<Theme>(getInitialTheme);
 useEffect(()=>{localStorage.setItem("molscience-language",lang);document.documentElement.lang=lang==="zh"?"zh-CN":"en"},[lang]);
 useEffect(()=>{localStorage.setItem("molscience-theme",theme);document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme},[theme]);
 const t=words[lang];
 return <div className="app"><Header lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} t={t}/><Routes><Route path="/" element={<Home lang={lang} t={t}/>}/><Route path="/about" element={<About lang={lang}/>}/><Route path="/search" element={<Results lang={lang} t={t}/>}/><Route path="/molecule/:id/:key?" element={<Detail lang={lang} t={t}/>}/><Route path="*" element={<Missing t={t}/>}/></Routes><Footer lang={lang}/></div>
}

function Header({lang,setLang,theme,setTheme,t}:{lang:Lang;setLang:(l:Lang)=>void;theme:Theme;setTheme:(theme:Theme)=>void;t:Text}){
 const path=useLocation().pathname;
 const themeLabel=lang==="zh"?(theme==="light"?"切换到夜间模式":"切换到日间模式"):(theme==="light"?"Switch to dark mode":"Switch to light mode");
 return <header><div className="container nav"><Link className="brand" to="/"><img src="https://s.guyue.me/img/icon_molscience.png" alt=""/><b>MolScience</b></Link>{path!=="/"&&path!=="/about"&&<SearchBox t={t} compact/>}<nav><NavLink to="/" end>{t.database}</NavLink><NavLink to="/about">{t.about}</NavLink><a href="https://docs.molscience.org" target="_blank" rel="noreferrer">{t.docs}</a></nav><button className="themeToggle" onClick={()=>setTheme(theme==="light"?"dark":"light")} aria-label={themeLabel} title={themeLabel}><span aria-hidden="true">{theme==="light"?"☾":"☀"}</span></button><div className="language"><button className={lang==="zh"?"on":""} onClick={()=>setLang("zh")}>中</button><span>/</span><button className={lang==="en"?"on":""} onClick={()=>setLang("en")}>EN</button></div></div></header>
}
function SearchBox({t,compact=false}:{t:Text;compact?:boolean}){const nav=useNavigate();const [q,setQ]=useState("");const go=(e:FormEvent)=>{e.preventDefault();const value=q.trim();if(!value)return;nav(`/search?q=${encodeURIComponent(value)}`)};return <form className={`searchbox ${compact?"compact":""}`} onSubmit={go}><i/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={t.placeholder} aria-label={t.placeholder}/><button aria-label={t.search}>{compact?"→":t.search}</button></form>}

function Home({lang}:{lang:Lang;t:Text}){return <PortalHome lang={lang}/>}

function About({lang}:{lang:Lang}){return <AboutHub lang={lang}/>}

function Results({lang,t}:{lang:Lang;t:Text}){
 const [params]=useSearchParams();const batch=params.get("batch")==="1";const q=params.get("q")||"";const [sort,setSort]=useState<"id"|"created_at_desc"|"name">("id");
 const [available,setAvailable]=useState<Molecule[]>([]);const [apiState,setApiState]=useState<"loading"|"ready"|"error">("loading");
 const [reload,setReload]=useState(0);
 useEffect(()=>{const controller=new AbortController();setApiState("loading");getMolecules(controller.signal,{query:batch?undefined:q,recordStatus:"ACTIVE",sort,limit:100}).then(rows=>{setAvailable(rows);setApiState("ready")}).catch(error=>{if(error.name!=="AbortError")setApiState("error")});return()=>controller.abort()},[batch,q,reload,sort]);
 const shown=useMemo(()=>{if(!batch)return available;const ids=JSON.parse(sessionStorage.getItem("molscience-batch-ids")||"[]") as string[];return available.filter(m=>ids.some(id=>[m.id,m.cas,m.inchikey,String(m.cid)].includes(id)))},[available,batch]);
 const title=batch?(lang==="zh"?"批量 ID 检索":"Batch ID search"):`“${q}”`;const type=batch?(lang==="zh"?"ID 文件":"ID file"):detectType(q,lang);
 if(apiState==="loading")return <DataRequestState lang={lang} kind="loading" subject="results"/>;
 if(apiState==="error")return <DataRequestState lang={lang} kind="error" subject="results" onRetry={()=>setReload(value=>value+1)}/>;
 return <main className="results container"><div className="resultsTitle"><div><p className="eyebrow">{t.result}</p><h1>{title}</h1><p className="queryRecognition">{t.identified} <b>{type}</b> · {shown.length} {t.count}</p></div><label className="resultSort"><span>{lang==="zh"?"排序":"Sort"}</span><select value={sort} onChange={e=>setSort(e.target.value as "id"|"created_at_desc"|"name")}><option value="id">{lang==="zh"?"默认顺序":"Default"}</option><option value="created_at_desc">{lang==="zh"?"最近入库":"Recently added"}</option><option value="name">{lang==="zh"?"分子名称":"Molecule name"}</option></select></label></div><div className="notice"><b>i</b>{t.demo}</div><div className="resultsGrid"><aside className="filters"><div className="filterHeading"><h2>{lang==="zh"?"当前数据范围":"Current data scope"}</h2></div><div className="filterGroup"><h3>{lang==="zh"?"分子状态":"Molecule status"}</h3><p>{lang==="zh"?"仅显示有效记录。实验物性、谱学、安全和来源筛选将在相应数据接口接入后启用。":"Only active records are shown. Property, spectra, safety, and source filters will be enabled when those APIs are available."}</p></div></aside><section className="list">{shown.length?shown.map(m=><ResultCard key={m.id} m={m} lang={lang} t={t} query={q}/>):<div className="empty"><Atom/><h2>{t.none}</h2><p>{t.noneText}</p></div>}</section></div></main>
}
function ResultCard({m,lang,t,query}:{m:Molecule;lang:Lang;t:Text;query:string}){
 const value=query.trim().toLowerCase();
 const reason=m.cas&&m.cas.toLowerCase()===value?"CAS":m.inchikey&&m.inchikey.toLowerCase()===value?"InChIKey":m.formula&&m.formula.toLowerCase()===value?(lang==="zh"?"分子式":"Formula"):(lang==="zh"?"名称或标识符":"Name or identifier");
 const routeId=m.uuid||m.id;const image=structureImage(m);
 const coverage=[
  m.properties.length?`${m.properties.length} ${lang==="zh"?"项实验物性":"experimental properties"}`:"",
  m.spectra.length?`${m.spectra.length} ${lang==="zh"?"项谱学记录":"spectral records"}`:"",
  m.sources.length?`${m.sources.length} ${t.sourceCount}`:""
 ].filter(Boolean);
 const fields=[
  {label:"MolScience ID",value:m.id},
  {label:"Formula",value:m.formula},
  {label:"Relative molecular mass",value:m.mass?`${m.mass} g/mol`:"—"},
  {label:"CAS RN",value:m.cas},
  {label:"IUPAC name",value:m.iupac,wide:true},
  {label:"Canonical SMILES",value:m.smiles},
  {label:"InChIKey",value:m.inchikey,wide:true}
 ];
 return <article className="resultCard"><Link className="resultStructure" to={`/molecule/${routeId}`}>{image?<img src={image} alt={`${m.name[lang]} 2D structure`}/>:<Atom/>}</Link><div><div className="resultName"><span><Link to={`/molecule/${routeId}`}><h2>{m.name[lang]}</h2></Link><small>{[m.name.en,m.iupac].filter(Boolean).join(" · ")}</small><p className="resultAliases">{m.aliases.slice(0,4).join(" · ")}</p></span><em>{reason} {lang==="zh"?"匹配":"match"}</em></div><div className="resultIdentityGrid">{fields.map(x=><span className={x.wide?"wide":""} key={x.label}><small>{x.label}</small><code title={x.value||"—"}>{x.value||"—"}</code></span>)}</div><footer><div className="coverage">{coverage.length?coverage.map(item=><span key={item}>{item}</span>):<span className="coverageEmpty">{lang==="zh"?"基础身份数据已入库":"Identity data available"}</span>}</div><Link className="link" to={`/molecule/${routeId}`}>{t.detail} →</Link></footer></div></article>
}

function Detail({lang,t}:{lang:Lang;t:Text}){
 const {id}=useParams();
 const [m,setM]=useState<Molecule|null>(null);const [apiState,setApiState]=useState<"loading"|"ready"|"not-found"|"error">("loading");
 const [reload,setReload]=useState(0);
 useEffect(()=>{if(!id){setApiState("not-found");return}const controller=new AbortController();setApiState("loading");getMolecule(id,controller.signal).then(row=>{setM(row);setApiState("ready")}).catch(error=>{if(error.name!=="AbortError")setApiState(error.message==="not-found"?"not-found":"error")});return()=>controller.abort()},[id,reload]);
 const [expanded,setExpanded]=useState<string[]>([]);
 const [activeSection,setActiveSection]=useState("overview");
 const sectionIds=["overview","identifiers","properties","spectra","safety","sources"];
 useEffect(()=>{
  if(!m)return;
  const updateActive=()=>{
   const marker=window.scrollY+150;
   let current=sectionIds[0];
   for(const sectionId of sectionIds){
    const element=document.getElementById(sectionId);
    if(element&&element.getBoundingClientRect().top+window.scrollY<=marker)current=sectionId;
   }
   setActiveSection(current);
  };
  updateActive();
  window.addEventListener("scroll",updateActive,{passive:true});
  return()=>window.removeEventListener("scroll",updateActive);
 },[m?.id]);
 if(apiState==="loading")return <DataRequestState lang={lang} kind="loading" subject="detail"/>;
 if(apiState==="error")return <DataRequestState lang={lang} kind="error" subject="detail" onRetry={()=>setReload(value=>value+1)}/>;
 if(apiState==="not-found"||!m)return <Missing t={t}/>;
 const sections=[["overview",t.overview],["identifiers",t.identifiers],["properties",t.properties],["spectra",t.spectroscopy],["safety",t.safetyInfo],["sources",t.sources]];
 const toggle=(k:string)=>setExpanded(v=>v.includes(k)?v.filter(x=>x!==k):[...v,k]);
 const image=structureImage(m,"large");const empty=lang==="zh"?"暂无数据":"No data available";
 const statusNotice=m.recordStatus==="DEPRECATED"?(lang==="zh"?"该记录已废弃，仅供历史查阅。":"This record is deprecated and retained for historical reference."):m.standardizationStatus==="FAILED"?(lang==="zh"?"结构标准化失败，请谨慎使用标识符。":"Structure standardization failed; use identifiers with caution."):m.standardizationStatus==="PENDING"?(lang==="zh"?"该记录正在等待结构标准化。":"This record is awaiting structure standardization."):null;
 return <main><section className="molHero"><div className="container molHeroGrid">{image?<a className="structure" href={image} target="_blank" rel="noreferrer"><img src={image} alt={`${m.name[lang]} 2D bond-line structure`}/><small>{lang==="zh"?"二维键线式 · 点击放大":"2D bond-line structure · Open large"}</small></a>:<div className="structure"><Atom/><small>{lang==="zh"?"暂无二维结构图":"No 2D structure image"}</small></div>}<div><p className="eyebrow">MolScience ID / {m.id}</p><h1>{m.name[lang]}</h1>{statusNotice&&<p className={`recordStatusNotice recordStatusNotice--${m.recordStatus==="DEPRECATED"||m.standardizationStatus==="FAILED"?"warning":"pending"}`}>{statusNotice}</p>}<p className="muted">{[m.name.en,m.iupac].filter(Boolean).join(" · ")}</p><p>{m.description[lang]||empty}</p><div className="identity"><span><small>Formula</small><code>{m.formula||"—"}</code></span><span><small>{lang==="zh"?"相对分子质量":"Relative molecular mass"}</small><code>{m.mass?`${m.mass} g/mol`:"—"}</code></span><span><small>CAS RN</small><code>{m.cas||"—"}</code></span><span><small>InChIKey</small><code>{m.inchikey||"—"}</code></span></div></div></div></section><div className="container detailGrid"><aside className="sideNav">{sections.map(([sectionId,label])=><a className={activeSection===sectionId?"active":""} href={`#${sectionId}`} onClick={()=>setActiveSection(sectionId)} key={sectionId}>{label}</a>)}</aside><div className="detailBody"><Section id="overview" n="01" title={t.overview}>{m.aliases.length?<div className="aliases"><small>Aliases</small><div className="plainAliasList">{m.aliases.map(x=><span key={x}>{x}</span>)}</div></div>:<p>{empty}</p>}</Section><Section id="identifiers" n="02" title={t.identifiers}><div className="idTable">{[["MolScience ID",m.id],["Canonical SMILES",m.smiles],["InChI",m.inchi],["InChIKey",m.inchikey]].filter(([,v])=>v).map(([label,v])=><IdRow key={label} label={label} value={v} t={t}/>)}</div></Section><Section id="properties" n="03" title={t.properties}>{m.properties.length?<div className="propertyList">{m.properties.map(p=><article className={`propertyRow ${expanded.includes(p.key)?"isExpanded":""}`} key={p.key}><div className="propertySummary"><div><span>{p.label[lang]}</span><small>{t.recommended}</small><small className="dataKind">{t.experimental}</small></div><strong>{p.value}</strong><p>{p.condition}</p><button onClick={()=>toggle(p.key)} aria-expanded={expanded.includes(p.key)}>{expanded.includes(p.key)?(lang==="zh"?"收起记录":"Hide records"):`${t.allValues} ${p.records.length} ${t.records}`} <b>{expanded.includes(p.key)?"↑":"↓"}</b></button></div>{expanded.includes(p.key)&&<PropertyRecords property={p} lang={lang} t={t}/>}</article>)}</div>:<p>{empty}</p>}</Section><Section id="spectra" n="04" title={t.spectroscopy}>{m.spectra.length?<div className="spectra">{m.spectra.map(x=><article key={x}><SpectrumSlot lang={lang}/><div><h3>{x}</h3></div><b>→</b></article>)}</div>:<p>{empty}</p>}</Section><Section id="safety" n="05" title={t.safetyInfo}><div className={`safety ${m.safety.level}`}><strong><span>!</span>{m.safety.label[lang]}</strong></div></Section><Section id="sources" n="06" title={t.sources}>{m.sources.length?<div className="sourceList">{m.sources.map((x,i)=><article key={x}><span>0{i+1}</span><b>{x}</b><small>Database source</small></article>)}</div>:<p>{empty}</p>}</Section></div></div></main>;
}
function Section({id,n,title,children}:{id:string;n:string;title:string;children:ReactNode}){return <section className="detailSection" id={id}><div className="sectionTitle"><span>{n}</span><h2>{title}</h2></div>{children}</section>}
function IdRow({label,value,t}:{label:string;value:string;t:Text}){const [done,setDone]=useState(false);const copy=async()=>{await navigator.clipboard.writeText(value);setDone(true);setTimeout(()=>setDone(false),1000)};return <div><span>{label}</span><code>{value}</code><button onClick={copy}>{done?t.copied:t.copy}</button></div>}
function PropertyRecords({property,lang,t}:{property:Property;lang:Lang;t:Text}){return <div className="inlineRecords"><div className="recordHeader">{[t.value,t.condition,t.type,t.method,t.sources,t.quality].map(x=><b key={x}>{x}</b>)}</div>{property.records.map((r,i)=><div className={r.quality==="recommended"?"recommended":""} key={`${r.value}-${i}`}><strong>{r.value}</strong><span>{r.condition}</span><span>{t.experimental}</span><span>{r.method||"—"}</span><span>{r.source}</span><em>{r.quality==="recommended"?t.recommended:(lang==="zh"?(r.quality==="high"?"高":"标准"):r.quality)}</em></div>)}<p>{t.sourceNote}</p></div>}
function SpectrumSlot({lang}:{lang:Lang}){return <div className="spectrumSlot"><div className="spectrumAxis"/><small>{lang==="zh"?"接入标准化谱图数据后在此绘制":"Interactive spectrum will render here"}</small></div>}
function Atom(){return <div className="atom"><i/></div>}
function Missing({t}:{t:Text}){return <main className="missing"><Atom/><h1>{t.notFound}</h1><Link to="/">{t.back}</Link></main>}
function Footer({lang}:{lang:Lang}){return <footer className="siteFooter"><div className="container"><div className="brand"><img src="https://s.guyue.me/img/icon_molscience.png" alt=""/><b>MolScience</b></div><p>{lang==="zh"?"开放、可信的分子数据基础设施。":"Open and trusted molecular data infrastructure."}</p><small>© 2026 MolScience Team</small></div></footer>}
