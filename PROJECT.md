# PROJECT.md — Ad-BerbagiKebaikan
# Version: 6 | Updated: 2026-06-06

## Overview
Aplikasi HTML single-file untuk laporan iklan Meta Ads + data donasi website BerbagiKebaikan/Donasiaja.
Wizard 3-step: Upload & Config → Review Mapping → Dashboard.
Menyimpan laporan ke Supabase (agar atasan bisa lihat di device sendiri via Muat dari Server).

PRINSIP DATA v6 (PENTING):
- **ROAS Meta** = conversion value pixel Meta ("Adds to cart conversion value") / spend. Klaim pixel, selalu lebih besar dari real (add-to-cart ≠ transaksi).
- **ROAS Real** = donasi nyata masuk Donasiaja / spend. Duit beneran.
- **Identifikasi iklan auto-detect**: UTM dulu (akurat per campaign/ad), fallback fundraiser "Berbagi Kebaikan".
- Conversion Value (Meta) ≠ Donasi Real, tidak akan pernah sama. Gap = niat (add to cart) vs transaksi nyata.

---

## Deployment & Git Workflow

### Repo & Deploy
- GitHub: https://github.com/ryahya34-beep/ad-berbagikebaikan
- Vercel: https://ad-berbagikebaikan.vercel.app
- Repo lokal: ~/ad-berbagikebaikan
- Auto-deploy setiap push ke main; kalau Vercel tidak update: npx vercel --prod

### Cara Update via Patch Terminal (inline python — paling aman)
  cd ~/ad-berbagikebaikan && python3 << 'PYEOF'
  with open('index.html','r') as f: html=f.read()
  old="""..."""; new="""..."""
  print("OK" if old in html else "GAGAL"); html=html.replace(old,new)
  with open('index.html','w') as f: f.write(html)
  PYEOF
  git add index.html && git commit -m 'fix: ...' && git push origin main && npx vercel --prod

CATATAN PENTING:
- Ganti fungsi besar: pakai html.find('function namaFn(){') sampai fungsi berikutnya.
- Saat copy pola kode antar fungsi, CEK dependency (variabel/scope) di lokasi baru. Tiap build* punya deklarasi kolom sendiri — jangan asumsi progCol/tglCol tersedia.
- Paste multi-line di zsh kadang rusak — kalau heredoc nyangkut, Ctrl+C lalu paste ulang.

### Token GitHub Expired
  git remote set-url origin https://TOKEN@github.com/ryahya34-beep/ad-berbagikebaikan.git
JANGAN paste token di chat Claude.

---

## Stack
- HTML + CSS + Vanilla JS (single file, no build)
- xlsx@0.18.5, chart.js, @supabase/supabase-js@2
- Supabase: https://hharingjtlebvpbmbinf.supabase.co — table: laporan_iklan

---

## Supabase Schema (laporan_iklan)
| Kolom | Keterangan |
|---|---|
| id, periode, created_at, keterangan | meta |
| total_spent | total budget iklan |
| sukses_all / pending_all | donasi semua channel by status |
| sukses_iklan / pending_iklan | donasi channel Iklan (semua, bukan matched) |
| jumlah_donasi, avg_donasi | transaksi sukses, rata-rata |
| roas_sukses / roas_all | sukses_iklan/spent, sukses_all/spent |
| per_kpi | JSON KPI + analisa + reko + forecast |
| kpi_harian_chart | JSON [{tgl,budget,nominal,sukses_all}] |
| kpi_campaign_data | JSON [{campaign,spend,sukses,pending,count}] — momentum keyword (UTM) |
| per_harian/campaign/program/channel/konten | JSON [{html}] tbody |
| chart_data | JSON chart |

---

## Identifikasi Channel & Matching (v6)

### identifyChannelRow(row) — auto-detect
1. UTM terisi (utm_campaign/utm_content, bukan placeholder {{...}}) → Iklan + simpan utm
2. UTM kosong → fallback identifyChannel(fundraiser): "baitul maal hidayatullah"=EXCLUDE, "berbagi"+"kebaikan"=Iklan, "drm"=WhatsApp, kosong=Organik

### UTM Setup Meta (dynamic)
  utm_source={{site_source_name}}&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}

### processMatching — FUZZY DIMATIKAN sejak v6
1. utm_campaign + utm_content (kombinasi unik) → _matchedCampaign + _matchedAd
2. utm_campaign saja → _matchedCampaign
3. utm_content saja → _matchedAd + campaign
4. Fuzzy fallback DIHAPUS — bulan tanpa UTM = Unmatched (No Data). Channel tetap dari fundraiser → KPI total akurat.

ALASAN: 1 program diiklankan banyak campaign. Fuzzy nempel donasi ke campaign pertama → ROAS ngibul (pernah 1574x). UTM = satu-satunya cara objektif.

---

## Dashboard 6 Tab
| Tab | Sumber | Isi |
|---|---|---|
| Ringkasan | Donasi+Iklan | KPI, trend 3-garis, analisa, reko, momentum, forecast |
| Harian | Donasi+Iklan | Per hari: Donasi, Nominal, Budget, ROAS, CPA, Status (by tanggal) |
| Campaign | Iklan+UTM | Adds to Cart, Conversion Value, Budget, ROAS Meta, Donasi Real, ROAS Real, Status |
| Program | Donasi | Per program |
| Konten | Iklan+UTM | Per ad: Budget, Conversion Value, ROAS Meta, Donasi Real, ROAS Real, Efektivitas |
| Channel | Donasi | Per channel |

Semua tabel: header klik → sort a-z/z-a (▼/▲). Baris TOTAL tetap di bawah.

---

## KPI Ringkasan (donasi real)
- Sukses/Pending Iklan = donasi channel Iklan (identifyChannelRow), TANPA peduli match → cocok total Donasiaja
- ROAS Sukses Iklan = Sukses Iklan / Spent | ROAS All = Sukses All / Spent
- KPI Sukses Iklan (duit real) ≠ Total Conversion Value (klaim pixel Meta). Wajar berbeda.

---

## Campaign & Konten — Dual ROAS (v6)
### Meta side
- Conversion Value = "Adds to cart conversion value" (colConvValue)
- ROAS Meta = conversion value / budget
- Adds to Cart = count (colResults)
### Real side
- Donasi Real = matchedData via UTM exact, sukses only
- Campaign key = utm_campaign | Konten key = campaign||ad (hindari dobel "mix vid")
- ROAS Real = donasi real / budget | tanpa UTM = "No Data"
### Catatan
- Campaign nama sama beda akun masih merge 1 baris (utm tidak bawa akun)
- Data fiktif dihapus manual di Excel sebelum upload

---

## Harian (objektif, by tanggal)
- Donasi+Nominal = donasi channel Iklan sukses by tanggal donasi
- Budget = spend by tanggal iklan
- ROAS = Nominal/Budget | CPA = Budget/Donasi | Status: >3x Optimal, >1x Break Even, ≤1x Loss

## Trend Ringkasan — 3 garis
Sukses Iklan (hijau), Sukses All (biru), Budget (merah) — by tanggal, konsisten KPI.

## Momentum (v6)
- Input: nama, mulai, selesai, keyword campaign (opsional)
- Spend (iklan, filter tgl+keyword) | Nominal (donasi sukses, filter tgl+keyword) | ROAS=Nominal/Spend
- Hari Aktif = hari KALENDER range (hariKalender), bukan hari ada donasi
- Server: kpi_campaign_data (keyword) / kpi_harian_chart (no keyword)

## Forecast (v6)
- Upload: donasi sukses Iklan by tanggal + budget by tanggal (tahan tanpa UTM)
- Server: kpi_harian_chart (sukses_all)
- MA-7 (60%) + Linear Trend (40%), min 7 hari

---

## Fungsi Utama
identifyChannel, identifyChannelRow (v6 auto UTM), getIklanMatchedData (matched only — kosong tanpa UTM, hindari untuk total), processMatching (UTM exact), buildRingkasan, buildHarian, buildCampaign (dual ROAS), buildKonten (dual ROAS key campaign||ad), buildProgram, buildChannel, buildForecast, buildMomentum, hariKalender, collectCampaignData, makeSortable, simpanKeServer, muatDariServer, tampilLaporan.

CATATAN getIklanMatchedData: setelah fuzzy mati, kosong tanpa UTM. Fungsi yang butuh "donasi iklan total" sudah diganti pakai rawDonasi + identifyChannelRow (buildRingkasan program, forecast, collectAgregat suksesMeta, kpi_harian_chart). Hanya collectCampaignData yang sengaja UTM-matched.

---

## localStorage DINONAKTIFKAN (v6)
saveState() DIHAPUS — data besar lewat kuota → QuotaExceededError yang memblokir Simpan ke Server. Persistence via Supabase saja. localStorage tidak lintas-device, jadi tidak berguna untuk atasan.

---

## Bug Fixes
### v1-v5 (ringkas)
selectedIndex, async timing, momentum init, rebuild analisa, data-driven reko, sukses_all per hari, hari kalender, popup tutup, hint lintas bulan, conversion value (hapus CTR-weighting), Adds to Cart, sort universal.

### v6 (2026-06-06)
19. Dropdown UTM + identifyChannelRow
20. processMatching UTM exact (campaign+content)
21. KPI Sukses Iklan = semua channel Iklan (cocok Donasiaja)
22. Harian nominal+budget by tanggal (fix Budget Rp0)
23. Dual ROAS (Meta+Real) Campaign & Konten
24. Konten key campaign||ad (hapus dobel)
25. Trend 3 garis
26. Hapus saveState localStorage (fix QuotaExceeded)
27. Matikan fuzzy fallback (ROAS Real murni UTM)
28. Forecast by tanggal (tahan tanpa UTM)
29. Audit getIklanMatchedData
30. Fix progCol ReferenceError

---

## Migrasi
- Laporan lama: upload ulang + simpan ulang untuk perhitungan v6
- Bulan sebelum UTM: ROAS Real = No Data (wajar), ROAS Meta & KPI total tetap akurat

## Roadmap
- [ ] Campaign sama beda akun → pisah per akun
- [ ] Filter periode semua tab
- [ ] Target tracking bulanan, perbandingan mingguan
- [ ] Dark mode, Export PDF

---
# Version: 6.1 | Updated: 2026-06-08

## Account ID/Name + kpi_campaign_data untuk MCP

### Dropdown baru Step 1 (kolom IKLAN)
- colAccountId → auto-detect "Account ID" (format angka, mis. 856184078943916)
- colAccountName → auto-detect "Account name"
- TIDAK ditampilkan di tab manapun — murni untuk MCP via kpi_campaign_data

### Struktur kpi_campaign_data (v6.1) — sumber data MCP
Dihasilkan collectCampaignData(). Group per campaign (gabung semua akun).

Campaign unik 1 akun:
  {campaign, spend, conversion_value, sukses, pending, count, multi_account:false, account_id, account_name}

Campaign sama beda akun (multi_account):
  {campaign, spend, conversion_value, sukses, pending, count, multi_account:true,
   accounts:[{account_id,account_name},...], note:"Gabungan N akun - donasi real tidak bisa dipisah per akun (UTM tanpa info akun)"}

### Keterbatasan akun (penting untuk MCP)
- Meta TIDAK punya {{account.name}}/{{account.id}} di UTM (cuma 8 macro: ad/adset/campaign id+name, placement, site_source_name)
- utm_campaign={{campaign.name}} → donasi tidak bawa info akun
- Campaign nama SAMA di >1 akun → donasi real MUSTAHIL dipisah per akun. Di-merge + note.
- Spend & conversion_value (sisi Meta) tetap akurat per akun (dari file iklan)
- Solusi ke depan: nama campaign UNIK per akun → utm_campaign otomatis unik → real per akun akurat (hanya data setelah rename)

## Git Workflow (aktif)
- Kerja di branch dev → test → merge ke main saat stabil
- git checkout main && git merge dev && git push origin main && git checkout dev
