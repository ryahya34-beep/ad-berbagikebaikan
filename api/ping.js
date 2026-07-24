// Keep-alive Supabase.
// Dipanggil otomatis 1x sehari oleh Vercel Cron (lihat vercel.json).
// Tujuan: bikin project Supabase free tier tetap dianggap "ada aktivitas"
// supaya tidak auto-pause setelah 7 hari nganggur. Kalau ke-pause, tombol
// "Ada laporan tersimpan" di dashboard hilang diam-diam.
//
// Ini SELECT baca-saja 1 baris. Tidak menulis/mengubah apa pun.

module.exports = async (req, res) => {
  // Kalau CRON_SECRET diset di Vercel, endpoint ini cuma mau dipanggil Vercel Cron.
  // Kalau tidak diset, endpoint tetap jalan (isinya cuma baca 1 id, tidak sensitif).
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return res.status(500).json({
      ok: false,
      error: 'SUPABASE_URL / SUPABASE_ANON_KEY belum diset di Environment Variables Vercel',
    });
  }

  const started = Date.now();
  try {
    const r = await fetch(`${url}/rest/v1/laporan_iklan?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const ms = Date.now() - started;

    if (!r.ok) {
      const body = (await r.text()).slice(0, 200);
      console.error(`keepalive GAGAL: HTTP ${r.status} (${ms}ms) ${body}`);
      return res.status(502).json({ ok: false, status: r.status, ms, body });
    }

    console.log(`keepalive OK: HTTP ${r.status} (${ms}ms)`);
    return res.status(200).json({ ok: true, status: r.status, ms, at: new Date().toISOString() });
  } catch (e) {
    const ms = Date.now() - started;
    console.error(`keepalive ERROR (${ms}ms): ${e.message}`);
    return res.status(502).json({ ok: false, error: e.message, ms });
  }
};
