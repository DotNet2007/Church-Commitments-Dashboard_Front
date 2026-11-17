
export type CommitmentFrequency =
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "YEARLY";

export interface CommitmentRate {
  memberId: number;
  amountPerPeriod: string;
  frequency: CommitmentFrequency;
  normalizedMonthlyEquivalent: string;
}

export interface DashboardStats {
  activeMembers: number;
  totalDue: number;
  totalCollected: number;
  remaining: number;
  overdue: number;
  collectionRate: number;
  totalNormalizedMonthlyEquivalent: string;
}

export interface DashboardChartItem {
  month: string;
  due: number;
  paid: number;
}

export interface DashboardPaymentMember {
  Id: number;
  FullName: string;
}

export interface DashboardPayment {
  id: number;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  recordedAt: string;
  paymentMethod: string;
  member: DashboardPaymentMember;
}

export interface DashboardResponse {
  stats: DashboardStats;
  commitmentRates: CommitmentRate[];
  chart: DashboardChartItem[];
  latestPayments: DashboardPayment[];
}

export interface DashboardDateParams {
  dateFrom?: string;
  dateTo?: string;
}
