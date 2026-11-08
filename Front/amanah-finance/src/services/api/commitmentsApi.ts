import { apiRequest } from "./api";
import type { CommitmentRecord } from "./membersApi";

export interface ChangeCommitmentRequest {
  MonthlyAmount: number;
  EffectiveFrom: string;
}

export const getCommitmentHistory = (memberId: number) =>
  apiRequest<CommitmentRecord[]>(`/commitments/member/${memberId}`);
export const getCurrentCommitment = (memberId: number) =>
  apiRequest<CommitmentRecord>(`/commitments/member/${memberId}/current`);
export const changeCommitment = (commitmentId: number, body: ChangeCommitmentRequest) =>
  apiRequest<CommitmentRecord>(`/commitments/${commitmentId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
