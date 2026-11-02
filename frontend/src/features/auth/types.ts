export type AccountStatus = "PENDING" | "ACTIVE" | "LOCKED" | "DISABLED";
export type AccountType = "HUMAN" | "SERVICE";

export type Capabilities = {
  can_read_molecules: boolean;
  can_create_molecules: boolean;
  can_update_own_molecules: boolean;
  can_update_any_molecule: boolean;
  can_review_molecules: boolean;
  can_delete_molecules: boolean;
  can_read_users: boolean;
  can_manage_users: boolean;
  can_manage_roles: boolean;
  can_manage_permissions: boolean;
  can_read_audit: boolean;
};

export type SessionContext = {
  id: string;
  created_at: string;
  expires_at: string;
  remember_me: boolean;
};

export type RegisteredUser = {
  id: string;
  display_name: string | null;
  organization: string | null;
  account_status: AccountStatus;
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  display_name: string | null;
  organization: string | null;
  account_status: AccountStatus;
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Me = CurrentUser & {
  account_type: AccountType;
  permissions: string[];
  capabilities: Capabilities;
  environment: string;
  session: SessionContext;
};

export type LoginResult = {
  access_token: string;
  token_type: "bearer";
  expires_at: string;
  user: CurrentUser;
};

export type Pagination = {
  offset: number;
  limit: number;
  has_more: boolean;
  next_offset: number | null;
};

export type SessionItem = {
  id: string;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  absolute_expires_at: string;
  remember_me: boolean;
  user_agent: string | null;
  ip_address: string | null;
  revoked_at: string | null;
  current: boolean;
};

export type SessionList = {
  items: SessionItem[];
  pagination: Pagination;
};

export type ApiKeyStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export type ApiKeyItem = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  environment: string;
  status: ApiKeyStatus;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  last_used_ip: string | null;
  revoked_at: string | null;
};

export type ApiKeyCreated = ApiKeyItem & { key: string };

export type ApiKeyList = {
  items: ApiKeyItem[];
  pagination: Pagination;
};
