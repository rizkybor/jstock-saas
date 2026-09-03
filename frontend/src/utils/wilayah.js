// Wilayah Indonesia (province/regency/district/village) lookups, sourced
// from the public emsifa API — https://www.emsifa.com/api-wilayah-indonesia/
// Used to populate the cascading address dropdowns on Data Klien.
const BASE_URL = "https://www.emsifa.com/api-wilayah-indonesia/api";

async function fetchJson(path) {
  const response = await fetch(`${BASE_URL}/${path}`);
  if (!response.ok) throw new Error(`Gagal memuat data wilayah (${path}).`);
  return response.json();
}

export const fetchProvinces = () => fetchJson("provinces.json");
export const fetchRegencies = (provinceId) => fetchJson(`regencies/${provinceId}.json`);
export const fetchDistricts = (regencyId) => fetchJson(`districts/${regencyId}.json`);
export const fetchVillages = (districtId) => fetchJson(`villages/${districtId}.json`);

export const EMPTY_ADDRESS = {
  label: "",
  province_id: "",
  province_name: "",
  regency_id: "",
  regency_name: "",
  district_id: "",
  district_name: "",
  village_id: "",
  village_name: "",
  detail: "",
};
