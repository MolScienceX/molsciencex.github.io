import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lang, detectType, findMolecules } from "./data";

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

const aboutCopy={
 zh:{title:"连接分子、实验数据与可信来源",lead:"整理分散的分子标识符、实验物性、谱学信息和数据来源，为科研人员提供统一、可比较、可追溯的数据入口。",nav:["认识 MolScience","核心团队","使用指南","贡献指南","联系方式"],platform:"分子数据分散在数据库、文献和实验记录中。同一分子可能存在不同名称与标识符，同一性质也可能对应多个实验值。MolScience 让推荐值能够回到完整记录、实验条件和原始来源。",team:"MolScience 由分子科学、数据治理和软件工程方向的成员共同建设。核心成员的姓名、职责与所属机构将在正式发布前由团队统一补充。",guide:"从名称、别名、CAS、分子式、SMILES、InChI 或 InChIKey 开始检索；也可以绘制结构执行精确检索，或上传 ID 文件批量查找。结果页解释命中方式，详情页展示推荐实验值、全部记录、条件和来源。",contribute:"MolScience 接受分子记录、实验物性、谱学数据、来源、代码、文档和问题反馈。提交内容将依次经过格式检查、来源核验和科研审核。",contact:"用于研究合作、数据贡献与问题反馈的正式邮箱、GitHub 和所属机构信息将在发布前补充。",mail:"项目邮箱",docs:"GitHub",flow:["统一标识","保留条件","比较记录","追溯来源"]},
 en:{title:"Connecting molecules, experiments and trusted sources",lead:"MolScience organizes fragmented identifiers, experimental properties, spectra and sources into a unified, comparable and traceable research entry point.",nav:["Meet MolScience","Core team","User guide","Contributing","Contact"],platform:"Molecular data is scattered across databases, literature and laboratory records. One molecule may have multiple names and identifiers, while one property may have multiple experimental values. MolScience keeps every recommendation connected to its records, conditions and original sources.",team:"MolScience is built by contributors working across molecular science, data governance and software engineering. Names, roles and affiliations of the core team will be added together before the public release.",guide:"Search by name, alias, CAS, formula, SMILES, InChI or InChIKey. You can also draw a structure for exact matching or upload an ID file for batch lookup. Results explain the match; detail pages expose recommendations, records, conditions and sources.",contribute:"MolScience welcomes molecular records, experimental properties, spectra, sources, code, documentation and issue reports. Submissions pass format checks, source verification and scientific review.",contact:"The official email, GitHub repository and institutional information for research collaboration, data contributions and feedback will be added before release.",mail:"Project email",docs:"GitHub",flow:["Unify identifiers","Preserve conditions","Compare records","Trace sources"]}
};

function saveHistory(query:string,lang:Lang){
  const key="molscience-search-history";
  const current=JSON.parse(localStorage.getItem(key)||"[]") as {query:string;type:string;time:string}[];
  const next=[{query,type:detectType(query,lang),time:new Date().toISOString()},...current.filter(x=>x.query!==query)].slice(0,12);
  localStorage.setItem(key,JSON.stringify(next));
}

export function PortalHome({lang}:{lang:Lang}){
 const t=portalCopy[lang], navigate=useNavigate();
 const [query,setQuery]=useState(""); const [tool,setTool]=useState<"draw"|"ids"|"advanced"|"history"|null>(null);
 const submit=(e:FormEvent)=>{e.preventDefault();const value=query.trim();if(!value)return;saveHistory(value,lang);const exact=findMolecules(value).filter(m=>[m.id,m.cas,m.inchikey,m.inchi].some(x=>x.toLowerCase()===value.toLowerCase()));if(exact.length===1&&(/^(MS-\d+|\d{2,7}-\d{2}-\d|[A-Z]{14}-[A-Z]{10}-[A-Z]|InChI=)/i.test(value))){navigate(`/molecule/${exact[0].id}/${exact[0].inchikey}`);return}navigate(`/search?q=${encodeURIComponent(value)}`)};
 const examples=lang==="zh"?["乙醇","64-17-5","C8H10N4O2","LFQSCWFLJHTTHZ-UHFFFAOYSA-N"]:["Ethanol","64-17-5","C8H10N4O2","LFQSCWFLJHTTHZ-UHFFFAOYSA-N"];
 return <main>
  <section className="portalHero"><div className="container"><p className="portalKicker">MOLSCIENCE MOLECULAR DATABASE</p><h1>{t.title}</h1><p className="portalLead">{t.lead}</p>
   <form className="portalSearch" onSubmit={submit}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.placeholder} aria-label={t.placeholder}/><button type="button" className="searchTool" onClick={()=>setTool("draw")}><svg className="benzeneIcon" viewBox="0 0 30 30" aria-hidden="true"><polygon points="15,2.5 26,8.8 26,21.2 15,27.5 4,21.2 4,8.8"/><line x1="8" y1="9.4" x2="15" y2="5.4"/><line x1="23" y1="11" x2="23" y2="19"/><line x1="8" y1="20.6" x2="15" y2="24.6"/></svg>{t.draw}</button><button type="button" className="searchTool" onClick={()=>setTool("ids")}><span className="uploadIcon">↑</span>{t.ids}</button><button className="searchSubmit" aria-label={t.search}><span/></button></form>
   <div className="plainExamples"><b>{t.examples}</b>{examples.map(x=><Link key={x} to={`/search?q=${encodeURIComponent(x)}`} onClick={()=>saveHistory(x,lang)}>{x}</Link>)}</div>
   <div className="searchLinks"><button onClick={()=>setTool("advanced")}>{t.advanced} <span>⌄</span></button><button onClick={()=>setTool("history")}>{t.history} <span>↶</span></button><Link to="/about#guide">{t.help} <span>?</span></Link></div>
  </div></section>
  <section className="aboutLinks"><div className="container"><Link to="/about#platform"><small>01</small><h2>{t.about}</h2><p>{lang==="zh"?"了解数据标准化与推荐值方法":"See normalization and recommendation methods"}</p><b>{t.view} →</b></Link><Link to="/about#team"><small>02</small><h2>{t.team}</h2><p>{lang==="zh"?"核心成员资料将在发布前补充":"Core team profiles will be added before release"}</p><b>{t.view} →</b></Link><Link to="/about#guide"><small>03</small><h2>{lang==="zh"?"使用指南":"User guide"}</h2><p>{lang==="zh"?"从检索到实验记录和来源":"From search to records and sources"}</p><b>{t.view} →</b></Link><Link to="/about#contribute"><small>04</small><h2>{t.contribute}</h2><p>{lang==="zh"?"贡献数据、代码、文档或反馈":"Contribute data, code, docs or feedback"}</p><b>{t.view} →</b></Link></div></section>
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
 const t=aboutCopy[lang];
 const roles=lang==="zh"?[["项目方向","平台规划与科研协作"],["数据方向","标准、审核与来源体系"],["工程方向","检索、服务与平台体验"],["开放协作","社区贡献与文档维护"]]:[["Project direction","Planning and research collaboration"],["Data direction","Standards, review and provenance"],["Engineering","Search, services and product experience"],["Open collaboration","Community and documentation"]];
 return <main><section className="aboutHeroEditorial"><div className="container"><p className="portalKicker">ABOUT MOLSCIENCE</p><h1><span>MolScience</span>{t.title}</h1><p>{t.lead}</p><div className="aboutHeroActions"><a href="#platform" className="primaryAction">{lang==="zh"?"了解平台":"Explore the platform"}</a><Link to="/">{lang==="zh"?"开始检索":"Start searching"} →</Link></div></div></section>
 <nav className="aboutPortalNav container">{[["01",t.nav[0],"platform"],["02",t.nav[1],"team"],["03",t.nav[2],"guide"],["04",t.nav[3],"contribute"]].map(([n,label,id])=><a href={`#${id}`} key={id}><span>{n}</span><b>{label}</b><i>→</i></a>)}</nav>
 <div className="aboutEditorial">
  <section id="platform" className="aboutSection container"><div className="aboutSectionTitle"><small>01 / PLATFORM</small><h2>{lang==="zh"?"为什么建设 MolScience":"Why MolScience"}</h2></div><div><p className="aboutLargeCopy">{t.platform}</p><div className="dataPrinciples">{t.flow.map((x,i)=><article key={x}><span>0{i+1}</span><h3>{x}</h3><p>{(lang==="zh"?["连接名称、别名、CAS 与结构标识符。","实验值不脱离温度、压力、相态与方法。","推荐值之外保留可比较的完整记录。","让每条数据回到数据库、文献与贡献记录。"]:["Connect names, aliases, CAS and structure identifiers.","Keep temperature, pressure, phase and method with values.","Preserve comparable records beyond the recommendation.","Link every datum to databases, literature and contributors."])[i]}</p></article>)}</div><div className="phaseRibbon"><b>Phase 1.0</b><span>{lang==="zh"?"检索":"Search"}</span><i>→</i><span>{lang==="zh"?"结果":"Results"}</span><i>→</i><span>{lang==="zh"?"详情":"Details"}</span><i>→</i><span>{lang==="zh"?"实验数据":"Experiments"}</span><i>→</i><span>{lang==="zh"?"来源":"Sources"}</span></div></div></section>
  <section id="team" className="aboutSection container"><div className="aboutSectionTitle"><small>02 / TEAM</small><h2>{t.nav[1]}</h2></div><div><p className="aboutLargeCopy">{t.team}</p><div className="teamRoles">{roles.map(([a,b])=><article key={a}><small>{a}</small><h3>{b}</h3><p>{lang==="zh"?"核心成员信息将在正式发布前更新。":"Core member information will be added before release."}</p></article>)}</div></div></section>
  <section id="guide" className="aboutSection container"><div className="aboutSectionTitle"><small>03 / USER GUIDE</small><h2>{t.nav[2]}</h2></div><div><p className="aboutLargeCopy">{t.guide}</p><ol className="guideRows">{(lang==="zh"?["输入名称或结构标识符","查看匹配结果与命中原因","进入分子详情","比较推荐值与全部实验记录","核查实验条件和来源"]:["Enter a name or structure identifier","Review matches and reasons","Open the molecule detail","Compare recommendations and all experiments","Verify conditions and sources"]).map((x,i)=><li key={x}><span>0{i+1}</span>{x}</li>)}</ol></div></section>
  <section id="contribute" className="aboutSection container"><div className="aboutSectionTitle"><small>04 / CONTRIBUTE</small><h2>{t.nav[3]}</h2></div><div><p className="aboutLargeCopy">{t.contribute}</p><div className="contributeEditorial"><div><h3>{lang==="zh"?"可以贡献":"What to contribute"}</h3><p>{lang==="zh"?"分子记录 · 实验物性 · 谱学数据 · 来源 · 错误修正 · 文档与代码":"Molecules · Experiments · Spectra · Sources · Corrections · Docs and code"}</p></div><div><h3>{lang==="zh"?"审核流程":"Review flow"}</h3><p>{lang==="zh"?"提交 → 格式检查 → 来源核验 → 科研审核 → 发布":"Submit → Format check → Source verification → Scientific review → Publish"}</p></div></div></div></section>
 </div>
 <section id="contact" className="aboutContact"><div className="container"><div><small>CONTACT MOLSCIENCE</small><h2>{lang==="zh"?"合作与联系":"Work with us"}</h2></div><div className="contactInline"><span><small>{t.mail}</small><b>{lang==="zh"?"待公布":"To be announced"}</b></span><span><small>{t.docs}</small><b>{lang==="zh"?"待公布":"To be announced"}</b></span><span><small>{lang==="zh"?"所属机构":"Institution"}</small><b>{lang==="zh"?"待公布":"To be announced"}</b></span></div></div></section></main>
}
