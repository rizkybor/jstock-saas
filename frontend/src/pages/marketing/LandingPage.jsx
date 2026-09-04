import { Link } from "react-router-dom";
import { Button } from "../../components/ui";
import { CheckIcon, ChartBarIcon, ClipboardListIcon, QrCodeIcon, ShieldCheckIcon, UsersIcon, BuildingIcon } from "./icons";

const MODULES = [
  {
    name: "Inventory",
    description:
      "Untuk perusahaan yang menjual atau menyewakan barang berbasis batch. Setiap barang tercatat rapi, keluar lewat transaksi yang harus disetujui, dan diberi invoice otomatis.",
    points: ["Master barang & kategori", "Transaksi keluar dengan approval berjenjang", "Invoice otomatis, tanpa tulis manual", "QR Code per barang & resi pengiriman"],
  },
  {
    name: "Warehouse General",
    description:
      "Untuk gudang dengan banyak lokasi atau rak. Barang masuk, keluar, dan berpindah lokasi tercatat sebagai pergerakan, jadi selalu tahu barang ada di mana dan berapa jumlahnya.",
    points: ["Barang, kategori & lokasi/rak", "Stok masuk, keluar & transfer antar lokasi", "Purchase order ke pemasok", "Stock opname & QR Code per barang"],
  },
];

const FEATURES = [
  { icon: UsersIcon, title: "Role & Permission", desc: "Akses tiap staf diatur granular — sampai ke level menu, bukan cuma admin/staf." },
  { icon: QrCodeIcon, title: "QR Code tanpa login", desc: "Siapa pun yang memegang barang bisa scan dan lihat sisa stok — tanpa perlu akun." },
  { icon: ClipboardListIcon, title: "Approval berjenjang", desc: "Transaksi keluar harus disetujui sebelum stok benar-benar berkurang." },
  { icon: ChartBarIcon, title: "Riwayat yang bisa ditelusuri", desc: "Setiap pergerakan stok tercatat — stok awal, stok akhir, dan siapa yang memprosesnya." },
  { icon: BuildingIcon, title: "Nama & logo perusahaan sendiri", desc: "Yang tampil di sistem adalah identitas perusahaan Anda, bukan jstock." },
  { icon: ShieldCheckIcon, title: "Data terisolasi per perusahaan", desc: "Tidak ada cara satu perusahaan melihat data perusahaan lain di sistem yang sama." },
];

const STEPS = [
  { title: "Pilih modul", desc: "Inventory untuk barang berbasis batch, atau Warehouse General untuk gudang multi-lokasi." },
  { title: "Atur tim & akses", desc: "Undang staf, tentukan siapa boleh input, siapa yang menyetujui transaksi." },
  { title: "Jalankan operasional", desc: "Catat barang masuk, proses transaksi keluar, cetak QR Code untuk tiap barang." },
  { title: "Telusuri dari laporan", desc: "Semua tercatat — tinggal dibuka lewat dashboard atau diunduh sebagai laporan." },
];

const PLANS = [
  {
    name: "Trial",
    price: "Gratis",
    period: "14 hari",
    note: null,
    features: ["3 pengguna", "50 transaksi/bulan", "Semua fitur inti aktif"],
    cta: "Mulai Gratis",
    highlight: false,
  },
  {
    name: "Basic",
    price: "Rp149rb",
    period: "/bulan",
    note: null,
    features: ["5 pengguna", "200 transaksi/bulan", "Invoice otomatis & QR Code", "Laporan ringkas"],
    cta: "Pilih Basic",
    highlight: false,
  },
  {
    name: "Pro",
    price: "Rp349rb",
    period: "/bulan",
    note: "Paling banyak dipilih",
    features: ["20 pengguna", "1.000 transaksi/bulan", "Approval berjenjang", "Export laporan & branding logo"],
    cta: "Pilih Pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "hubungi kami",
    note: null,
    features: ["Pengguna & transaksi unlimited", "White-label penuh", "API akses & SLA prioritas", "Onboarding & training khusus"],
    cta: "Hubungi Kami",
    highlight: false,
  },
];

const FAQS = [
  {
    q: "Apakah data saya aman berbagi server dengan perusahaan lain?",
    a: "Ya. Setiap perusahaan (tenant) diisolasi penuh di level data — termasuk fitur QR Code publik, yang sudah diaudit khusus agar tidak menampilkan harga, nama pelanggan, atau informasi internal lainnya ke siapa pun yang scan.",
  },
  {
    q: "Kalau saya ganti modul di kemudian hari, data lama saya hilang?",
    a: "Tidak. Data yang sudah tercatat tetap tersimpan meski modul dinonaktifkan atau diganti ke modul lain.",
  },
  {
    q: "Apakah jstock bisa diakses dari HP saat sedang di gudang atau lapangan?",
    a: "Bisa. Tampilan jstock sudah dioptimalkan untuk desktop, tablet, maupun HP, jadi staf bisa scan QR Code atau input stok langsung dari HP.",
  },
  {
    q: "Bagaimana kalau kebutuhan tim saya bertambah di tengah jalan?",
    a: "Anda bisa upgrade paket kapan saja sesuai jumlah pengguna dan volume transaksi yang bertambah, tanpa kehilangan data yang sudah tercatat.",
  },
];

function Section({ id, className = "", children }) {
  return (
    <section id={id} className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </section>
  );
}

function ScanPreviewCard() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5">
      <div className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Hasil Scan Barcode</div>
      <h3 className="mt-1 text-base font-bold text-ink">Kabel NYM 3x2.5mm — 100m</h3>

      <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-white">
            <QrCodeIcon className="h-10 w-10 text-ink" />
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2.5 text-xs">
            <div>
              <div className="font-semibold tracking-wide text-ink-faint uppercase">SKU</div>
              <div className="text-ink">RAK-014</div>
            </div>
            <div>
              <div className="font-semibold tracking-wide text-ink-faint uppercase">Kategori</div>
              <div className="text-ink">Elektrikal</div>
            </div>
            <div>
              <div className="font-semibold tracking-wide text-ink-faint uppercase">Satuan</div>
              <div className="text-ink">Roll</div>
            </div>
            <div>
              <div className="font-semibold tracking-wide text-ink-faint uppercase">Stok</div>
              <div className="text-ink">18 Roll</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <div className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Riwayat Pergerakan</div>
        <div className="mt-2 text-sm text-ink">
          Sisa Stok: <span className="font-semibold">18</span> dari Stok Awal: <span className="font-semibold">25</span>
        </div>
        <div className="text-xs text-ink-muted">Stok keluar · Gudang Utama · 2 hari lalu</div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
        <Section className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-mark text-sm font-bold text-white">j</div>
            <span className="text-lg font-bold text-ink">jstock</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-muted md:flex">
            <a href="#modules" className="hover:text-ink">
              Modul
            </a>
            <a href="#features" className="hover:text-ink">
              Fitur
            </a>
            <a href="#pricing" className="hover:text-ink">
              Harga
            </a>
            <a href="#faq" className="hover:text-ink">
              FAQ
            </a>
          </nav>
          <Link to="/login">
            <Button variant="secondary" size="sm">
              Masuk
            </Button>
          </Link>
        </Section>
      </header>

      {/* Hero */}
      <Section className="grid grid-cols-1 gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:py-24">
        <div>
          <div className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Untuk kebutuhan inventory &amp; gudang perusahaan Anda</div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-[42px] lg:leading-[1.15]">
            Stok dan transaksi yang bisa dipertanggungjawabkan, bukan sekadar dicatat.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
            jstock mencatat barang per batch dan per lokasi gudang — dari transaksi keluar dan approval berjenjang, sampai QR Code
            yang bisa discan siapa saja untuk melihat sisa stok dan riwayat pergerakannya, tanpa perlu login.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href="#pricing">
              <Button size="md" className="w-full sm:w-auto">
                Coba 14 Hari Gratis
              </Button>
            </a>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full">
                Masuk ke Akun
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-xs text-ink-faint">Tanpa kartu kredit. Batal kapan saja.</p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <ScanPreviewCard />
        </div>
      </Section>

      {/* Modules — editorial split, not twin cards */}
      <div className="border-t border-border">
        <Section id="modules" className="py-14 sm:py-20">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Dua modul, satu sistem</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted sm:text-base">
            Setiap perusahaan memakai satu modul yang sesuai operasionalnya — bukan paket serba-ada yang setengah dipakai.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-border">
            {MODULES.map((mod) => (
              <div key={mod.name} className="lg:px-10 lg:first:pl-0 lg:last:pr-0">
                <h3 className="text-lg font-bold text-ink">{mod.name}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">{mod.description}</p>
                <ul className="mt-5 flex flex-col gap-2">
                  {mod.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-ink">
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Features — spec-sheet list, not icon-card grid */}
      <div className="border-t border-border">
        <Section id="features" className="py-14 sm:py-20">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Yang sudah tersedia</h2>
          <div className="mt-8 grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-4 py-5 sm:px-6 sm:odd:pl-0 sm:even:pr-0">
                <feature.icon className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
                <div>
                  <h3 className="text-sm font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* How it works — numbered list, not circle-icon grid */}
      <div className="border-t border-border bg-surface-2">
        <Section className="py-14 sm:py-20">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Mulai dalam 4 langkah</h2>
          <div className="mt-10 flex flex-col divide-y divide-border">
            {STEPS.map((step, index) => (
              <div key={step.title} className="flex flex-col gap-2 py-5 sm:flex-row sm:items-baseline sm:gap-6">
                <span className="text-sm font-bold text-ink-faint tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Pricing */}
      <Section id="pricing" className="py-14 sm:py-20">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">Harga</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted sm:text-base">
          Per perusahaan, per bulan, untuk satu modul. Butuh kebutuhan khusus? Hubungi tim kami.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-xl p-6 ${plan.highlight ? "border-2 border-primary bg-surface" : "border border-border bg-surface"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-ink">{plan.name}</h3>
                {plan.note && <span className="text-[11px] font-semibold text-primary">{plan.note}</span>}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold tracking-[-0.5px] text-ink">{plan.price}</span>
                <span className="text-xs text-ink-muted">{plan.period}</span>
              </div>
              <ul className="mt-5 flex flex-1 flex-col gap-2.5 border-t border-border pt-5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-ink">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/login" className="mt-6">
                <Button variant={plan.highlight ? "primary" : "secondary"} className="w-full">
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ — plain divided list, not boxed cards */}
      <div className="border-t border-border">
        <Section id="faq" className="py-14 sm:py-20">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Pertanyaan yang sering diajukan</h2>
          <div className="mt-8 flex max-w-3xl flex-col divide-y divide-border border-t border-border">
            {FAQS.map((faq) => (
              <div key={faq.q} className="py-5">
                <h3 className="text-sm font-semibold text-ink">{faq.q}</h3>
                <p className="mt-2 text-sm text-ink-muted">{faq.a}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <Section className="flex flex-col items-center justify-between gap-4 text-sm text-ink-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-mark text-xs font-bold text-white">j</div>
            <span>&copy; {new Date().getFullYear()} jstock. Seluruh hak cipta dilindungi.</span>
          </div>
          <Link to="/login" className="font-medium text-primary hover:underline">
            Masuk ke akun Anda
          </Link>
        </Section>
      </footer>
    </div>
  );
}
