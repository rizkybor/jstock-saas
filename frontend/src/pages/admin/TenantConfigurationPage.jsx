import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiClient from "../../api/client";
import { Alert, Badge, Button, CodeChip, DataTable, Input, Modal, PageHeader, Skeleton, Tabs } from "../../components/ui";
import { hasErrors, validate } from "../../utils/validate";

const PROFILE_RULES = [{ name: "name", label: "Nama Perusahaan", required: true }];

const TABS = [
  { key: "profile", label: "Profil" },
  { key: "modules", label: "Modul" },
  { key: "users", label: "Pengguna" },
  { key: "roles", label: "Roles & Permission" },
];

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

  useEffect(() => {
    loadTenant();
    loadModules();
    loadRoles();
    loadUsers();
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
        </>
      )}
    </div>
  );
}
