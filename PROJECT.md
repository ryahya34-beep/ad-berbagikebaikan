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
---
# Version: 6.2 | Updated: 2026-06-10

## MCP Integration — Fase 1 & 2 SELESAI

### Tujuan
Claude bisa analisa Meta Ads (spend live) + ROAS Real histori (Supabase) untuk eksekusi
harian-mingguan. Dua connector aktif di claude.ai: Meta Ads + Supabase Ad.

### Fase 1 — Meta Ads connector
- URL: https://mcp.facebook.com/ads (custom connector, OAuth Meta)
- Tool permissions: 18 write tools (ads_create_*, ads_update_*, ads_delete_*,
  ads_activate_entity, ads_pixel_*_create/update/delete) -> Blocked
- Read tools (ads_get_*, ads_insights_*) -> Always allow / Needs approval
- CATATAN: opt-in OAuth tidak membatasi akses baca - semua ad account yang
  bisa diakses akun FB ter-query (29 akun). Write Blocked = aman read-only.
- Akun "Berbagi Kebaikan" (880571424752913) BELUM MCP-enabled di sisi Meta
  (rollout bertahap) - blocker sebagian Fase 3, cek berkala.
- 4 akun disabled "unusual activity" (BMH Pusat/Kaltim/Banten/Sulsel by Innovasia,
  USD currency) - perlu appeal ke Facebook, terpisah dari MCP.

### Fase 2 — Supabase MCP (project BARU, terpisah dari project lama!)
PENTING: Sekarang ada DUA project Supabase:
- LAMA (kalcerun, hharingjtlebvpbmbinf) - masih dipakai DASHBOARD ini (index.html).
  Berisi laporan_iklan + tabel app lain (Kasirun, Kalcerun) campur jadi satu.
- BARU (ad-berbagikebaikan, ref: gofkxydlareprrtgvouq, org ridwanbmh,
  AWS ap-southeast-1) - khusus data iklan, dipakai MCP. Auto-expose tables
  dimatikan saat create. Tabel laporan_iklan (22 kolom, sama persis struktur lama)
  sudah dimigrasi: 3 baris (Januari 2026, februari 2026, mei 2026).

Kenapa dipisah: project lama punya grant bawaan Supabase ke role
anon/authenticated di SEMUA tabel (termasuk kasirun_profiles, profiles).
Role read-only yang dibuat di project lama otomatis mewarisi akses itu -
isolasi gagal. Project baru bersih (cuma laporan_iklan) sehingga MCP resmi
(yang akses-nya project-wide) jadi aman dipakai.

- MCP: resmi Supabase (mcp.supabase.com), URL:
  https://mcp.supabase.com/mcp?project_ref=gofkxydlareprrtgvouq&read_only=true&features=database
- Tool permissions: Execute SQL/List tables -> allow; write tools (Apply migration dkk) -> Blocked
- Role ad_readonly (SELECT-only + RLS policy) dibuat & TERBUKTI via psql
  (pooler: aws-1-ap-southeast-1.pooler.supabase.com:5432, user format
  ad_readonly.gofkxydlareprrtgvouq - direct connection db.xxx.supabase.co
  TIDAK resolve di jaringan lokal). Role ini cadangan, MCP pakai OAuth bukan role ini.

### OPEN ITEM — SINKRONISASI BELUM SELESAI
Dashboard ini (index.html, simpanKeServer/muatDariServer) MASIH nunjuk ke
project Supabase LAMA (hharingjtlebvpbmbinf). Laporan baru yang di-"Simpan ke
Server" masuk ke project LAMA, sementara MCP baca project BARU.

Untuk MCP selalu lihat data terbaru, salah satu:
(a) Pindah SUPABASE_URL/KEY di index.html ke project baru (gofkxydlareprrtgvouq)
    dan migrasikan SEMUA laporan lama, atau
(b) Setup sync/replikasi dari project lama ke baru, atau
(c) Sementara: setelah simpan laporan baru di dashboard, manual re-insert
    3 baris terbaru ke project baru (tidak scalable, hindari).
Opsi (a) paling bersih tapi belum dikerjakan - PR terpisah, lewat branch dev.

### Fase 3 — dual ROAS (siap diuji setelah open item di atas)
Contoh prompt: "Dari laporan_iklan periode Mei (kpi_campaign_data), bandingkan
ROAS Real per campaign dengan spend live Meta Ads - campaign mana yang
worth scale up?"

### Keamanan
- GitHub PAT lama (vercel-push) sempat ter-expose di chat saat git remote -v
  - sudah di-revoke + remote URL dibersihkan, pakai osxkeychain.

---
# Version: 6.3 | Updated: 2026-06-11

## Keamanan — Project Lama Dihardening

### Masalah ditemukan
Anon key publik di index.html (repo + Vercel publik) bisa akses tabel project
lama hharingjtlebvpbmbinf TANPA auth. Terverifikasi via curl: GET profiles,
kasirun_profiles dll balik HTTP 200 (RLS nyala tapi grant anon/authenticated
masih kebuka). Tabel kebetulan kosong = belum ada data bocor, tapi lubang nyata.

### Tindakan (11 Juni 2026)
- Backup full project lama: ~/backup-supabase-lama/backup_kalcerun_20260611.sql
  (13 tabel + data, via pg_dump pooler aws-1-ap-southeast-1).
- Revoke ALL dari anon+authenticated untuk SEMUA tabel KECUALI laporan_iklan,
  + enable RLS, + drop policy permissif. Default privileges juga dicabut.
- Verifikasi: profiles/kasirun_profiles/transaksi/activities/chat_messages -> 401
  permission denied. laporan_iklan -> 200 (dashboard Muat dari Server tetap jalan).

### SENGAJA DITUNDA — Step 3 (kunci write laporan_iklan)
laporan_iklan TIDAK dikunci write-nya. Alasan: dashboard masih pakai project lama
untuk Simpan ke Server (alur kerja inti: donasi upload -> Simpan ke Server, MCP
cuma BACA). Kunci write sekarang = matikan Simpan ke Server tanpa pengganti.

Step 3 dilakukan NANTI, digabung migrasi (lewat branch dev):
1. Migrasi dashboard index.html -> project baru gofkxydlareprrtgvouq
2. Pasang auth untuk write (Supabase Auth login / RLS authenticated-only)
   -> Simpan ke Server tetap jalan TAPI butuh login, write publik tertutup
3. Project lama: laporan_iklan boleh dikunci penuh / drop (dashboard udah pindah)

### Rollback (kalau ada app non-iklan ternyata kepake)
Tabel coaching (activities/races/training_plans/recovery_logs/coach_athletes)
& Kasirun (produk/kategori/transaksi/detail_transaksi/kasirun_profiles) di-revoke
dengan asumsi app mati. Kalau ternyata hidup: restore dari backup, atau
grant select per tabel ke authenticated + bikin RLS policy proper.

---
# Version: 6.4 | Updated: 2026-07-02

## Migrasi Dashboard SELESAI

Dashboard (index.html) pindah dari project lama (hharingjtlebvpbmbinf) ke baru
(gofkxydlareprrtgvouq). SUPA_URL/SUPA_KEY diganti, global headers dibuang biar
token login (Auth) tidak ketimpa anon key.

### Auth untuk Simpan ke Server
- Fungsi pastikanLogin() dicek di awal simpanKeServer().
- 1 user: ridwanyahya@bmh.or.id (Supabase Auth, email+password, Auto Confirm).
- Site URL diset ke https://ad-berbagikebaikan.vercel.app (sebelumnya localhost:3000,
  bikin link reset password salah arah).
- Muat dari Server tetap anon, tanpa login.

### Step 3 project lama — TUNTAS
laporan_iklan di project lama sekarang locked write (anon/authenticated hanya SELECT).
Root cause awal gagal lock: policy lama "Public insert/update/delete/read" (role
{public}) masih override revoke grant anon/authenticated. Di-drop, diganti policy
select-only. Diverifikasi: POST anon -> 401 RLS violation.

Project lama sekarang pure archive/read-only utk laporan_iklan. Semua tulis baru
lewat project baru saja.

### Auto-pause free tier (kedua project)
Kedua project (baru & lama) sempat auto-pause karena idle >7 hari. Resume manual
via dashboard. Kalau workflow rutin (MCP harian/mingguan), pertimbangkan upgrade
Pro utk hilangkan auto-pause -- pause berulang ganggu continuity.

---
# Version: 6.5 | Updated: 2026-07-02

## Bug: DELETE laporan gagal (403), root cause ditemukan

Grant `authenticated` (insert/update/delete) di laporan_iklan project baru
sempat hilang di tengah kerja — bukan config salah, tapi Supabase platform
incident ("Project status change failures in multiple regions", ongoing
sejak 30 Jun 2026) kemungkinan reset state grant. Symptom: 403 permission
denied meski grant/RLS/token sudah diverifikasi benar berkali-kali.

Fix: re-apply grant setelah incident.
  grant insert, update, delete on table public.laporan_iklan to authenticated;

Kalau muncul lagi: cek https://status.supabase.com dulu sebelum debug config.

### Insiden delete: februari & maret 2026 terhapus permanen
Terjadi saat testing delete (sengaja, sudah dikonfirmasi). jan-mei gabungan
sempat dikira ikut terhapus tapi ternyata utuh (id 9a22aac4 tidak pernah
kena delete). Data sekarang: april, jan-mei, januari, juni, mei — 5 baris.

### Guard delete perlu login (v6.4)
simpanKeServer & tombol hapus laporan sama-sama panggil pastikanLogin()
sebelum write. Grant anon write sudah full di-revoke; anon SELECT-only.

---
# Version: 6.6 | Updated: 2026-07-02

## Poles UI (v6.6)
- Warna brand BMH: primary #0b5147 (hijau tua), secondary #3ec68f (hijau terang),
  accent #ffb839 (oranye) — dari logo. CSS token :root, header gradient hijau.
- Font: Inter (Google Fonts CDN).
- Ikon: Lucide (CDN unpkg, lucide.createIcons()). Emoji statis + narasi diganti
  <i data-lucide>. Dot status (hijau/kuning/merah) tetap SVG inline (Lucide tak
  punya dot berwarna). ✅/☁️ di status.textContent tetap emoji (textContent tak
  render HTML/SVG).
- Sprite <defs> ic lama masih ada (unused, tidak dihapus — tidak mengganggu).
- Markup & logic JS analitik tidak diubah; murni presentational.

Ketergantungan CDN baru: fonts.googleapis.com, unpkg.com (Lucide). Kalau salah
satu keblokir jaringan, font/ikon fallback ke system/kosong.

---
# Version: 6.7 | Updated: 2026-07-24

## Insiden ke-3 auto-pause + pencegah tidur (Vercel Cron)

### Gejala
Tombol melayang "📥 Ada laporan tersimpan" di kanan bawah hilang. Bukan bug UI:
tombol itu dibuat runtime hanya kalau query `laporan_iklan` sukses (index.html
~2094). Query gagal -> `catch(e){}` KOSONG -> tombol tidak dibuat, tanpa pesan.

### Root cause (terverifikasi)
Project Supabase gofkxydlareprrtgvouq auto-pause (free tier, idle >7 hari).
Bukti: `gofkxydlareprrtgvouq.supabase.co` NXDOMAIN dari DNS lokal DAN 8.8.8.8,
sementara vercel app + CDN lain balas 200. Setelah resume manual: 521 -> 404 ->
503 -> 200 (butuh ~1 menit). Data utuh, 7 baris (jan, feb, mar, apr, mei, jun,
semester1 2026 — feb & mar yang dulu terhapus sudah ada lagi).

Ini kejadian ke-3. Pola: DNS hilang total = paused, bukan salah config/RLS.
Cek DNS DULU sebelum debug apa pun.

### Pencegah tidur: Vercel Cron
- `api/ping.js` — SELECT baca-saja 1 baris ke laporan_iklan. Baca kredensial
  dari env (`SUPABASE_URL`, `SUPABASE_ANON_KEY`), TIDAK hardcode (clone-ready).
  Opsional `CRON_SECRET`: kalau diset, endpoint tolak pemanggil tanpa
  `Authorization: Bearer <secret>`; kalau tidak diset, tetap jalan.
- `vercel.json` — cron `0 3 * * *` (10:00 WIB).

Kenapa Vercel Cron, bukan GitHub Actions: GitHub auto-disable scheduled workflow
kalau repo tidak ada commit 60 hari. Repo ini jarang disentuh -> pencegah tidurnya
ikut mati diam-diam. Vercel tidak punya aturan itu, dan akunnya sudah ada.

Batas Hobby (dari docs resmi): cron max 1x/hari, presisi ±59 menit. Cukup —
ambang pause Supabase 7 hari.

### Belum tuntas
- `catch(e){}` kosong di index.html ~2107 masih menelan error diam-diam. Kalau
  server mati lagi, user tetap tidak dapat pesan apa pun. PEMICU: kerjakan
  bareng poles UI berikutnya, atau langsung kalau auto-pause kejadian lagi.
- Ping mengurangi risiko pause, TIDAK menjaminnya. Docs Supabase: hanya Pro yang
  dijamin tidak dipause ("We may pause applications on the Free Plan that
  exhibit low activity in a 7-day period"). Tidak ada larangan keep-alive.
  PEMICU upgrade Pro: kalau pause tetap kejadian meski cron jalan, atau saat
  handover ke klien berbayar.
