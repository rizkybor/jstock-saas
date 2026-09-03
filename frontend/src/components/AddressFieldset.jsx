import { useEffect, useState } from "react";
import { Button, Input, Textarea } from "./ui";
import { fetchDistricts, fetchRegencies, fetchVillages } from "../utils/wilayah";

const selectClass =
  "h-10 min-w-0 rounded-lg border border-border bg-surface px-2.5 text-[15px] text-ink focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

/**
 * One address block: Label + cascading Provinsi/Kabupaten/Kecamatan/Kelurahan
 * selects (sourced from the emsifa wilayah Indonesia API) + free-text detail.
 * Stateless-ish: parent owns the address value, this only owns the child
 * option lists it fetches as province/regency/district are picked.
 */
export default function AddressFieldset({ value, provinces, onChange, onRemove }) {
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);

  useEffect(() => {
    if (!value.province_id) {
      setRegencies([]);
      return;
    }
    fetchRegencies(value.province_id)
      .then(setRegencies)
      .catch(() => setRegencies([]));
  }, [value.province_id]);

  useEffect(() => {
    if (!value.regency_id) {
      setDistricts([]);
      return;
    }
    fetchDistricts(value.regency_id)
      .then(setDistricts)
      .catch(() => setDistricts([]));
  }, [value.regency_id]);

  useEffect(() => {
    if (!value.district_id) {
      setVillages([]);
      return;
    }
    fetchVillages(value.district_id)
      .then(setVillages)
      .catch(() => setVillages([]));
  }, [value.district_id]);

  const handleProvinceChange = (e) => {
    const province = provinces.find((p) => p.id === e.target.value);
    onChange({
      ...value,
      province_id: province?.id ?? "",
      province_name: province?.name ?? "",
      regency_id: "",
      regency_name: "",
      district_id: "",
      district_name: "",
      village_id: "",
      village_name: "",
    });
  };

  const handleRegencyChange = (e) => {
    const regency = regencies.find((r) => r.id === e.target.value);
    onChange({
      ...value,
      regency_id: regency?.id ?? "",
      regency_name: regency?.name ?? "",
      district_id: "",
      district_name: "",
      village_id: "",
      village_name: "",
    });
  };

  const handleDistrictChange = (e) => {
    const district = districts.find((d) => d.id === e.target.value);
    onChange({
      ...value,
      district_id: district?.id ?? "",
      district_name: district?.name ?? "",
      village_id: "",
      village_name: "",
    });
  };

  const handleVillageChange = (e) => {
    const village = villages.find((v) => v.id === e.target.value);
    onChange({ ...value, village_id: village?.id ?? "", village_name: village?.name ?? "" });
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-3 flex items-center gap-2">
        <Input
          placeholder="Label (mis. Rumah, Kantor, Gudang)"
          className="flex-1"
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
        {onRemove && (
          <Button type="button" variant="danger" size="sm" onClick={onRemove}>
            Hapus
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select value={value.province_id || ""} onChange={handleProvinceChange} className={selectClass}>
          <option value="">Pilih Provinsi</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select value={value.regency_id || ""} onChange={handleRegencyChange} disabled={!value.province_id} className={selectClass}>
          <option value="">Pilih Kabupaten/Kota</option>
          {regencies.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select value={value.district_id || ""} onChange={handleDistrictChange} disabled={!value.regency_id} className={selectClass}>
          <option value="">Pilih Kecamatan</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select value={value.village_id || ""} onChange={handleVillageChange} disabled={!value.district_id} className={selectClass}>
          <option value="">Pilih Kelurahan/Desa</option>
          {villages.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        <Textarea
          placeholder="Detail alamat (jalan, RT/RW, no. rumah, kode pos)"
          rows={2}
          value={value.detail || ""}
          onChange={(e) => onChange({ ...value, detail: e.target.value })}
        />
      </div>
    </div>
  );
}
