import { useEffect, useRef, useState } from "react";
import AddressFieldset from "../../components/AddressFieldset";
import apiClient from "../../api/client";
import { Alert, Button, Input, PageHeader, Skeleton } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { hasErrors, validate } from "../../utils/validate";
import { fetchProvinces } from "../../utils/wilayah";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  province_id: "",
  province_name: "",
  regency_id: "",
  regency_name: "",
  district_id: "",
  district_name: "",
  village_id: "",
  village_name: "",
  address: "",
};

const VALIDATION_RULES = [
  { name: "name", label: "Nama Perusahaan", required: true },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Telepon", type: "phone" },
];

/**
 * Self-service company profile — the tenant's own Owner/Manager viewing and
 * editing their own details (view = tenant.view, edit = tenant.update).
 * Deliberately not tied to any module route: shown to every tenant
 * regardless of Inventory Gas Kalibrasi vs Warehouse General.
 */
export default function CompanyProfilePage() {
  const { can } = useAuth();
  const canEdit = can("tenant.update");
  const fileInputRef = useRef(null);

  const [logoUrl, setLogoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [provinces, setProvinces] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState(null);

  const applyTenant = (tenant) => {
    setLogoUrl(tenant.logo_url);
    setForm({
      name: tenant.name ?? "",
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      province_id: tenant.province_id ?? "",
      province_name: tenant.province_name ?? "",
      regency_id: tenant.regency_id ?? "",
      regency_name: tenant.regency_name ?? "",
      district_id: tenant.district_id ?? "",
      district_name: tenant.district_name ?? "",
      village_id: tenant.village_id ?? "",
      village_name: tenant.village_name ?? "",
      address: tenant.address ?? "",
    });
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/tenant");
      applyTenant(data.data);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal memuat profil perusahaan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetchProvinces()
      .then(setProvinces)
      .catch(() => setProvinces([]));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    const errors = validate(form, VALIDATION_RULES);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSaving(true);
    try {
      const { data } = await apiClient.put("/tenant", form);
      applyTenant(data.data);
      setMessage({ tone: "success", text: "Profil perusahaan berhasil disimpan." });
    } catch (err) {
      setMessage({ tone: "danger", text: err.response?.data?.message ?? "Gagal menyimpan profil perusahaan." });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    setLogoBusy(true);

    const body = new FormData();
    body.append("logo", file);

    try {
      const { data } = await apiClient.post("/tenant/logo", body, { headers: { "Content-Type": "multipart/form-data" } });
      applyTenant(data.data);
    } catch (err) {
      setLogoError(err.response?.data?.message ?? "Gagal mengunggah logo.");
    } finally {
      setLogoBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogoRemove = async () => {
    setLogoError(null);
    setLogoBusy(true);
    try {
      const { data } = await apiClient.delete("/tenant/logo");
      applyTenant(data.data);
    } catch (err) {
      setLogoError(err.response?.data?.message ?? "Gagal menghapus logo.");
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Profil Perusahaan" description="Data perusahaan dan logo yang tampil di dokumen jstock." />

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="flex max-w-xl flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="flex max-w-xl flex-col gap-6">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 text-sm font-semibold text-ink">Logo Perusahaan</div>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo perusahaan" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-ink-faint">Belum ada</span>
                )}
              </div>
              {canEdit && (
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" loading={logoBusy} onClick={() => fileInputRef.current?.click()}>
                      {logoUrl ? "Ganti Logo" : "Upload Logo"}
                    </Button>
                    {logoUrl && (
                      <Button type="button" variant="outline-danger" size="sm" loading={logoBusy} onClick={handleLogoRemove}>
                        Hapus
                      </Button>
                    )}
                  </div>
                  <span className="text-xs text-ink-muted">PNG/JPG/WEBP, maks 2MB.</span>
                </div>
              )}
            </div>
            {logoError && (
              <div className="mt-3">
                <Alert>{logoError}</Alert>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Nama Perusahaan"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={fieldErrors.name}
              disabled={!canEdit}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Email Perusahaan"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={fieldErrors.email}
                disabled={!canEdit}
              />
              <Input
                label="Telepon"
                name="phone"
                placeholder="mis. 08123456789"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                error={fieldErrors.phone}
                disabled={!canEdit}
              />
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-ink">Alamat</span>
              <fieldset disabled={!canEdit} className="disabled:opacity-60">
                <AddressFieldset
                  showLabel={false}
                  value={{
                    province_id: form.province_id,
                    province_name: form.province_name,
                    regency_id: form.regency_id,
                    regency_name: form.regency_name,
                    district_id: form.district_id,
                    district_name: form.district_name,
                    village_id: form.village_id,
                    village_name: form.village_name,
                    detail: form.address,
                  }}
                  provinces={provinces}
                  onChange={(next) =>
                    setForm({
                      ...form,
                      province_id: next.province_id,
                      province_name: next.province_name,
                      regency_id: next.regency_id,
                      regency_name: next.regency_name,
                      district_id: next.district_id,
                      district_name: next.district_name,
                      village_id: next.village_id,
                      village_name: next.village_name,
                      address: next.detail,
                    })
                  }
                />
              </fieldset>
            </div>

            {message && <Alert tone={message.tone}>{message.text}</Alert>}

            {canEdit && (
              <div>
                <Button type="submit" loading={saving}>
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
