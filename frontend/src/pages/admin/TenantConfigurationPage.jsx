import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiClient from "../../api/client";
import { Alert, Badge, Button, Input, PageHeader, Skeleton, Tabs } from "../../components/ui";
import { hasErrors, validate } from "../../utils/validate";

const PROFILE_RULES = [{ name: "name", label: "Nama Perusahaan", required: true }];

const TABS = [
  { key: "profile", label: "Profil" },
  { key: "modules", label: "Modul" },
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

  useEffect(() => {
    loadTenant();
    loadModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantToken]);

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
        </>
      )}
    </div>
  );
}
