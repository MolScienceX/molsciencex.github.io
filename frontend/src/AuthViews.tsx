import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import "./auth.css";
import { Lang } from "./data";
import {
  AuthApiError,
  confirmPasswordReset,
  CurrentUser,
  confirmEmail,
  getCurrentUser,
  loginAccount,
  registerAccount,
  requestPasswordReset,
  resendEmailVerification,
} from "./authApi";

const MIN_NEW_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const PRINTABLE_ASCII = /^[\x20-\x7e]+$/;
const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789012345",
  "admin123",
  "abcdefghijklmnop",
  "letmeinletmeinletmein",
  "molscience",
  "molsciencemolscience",
  "password",
  "passwordpassword",
  "qwerty12",
  "qwertyuiopasdfgh",
]);

function passwordProblem(password: string, lang: Lang): string {
  if (password.length < MIN_NEW_PASSWORD_LENGTH) {
    return lang === "zh"
      ? "密码至少需要 8 个字符。"
      : "The password must contain at least 8 characters.";
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return lang === "zh"
      ? "密码不能超过 128 个字符。"
      : "The password cannot exceed 128 characters.";
  }
  if (!PRINTABLE_ASCII.test(password)) {
    return lang === "zh"
      ? "密码不支持中文、Emoji 或全角字符。"
      : "The password only supports printable ASCII characters.";
  }
  const normalized = password.toLowerCase();
  if (
    COMMON_PASSWORDS.has(normalized)
    || new Set(password).size === 1
    || /^(.{1,4})\1{3,}$/.test(normalized)
  ) {
    return lang === "zh"
      ? "这个密码过于容易猜测，请换一个密码。"
      : "This password is too easy to guess.";
  }
  return "";
}

function passwordStrength(password: string): number {
  if (!password || !PRINTABLE_ASCII.test(password)) return 0;
  const normalized = password.toLowerCase();
  if (
    COMMON_PASSWORDS.has(normalized)
    || new Set(password).size === 1
    || /^(.{1,4})\1{3,}$/.test(normalized)
  ) return 0;

  let score = password.length >= MIN_NEW_PASSWORD_LENGTH ? 1 : 0;
  if (password.length >= 12) score += 1;
  const varieties = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9 ]/.test(password),
    / /.test(password),
  ].filter(Boolean).length;
  if (varieties >= 3) score += 1;
  if (password.length >= 16 && varieties >= 2) score += 1;
  return Math.min(3, score);
}

function PasswordFeedback({
  password,
  lang,
  validationError,
}: {
  password: string;
  lang: Lang;
  validationError?: string;
}) {
  const normalized = password.toLowerCase();
  const hasImmediateProblem = Boolean(password) && (
    !PRINTABLE_ASCII.test(password)
    || password.length > MAX_PASSWORD_LENGTH
    || (password.length >= MIN_NEW_PASSWORD_LENGTH && (
      COMMON_PASSWORDS.has(normalized)
      || new Set(password).size === 1
      || /^(.{1,4})\1{3,}$/.test(normalized)
    ))
  );
  const problem = validationError
    || (hasImmediateProblem ? passwordProblem(password, lang) : "");
  const labels = lang === "zh"
    ? ["较弱", "一般", "良好", "很强"]
    : ["Weak", "Fair", "Good", "Strong"];
  const score = passwordStrength(password);

  return <div className="passwordFeedback" aria-live="polite">
    <p className={problem ? "passwordRequirement passwordRequirement--error" : "passwordRequirement"}>
      {problem || (lang === "zh" ? "至少 8 个字符" : "At least 8 characters")}
    </p>
    {password && !problem && <div className={`passwordStrength passwordStrength--${score}`}>
      <div className="passwordStrengthSegments" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <span className="passwordStrengthLabel">
        <span>{lang === "zh" ? "强度" : "Strength"}</span>
        <strong>{labels[score]}</strong>
      </span>
    </div>}
  </div>;
}

function errorMessage(error: unknown, lang: Lang): string {
  if (error instanceof AuthApiError) {
    const messages: Record<number, [string, string]> = {
      400: ["验证码不正确或已经失效。", "The code is incorrect or has expired."],
      401: ["邮箱或密码不正确。", "The email or password is incorrect."],
      403: ["账号尚未完成邮箱验证。", "This account has not completed email verification."],
      409: ["该邮箱已经注册。", "That email is already registered."],
      503: ["验证码邮件暂时无法发送，请稍后重试。", "The verification email could not be sent. Please try again shortly."],
    };
    if (messages[error.status]) return messages[error.status][lang === "zh" ? 0 : 1];
  }
  return lang === "zh"
    ? "暂时无法完成请求，请稍后重试。"
    : "The request could not be completed. Please try again.";
}

function AuthLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return <main className="authPage"><section className="authPanel"><p className="authEyebrow">{eyebrow}</p><h1>{title}</h1><p className="authDescription">{description}</p>{children}</section></main>;
}

function PasswordField({
  lang,
  name,
  label,
  autoComplete,
  labelAction,
  minLength = 8,
  value,
  onChange,
  invalid = false,
  describedBy,
}: {
  lang: Lang;
  name: string;
  label: string;
  autoComplete: "new-password" | "current-password";
  labelAction?: ReactNode;
  minLength?: number;
  value?: string;
  onChange?: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);
  const actionLabel = lang === "zh"
    ? (visible ? "隐藏密码" : "显示密码")
    : (visible ? "Hide password" : "Show password");

  return <label><span className="passwordLabel"><span>{label}</span>{labelAction}</span><div className="passwordControl"><input name={name} type={visible ? "text" : "password"} minLength={minLength} maxLength={MAX_PASSWORD_LENGTH} autoComplete={autoComplete} required aria-invalid={invalid || undefined} aria-describedby={describedBy} value={value} onChange={event => onChange?.(event.target.value)} /><button type="button" aria-label={actionLabel} title={actionLabel} aria-pressed={visible} onClick={() => setVisible(current => !current)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.75"/>{visible && <path className="passwordEyeSlash" d="m4 4 16 16"/>}</svg></button></div></label>;
}

type RegistrationFieldErrors = Partial<Record<
  "email" | "password" | "password_confirmation",
  string
>>;

export function RegisterView({ lang }: { lang: Lang }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({});

  const clearFieldError = (field: keyof RegistrationFieldErrors) => {
    setFieldErrors(current => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;
    const email = String(data.get("email") || "").trim().toLowerCase();
    const nextFieldErrors: RegistrationFieldErrors = {};

    if (!email) {
      nextFieldErrors.email = lang === "zh" ? "请输入邮箱" : "Enter your email address";
    } else if (!emailInput.validity.valid) {
      nextFieldErrors.email = lang === "zh"
        ? "请输入有效的邮箱地址"
        : "Enter a valid email address";
    }
    const problem = passwordProblem(password, lang);
    if (problem) {
      nextFieldErrors.password = password
        ? problem.replace(/。$/, "")
        : (lang === "zh" ? "请输入密码" : "Enter a password");
    }
    if (!passwordConfirmation) {
      nextFieldErrors.password_confirmation = lang === "zh"
        ? "请再次输入密码"
        : "Enter the password again";
    } else if (password !== passwordConfirmation) {
      nextFieldErrors.password_confirmation = lang === "zh"
        ? "两次输入的密码不一致"
        : "The passwords do not match";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      const firstInvalidField = ([
        "email",
        "password",
        "password_confirmation",
      ] as const).find(field => nextFieldErrors[field]);
      if (firstInvalidField) {
        window.requestAnimationFrame(() => {
          (form.elements.namedItem(firstInvalidField) as HTMLInputElement)?.focus();
        });
      }
      return;
    }

    setFieldErrors({});
    setBusy(true);
    try {
      await registerAccount({
        email,
        password,
        display_name: String(data.get("display_name") || "").trim() || undefined,
      });
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (caught) {
      setError(errorMessage(caught, lang));
    } finally {
      setBusy(false);
    }
  };

  return <AuthLayout eyebrow={lang === "zh" ? "创建账号" : "Create account"} title={lang === "zh" ? "注册 MolScience" : "Join MolScience"} description={lang === "zh" ? "注册后，我们会向你的邮箱发送 6 位验证码。昵称可选，也可以稍后在个人中心设置。" : "We will send a six-digit verification code to your email. A nickname is optional and can be added later."}><form className="authForm" noValidate onSubmit={submit}><label><span>{lang === "zh" ? "昵称（可选）" : "Nickname (optional)"}</span><input name="display_name" maxLength={100} autoComplete="name" /></label><label><span>{lang === "zh" ? "邮箱" : "Email"}</span><input name="email" type="email" autoComplete="email" required aria-invalid={Boolean(fieldErrors.email) || undefined} aria-describedby={fieldErrors.email ? "register-email-error" : undefined} onChange={() => clearFieldError("email")} />{fieldErrors.email && <p id="register-email-error" className="authFieldError">{fieldErrors.email}</p>}</label><div className="passwordFieldGroup"><PasswordField lang={lang} name="password" label={lang === "zh" ? "密码" : "Password"} autoComplete="new-password" minLength={MIN_NEW_PASSWORD_LENGTH} value={password} invalid={Boolean(fieldErrors.password)} describedBy="register-password-feedback" onChange={value => { setPassword(value); clearFieldError("password"); }} /><div id="register-password-feedback"><PasswordFeedback password={password} lang={lang} validationError={fieldErrors.password} /></div></div><div className="passwordFieldGroup"><PasswordField lang={lang} name="password_confirmation" label={lang === "zh" ? "确认密码" : "Confirm password"} autoComplete="new-password" minLength={MIN_NEW_PASSWORD_LENGTH} value={passwordConfirmation} invalid={Boolean(fieldErrors.password_confirmation)} describedBy={fieldErrors.password_confirmation ? "register-password-confirmation-error" : undefined} onChange={value => { setPasswordConfirmation(value); clearFieldError("password_confirmation"); }} />{fieldErrors.password_confirmation ? <p id="register-password-confirmation-error" className="authFieldError">{fieldErrors.password_confirmation}</p> : passwordConfirmation && <p className={password === passwordConfirmation ? "passwordMatch passwordMatch--valid" : "passwordMatch passwordMatch--invalid"}>{password === passwordConfirmation ? (lang === "zh" ? "两次输入一致" : "Passwords match") : (lang === "zh" ? "两次输入的密码不一致" : "Passwords do not match")}</p>}</div>{error && <p className="authMessage authMessage--error" role="alert">{error}</p>}<button className="authSubmit" disabled={busy}>{busy ? (lang === "zh" ? "正在注册…" : "Creating account…") : (lang === "zh" ? "注册并发送验证码" : "Create account")}</button></form><p className="authAlternative">{lang === "zh" ? "已经有账号？" : "Already have an account?"} <Link to="/account">{lang === "zh" ? "前往个人中心" : "Go to account"}</Link></p></AuthLayout>;
}

export function VerifyEmailView({ lang }: { lang: Lang }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get("email") || "";
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(email ? 60 : 0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(
      () => setResendSeconds(seconds => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const code = String(new FormData(event.currentTarget).get("code") || "");
    setBusy(true);
    try {
      await confirmEmail(email, code);
      navigate(`/account?verified=1&email=${encodeURIComponent(email)}`);
    } catch (caught) {
      setError(errorMessage(caught, lang));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    setMessage("");
    setResending(true);
    try {
      await resendEmailVerification(email);
      setResendSeconds(60);
      setMessage(lang === "zh" ? "新的验证码已发送。" : "A new verification code has been sent.");
    } catch (caught) {
      setError(errorMessage(caught, lang));
    } finally {
      setResending(false);
    }
  };

  const description = email
    ? <>{lang === "zh" ? "验证码已发送至" : "The code was sent to"} <strong>{email}</strong><Link className="changeEmailLink" to="/register">{lang === "zh" ? "更换邮箱" : "Change email"}</Link></>
    : (lang === "zh" ? "请从注册页面重新开始。" : "Please restart from the registration page.");
  const resendText = resending
    ? (lang === "zh" ? "正在重新发送…" : "Resending…")
    : resendSeconds > 0
      ? (lang === "zh" ? `没收到？重新发送（${resendSeconds} 秒）` : `Didn't receive it? Resend in ${resendSeconds}s`)
      : (lang === "zh" ? "没收到？重新发送" : "Didn't receive it? Resend");

  return <AuthLayout eyebrow={lang === "zh" ? "验证邮箱" : "Verify email"} title={lang === "zh" ? "输入 6 位验证码" : "Enter your six-digit code"} description={description}><form className="authForm" onSubmit={submit}><label><span>{lang === "zh" ? "验证码" : "Verification code"}</span><input className="verificationCode" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} disabled={!email} required autoFocus /></label><div className="verificationHelp"><span>{lang === "zh" ? "验证码有效期为 10 分钟" : "The code is valid for 10 minutes"}</span><button type="button" onClick={resend} disabled={resending || resendSeconds > 0 || !email}>{resendText}</button></div>{error && <p className="authMessage authMessage--error" role="alert">{error}</p>}{message && <p className="authMessage authMessage--success" role="status">{message}</p>}<button className="authSubmit" disabled={busy || !email}>{busy ? (lang === "zh" ? "正在验证…" : "Verifying…") : (lang === "zh" ? "验证邮箱" : "Verify email")}</button></form></AuthLayout>;
}

export function ForgotPasswordView({ lang }: { lang: Lang }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const email = String(
      new FormData(event.currentTarget).get("email") || "",
    ).trim().toLowerCase();
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (caught) {
      setError(errorMessage(caught, lang));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return <AuthLayout eyebrow={lang === "zh" ? "找回密码" : "Password recovery"} title={lang === "zh" ? "请检查你的邮箱" : "Check your email"} description={lang === "zh" ? "如果该邮箱已注册，你将收到一封密码重置邮件。请同时检查垃圾邮件文件夹。" : "If the email is registered, you will receive a password reset message. Please also check your spam folder."}><p className="authMessage authMessage--success" role="status">{lang === "zh" ? "重置链接将在 15 分钟后失效，并且只能使用一次。" : "The reset link expires in 15 minutes and can only be used once."}</p><button className="authSecondary authFullButton" type="button" onClick={() => setSent(false)}>{lang === "zh" ? "重新填写邮箱" : "Enter another email"}</button><p className="authAlternative"><Link to="/account">{lang === "zh" ? "返回个人中心" : "Back to account"}</Link></p></AuthLayout>;
  }

  return <AuthLayout eyebrow={lang === "zh" ? "找回密码" : "Password recovery"} title={lang === "zh" ? "忘记密码？" : "Forgot your password?"} description={lang === "zh" ? "请输入注册时使用的邮箱，我们会向你发送密码重置链接。" : "Enter the email used for registration and we will send you a password reset link."}><form className="authForm" onSubmit={submit}><label><span>{lang === "zh" ? "邮箱" : "Email"}</span><input name="email" type="email" autoComplete="email" required autoFocus /></label>{error && <p className="authMessage authMessage--error" role="alert">{error}</p>}<button className="authSubmit" disabled={busy}>{busy ? (lang === "zh" ? "正在发送…" : "Sending…") : (lang === "zh" ? "发送重置邮件" : "Send reset email")}</button></form><p className="authAlternative"><Link to="/account">{lang === "zh" ? "返回个人中心" : "Back to account"}</Link></p></AuthLayout>;
}

export function ResetPasswordView({ lang }: { lang: Lang }) {
  const [token] = useState(() => (
    new URLSearchParams(window.location.hash.slice(1)).get("token") || ""
  ));
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const problem = passwordProblem(password, lang);
    if (problem) {
      setError(problem);
      return;
    }
    if (password !== passwordConfirmation) {
      setError(lang === "zh" ? "两次输入的密码不一致。" : "The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await confirmPasswordReset(token, password, passwordConfirmation);
      clearStoredSession();
      setComplete(true);
    } catch (caught) {
      if (caught instanceof AuthApiError && caught.status === 400) {
        setError(lang === "zh" ? "重置链接无效或已经失效，请重新申请。" : "The reset link is invalid or has expired. Request a new one.");
      } else if (caught instanceof AuthApiError && caught.status === 422) {
        setError(lang === "zh" ? "新密码不符合要求，或与当前密码相同。" : "The new password is not allowed or matches the current password.");
      } else {
        setError(errorMessage(caught, lang));
      }
    } finally {
      setBusy(false);
    }
  };

  if (complete) {
    return <AuthLayout eyebrow={lang === "zh" ? "密码已更新" : "Password updated"} title={lang === "zh" ? "请重新登录" : "Sign in again"} description={lang === "zh" ? "为了保护你的账号，其他设备上的登录状态已经失效。请使用新密码重新登录。" : "For your protection, existing sessions have been invalidated. Sign in with your new password."}><Link className="authSubmit authLinkButton" to="/account">{lang === "zh" ? "前往个人中心" : "Go to account"}</Link></AuthLayout>;
  }

  if (!token) {
    return <AuthLayout eyebrow={lang === "zh" ? "重置密码" : "Reset password"} title={lang === "zh" ? "重置链接无效" : "Invalid reset link"} description={lang === "zh" ? "该链接可能已经过期、使用过或不完整。你可以重新申请密码重置邮件。" : "This link may have expired, been used, or be incomplete. Request a new password reset email."}><Link className="authSubmit authLinkButton" to="/forgot-password">{lang === "zh" ? "重新发送" : "Request another link"}</Link></AuthLayout>;
  }

  return <AuthLayout eyebrow={lang === "zh" ? "重置密码" : "Reset password"} title={lang === "zh" ? "设置新密码" : "Set a new password"} description={lang === "zh" ? "重置链接将在 15 分钟后失效，并且只能使用一次。" : "The reset link expires in 15 minutes and can only be used once."}><form className="authForm" onSubmit={submit}><div className="passwordFieldGroup"><PasswordField lang={lang} name="new_password" label={lang === "zh" ? "新密码" : "New password"} autoComplete="new-password" minLength={MIN_NEW_PASSWORD_LENGTH} value={password} onChange={setPassword} /><PasswordFeedback password={password} lang={lang} /></div><div className="passwordFieldGroup"><PasswordField lang={lang} name="new_password_confirmation" label={lang === "zh" ? "确认新密码" : "Confirm new password"} autoComplete="new-password" minLength={MIN_NEW_PASSWORD_LENGTH} value={passwordConfirmation} onChange={setPasswordConfirmation} />{passwordConfirmation && <p className={password === passwordConfirmation ? "passwordMatch passwordMatch--valid" : "passwordMatch passwordMatch--invalid"}>{password === passwordConfirmation ? (lang === "zh" ? "两次输入一致" : "Passwords match") : (lang === "zh" ? "两次输入的密码不一致" : "Passwords do not match")}</p>}</div>{error && <p className="authMessage authMessage--error" role="alert">{error}</p>}<button className="authSubmit" disabled={busy}>{busy ? (lang === "zh" ? "正在更新…" : "Updating…") : (lang === "zh" ? "更新密码" : "Update password")}</button></form><p className="authAlternative"><Link to="/forgot-password">{lang === "zh" ? "重新申请重置链接" : "Request another reset link"}</Link></p></AuthLayout>;
}

const ACCESS_TOKEN_KEY = "molscience-access-token";

function clearStoredSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem("molscience-current-user");
  sessionStorage.removeItem("molscience-current-user");
}

function storeSession(token: string, user: CurrentUser, remember: boolean) {
  clearStoredSession();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, token);
  storage.setItem("molscience-current-user", JSON.stringify(user));
}

export function AccountView({ lang }: { lang: Lang }) {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"checking" | "guest" | "member">("checking");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const verified = params.get("verified") === "1";

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
      || sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setStatus("guest");
      return;
    }

    let active = true;
    getCurrentUser(token)
      .then(currentUser => {
        if (!active) return;
        setUser(currentUser);
        setStatus("member");
      })
      .catch(caught => {
        if (!active) return;
        if (caught instanceof AuthApiError && caught.status === 401) {
          clearStoredSession();
        } else {
          setError(lang === "zh" ? "暂时无法读取登录状态，请重新登录。" : "Your session could not be checked. Please sign in again.");
        }
        setStatus("guest");
      });

    return () => {
      active = false;
    };
  }, [lang]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await loginAccount(
        String(data.get("email") || "").trim().toLowerCase(),
        String(data.get("password") || ""),
      );
      storeSession(
        result.access_token,
        result.user,
        data.get("remember") === "on",
      );
      setUser(result.user);
      setStatus("member");
    } catch (caught) {
      setError(errorMessage(caught, lang));
    } finally {
      setBusy(false);
    }
  };

  if (status === "checking") {
    return <AuthLayout eyebrow={lang === "zh" ? "个人中心" : "Account"} title={lang === "zh" ? "正在读取登录状态" : "Checking your session"} description={lang === "zh" ? "请稍候，我们正在确认你的账号信息。" : "Please wait while we confirm your account."}><p className="authMessage" role="status">{lang === "zh" ? "正在加载…" : "Loading…"}</p></AuthLayout>;
  }

  if (status === "member" && user) {
    const title = user.display_name
      ? (lang === "zh" ? `${user.display_name}，你好` : `Hello, ${user.display_name}`)
      : (lang === "zh" ? "你好，欢迎使用 MolScience" : "Welcome to MolScience");
    return <AuthLayout eyebrow={lang === "zh" ? "个人中心" : "Account"} title={title} description={lang === "zh" ? "你已登录 MolScience，可以在这里查看和管理账号。" : "You are signed in to MolScience. View and manage your account here."}><dl className="accountDetails"><div><dt>{lang === "zh" ? "邮箱" : "Email"}</dt><dd>{user.email}</dd></div><div><dt>{lang === "zh" ? "昵称" : "Nickname"}</dt><dd>{user.display_name || (lang === "zh" ? "未设置" : "Not set")}</dd></div><div><dt>{lang === "zh" ? "邮箱状态" : "Email status"}</dt><dd>{user.email_verified_at ? (lang === "zh" ? "已验证" : "Verified") : (lang === "zh" ? "待验证" : "Pending verification")}</dd></div>{user.organization && <div><dt>{lang === "zh" ? "组织" : "Organization"}</dt><dd>{user.organization}</dd></div>}</dl><button className="authSecondary accountLogout" type="button" onClick={() => { clearStoredSession(); setUser(null); setStatus("guest"); }}>{lang === "zh" ? "退出登录" : "Sign out"}</button></AuthLayout>;
  }

  return <AuthLayout eyebrow={lang === "zh" ? "个人中心" : "Account"} title={lang === "zh" ? "登录 MolScience" : "Sign in to MolScience"} description={lang === "zh" ? "使用邮箱和密码登录。首次使用可在下方注册账号。" : "Sign in with your email and password, or create an account below."}>{verified && <p className="authMessage authMessage--success" role="status">{lang === "zh" ? "邮箱验证成功，现在可以登录。" : "Email verified. You can now sign in."}</p>}<form className="authForm" onSubmit={submit}><label><span>{lang === "zh" ? "邮箱" : "Email"}</span><input name="email" type="email" defaultValue={params.get("email") || ""} autoComplete="email" required /></label><PasswordField lang={lang} name="password" label={lang === "zh" ? "密码" : "Password"} autoComplete="current-password" labelAction={<Link className="forgotPasswordLink" to="/forgot-password">{lang === "zh" ? "忘记密码？" : "Forgot password?"}</Link>} /><label className="rememberLogin"><input name="remember" type="checkbox" /><span>{lang === "zh" ? "在此设备上记住登录状态" : "Remember me on this device"}</span></label>{error && <p className="authMessage authMessage--error" role="alert">{error}</p>}<button className="authSubmit" disabled={busy}>{busy ? (lang === "zh" ? "正在登录…" : "Signing in…") : (lang === "zh" ? "登录" : "Sign in")}</button></form><p className="authAlternative">{lang === "zh" ? "还没有账号？" : "New to MolScience?"} <Link to="/register">{lang === "zh" ? "立即注册" : "Create an account"}</Link></p></AuthLayout>;
}
