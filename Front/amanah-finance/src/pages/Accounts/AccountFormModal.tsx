import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { AccountRecord } from "../../services/api/accountsApi";

export interface AccountFormValues {
  name: string;
  parentId: string;
  isGroup: boolean;
}

export default function AccountFormModal({
  account,
  accounts,
  saving,
  onClose,
  onSubmit,
}: {
  account: AccountRecord | null;
  accounts: AccountRecord[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: AccountFormValues) => void;
}) {
  const [name, setName] = useState(account?.AccountName ?? "");
  const [parentId, setParentId] = useState(
    account?.ParentAccountId ? String(account.ParentAccountId) : "",
  );
  const [isGroup, setIsGroup] = useState(account?.IsGroup ?? false);
  const [validation, setValidation] = useState("");

  const parentOptions = useMemo(
    () => accounts.filter((item) =>
      item.IsActive &&
      item.IsGroup &&
      (item.AccountType === "INCOME" || item.AccountType === "EXPENSE") &&
      (!account || item.AccountType === account.AccountType) &&
      item.Id !== account?.Id,
    ),
    [accounts, account],
  );

  const protectedAccount = Boolean(account?.IsSystemAccount);
  const canChangeParent = !account || !["1001", "1004"].includes(account.AccountCode);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setValidation("اسم الحساب مطلوب.");
      return;
    }
    if (name.trim().length > 150) {
      setValidation("اسم الحساب يجب ألا يتجاوز 150 حرفاً.");
      return;
    }
    if (!account && !parentId) {
      setValidation("اختر الحساب الأب.");
      return;
    }
    setValidation("");
    onSubmit({ name: name.trim(), parentId, isGroup });
  };

  return (
    <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-form-title">
        <div className="account-modal-heading">
          <div>
            <span className="eyebrow">دليل الحسابات</span>
            <h2 id="account-form-title">{account ? "تعديل الحساب" : "إضافة حساب جديد"}</h2>
            <p>{account ? "حدّث بيانات الحساب المسموح بتعديلها." : "أضف حساباً فرعياً تحت مجموعة إيرادات أو مصروفات."}</p>
          </div>
          <button className="account-close" type="button" onClick={onClose} disabled={saving} aria-label="إغلاق"><X size={18} /></button>
        </div>

        {protectedAccount ? (
          <div className="account-protected-notice">هذا حساب نظام، ولا يسمح الـ API بتعديله.</div>
        ) : (
          <form onSubmit={submit}>
            <label className="account-field">
              <span>اسم الحساب <b>*</b></span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={150} autoFocus placeholder="مثال: تبرعات الأحد" />
              <small>{name.length}/150</small>
            </label>

            <label className="account-field">
              <span>الحساب الأب {!account && <b>*</b>}</span>
              <select value={parentId} onChange={(event) => setParentId(event.target.value)} disabled={!canChangeParent}>
                <option value="">اختر مجموعة الحساب</option>
                {parentOptions.map((parent) => (
                  <option key={parent.Id} value={parent.Id}>
                    {parent.AccountCode} — {parent.AccountName} ({parent.AccountType === "INCOME" ? "إيرادات" : "مصروفات"})
                  </option>
                ))}
              </select>
              {parentOptions.length === 0 && <small>لا توجد مجموعات إيرادات أو مصروفات نشطة متاحة.</small>}
            </label>

            <label className="account-checkbox-field">
              <input type="checkbox" checked={isGroup} onChange={(event) => setIsGroup(event.target.checked)} />
              <span><strong>حساب مجموعة</strong><small>يمكن استخدامه لاحقاً كحساب أب لحسابات فرعية أخرى.</small></span>
            </label>

            {/* {account && (
              <div className="account-readonly-note">
                كود الحساب ونوعه وبيانات المؤسسة يتم التحكم بها من الخادم ولا يمكن تعديلها هنا.
              </div>
            )} */}
            {validation && <p className="account-form-error">{validation}</p>}
            <div className="account-modal-actions">
              <button className="button button-secondary" type="button" onClick={onClose} disabled={saving}>إلغاء</button>
              <button className="button button-primary" type="submit" disabled={saving || (!account && parentOptions.length === 0)}>
                {saving ? "جارٍ الحفظ..." : account ? "حفظ التعديلات" : "إنشاء الحساب"}
              </button>
            </div>
          </form>
        )}
        {protectedAccount && (
          <div className="account-modal-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>إغلاق</button>
          </div>
        )}
      </section>
    </div>
  );
}
