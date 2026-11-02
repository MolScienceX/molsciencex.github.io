import { FormEvent, useEffect, useMemo, useState } from "react";

import { Lang } from "../../data";
import { useAuth } from "../../features/auth/AuthProvider";
import { ApiError, NetworkError } from "../../services/http";

function t(lang: Lang, zh: string, en: string) {
  return lang === "zh" ? zh : en;
}

function normalize(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function messageFor(error: unknown, lang: Lang): string {
  if (error instanceof NetworkError) {
    return t(lang, "网络连接失败，未保存任何修改。请重试。", "The network request failed. Nothing was saved. Try again.");
  }
  if (error instanceof ApiError) {
    if (error.status === 401) return t(lang, "登录状态已失效，请重新登录。", "Your session expired. Sign in again.");
    if (error.status === 403) return t(lang, "没有修改该资料的权限。", "You are not allowed to edit this profile.");
    if (error.status === 422) return t(lang, "输入内容不符合要求，请检查字段。", "Some fields are invalid. Check the form.");
    if (error.code === "RATE_LIMITED") return t(lang, "操作过于频繁，请稍后重试。", "Too many attempts. Try again shortly.");
  }
  return t(lang, "保存失败，请稍后重试。", "The profile could not be saved. Try again.");
}

export function ProfilePage({ lang }: { lang: Lang }) {
  const { me, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(me?.display_name ?? "");
  const [organization, setOrganization] = useState(me?.organization ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setDisplayName(me?.display_name ?? "");
    setOrganization(me?.organization ?? "");
  }, [me?.display_name, me?.organization]);

  const dirty = useMemo(() => (
    normalize(displayName) !== (me?.display_name ?? null)
    || normalize(organization) !== (me?.organization ?? null)
  ), [displayName, me?.display_name, me?.organization, organization]);

  if (!me) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});
    if (displayName.trim().length > 100) {
      setFieldErrors({ display_name: t(lang, "昵称不能超过 100 个字符。", "The nickname cannot exceed 100 characters.") });
      return;
    }
    if (organization.trim().length > 255) {
      setFieldErrors({ organization: t(lang, "组织名称不能超过 255 个字符。", "The organization cannot exceed 255 characters.") });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        display_name: normalize(displayName),
        organization: normalize(organization),
      });
      setSuccess(t(lang, "个人资料已保存。", "Your profile has been saved."));
    } catch (caught) {
      if (caught instanceof ApiError && caught.fields.length) {
        setFieldErrors(Object.fromEntries(caught.fields.map(field => [field.field, field.message])));
      }
      setError(messageFor(caught, lang));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDisplayName(me.display_name ?? "");
    setOrganization(me.organization ?? "");
    setError("");
    setSuccess("");
    setFieldErrors({});
  };

  return <>
    <section className="accountSection">
      <div className="accountSectionHead"><h2>{t(lang, "个人资料", "Profile")}</h2><p>{t(lang, "仅昵称和组织可由本人修改。角色、账号状态、邮箱验证状态、账号类型和内部编号由系统托管。", "Only nickname and organization are editable. Roles, account status, email verification, account type and internal identifiers are managed by the platform.")}</p></div>
      <form className="accountForm" onSubmit={submit} noValidate>
        <label>
          <span>{t(lang, "昵称", "Nickname")}</span>
          <div className="accountInputRow">
            <input
              name="display_name"
              value={displayName}
              maxLength={100}
              autoComplete="nickname"
              aria-invalid={Boolean(fieldErrors.display_name) || undefined}
              aria-describedby={fieldErrors.display_name ? "display-name-error" : undefined}
              onChange={event => { setDisplayName(event.target.value); setSuccess(""); setFieldErrors(current => ({ ...current, display_name: "" })); }}
            />
            <button className="accountButton accountButton--quiet" type="button" onClick={() => { setDisplayName(""); setSuccess(""); }}>{t(lang, "清除", "Clear")}</button>
          </div>
          <small>{t(lang, "留空表示不展示昵称。", "Leave empty to hide the nickname.")}</small>
          {fieldErrors.display_name && <p className="accountFieldError" id="display-name-error">{fieldErrors.display_name}</p>}
        </label>
        <label>
          <span>{t(lang, "组织", "Organization")}</span>
          <div className="accountInputRow">
            <input
              name="organization"
              value={organization}
              maxLength={255}
              autoComplete="organization"
              aria-invalid={Boolean(fieldErrors.organization) || undefined}
              aria-describedby={fieldErrors.organization ? "organization-error" : undefined}
              onChange={event => { setOrganization(event.target.value); setSuccess(""); setFieldErrors(current => ({ ...current, organization: "" })); }}
            />
            <button className="accountButton accountButton--quiet" type="button" onClick={() => { setOrganization(""); setSuccess(""); }}>{t(lang, "清除", "Clear")}</button>
          </div>
          <small>{t(lang, "可选。留空表示不展示组织。", "Optional. Leave empty to hide the organization.")}</small>
          {fieldErrors.organization && <p className="accountFieldError" id="organization-error">{fieldErrors.organization}</p>}
        </label>
        <label>
          <span>{t(lang, "邮箱", "Email")}</span>
          <input value={me.email} readOnly disabled />
          <small>{t(lang, "本轮不开放邮箱变更。", "Email changes are not available in this release.")}</small>
        </label>
        {error && <p className="accountMessage accountMessage--error" role="alert">{error}</p>}
        {success && <p className="accountMessage accountMessage--success" role="status">{success}</p>}
        <div className="accountActions">
          <button className="accountButton" type="submit" disabled={!dirty || saving}>{saving ? t(lang, "正在保存…", "Saving…") : t(lang, "保存修改", "Save changes")}</button>
          <button className="accountButton accountButton--quiet" type="button" onClick={cancel} disabled={!dirty || saving}>{t(lang, "撤销未保存修改", "Discard changes")}</button>
        </div>
      </form>
    </section>
  </>;
}
