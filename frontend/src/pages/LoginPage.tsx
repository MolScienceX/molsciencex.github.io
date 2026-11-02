import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { PasswordField, errorMessage } from "../AuthViews";
import "../auth.css";
import { Lang } from "../data";
import { useAuth } from "../features/auth/AuthProvider";
import { NetworkError } from "../services/http";

function t(lang: Lang, zh: string, en: string) {
  return lang === "zh" ? zh : en;
}

export function safeNextPath(raw: string | null): string {
  if (!raw) return "/account";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/account";
  }
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return "/account";
    if (["/login", "/register", "/forgot-password", "/reset-password"].includes(url.pathname)) {
      return "/account";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/account";
  }
}

export function LoginPage({ lang }: { lang: Lang }) {
  const { status, error: authError, login, retry } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [networkFailed, setNetworkFailed] = useState(false);
  const [notice] = useState(() => {
    const value = window.sessionStorage.getItem("molscience-auth-notice");
    if (value) window.sessionStorage.removeItem("molscience-auth-notice");
    return value;
  });

  if (status === "checking") {
    return <main className="authPage"><section className="authPanel"><p className="authEyebrow">{t(lang, "个人中心", "Account")}</p><h1>{t(lang, "正在确认登录状态", "Checking your session")}</h1><p className="authDescription" role="status">{t(lang, "请稍候…", "Please wait…")}</p></section></main>;
  }

  if (status === "authenticated") {
    return <Navigate to={next} replace />;
  }

  if (status === "network_error") {
    return <main className="authPage"><section className="authPanel"><p className="authEyebrow">{t(lang, "个人中心", "Account")}</p><h1>{t(lang, "暂时无法连接后端", "The backend is unreachable")}</h1><p className="authDescription">{t(lang, "网络连接失败。你的登录状态没有被清除，请检查网络后重试。", "The network request failed. Your sign-in state was not cleared. Check the network and retry.")}</p><button className="authSubmit authFullButton" type="button" onClick={retry}>{t(lang, "重试", "Retry")}</button></section></main>;
  }

  if (status === "restricted") {
    return <main className="authPage"><section className="authPanel"><p className="authEyebrow">{t(lang, "个人中心", "Account")}</p><h1>{t(lang, "账号访问受限", "Account access restricted")}</h1><p className="authDescription">{t(lang, "该账号当前不能登录个人中心。请联系管理员，或使用邮箱验证流程。", "This account cannot access the account center. Contact an administrator or complete email verification.")}</p><p className="accountCode">Code: {authError?.code || "ACCOUNT_RESTRICTED"}</p><Link className="authSubmit authLinkButton" to="/">{t(lang, "返回首页", "Back to home")}</Link></section></main>;
  }

  const performLogin = async () => {
    setError("");
    setNetworkFailed(false);
    if (!email.trim() || !password) {
      setError(t(lang, "请输入邮箱和密码。", "Enter your email and password."));
      return;
    }
    setBusy(true);
    try {
      await login({
        email: email.trim().toLowerCase(),
        password,
        remember,
      });
      navigate(next, { replace: true });
    } catch (caught) {
      if (caught instanceof NetworkError) setNetworkFailed(true);
      setError(errorMessage(caught, lang));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await performLogin();
  };

  return <main className="authPage"><section className="authPanel"><p className="authEyebrow">{t(lang, "个人中心", "Account")}</p><h1>{t(lang, "登录 MolScience", "Sign in to MolScience")}</h1><p className="authDescription">{t(lang, "使用邮箱和密码登录。登录后会返回你原本要访问的站内页面。", "Sign in with your email and password. You will return to the page you originally requested.")}</p>{params.get("verified") === "1" && <p className="authMessage authMessage--success" role="status">{t(lang, "邮箱验证成功，请登录。", "Email verified. Please sign in.")}</p>}{params.get("changed") === "1" && <p className="authMessage authMessage--success" role="status">{t(lang, "密码已修改，所有旧会话已失效，请使用新密码登录。", "Password changed. All previous sessions were invalidated. Sign in with the new password.")}</p>}{params.get("reset") === "1" && <p className="authMessage authMessage--success" role="status">{t(lang, "密码重置成功，请登录。", "Password reset. Please sign in.")}</p>}{notice === "changed" && <p className="authMessage authMessage--success" role="status">{t(lang, "密码已修改，所有旧会话已失效，请使用新密码登录。", "Password changed. All previous sessions were invalidated. Sign in with the new password.")}</p>}{notice === "signed-out-all" && <p className="authMessage authMessage--success" role="status">{t(lang, "已退出本环境的全部会话。", "All sessions in this environment have been signed out.")}</p>}{notice === "revoked-current" && <p className="authMessage authMessage--success" role="status">{t(lang, "当前会话已撤销，请重新登录。", "The current session was revoked. Sign in again.")}</p>}<form className="authForm" onSubmit={submit} noValidate><label><span>{t(lang, "邮箱", "Email")}</span><input name="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label><PasswordField lang={lang} name="password" label={t(lang, "密码", "Password")} autoComplete="current-password" value={password} onChange={setPassword} labelAction={<Link className="forgotPasswordLink" to="/forgot-password">{t(lang, "忘记密码？", "Forgot password?")}</Link>} /><label className="rememberLogin"><input name="remember" type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /><span>{t(lang, "在此设备上记住登录状态", "Remember me on this device")}</span></label>{error && <p className="authMessage authMessage--error" role="alert">{error}</p>}{networkFailed && <button className="authSecondary authFullButton" type="button" onClick={() => void performLogin()} disabled={busy}>{t(lang, "重试登录", "Retry sign in")}</button>}<button className="authSubmit" disabled={busy}>{busy ? t(lang, "正在登录…", "Signing in…") : t(lang, "登录", "Sign in")}</button></form><p className="authAlternative">{t(lang, "还没有账号？", "New to MolScience?")} <Link to="/register">{t(lang, "立即注册", "Create an account")}</Link></p></section></main>;
}
