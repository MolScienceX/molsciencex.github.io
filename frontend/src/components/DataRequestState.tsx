import { Lang } from "../data";

type DataRequestStateProps = {
  lang: Lang;
  kind: "loading" | "error";
  subject: "results" | "detail";
  onRetry?: () => void;
};

export function DataRequestState({
  lang,
  kind,
  subject,
  onRetry,
}: DataRequestStateProps) {
  const loadingTitle = subject === "results"
    ? { zh: "正在读取分子数据…", en: "Loading molecules…" }
    : { zh: "正在读取分子详情…", en: "Loading molecule…" };
  const errorTitle = {
    zh: "暂时无法连接数据服务",
    en: "Unable to reach the data service",
  };
  const errorDescription = {
    zh: "数据仍保存在后端数据库中，请检查服务状态后重试。",
    en: "The data remains in the backend database. Check the service and try again.",
  };
  const title = kind === "loading" ? loadingTitle[lang] : errorTitle[lang];

  return (
    <main
      className={`apiState apiState--${kind}`}
      aria-busy={kind === "loading"}
      aria-live="polite"
      role={kind === "error" ? "alert" : "status"}
    >
      {kind === "loading" ? (
        <div className="pageSkeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <div className="atom" aria-hidden="true"><i /></div>
      )}
      <h1>{title}</h1>
      {kind === "error" && <p>{errorDescription[lang]}</p>}
      {kind === "error" && onRetry && (
        <button type="button" onClick={onRetry}>
          {lang === "zh" ? "重新加载" : "Retry"}
        </button>
      )}
    </main>
  );
}
