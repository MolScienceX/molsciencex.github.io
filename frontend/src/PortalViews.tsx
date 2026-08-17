import { ChangeEvent, FormEvent, MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lang, Molecule, detectType } from "./data";
import { getMolecules } from "./api";
import { getAboutContent } from "./aboutContent";

type JSMEApplet = { smiles: () => string; readMolecule: (value: string) => void };
declare global { interface Window { JSApplet?: { JSME: new (id:string,width:string,height:string,options:object) => JSMEApplet } } }

type PortalText = {
  title:string; lead:string; placeholder:string; search:string; draw:string; ids:string; examples:string;
  advanced:string; history:string; help:string; browse:string; common:string; process:string; about:string;
  team:string; contribute:string; view:string; numeric:string; spectra:string; safety:string; sources:string;
};

const portalCopy:Record<Lang,PortalText>={
  zh:{title:"检索分子与实验数据",lead:"查询名称、结构标识符、实验物性、谱学信息和数据来源",placeholder:"搜索名称、CAS、分子式、SMILES、InChI…",search:"搜索",draw:"画结构",ids:"ID 文件",examples:"试试",advanced:"高级检索",history:"搜索历史",help:"如何检索",browse:"按数据类别浏览",common:"常用分子",process:"数据如何进入 MolScience",about:"平台与数据方法",team:"项目团队",contribute:"参与贡献",view:"查看详情",numeric:"数值物性",spectra:"谱学数据",safety:"安全信息",sources:"数据来源"},
  en:{title:"Search molecules and experimental data",lead:"Find names, structure identifiers, experimental properties, spectra and sources",placeholder:"Search names, CAS, formula, SMILES, InChI…",search:"Search",draw:"Draw",ids:"ID File",examples:"Try",advanced:"Advanced Search",history:"Search History",help:"How to Search",browse:"Browse by data category",common:"Common molecules",process:"How data enters MolScience",about:"Platform and data methods",team:"Project team",contribute:"Contribute",view:"Learn more",numeric:"Numeric properties",spectra:"Spectroscopy",safety:"Safety information",sources:"Data sources"}
};

type FrontierStory = {
 topic:{zh:string;en:string}; title:{zh:string;en:string}; summary:{zh:string;en:string};
 source:string; date:string; status:{zh:string;en:string}; url:string;
};

const frontierStories:FrontierStory[]=[
 {topic:{zh:"化学生物学",en:"Chemical biology"},title:{zh:"通过固相亚磷酰化拓展寡核苷酸功能化",en:"On-support phosphitylation expands oligonucleotide functionalization"},summary:{zh:"研究在固相寡核苷酸上原位生成亚磷酰胺中间体，实现末端与内部位点的选择性修饰，并提高试剂回收与官能团兼容性。",en:"In-situ phosphitylation on solid-supported oligonucleotides enables selective terminal and internal modifications with improved reagent recovery and functional-group compatibility."},source:"Nature Chemistry",date:"2026-07-22",status:{zh:"同行评审 · 开放获取",en:"Peer reviewed · Open access"},url:"https://www.nature.com/articles/s41557-026-02214-6"},
 {topic:{zh:"合成化学",en:"Synthetic chemistry"},title:{zh:"以烷基肼为自由基前体合成多类烷基硫化合物",en:"Alkyl hydrazines unlock diverse alkyl-sulfur compounds"},summary:{zh:"温和热活化使烷基肼释放氮气并生成烷基自由基，为多类硫(IV/VI)化合物提供统一的发散合成路线。",en:"Mild thermal activation of alkyl hydrazines releases nitrogen and generates alkyl radicals for a unified, divergent route to sulfur(IV/VI) compounds."},source:"Nature Chemistry",date:"2026-07-22",status:{zh:"同行评审",en:"Peer reviewed"},url:"https://www.nature.com/articles/s41557-026-02212-8"},
 {topic:{zh:"配位化学",en:"Coordination chemistry"},title:{zh:"光生三重态金氮烯揭示新的氮转移反应路径",en:"A photogenerated triplet gold nitrene opens new nitrogen-transfer pathways"},summary:{zh:"研究通过金(III)叠氮配合物光解获得并表征三重态金氮烯，展示其活化氧气、C–H 键和不饱和底物的反应能力。",en:"Photolysis of a gold(III) azide produced a characterized triplet gold nitrene capable of activating oxygen, C–H bonds and unsaturated substrates."},source:"Nature Chemistry",date:"2026-07-21",status:{zh:"同行评审 · 开放获取",en:"Peer reviewed · Open access"},url:"https://www.nature.com/articles/s41557-026-02152-3"},
 {topic:{zh:"能源材料",en:"Energy materials"},title:{zh:"溶剂桥联电解液拓宽高能锂离子电池的工作边界",en:"Solvent-bridged electrolytes widen the operating range of high-energy Li-ion batteries"},summary:{zh:"溶剂桥联策略拓宽 LiPF₆–醚电解液的液态温区，在维持富 LiF 界面的同时改善离子电导率、低温性能与快充能力。",en:"A solvent-bridging strategy broadens the liquid range of LiPF₆–ether electrolytes while retaining a LiF-rich interface, improving conductivity, low-temperature operation and fast charging."},source:"Nature Chemistry",date:"2026-07-27",status:{zh:"同行评审",en:"Peer reviewed"},url:"https://www.nature.com/articles/s41557-026-02221-7"}
].sort((a,b)=>b.date.localeCompare(a.date));
function saveHistory(query:string,lang:Lang){
  const key="molscience-search-history";
  const current=JSON.parse(localStorage.getItem(key)||"[]") as {query:string;type:string;time:string}[];
  const next=[{query,type:detectType(query,lang),time:new Date().toISOString()},...current.filter(x=>x.query!==query)].slice(0,12);
  localStorage.setItem(key,JSON.stringify(next));
}

export function PortalHome({lang}:{lang:Lang}){
 const t=portalCopy[lang], navigate=useNavigate();
 const [query,setQuery]=useState(""); const [tool,setTool]=useState<"draw"|"ids"|"advanced"|"history"|null>(null);
 const [recentMolecules,setRecentMolecules]=useState<Molecule[]>([]);const [recentState,setRecentState]=useState<"loading"|"ready"|"error">("loading");
 const [recentReload,setRecentReload]=useState(0);
 useEffect(()=>{const controller=new AbortController();setRecentState("loading");getMolecules(controller.signal,{limit:10,recordStatus:"ACTIVE",sort:"created_at_desc"}).then(rows=>{setRecentMolecules(rows);setRecentState("ready")}).catch(error=>{if(error.name!=="AbortError")setRecentState("error")});return()=>controller.abort()},[recentReload]);
 const submit=(e:FormEvent)=>{e.preventDefault();const value=query.trim();if(!value)return;saveHistory(value,lang);navigate(`/search?q=${encodeURIComponent(value)}`)};
 const examples=lang==="zh"?["乙醇","64-17-5","C8H10N4O2","LFQSCWFLJHTTHZ-UHFFFAOYSA-N"]:["Ethanol","64-17-5","C8H10N4O2","LFQSCWFLJHTTHZ-UHFFFAOYSA-N"];
 return <main>
  <section className="portalHero"><div className="container"><p className="portalKicker">MOLSCIENCE MOLECULAR DATABASE</p><h1>{t.title}</h1><p className="portalLead">{t.lead}</p>
   <form className="portalSearch" onSubmit={submit}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.placeholder} aria-label={t.placeholder}/><div className="portalSearchTools"><button type="button" className="searchTool" onClick={()=>setTool("draw")}><svg className="benzeneIcon" viewBox="0 0 30 30" aria-hidden="true"><polygon points="15,2.5 26,8.8 26,21.2 15,27.5 4,21.2 4,8.8"/><line x1="8" y1="9.4" x2="15" y2="5.4"/><line x1="23" y1="11" x2="23" y2="19"/><line x1="8" y1="20.6" x2="15" y2="24.6"/></svg>{t.draw}</button><button type="button" className="searchTool" onClick={()=>setTool("ids")}><span className="uploadIcon">↑</span>{t.ids}</button></div><button className="searchSubmit" aria-label={t.search}><span/></button></form>
   <div className="plainExamples"><b>{t.examples}</b>{examples.map(x=><Link key={x} to={`/search?q=${encodeURIComponent(x)}`} onClick={()=>saveHistory(x,lang)}>{x}</Link>)}</div>
   <div className="searchLinks"><button onClick={()=>setTool("advanced")}>{t.advanced} <span>⌄</span></button><button onClick={()=>setTool("history")}>{t.history} <span>↶</span></button><Link to="/about#guide">{t.help} <span>?</span></Link></div>
  </div></section>
  <section className="recentData"><div className="container"><div className="homeSectionHead"><div><p className="portalKicker">RECENT DATA</p><h2>{lang==="zh"?"最近新增数据":"Recently added data"}</h2></div><p>{lang==="zh"?"仅展示后端数据库中的有效记录，并按入库时间排序。":"Only active database records are shown, ordered by ingestion time."}</p></div><div className="recentDataList" aria-live="polite">{recentState==="loading"?<div className="dataSkeleton" aria-label={lang==="zh"?"正在读取数据":"Loading data"}>{[0,1,2].map(item=><span key={item}/>)}</div>:recentState==="error"?<div className="inlineApiState"><div><b>{lang==="zh"?"暂时无法连接数据服务":"Unable to reach the data service"}</b><small>{lang==="zh"?"请检查服务状态后重试。":"Check the service status and try again."}</small></div><button type="button" onClick={()=>setRecentReload(value=>value+1)}>{lang==="zh"?"重新加载":"Retry"}</button></div>:recentMolecules.length===0?<div className="inlineApiState"><div><b>{lang==="zh"?"数据库中暂时没有分子数据":"No molecule records are available yet"}</b><small>{lang==="zh"?"有效记录将在这里显示。":"Active records will appear here."}</small></div></div>:recentMolecules.map(m=><Link className="recentDataRow" key={m.uuid||m.id} to={`/molecule/${m.uuid||m.id}`}><span className={`recentStatus recentStatus--${m.standardizationStatus?.toLowerCase()||"pending"}`}>{m.standardizationStatus==="STANDARDIZED"?(lang==="zh"?"已标准化":"Standardized"):m.standardizationStatus==="FAILED"?(lang==="zh"?"标准化失败":"Failed"):(lang==="zh"?"待标准化":"Pending")}</span><span className="recentIdentity"><b>{m.name[lang]}</b><small>{m.iupac||"—"}</small><small className="recentMobileMeta">{m.formula||"—"} · {m.cas||"—"}</small></span><code>{m.formula||"—"}</code><code>{m.cas||"—"}</code><span className="recentCoverage"/><span className="recentSources">{m.id}</span><b className="rowArrow">→</b></Link>)}</div></div></section>
  <section className="chemFrontiers"><div className="container"><div className="homeSectionHead"><div><p className="portalKicker">CHEMISTRY FRONTIERS</p><h2>{lang==="zh"?"化学前沿精选":"Chemistry frontiers"}</h2></div><p>{lang==="zh"?"近期同行评审研究，由 MolScience 筛选并以原创摘要呈现。":"Recent peer-reviewed research selected by MolScience and presented with original summaries."}</p></div><div className="frontierGrid">{frontierStories.map((story,index)=><a className="frontierStory" key={story.url} href={story.url} target="_blank" rel="noreferrer">{index===0&&<span className="frontierFeatured">{lang==="zh"?"本期重点":"Featured"}</span>}<div className="frontierMeta"><span>{story.topic[lang]}</span><time>{story.date}</time></div><h3>{story.title[lang]}</h3><p>{story.summary[lang]}</p><footer><span>{story.source} · {story.status[lang]}</span><b>{lang==="zh"?"查看论文":"Read paper"} ↗</b></footer></a>)}</div></div></section>
  <SketchDialog open={tool==="draw"} close={()=>setTool(null)} lang={lang}/><IdFileDialog open={tool==="ids"} close={()=>setTool(null)} lang={lang}/><AdvancedDialog open={tool==="advanced"} close={()=>setTool(null)} lang={lang}/><HistoryDialog open={tool==="history"} close={()=>setTool(null)} lang={lang}/>
 </main>
}

function Modal({open,close,title,children,wide=false}:{open:boolean;close:()=>void;title:string;children:React.ReactNode;wide?:boolean}){
 const ref=useRef<HTMLDialogElement>(null); useEffect(()=>{if(open&&!ref.current?.open)ref.current?.showModal();if(!open&&ref.current?.open)ref.current.close()},[open]);
 return <dialog ref={ref} className={`toolDialog ${wide?"wide":""}`} onClose={close}><div className="toolDialogHead"><h2>{title}</h2><button onClick={close} aria-label="Close">×</button></div>{children}</dialog>
}

function SketchDialog({open,close,lang}:{open:boolean;close:()=>void;lang:Lang}){
 const nav=useNavigate(), applet=useRef<JSMEApplet|null>(null), [ready,setReady]=useState(false), [importValue,setImportValue]=useState("");
 useEffect(()=>{if(!open)return;const init=()=>{if(window.JSApplet&&!applet.current){applet.current=new window.JSApplet.JSME("jsme-editor","100%","410px",{options:"star,hydrogens"});setReady(true)}};init();window.addEventListener("jsme-ready",init);return()=>window.removeEventListener("jsme-ready",init)},[open]);
 const run=()=>{const q=applet.current?.smiles();if(q){saveHistory(q,lang);close();nav(`/search?q=${encodeURIComponent(q)}`)}};
 return <Modal open={open} close={close} wide title={lang==="zh"?"绘制查询结构":"Draw query structure"}><div className="sketchLayout"><div><div id="jsme-editor" className="sketchCanvas">{!ready&&(lang==="zh"?"正在加载结构编辑器…":"Loading structure editor…")}</div></div><aside><label>{lang==="zh"?"导入 SMILES 或 MOL":"Import SMILES or MOL"}</label><textarea value={importValue} onChange={e=>setImportValue(e.target.value)} placeholder="CCO"/><button className="secondaryAction" onClick={()=>applet.current?.readMolecule(importValue)}>{lang==="zh"?"导入结构":"Import"}</button><p>{lang==="zh"?"Phase 1.0 仅执行精确结构检索。":"Phase 1.0 performs exact structure lookup only."}</p><button className="primaryAction" onClick={run}>{lang==="zh"?"精确结构检索":"Exact structure search"}</button></aside></div></Modal>
}

function IdFileDialog({open,close,lang}:{open:boolean;close:()=>void;lang:Lang}){
 const nav=useNavigate(), [ids,setIds]=useState<string[]>([]), [duplicates,setDuplicates]=useState(0); const read=async(e:ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;const raw=(await file.text()).split(/[\n,;\t]+/).map(x=>x.trim()).filter(Boolean);const unique=[...new Set(raw)];setDuplicates(raw.length-unique.length);setIds(unique)};
 const run=()=>{sessionStorage.setItem("molscience-batch-ids",JSON.stringify(ids));close();nav("/search?batch=1")};
 return <Modal open={open} close={close} title={lang==="zh"?"上传 ID 文件":"Upload ID file"}><div className="uploadPanel"><label className="fileDrop"><input type="file" accept=".txt,.csv" onChange={read}/><span>↑</span><b>{lang==="zh"?"选择 .txt 或 .csv 文件":"Choose a .txt or .csv file"}</b><small>{lang==="zh"?"支持 MolScience ID、CAS、InChIKey 和 PubChem CID":"MolScience ID, CAS, InChIKey and PubChem CID"}</small></label>{ids.length>0&&<><div className="fileStats"><span><b>{ids.length}</b>{lang==="zh"?"唯一标识符":"unique identifiers"}</span><span><b>{duplicates}</b>{lang==="zh"?"重复项":"duplicates"}</span></div><pre>{ids.slice(0,6).join("\n")}</pre><button className="primaryAction" onClick={run}>{lang==="zh"?"开始批量检索":"Start batch search"}</button></>}</div></Modal>
}

function AdvancedDialog({open,close,lang}:{open:boolean;close:()=>void;lang:Lang}){
 const nav=useNavigate(),[value,setValue]=useState("");const submit=(e:FormEvent)=>{e.preventDefault();if(value){saveHistory(value,lang);close();nav(`/search?q=${encodeURIComponent(value)}`)}};
 return <Modal open={open} close={close} title={lang==="zh"?"高级检索":"Advanced search"}><form className="advancedForm" onSubmit={submit}><label>{lang==="zh"?"名称、CAS 或分子式":"Name, CAS or formula"}<input value={value} onChange={e=>setValue(e.target.value)}/></label><div><label>{lang==="zh"?"最低分子量":"Minimum molar mass"}<input type="number" disabled placeholder="API"/></label><label>{lang==="zh"?"最高分子量":"Maximum molar mass"}<input type="number" disabled placeholder="API"/></label></div><p>{lang==="zh"?"性质范围筛选将在数据接口确定后开放。":"Property ranges will be enabled when the data API is ready."}</p><button className="primaryAction">{lang==="zh"?"检索":"Search"}</button></form></Modal>
}

function HistoryDialog({open,close,lang}:{open:boolean;close:()=>void;lang:Lang}){
 const [items,setItems]=useState<{query:string;type:string;time:string}[]>([]);useEffect(()=>{if(open)setItems(JSON.parse(localStorage.getItem("molscience-search-history")||"[]"))},[open]);
 const clear=()=>{localStorage.removeItem("molscience-search-history");setItems([])};
 return <Modal open={open} close={close} title={lang==="zh"?"搜索历史":"Search history"}><div className="historyList">{items.length?items.map(x=><Link onClick={close} key={x.query} to={`/search?q=${encodeURIComponent(x.query)}`}><span><b>{x.query}</b><small>{x.type}</small></span><time>{new Date(x.time).toLocaleString()}</time><b>→</b></Link>):<p>{lang==="zh"?"还没有搜索记录。":"No searches yet."}</p>}</div>{items.length>0&&<button className="textAction" onClick={clear}>{lang==="zh"?"清除历史":"Clear history"}</button>}</Modal>
}

export function AboutHub({lang}:{lang:Lang}){
 const t=getAboutContent(lang);
 const portalItems=[["01",t.nav[0],"platform"],["02",t.nav[1],"architecture"],["03",t.nav[2],"pipeline"],["04",t.nav[3],"team"],["05",t.nav[4],"guide"],["06",t.nav[5],"contribute"]];
 const [activePortalId,setActivePortalId]=useState("platform");
 const portalScrollTimer=useRef<number|null>(null);
 const portalScrollInProgress=useRef(false);
 useEffect(()=>{
  const updateActiveSection=()=>{
   if(portalScrollInProgress.current)return;
   const readingLine=Math.min(window.innerHeight*.3,260);
   let nextId=portalItems[0][2];
   for(const [, ,id] of portalItems){
    const section=document.getElementById(id);
    if(section&&section.getBoundingClientRect().top<=readingLine)nextId=id;
    else break;
   }
   setActivePortalId(nextId);
  };
  updateActiveSection();
  window.addEventListener("scroll",updateActiveSection,{passive:true});
  window.addEventListener("resize",updateActiveSection);
  return()=>{window.removeEventListener("scroll",updateActiveSection);window.removeEventListener("resize",updateActiveSection);if(portalScrollTimer.current!==null)window.clearTimeout(portalScrollTimer.current)};
 },[]);
 const navigateToPortal=(event:ReactMouseEvent<HTMLAnchorElement>,id:string)=>{
  event.preventDefault();
  const section=document.getElementById(id);
  if(!section)return;
  if(portalScrollTimer.current!==null)window.clearTimeout(portalScrollTimer.current);
  setActivePortalId(id);
  window.history.pushState(null,"",`#${id}`);
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){section.scrollIntoView();return}
  const targetY=section.getBoundingClientRect().top+window.scrollY-88;
  const distance=Math.abs(targetY-window.scrollY);
  const duration=Math.min(760,Math.max(480,distance*.32));
  portalScrollInProgress.current=true;
  window.setTimeout(()=>window.scrollTo({top:targetY,behavior:"smooth"}),0);
  portalScrollTimer.current=window.setTimeout(()=>{
   portalScrollTimer.current=null;
   portalScrollInProgress.current=false;
   setActivePortalId(id);
  },duration+120);
 };
 const activePortalIndex=Math.max(0,portalItems.findIndex(([, ,id])=>id===activePortalId));
 const roles=lang==="zh"?[["项目方向","平台规划与科研协作"],["数据方向","标准、审核与来源体系"],["工程方向","检索、服务与平台体验"],["开放协作","社区贡献与文档维护"]]:[["Project direction","Planning and research collaboration"],["Data direction","Standards, review and provenance"],["Engineering","Search, services and product experience"],["Open collaboration","Community and documentation"]];
 return <main className="aboutPage"><div className="aboutReadingLayout container">
 <aside className="aboutSidebar"><div className="aboutSidebarInner"><p className="portalKicker">ABOUT MOLSCIENCE</p><nav className="aboutPortalNav" aria-label={lang==="zh"?"平台介绍章节":"About sections"}><i className="aboutPortalIndicator" aria-hidden="true" style={{transform:`translateY(${activePortalIndex*54}px)`}}/>{portalItems.map(([n,label,id])=><a href={`#${id}`} key={id} className={activePortalId===id?"isActive":undefined} aria-current={activePortalId===id?"location":undefined} onClick={event=>navigateToPortal(event,id)}><span>{n}</span><b>{label}</b></a>)}</nav></div></aside>
 <div className="aboutReadingMain"><section className="aboutHeroEditorial"><div><h1><span>MolScience</span>{t.title}</h1><p>{t.lead}</p><div className="aboutHeroActions"><Link to="/" className="primaryAction">{lang==="zh"?"开始检索":"Start searching"}</Link></div></div></section>
 <div className="aboutEditorial">
  <section id="platform" className="aboutSection"><div className="aboutSectionTitle"><small>01 / WHY</small><h2>{lang==="zh"?"为什么建设 MolScience":"Why MolScience"}</h2></div><div><p className="aboutLargeCopy">{t.platform}</p><div className="challengeGrid">{t.challenges.map((item,i)=><article key={item.title}><span>0{i+1}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></div></section>
  <section id="architecture" className="aboutSection"><div className="aboutSectionTitle"><small>02 / ARCHITECTURE</small><h2>{lang==="zh"?"多数据库协同架构":"A collaborative data architecture"}</h2></div><div><p className="aboutLargeCopy">{t.architectureIntro}</p><div className="architectureGrid">{t.architecture.map((item,i)=><article key={item.code}><div><span>0{i+1}</span><code>{item.code}</code></div><h3>{item.title}</h3><p>{item.text}</p><small>{item.output}</small></article>)}</div><div className="architectureOutcome"><b>{lang==="zh"?"统一数据层":"UNIFIED DATA LAYER"}</b><span>{lang==="zh"?"精确检索 · 关系分析 · 相似性搜索 · 性质预测 · 分子设计":"Exact search · Relationship analysis · Similarity · Prediction · Molecular design"}</span></div></div></section>
  <section id="pipeline" className="aboutSection"><div className="aboutSectionTitle"><small>03 / DATA TO INTELLIGENCE</small><h2>{lang==="zh"?"从数据治理到模型应用":"From governance to model applications"}</h2></div><div><p className="aboutLargeCopy">{t.pipelineIntro}</p><ol className="pipelineGrid">{t.pipeline.map((item,i)=><li key={item.title}><span>{String(i+1).padStart(2,"0")}</span><div><h3>{item.title}</h3><p>{item.text}</p></div></li>)}</ol><div className="dataPrinciples">{t.principles.map((item,i)=><article key={item.title}><span>0{i+1}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div><div className="phaseRibbon"><b>Phase 1.0</b><span>{lang==="zh"?"检索":"Search"}</span><i>→</i><span>{lang==="zh"?"结果":"Results"}</span><i>→</i><span>{lang==="zh"?"详情":"Details"}</span><i>→</i><span>{lang==="zh"?"实验数据":"Experiments"}</span><i>→</i><span>{lang==="zh"?"来源":"Sources"}</span></div></div></section>
  <section id="team" className="aboutSection"><div className="aboutSectionTitle"><small>04 / TEAM</small><h2>{t.nav[3]}</h2></div><div><p className="aboutLargeCopy">{t.team}</p><div className="teamRoles">{roles.map(([a,b])=><article key={a}><small>{a}</small><h3>{b}</h3><p>{lang==="zh"?"核心成员信息将在正式发布前更新。":"Core member information will be added before release."}</p></article>)}</div></div></section>
  <section id="guide" className="aboutSection"><div className="aboutSectionTitle"><small>05 / USER GUIDE</small><h2>{t.nav[4]}</h2></div><div><p className="aboutLargeCopy">{t.guide}</p><ol className="guideRows">{(lang==="zh"?["输入名称或结构标识符","查看匹配结果与命中原因","进入分子详情","比较推荐值与全部实验记录","核查实验条件和来源"]:["Enter a name or structure identifier","Review matches and reasons","Open the molecule detail","Compare recommendations and all experiments","Verify conditions and sources"]).map((x,i)=><li key={x}><span>0{i+1}</span>{x}</li>)}</ol><a className="aboutDocsLink" href="https://docs.molscience.org" target="_blank" rel="noreferrer">{lang==="zh"?"阅读完整使用文档":"Read the complete documentation"} ↗</a></div></section>
  <section id="contribute" className="aboutSection"><div className="aboutSectionTitle"><small>06 / CONTRIBUTE</small><h2>{t.nav[5]}</h2></div><div><p className="aboutLargeCopy">{t.contribute}</p><div className="contributeEditorial"><div><h3>{lang==="zh"?"可以贡献":"What to contribute"}</h3><p>{lang==="zh"?"分子记录 · 实验物性 · 谱学数据 · 来源 · 错误修正 · 文档与代码":"Molecules · Experiments · Spectra · Sources · Corrections · Docs and code"}</p></div><div><h3>{lang==="zh"?"审核流程":"Review flow"}</h3><p>{lang==="zh"?"提交 → 格式检查 → 来源核验 → 科研审核 → 发布":"Submit → Format check → Source verification → Scientific review → Publish"}</p></div></div></div></section>
 </div></div></div>
 <section id="contact" className="aboutContact"><div className="container"><div><small>CONTACT MOLSCIENCE</small><h2>{lang==="zh"?"合作与联系":"Work with us"}</h2><p>{t.contact}</p></div><div className="contactInline"><span><small>{t.mail}</small><b>{lang==="zh"?"待公布":"To be announced"}</b></span><span><small>{t.docs}</small><b>MolScienceX</b></span><span><small>{lang==="zh"?"所属机构":"Institution"}</small><b>{lang==="zh"?"待公布":"To be announced"}</b></span></div></div></section></main>
}
