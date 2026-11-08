
import { apiRequest } from "./api";

export interface PaymentAllocation {
  Id: number;
  PaymentId: number;
  CommitmentId: number;
  PeriodMonth: string;
  AllocatedAmount: string;
  CreatedAt: string;
}

export interface PaymentRecord {
  Id: number;
  MemberId: number;
  ReceiptNumber: string;
  Amount: string;
  PaymentDate: string;
  RecordedAt: string;
  PaymentMethod: string;
  Notes: string | null;
  CreatedBy: number;
  CreatedAt: string;
  Member: {
    Id: number;
    FullName: string;
  };
  Allocations: PaymentAllocation[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedPayments {
  data: PaymentRecord[];
  meta: PaginationMeta;
}

export interface PaymentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  memberId?: number;
  paymentMethod?: "CASH" | "INSTAPAY";
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: "PaymentDate" | "RecordedAt" | "Amount" | "ReceiptNumber";
  sortOrder?: "asc" | "desc";
}

export interface CreatePaymentRequest {
  ReceiptNumber: string;
  Amount: number;
  PaymentDate: string;
  PaymentMethod: string;
  Notes?: string;
}

function buildQuery(params?: PaymentQueryParams): string {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}

export function getPayments(
  params?: PaymentQueryParams,
): Promise<PaginatedPayments> {
  return apiRequest<PaginatedPayments>(
    `/payments${buildQuery(params)}`,
  );
}

export function getMemberPayments(
  memberId: number,
  params?: PaymentQueryParams,
): Promise<PaginatedPayments> {
  return apiRequest<PaginatedPayments>(
    `/payments/member/${memberId}${buildQuery(params)}`,
  );
}

export function getPaymentById(id: number): Promise<PaymentRecord> {
  return apiRequest<PaymentRecord>(`/payments/${id}`);
}

export function createPayment(
  memberId: number,
  body: CreatePaymentRequest,
): Promise<PaymentRecord> {
  return apiRequest<PaymentRecord>(`/payments/member/${memberId}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updatePaymentReceipt(
  id: number,
  receiptNumber: string,
): Promise<PaymentRecord> {
  return apiRequest<PaymentRecord>(`/payments/${id}/receipt-number`, {
    method: "PATCH",
    body: JSON.stringify({ ReceiptNumber: receiptNumber }),
  });
}
