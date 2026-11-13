import { appendSearchPage, matchLabel, queryTypes, queryTypeLabels, readQueryType, readSearchSort } from "./search";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Lang, Molecule, Property, structureImage } from "./data";
import { getCachedMolecule, getCachedMolecules, isMoleculeAccessDeniedError, isMoleculeMissingError } from "./api";
import { clearMoleculeCache } from "./moleculeCache";
import { AboutHub, PortalHome } from "./PortalViews";
import { DataRequestState } from "./components/DataRequestState";
import { MoleculeCacheStatus } from "./components/MoleculeCacheStatus";
import { ForgotPasswordView, RegisterView, ResetPasswordView, VerifyEmailView } from "./AuthViews";
import { LoginPage } from "./pages/LoginPage";
import { AccountLayout } from "./pages/account/AccountLayout";
import { AccountOverview } from "./pages/account/AccountOverview";
import { ProfilePage } from "./pages/account/ProfilePage";
import { SecurityPage } from "./pages/account/SecurityPage";
import { DeveloperPage } from "./pages/account/DeveloperPage";

const words = {
 zh: { database:"分子数据库",about:"平台介绍",docs:"文档",placeholder:"搜索名称、CAS、分子式、SMILES、InChI…",search:"搜索",hero:"探索分子与性质数据",lead:"从一个入口检索分子标识符、性质记录、谱学信息、安全属性与数据来源。",support:"支持名称、别名、CAS、分子式、SMILES、InChI 和 InChIKey",try:"试试这些示例",experience:"围绕科研工作流组织数据",experienceText:"第一阶段专注做好检索、结果、详情和来源之间的完整闭环。",one:"统一检索入口",oneText:"自动理解常见分子标识符，并优先返回可靠的精确匹配。",experiment:"实验值优先",experimentText:"推荐值只从实验记录中产生，同时保留全部数值和实验条件。",trace:"来源可追溯",traceText:"每个性质记录都连接其数据来源，并为后续文献级溯源预留结构。",result:"检索结果",identified:"系统将该输入识别为",count:"条结果",demo:"结果由 MolScience 后端从数据库检索；分子详情页同步展示已归档的性质及来源状态。",category:"数据类别",all:"全部",numeric:"数值物性",spectra:"谱学数据",safety:"安全属性",match:"标识符或名称匹配",sourceCount:"个数据来源",detail:"查看详情",none:"未找到匹配的分子",noneText:"请检查输入格式，或尝试使用名称、CAS、分子式及其他标准标识符。",overview:"分子概览",identifiers:"分子标识符",properties:"数值物性",spectroscopy:"谱学物性",safetyInfo:"安全属性",sources:"来源及其他信息",recommended:"数据库性质记录",allValues:"查看全部",records:"条记录",copy:"复制",copied:"已复制",available:"有可用数据",sourceNote:"这里如实展示数据库中的原始值、计算方法、数据集来源和审核状态；待审核不等同于已验证。",value:"数值",condition:"值来源",type:"记录类型",method:"方法",quality:"审核状态",experimental:"实验值",close:"关闭",danger:"危险",notFound:"没有找到该分子",back:"返回数据库首页",aboutHero:"让分子数据更易检索、更可信，也更适合科研计算。",aboutLead:"MolScience 正在建设自主可控、标准化和可扩展的分子数据基础设施。",mission:"我们从数据可信度开始",missionText:"面对分散、重复且条件不完整的多源数据，我们优先解决标识符规范化、实验记录聚合、推荐值选择和来源追踪问题。",phase1:"完成“检索—结果—详情—来源”闭环，支持七类常用分子查询方式。",score:"综合评分推荐",scoreText:"第一版只比较实验值，综合来源、条件完整度、审核状态和记录一致性选出推荐值。",phase2:"扩展子结构与相似性搜索、交互谱图、文献级溯源，并逐步接入性质预测、热力学模块和 AI 问答。" },
 en: { database:"Database",about:"About",docs:"Docs",placeholder:"Search names, CAS, formula, SMILES, InChI…",search:"Search",hero:"Explore molecules and property data",lead:"Search molecular identifiers, property records, spectra, safety attributes and data sources from one place.",support:"Names, aliases, CAS, formula, SMILES, InChI and InChIKey supported",try:"Try an example",experience:"Data organized around research workflows",experienceText:"Phase one focuses on a complete path from search to results, details and provenance.",one:"One search entry",oneText:"Recognizes common molecular identifiers and prioritizes reliable exact matches.",experiment:"Experimental first",experimentText:"Recommended values come from experiments while all values and conditions remain accessible.",trace:"Traceable sources",traceText:"Every property record connects to a source, with room for literature-level provenance.",result:"Search results",identified:"Input identified as",count:"results",demo:"Results come from the MolScience backend; molecule details also show archived properties and provenance status.",category:"Data categories",all:"All",numeric:"Numeric properties",spectra:"Spectroscopy",safety:"Safety",match:"Identifier or name match",sourceCount:"data sources",detail:"View details",none:"No matching molecule found",noneText:"Check the input or try a name, CAS number, formula, or another standard identifier.",overview:"Overview",identifiers:"Identifiers",properties:"Numeric properties",spectroscopy:"Spectroscopy",safetyInfo:"Safety",sources:"Sources and other information",recommended:"Database property record",allValues:"View all",records:"records",copy:"Copy",copied:"Copied",available:"Data available",sourceNote:"This view reflects stored raw values, calculation methods, dataset provenance and review status. Pending does not mean validated.",value:"Value",condition:"Value origin",type:"Record type",method:"Method",quality:"Review status",experimental:"Experimental",close:"Close",danger:"Danger",notFound:"Molecule not found",back:"Back to database",aboutHero:"Molecular data that is easier to find, trust and compute with.",aboutLead:"MolScience is building sovereign, standardized and extensible infrastructure for molecular data.",mission:"Trust starts with the data",missionText:"Across fragmented and duplicated sources, we first solve identifier normalization, experimental record aggregation, value recommendation and provenance.",phase1:"Complete the search—results—details—sources loop across seven common query formats.",score:"Composite scoring",scoreText:"The first release compares experimental values only, considering source quality, condition completeness, review status and agreement.",phase2:"Add substructure and similarity search, interactive spectra and literature-level provenance, followed by prediction, thermodynamics and AI Q&A." }
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
 return <div className="app"><Header lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} t={t}/><Routes><Route path="/" element={<Home lang={lang} t={t}/>}/><Route path="/about" element={<About lang={lang}/>}/><Route path="/search" element={<Results lang={lang} t={t}/>}/><Route path="/molecule/:id/:key?" element={<Detail lang={lang} t={t}/>}/><Route path="/register" element={<RegisterView lang={lang}/>}/><Route path="/verify-email" element={<VerifyEmailView lang={lang}/>}/><Route path="/forgot-password" element={<ForgotPasswordView lang={lang}/>}/><Route path="/reset-password" element={<ResetPasswordView lang={lang}/>}/><Route path="/login" element={<LoginPage lang={lang}/>}/><Route path="/account" element={<AccountLayout lang={lang}/>}><Route index element={<AccountOverview lang={lang}/>}/><Route path="profile" element={<ProfilePage lang={lang}/>}/><Route path="security" element={<SecurityPage lang={lang}/>}/><Route path="developer" element={<DeveloperPage lang={lang}/>}/></Route><Route path="*" element={<Missing t={t}/>}/></Routes><Footer lang={lang}/></div>
}

function Header({lang,setLang,theme,setTheme,t}:{lang:Lang;setLang:(l:Lang)=>void;theme:Theme;setTheme:(theme:Theme)=>void;t:Text}){
 const path=useLocation().pathname;
 const themeLabel=lang==="zh"?(theme==="light"?"切换到夜间模式":"切换到日间模式"):(theme==="light"?"Switch to dark mode":"Switch to light mode");
 const authPath=path.startsWith("/account")||["/login","/register","/verify-email","/forgot-password","/reset-password"].includes(path);
 return <header><div className="container nav"><Link className="brand" to="/"><img src="https://s.guyue.me/img/icon_molscience.png" alt=""/><b>MolScience</b></Link>{path!=="/"&&path!=="/about"&&!authPath&&<SearchBox t={t} compact/>}<nav><NavLink to="/" end>{t.database}</NavLink><NavLink to="/about">{t.about}</NavLink><a href="https://docs.molscience.org" target="_blank" rel="noreferrer">{t.docs}</a><NavLink to="/account">{lang==="zh"?"个人中心":"Account"}</NavLink></nav><button className="themeToggle" onClick={()=>setTheme(theme==="light"?"dark":"light")} aria-label={themeLabel} title={themeLabel}><span aria-hidden="true">{theme==="light"?"☾":"☀"}</span></button><div className="language"><button className={lang==="zh"?"on":""} onClick={()=>setLang("zh")}>中</button><span>/</span><button className={lang==="en"?"on":""} onClick={()=>setLang("en")}>EN</button></div></div></header>
}
function SearchBox({t,compact=false}:{t:Text;compact?:boolean}){const nav=useNavigate();const [q,setQ]=useState("");const go=(e:FormEvent)=>{e.preventDefault();const value=q.trim();if(!value)return;nav(`/search?q=${encodeURIComponent(value)}`)};return <form className={`searchbox ${compact?"compact":""}`} onSubmit={go}><i/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={t.placeholder} aria-label={t.placeholder}/><button aria-label={t.search}>{compact?"→":t.search}</button></form>}

function Home({lang}:{lang:Lang;t:Text}){return <PortalHome lang={lang}/>}

function About({lang}:{lang:Lang}){return <AboutHub lang={lang}/>}

function Results({lang,t}:{lang:Lang;t:Text}){
 const [params,setParams]=useSearchParams();
 const batch=params.get("batch")==="1", q=params.get("q")||"";
 const queryType=readQueryType(params), sort=readSearchSort(params), zh=lang==="zh";
 const [available,setAvailable]=useState<Molecule[]>([]);
 const [apiState,setApiState]=useState<"loading"|"ready"|"error">("loading");
 const [nextOffset,setNextOffset]=useState<number|null>(null);
 const [moreState,setMoreState]=useState<"idle"|"loading"|"error">("idle");
 const [reload,setReload]=useState(0), [source,setSource]=useState<"cache"|"network"|null>(null);
 const [fetchedAt,setFetchedAt]=useState<number|null>(null);
 const [updateState,setUpdateState]=useState<"idle"|"refreshing"|"failed">("idle");
 const [clearState,setClearState]=useState<"idle"|"cleared"|"error">("idle");
 const forceRefresh=useRef(false), requestActive=useRef(false);
 const searchController=useRef<AbortController|null>(null);
 const options={query:batch?undefined:q,queryType:batch?"auto" as const:queryType,recordStatus:"ACTIVE" as const,sort,limit:batch?100:20};
 useEffect(()=>{
  const controller=new AbortController();searchController.current=controller;
  const manual=forceRefresh.current;forceRefresh.current=false;let visible=manual;
  requestActive.current=true;setClearState("idle");setMoreState("idle");
  if(manual){setApiState("ready");setUpdateState("refreshing")}
  else{setAvailable([]);setNextOffset(null);setSource(null);setFetchedAt(null);setUpdateState("idle");setApiState("loading")}
  const accept=(result:Awaited<ReturnType<typeof getCachedMolecules>>)=>{
   visible=true;setAvailable(result.data.items);setNextOffset(result.data.pagination.next_offset);
   setSource(result.source);setFetchedAt(result.fetchedAt);setApiState("ready");
  };
  const run=async()=>{
   try{
    let result=await getCachedMolecules(controller.signal,options,manual);
    if(controller.signal.aborted)return;
    accept(result);
    if(result.source==="cache"&&!result.fresh){
     setUpdateState("refreshing");result=await getCachedMolecules(controller.signal,options,true);
     if(controller.signal.aborted)return;accept(result);
    }
    requestActive.current=false;setUpdateState("idle");
   }catch(error){
    if(controller.signal.aborted||(error as Error).name==="AbortError")return;
    requestActive.current=false;
    if(isMoleculeAccessDeniedError(error)){visible=false;setAvailable([]);setNextOffset(null);setSource(null);setFetchedAt(null)}
    if(visible){setApiState("ready");setUpdateState("failed")}
    else setApiState("error");
   }
  };
  void run();return()=>{controller.abort();requestActive.current=false};
 },[batch,q,queryType,reload,sort]);
 const loadMore=async()=>{
  const controller=searchController.current;
  if(nextOffset===null||requestActive.current||!controller||controller.signal.aborted)return;
  requestActive.current=true;setMoreState("loading");
  try{
   const result=await getCachedMolecules(controller.signal,{...options,offset:nextOffset},true);
   if(controller.signal.aborted)return;
   setAvailable(current=>appendSearchPage(current,result.data.items));
   setNextOffset(result.data.pagination.next_offset);setMoreState("idle");
  }catch(error){
   if(controller.signal.aborted)return;
   if(isMoleculeAccessDeniedError(error)){setAvailable([]);setNextOffset(null);setApiState("error")}
   setMoreState("error");
  }finally{if(!controller.signal.aborted)requestActive.current=false}
 };
 const refresh=()=>{if(requestActive.current)return;forceRefresh.current=true;requestActive.current=true;setReload(value=>value+1)};
 const clear=()=>setClearState(clearMoleculeCache()?"cleared":"error");
 const changeOption=(key:string,value:string)=>{const next=new URLSearchParams(params);next.set(key,value);setParams(next)};
 const shown=useMemo(()=>{
  if(!batch)return available;
  try{
   const ids=JSON.parse(sessionStorage.getItem("molscience-batch-ids")||"[]") as string[];
   return available.filter(m=>ids.some(id=>[m.id,m.cas,m.inchikey,String(m.cid)].includes(id)));
  }catch{return []}
 },[available,batch]);
 if(apiState==="loading")return <DataRequestState lang={lang} kind="loading" subject="results"/>;
 if(apiState==="error")return <DataRequestState lang={lang} kind="error" subject="results" onRetry={()=>setReload(value=>value+1)}/>;
 return <main className="results container">
  <div className="resultsTitle"><div><p className="eyebrow">{t.result}</p>
   <h1>{batch?(zh?"批量 ID 检索":"Batch ID search"):q?`“${q}”`:(zh?"浏览分子":"Browse molecules")}</h1>
   <p className="queryRecognition">{zh?"已显示":"Showing"} {shown.length} {t.count}{nextOffset!==null?(zh?" · 还有更多结果":" · More results available"):""}</p>
  </div><div className="searchOptions">
   {!batch&&<label>{zh?"检索类型":"Search type"}<select value={queryType} onChange={e=>changeOption("query_type",e.target.value)}>{queryTypes.map(value=><option key={value} value={value}>{queryTypeLabels[value][lang]}</option>)}</select></label>}
   <label>{zh?"排序":"Sort"}<select value={sort} onChange={e=>changeOption("sort",e.target.value)}>
    <option value="relevance">{zh?"相关性（完全匹配优先）":"Relevance (exact first)"}</option>
    <option value="id">{zh?"默认编号顺序":"Default ID order"}</option>
    <option value="created_at_desc">{zh?"最近入库":"Recently added"}</option>
    <option value="created_at_asc">{zh?"最早入库":"Oldest first"}</option>
    <option value="name">{zh?"分子名称":"Molecule name"}</option>
   </select></label>
  </div></div>
  <div className="notice"><b>i</b>{queryType==="smiles"?(zh?"SMILES 区分大小写并按完整文本匹配；不同写法尚不自动识别为同一结构，也不执行子结构检索。":"SMILES uses case-sensitive exact text matching. Equivalent representations and substructures are not matched."):t.demo}</div>
  {source&&fetchedAt!==null&&<MoleculeCacheStatus firstPageOnly={available.length>options.limit} lang={lang} source={source} fetchedAt={fetchedAt} updating={updateState==="refreshing"} updateFailed={updateState==="failed"} clearState={clearState} onRefresh={refresh} onClear={clear}/>}
  <div className="resultsGrid"><aside className="filters"><div className="filterHeading"><h2>{zh?"当前数据范围":"Current data scope"}</h2></div><div className="filterGroup"><h3>{zh?"有效分子":"Active molecules"}</h3><p>{zh?"名称支持完全、前缀与包含匹配；结构标识符按完整文本匹配。相关性排序优先展示完全匹配，命中原因由后端返回。":"Names support exact, prefix and contains matches; structure identifiers use exact text matching. Relevance places exact matches first, with match reasons supplied by the backend."}</p></div></aside>
   <section className="list">{shown.length?shown.map(m=><ResultCard key={m.id} m={m} lang={lang} t={t}/>):<div className="empty"><Atom/><h2>{t.none}</h2><p>{queryType==="smiles"?(zh?"未找到相同的 SMILES 文本。可尝试名称、CAS 或 InChIKey；当前结果不能证明库内不存在等价结构。":"No identical SMILES text was found. Try a name, CAS or InChIKey; equivalent structures may still exist in the database."):t.noneText}</p></div>}
   {nextOffset!==null&&<div className="searchPagination">
    {moreState==="error"&&<p role="alert">{zh?"加载失败，已有结果已保留，请重试。":"Loading failed. Existing results are preserved; please retry."}</p>}
    <button type="button" className="secondaryAction" onClick={()=>void loadMore()} disabled={moreState==="loading"||updateState==="refreshing"}>{moreState==="loading"?(zh?"正在加载…":"Loading…"):moreState==="error"?(zh?"重试加载更多":"Retry loading more"):(zh?"加载更多":"Load more")}</button>
   </div>}
   </section>
  </div>
 </main>;
}
function ResultCard({m,lang,t}:{m:Molecule;lang:Lang;t:Text}){
 const reason=matchLabel(m.match,lang);
 const routeId=m.uuid||m.id;const image=structureImage(m);
 const coverage=[
  m.properties.length?`${m.properties.length} ${lang==="zh"?"项数值性质":"numeric properties"}`:"",
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
 return <article className="resultCard"><Link className="resultStructure" to={`/molecule/${routeId}`}>{image?<img src={image} alt={`${m.name[lang]} 2D structure`}/>:<Atom/>}</Link><div><div className="resultName"><span><Link to={`/molecule/${routeId}`}><h2>{m.name[lang]}</h2></Link><small>{[m.name.en,m.iupac].filter(Boolean).join(" · ")}</small><p className="resultAliases">{m.aliases.slice(0,4).join(" · ")}</p></span><em>{reason}</em></div><div className="resultIdentityGrid">{fields.map(x=><span className={x.wide?"wide":""} key={x.label}><small>{x.label}</small><code title={x.value||"—"}>{x.value||"—"}</code></span>)}</div><footer><div className="coverage">{coverage.length?coverage.map(item=><span key={item}>{item}</span>):<span className="coverageEmpty">{lang==="zh"?"基础身份数据已入库":"Identity data available"}</span>}</div><Link className="link" to={`/molecule/${routeId}`}>{t.detail} →</Link></footer></div></article>
}

function Detail({lang,t}:{lang:Lang;t:Text}){
 const {id}=useParams();
 const [m,setM]=useState<Molecule|null>(null);const [apiState,setApiState]=useState<"loading"|"ready"|"not-found"|"error">("loading");
 const [reload,setReload]=useState(0);const [source,setSource]=useState<"cache"|"network"|null>(null);const [fetchedAt,setFetchedAt]=useState<number|null>(null);
 const [updateState,setUpdateState]=useState<"idle"|"refreshing"|"failed">("idle");const [clearState,setClearState]=useState<"idle"|"cleared"|"error">("idle");
 const forceRefresh=useRef(false);const requestActive=useRef(false);
 useEffect(()=>{
  if(!id){setM(null);setSource(null);setFetchedAt(null);setApiState("not-found");return}
  const controller=new AbortController();const manual=forceRefresh.current;forceRefresh.current=false;let visible=manual;
  setClearState("idle");
  if(manual){requestActive.current=true;setApiState("ready");setUpdateState("refreshing")}
  else{requestActive.current=false;setM(null);setSource(null);setFetchedAt(null);setUpdateState("idle");setApiState("loading")}
  const run=async()=>{
   try{
    let result=await getCachedMolecule(id,controller.signal,manual);
    if(controller.signal.aborted)return;
    visible=true;setM(result.data);setSource(result.source);setFetchedAt(result.fetchedAt);setApiState("ready");
    if(result.source==="cache"&&!result.fresh){
     requestActive.current=true;setUpdateState("refreshing");
     result=await getCachedMolecule(id,controller.signal,true);
     if(controller.signal.aborted)return;
     setM(result.data);setSource(result.source);setFetchedAt(result.fetchedAt);
    }
    requestActive.current=false;setUpdateState("idle");
   }catch(error){
    if(controller.signal.aborted||(error as Error).name==="AbortError")return;
    requestActive.current=false;
    if(isMoleculeMissingError(error)){visible=false;setM(null);setSource(null);setFetchedAt(null);setUpdateState("idle");setApiState("not-found");return}
    if(isMoleculeAccessDeniedError(error)){visible=false;setM(null);setSource(null);setFetchedAt(null)}
    if(visible){setApiState("ready");setUpdateState("failed")}
    else{setApiState("error");setUpdateState("idle")}
   }
  };
  void run();return()=>{controller.abort();requestActive.current=false};
 },[id,reload]);
 const refresh=()=>{if(requestActive.current)return;requestActive.current=true;forceRefresh.current=true;setUpdateState("refreshing");setClearState("idle");setReload(value=>value+1)};
 const clear=()=>setClearState(clearMoleculeCache()?"cleared":"error");
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
 return <main><section className="molHero"><div className="container molHeroGrid">{image?<a className="structure" href={image} target="_blank" rel="noreferrer"><img src={image} alt={`${m.name[lang]} 2D bond-line structure`}/><small>{lang==="zh"?"二维键线式 · 点击放大":"2D bond-line structure · Open large"}</small></a>:<div className="structure"><Atom/><small>{lang==="zh"?"暂无二维结构图":"No 2D structure image"}</small></div>}<div><p className="eyebrow">MolScience ID / {m.id}</p><h1>{m.name[lang]}</h1>{statusNotice&&<p className={`recordStatusNotice recordStatusNotice--${m.recordStatus==="DEPRECATED"||m.standardizationStatus==="FAILED"?"warning":"pending"}`}>{statusNotice}</p>}{source&&fetchedAt!==null&&<MoleculeCacheStatus lang={lang} source={source} fetchedAt={fetchedAt} updating={updateState==="refreshing"} updateFailed={updateState==="failed"} clearState={clearState} onRefresh={refresh} onClear={clear}/>}<p className="muted">{[m.name.en,m.iupac].filter(Boolean).join(" · ")}</p><p>{m.description[lang]||empty}</p><div className="identity"><span><small>Formula</small><code>{m.formula||"—"}</code></span><span><small>{lang==="zh"?"相对分子质量":"Relative molecular mass"}</small><code>{m.mass?`${m.mass} g/mol`:"—"}</code></span><span><small>CAS RN</small><code>{m.cas||"—"}</code></span><span><small>InChIKey</small><code>{m.inchikey||"—"}</code></span></div></div></div></section><div className="container detailGrid"><aside className="sideNav">{sections.map(([sectionId,label])=><a className={activeSection===sectionId?"active":""} href={`#${sectionId}`} onClick={()=>setActiveSection(sectionId)} key={sectionId}>{label}</a>)}</aside><div className="detailBody"><Section id="overview" n="01" title={t.overview}>{m.aliases.length?<div className="aliases"><small>Aliases</small><div className="plainAliasList">{m.aliases.map(x=><span key={x}>{x}</span>)}</div></div>:<p>{empty}</p>}</Section><Section id="identifiers" n="02" title={t.identifiers}><div className="idTable">{[["MolScience ID",m.id],["Canonical SMILES",m.smiles],["InChI",m.inchi],["InChIKey",m.inchikey]].filter(([,v])=>v).map(([label,v])=><IdRow key={label} label={label} value={v} t={t}/>)}</div></Section><Section id="properties" n="03" title={t.properties}>{m.properties.length?<div className="propertyList">{m.properties.map(p=><article className={`propertyRow ${expanded.includes(p.key)?"isExpanded":""}`} key={p.key}><div className="propertySummary"><div><span>{p.label[lang]}</span><small>{t.recommended}</small><small className="dataKind">{propertyOriginLabel(p.origin,lang)}</small></div><strong>{p.value}</strong><p>{reviewStatusLabel(p.reviewStatus,lang)}</p><button onClick={()=>toggle(p.key)} aria-expanded={expanded.includes(p.key)}>{expanded.includes(p.key)?(lang==="zh"?"收起记录":"Hide records"):`${t.allValues} ${p.records.length} ${t.records}`} <b>{expanded.includes(p.key)?"↑":"↓"}</b></button></div>{expanded.includes(p.key)&&<PropertyRecords property={p} lang={lang} t={t}/>}</article>)}</div>:<p>{empty}</p>}</Section><Section id="spectra" n="04" title={t.spectroscopy}>{m.spectra.length?<div className="spectra">{m.spectra.map(x=><article key={x}><SpectrumSlot lang={lang}/><div><h3>{x}</h3></div><b>→</b></article>)}</div>:<p>{empty}</p>}</Section><Section id="safety" n="05" title={t.safetyInfo}><div className={`safety ${m.safety.level}`}><strong><span>!</span>{m.safety.label[lang]}</strong></div></Section><Section id="sources" n="06" title={t.sources}>{m.sources.length?<div className="sourceList">{m.sources.map((x,i)=><article key={x}><span>0{i+1}</span><b>{x}</b><small>Database source</small></article>)}</div>:<p>{empty}</p>}</Section></div></div></main>;
}
function Section({id,n,title,children}:{id:string;n:string;title:string;children:ReactNode}){return <section className="detailSection" id={id}><div className="sectionTitle"><span>{n}</span><h2>{title}</h2></div>{children}</section>}
function IdRow({label,value,t}:{label:string;value:string;t:Text}){const [done,setDone]=useState(false);const copy=async()=>{await navigator.clipboard.writeText(value);setDone(true);setTimeout(()=>setDone(false),1000)};return <div><span>{label}</span><code>{value}</code><button onClick={copy}>{done?t.copied:t.copy}</button></div>}
function propertyOriginLabel(origin:string|undefined,lang:Lang){if(origin==="COMPUTED")return lang==="zh"?"计算值":"Computed";if(origin==="EXPERIMENTAL")return lang==="zh"?"实验值":"Experimental";return lang==="zh"?"来源未标注":"Origin not specified"}
function reviewStatusLabel(status:Property["reviewStatus"],lang:Lang){if(status==="ACCEPTED")return lang==="zh"?"已接受":"Accepted";if(status==="REJECTED")return lang==="zh"?"已拒绝":"Rejected";return lang==="zh"?"待审核":"Pending review"}
function qualifierLabel(qualifier:string|undefined,lang:Lang){const labels:Record<string,[string,string]>={EXACT:["精确值","Exact"],APPROX:["近似值","Approximate"],RANGE:["范围","Range"],LESS_THAN:["小于","Less than"],GREATER_THAN:["大于","Greater than"]};const label=qualifier?labels[qualifier]:undefined;return label?(lang==="zh"?label[0]:label[1]):"—"}
function PropertyRecords({property,lang,t}:{property:Property;lang:Lang;t:Text}){const headers=[t.value,t.type,lang==="zh"?"限定符":"Qualifier",t.method,t.sources,t.quality];return <div className="inlineRecords"><div className="recordHeader">{headers.map(x=><b key={x}>{x}</b>)}</div>{property.records.map((r,i)=><div className={`reviewStatus--${(r.reviewStatus||"PENDING").toLowerCase()}`} key={r.id||`${r.value}-${i}`}><strong>{r.value}</strong><span>{propertyOriginLabel(r.origin,lang)}</span><span>{qualifierLabel(r.qualifier,lang)}</span><span>{r.method||"—"}</span><span>{r.source}</span><em>{reviewStatusLabel(r.reviewStatus,lang)}</em></div>)}<p>{t.sourceNote}</p></div>}
function SpectrumSlot({lang}:{lang:Lang}){return <div className="spectrumSlot"><div className="spectrumAxis"/><small>{lang==="zh"?"接入标准化谱图数据后在此绘制":"Interactive spectrum will render here"}</small></div>}
function Atom(){return <div className="atom"><i/></div>}
function Missing({t}:{t:Text}){return <main className="missing"><Atom/><h1>{t.notFound}</h1><Link to="/">{t.back}</Link></main>}
function Footer({lang}:{lang:Lang}){return <footer className="siteFooter"><div className="container"><div className="brand"><img src="https://s.guyue.me/img/icon_molscience.png" alt=""/><b>MolScience</b></div><p>{lang==="zh"?"开放、可信的分子数据基础设施。":"Open and trusted molecular data infrastructure."}</p><small>© 2026 MolScience Team</small></div></footer>}
