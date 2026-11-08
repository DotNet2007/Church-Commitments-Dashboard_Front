export type Page = "dashboard" | "members" | "payments" | "reports" | "settings";
export type MemberStatus = "مدفوع" | "متأخر" | "غير مدفوع" | "مدفوع جزئياً";
export type Member = { id: string; name: string; phone: string; joinDate: string; monthly: number; total: number; paid: number; remaining: number; status: MemberStatus; };
