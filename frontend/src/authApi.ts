import { ApiError, apiRequest } from "./services/http";
import {
  CurrentUser,
  LoginResult,
  Me,
  RegisteredUser,
} from "./features/auth/types";

export { ApiError as AuthApiError };
export type { CurrentUser, LoginResult, RegisteredUser, Me };

export function registerAccount(input: {
  email: string;
  password: string;
  display_name?: string;
}): Promise<RegisteredUser> {
  return apiRequest("/auth/register", {
    method: "POST",
    auth: false,
    body: input,
  });
}

export function confirmEmail(email: string, code: string) {
  return apiRequest<{ message: string }>(
    "/auth/email-verification/confirm",
    { method: "POST", auth: false, body: { email, code } },
  );
}

export function resendEmailVerification(email: string) {
  return apiRequest<{ message: string }>(
    "/auth/email-verification/resend",
    { method: "POST", auth: false, body: { email } },
  );
}

export function loginAccount(
  email: string,
  password: string,
  remember = false,
) {
  return apiRequest<LoginResult>("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password, remember },
  });
}

export function requestPasswordReset(email: string) {
  return apiRequest<{ message: string }>(
    "/auth/password-reset/request",
    { method: "POST", auth: false, body: { email } },
  );
}

export function confirmPasswordReset(
  token: string,
  newPassword: string,
  newPasswordConfirmation: string,
) {
  return apiRequest<{ message: string }>(
    "/auth/password-reset/confirm",
    {
      method: "POST",
      auth: false,
      body: {
        token,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      },
    },
  );
}

export function getCurrentUser(): Promise<CurrentUser> {
  return apiRequest<Me>("/me");
}

export function isAuthApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
