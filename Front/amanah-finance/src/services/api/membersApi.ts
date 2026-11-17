
import { apiRequest } from "./api";

export type CommitmentFrequency =
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "YEARLY";

export type CommitmentAmount = number | string;

export interface CommitmentRecord {
  Id: number;
  MemberId: number;
  AmountPerPeriod: CommitmentAmount;
  Frequency: CommitmentFrequency;
  EffectiveFrom: string;
  EffectiveTo?: string | null;
  normalizedMonthlyEquivalent?: CommitmentAmount;
}

export interface MemberRecord {
  Id: number;
  FullName: string;
  Phone?: string | null;
  JoiningDate: string;
  Notes?: string | null;
  IsClosed: boolean;
  Commitments?: CommitmentRecord[];
}

export interface CreateMemberRequest {
  FullName: string;
  Phone?: string;
  JoiningDate: string;
  Notes?: string;
  AmountPerPeriod: number;
  Frequency: CommitmentFrequency;
  EffectiveFrom: string;
}

export interface UpdateMemberRequest {
  FullName?: string;
  Phone?: string | null;
  JoiningDate?: string;
  Notes?: string | null;
}


export const getMembers = () =>
  apiRequest<MemberRecord[]>("/members");


export const getMember = (id: number) =>
  apiRequest<MemberRecord>(`/members/${id}`);


export const createMember = (body: CreateMemberRequest) =>
  apiRequest<MemberRecord>("/members", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateMember = (
  id: number,
  body: UpdateMemberRequest
) =>
  apiRequest<MemberRecord>(`/members/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const closeMember = (id: number) =>
  apiRequest<MemberRecord | void>(`/members/${id}/close`, {
    method: "PATCH",
  });

export const reopenMember = (id: number) =>
  apiRequest<MemberRecord | void>(`/members/${id}/reopen`, {
    method: "PATCH",
  });
