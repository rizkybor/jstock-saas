# jstock Frontend Design System

Referensi visual (palet, tipografi, komponen) tersedia sebagai style guide interaktif — lihat tautan yang dibagikan di percakapan, atau regenerasi dari `docs/` bila dibutuhkan. Dokumen ini adalah panduan pemakaian di kode.

## 1. Filosofi

jstock dipakai berjam-jam oleh Owner/Manager/Operator/Viewer gudang setiap hari — bukan situs pemasaran. Prioritasnya: **mudah dipindai, kontras yang aman, dan konsisten** di setiap layar. Semua token warna & tipografi didefinisikan satu kali di `src/index.css`, lalu dikonsumsi lewat utility class Tailwind — jangan menulis hex/px manual di komponen halaman.

## 2. Palet Warna

Sumber: [Color Hunt](https://colorhunt.co/palette/0741731679ab5debd7c5ff95) (`#074173`, `#1679AB`, `#5DEBD7`, `#C5FF95`), dikombinasikan dengan token netral & semantik jstock.

| Token Tailwind | Variabel CSS | Light | Dark | Dipakai untuk |
|---|---|---|---|---|
| `bg-primary` / `text-primary` | `--primary` | `#1679ab` | `#5debd7` | Tombol utama, link, nav aktif |
| `bg-primary-ink` / `text-primary-ink` | `--primary-ink` | `#074173` | `#a9f5e9` | Hover/emphasis di atas primary |
| `bg-primary-soft` | `--primary-soft` | `#e1eef4` | `#123c37` | Latar chip/nav aktif yang lembut |
| `bg-accent` | `--accent` | `#2f9c85` | `#5debd7` | Aksen sekunder (jarang dipakai) |
| `bg-lime-soft` / `text-lime-ink` | `--lime`, `--lime-ink` | `#c5ff95` / `#4a6b1e` | — | Highlight positif non-status (mis. badge promo) |
| `bg-ink` / `text-ink` | `--ink` | `#16211d` | `#e9efec` | Teks utama |
| `text-ink-muted` | `--ink-muted` | `#5b6d66` | `#9db0a8` | Teks sekunder/caption |
| `bg-surface` | `--surface` | `#ffffff` | `#162019` | Kartu, tabel, form |
| `bg-surface-2` | `--surface-2` | `#eef2f0` | `#1c2820` | Header tabel, sidebar, hover |
| `border-border` | `--border` | `#dde3e0` | `#2b3a32` | Semua border |

**Warna semantik status** — *sengaja terpisah dari warna brand* supaya makna status transaksi/data tidak pernah tertukar dengan warna aksi biasa:

| Token | Arti | Dipakai di `<Badge status="...">` |
|---|---|---|
| `success` (hijau) | Approved / Aktif | `status="approved"` / `"active"` |
| `warning` (amber) | Pending | `status="pending"` |
| `danger` (merah) | Rejected | `status="rejected"` |
| `info` (biru brand) | Trial / info terkait brand | `status="trial"` |
| netral (`ink-muted`) | Cancelled / Nonaktif | `status="cancelled"` / `"inactive"` |

Mode gelap mengikuti `prefers-color-scheme` sistem operasi secara otomatis — tidak perlu menulis `dark:` di komponen halaman karena token CSS-nya sendiri yang berubah nilai.

## 3. Tipografi

Dua keluarga font saja, dimuat di `index.html` dari Google Fonts:

- **Public Sans** (`font-sans`, default) — semua teks UI: heading, body, label, tombol.
- **IBM Plex Mono** (`font-mono`) — khusus data yang perlu sejajar rapi: LOT/Batch, nomor transaksi, nominal uang.

```jsx
<span className="font-mono text-xs">{product.lot_batch}</span>
<span>{formatCurrency(product.unit_cost)}</span> {/* font-sans default */}
```

## 4. Komponen Reusable

Semua ada di `src/components/ui/`, diimpor lewat barrel file:

```jsx
import { Alert, Badge, Button, Card, DataTable, EmptyState, Input, PageHeader, Select, StatTile } from "../../components/ui";
```

| Komponen | Kegunaan | Props penting |
|---|---|---|
| `Button` | Semua tombol aksi | `variant`: `primary` \| `secondary` \| `ghost` \| `danger`; `size`: `sm` \| `md` |
| `Input` / `Select` | Field form dengan label + error/hint bawaan | `label`, `error`, `hint`, plus semua prop native `<input>`/`<select>` |
| `Badge` | Status pill (transaksi, aktif/nonaktif) | `status` — lihat tabel semantik di atas |
| `Card` | Kontainer section (form, ringkasan) | `title`, `action` (slot kanan, mis. tombol) |
| `DataTable` | Tabel data generik, scroll horizontal otomatis, kolom "No." otomatis | `columns` (`{key, header, render?(row, index)}`), `rows`, `rowKey(row)`, `emptyMessage`, `showIndex` (default `true`) |
| `PageHeader` | Judul halaman + deskripsi + aksi utama | `title`, `description`, `action` |
| `EmptyState` | Placeholder saat data/fitur belum ada | `title`, `description`, `action` |
| `Alert` | Pesan error/sukses/info sebaris | `tone`: `danger` \| `success` \| `info`; render `null` kalau `children` kosong — aman dipakai langsung dengan state error (`<Alert>{error}</Alert>`) |
| `Pagination` | Navigasi halaman di bawah `DataTable` | `currentPage`, `lastPage`, `total`, `onPageChange(page)`; render `null` otomatis kalau cuma 1 halaman |
| `StatTile` | Kartu angka ringkasan (dashboard) | `label`, `value`, `delta` (opsional) |

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

Semua endpoint list backend (`/clients`, `/products`, `/transactions`) sudah mengembalikan `meta: { current_page, last_page, total }` dengan 10 data per halaman. Pola standarnya di tiap halaman:

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

`AppLayout` (`src/layouts/AppLayout.jsx`) adalah shell utama: sidebar + topbar + konten.

- **Desktop (`lg:` / ≥1024px)**: sidebar selalu terlihat di kiri (`lg:static lg:translate-x-0`), konten punya `lg:pl-64`.
- **Mobile/tablet (<1024px)**: sidebar jadi drawer (`fixed`, `-translate-x-full` saat tertutup), dibuka lewat tombol hamburger (☰) di topbar, ditutup lewat tombol ✕ atau klik overlay gelap.
- Sidebar **tidak** menyempit jadi ikon-saja di breakpoint manapun — label navigasi harus selalu terbaca penuh karena satu perangkat gudang sering dipakai bergantian banyak orang.

Breakpoint yang dipakai konsisten di semua halaman (Tailwind default): `sm` 640px, `lg` 1024px. Form multi-kolom pola standarnya:

```jsx
<form className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
```

Tabel selalu dibungkus `overflow-x-auto` (sudah built-in di `DataTable`) supaya di layar sempit yang scroll adalah tabelnya, bukan seluruh halaman.

## 6. Menambah Komponen Baru

1. Taruh di `src/components/ui/NamaKomponen.jsx`, styling **hanya** lewat utility Tailwind + token di atas (jangan hardcode hex baru — tambahkan token ke `src/index.css` dulu kalau memang perlu warna baru).
2. Export dari `src/components/ui/index.js`.
3. Kalau komponennya butuh varian warna/ukuran, ikuti pola `Button`/`Badge` (object map `VARIANTS`/`STATUS_STYLES`), bukan `if/else` berantai.
4. Uji di kedua mode (terang/gelap) — cukup toggle color scheme di OS/browser devtools, karena semua token sudah otomatis mengikuti `prefers-color-scheme`.
