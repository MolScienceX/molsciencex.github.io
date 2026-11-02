import { Link } from "react-router-dom";

import { Lang } from "../../data";
import { useAuth } from "../../features/auth/AuthProvider";

function t(lang: Lang, zh: string, en: string) {
  return lang === "zh" ? zh : en;
}

const permissionLabels: Record<string, [string, string]> = {
  "molecule:read": ["查看分子", "Read molecules"],
  "molecule:create": ["新增分子", "Create molecules"],
  "molecule:update_own": ["修改本人分子", "Update own molecules"],
  "molecule:update": ["修改任意分子", "Update any molecule"],
  "molecule:delete": ["删除分子", "Delete molecules"],
  "molecule:review": ["审核分子", "Review molecules"],
  "user:read": ["查看用户", "Read users"],
  "user:manage": ["管理用户", "Manage users"],
  "role:manage": ["管理角色", "Manage roles"],
  "permission:manage": ["管理权限", "Manage permissions"],
  "audit:read": ["查看审计", "Read audit log"],
};

function formatDate(value: string | null, lang: Lang): string {
  if (!value) return t(lang, "从未", "Never");
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AccountOverview({ lang }: { lang: Lang }) {
  const { me } = useAuth();
  if (!me) return null;

  return <>
    <section className="accountSection">
      <div className="accountSectionHead"><h2>{t(lang, "账户状态", "Account status")}</h2><p>{t(lang, "资料仅本人和管理员按权限可见。", "Your profile is visible to you and to administrators with permission.")}</p></div>
      <dl className="accountFacts">
        <div><dt>{t(lang, "邮箱", "Email")}</dt><dd>{me.email}</dd></div>
        <div><dt>{t(lang, "邮箱验证", "Email verification")}</dt><dd>{me.email_verified_at ? <span className="accountBadge accountBadge--ok">{t(lang, "已验证", "Verified")}</span> : <span className="accountBadge accountBadge--warn">{t(lang, "未验证", "Not verified")}</span>}</dd></div>
        <div><dt>{t(lang, "昵称", "Nickname")}</dt><dd>{me.display_name || <span className="accountEmptyValue">{t(lang, "未设置", "Not set")}</span>}</dd></div>
        <div><dt>{t(lang, "组织", "Organization")}</dt><dd>{me.organization || <span className="accountEmptyValue">{t(lang, "未设置", "Not set")}</span>}</dd></div>
        <div><dt>{t(lang, "账号类型", "Account type")}</dt><dd>{me.account_type === "SERVICE" ? t(lang, "服务账号", "Service") : t(lang, "个人账号", "Human")}</dd></div>
        <div><dt>{t(lang, "当前环境", "Environment")}</dt><dd><code>{me.environment}</code></dd></div>
        <div><dt>{t(lang, "最近登录", "Last sign-in")}</dt><dd>{formatDate(me.last_login_at, lang)}</dd></div>
        <div><dt>{t(lang, "注册时间", "Member since")}</dt><dd>{formatDate(me.created_at, lang)}</dd></div>
      </dl>
    </section>

    <section className="accountSection">
      <div className="accountSectionHead"><h2>{t(lang, "有效权限", "Effective permissions")}</h2><p>{t(lang, "权限由后端实时计算；隐藏页面入口不能替代后端授权。", "Permissions are computed by the backend. Hiding controls never replaces server-side authorization.")}</p></div>
      {me.permissions.length ? <ul className="accountPermissionList">{me.permissions.map(permission => {
        const label = permissionLabels[permission];
        return <li key={permission}><code>{permission}</code><span>{label ? t(lang, label[0], label[1]) : permission}</span></li>;
      })}</ul> : <p className="accountMuted">{t(lang, "当前没有额外业务权限。", "No additional business permissions.")}</p>}
    </section>

    <section className="accountSection">
      <div className="accountSectionHead"><h2>{t(lang, "快捷入口", "Quick links")}</h2></div>
      <div className="accountLinkList">
        <Link to="/account/profile"><strong>{t(lang, "修改个人资料", "Edit profile")}</strong><span>{t(lang, "更新昵称和组织，或清除可选值。", "Update nickname and organization, or clear optional values.")} →</span></Link>
        <Link to="/account/security"><strong>{t(lang, "安全与登录", "Security and sessions")}</strong><span>{t(lang, "修改密码、查看会话、退出全部设备。", "Change password, review sessions and sign out everywhere.")} →</span></Link>
        <Link to="/account/developer"><strong>{t(lang, "只读 API 密钥", "Read-only API keys")}</strong><span>{t(lang, "为程序调用创建和管理个人密钥。", "Create and manage personal credentials for programmatic access.")} →</span></Link>
      </div>
    </section>
  </>;
}
