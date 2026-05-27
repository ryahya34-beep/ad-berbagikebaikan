# PROJECT.md — Ad-BerbagiKebaikan
# Version: 4 | Updated: 2026-05-27


## Overview
Aplikasi HTML single-file untuk laporan iklan Meta Ads + data donasi website BerbagiKebaikan/Donasiaja.
Wizard 3-step: Upload & Config → Review Mapping → Dashboard.
Menyimpan laporan ke Supabase cloud database.


---


## Deployment & Git Workflow


### Repo & Deploy
- GitHub: https://github.com/ryahya34-beep/ad-berbagikebaikan
- Vercel: https://ad-berbagikebaikan.vercel.app
- Repo lokal: ~/ad-berbagikebaikan
- Auto-deploy setiap push ke branch main
- Kalau Vercel tidak update: npx vercel --prod dari folder repo


### Cara Update via Patch Terminal
  cd ~/ad-berbagikebaikan
  cat > patch_nama.py << 'ENDOFFILE'
  # kode patch di sini
  ENDOFFILE
  python3 patch_nama.py
  git add index.html
  git commit -m 'fix: deskripsi'
  git push origin main
  npx vercel --prod


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
| kpi_harian_chart | text | JSON array: [{tgl, budget, nominal}] — dipakai Forecast + Momentum |
| per_harian | text | JSON: [{html}] — HTML tbody tabel harian |
| per_campaign | text | JSON: [{html}] — HTML tbody tabel campaign |
| per_program | text | JSON: [{html}] — HTML tbody tabel program |
| per_channel | text | JSON: [{html}] — HTML tbody tabel channel |
| per_konten | text | JSON: [{html}] — HTML tbody tabel konten |
| chart_data | text | JSON: semua chart data (chartTrend, chartHarian, dll) |
| keterangan | text | Timestamp save |


---


## Alur Aplikasi (3-Step Wizard)


### Step 1: Upload & Config
- Upload file iklan Meta Ads (multiple, beda akun OK): .xlsx/.csv/.txt
- Upload file donasi website: .xlsx/.csv/.txt
- Auto-detect kolom dengan fill() + selectedIndex
- Toggle status donasi yang dihitung


### Step 2: Review Mapping
- Auto-mapping campaign → program via fuzzy similarity (Jaccard)
- Confidence bar, preview channel + total angka


### Step 3: Dashboard (6 Tab)
| Tab | Isi |
|---|---|
| Ringkasan | KPI tiles, trend chart, analisa, rekomendasi, setup momentum, forecast |
| Harian | Rekap per hari + chart |
| Campaign | Per campaign + akun iklan, ROAS |
| Program | Semua program + channel, pie chart |
| Konten | Per ad name, CTR-weighted attribution |
| Channel | Per channel (Iklan/WA/Organik )|


---


## Rules Bisnis


### Channel Attribution (Fundraiser Name)
- "baitul maal hidayatullah" exact → EXCLUDE
- contains "berbagi" AND "kebaikan" → Iklan
- "drm" → WhatsApp
- blank/null → Organik


### KPI
- Sukses All = semua channel, status include
- Sukses Meta = channel Iklan saja
- ROAS Iklan = Sukses Meta / Total Spent
- ROAS Total = Sukses All / Total Spent


### Rating Konten
- >= 5x: Juara | >= 3x: Oke | > 0: Biasa | 0: Review


### Benchmark Industri Donasi
- ROAS < 2x: merugi | 2-3x: minimum viable | 3-5x: cukup | 5-7x: sangat baik | > 7x: exceptional


---


## Per Konten Attribution
Method: CTR-Based Weighting (70% Budget + 30% CTR)
  performanceScore = (budgetShare x 0.7) + (ctr x 0.3)
  share = performanceScore / sum(semua ads di campaign)


---


## Akun Iklan (_akun)
Di-extract dari nama file upload: "laporan-iklan-april-berke.xlsx" → akun = "berke"
Disimpan ke _akun per row rawIklan. Tidak disimpan ke Supabase.
Laporan lama tidak punya info akun — perlu upload ulang + simpan ulang.


---


## Tab Ringkasan — Struktur
1. KPI Tiles (4 kolom grid): Spent, Sukses All, Pending All, Sukses Iklan, Pending Iklan, ROAS Iklan, ROAS All, Jumlah Donasi
2. Chart Trend (Donasi + Budget harian)
3. Analisa Performa (data-driven)
4. Rekomendasi (data-driven, berubah per laporan)
5. Setup & Analisa Momentum
6. Forecast Donasi 7 Hari ke Depan


---


## Rekomendasi — Data-Driven Logic


Berdasarkan data yang tersimpan di Supabase (roas_sukses, roas_all, sukses_all, sukses_iklan, pending_all, avg_donasi):


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


---


## Forecast
Data source: window._harianaData (dari kpi_harian_chart Supabase atau rawIklan upload)
Method: MA-7 (60%) + Linear Trend (40%)
Insight: benchmark ROAS, deteksi momentum aktif, learning phase, CAPI


---


## Momentum Analysis
Setup di dalam tab Ringkasan (bukan tab terpisah)
Preset: Ramadhan, Qurban, Muharram
Data source: window._harianaData (set oleh tampilLaporan atau buildHarian)
Output: Spend, Hari Aktif, Nominal Sukses, ROAS, Avg/Hari, vs Benchmark, Rating
Benchmark: roasMin:2, roasOk:3, roasGood:5, roasExc:7


---


## Fungsi Utama


| Fungsi | Peran |
|---|---|
| readFile(file, type) | Baca Excel/CSV → rawIklan/rawDonasi |
| parseNominal(val) | Parse angka format Rp/IDR/titik ribuan |
| extractDateOnly(val) | Parse tanggal berbagai format |
| identifyChannel(name) | Klasifikasi channel dari Fundraiser Name |
| updateSelects() | Auto-fill dropdown kolom (selectedIndex) |
| similarity(s1, s2) | Jaccard similarity fuzzy matching |
| processMatching() | Match donasi ke campaign via program mapping |
| buildRingkasan() | KPI tiles + chart + analisa + rekomendasi data-driven |
| buildHarian() | Rekap per hari |
| buildCampaign() | Per campaign + akun |
| buildProgram() | Semua program |
| buildKonten() | Per ad, CTR-weighted |
| buildChannel() | Per channel |
| buildForecast() | MA-7 + trend + insight benchmark |
| buildMomentum() | Analisa per momentum, benchmark-based |
| simpanKeServer() | Save ke Supabase |
| muatDariServer() | Load list laporan (cache-first) |
| tampilLaporan(id) | Fetch + render + rebuild analisa fresh + set _harianaData |
| clearState() | Reset app ke step 1 (tombol Ganti Data) |
| saveState() / loadState() | localStorage persistence |


---


## Bug Fixes (semua versi)


1. updateSelects() — selectedIndex bukan .value
2. readFile() — setTimeout 150ms untuk async timing
3. panel-momentum nested di dalam panel-forecast → dipindah ke sibling
4. Momentum tab kosong → init di switchTab() dengan setTimeout 50ms
5. Momentum data dari server → window._harianaData dari kpi_harian_chart
6. Analisa + reko di tampilLaporan → rebuild fresh dari stored numbers
7. Forecast + Momentum dipindah ke dalam tab Ringkasan
8. Rekomendasi static → diganti data-driven
9. Tombol Ganti Data → dipindah dari header ke section Nama Laporan
10. clearState() bukan resetApp()


---


## UI


- Tab bar: sticky saat scroll, full lebar body
- KPI grid: 4 kolom (2 baris untuk 8 KPI)
- Header: logo BMH, judul, subtitle — tanpa tombol
- Tombol Ganti Data: di section Nama Laporan (sejajar Simpan/Muat)


---


## Data Flow


  File Upload (.xlsx/.csv)
      → readFile() → rawIklan/rawDonasi
      → updateSelects() (setTimeout 150ms)
      → goToMapping() → validDonasiCache + Campaign→Program mapping
      → generateDashboard() → processMatching() → matchedData
      → build*() → Dashboard 6 tab
      → simpanKeServer() → Supabase


  ATAU:


  muatDariServer() → tampilLaporan(id)
      → fetch Supabase select('*')
      → inject tabel HTML + KPI tiles
      → rebuild analisa + reko fresh dari stored numbers
      → set window._harianaData = kpi_harian_chart
      → setTimeout: buildForecast() + buildMomentum()


---


## Format File Input


### Meta Ads (dari Meta Ads Manager, breakdown per hari)
Kolom wajib: Campaign name, Ad name, Amount spent (IDR), Day
Kolom opsional: Impressions, Link clicks, Adds to cart


### Donasi (dari Donasiaja / pusat.ai)
Kolom wajib: Program, Nominal, Date, Payment Status, Fundraiser Name
Kolom opsional: UTM Content, UTM Campaign


### Naming konvensi file iklan
"laporan-iklan-[periode]-[akun].xlsx" → akun = kata terakhir sebelum ekstensi
Contoh: "laporan-iklan-april-berke.xlsx" → akun = "berke"


---


## Roadmap
- [ ] UTM Content exact matching untuk per-konten akurasi 100%
- [] Filter periode di semua tab
- [ ] Simpan campaign‒akun mapping ke Supabase
- [] Target tracking bulanan
- [] Perbandingan mingguan
- [] Dark mode
- [] Export PDF