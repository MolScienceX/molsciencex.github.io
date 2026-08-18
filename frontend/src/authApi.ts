import { API_BASE_URL } from "./api/config";

export class AuthApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as { detail?: string };
  if (!response.ok) {
    throw new AuthApiError(
      response.status,
      payload.detail || "The request could not be completed.",
    );
  }
  return payload as T;
}

export type RegisteredUser = {
  id: string;
  display_name: string | null;
  organization: string | null;
  account_status: "PENDING" | "ACTIVE" | "LOCKED" | "DISABLED" | "DELETED";
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CurrentUser = RegisteredUser & { email: string };

export type LoginResult = {
  access_token: string;
  token_type: "bearer";
  expires_at: string;
  user: CurrentUser;
};

export function registerAccount(input: {
  email: string;
  password: string;
  display_name?: string;
}): Promise<RegisteredUser> {
  return postJson("/users", input);
}

export function confirmEmail(email: string, code: string) {
  return postJson<{ message: string }>(
    "/auth/email-verification/confirm",
    { email, code },
  );
}

export function resendEmailVerification(email: string) {
  return postJson<{ message: string }>(
    "/auth/email-verification/resend",
    { email },
  );
}

export function loginAccount(email: string, password: string) {
  return postJson<LoginResult>("/auth/login", { email, password });
}

export function requestPasswordReset(email: string) {
  return postJson<{ message: string }>(
    "/auth/password-reset/request",
    { email },
  );
}

export function confirmPasswordReset(
  token: string,
  newPassword: string,
  newPasswordConfirmation: string,
) {
  return postJson<{ message: string }>(
    "/auth/password-reset/confirm",
    {
      token,
      new_password: newPassword,
      new_password_confirmation: newPasswordConfirmation,
    },
  );
}

export async function getCurrentUser(token: string): Promise<CurrentUser> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await response.json().catch(() => ({})) as {
    detail?: string;
  };
  if (!response.ok) {
    throw new AuthApiError(
      response.status,
      payload.detail || "The session is no longer valid.",
    );
  }
  return payload as CurrentUser;
}
