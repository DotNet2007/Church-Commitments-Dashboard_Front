import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import AccountsPage from "./AccountsPage";
import AccountFormModal, { type AccountFormValues } from "./AccountFormModal";
import {
  createAccount,
  deactivateAccount,
  getAccount,
  getAccounts,
  updateAccount,
  type AccountRecord,
} from "../../services/api/accountsApi";

export default function AccountsRoute() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountRecord | null>(null);
  const [viewingAccount, setViewingAccount] = useState<AccountRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAccounts = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      setAccounts(await getAccounts(includeInactive));
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر تحميل دليل الحسابات";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const openAdd = () => {
    setEditingAccount(null);
    setFormOpen(true);
  };

  const openEdit = (account: AccountRecord) => {
    setEditingAccount(account);
    setFormOpen(true);
  };

  const saveAccount = async (values: AccountFormValues) => {
    setSaving(true);
    try {
      if (editingAccount) {
        const payload = {
          name: values.name.trim(),
          isGroup: values.isGroup,
          ...(values.parentId && Number(values.parentId) !== editingAccount.ParentAccountId
            ? { parentId: Number(values.parentId) }
            : {}),
        };
        const updated = await updateAccount(editingAccount.Id, payload);
        setAccounts((current) =>
          current.map((item) => item.Id === updated.Id ? updated : item),
        );
        toast.success("تم تحديث الحساب بنجاح");
      } else {
        const created = await createAccount({
          name: values.name.trim(),
          parentId: Number(values.parentId),
          isGroup: values.isGroup,
        });
        setAccounts((current) =>
          [...current, created].sort((a, b) => a.AccountCode.localeCompare(b.AccountCode)),
        );
        toast.success("تم إنشاء الحساب بنجاح");
      }
      setFormOpen(false);
      setEditingAccount(null);
      await loadAccounts(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر حفظ الحساب");
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (account: AccountRecord) => {
    try {
      setViewingAccount(await getAccount(account.Id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر تحميل تفاصيل الحساب");
    }
  };

  const handleDeactivate = async (account: AccountRecord) => {
    const protectedAccount =
      account.IsSystemAccount ||
      account.AccountCode === "1001" ||
      account.AccountCode === "1004";
    if (protectedAccount) {
      toast.error("لا يمكن إلغاء تفعيل حساب نظام أو حساب النقدية/البنك الثابت.");
      return;
    }
    if (!window.confirm(`هل أنت متأكد من إلغاء تفعيل الحساب "${account.AccountName}"؟`)) return;

    try {
      const result = await deactivateAccount(account.Id);
      if (result.count > 0) {
        setAccounts((current) =>
          current.map((item) => item.Id === account.Id ? { ...item, IsActive: false } : item),
        );
        toast.success("تم إلغاء تفعيل الحساب. لم يتم حذفه نهائياً.");
        if (!includeInactive) {
          setAccounts((current) => current.filter((item) => item.Id !== account.Id));
        }
      } else {
        toast.info("الحساب غير نشط بالفعل.");
        await loadAccounts(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر إلغاء تفعيل الحساب");
    }
  };

  const handleReactivate = async (account: AccountRecord) => {
    if (!window.confirm(`هل تريد إعادة تفعيل الحساب "${account.AccountName}"؟`)) return;
    try {
      const updated = await updateAccount(account.Id, { isActive: true });
      setAccounts((current) =>
        current.map((item) => item.Id === updated.Id ? updated : item),
      );
      toast.success("تمت إعادة تفعيل الحساب بنجاح.");
      await loadAccounts(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر إعادة تفعيل الحساب");
    }
  };

  return (
    <>
      <AccountsPage
        accounts={accounts}
        allAccounts={accounts}
        loading={loading}
        error={error}
        search={search}
        setSearch={setSearch}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        includeInactive={includeInactive}
        setIncludeInactive={setIncludeInactive}
        onAdd={openAdd}
        onEdit={openEdit}
        onView={openDetails}
        onDeactivate={handleDeactivate}
        onReactivate={handleReactivate}
        onRetry={() => void loadAccounts()}
      />

      {formOpen && (
        <AccountFormModal
          account={editingAccount}
          accounts={accounts}
          saving={saving}
          onClose={() => {
            if (!saving) {
              setFormOpen(false);
              setEditingAccount(null);
            }
          }}
          onSubmit={saveAccount}
        />
      )}

      {viewingAccount && (
        <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setViewingAccount(null);
        }}>
          <section className="account-modal account-details-modal" role="dialog" aria-modal="true" aria-labelledby="account-details-title">
            <div className="account-modal-heading">
              <div>
                <span className="eyebrow">تفاصيل الحساب</span>
                <h2 id="account-details-title">{viewingAccount.AccountName}</h2>
              </div>
              <button className="account-close" type="button" onClick={() => setViewingAccount(null)} aria-label="إغلاق">×</button>
            </div>
            <div className="account-details-grid">
              <div><span>كود الحساب</span><strong dir="ltr">{viewingAccount.AccountCode}</strong></div>
              <div><span>نوع الحساب</span><strong>{viewingAccount.AccountType === "INCOME" ? "إيرادات" : viewingAccount.AccountType === "EXPENSE" ? "مصروفات" : "نقدية / بنك"}</strong></div>
              <div><span>الحساب الأب</span><strong>{viewingAccount.Parent?.AccountName ?? "حساب رئيسي"}</strong></div>
              <div><span>عدد الحسابات الفرعية</span><strong>{viewingAccount._count?.Children ?? 0}</strong></div>
              <div><span>طبيعة الحساب</span><strong>{viewingAccount.IsGroup ? "مجموعة" : "حساب تفصيلي"}</strong></div>
              <div><span>الحالة</span><strong>{viewingAccount.IsActive ? "نشط" : "غير نشط"}</strong></div>
              <div><span>حساب نظام</span><strong>{viewingAccount.IsSystemAccount ? "نعم" : "لا"}</strong></div>
              <div><span>تاريخ الإنشاء</span><strong>{new Date(viewingAccount.CreatedAt).toLocaleDateString("ar-EG")}</strong></div>
              <div><span>آخر تحديث</span><strong>{new Date(viewingAccount.UpdatedAt).toLocaleDateString("ar-EG")}</strong></div>
            </div>
            <div className="account-modal-actions">
              <button className="button button-secondary" type="button" onClick={() => setViewingAccount(null)}>إغلاق</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
