import { apiRequest } from "./api";

export type PaymentMethod = "CASH" | "BANK" | "SPLIT";
export type RevenueTransactionType = "INDIVIDUAL" | "BATCH";

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface JournalLine {
  Id?: number;
  AccountId?: number;
  AccountName?: string;
  Description?: string | null;
  Debit?: string | number;
  Credit?: string | number;
  [key: string]: unknown;
}

export interface JournalEntry {
  Id?: number;
  EntryNumber?: string;
  TransactionDate?: string;
  Description?: string | null;
  Lines?: JournalLine[];
  [key: string]: unknown;
}

export interface ExpenseRecord {
  Id: number;
  TransactionDate: string;
  CategoryId: number;
  SubcategoryId: number | null;
  Description: string | null;
  ReceiptNumber: string | null;
  TotalAmount: string | number;
  PaymentMethod: PaymentMethod;
  CashAmount: string | number;
  BankAmount: string | number;
  Category?: { Id?: number; AccountCode?: string; AccountName?: string };
  Subcategory?: { Id?: number; AccountCode?: string; AccountName?: string } | null;
  JournalEntries?: JournalEntry[];
}

export interface RevenueRecord {
  Id: number;
  TransactionType: RevenueTransactionType;
  AccountId: number;
  TransactionDate: string;
  Description: string | null;
  TotalAmount: string | number;
  CashAmount: string | number;
  BankAmount: string | number;
  ReceiptNumber: number | null;
  ReceiptRangeStart: number | null;
  ReceiptRangeEnd: number | null;
  ReceiptCount: number | null;
  Account?: { Id?: number; AccountCode?: string; AccountName?: string };
  JournalEntries?: JournalEntry[];
}

export interface PageResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
  categoryId?: number;
  subcategoryId?: number;
  paymentMethod?: PaymentMethod;
  accountId?: number;
  transactionType?: RevenueTransactionType;
}

function queryString(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export type CreateExpenseRequest = {
  TransactionDate: string;
  CategoryId: number;
  SubcategoryId: number | null;
  Description?: string | null;
  ReceiptNumber?: string | null;
  TotalAmount: number;
  PaymentMethod: PaymentMethod;
  CashAmount: number;
  BankAmount: number;
};

export type CreateRevenueRequest = {
  TransactionType: RevenueTransactionType;
  AccountId: number;
  TransactionDate: string;
  Description?: string | null;
  TotalAmount: number;
  CashAmount: number;
  BankAmount: number;
  ReceiptNumber?: number | null;
  ReceiptRangeStart?: number | null;
  ReceiptRangeEnd?: number | null;
};

export const getExpenses = (filters: TransactionFilters = {}) =>
  apiRequest<PageResult<ExpenseRecord>>(`/expenses${queryString(filters)}`);

export const getExpense = (id: number) =>
  apiRequest<ExpenseRecord>(`/expenses/${id}`);

export const createExpense = (body: CreateExpenseRequest) =>
  apiRequest<ExpenseRecord>("/expenses", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateExpense = (id: number, body: Partial<CreateExpenseRequest>) =>
  apiRequest<ExpenseRecord>(`/expenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteExpense = (id: number) =>
  apiRequest<unknown>(`/expenses/${id}`, { method: "DELETE" });

export const getRevenues = (filters: TransactionFilters = {}) =>
  apiRequest<PageResult<RevenueRecord>>(`/revenues${queryString(filters)}`);

export const getRevenue = (id: number) =>
  apiRequest<RevenueRecord>(`/revenues/${id}`);

export const createRevenue = (body: CreateRevenueRequest) =>
  apiRequest<RevenueRecord>("/revenues", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateRevenue = (id: number, body: Partial<CreateRevenueRequest>) =>
  apiRequest<RevenueRecord>(`/revenues/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteRevenue = (id: number) =>
  apiRequest<unknown>(`/revenues/${id}`, { method: "DELETE" });
