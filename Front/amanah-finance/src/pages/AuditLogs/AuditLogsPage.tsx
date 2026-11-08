import { useEffect,  useMemo, useRef, useState , type ReactNode } from "react";
import {
  Eye,
  Search,
  SlidersHorizontal,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import PageTitle from "../../components/common/PageTitle";
import {
  getAuditLogs,
  getAuditLog,
  type AuditLogRecord,
  type AuditLogQuery,
} from "../../services/api/auditLogsApi";
import type { PaginationMeta } from "../../services/api/paymentsApi";

const emptyMeta: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

const actionLabels: Record<string, string> = {
  CREATE: "إضافة",
  UPDATE: "تعديل",
  DELETE: "حذف",
  CLOSE: "إغلاق",
  REOPEN: "إعادة فتح",
  CHANGE: "تغيير الالتزام",
  UPDATE_RECEIPT_NUMBER: "تعديل رقم الإيصال",
};

const entityLabels: Record<string, string> = {
  Member: "عضو",
  Members: "الأعضاء",
  Payment: "دفعة",
  Payments: "المدفوعات",
  Commitment: "التزام",
  Commitments: "الالتزامات",
  User: "مستخدم",
  Users: "المستخدمون",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const auditFieldLabels: Record<string, string> = {
  MemberId: "رقم العضو",
  CommitmentId: "رقم الالتزام",
  PreviousCommitmentId: "رقم الالتزام السابق",
  PreviousMonthlyAmount: "قيمة الالتزام السابقة",
  PreviousEffectiveFrom: "بداية الالتزام السابقة",
  PreviousEffectiveTo: "نهاية الالتزام السابقة",
  MonthlyAmount: "قيمة الالتزام الشهري",
  EffectiveFrom: "بداية الالتزام",
  EffectiveTo: "نهاية الالتزام",
  ReceiptNumber: "رقم الإيصال",
  Amount: "المبلغ",
  PaymentDate: "تاريخ الدفع",
  PaymentMethod: "طريقة الدفع",
  Notes: "ملاحظات",
  Status: "الحالة",
  Name: "اسم العضو",
  FullName: "اسم العضو",
  Phone: "رقم الهاتف",
  JoiningDate: "تاريخ الانضمام",
  Address: "العنوان",
  Email: "البريد الإلكتروني",
  Allocations: "توزيع الدفعة",
  IsClosed: "حالة العضوية",
ClosedAt: "تاريخ الإغلاق",
ClosedBy: "تم الإغلاق بواسطة",
};

const hiddenAuditFields = new Set([
  "Id", "MemberId", "CommitmentId", "PreviousCommitmentId", "UserId",
]);


function parseAuditValues(value: string | null): Record<string, unknown> | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    return { Value: parsed };
  } catch {
    return { Value: value };
  }
}

function formatAuditDate(value: string, includeTime = false) {
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

function formatAuditMonth(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})/);

  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, 1)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ar-EG", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getAuditFieldLabel(key: string) {
  if (auditFieldLabels[key]) return auditFieldLabels[key];

  // تحويل أسماء الخصائص غير المعروفة إلى صيغة مقروءة
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}

function formatAuditFieldValue(
  key: string,
  value: unknown,
): ReactNode {
  if (value === null || value === undefined || value === "") {
    return key === "EffectiveTo" ? "مستمر" : "—";
  }

  if (typeof value === "boolean") {
    return value ? "نعم" : "لا";
  }

  if (Array.isArray(value)) {
    if (key === "Allocations") {
      return (
        <div className="audit-allocation-list">
          {value.map((item, index) => {
            const allocation = item as Record<string, unknown>;
            const month = allocation.PeriodMonth;
            const amount = Number(allocation.AllocatedAmount ?? 0);

            return (
              <div className="audit-allocation-item" key={index}>
                <span>
                  {typeof month === "string"
  ? formatAuditMonth(month)
  : `الفترة ${index + 1}`}
                </span>

                <strong>
                  {Number.isFinite(amount)
                    ? `${amount.toLocaleString("ar-EG")} ج.م`
                    : "—"}
                </strong>
              </div>
            );
          })}
        </div>
      );
    }

    return value.length ? value.map(String).join("، ") : "—";
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) {
      return formatAuditDate(value);
    }

    if (key.toLowerCase().includes("amount")) {
      const amount = Number(value);

      if (Number.isFinite(amount)) {
        return `${amount.toLocaleString("ar-EG")} ج.م`;
      }
    }
  }

  if (typeof value === "number" && key.toLowerCase().includes("amount")) {
    return `${value.toLocaleString("ar-EG")} ج.م`;
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(
        ([nestedKey, nestedValue]) =>
          `${auditFieldLabels[nestedKey] ?? nestedKey}: ${String(nestedValue ?? "—")}`,
      )
      .join("، ");
  }

  return String(value);
}

function AuditValuesComparison({
  oldValues,
  newValues,
  username,
  userId,
}: {
  oldValues: string | null;
  newValues: string | null;
  username?: string;
  userId?: number;
}) {
  const oldData = parseAuditValues(oldValues);
  const newData = parseAuditValues(newValues);
const displayValue = (key: string, data: Record<string, unknown> | null) => {
  const value = data?.[key];

  if (key === "ClosedBy" && value != null) {
    if (userId != null && Number(value) === userId && username) {
      return username;
    }
  }

  return formatAuditFieldValue(key, value);
};
  const keys = [
    ...new Set([
      ...Object.keys(oldData ?? {}),
      ...Object.keys(newData ?? {}),
    ]),
  ].filter(
    (key) => !hiddenAuditFields.has(key) && key !== "Value",
  );

  if (keys.length === 0) {
    const fallback = oldData?.Value ?? newData?.Value;

    return (
      <p className="audit-empty-values">
        {fallback == null
          ? "لا توجد تفاصيل إضافية مسجلة"
          : String(fallback)}
      </p>
    );
  }

  return (
    <div className="audit-comparison" dir="rtl">
      <div className="audit-comparison-header">
        <span>الحقل</span>
        <span>القيمة القديمة</span>
        <span>القيمة الجديدة</span>
      </div>

      {keys.map((key) => (
        <div className="audit-comparison-row" key={key}>
          <strong className="audit-comparison-label">
            {auditFieldLabels[key] ?? key}
          </strong>

          <div className="audit-comparison-old">
            {displayValue(key, oldData)}
          </div>

          <div className="audit-comparison-new">
            {displayValue(key, newData)}
          </div>
        </div>
      ))}
    </div>
  );
}


export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityName, setEntityName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);








useEffect(() => {
  let cancelled = false;

  const load = async () => {
    setLoading(true);

    const query: AuditLogQuery = {
      page,
      limit: 10,
      action: action || undefined,
      entityName: entityName || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    try {
      const result = await getAuditLogs(query);

      if (!cancelled) {
        setLogs(result.data);
        setMeta(result.meta);
      }
    } catch (error) {
      if (!cancelled) {
        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تحميل سجل العمليات"
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  void load();

  return () => {
    cancelled = true;
  };
}, [page, action, entityName, dateFrom, dateTo]);




const filteredLogs = useMemo(() => {
  const term = search.trim().toLocaleLowerCase();

  if (!term) return logs;

  return logs.filter((log) =>
    [
      String(log.Id),
      log.User?.Username ?? "",
      log.Action,
      log.EntityName,
      String(log.EntityId),
    ].some((value) => value.toLocaleLowerCase().includes(term)),
  );
}, [logs, search]);

  const openDetails = async (id: number) => {
    setDetailsLoading(true);
    try {
      const result = await getAuditLog(id);
      setSelectedLog(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل تفاصيل العملية");
    } finally {
      setDetailsLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setAction("");
    setEntityName("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <>
      <PageTitle
        eyebrow="متابعة نشاط النظام"
        title="سجل العمليات"
        description="مراجعة العمليات التي تمت على الأعضاء والمدفوعات والالتزامات."
        action={
          <button className="button button-secondary" type="button" onClick={resetFilters}>
            <RefreshCw size={15} />
            إعادة ضبط الفلاتر
          </button>
        }
      />

      <div className="payment-summary-grid">
        <div className="summary-card">
          <span style={{ fontSize: 15 ,fontWeight: 'bold'}} >إجمالي العمليات</span>
          <strong>{meta.total}</strong>
          <small>عدد العمليات المسجلة</small>
        </div>
        <div className="summary-card">
          <span style={{ fontSize: 15 ,fontWeight: 'bold'  }}>العمليات المعروضة</span>
          <strong>{filteredLogs.length}</strong>
          <small>في الصفحة الحالية</small>
        </div>
        <div className="summary-card">
          <span style={{ fontSize: 15 ,fontWeight: 'bold'  }}>الصفحة الحالية</span>
          <strong>{meta.totalPages ? `${meta.page} / ${meta.totalPages}` : "—"}</strong>
          <small>ترقيم صفحات السجل</small>
        </div>
      </div>

      <section className="audit-filter-panel" aria-label="البحث وتصفية سجل العمليات">
        <div className="audit-search-row">
          <label htmlFor="audit-search">البحث في سجل العمليات</label>
          <div className="audit-search-input">
            <Search size={18} />
            <input
              id="audit-search"
              value={search}
             onChange={(event) => {
  setSearch(event.target.value);
}}
              placeholder="ابحث برقم العملية أو اسم المستخدم أو رقم العنصر"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="مسح البحث">
                <X size={16} />
              </button>
            )}
          </div>
          <p style={{ fontSize: 15}}>البحث يراجع النتائج الظاهرة في الصفحة الحالية.</p>
        </div>

        <div className="audit-filters-heading">
          <div>
            <SlidersHorizontal size={17} />
            <strong>تصفية النتائج</strong>
          </div>
          <button type="button" onClick={resetFilters}>مسح كل الفلاتر</button>
        </div>

        <div className="audit-filters-grid">
          <label className="audit-filter-field">
            <span>نوع العملية</span>
            <select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}>
              <option value="">كل العمليات</option>
              <option value="CREATE">إضافة</option>
              <option value="UPDATE">تعديل</option>
              <option value="CHANGE">تغيير الالتزام</option>
              <option value="UPDATE_RECEIPT_NUMBER">تعديل رقم الإيصال</option>
              <option value="CLOSE">إغلاق</option>
              <option value="REOPEN">إعادة فتح</option>
              <option value="DELETE">حذف</option>
            </select>
          </label>

          <label className="audit-filter-field">
            <span>نوع العنصر</span>
            <select value={entityName} onChange={(event) => { setEntityName(event.target.value); setPage(1); }}>
              <option value="">كل العناصر</option>
              <option value="Member">عضو</option>
              <option value="Payment">دفعة</option>
              <option value="Commitment">التزام</option>
              <option value="User">مستخدم</option>
            </select>
          </label>

          <label className="audit-filter-field">
            <span>من تاريخ</span>
            <input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
          </label>

          <label className="audit-filter-field">
            <span>إلى تاريخ</span>
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
          </label>
        </div>
      </section>

      <section className="members-section">
        <div className="list-heading">
          <div>
            <h2>سجل نشاط النظام</h2>
            <p style={{ fontSize: 15 }}>كل عملية مسجلة مع المستخدم والتوقيت والعنصر المتأثر</p>
          </div>
        </div>
        <div className="panel members-table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>رقم العملية</th>
                  <th>المستخدم</th>
                  <th>العملية</th>
                  <th>العنصر</th>
                  <th>رقم العنصر</th>
                  <th>التاريخ والوقت</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
  {loading && logs.length === 0 ? (
    <tr>
      <td colSpan={7} className="text-center">
        جارٍ تحميل سجل العمليات...
      </td>
    </tr>
  ) : filteredLogs.length === 0 ? (
    <tr>
      <td colSpan={7} className="text-center">
        لا توجد عمليات مطابقة للفلاتر
      </td>
    </tr>
  ) : (
    filteredLogs.map((log) => (
      <tr key={log.Id}>
        <td className="id-cell">#{log.Id}</td>
        <td>
          <strong>
            {log.User?.Username ?? `مستخدم #${log.UserId}`}
          </strong>
        </td>
        <td>
          <span className="filter-chip selected">
            {actionLabels[log.Action] ?? log.Action}
          </span>
        </td>
        <td>{entityLabels[log.EntityName] ?? log.EntityName}</td>
        <td>{log.EntityId}</td>
        <td>{formatDate(log.CreatedAt)}</td>
        <td>
          <button
            type="button"
            className="row-action"
            title="عرض التفاصيل"
            onClick={() => void openDetails(log.Id)}
            disabled={detailsLoading}
          >
            <Eye size={20} />
          </button>
        </td>
      </tr>
    ))
  )}
</tbody>
            </table>
          </div>
          <div className="pagination-controls">
     <button
  type="button"
  className="button button-secondary"
  disabled={!meta.hasPreviousPage || loading}
  onClick={() => setPage((current) => current - 1)}
>
  السابق
</button>
            <span>صفحة {meta.page} من {meta.totalPages || 1}</span>
   <button
  type="button"
  className="button button-secondary"
  disabled={!meta.hasNextPage || loading}
  onClick={() => setPage((current) => current + 1)}
>
  التالي
</button>
          </div>
        </div>
      </section>

      {selectedLog && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLog(null); }}>
          <section className="payment-modal" role="dialog" aria-modal="true">
            <header className="modal-header">
              <div>
                <div className="eyebrow">تفاصيل سجل العمليات</div>
                <h2>العملية رقم #{selectedLog.Id}</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedLog(null)} aria-label="إغلاق"><X size={19} /></button>
            </header>
            <div className="modal-body">
              <div className="allocation-box">
                <div style={{ fontSize: 15 ,fontWeight: 'bold' }} className="allocation-row"><span>المستخدم</span><b>{selectedLog.User?.Username ?? `مستخدم #${selectedLog.UserId}`}</b></div>
                <div style={{ fontSize: 15 ,fontWeight: 'bold' }}  className="allocation-row"><span>نوع العملية</span><b>{actionLabels[selectedLog.Action] ?? selectedLog.Action}</b></div>
                <div style={{ fontSize: 15 ,fontWeight: 'bold' }}  className="allocation-row"><span>العنصر</span><b>{entityLabels[selectedLog.EntityName] ?? selectedLog.EntityName} #{selectedLog.EntityId}</b></div>
                <div style={{ fontSize: 15 ,fontWeight: 'bold' }}  className="allocation-row"><span>التاريخ والوقت</span><b>{formatDate(selectedLog.CreatedAt)}</b></div>
                <div style={{ fontSize: 15 ,fontWeight: 'bold' }}  className="section-label">مقارنة التغييرات</div>
                <AuditValuesComparison 
                  oldValues={selectedLog.OldValues}
                  newValues={selectedLog.NewValues}
                   username={selectedLog.User?.Username}
  userId={selectedLog.User?.Id}
                />
              </div>
            </div>
            <footer className="modal-footer">
              <button type="button" className="button button-secondary" onClick={() => setSelectedLog(null)}>إغلاق</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
