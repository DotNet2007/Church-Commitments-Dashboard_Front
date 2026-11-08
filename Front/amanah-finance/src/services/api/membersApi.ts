import { apiRequest } from "./api";

export interface MemberRecord {
  Id: number;
  FullName: string;
  Phone: string | null;
  JoiningDate: string;
  Notes: string | null;
  IsClosed: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
  Commitments?: CommitmentRecord[];
}

export interface CommitmentRecord {
  Id: number;
  MemberId: number;
  MonthlyAmount: string | number;
  EffectiveFrom: string;
  EffectiveTo: string | null;
}

export interface CreateMemberRequest {
  FullName: string;
  Phone?: string;
  JoiningDate: string;
  Notes?: string;
  MonthlyAmount: number;
  CommitmentStartMonth: string;
}

export interface UpdateMemberRequest {
  FullName?: string;
  Phone?: string | null;
  JoiningDate?: string;
  Notes?: string | null;
}

export const getMembers = () => apiRequest<MemberRecord[]>("/members");
export const getMember = (id: number) =>
  apiRequest<MemberRecord>(`/members/${id}`);
export const createMember = (body: CreateMemberRequest) =>
  apiRequest<MemberRecord>("/members", {
    method: "POST",
    body: JSON.stringify(body),
  });
export const updateMember = (id: number, body: UpdateMemberRequest) =>
  apiRequest<MemberRecord>(`/members/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
export const closeMember = (id: number) =>
  apiRequest<MemberRecord | void>(`/members/${id}/close`, { method: "PATCH" });
export const reopenMember = (id: number) =>
  apiRequest<MemberRecord | void>(`/members/${id}/reopen`, { method: "PATCH" });
