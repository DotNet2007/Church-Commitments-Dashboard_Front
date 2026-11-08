import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { MemberRecord } from "../../services/api/membersApi";

export interface MemberFormValues {
  FullName: string;
  Phone: string;
  JoiningDate: string;
  Notes: string;
  MonthlyAmount: string;
  CommitmentStartMonth: string;
}

type Props = {
  member?: MemberRecord | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: MemberFormValues) => void;
};

const today = new Date();
const dateValue = (value?: string) => (value ? value.slice(0, 10) : "");
const monthStart = (value?: string) => {
  if (value) return `${value.slice(0, 7)}-01`;
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
};

export default function MemberFormModal({
  member,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<MemberFormValues>({
    FullName: "",
    Phone: "",
    JoiningDate: dateValue(new Date().toISOString()),
    Notes: "",
    MonthlyAmount: "",
    CommitmentStartMonth: monthStart(),
  });

  useEffect(() => {
    if (!member) return;
    const latest = [...(member.Commitments ?? [])].sort(
      (a, b) =>
        new Date(b.EffectiveFrom).getTime() -
        new Date(a.EffectiveFrom).getTime(),
    )[0];
    setValues({
      FullName: member.FullName,
      Phone: member.Phone ?? "",
      JoiningDate: dateValue(member.JoiningDate),
      Notes: member.Notes ?? "",
      MonthlyAmount: latest ? String(latest.MonthlyAmount) : "",
      CommitmentStartMonth: monthStart(latest?.EffectiveFrom),
    });
  }, [member]);

  const set = (key: keyof MemberFormValues, value: string) =>
    setValues((old) => ({ ...old, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <section
        className="payment-modal member-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-form-title"
      >
        <header className="modal-header">
          <div>
            <div className="eyebrow">دليل الأعضاء</div>
            <h2 id="member-form-title">
              {member ? "تعديل بيانات العضو" : "إضافة عضو جديد"}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="إغلاق"
          >
            <X size={19} />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="modal-body member-form-body">
            <div className="member-form-grid">
              <label>
                <span className="field-label">اسم العضو *</span>
                <input
                  required
                  minLength={2}
                  maxLength={150}
                  value={values.FullName}
                  onChange={(e) => set("FullName", e.target.value)}
                  placeholder="الاسم بالكامل"
                />
              </label>
              <label>
                <span className="field-label">رقم الهاتف</span>
                <input
                  maxLength={30}
                  value={values.Phone}
                  onChange={(e) => set("Phone", e.target.value)}
                  placeholder="رقم الهاتف"
                />
              </label>
              <label>
                <span className="field-label">تاريخ الانضمام *</span>
                <input
                  required
                  type="date"
                  value={values.JoiningDate}
                  onChange={(e) => set("JoiningDate", e.target.value)}
                />
              </label>
              {!member && (
                <label>
                  <span className="field-label">قيمة الالتزام الشهري *</span>
                  <input
                    required
                    type="number"
                    min="0.01"
                    max="10000000000000000"
                    step="0.01"
                    value={values.MonthlyAmount}
                    onChange={(e) => set("MonthlyAmount", e.target.value)}
                    placeholder="500"
                  />
                </label>
              )}
              {!member && (
                <label>
                  <span className="field-label">بداية الالتزام *</span>
                  <input
                    required
                    type="month"
                    value={values.CommitmentStartMonth.slice(0, 7)}
                    onChange={(e) =>
                      set("CommitmentStartMonth", `${e.target.value}-01`)
                    }
                  />
                </label>
              )}
            </div>
            <label className="member-notes-field">
              <span className="field-label">ملاحظات</span>
              <textarea
                maxLength={500}
                rows={3}
                value={values.Notes}
                onChange={(e) => set("Notes", e.target.value)}
                placeholder="ملاحظات اختيارية..."
              />
            </label>
            {member && (
              <p style={{ fontSize: 15 }}className="member-form-hint">
                تعديل بيانات العضو لا يغيّر الالتزام الشهري أو سجل الالتزامات.
              </p>
            )}
          </div>
          <footer className="modal-footer">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
              disabled={saving}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={saving}
            >
              <CheckCircle2 size={16} />
              {saving
                ? "جارٍ الحفظ..."
                : member
                  ? "حفظ التعديلات"
                  : "إضافة العضو"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
