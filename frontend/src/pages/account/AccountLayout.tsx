import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { Lang } from "../../data";
import "../../account.css";
import { useAuth } from "../../features/auth/AuthProvider";

function t(lang: Lang, zh: string, en: string) {
  return lang === "zh" ? zh : en;
}

const restrictedMessages: Record<string, [string, string]> = {
  EMAIL_NOT_VERIFIED: [
    "邮箱尚未验证。请先完成邮箱验证，再登录个人中心。",
    "Your email is not verified. Complete verification before signing in.",
  ],
  ACCOUNT_LOCKED: [
    "账号已锁定，请联系管理员处理。",
    "This account is locked. Contact an administrator.",
  ],
  ACCOUNT_DISABLED: [
    "账号已停用，请联系管理员处理。",
    "This account is disabled. Contact an administrator.",
  ],
  ACCOUNT_TYPE_NOT_ALLOWED: [
    "服务账号不能使用网页个人中心，请使用 API 密钥。",
    "Service accounts cannot use the web account center. Use an API key.",
  ],
  ACCOUNT_NOT_ACTIVE: [
    "账号当前不可用，请联系管理员。",
    "This account is not available. Contact an administrator.",
  ],
};

export function AccountLayout({ lang }: { lang: Lang }) {
  const {
    status,
    me,
    error,
    retry,
    logout,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (status === "checking") {
    return <main className="accountPage"><div className="accountShell accountState"><p className="accountEyebrow">{t(lang, "个人中心", "Account")}</p><h1>{t(lang, "正在确认登录状态", "Checking your session")}</h1><p className="accountMuted">{t(lang, "请稍候…", "Please wait…")}</p></div></main>;
  }

  if (status === "network_error") {
    return <main className="accountPage"><div className="accountShell accountState"><p className="accountEyebrow">{t(lang, "个人中心", "Account")}</p><h1>{t(lang, "暂时无法读取登录状态", "Your session could not be checked")}</h1><p className="accountMuted">{t(lang, "网络连接失败。登录状态未被清除，请重试。", "The network request failed. Your sign-in state was not cleared.")}</p><div className="accountActions"><button className="accountButton" type="button" onClick={retry}>{t(lang, "重试", "Retry")}</button><Link className="accountButton accountButton--quiet" to="/login">{t(lang, "前往登录", "Go to sign in")}</Link></div></div></main>;
  }

  if (status === "restricted") {
    const message = restrictedMessages[error?.code || ""] || [
      "账号当前不可用，请联系管理员。",
      "This account is not available. Contact an administrator.",
    ];
    return <main className="accountPage"><div className="accountShell accountState"><p className="accountEyebrow">{t(lang, "个人中心", "Account")}</p><h1>{t(lang, "账号访问受限", "Account access restricted")}</h1><p className="accountMuted">{lang === "zh" ? message[0] : message[1]}</p><p className="accountCode">Code: {error?.code || "ACCOUNT_RESTRICTED"}</p><div className="accountActions"><Link className="accountButton" to="/login">{t(lang, "返回登录", "Back to sign in")}</Link><button className="accountButton accountButton--quiet" type="button" onClick={() => navigate("/")}>{t(lang, "返回首页", "Back to home")}</button></div></div></main>;
  }

  if (status === "guest" || !me) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  const title = me.display_name
    ? t(lang, `${me.display_name}，你好`, `Hello, ${me.display_name}`)
    : t(lang, "你好，欢迎使用 MolScience", "Welcome to MolScience");

  return <main className="accountPage"><div className="accountShell"><div className="accountHeader"><div><p className="accountEyebrow">{t(lang, "个人中心", "Account")}</p><h1>{title}</h1><p className="accountMuted">{me.email} · {me.environment} · {me.account_type === "SERVICE" ? t(lang, "服务账号", "Service account") : t(lang, "个人账号", "Human account")}</p></div><div className="accountHeaderActions"><Link className="accountButton accountButton--quiet" to="/">{t(lang, "返回数据库", "Back to database")}</Link><button className="accountButton accountButton--quiet" type="button" onClick={async () => { try { await logout(); navigate("/login"); } catch { /* network failures keep the session */ } }}>{t(lang, "退出登录", "Sign out")}</button></div></div><div className="accountLayout"><aside className="accountNav" aria-label={t(lang, "个人中心导航", "Account navigation")}><NavLink to="/account" end>{t(lang, "账户概览", "Overview")}</NavLink><NavLink to="/account/profile">{t(lang, "个人资料", "Profile")}</NavLink><NavLink to="/account/security">{t(lang, "安全与登录", "Security & sessions")}</NavLink><NavLink to="/account/developer">{t(lang, "开发者", "Developer")}</NavLink></aside><section className="accountContent"><Outlet /></section></div></div></main>;
}
