import type { Lang } from "../data";

type MoleculeCacheStatusProps = {
  lang: Lang;
  firstPageOnly?: boolean;
  source: "cache" | "network";
  fetchedAt: number;
  updating: boolean;
  updateFailed: boolean;
  clearState: "idle" | "cleared" | "error";
  onRefresh: () => void;
  onClear: () => void;
};

export function MoleculeCacheStatus({
  lang,
  firstPageOnly = false,
  source,
  fetchedAt,
  updating,
  updateFailed,
  clearState,
  onRefresh,
  onClear,
}: MoleculeCacheStatusProps) {
  const time = new Date(fetchedAt);
  const sourceLabel = source === "cache"
    ? (lang === "zh" ? "本地缓存" : "Local cache")
    : (lang === "zh" ? "在线数据" : "Live data");
  const failureText = source === "cache"
    ? (lang === "zh" ? "更新失败，当前显示缓存数据。" : "Update failed. Cached data is still shown.")
    : (lang === "zh" ? "更新失败，仍显示此前获取的数据。" : "Update failed. Previously fetched data is still shown.");

  return (
    <div className="cacheStatus">
      <div className="cacheStatusText" aria-live="polite" role={updateFailed || clearState === "error" ? "alert" : "status"}>
        <span>{firstPageOnly && (lang === "zh" ? "首批结果：" : "First page: ")}<b>{sourceLabel}</b> · {lang === "zh" ? "获取于" : "Fetched"} <time dateTime={time.toISOString()}>{time.toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}</time></span>
        {updating && <span>{lang === "zh" ? "正在更新…" : "Updating…"}</span>}
        {updateFailed && <span>{failureText}</span>}
        {clearState === "cleared" && <span>{lang === "zh" ? "已清除保存的本地数据缓存；当前页面内容仍保留。" : "Saved local data cache cleared. This page remains visible."}</span>}
        {clearState === "error" && <span>{lang === "zh" ? "暂时无法清除本地数据缓存，请检查浏览器设置后重试。" : "Unable to clear the local data cache. Check browser settings and retry."}</span>}
      </div>
      <div className="cacheStatusActions">
        <button type="button" onClick={onRefresh} disabled={updating}>{lang === "zh" ? "刷新数据" : "Refresh data"}</button>
        <button type="button" onClick={onClear}>{lang === "zh" ? "清除本地数据缓存" : "Clear local data cache"}</button>
      </div>
    </div>
  );
}
