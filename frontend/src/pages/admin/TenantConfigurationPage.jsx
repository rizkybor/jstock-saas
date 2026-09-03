import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiClient from "../../api/client";
import { Alert, Badge, Button, CodeChip, DataTable, Input, Modal, PageHeader, Skeleton, Tabs } from "../../components/ui";
import { hasErrors, validate } from "../../utils/validate";

const PROFILE_RULES = [{ name: "name", label: "Nama Perusahaan", required: true }];

const TABS = [
  { key: "profile", label: "Profil" },
  { key: "plan", label: "Plan" },
  { key: "modules", label: "Modul" },
  { key: "users", label: "Pengguna" },
  { key: "roles", label: "Roles & Permission" },
  { key: "approval", label: "Approval" },
];

const SUBSCRIPTION_STATUS_LABELS = {
  trialing: "Trial",
  active: "Aktif",
  past_due: "Terlambat Bayar",
  cancelled: "Dibatalkan",
};

const ROLE_LABELS = {
  owner: "Owner",
  manager: "Manager",
  operator: "Operator",
  viewer: "Viewer",
};

const ROLE_NAME_RE = /^[a-z][a-z0-9_-]*$/;
const ROLE_PRESETS = ["owner", "manager", "operator", "viewer"];

const EMPTY_USER_FORM = { name: "", email: "", password: "", role: "", is_active: true };

const USER_RULES = [
  { name: "name", label: "Nama", required: true },
  { name: "email", label: "Email", required: true, type: "email" },
  { name: "role", label: "Role / Jabatan", required: true },
];

export default function TenantConfigurationPage() {
  const { tenantToken } = useParams();
  const [tab, setTab] = useState("profile");
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState(null);
  const [planMessage, setPlanMessage] = useState(null);
  const [planForm, setPlanForm] = useState({ plan_id: "", status: "active", ends_at: "" });
  const [savingPlan, setSavingPlan] = useState(false);
  const [planCreateOpen, setPlanCreateOpen] = useState(false);
  const [newPlanForm, setNewPlanForm] = useState({ name: "", price: "", max_users: "", max_transactions_per_month: "" });
  const [savingNewPlan, setSavingNewPlan] = useState(false);
  const [newPlanError, setNewPlanError] = useState(null);

  const [catalogModules, setCatalogModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [moduleBusyId, setModuleBusyId] = useState(null);
  const [moduleError, setModuleError] = useState(null);

  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roleError, setRoleError] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [draftPermissions, setDraftPermissions] = useState([]);
  const [savingRole, setSavingRole] = useState(false);
  const [resettingRole, setResettingRole] = useState(false);
  const [roleMessage, setRoleMessage] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);
  const [userFormMode, setUserFormMode] = useState(null); // "create" | "edit" | null
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [userFieldErrors, setUserFieldErrors] = useState({});
  const [userFormError, setUserFormError] = useState(null);
  const [savingUser, setSavingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);

  const [requiresApproval, setRequiresApproval] = useState(true);
  const [approvalSteps, setApprovalSteps] = useState([]);
  const [approvalLoading, setApprovalLoading] = useState(true);
  const [approvalError, setApprovalError] = useState(null);
  const [approvalMessage, setApprovalMessage] = useState(null);
  const [approvalWarnings, setApprovalWarnings] = useState([]);
  const [savingApproval, setSavingApproval] = useState(false);

  const loadTenant = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/admin/tenants/${tenantToken}`);
      setTenant(data.data);
      setForm({
        name: data.data.name ?? "",
        email: data.data.email ?? "",
        phone: data.data.phone ?? "",
        address: data.data.address ?? "",
      });
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal memuat data tenant.");
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async () => {
    setModulesLoading(true);
    setModuleError(null);
    try {
      const { data } = await apiClient.get(`/admin/tenants/${tenantToken}/modules`);
      setCatalogModules(data.data);
    } catch {
      setModuleError("Gagal memuat modul tenant ini.");
    } finally {
      setModulesLoading(false);
    }
  };

  const loadRoles = async () => {
    setRolesLoading(true);
    setRoleError(null);
    try {
      const [catalogRes, rolesRes] = await Promise.all([
        apiClient.get("/admin/permissions/catalog"),
        apiClient.get(`/admin/tenants/${tenantToken}/roles`),
      ]);
      setPermissionCatalog(catalogRes.data.data);
      setRoles(rolesRes.data.data);
    } catch {
      setRoleError("Gagal memuat Roles & Permission tenant ini.");
    } finally {
      setRolesLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const { data } = await apiClient.get(`/admin/tenants/${tenantToken}/users`);
      setUsers(data.data);
    } catch {
      setUsersError("Gagal memuat akun pengguna tenant ini.");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadPlanData = async () => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const [plansRes, subRes] = await Promise.all([
        apiClient.get("/admin/plans"),
        apiClient.get(`/admin/tenants/${tenantToken}/subscription`),
      ]);
      setPlans(plansRes.data.data);
      setSubscription(subRes.data.data);
      setPlanForm({
        plan_id: subRes.data.data?.plan?.id ?? "",
        status: subRes.data.data?.status ?? "active",
        ends_at: subRes.data.data?.ends_at ? subRes.data.data.ends_at.slice(0, 10) : "",
      });
    } catch {
      setPlanError("Gagal memuat data plan tenant ini.");
    } finally {
      setPlanLoading(false);
    }
  };

  const loadApprovalSettings = async () => {
    setApprovalLoading(true);
    setApprovalError(null);
    try {
      const { data } = await apiClient.get(`/admin/tenants/${tenantToken}/approval-settings`);
      setRequiresApproval(data.data.requires_approval);
      setApprovalSteps(data.data.steps.map((s) => ({ role: s.role, label: s.label ?? "" })));
    } catch {
      setApprovalError("Gagal memuat pengaturan approval tenant ini.");
    } finally {
      setApprovalLoading(false);
    }
  };

  useEffect(() => {
    loadTenant();
    loadModules();
    loadRoles();
    loadUsers();
    loadApprovalSettings();
    loadPlanData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantToken]);

  useEffect(() => {
    if (!selectedRole && roles.length > 0) {
      setSelectedRole(roles[0].role);
      return;
    }
    const current = roles.find((r) => r.role === selectedRole);
    setDraftPermissions(current ? [...current.permissions] : []);
    setRoleMessage(null);
  }, [selectedRole, roles]);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileMessage(null);

    const errors = validate(form, PROFILE_RULES);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSavingProfile(true);
    try {
      const { data } = await apiClient.put(`/admin/tenants/${tenantToken}`, form);
      setTenant(data.data);
      setProfileMessage({ tone: "success", text: "Profil tenant berhasil disimpan." });
    } catch (err) {
      setProfileMessage({ tone: "danger", text: err.response?.data?.message ?? "Gagal menyimpan profil." });
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleModule = async (module) => {
    setModuleError(null);
    setModuleBusyId(module.id);
    try {
      if (module.enabled) {
        await apiClient.delete(`/admin/tenants/${tenantToken}/modules/${module.id}`);
      } else {
        await apiClient.post(`/admin/tenants/${tenantToken}/modules/${module.id}`);
      }
      setCatalogModules((list) => list.map((m) => (m.id === module.id ? { ...m, enabled: !m.enabled } : m)));
    } catch (err) {
      setModuleError(err.response?.data?.message ?? "Gagal memperbarui modul.");
    } finally {
      setModuleBusyId(null);
    }
  };

  const togglePermission = (permission) => {
    setDraftPermissions((list) =>
      list.includes(permission) ? list.filter((p) => p !== permission) : [...list, permission],
    );
  };

  const saveRolePermissions = async () => {
    setRoleError(null);
    setRoleMessage(null);
    setSavingRole(true);
    try {
      await apiClient.put(`/admin/tenants/${tenantToken}/roles/${selectedRole}`, { permissions: draftPermissions });
      await loadRoles();
      setRoleMessage({
        tone: "success",
        text: `Permission untuk role "${ROLE_LABELS[selectedRole] ?? selectedRole}" berhasil disimpan.`,
      });
    } catch (err) {
      setRoleError(err.response?.data?.message ?? "Gagal menyimpan permission.");
    } finally {
      setSavingRole(false);
    }
  };

  const resetRolePermissions = async () => {
    if (!confirm(`Kembalikan role "${ROLE_LABELS[selectedRole] ?? selectedRole}" ke default platform?`)) return;
    setRoleError(null);
    setRoleMessage(null);
    setResettingRole(true);
    try {
      await apiClient.delete(`/admin/tenants/${tenantToken}/roles/${selectedRole}`);
      await loadRoles();
      setRoleMessage({
        tone: "success",
        text: `Role "${ROLE_LABELS[selectedRole] ?? selectedRole}" dikembalikan ke default platform.`,
      });
    } catch (err) {
      setRoleError(err.response?.data?.message ?? "Gagal mereset permission.");
    } finally {
      setResettingRole(false);
    }
  };

  const currentRole = roles.find((r) => r.role === selectedRole);

  const addApprovalStep = () => {
    setApprovalSteps((list) => [...list, { role: roles[0]?.role ?? "", label: "" }]);
  };

  const updateApprovalStep = (index, patch) => {
    setApprovalSteps((list) => list.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  };

  const removeApprovalStep = (index) => {
    setApprovalSteps((list) => list.filter((_, i) => i !== index));
  };

  const moveApprovalStep = (index, direction) => {
    setApprovalSteps((list) => {
      const target = index + direction;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveApprovalSettings = async () => {
    setApprovalError(null);
    setApprovalMessage(null);
    setApprovalWarnings([]);

    if (requiresApproval && approvalSteps.some((s) => !s.role.trim())) {
      setApprovalError("Setiap tahap approval harus memilih role.");
      return;
    }

    setSavingApproval(true);
    try {
      const { data } = await apiClient.put(`/admin/tenants/${tenantToken}/approval-settings`, {
        requires_approval: requiresApproval,
        steps: requiresApproval ? approvalSteps.map((s) => ({ role: s.role, label: s.label || null })) : [],
      });
      setApprovalSteps(data.data.steps.map((s) => ({ role: s.role, label: s.label ?? "" })));
      setApprovalWarnings(data.warnings ?? []);
      setApprovalMessage("Pengaturan approval berhasil disimpan.");
    } catch (err) {
      setApprovalError(err.response?.data?.message ?? "Gagal menyimpan pengaturan approval.");
    } finally {
      setSavingApproval(false);
    }
  };

  const saveSubscription = async (event) => {
    event.preventDefault();
    setPlanError(null);
    setPlanMessage(null);

    if (!planForm.plan_id) {
      setPlanError("Pilih plan terlebih dahulu.");
      return;
    }

    setSavingPlan(true);
    try {
      const { data } = await apiClient.put(`/admin/tenants/${tenantToken}/subscription`, {
        plan_id: Number(planForm.plan_id),
        status: planForm.status,
        ends_at: planForm.ends_at || null,
      });
      setSubscription(data.data);
      setPlanMessage("Plan tenant berhasil diperbarui.");
    } catch (err) {
      setPlanError(err.response?.data?.message ?? "Gagal menyimpan plan tenant.");
    } finally {
      setSavingPlan(false);
    }
  };

  const handleCreatePlan = async (event) => {
    event.preventDefault();
    setNewPlanError(null);

    if (!newPlanForm.name.trim()) {
      setNewPlanError("Nama plan wajib diisi.");
      return;
    }

    setSavingNewPlan(true);
    try {
      const { data } = await apiClient.post("/admin/plans", {
        name: newPlanForm.name,
        price: newPlanForm.price || null,
        max_users: newPlanForm.max_users || null,
        max_transactions_per_month: newPlanForm.max_transactions_per_month || null,
      });
      setPlans((list) => [...list, data.data]);
      setPlanForm((f) => ({ ...f, plan_id: data.data.id }));
      setNewPlanForm({ name: "", price: "", max_users: "", max_transactions_per_month: "" });
      setPlanCreateOpen(false);
    } catch (err) {
      setNewPlanError(err.response?.data?.message ?? "Gagal membuat plan baru.");
    } finally {
      setSavingNewPlan(false);
    }
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm(EMPTY_USER_FORM);
    setUserFieldErrors({});
    setUserFormError(null);
    setUserFormMode("create");
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setUserForm({ name: user.name, email: user.email, password: "", role: user.role, is_active: user.is_active });
    setUserFieldErrors({});
    setUserFormError(null);
    setUserFormMode("edit");
  };

  const closeUserForm = () => {
    setUserFormMode(null);
    setEditingUser(null);
  };

  const handleUserSubmit = async (event) => {
    event.preventDefault();
    setUserFormError(null);

    const errors = validate(userForm, USER_RULES);
    if (userFormMode === "create" && !userForm.password.trim()) {
      errors.password = "Password wajib diisi.";
    } else if (userForm.password && userForm.password.length < 8) {
      errors.password = "Password minimal 8 karakter.";
    }
    if (userForm.role && !ROLE_NAME_RE.test(userForm.role)) {
      errors.role = "Gunakan huruf kecil, angka, garis bawah/strip, diawali huruf (mis. supervisor_qc).";
    }
    setUserFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSavingUser(true);
    try {
      const payload = { name: userForm.name, email: userForm.email, role: userForm.role, is_active: userForm.is_active };
      if (userForm.password) payload.password = userForm.password;

      if (userFormMode === "create") {
        await apiClient.post(`/admin/tenants/${tenantToken}/users`, payload);
      } else {
        await apiClient.put(`/admin/tenants/${tenantToken}/users/${editingUser.id}`, payload);
      }
      closeUserForm();
      await Promise.all([loadUsers(), loadRoles()]);
    } catch (err) {
      setUserFormError(err.response?.data?.message ?? "Gagal menyimpan akun pengguna.");
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Hapus akun "${user.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setUsersError(null);
    setDeletingUserId(user.id);
    try {
      await apiClient.delete(`/admin/tenants/${tenantToken}/users/${user.id}`);
      await Promise.all([loadUsers(), loadRoles()]);
    } catch (err) {
      setUsersError(err.response?.data?.message ?? "Gagal menghapus akun pengguna.");
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div>
      <div className="mb-1">
        <Link to="/admin/tenants" className="text-sm text-ink-muted hover:text-ink">
          &larr; Kelola Tenant
        </Link>
      </div>
      <PageHeader
        title={loading ? "Memuat..." : `Konfigurasi — ${tenant?.name}`}
        description="Atur profil perusahaan dan modul sistem yang aktif untuk tenant ini."
        action={tenant && <Badge status={tenant.status}>{tenant.status}</Badge>}
      />

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full max-w-96" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <Tabs tabs={TABS} active={tab} onChange={setTab} />

          {tab === "profile" && (
            <form onSubmit={handleProfileSubmit} noValidate className="flex max-w-xl flex-col gap-4">
              <Input
                label="Nama Perusahaan"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={fieldErrors.name}
                required
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Email Perusahaan"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Input
                  label="Telepon"
                  name="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <Input
                label="Alamat"
                name="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />

              {profileMessage && <Alert tone={profileMessage.tone}>{profileMessage.text}</Alert>}

              <div>
                <Button type="submit" loading={savingProfile}>
                  {savingProfile ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          )}

          {tab === "plan" && (
            <div className="max-w-xl">
              <p className="mb-4 text-sm text-ink-muted">
                Kelola plan langganan tenant ini — plan menentukan batas jumlah user dan transaksi per bulan.
              </p>

              {planError && (
                <div className="mb-3">
                  <Alert>{planError}</Alert>
                </div>
              )}

              {planLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  {subscription?.plan && (
                    <div className="mb-4 rounded-lg border border-border bg-surface-2 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink">{subscription.plan.name}</span>
                        <Badge status={subscription.status === "active" ? "active" : "inactive"}>
                          {SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? subscription.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-ink-muted">
                        {subscription.plan.price != null && <>Rp {Number(subscription.plan.price).toLocaleString("id-ID")}/bulan · </>}
                        Maks {subscription.plan.max_users ?? "∞"} user · Maks{" "}
                        {subscription.plan.max_transactions_per_month ?? "∞"} transaksi/bulan
                        {subscription.ends_at && <> · Berakhir {subscription.ends_at.slice(0, 10)}</>}
                      </div>
                    </div>
                  )}

                  <form onSubmit={saveSubscription} className="flex flex-col gap-4">
                    <div>
                      <span className="mb-1.5 block text-sm font-semibold text-ink">Plan</span>
                      <div className="flex gap-2">
                        <select
                          value={planForm.plan_id}
                          onChange={(e) => setPlanForm({ ...planForm, plan_id: e.target.value })}
                          className="h-10 min-w-0 flex-1 rounded border border-border bg-surface px-2.5 text-[15px] text-ink focus:border-primary focus:outline-none"
                        >
                          <option value="">Pilih plan</option>
                          {plans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.price != null ? ` — Rp ${Number(p.price).toLocaleString("id-ID")}/bln` : ""}
                            </option>
                          ))}
                        </select>
                        <Button type="button" variant="secondary" onClick={() => setPlanCreateOpen((v) => !v)}>
                          + Plan Baru
                        </Button>
                      </div>
                    </div>

                    {planCreateOpen && (
                      <div className="rounded-lg border border-border p-3">
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row">
                          <Input
                            placeholder="Nama plan (mis. Pro)"
                            value={newPlanForm.name}
                            onChange={(e) => setNewPlanForm({ ...newPlanForm, name: e.target.value })}
                          />
                          <Input
                            type="number"
                            min="0"
                            placeholder="Harga/bulan"
                            value={newPlanForm.price}
                            onChange={(e) => setNewPlanForm({ ...newPlanForm, price: e.target.value })}
                          />
                        </div>
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row">
                          <Input
                            type="number"
                            min="1"
                            placeholder="Maks user"
                            value={newPlanForm.max_users}
                            onChange={(e) => setNewPlanForm({ ...newPlanForm, max_users: e.target.value })}
                          />
                          <Input
                            type="number"
                            min="1"
                            placeholder="Maks transaksi/bulan"
                            value={newPlanForm.max_transactions_per_month}
                            onChange={(e) => setNewPlanForm({ ...newPlanForm, max_transactions_per_month: e.target.value })}
                          />
                        </div>
                        {newPlanError && (
                          <div className="mb-3">
                            <Alert>{newPlanError}</Alert>
                          </div>
                        )}
                        <Button type="button" size="sm" loading={savingNewPlan} onClick={handleCreatePlan}>
                          Simpan Plan Baru
                        </Button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <span className="mb-1.5 block text-sm font-semibold text-ink">Status Langganan</span>
                        <select
                          value={planForm.status}
                          onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                          className="h-10 w-full rounded border border-border bg-surface px-2.5 text-[15px] text-ink focus:border-primary focus:outline-none"
                        >
                          {Object.entries(SUBSCRIPTION_STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        label="Berlaku Sampai"
                        type="date"
                        value={planForm.ends_at}
                        onChange={(e) => setPlanForm({ ...planForm, ends_at: e.target.value })}
                        hint="Opsional"
                      />
                    </div>

                    {planMessage && <Alert tone="success">{planMessage}</Alert>}

                    <div>
                      <Button type="submit" loading={savingPlan}>
                        {savingPlan ? "Menyimpan..." : "Simpan Plan"}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          {tab === "modules" && (
            <div className="max-w-xl">
              {moduleError && (
                <div className="mb-3">
                  <Alert>{moduleError}</Alert>
                </div>
              )}

              {modulesLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {catalogModules.map((module) => (
                    <label
                      key={module.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-surface-2 has-disabled:cursor-not-allowed has-disabled:opacity-50"
                    >
                      <input
                        type="checkbox"
                        checked={module.enabled}
                        disabled={moduleBusyId === module.id}
                        onChange={() => toggleModule(module)}
                        className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                      />
                      <div>
                        <div className="text-sm font-semibold text-ink">{module.name}</div>
                        {module.description && <div className="text-xs text-ink-muted">{module.description}</div>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "users" && (
            <div>
              <div className="mb-4 flex items-start justify-between gap-3">
                <p className="max-w-xl text-sm text-ink-muted">
                  Super Admin mengelola akun untuk tenant ini — role di sini bebas diisi sesuai jabatan yang dipakai tenant
                  (mis. "owner", "manager", atau jabatan lain), dan hanya role yang benar-benar dipakai yang muncul di tab
                  Roles & Permission.
                </p>
                <Button onClick={openCreateUser}>+ Tambah Akun</Button>
              </div>

              {usersError && (
                <div className="mb-3">
                  <Alert>{usersError}</Alert>
                </div>
              )}

              <DataTable
                columns={[
                  { key: "name", header: "Nama" },
                  { key: "email", header: "Email" },
                  { key: "role", header: "Role", render: (row) => <CodeChip>{row.role}</CodeChip> },
                  {
                    key: "is_active",
                    header: "Status",
                    render: (row) => (
                      <Badge status={row.is_active ? "active" : "inactive"}>{row.is_active ? "Aktif" : "Nonaktif"}</Badge>
                    ),
                  },
                  {
                    key: "actions",
                    header: "Aksi",
                    render: (row) => (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openEditUser(row)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={deletingUserId === row.id}
                          onClick={() => handleDeleteUser(row)}
                        >
                          Hapus
                        </Button>
                      </div>
                    ),
                  },
                ]}
                rows={users}
                rowKey={(row) => row.id}
                emptyMessage="Belum ada akun untuk tenant ini."
                loading={usersLoading}
              />

              {userFormMode && (
                <Modal
                  title={userFormMode === "create" ? "Tambah Akun" : `Edit Akun — ${editingUser?.name}`}
                  description="Role bebas diisi (huruf kecil, boleh pakai _ atau -) sesuai jabatan tenant ini."
                  onClose={closeUserForm}
                  width="480px"
                >
                  <form onSubmit={handleUserSubmit} noValidate className="flex flex-col gap-4">
                    <Input
                      label="Nama"
                      name="name"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      error={userFieldErrors.name}
                      required
                    />
                    <Input
                      label="Email"
                      name="email"
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      error={userFieldErrors.email}
                      required
                    />
                    <Input
                      label={userFormMode === "create" ? "Password" : "Password Baru"}
                      name="password"
                      type="password"
                      hint={userFormMode === "edit" ? "Kosongkan jika tidak ingin mengubah password" : undefined}
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      error={userFieldErrors.password}
                      required={userFormMode === "create"}
                    />
                    <Input
                      label="Role / Jabatan"
                      name="role"
                      list="role-presets"
                      placeholder="mis. owner, manager, supervisor_qc"
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                      error={userFieldErrors.role}
                      required
                    />
                    <datalist id="role-presets">
                      {[...new Set([...ROLE_PRESETS, ...roles.map((r) => r.role)])].map((role) => (
                        <option key={role} value={role} />
                      ))}
                    </datalist>

                    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={userForm.is_active}
                        onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                      Akun aktif
                    </label>

                    {userFormError && <Alert>{userFormError}</Alert>}

                    <div className="flex justify-end gap-2 border-t border-border pt-4">
                      <Button type="button" variant="secondary" onClick={closeUserForm}>
                        Batal
                      </Button>
                      <Button type="submit" loading={savingUser}>
                        {savingUser ? "Menyimpan..." : "Simpan"}
                      </Button>
                    </div>
                  </form>
                </Modal>
              )}
            </div>
          )}

          {tab === "roles" && (
            <div className="max-w-2xl">
              <p className="mb-4 text-sm text-ink-muted">
                Atur permission per role khusus untuk tenant ini. Role yang belum dikustomisasi mengikuti matriks default platform.
              </p>

              {roleError && (
                <div className="mb-3">
                  <Alert>{roleError}</Alert>
                </div>
              )}

              {rolesLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : roles.length === 0 ? (
                <Alert tone="info">Belum ada akun untuk tenant ini — tambahkan akun di tab Pengguna terlebih dahulu.</Alert>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {roles.map((r) => (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => setSelectedRole(r.role)}
                        className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                          selectedRole === r.role
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-surface text-ink hover:bg-surface-2"
                        }`}
                      >
                        {ROLE_LABELS[r.role] ?? r.role}
                        {r.is_custom && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${selectedRole === r.role ? "bg-white" : "bg-primary"}`}
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {currentRole && (
                    <div className="mb-3 text-xs text-ink-muted">
                      {currentRole.is_custom ? "● Menggunakan permission kustom untuk tenant ini." : "Mengikuti default platform."}
                    </div>
                  )}

                  {roleMessage && (
                    <div className="mb-3">
                      <Alert tone={roleMessage.tone}>{roleMessage.text}</Alert>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    {permissionCatalog.map((group) => (
                      <div key={group.module} className="rounded-lg border border-border p-3">
                        <div className="mb-2 text-sm font-semibold text-ink capitalize">{group.module}</div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {group.permissions.map((permission) => (
                            <label key={permission} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                              <input
                                type="checkbox"
                                checked={draftPermissions.includes(permission)}
                                onChange={() => togglePermission(permission)}
                                className="h-4 w-4 cursor-pointer accent-primary"
                              />
                              {permission}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button onClick={saveRolePermissions} loading={savingRole}>
                      {savingRole ? "Menyimpan..." : "Simpan"}
                    </Button>
                    <Button variant="secondary" onClick={resetRolePermissions} loading={resettingRole} disabled={!currentRole?.is_custom}>
                      Reset ke Default
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "approval" && (
            <div className="max-w-2xl">
              <p className="mb-4 text-sm text-ink-muted">
                Atur apakah Transaksi Barang Keluar tenant ini perlu di-approve, dan bila ya, tahapan role apa saja yang
                harus menyetujui secara berurutan sebelum stok dipotong & invoice dibuat.
              </p>

              {approvalError && (
                <div className="mb-3">
                  <Alert>{approvalError}</Alert>
                </div>
              )}

              {approvalLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
                    <input
                      type="checkbox"
                      checked={requiresApproval}
                      onChange={(e) => setRequiresApproval(e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                    Transaksi memerlukan approval
                  </label>

                  {!requiresApproval && (
                    <Alert tone="info">
                      Approval dimatikan — setiap Transaksi Barang Keluar akan langsung berstatus "approved" saat dibuat,
                      stok langsung terpotong dan invoice langsung terbit.
                    </Alert>
                  )}

                  {requiresApproval && (
                    <>
                      {approvalSteps.length === 0 ? (
                        <Alert tone="info">
                          Belum ada tahap approval — mode sederhana aktif: siapa pun dengan izin "transactions.approve"
                          bisa langsung approve dalam satu langkah.
                        </Alert>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {approvalSteps.map((step, index) => (
                            <div key={index} className="flex items-center gap-2 rounded-lg border border-border p-3">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink-muted">
                                {index + 1}
                              </span>
                              <select
                                value={step.role}
                                onChange={(e) => updateApprovalStep(index, { role: e.target.value })}
                                className="h-10 min-w-0 flex-1 rounded border border-border bg-surface px-2.5 text-[15px] text-ink focus:border-primary focus:outline-none"
                              >
                                <option value="">Pilih role</option>
                                {roles.map((r) => (
                                  <option key={r.role} value={r.role}>
                                    {ROLE_LABELS[r.role] ?? r.role}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Label tahap (opsional)"
                                value={step.label}
                                onChange={(e) => updateApprovalStep(index, { label: e.target.value })}
                                className="h-10 min-w-0 flex-1 rounded border border-border bg-surface px-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[rgba(0,117,222,0.12)]"
                              />
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  disabled={index === 0}
                                  onClick={() => moveApprovalStep(index, -1)}
                                >
                                  ↑
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  disabled={index === approvalSteps.length - 1}
                                  onClick={() => moveApprovalStep(index, 1)}
                                >
                                  ↓
                                </Button>
                                <Button type="button" variant="danger" size="sm" onClick={() => removeApprovalStep(index)}>
                                  Hapus
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3">
                        <Button type="button" variant="secondary" onClick={addApprovalStep} disabled={roles.length === 0}>
                          + Tambah Tahap
                        </Button>
                      </div>
                    </>
                  )}

                  {approvalWarnings.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2">
                      {approvalWarnings.map((warning, i) => (
                        <Alert key={i} tone="info">
                          {warning}
                        </Alert>
                      ))}
                    </div>
                  )}

                  {approvalMessage && (
                    <div className="mt-4">
                      <Alert tone="success">{approvalMessage}</Alert>
                    </div>
                  )}

                  <div className="mt-4">
                    <Button onClick={saveApprovalSettings} loading={savingApproval}>
                      {savingApproval ? "Menyimpan..." : "Simpan Pengaturan Approval"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
