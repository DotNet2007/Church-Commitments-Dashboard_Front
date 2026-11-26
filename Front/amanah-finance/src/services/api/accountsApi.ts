import { apiRequest } from "./api";

// The Accounts NestJS controller is mounted at /accounts (without /api).
// Keep the existing API base URL unchanged for the rest of the application.
const ACCOUNTS_API_BASE_URL = (
  import.meta.env.VITE_ACCOUNTS_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "")
)?.replace(/\/$/, "");

export type AccountType = "CASH_BANK" | "INCOME" | "EXPENSE";

export interface AccountParent {
  Id: number;
  AccountCode: string;
  AccountName: string;
  AccountType: AccountType;
}

export interface AccountRecord {
  Id: number;
  OrganizationId: number;
  AccountCode: string;
  AccountName: string;
  AccountType: AccountType;
  ParentAccountId: number | null;
  IsGroup: boolean;
  IsSystemAccount: boolean;
  Description: string | null;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  Parent: AccountParent | null;
  _count: {
    Children: number;
  };
}

export interface CreateAccountRequest {
  name: string;
  parentId: number;
  isGroup?: boolean;
}

export interface UpdateAccountRequest {
  name?: string;
  parentId?: number;
  isGroup?: boolean;
  isActive?: boolean;
}

export const getAccounts = (includeInactive = false) =>
  apiRequest<AccountRecord[]>(
    `/accounts${includeInactive ? "?includeInactive=true" : ""}`,
    { baseUrl: ACCOUNTS_API_BASE_URL },
  );

export const getAccount = (id: number) =>
  apiRequest<AccountRecord>(`/accounts/${id}`, {
    baseUrl: ACCOUNTS_API_BASE_URL,
  });

export const createAccount = (body: CreateAccountRequest) =>
  apiRequest<AccountRecord>("/accounts", {
    method: "POST",
    body: JSON.stringify(body),
    baseUrl: ACCOUNTS_API_BASE_URL,
  });

export const updateAccount = (id: number, body: UpdateAccountRequest) =>
  apiRequest<AccountRecord>(`/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    baseUrl: ACCOUNTS_API_BASE_URL,
  });

export const deactivateAccount = (id: number) =>
  apiRequest<{ count: number }>(`/accounts/${id}`, {
    method: "DELETE",
    baseUrl: ACCOUNTS_API_BASE_URL,
  });
