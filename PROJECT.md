# PROJECT.md — Ad-BerbagiKebaikan
# Version: 5 | Updated: 2026-06-04

## Overview
Aplikasi HTML single-file untuk laporan iklan Meta Ads + data donasi website BerbagiKebaikan/Donasiaja.
Wizard 3-step: Upload & Config → Review Mapping → Dashboard.
Menyimpan laporan ke Supabase cloud database.

PRINSIP v5: Tab Konten & Campaign memakai data IKLAN (conversion value), bukan donasi. Donasi website tidak punya info ad spesifik (cuma sampai level program), jadi attribution per-ad/campaign diambil langsung dari Meta Ads.

---

## Deployment & Git Workflow

### Repo & Deploy
- GitHub: https://github.com/ryahya34-beep/ad-berbagikebaikan
- Vercel: https://ad-berbagikebaikan.vercel.app
- Repo lokal: ~/ad-berbagikebaikan
- Auto-deploy setiap push ke branch main
- Kalau Vercel tidak update: npx vercel --prod dari folder repo

### Cara Update via Patch Terminal (inline python paling aman)
  cd ~/ad-berbagikebaikan && python3 << 'PYEOF'
  with open('index.html','r') as f: html=f.read()
  old="""..."""; new="""..."""
  print("OK" if old in html else "GAGAL"); html=html.replace(old,new)
  with open('index.html','w') as f: f.write(html)
  PYEOF
  git add index.html
  git commit -m 'fix: deskripsi'
  git push origin main
  npx vercel --prod

CATATAN: untuk fungsi besar, ganti seluruh blok pakai html.find('function namaFn(){') sampai fungsi berikutnya, jangan str_replace baris demi baris.

### Token GitHub Expired
  git remote set-url origin https://TOKEN@github.com/ryahya34-beep/ad-berbagikebaikan.git
JANGAN paste token di chat Claude.

---

## Stack
- Frontend: HTML + CSS + Vanilla JS (single file, no build step)
- xlsx@0.18.5 (cdnjs), chart.js (jsdelivr), @supabase/supabase-js@2 (jsdelivr)
- Database: Supabase — https://hharingjtlebvpbmbinf.supabase.co — table: laporan_iklan

---

## Supabase Schema (laporan_iklan)

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| periode | text | Label periode laporan |
| created_at | timestamp | Auto |
| total_spent | numeric | Total budget iklan |
| sukses_all | numeric | Donasi sukses semua channel |
| pending_all | numeric | Donasi pending semua channel |
| sukses_iklan | numeric | Donasi sukses channel Iklan |
| pending_iklan | numeric | Donasi pending channel Iklan |
| jumlah_donasi | integer | Jumlah transaksi sukses |
| avg_donasi | numeric | Rata-rata per transaksi |
| roas_sukses | numeric | ROAS Iklan (sukses_iklan / total_spent) |
| roas_all | numeric | ROAS Total (sukses_all / total_spent) |
| per_kpi | text | JSON: KPI tiles + htmlAnalisa + htmlRekomendasi + htmlForecast |
| kpi_harian_chart | text | JSON array: [{tgl, budget, nominal, sukses_all}] — Forecast + Momentum |
| kpi_campaign_data | text | JSON array: [{campaign, spend, sukses, pending, count}] — Momentum filter keyword saat load server (v5) |
| per_harian | text | JSON: [{html}] — HTML tbody tabel harian |
| per_campaign | text | JSON: [{html}] — HTML tbody tabel campaign |
| per_program | text | JSON: [{html}] — HTML tbody tabel program |
| per_channel | text | JSON: [{html}] — HTML tbody tabel channel |
| per_konten | text | JSON: [{html}] — HTML tbody tabel konten |
| chart_data | text | JSON: semua chart data (chartTrend, chartHarian, dll) |
| keterangan | text | Timestamp save |

SQL tambah kolom v5:
  ALTER TABLE laporan_iklan ADD COLUMN IF NOT EXISTS kpi_campaign_data text;

---

## Alur Aplikasi (3-Step Wizard)

### Step 1: Upload & Config
- Upload file iklan Meta Ads (multiple, beda akun OK): .xlsx/.csv/.txt
- Upload file donasi website: .xlsx/.csv/.txt
- Auto-detect kolom dengan fill() + selectedIndex
- Toggle status donasi yang dihitung
- Dropdown kolom iklan: Campaign, Ad Name, Amount Spent, Conversion Value, Adds to Cart/Results, Tanggal Iklan
- Dropdown kolom donasi: Program, Nominal, Tanggal, Status, Fundraiser Name

### Step 2: Review Mapping
- Auto-mapping campaign → program via fuzzy similarity (Jaccard)
- Confidence bar, preview channel + total angka

### Step 3: Dashboard (6 Tab)
| Tab | Sumber Data | Isi |
|---|---|---|
| Ringkasan | Donasi + Iklan | KPI tiles, trend chart, analisa, rekomendasi, momentum, forecast |
| Harian | Donasi + Iklan | Rekap per hari + chart |
| Campaign | IKLAN | Per campaign: Adds to Cart, Conversion Value, Budget, ROAS |
| Program | Donasi | Semua program + channel, pie chart |
| Konten | IKLAN | Per ad: Budget, Conversion Value, ROAS, Efektivitas |
| Channel | Donasi | Per channel (Iklan/WA/Organik) |

Semua tabel: header bisa diklik untuk sort a-z / z-a (ikon ▼/▲).

---

## Sumber Data Tab Konten & Campaign (v5 — PENTING)

Donasi website TIDAK punya info ad/campaign spesifik (cuma sampai program). Maka attribution per-ad mustahil akurat. CTR-weighting versi lama DIHAPUS.

### Tab Konten (per ad)
- Nominal = "Adds to cart conversion value" (file iklan) → colConvValue
- Budget = "Amount spent" → colBudget
- ROAS = conversion value / budget (per ad langsung)
- Kolom: Konten, Campaign, Akun, Budget, Conversion Value, ROAS, Efektivitas

### Tab Campaign (per campaign)
- Adds to Cart = count dari "Adds to cart"/"Results" → colResults
- Conversion Value = sum conversion value → colConvValue
- Budget = sum amount spent
- ROAS = conversion value / budget
- Kolom: Campaign, Akun, Adds to Cart, Conversion Value, Budget, ROAS, Status

### Efektivitas / Status (ROAS-based)
- > 5x Sangat Efektif | > 3x Efektif | > 2x Cukup | > 0 Biasa | 0 Kurang
- Campaign status: > 3x Optimal | > 1x Break Even | <= 1x Loss

### Data fiktif
Nominal sampah dari orang iseng dihapus MANUAL di file Excel sebelum upload (tidak ada filter di app).

---

## Rules Bisnis

### Channel Attribution (Fundraiser Name) — untuk tab donasi
- "baitul maal hidayatullah" exact → EXCLUDE
- contains "berbagi" AND "kebaikan" → Iklan
- "drm" → WhatsApp
- blank/null → Organik

### KPI (tab Ringkasan — dari donasi)
- Sukses All = semua channel, status include
- Sukses Meta = channel Iklan saja
- ROAS Iklan = Sukses Meta / Total Spent
- ROAS Total = Sukses All / Total Spent

### Benchmark Industri Donasi
- ROAS < 2x: merugi | 2-3x: minimum viable | 3-5x: cukup | 5-7x: sangat baik | > 7x: exceptional

---

## Momentum Analysis (v5)
Setup di dalam tab Ringkasan. Preset: Ramadhan, Qurban, Muharram.
Input per momentum: Nama, Tanggal Mulai, Tanggal Selesai, Keyword Campaign (opsional, misal "qurban,sbq").

### Logika hitung
- Spend = file iklan (filter tanggal iklan; jika ada keyword, filter campaign juga)
- Nominal Sukses = donasi sukses (filter tanggal donasi; jika keyword, filter campaign via matched)
- ROAS = Nominal Sukses / Spend
- Hari Aktif = jumlah hari KALENDER dalam range (helper hariKalender), BUKAN hari yang ada donasi
- Avg/Hari = Nominal / Hari Aktif

### Mode
- Keyword diisi → filter campaign yang mengandung keyword (qurban-specific, dst)
- Keyword kosong → semua donasi + semua spend dalam range
- Load dari server → pakai kpi_campaign_data (keyword) atau kpi_harian_chart (no keyword)
- Hint muncul saat load server (1 bulan): momentum lintas bulan akurat hanya jika upload multi-bulan langsung

Benchmark: roasMin:2, roasOk:3, roasGood:5, roasExc:7
Rating: >=5 Juara | >=3 Oke | >0 Biasa | 0 Review

---

## Tab Ringkasan — Struktur
1. KPI Tiles: Spent, Sukses All, Pending All, Sukses Iklan, Pending Iklan, ROAS Iklan, ROAS All, Jumlah Donasi
2. Chart Trend (Donasi + Budget harian)
3. Analisa Performa (data-driven)
4. Rekomendasi (data-driven, berubah per laporan)
5. Setup & Analisa Momentum
6. Forecast Donasi 7 Hari ke Depan

### Rekomendasi — Data-Driven Logic
| Kondisi | Rekomendasi |
|---|---|
| roas >= 5x | Scale Budget |
| roas 3-5x | Optimasi untuk Scale |
| roas < 2x | Perbaiki Performa |
| pending > 0 | Follow Up Pending |
| pending ratio > 30% | Pending Kritis |
| pending ratio 15-30% | Percepat Follow Up |
| avg_donasi < 100rb | Naikkan Avg Donasi |
| non-iklan > 40% | Optimalkan Non-Iklan |
| ROAS gap all-iklan > 2x | Gap ROAS All vs Iklan |
| roas >= 7x | Ekspansi Program |

### Forecast
Data source: window._harianaData (kpi_harian_chart Supabase atau rawIklan upload)
Method: MA-7 (60%) + Linear Trend (40%)
Insight: benchmark ROAS, deteksi momentum aktif, learning phase, CAPI

---

## Akun Iklan (_akun)
Di-extract dari nama file upload: "laporan-iklan-april-berke.xlsx" → akun = "berke"
Disimpan ke _akun per row rawIklan. Tidak disimpan ke Supabase.
Laporan lama tidak punya info akun — perlu upload ulang + simpan ulang.

---

## Fungsi Utama

| Fungsi | Peran |
|---|---|
| readFile(file, type) | Baca Excel/CSV → rawIklan/rawDonasi |
| parseNominal(val) | Parse angka format Rp/IDR/titik ribuan |
| extractDateOnly(val) | Parse tanggal berbagai format → YYYY-MM-DD |
| identifyChannel(name) | Klasifikasi channel dari Fundraiser Name |
| updateSelects() | Auto-fill dropdown kolom (selectedIndex) |
| similarity(s1, s2) | Jaccard similarity fuzzy matching |
| processMatching() | Match donasi ke campaign via program mapping |
| buildRingkasan() | KPI tiles + chart + analisa + rekomendasi data-driven |
| buildHarian() | Rekap per hari |
| buildCampaign() | Per campaign — dari conversion value file iklan (v5) |
| buildProgram() | Semua program (dari donasi) |
| buildKonten() | Per ad — dari conversion value file iklan (v5) |
| buildChannel() | Per channel (dari donasi) |
| buildForecast() | MA-7 + trend + insight benchmark |
| buildMomentum() | Analisa per momentum, keyword filter, hari kalender |
| hariKalender(s,e) | Hitung jumlah hari kalender dalam range (v5) |
| collectCampaignData() | Build kpi_campaign_data untuk simpan (v5) |
| makeSortable() | Sort universal semua tabel (v5) |
| simpanKeServer() | Save ke Supabase |
| muatDariServer() | Load list laporan (cache-first) |
| tampilLaporan(id) | Fetch + render + rebuild analisa + set _harianaData + _campaignData |
| clearState() | Reset app ke step 1 (tombol Ganti Data) |
| saveState() / loadState() | localStorage persistence |

---

## Sort Tabel Universal (v5)
- makeSortable() dipanggil tiap switchTab (setTimeout 100ms)
- Tiap header th dapat ikon segitiga hitam ▼ (default) → klik jadi ▲ (asc) / ▼ (desc)
- parseVal: deteksi tanggal (YYYY-MM-DD & DD/MM/YYYY → timestamp) + angka Rp + fallback teks
- Baris TOTAL/RATA-RATA selalu tetap di bawah

---

## UI
- Tab bar: sticky saat scroll, full lebar body
- KPI grid: 4 kolom (2 baris untuk 8 KPI)
- Header: logo BMH, judul, subtitle — tanpa tombol
- Tombol Ganti Data: di section Nama Laporan (sejajar Simpan/Muat)
- Popup "Belum ada laporan tersimpan" punya tombol Tutup

---

## Data Flow

  File Upload (.xlsx/.csv)
      → readFile() → rawIklan/rawDonasi
      → updateSelects() (setTimeout 150ms)
      → goToMapping() → validDonasiCache + Campaign→Program mapping
      → generateDashboard() → processMatching() → matchedData
      → build*() → Dashboard 6 tab
      → simpanKeServer() → Supabase (+ kpi_campaign_data)

  ATAU:

  muatDariServer() → tampilLaporan(id)
      → fetch Supabase select('*')
      → inject tabel HTML + KPI tiles
      → rebuild analisa + reko fresh dari stored numbers
      → set window._harianaData = kpi_harian_chart
      → set window._campaignData = kpi_campaign_data
      → setTimeout: buildForecast() + buildMomentum() + makeSortable()

---

## Format File Input

### Meta Ads (dari Meta Ads Manager, breakdown per hari)
Kolom wajib: Campaign name, Ad name, Amount spent (IDR), Day
Kolom v5 (untuk Konten/Campaign): Adds to cart conversion value, Adds to cart (count)
Kolom opsional: Impressions, Link clicks

### Donasi (dari Donasiaja / pusat.ai)
Kolom wajib: Program, Nominal, Date, Payment Status, Fundraiser Name
Kolom opsional: UTM Content, UTM Campaign

### Naming konvensi file iklan
"laporan-iklan-[periode]-[akun].xlsx" → akun = kata terakhir sebelum ekstensi
Contoh: "laporan-iklan-april-berke.xlsx" → akun = "berke"

---

## Bug Fixes (riwayat)

### v1-v4
1. updateSelects() — selectedIndex bukan .value
2. readFile() — setTimeout 150ms untuk async timing
3. panel-momentum nested → dipindah ke sibling panel-forecast
4. Momentum tab kosong → init di switchTab() setTimeout 50ms
5. Momentum data dari server → window._harianaData dari kpi_harian_chart
6. Analisa + reko di tampilLaporan → rebuild fresh dari stored numbers
7. Forecast + Momentum dipindah ke dalam tab Ringkasan
8. Rekomendasi static → diganti data-driven
9. Tombol Ganti Data → dipindah ke section Nama Laporan
10. clearState() bukan resetApp()

### v5 (2026-06-04)
11. kpi_harian_chart tambah sukses_all per hari dari rawDonasi
12. Momentum server mode sum sukses_all (fallback nominal untuk data lama)
13. Hari aktif momentum = hari KALENDER range (sebelumnya salah: selisih tanggal / count transaksi)
14. Popup "Belum ada laporan tersimpan" + tombol Tutup
15. Hint momentum lintas bulan saat load server
16. Tab Konten & Campaign full dari conversion value file iklan (CTR-weighting dihapus — sumber ROAS ngibul 1574x)
17. Kolom Donasi tab Campaign → Adds to Cart (count dari file iklan)
18. Sort universal semua tabel + fix sort kolom tanggal

---

## Catatan Migrasi Data Lama
- Laporan lama di Supabase belum punya sukses_all per hari & kpi_campaign_data
- Tab Konten/Campaign lama disimpan sebagai HTML statis (per_konten/per_campaign) → tetap format lama
- WAJIB upload ulang + simpan ulang untuk dapat perhitungan v5

---

## Roadmap
- [ ] UTM Content exact matching untuk per-konten akurasi 100%
- [ ] Filter periode di semua tab
- [ ] Simpan campaign-akun mapping ke Supabase
- [ ] Target tracking bulanan
- [ ] Perbandingan mingguan
- [ ] Dark mode
- [ ] Export PDF
