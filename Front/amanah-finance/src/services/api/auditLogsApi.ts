import { apiRequest } from "./api";
import type { PaginationMeta } from "./paymentsApi";

export interface AuditLogRecord {
  Id: number;
  UserId: number;
  EntityName: string;
  EntityId: number;
  Action: string;
  OldValues: string | null;
  NewValues: string | null;
  CreatedAt: string;
  User?: { Id: number; Username: string };
}
export interface AuditLogQuery {
  page?: number; limit?: number; userId?: number; action?: string;
  entityName?: string; entityId?: number; dateFrom?: string;
  dateTo?: string; sortOrder?: "asc" | "desc";
}
export interface AuditLogList { data: AuditLogRecord[]; meta: PaginationMeta }
const toQuery = (query: AuditLogQuery) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const result = params.toString();
  return result ? `?${result}` : "";
};
export const getAuditLogs = (query: AuditLogQuery = {}) =>
  apiRequest<AuditLogList>(`/audit-logs${toQuery(query)}`);
export const getAuditLog = (id: number) => apiRequest<AuditLogRecord>(`/audit-logs/${id}`);
