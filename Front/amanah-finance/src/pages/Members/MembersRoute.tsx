import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate ,useLocation, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import MembersPage from "./MembersPage";
import MemberFormModal, { type MemberFormValues } from "./MemberFormModal";
import {
  createMember,
  getMembers,
  updateMember,
  closeMember,
  reopenMember,
  type MemberRecord,
} from "../../services/api/membersApi";
type DashboardContext = {
  openPayment: () => void;
};
const CLOSED_MEMBERS_KEY = "amanah_closed_members";

const getStoredClosedMembers = (): MemberRecord[] => {
  try {
    const stored = localStorage.getItem(CLOSED_MEMBERS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed)
      ? parsed.filter(
          (member): member is MemberRecord =>
            typeof member?.Id === "number" && member.IsClosed === true,
        )
      : [];
  } catch {
    return [];
  }
};

const saveStoredClosedMembers = (members: MemberRecord[]) => {
  localStorage.setItem(
    CLOSED_MEMBERS_KEY,
    JSON.stringify(members),
  );
};
export default function MembersRoute() {
  const navigate = useNavigate();
  const location = useLocation();

const { openPayment } =
  useOutletContext<DashboardContext>();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("الكل");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const result = await getMembers();
const storedClosedMembers = getStoredClosedMembers();

const combinedMembers = [
  ...result,
  ...storedClosedMembers.filter(
    (closedMember) =>
      !result.some((member) => member.Id === closedMember.Id),
  ),
];

setMembers(combinedMembers);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "تعذر تحميل الأعضاء";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return members.filter((member) => {
      const matchesSearch = !query || [member.FullName, member.Phone ?? "", String(member.Id)].some((value) => value.toLocaleLowerCase().includes(query));
      const matchesStatus = filter === "الكل" || (filter === "نشط" && !member.IsClosed) || (filter === "مغلق" && member.IsClosed);
      return matchesSearch && matchesStatus;
    });
  }, [members, search, filter]);

  const openAdd = () => { setEditingMember(null); setFormOpen(true); };
  useEffect(() => {
  if (location.state?.openAddMember) {
    openAdd();

    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }
}, [location.state, location.pathname, navigate]);
  const openEdit = (member: MemberRecord) => { setEditingMember(member); setFormOpen(true); };

  const saveMember = async (values: MemberFormValues) => {
    setSaving(true);
    try {
      if (editingMember) {
        await updateMember(editingMember.Id, {
          FullName: values.FullName.trim(),
          Phone: values.Phone.trim() || null,
          JoiningDate: values.JoiningDate,
          Notes: values.Notes.trim() || null,
        });
        toast.success("تم تحديث بيانات العضو بنجاح");
      } else {
        await createMember({
          FullName: values.FullName.trim(),
          Phone: values.Phone.trim() || undefined,
          JoiningDate: values.JoiningDate,
          Notes: values.Notes.trim() || undefined,
          MonthlyAmount: Number(values.MonthlyAmount),
          CommitmentStartMonth: values.CommitmentStartMonth,
        });
        toast.success("تم إضافة العضو والالتزام الأول بنجاح");
      }
      setFormOpen(false);
      setEditingMember(null);
      await loadMembers(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "تعذر حفظ بيانات العضو";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };
  const toggleMemberStatus = async (member: MemberRecord) => {
    const isClosing = !member.IsClosed;

    const confirmed = window.confirm(
      isClosing
        ? `هل أنت متأكد من إغلاق العضو "${member.FullName}"؟`
        : `هل أنت متأكد من إعادة تفعيل العضو "${member.FullName}"؟`
    );

    if (!confirmed) return;

try {
  if (isClosing) {
    await closeMember(member.Id);

    const closedMember = {
      ...member,
      IsClosed: true,
    };

    const storedClosedMembers = getStoredClosedMembers();

    saveStoredClosedMembers([
      ...storedClosedMembers.filter(
        (item) => item.Id !== member.Id,
      ),
      closedMember,
    ]);

    setMembers((current) =>
      current.map((item) =>
        item.Id === member.Id ? closedMember : item,
      ),
    );

    toast.success("تم إغلاق العضو بنجاح");
  } else {
    await reopenMember(member.Id);

    const storedClosedMembers = getStoredClosedMembers();

    saveStoredClosedMembers(
      storedClosedMembers.filter(
        (item) => item.Id !== member.Id,
      ),
    );

    await loadMembers(false);

    toast.success("تم إعادة تفعيل العضو بنجاح");
  }
} catch (err: unknown) {
  const message =
    err instanceof Error ? err.message : "تعذر تحديث حالة العضو";

  toast.error(message);
}
  };
  return (
    <>
      <MembersPage
        members={filteredMembers}
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        loading={loading}
        error={error} 
        onAddPayment={openPayment}
        onEdit={openEdit}
        onView={(member) => navigate(`/members/${member.Id}`)}
        onToggleStatus={toggleMemberStatus}      
      />
      {formOpen && <MemberFormModal member={editingMember} saving={saving} onClose={() => { if (!saving) { setFormOpen(false); setEditingMember(null); } }} onSubmit={saveMember} />}
    </>
  );
}
