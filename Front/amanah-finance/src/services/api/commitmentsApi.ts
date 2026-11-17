import { apiRequest } from "./api";

import type {
  CommitmentRecord,
  CommitmentFrequency,
} from "./membersApi";

export type CommitmentPeriodStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID";

export interface CommitmentPeriod {
  commitmentId: number;
  periodStart: string;
  periodEnd: string;
  amountPerPeriod: string;
  frequency: CommitmentFrequency;
  normalizedMonthlyEquivalent: string;
  paidAmount: string;
  outstandingAmount: string;
  status: CommitmentPeriodStatus;
  overdue: boolean;
}

export interface CommitmentSummary {
  memberId: number;
  currentCommitment: CommitmentRecord | null;
  amountPerPeriod: string;
  frequency: CommitmentFrequency;
  normalizedMonthlyEquivalent: string;
  totalOutstanding: string;
  totalOverdue: string;
  periods: number;
}

export const getMemberCommitmentPeriods = (
  memberId: number,
  through?: string,
) => {
  const query = through
    ? `?through=${encodeURIComponent(through)}`
    : "";

  return apiRequest<CommitmentPeriod[]>(
    `/commitments/member/${memberId}/periods${query}`,
  );
};

export const getMemberOutstandingPeriods = (
  memberId: number,
  through?: string,
) => {
  const query = through
    ? `?through=${encodeURIComponent(through)}`
    : "";

  return apiRequest<CommitmentPeriod[]>(
    `/commitments/member/${memberId}/outstanding${query}`,
  );
};

export const getMemberCommitmentSummary = (
  memberId: number,
  through?: string,
) => {
  const query = through
    ? `?through=${encodeURIComponent(through)}`
    : "";

  return apiRequest<CommitmentSummary>(
    `/commitments/member/${memberId}/summary${query}`,
  );
};

export interface ChangeCommitmentRequest {
  AmountPerPeriod: number;
  Frequency: CommitmentFrequency;
  EffectiveStartDate: string;
}

export interface CommitmentPreviewRequest
  extends ChangeCommitmentRequest {}

export interface CommitmentPreviewResponse {
  previousCommitment: CommitmentRecord;
  proposedCommitment: CommitmentRecord;
  effectiveDate: string;

  affectedPeriods: unknown[];
  existingPaymentsAffected: unknown[];
  existingAllocations: unknown[];
  recalculatedAllocations: unknown[];
  resultingExcessOrCreditAdjustments: unknown[];

  summary: unknown;
  previewToken: string;
}

export interface CommitmentConfirmRequest
  extends ChangeCommitmentRequest {
  previewToken: string;
}

interface CommitmentConfirmBase {
  message: string;
  reallocatedAllocations: unknown[];
  financialImpact: unknown;
}

// نفس تاريخ البداية: الباك إند يعدّل نفس الالتزام (نفس الـ ID)
export interface CommitmentUpdateConfirmResponse
  extends CommitmentConfirmBase {
  updatedCommitment: CommitmentRecord;
  previousCommitment?: undefined;
  newCommitment?: undefined;
}

// تاريخ لاحق: ينشئ التزام جديد
export interface CommitmentChangeConfirmResponse
  extends CommitmentConfirmBase {
  updatedCommitment?: undefined;
  previousCommitment: CommitmentRecord;
  newCommitment: CommitmentRecord;
}

export type CommitmentConfirmResponse =
  | CommitmentUpdateConfirmResponse
  | CommitmentChangeConfirmResponse;

export const getCommitmentHistory = (memberId: number) =>
  apiRequest<CommitmentRecord[]>(
    `/commitments/member/${memberId}`,
  );

export const getCurrentCommitment = (memberId: number) =>
  apiRequest<CommitmentRecord>(
    `/commitments/member/${memberId}/current`,
  );

export const previewCommitmentChange = (
  commitmentId: number,
  body: CommitmentPreviewRequest,
) =>
  apiRequest<CommitmentPreviewResponse>(
    `/commitments/${commitmentId}/preview`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

export const confirmCommitmentChange = (
  commitmentId: number,
  body: CommitmentConfirmRequest,
) =>
  apiRequest<CommitmentConfirmResponse>(
    `/commitments/${commitmentId}/confirm`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

export const moneyToCents = (value: string | number): number => {
  const normalized = String(value).trim();

  const match = normalized.match(/^(-?)(\d+)(?:\.(\d+))?$/);

  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const whole = Number(match[2]);
  const fraction = (match[3] ?? "").padEnd(3, "0");

  const cents =
    whole * 100 +
    Number(fraction.slice(0, 2)) +
    (Number(fraction[2]) >= 5 ? 1 : 0);

  return sign * cents;
};

export const centsToMoney = (cents: number): string => {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);

  return `${sign}${Math.floor(absolute / 100)}.${String(
    absolute % 100,
  ).padStart(2, "0")}`;
};