import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PasswordFeedback, PasswordField, passwordProblem } from "../../AuthViews";
import { Lang } from "../../data";
import { useAuth } from "../../features/auth/AuthProvider";
import { SessionItem } from "../../features/auth/types";
import { ApiError, NetworkError } from "../../services/http";

function t(lang: Lang, zh: string, en: string) {
  return lang === "zh" ? zh : en;
}

function formatDate(value: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function describeDevice(userAgent: string | null, lang: Lang): string {
  if (!userAgent) return t(lang, "未知设备", "Unknown device");
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Firefox\//.test(userAgent)
      ? "Firefox"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : t(lang, "浏览器", "Browser");
  const platform = /Macintosh|Mac OS X/.test(userAgent)
    ? "macOS"
    : /Windows/.test(userAgent)
      ? "Windows"
      : /iPhone|iPad/.test(userAgent)
        ? "iOS"
        : /Android/.test(userAgent)
          ? "Android"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "";
  return [browser, platform].filter(Boolean).join(" · ");
}

export function SecurityPage({ lang }: { lang: Lang }) {
  const {
    me,
    changePassword,
    listSessions,
    revokeSession,
    logoutAll,
    signOutLocally,
  } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsState, setSessionsState] = useState<"loading" | "ready" | "error">("loading");
  const [sessionsError, setSessionsError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const loadSessions = async () => {
    setSessionsState("loading");
    setSessionsError("");
    try {
      const result = await listSessions();
      setSessions(result.items);
      setSessionsState("ready");
    } catch (caught) {
      setSessionsError(
        caught instanceof NetworkError
          ? t(lang, "网络连接失败，请重试。", "The network request failed. Try again.")
          : t(lang, "暂时无法读取会话列表。", "Sessions could not be loaded."),
      );
      setSessionsState("error");
    }
  };

  useEffect(() => {
    void loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    if (!currentPassword) {
      setPasswordError(t(lang, "请输入当前密码。", "Enter your current password."));
      return;
    }
    const problem = passwordProblem(newPassword, lang);
    if (problem) {
      setPasswordError(problem);
      return;
    }
    if (newPassword !== confirmation) {
      setPasswordError(t(lang, "两次输入的新密码不一致。", "The new passwords do not match."));
      return;
    }
    setPasswordBusy(true);
    window.sessionStorage.setItem("molscience-auth-notice", "changed");
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmation,
      });
      navigate("/login?changed=1", { replace: true });
    } catch (caught) {
      window.sessionStorage.removeItem("molscience-auth-notice");
      if (caught instanceof ApiError) {
        if (caught.code === "INVALID_CURRENT_PASSWORD") {
          setPasswordError(t(lang, "当前密码不正确。", "The current password is incorrect."));
        } else if (caught.code === "PASSWORD_REUSED") {
          setPasswordError(t(lang, "新密码不能与当前密码相同。", "The new password must differ from the current one."));
        } else if (caught.status === 422) {
          setPasswordError(t(lang, "新密码不符合安全要求。", "The new password does not meet the policy."));
        } else {
          setPasswordError(t(lang, "密码修改失败，请稍后重试。", "The password could not be changed. Try again."));
        }
      } else if (caught instanceof NetworkError) {
        setPasswordError(t(lang, "网络连接失败，密码未修改。", "The network request failed. The password was not changed."));
      } else {
        setPasswordError(t(lang, "密码修改失败，请稍后重试。", "The password could not be changed. Try again."));
      }
    } finally {
      setPasswordBusy(false);
    }
  };

  const revoke = async (session: SessionItem) => {
    const label = session.current
      ? t(lang, "撤销当前会话将立即退出登录。继续？", "Revoking the current session signs you out immediately. Continue?")
      : t(lang, "确认撤销该设备的登录会话？", "Revoke this device session?");
    if (!window.confirm(label)) return;
    setRevoking(session.id);
    try {
      await revokeSession(session.id);
      if (session.current) {
        window.sessionStorage.setItem("molscience-auth-notice", "revoked-current");
        signOutLocally();
        navigate("/login", { replace: true });
        return;
      }
      await loadSessions();
    } catch (caught) {
      setSessionsError(
        caught instanceof NetworkError
          ? t(lang, "网络连接失败，会话未撤销。", "The network request failed. The session was not revoked.")
          : t(lang, "会话撤销失败，请重试。", "The session could not be revoked. Try again."),
      );
    } finally {
      setRevoking(null);
    }
  };

  const signOutEverywhere = async () => {
    if (!window.confirm(t(lang, "将撤销本环境下的全部会话，包括当前会话。继续？", "This revokes every session in this environment, including the current one. Continue?"))) return;
    setLoggingOutAll(true);
    window.sessionStorage.setItem("molscience-auth-notice", "signed-out-all");
    try {
      await logoutAll();
      navigate("/login", { replace: true });
    } catch (caught) {
      window.sessionStorage.removeItem("molscience-auth-notice");
      setSessionsError(
        caught instanceof NetworkError
          ? t(lang, "网络连接失败，未能退出全部会话。", "The network request failed. Sessions were not revoked.")
          : t(lang, "退出全部会话失败，请重试。", "Signing out everywhere failed. Try again."),
      );
    } finally {
      setLoggingOutAll(false);
    }
  };

  return <>
    <section className="accountSection">
      <div className="accountSectionHead"><h2>{t(lang, "修改密码", "Change password")}</h2><p>{t(lang, "修改成功后，所有环境中的已登录会话都会失效，需要使用新密码重新登录。", "After a successful change, all sessions in every environment are invalidated and you must sign in with the new password.")}</p></div>
      <form className="accountForm" onSubmit={submitPassword} noValidate>
        <PasswordField lang={lang} name="current_password" label={t(lang, "当前密码", "Current password")} autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} />
        <div className="passwordFieldGroup"><PasswordField lang={lang} name="new_password" label={t(lang, "新密码", "New password")} autoComplete="new-password" value={newPassword} onChange={setNewPassword} /><PasswordFeedback password={newPassword} lang={lang} /></div>
        <div className="passwordFieldGroup"><PasswordField lang={lang} name="new_password_confirmation" label={t(lang, "确认新密码", "Confirm new password")} autoComplete="new-password" value={confirmation} onChange={setConfirmation} />{confirmation && newPassword !== confirmation && <p className="passwordMatch passwordMatch--invalid">{t(lang, "两次输入的密码不一致", "Passwords do not match")}</p>}</div>
        {passwordError && <p className="accountMessage accountMessage--error" role="alert">{passwordError}</p>}
        <div className="accountActions"><button className="accountButton" type="submit" disabled={passwordBusy}>{passwordBusy ? t(lang, "正在修改…", "Changing…") : t(lang, "修改密码", "Change password")}</button></div>
      </form>
    </section>

    <section className="accountSection">
      <div className="accountSectionHead"><h2>{t(lang, "登录会话", "Sign-in sessions")}</h2><p>{t(lang, `这里仅显示当前环境（${me?.environment ?? "local"}）的会话。撤销后，该会话已签发的访问令牌会立即失效。`, `Only sessions in environment ${me?.environment ?? "local"} are shown. Revoking a session immediately invalidates its issued access tokens.`)}</p></div>
      {sessionsState === "loading" && <p className="accountMuted" role="status">{t(lang, "正在加载会话…", "Loading sessions…")}</p>}
      {sessionsState === "error" && <div className="accountInlineError" role="alert"><p>{sessionsError}</p><button className="accountButton accountButton--quiet" type="button" onClick={loadSessions}>{t(lang, "重试", "Retry")}</button></div>}
      {sessionsState === "ready" && <ul className="accountSessionList">{sessions.map(session => <li key={session.id} className={session.current ? "isCurrent" : ""}><div className="accountSessionMain"><strong>{describeDevice(session.user_agent, lang)}{session.current && <span className="accountBadge accountBadge--ok">{t(lang, "当前会话", "This device")}</span>}{session.remember_me && <span className="accountBadge">{t(lang, "记住登录", "Remembered")}</span>}</strong><small>{session.ip_address || t(lang, "未知 IP", "Unknown IP")} · {t(lang, "创建于", "Created")} {formatDate(session.created_at, lang)}</small><small>{t(lang, "最近使用", "Last used")} {formatDate(session.last_used_at, lang)} · {t(lang, "到期", "Expires")} {formatDate(session.expires_at, lang)}</small></div><button className="accountButton accountButton--danger" type="button" disabled={revoking === session.id} onClick={() => void revoke(session)}>{revoking === session.id ? t(lang, "撤销中…", "Revoking…") : t(lang, "撤销", "Revoke")}</button></li>)}</ul>}
      {sessionsState === "ready" && sessions.length === 0 && <p className="accountMuted">{t(lang, "当前没有可用会话。", "No active sessions.")}</p>}
      {sessionsError && sessionsState === "ready" && <p className="accountMessage accountMessage--error" role="alert">{sessionsError}</p>}
      <div className="accountActions"><button className="accountButton accountButton--danger" type="button" disabled={loggingOutAll} onClick={() => void signOutEverywhere()}>{loggingOutAll ? t(lang, "正在退出…", "Signing out…") : t(lang, "退出本环境全部会话", "Sign out everywhere in this environment")}</button></div>
    </section>
  </>;
}
