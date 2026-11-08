import { apiRequest } from "./api";
import type {
  DashboardResponse,
  DashboardDateParams,
} from "../../interfaces/dashboard-interface";

export const getDashboard = (params?: DashboardDateParams) => {
  const query = new URLSearchParams();

  if (params?.dateFrom) {
    query.set("dateFrom", params.dateFrom);
  }

  if (params?.dateTo) {
    query.set("dateTo", params.dateTo);
  }

  const queryString = query.toString();

  return apiRequest<DashboardResponse>(
    `/dashboard${queryString ? `?${queryString}` : ""}`,
  );
};