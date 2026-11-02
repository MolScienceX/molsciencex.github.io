import { FormEvent, useEffect, useState } from "react";

import { API_BASE_URL } from "../../api/config";
import { Lang } from "../../data";
import { useAuth } from "../../features/auth/AuthProvider";
import { ApiKeyCreated, ApiKeyItem } from "../../features/auth/types";
import { ApiError, NetworkError } from "../../services/http";

function t(lang: Lang, zh: string, en: string) {
  return lang === "zh" ? zh : en;
}

function formatDate(value: string | null, lang: Lang): string {
  if (!value) return t(lang, "从未", "Never");
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const statusLabels: Record<string, [string, string]> = {
  ACTIVE: ["有效", "Active"],
  EXPIRED: ["已过期", "Expired"],
  REVOKED: ["已撤销", "Revoked"],
};

export function DeveloperPage({ lang }: { lang: Lang }) {
  const { listApiKeys, createApiKey, revokeApiKey } = useAuth();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    setState("loading");
    setLoadError("");
    try {
      const result = await listApiKeys();
      setKeys(result.items);
      setState("ready");
    } catch (caught) {
      setLoadError(
        caught instanceof NetworkError
          ? t(lang, "网络连接失败，请重试。", "The network request failed. Try again.")
          : t(lang, "暂时无法读取密钥列表。", "API keys could not be loaded."),
      );
      setState("error");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setCreated(null);
    setCopied(false);
    if (!name.trim()) {
      setFormError(t(lang, "请输入密钥名称。", "Enter a name for the key."));
      return;
    }
    if (!password) {
      setFormError(t(lang, "请输入当前密码以确认身份。", "Enter your current password to confirm your identity."));
      return;
    }
    setCreating(true);
    try {
      const result = await createApiKey({
        name: name.trim(),
        current_password: password,
        expires_in_days: expiresInDays,
      });
      setCreated(result);
      setPassword("");
      setName("");
      await load();
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.code === "INVALID_CURRENT_PASSWORD") {
          setFormError(t(lang, "当前密码不正确。", "The current password is incorrect."));
        } else if (caught.code === "RATE_LIMITED") {
          setFormError(t(lang, "创建过于频繁，请稍后重试。", "Too many keys created recently. Try again later."));
        } else {
          setFormError(t(lang, "密钥创建失败，请检查输入后重试。", "The key could not be created. Check the form and try again."));
        }
      } else if (caught instanceof NetworkError) {
        setFormError(t(lang, "网络连接失败，请重试。", "The network request failed. Try again."));
      } else {
        setFormError(t(lang, "密钥创建失败，请稍后重试。", "The key could not be created. Try again."));
      }
    } finally {
      setCreating(false);
    }
  };

  const copyKey = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const revoke = async (key: ApiKeyItem) => {
    if (!window.confirm(t(lang, `确认撤销密钥“${key.name}”？撤销后无法恢复。`, `Revoke “${key.name}”? This cannot be undone.`))) return;
    setRevoking(key.id);
    try {
      await revokeApiKey(key.id);
      if (created?.id === key.id) setCreated(null);
      await load();
    } catch (caught) {
      setLoadError(
        caught instanceof NetworkError
          ? t(lang, "网络连接失败，密钥未撤销。", "The network request failed. The key was not revoked.")
          : t(lang, "密钥撤销失败，请重试。", "The key could not be revoked. Try again."),
      );
    } finally {
      setRevoking(null);
    }
  };

  return <>
    <section className="accountSection">
      <div className="accountSectionHead"><h2>{t(lang, "只读 API 密钥", "Read-only API keys")}</h2><p>{t(lang, "密钥只能读取公开分子及性质数据。它不能访问账号、会话、角色、授权或密钥管理接口，也不能执行写入操作。", "Keys can only read public molecule and property data. They cannot access account, session, role, authorization or key-management endpoints, and cannot perform writes.")}</p></div>
      <details className="accountDisclosure">
        <summary>{t(lang, "调用示例与约束", "Usage example and constraints")}</summary>
        <div className="accountCodeBlock"><pre>{`curl "${API_BASE_URL}/molecules?limit=2" \\
  -H "X-API-Key: YOUR_API_KEY"`}</pre></div>
        <ul className="accountPlainList">
          <li>{t(lang, "凭据通过 X-API-Key 请求头传递，不要放在 URL 或前端代码中。", "Send the credential in the X-API-Key header, never in a URL or frontend code.")}</li>
          <li>{t(lang, "匿名公开查询仍然可用；提供无效密钥不会退回匿名访问。", "Anonymous public queries still work. An invalid key is rejected instead of silently falling back to anonymous access.")}</li>
          <li>{t(lang, "每个密钥独立限流，响应包含 X-RateLimit-* 与 Retry-After。", "Each key has its own rate limit; responses include X-RateLimit-* and Retry-After.")}</li>
          <li>{t(lang, "密码重置会撤销该账号的全部密钥。主动改密保留现有密钥。", "A password reset revokes every key for the account. An authenticated password change keeps existing keys.")}</li>
        </ul>
      </details>
    </section>

    <section className="accountSection">
      <div className="accountSectionHead"><h2>{t(lang, "创建密钥", "Create a key")}</h2><p>{t(lang, "创建前需要再次输入当前密码。完整密钥只在创建成功时展示一次。", "Confirm with your current password. The full key is shown only once after creation.")}</p></div>
      <form className="accountForm accountForm--inline" onSubmit={submit} noValidate>
        <label><span>{t(lang, "名称", "Name")}</span><input name="name" value={name} maxLength={100} placeholder={t(lang, "例如：本地脚本", "For example: local script")} onChange={event => setName(event.target.value)} /></label>
        <label><span>{t(lang, "有效期", "Expires in")}</span><select value={expiresInDays} onChange={event => setExpiresInDays(Number(event.target.value))}><option value={30}>{t(lang, "30 天", "30 days")}</option><option value={90}>{t(lang, "90 天", "90 days")}</option><option value={365}>{t(lang, "365 天", "365 days")}</option></select></label>
        <label><span>{t(lang, "当前密码", "Current password")}</span><input name="current_password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
        {formError && <p className="accountMessage accountMessage--error" role="alert">{formError}</p>}
        <div className="accountActions"><button className="accountButton" type="submit" disabled={creating}>{creating ? t(lang, "正在创建…", "Creating…") : t(lang, "创建只读密钥", "Create read-only key")}</button></div>
      </form>
      {created && <div className="accountSecret" role="status"><div className="accountSecretHead"><strong>{t(lang, "密钥已创建，仅显示一次", "Key created. Copy it now.")}</strong><span>{created.name} · {created.expires_at ? formatDate(created.expires_at, lang) : ""}</span></div><div className="accountSecretValue"><code>{created.key}</code><button className="accountButton" type="button" onClick={() => void copyKey()}>{copied ? t(lang, "已复制", "Copied") : t(lang, "复制", "Copy")}</button></div><p>{t(lang, "离开或刷新页面后将无法再次查看完整密钥。数据库只保存摘要。", "You cannot view the full key again after leaving or refreshing. Only a digest is stored.")}</p></div>}
    </section>

    <section className="accountSection">
      <div className="accountSectionHead"><h2>{t(lang, "我的密钥", "My keys")}</h2><p>{t(lang, "按创建时间倒序显示当前环境的密钥。", "Keys in the current environment, newest first.")}</p></div>
      {state === "loading" && <p className="accountMuted" role="status">{t(lang, "正在加载密钥…", "Loading keys…")}</p>}
      {state === "error" && <div className="accountInlineError" role="alert"><p>{loadError}</p><button className="accountButton accountButton--quiet" type="button" onClick={() => void load()}>{t(lang, "重试", "Retry")}</button></div>}
      {state === "ready" && keys.length === 0 && <p className="accountMuted">{t(lang, "还没有创建 API 密钥。", "No API keys yet.")}</p>}
      {state === "ready" && keys.length > 0 && <ul className="accountKeyList">{keys.map(key => { const status = statusLabels[key.status] || statusLabels.ACTIVE; return <li key={key.id}><div className="accountKeyMain"><div><strong>{key.name}</strong><span className={`accountBadge ${key.status === "ACTIVE" ? "accountBadge--ok" : key.status === "EXPIRED" ? "accountBadge--warn" : "accountBadge--muted"}`}>{t(lang, status[0], status[1])}</span></div><code>{key.prefix}…</code><small>{key.scopes.join(", ")} · {t(lang, "创建", "Created")} {formatDate(key.created_at, lang)} · {t(lang, "到期", "Expires")} {formatDate(key.expires_at, lang)}</small><small>{t(lang, "最近使用", "Last used")} {formatDate(key.last_used_at, lang)}{key.last_used_ip ? ` · ${key.last_used_ip}` : ""}</small></div>{key.status !== "REVOKED" && <button className="accountButton accountButton--danger" type="button" disabled={revoking === key.id} onClick={() => void revoke(key)}>{revoking === key.id ? t(lang, "撤销中…", "Revoking…") : t(lang, "撤销", "Revoke")}</button>}</li>; })}</ul>}
      {loadError && state === "ready" && <p className="accountMessage accountMessage--error" role="alert">{loadError}</p>}
    </section>
  </>;
}
