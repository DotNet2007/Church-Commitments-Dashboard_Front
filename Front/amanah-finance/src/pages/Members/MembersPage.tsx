import {
  Download,
  Plus,
  Search,
  SlidersHorizontal,
  Pencil,
  Power,
  RotateCcw,
} from "lucide-react";
import PageTitle from "../../components/common/PageTitle";
import type { MemberRecord } from "../../services/api/membersApi";

const money = (value: string | number) =>
  `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })} ج.م`;

const date = (value: string) =>
  new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export default function MembersPage({
  members,
  search,
  setSearch,
  filter,
  setFilter,
  loading,
  error,
  onAddPayment,
  onEdit,
  onView,
  onToggleStatus,
}: {
  members: MemberRecord[];
  search: string;
  setSearch: (s: string) => void;
  filter: string;
  setFilter: (s: string) => void;
  loading: boolean;
  error: string | null;
  onAddPayment: () => void;
  onEdit: (member: MemberRecord) => void;
  onView: (member: MemberRecord) => void;
  onToggleStatus: (member: MemberRecord) => void;
}) {
  return (
    <>
      <PageTitle
        eyebrow="دليل الأعضاء"
        title="إدارة الأعضاء"
        description="تابع بيانات الأعضاء والتزاماتهم الشهرية من مكان واحد."
        action={
          <button className="button button-primary" onClick={onAddPayment}>
            <Plus size={17} />
            تسجيل دفعة جديدة
          </button>
        }
      />
      <section className="filter-panel members-filter-panel">
        <div className="search-field">
          <Search size={15} />
          <input
            placeholder="ابحث بالاسم أو المعرف أو رقم الهاتف"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-row">
          <SlidersHorizontal size={14} />

          {["الكل", "نشط", "مغلق"].map((item) => (
            <button
              key={item}
              className={`filter-chip ${filter === item ? "selected" : ""}`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      <section className="members-section">
        <div className="list-heading">
          <div>
            <h2>قائمة الأعضاء</h2>
            <p style={{ fontSize: 15 }}>{members.length} أعضاء</p>
          </div>
          <button className="text-link" onClick={() => window.print()}>
            <Download size={13} /> طباعة القائمة
          </button>
        </div>
        <div className="panel members-table-panel">
          <div className="table-scroll">
            <table className="members-table">
              <thead>
                <tr>
                  {/* <th>المعرف</th> */}
                  <th>اسم العضو</th>
                  <th>رقم الهاتف</th>
                  <th>تاريخ الانضمام</th>
                  <th>قيمة الالتزام لكل فترة</th>
                  <th>الحالة</th>
                  <th>ملاحظات</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const commitments = member.Commitments ?? [];
                  const today = new Date();

                  const todayKey = [
                    today.getFullYear(),
                    String(today.getMonth() + 1).padStart(2, "0"),
                    String(today.getDate()).padStart(2, "0"),
                  ].join("-");

                  const current = commitments
                    .filter((item) => {
                      const start = item.EffectiveFrom.slice(0, 10);
                      const end = item.EffectiveTo?.slice(0, 10);

                      return start <= todayKey && (!end || end >= todayKey);
                    })
                    .sort((a, b) =>
                      b.EffectiveFrom.localeCompare(a.EffectiveFrom),
                    )[0];
                  return (
                    <tr
                      key={member.Id}
                      className="member-clickable-row"
                      onClick={() => onView(member)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onView(member);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`عرض تفاصيل العضو ${member.FullName}`}
                    >
                      {/* <td className="id-cell">{member.Id}</td> */}
                      <td>
                        <button
                          type="button"
                          className="member-name-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            onView(member);
                          }}
                        >
                          <strong>{member.FullName}</strong>
                        </button>
                      </td>
                      <td>{member.Phone || "—"}</td>
                      <td>{date(member.JoiningDate)}</td>
                      <td className="amount-cell">
                        {current ? (
                          <>
                            <strong>{money(current.AmountPerPeriod)}</strong>
                            <div className="text-muted">
                              {current.Frequency === "MONTHLY" && "شهري"}
                              {current.Frequency === "QUARTERLY" && "ربع سنوي"}
                              {current.Frequency === "HALF_YEARLY" &&
                                "نصف سنوي"}
                              {current.Frequency === "YEARLY" && "سنوي"}
                            </div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span
                          className={`status ${member.IsClosed ? "status-late" : "status-paid"}`}
                        >
                          <i />
                          {member.IsClosed ? "مغلق" : "نشط"}
                        </span>
                      </td>
                      <td>{member.Notes || "—"}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="icon-button member-edit-button"
                            title="تعديل العضو"
                            aria-label="تعديل العضو"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(member);
                            }}
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            type="button"
                            className="icon-button"
                            title={
                              member.IsClosed
                                ? "إعادة تفعيل العضو"
                                : "إغلاق العضو"
                            }
                            aria-label={
                              member.IsClosed
                                ? "إعادة تفعيل العضو"
                                : "إغلاق العضو"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStatus(member);
                            }}
                          >
                            {member.IsClosed ? (
                              <RotateCcw size={14} />
                            ) : (
                              <Power size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loading && (
              <div className="empty-state">جاري تحميل بيانات الأعضاء...</div>
            )}
            {!loading && error && (
              <div className="empty-state">
                تعذر تحميل البيانات. راجع الاتصال بالـ API وحاول مرة أخرى.
              </div>
            )}
            {!loading && !error && members.length === 0 && (
              <div className="empty-state">لا توجد نتائج مطابقة للبحث.</div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
