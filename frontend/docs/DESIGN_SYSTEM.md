# jstock Frontend Design System

Referensi visual: `docs/Inventory Dashboard (standalone).html` — sebuah prototipe Claude Design ("Puskalindo", sistem inventory gas kalibrasi) yang jadi acuan palet, tipografi, dan layout jstock saat ini. Dokumen ini adalah panduan pemakaian di kode.

## 1. Filosofi

jstock dipakai berjam-jam oleh Owner/Manager/Operator/Viewer gudang setiap hari — bukan situs pemasaran. Prioritasnya: **mudah dipindai, kontras yang aman, dan konsisten** di setiap layar. Referensinya sendiri light-only (tidak mendesain mode gelap), jadi jstock ikut light-only — jangan tambahkan `dark:` atau media query gelap baru tanpa keputusan desain eksplisit. Semua token warna & tipografi didefinisikan satu kali di `src/index.css`, lalu dikonsumsi lewat utility class Tailwind — jangan menulis hex/px manual di komponen halaman (kecuali beberapa ukuran presisi dari referensi yang memang ditulis sebagai arbitrary value, mis. `text-[15px]`, `tracking-[-0.25px]`).

## 2. Palet Warna

| Token Tailwind | Variabel CSS | Nilai | Dipakai untuk |
|---|---|---|---|
| `bg-primary` / `text-primary` | `--primary` | `#0075de` | Tombol utama, link, nav aktif |
| `bg-primary-ink` / `text-primary-ink` | `--primary-ink` | `#005bab` | Hover/pressed di atas primary |
| `bg-primary-soft` | `--primary-soft` | `#eaf3fd` | Latar chip/nav aktif/avatar yang lembut |
| `bg-brand-mark` | `--brand-mark` | `#213183` | Kotak logo jstock (sidebar, login, invoice) |
| `bg-ink` / `text-ink` | `--ink` | `#000000` | Teks utama |
| `text-ink-muted` | `--ink-muted` | `#615d59` | Teks sekunder/caption/deskripsi |
| `text-ink-faint` | `--ink-faint` | `#a39e98` | Placeholder, label uppercase kecil, teks disabled |
| `bg-bg` | `--bg` | `#f6f5f4` | Latar halaman |
| `bg-surface` | `--surface` | `#ffffff` | Kartu, tabel, form, sidebar |
| `bg-surface-2` | `--surface-2` | `#f6f5f4` | Header tabel, hover baris, empty state |
| `border-border` | `--border` | `#e6e6e6` | Semua border kartu/tabel/divider |

**Warna semantik status** — *sengaja terpisah dari warna brand* supaya makna status transaksi/data tidak pernah tertukar dengan warna aksi biasa. Tiap status juga punya varian `-soft` (latar) dan `-border` (cincin tipis di `Badge`):

| Token | Nilai (teks / latar / border) | Arti | Dipakai di `<Badge status="...">` |
|---|---|---|---|
| `success` | `#0f7a27` / `#e6f7ea` / `#b9e6c3` | Approved / Aktif | `status="approved"` / `"active"` |
| `success-solid` | `#1aae39` | Isi tombol **Approve** (`variant="success"`) | — |
| `warning` | `#8a5a00` / `#fdf3d9` / `#f0d78c` | Pending | `status="pending"` |
| `danger` | `#b3282c` / `#fceaea` / `#f3c6c7` | Rejected / Suspended | `status="rejected"` / `"suspended"` |
| `danger-solid` | `#e5484d` | Isi tombol **danger** solid, teks/border tombol **outline-danger** (Reject) | — |
| `info` | `#0075de` (= primary) | Trial / info terkait brand | `status="trial"` |
| netral (`ink-muted` / `surface-2` / `border`) | — | Cancelled / Nonaktif | `status="cancelled"` / `"inactive"` |

Tidak ada mode gelap — referensi tidak mendesainnya, jadi jangan bikin token gelap yang tidak punya sumber acuan.

## 3. Tipografi

- **Inter** (`font-sans`, default) — satu-satunya font UI: heading, body, label, tombol. Dimuat dari Google Fonts di `index.html`.
- **Monospace sistem** (`font-mono` = `ui-monospace, SFMono-Regular, Menlo, monospace`) — khusus kode: LOT/Batch, nomor transaksi, slug. Tidak pakai web font, sesuai referensi.

Ukuran yang sering dipakai persis seperti referensi (arbitrary value, bukan skala Tailwind default): judul halaman `text-[22px] font-bold tracking-[-0.25px]`, body form `text-[15px]`, angka besar stat tile `text-[32px] font-bold tracking-[-0.5px]`.

```jsx
<CodeChip>{product.lot_batch}</CodeChip>            {/* font-mono, dibungkus pill */}
<span>{formatCurrency(product.unit_cost)}</span>    {/* font-sans default */}
```

## 4. Komponen Reusable

Semua ada di `src/components/ui/`, diimpor lewat barrel file:

```jsx
import { Alert, Badge, Button, Card, CodeChip, DataTable, EmptyState, Input, Modal, PageHeader, Pagination, Select, Skeleton, StatTile } from "../../components/ui";
```

| Komponen | Kegunaan | Props penting |
|---|---|---|
| `Button` | Semua tombol aksi | `variant`: `primary` \| `secondary` \| `ghost` \| `success` \| `danger` \| `outline-danger`; `size`: `sm` \| `md`; `loading` (spinner + auto-disable) |
| `Input` / `Select` | Field form dengan label + error/hint bawaan | `label`, `error`, `hint`, plus semua prop native `<input>`/`<select>` |
| `Badge` | Status pill (transaksi, aktif/nonaktif) | `status` — lihat tabel semantik di atas |
| `CodeChip` | Pill monospace untuk kode (LOT/Batch, No. Transaksi, slug) | `children` |
| `Card` | Kontainer section (form, ringkasan) | `title`, `action` (slot kanan, mis. tombol) |
| `DataTable` | Tabel data generik, scroll horizontal otomatis, kolom "No." otomatis | `columns` (`{key, header, render?(row, index)}`), `rows`, `rowKey(row)`, `emptyMessage`, `showIndex` (default `true`), `startIndex`, `loading` (render skeleton rows) |
| `Modal` | Dialog overlay terpusat (form/konfirmasi) | `title`, `description`, `onClose`, `width` |
| `Skeleton` | Bar shimmer generik, building block loading state | `className` (atur lebar/tinggi) |
| `PageHeader` | Judul halaman + deskripsi + aksi utama | `title`, `description`, `action` |
| `EmptyState` | Placeholder saat data/fitur belum ada | `title`, `description`, `action` |
| `Alert` | Pesan error/sukses/info sebaris | `tone`: `danger` \| `success` \| `info`; render `null` kalau `children` kosong — aman dipakai langsung dengan state error (`<Alert>{error}</Alert>`) |
| `Pagination` | Navigasi halaman di bawah `DataTable` | `currentPage`, `lastPage`, `total`, `onPageChange(page)`; render `null` otomatis kalau cuma 1 halaman |
| `StatTile` | Kartu angka ringkasan (dashboard) | `label`, `value`, `delta` (opsional) |

Approve/Reject di `TransactionsPage` memakai `variant="success"` (hijau solid, `#1aae39`) dan `variant="outline-danger"` (putih + border merah `#e5484d`) — bukan `primary`/`secondary` — persis konvensi warna di referensi: hijau selalu berarti "menyetujui", merah-outline berarti "aksi destruktif yang masih perlu konfirmasi visual halus".

### Pola penggunaan `DataTable`

```jsx
const columns = [
  { key: "company_name", header: "Perusahaan" },
  { key: "status", header: "Status", render: (row) => <Badge status={row.is_active ? "active" : "inactive"}>...</Badge> },
];

if (can("clients.delete")) {
  columns.push({ key: "actions", header: "Aksi", render: (row) => <Button variant="danger" size="sm" onClick={...}>Nonaktifkan</Button> });
}

<DataTable columns={columns} rows={clients} rowKey={(row) => row.id} emptyMessage="Belum ada data klien." />
```

Kolom aksi yang butuh permission ditambahkan **secara kondisional lewat `can()` dari `useAuth()`**, bukan disembunyikan dengan CSS — supaya kolom "Aksi" tidak muncul kosong untuk role yang tidak berhak (lihat `ClientsPage.jsx` / `TransactionsPage.jsx`).

Setiap tabel otomatis dapat kolom **No.** di paling kiri berisi nomor urut baris (1, 2, 3, ...) — matikan lewat `showIndex={false}` kalau memang tidak relevan (jarang).

### Pola `Pagination`

Semua endpoint list backend (`/clients`, `/products`, `/transactions`, `/admin/tenants`) sudah mengembalikan `meta: { current_page, last_page, total }` dengan 10 data per halaman. Pola standarnya di tiap halaman:

```jsx
const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

const loadClients = async (page = 1) => {
  const { data } = await apiClient.get("/clients", { params: { page } });
  setClients(data.data);
  setMeta(data.meta);
};

// setelah create/delete, reload ke halaman yang relevan:
await loadClients(1);              // create -> data baru selalu di halaman 1 (urut terbaru)
await loadClients(meta.current_page); // update/delete -> tetap di halaman yang sama

<DataTable ... startIndex={(meta.current_page - 1) * 10} />
<Pagination currentPage={meta.current_page} lastPage={meta.last_page} total={meta.total} onPageChange={loadClients} />
```

`startIndex` pada `DataTable` wajib diisi supaya nomor urut ("No.") lanjut (11, 12, ...) di halaman 2+, bukan mulai dari 1 lagi. Untuk dropdown pilihan (bukan tabel) yang butuh **semua** data sekaligus — seperti pemilihan barang di form Transaksi — jangan pakai default pagination, kirim `{ params: { limit: 1000 } }`.

**Konvensi cursor**: semua elemen yang bisa diklik (`Button`, `Select`, nav sidebar, tombol hamburger/logout) memakai `cursor-pointer` secara eksplisit — jangan andalkan default browser, karena beberapa reset CSS bisa mengubahnya jadi `cursor: default` pada elemen non-`<a>`.

## 5. Layout & Responsivitas

`AppLayout` (`src/layouts/AppLayout.jsx`) adalah shell utama: sidebar (236px, `w-59`) + area konten. Berbeda dari versi sebelumnya, info user & tombol Logout kini ada **di bagian bawah sidebar** (bukan topbar terpisah), persis pola referensi.

- **Desktop (`lg:` / ≥1024px)**: container luar `lg:flex`, sidebar jadi flex item biasa lewat `lg:static` (bukan `fixed` + `padding-left` di konten — pola lama ini pernah menyebabkan bug sidebar-menumpuk-di-atas-konten karena parent bukan flex container; sekarang strukturnya flexbox asli jadi kelas bug itu tidak bisa terulang).
- **Mobile/tablet (<1024px)**: sidebar jadi drawer (`fixed`, `-translate-x-full` saat tertutup), dibuka lewat topbar tipis berisi tombol hamburger (☰), ditutup lewat tombol ✕ di header drawer atau klik overlay gelap.
- Sidebar **tidak** menyempit jadi ikon-saja di breakpoint manapun — label navigasi harus selalu terbaca penuh karena satu perangkat gudang sering dipakai bergantian banyak orang.

Breakpoint yang dipakai konsisten di semua halaman (Tailwind default): `sm` 640px, `lg` 1024px. Form multi-kolom pola standarnya:

```jsx
<form className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
```

Tabel selalu dibungkus `overflow-x-auto` (sudah built-in di `DataTable`) supaya di layar sempit yang scroll adalah tabelnya, bukan seluruh halaman.

## 6. Field Wajib & Validasi Submit

Setiap field yang wajib diisi diberi `required` pada `Input`/`Select` — komponennya otomatis menambahkan tanda bintang merah setelah label lewat `RequiredMark` (`text-danger-solid`, `#e5484d`), jadi jangan tulis `*` manual di string label.

```jsx
<Input label="Nama Perusahaan" name="company_name" required ... />
// -> label render: Nama Perusahaan *   (bintang merah)
```

Validasi submit dipusatkan di `src/utils/validate.js`, dipakai di semua form (`LoginPage`, `ClientsPage`, `ProductsPage`, `TransactionsPage`):

```jsx
import { hasErrors, validate } from "../../utils/validate";

const VALIDATION_RULES = [
  { name: "company_name", label: "Nama Perusahaan", required: true },
  { name: "email", label: "Email", type: "email" }, // format dicek hanya kalau diisi (tidak required)
];

const [fieldErrors, setFieldErrors] = useState({});

const handleSubmit = async (event) => {
  event.preventDefault();
  setError(null);

  const errors = validate(form, VALIDATION_RULES);
  setFieldErrors(errors);
  if (hasErrors(errors)) return; // stop — jangan panggil API kalau ada error

  setSubmitting(true);
  try {
    await apiClient.post(...);
    setFieldErrors({}); // reset setelah sukses
    ...
  } ...
};
```

`validate(values, rules)` mendukung `required`, `type: "email"` (format), `type: "number"` (harus angka), dan `min` (nilai minimum, dicek juga untuk field number yang required maupun opsional). Pesan errornya otomatis dibentuk dari `label` (mis. "Qty wajib diisi.", "Email harus berupa email yang valid.") — tidak perlu tulis pesan manual per field kecuali butuh kasus khusus.

Tiap `<form>` yang pakai pola ini **wajib** diberi `noValidate` supaya validasi bawaan browser (tooltip native, stylingnya tidak konsisten dengan desain) tidak mengambil alih sebelum handler submit kita jalan — atribut HTML `required` tetap dipertahankan di elemen `<input>`/`<select>` untuk aksesibilitas (dibaca screen reader), hanya UI validasinya yang kita ambil alih sepenuhnya lewat `error` prop:

```jsx
<form onSubmit={handleSubmit} noValidate className="grid ...">
  <Input ... error={fieldErrors.company_name} required />
</form>
```

## 7. Loader State & Skeleton

Setiap aktivitas CRUD punya indikator loading — tidak ada lagi teks polos "Memuat..." atau tombol yang diam saat diklik.

**List load (Read)** — lempar `loading` ke `DataTable`, jangan sembunyikan tabelnya di balik ternary:

```jsx
<DataTable columns={columns} rows={clients} rowKey={(r) => r.id} loading={loading} />
{!loading && <Pagination ... />}
```

`DataTable` merender baris skeleton (jumlah kolom & `skeletonRows` — default 5 — bisa diatur) selagi `loading`, dengan header tabel tetap terlihat supaya bentuk halaman tidak "meloncat" begitu data datang.

**Create/Update/Submit** — lempar `loading` (bukan cuma `disabled`) ke `Button`; komponennya otomatis menampilkan spinner dan menonaktifkan diri:

```jsx
<Button type="submit" loading={submitting}>
  {submitting ? "Menyimpan..." : "Tambah Klien"}
</Button>
```

**Aksi per-baris (Approve/Reject/Suspend/Delete/toggle)** — simpan id/kunci baris yang sedang diproses di state, lalu cocokkan ke tombol barisnya saja (supaya baris lain tetap bisa diklik):

```jsx
const [actionId, setActionId] = useState(null);

const handleApprove = async (id) => {
  setActionId(id);
  try { await apiClient.patch(`/transactions/${id}/approve`); } finally { setActionId(null); }
};

<Button loading={actionId === row.id} onClick={() => handleApprove(row.id)}>Approve</Button>
```

Untuk daftar pendek di dalam `Modal` (bukan `DataTable`, mis. checklist modul), pakai `Skeleton` langsung sebagai placeholder alih-alih teks "Memuat...":

```jsx
{loading ? (
  <div className="flex flex-col gap-2">
    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
  </div>
) : (
  ...
)}
```

## 8. Routing & Tenant Token

Halaman bisnis tenant hidup di `/:tenantId/dashboard`, `/:tenantId/clients`, dst. — segmen `:tenantId` itu **bukan** ID asli, melainkan token terenkripsi (`user.tenant_token` dari `/auth/me` atau login). Backend mengenkripsinya (AES-256-CBC + HMAC, lihat `App\Support\TenantToken` di backend) supaya ID tenant tidak pernah bocor ke URL/network tab siapa pun. Konsekuensi penting buat kode frontend:

- **Jangan pernah** simpan atau bandingkan `tenant_id` mentah di frontend — field itu memang tidak lagi dikirim API. Selalu pakai `user.tenant_token`.
- Frontend **tidak bisa dan tidak perlu** mendekripsi token ini — kuncinya cuma ada di server. Perbandingan (mis. di `RequireOwnTenant`) selalu berupa perbandingan string token, bukan decode.
- Saat menambah halaman tenant baru, daftarkan sebagai `/:tenantId/nama-halaman` di dalam `<Route element={<RequireOwnTenant />}>` (lihat `App.jsx`), dan bangun link/navigasinya dari `user.tenant_token` (lihat `tenantNavItems()` di `AppLayout.jsx`), bukan menyusun URL manual dari state lain.
- Untuk endpoint admin per-tenant (`/admin/tenants/{tenant}/...`), backend menerima token yang sama di path — kirim `tenant.token` dari respons `GET /admin/tenants`, jangan pernah `tenant.id` (field itu memang tidak diekspos).

## 9. Menambah Komponen Baru

1. Taruh di `src/components/ui/NamaKomponen.jsx`, styling **hanya** lewat utility Tailwind + token di atas (jangan hardcode hex baru — tambahkan token ke `src/index.css` dulu kalau memang perlu warna baru, dan cek dulu apakah warnanya ada di referensi `docs/Inventory Dashboard (standalone).html`).
2. Export dari `src/components/ui/index.js`.
3. Kalau komponennya butuh varian warna/ukuran, ikuti pola `Button`/`Badge` (object map `VARIANTS`/`STATUS_STYLES`), bukan `if/else` berantai.
4. Referensi tidak mendesain mode gelap — jangan tambahkan `dark:` sampai ada keputusan desain baru yang eksplisit.
