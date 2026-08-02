/**
 * Perre Yerel Yedek Servisi (Katman 3)
 *
 * - Supabase Realtime dinler; kopunca otomatik yeniden bağlanır
 * - Her 2 dakikada bir güvenlik taraması (kaçan kayıtları yakalar)
 * - Excel'e yazar; aynı id varsa günceller
 */

const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const AYAR_DOSYASI = path.join(__dirname, "ayarlar.json");
const LOCK_DOSYASI = path.join(__dirname, "yedek.lock");
const LOG_DOSYASI = path.join(__dirname, "yedek.log");
const TARAMA_MS = 2 * 60 * 1000;
const YENIDEN_BAGLAN_MS = 5000;
const KILIT_PORT = 39217;

const TABLOLAR = [
  "santiyeler",
  "personeller",
  "puantaj",
  "malzemeler",
  "malzeme_hareket",
  "gelir_gider",
  "isci_maas_odemeleri",
  "odemeler",
  "ofis_personeller",
  "ofis_masraflar",
  "ofis_odemeler",
  "depo_malzemeler",
  "depo_hareket",
  "profiller",
  "kullanici_santiye",
  "audit_log",
];

const kanallar = new Map();
const yenidenBaglanmaZamanlayicilari = new Map();
const yazmaKilitleri = new Map();
let ayarlar = null;
let supabase = null;
let sonTarama = {};

function log(...args) {
  const satir = `[${new Date().toLocaleString("tr-TR")}] ${args.join(" ")}`;
  console.log(satir);
  try {
    if (fs.existsSync(LOG_DOSYASI) && fs.statSync(LOG_DOSYASI).size > 5 * 1024 * 1024) {
      const eskiLog = path.join(__dirname, "yedek.1.log");
      if (fs.existsSync(eskiLog)) fs.unlinkSync(eskiLog);
      fs.renameSync(LOG_DOSYASI, eskiLog);
    }
    fs.appendFileSync(LOG_DOSYASI, satir + "\n", "utf8");
  } catch (_) {
    /* ignore */
  }
}

function ayarlariOku() {
  if (fs.existsSync(AYAR_DOSYASI)) {
    return JSON.parse(fs.readFileSync(AYAR_DOSYASI, "utf8"));
  }
  return null;
}

function ayarlariYaz(data) {
  fs.writeFileSync(AYAR_DOSYASI, JSON.stringify(data, null, 2), "utf8");
}

function tekOrnekKilidi() {
  return new Promise((resolve) => {
    const net = require("net");
    const server = net.createServer();
    server.once("error", () => {
      log("Yedek servisi zaten çalışıyor — bu örnek çıkıyor.");
      process.exit(0);
    });
    server.listen(KILIT_PORT, "127.0.0.1", () => {
      fs.writeFileSync(
        LOCK_DOSYASI,
        JSON.stringify({
          pid: process.pid,
          port: KILIT_PORT,
          baslangic: new Date().toISOString(),
        }),
        "utf8"
      );
      const temizle = () => {
        try {
          server.close();
        } catch (_) {
          /* ignore */
        }
        try {
          if (fs.existsSync(LOCK_DOSYASI)) {
            const data = JSON.parse(fs.readFileSync(LOCK_DOSYASI, "utf8"));
            if (data.pid === process.pid) fs.unlinkSync(LOCK_DOSYASI);
          }
        } catch (_) {
          /* ignore */
        }
      };
      process.on("exit", temizle);
      process.on("SIGINT", () => {
        temizle();
        process.exit(0);
      });
      process.on("SIGTERM", () => {
        temizle();
        process.exit(0);
      });
      resolve();
    });
  });
}

async function klasorSec() {
  try {
    const dialog = require("node-file-dialog");
    const sonuc = await dialog({ type: "directory" });
    if (sonuc && sonuc[0]) return sonuc[0];
  } catch (e) {
    log("Klasör seçim penceresi açılamadı:", e.message);
  }

  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question("Yedek klasörünün tam yolunu yazın: ", (cevap) => {
      rl.close();
      resolve(cevap.trim());
    });
  });
}

async function excelSatirEkle(klasor, tablo, kayit) {
  const onceki = yazmaKilitleri.get(tablo) || Promise.resolve();
  let coz;
  const kilit = new Promise((r) => {
    coz = r;
  });
  yazmaKilitleri.set(
    tablo,
    onceki.then(() => kilit)
  );
  await onceki;

  try {
    const dosyaYolu = path.join(klasor, `${tablo}.xlsx`);
    const workbook = new ExcelJS.Workbook();
    let sheet;

    if (fs.existsSync(dosyaYolu)) {
      await workbook.xlsx.readFile(dosyaYolu);
      sheet = workbook.getWorksheet(1) || workbook.addWorksheet(tablo);
    } else {
      sheet = workbook.addWorksheet(tablo);
      const basliklar = Object.keys(kayit);
      sheet.addRow(basliklar);
      sheet.getRow(1).font = { bold: true };
    }

    const basliklar = [];
    sheet.getRow(1).eachCell((cell) => basliklar.push(cell.value));

    for (const key of Object.keys(kayit)) {
      if (!basliklar.includes(key)) {
        basliklar.push(key);
        sheet.getRow(1).getCell(basliklar.length).value = key;
        sheet.getRow(1).getCell(basliklar.length).font = { bold: true };
      }
    }

    let hedefSatir = null;
    const idCol = basliklar.indexOf("id") + 1;
    if (idCol > 0 && kayit.id) {
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        if (String(row.getCell(idCol).value) === String(kayit.id)) {
          hedefSatir = row;
        }
      });
    }

    const degerler = basliklar.map((k) => {
      const v = kayit[k];
      if (v === null || v === undefined) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return v;
    });

    if (hedefSatir) {
      degerler.forEach((v, i) => {
        hedefSatir.getCell(i + 1).value = v;
      });
    } else {
      sheet.addRow(degerler);
    }

    await workbook.xlsx.writeFile(dosyaYolu);
    log(`${tablo} → ${dosyaYolu}`);
  } finally {
    coz();
  }
}

async function durumGuncelle(tablo, ek = 1) {
  try {
    const { data: mevcut } = await supabase
      .from("yedekleme_durumu")
      .select("id, kayit_sayisi")
      .eq("katman", "yerel")
      .eq("tablo_adi", tablo)
      .maybeSingle();

    if (mevcut) {
      await supabase
        .from("yedekleme_durumu")
        .update({
          kayit_sayisi: Number(mevcut.kayit_sayisi || 0) + ek,
          son_senkron: new Date().toISOString(),
          durum: "aktif",
          mesaj: "Yerel Excel yedek çalışıyor",
          updated_at: new Date().toISOString(),
        })
        .eq("id", mevcut.id);
    } else {
      await supabase.from("yedekleme_durumu").insert({
        katman: "yerel",
        tablo_adi: tablo,
        kayit_sayisi: ek,
        son_senkron: new Date().toISOString(),
        durum: "aktif",
        mesaj: "Yerel Excel yedek çalışıyor",
      });
    }
  } catch (e) {
    log("Durum güncellenemedi:", e.message);
  }
}

async function kaydiIsle(tablo, kayit) {
  if (!kayit) return;
  try {
    await excelSatirEkle(ayarlar.yedekKlasoru, tablo, kayit);
    if (tablo === "audit_log") {
      await auditKlasoruneYaz(kayit);
    }
    await durumGuncelle(tablo);
  } catch (e) {
    log(`Yazma hatası (${tablo}):`, e.message);
  }
}

function guvenliKlasorAdi(ad) {
  return String(ad || "Genel-Sistem")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

async function auditKlasoruneYaz(kayit) {
  let santiyeAdi = "Genel-Sistem";
  let yapanKisi = "Sistem";

  if (kayit.santiye_id) {
    const { data } = await supabase
      .from("santiyeler")
      .select("ad")
      .eq("id", kayit.santiye_id)
      .maybeSingle();
    if (data?.ad) santiyeAdi = data.ad;
  }
  if (kayit.yapan_kullanici_id) {
    const { data } = await supabase
      .from("profiller")
      .select("ad_soyad")
      .eq("id", kayit.yapan_kullanici_id)
      .maybeSingle();
    if (data?.ad_soyad) yapanKisi = data.ad_soyad;
  }

  const klasor = path.join(
    ayarlar.yedekKlasoru,
    "Loglar",
    guvenliKlasorAdi(santiyeAdi)
  );
  fs.mkdirSync(klasor, { recursive: true });

  const zaman = new Date(kayit.created_at || Date.now());
  const ay = `${zaman.getFullYear()}-${String(zaman.getMonth() + 1).padStart(2, "0")}`;
  const veri = kayit.yeni_veri || kayit.eski_veri || {};
  const ayrintiliKayit = {
    id: kayit.id,
    tarih_saat: zaman.toLocaleString("tr-TR"),
    yapan_kisi: yapanKisi,
    islem: kayit.islem,
    tablo: kayit.tablo_adi,
    kayit_id: kayit.kayit_id,
    onceki_deger: kayit.eski_veri || "",
    sonraki_deger: kayit.yeni_veri || "",
    kayit_ozeti:
      veri.ad_soyad || veri.ad || veri.aciklama || veri.kategori || "",
  };

  await excelSatirEkle(klasor, `islem-log-${ay}`, ayrintiliKayit);

  const metin =
    `[${zaman.toLocaleString("tr-TR")}] ${yapanKisi} | ` +
    `${kayit.tablo_adi} | ${kayit.islem} | ${kayit.kayit_id}\n`;
  fs.appendFileSync(path.join(klasor, `islem-log-${ay}.txt`), metin, "utf8");
  log(`Şantiye log klasörü → ${klasor}`);
}

function kanalDinle(tablo) {
  const eski = kanallar.get(tablo);
  if (eski) {
    // CLOSED olayı eski kanal için yeniden bağlantı başlatmasın.
    kanallar.delete(tablo);
    try {
      supabase.removeChannel(eski);
    } catch (_) {
      /* ignore */
    }
  }

  const kanal = supabase
    .channel(`yedek-${tablo}-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: tablo },
      async (payload) => {
        const kayit = payload.new || payload.old;
        await kaydiIsle(tablo, kayit);
      }
    )
    .subscribe((status) => {
      // Bu kanal yenisiyle değiştirildiyse durum olayını yok say.
      if (kanallar.get(tablo) !== kanal) return;

      if (status === "SUBSCRIBED") {
        const bekleyen = yenidenBaglanmaZamanlayicilari.get(tablo);
        if (bekleyen) clearTimeout(bekleyen);
        yenidenBaglanmaZamanlayicilari.delete(tablo);
        log(`${tablo}: bağlandı`);
      } else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        log(`${tablo}: ${status} — ${YENIDEN_BAGLAN_MS / 1000}sn sonra yeniden bağlanılacak`);
        kanallar.delete(tablo);
        if (!yenidenBaglanmaZamanlayicilari.has(tablo)) {
          const zamanlayici = setTimeout(() => {
            yenidenBaglanmaZamanlayicilari.delete(tablo);
            if (!kanallar.has(tablo)) kanalDinle(tablo);
          }, YENIDEN_BAGLAN_MS);
          yenidenBaglanmaZamanlayicilari.set(tablo, zamanlayici);
        }
      }
    });

  kanallar.set(tablo, kanal);
}

async function tabloCek(tablo, sonra) {
  let res = await supabase
    .from(tablo)
    .select("*")
    .gte("updated_at", sonra)
    .order("updated_at", { ascending: true })
    .limit(300);
  if (!res.error) return res.data || [];

  res = await supabase
    .from(tablo)
    .select("*")
    .gte("created_at", sonra)
    .order("created_at", { ascending: true })
    .limit(300);
  if (!res.error) return res.data || [];

  // Zaman sütunu yoksa taramada atla — realtime zaten yazar
  return [];
}

async function guvenlikTaramasi() {
  for (const tablo of TABLOLAR) {
    try {
      const sonra =
        sonTarama[tablo] ||
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const data = await tabloCek(tablo, sonra);
      if (!data.length) {
        sonTarama[tablo] = new Date().toISOString();
        continue;
      }

      let yazilan = 0;
      for (const kayit of data) {
        await excelSatirEkle(ayarlar.yedekKlasoru, tablo, kayit);
        yazilan++;
      }
      if (yazilan > 0) {
        await durumGuncelle(tablo, yazilan);
        log(`Tarama ${tablo}: ${yazilan} kayıt yazıldı`);
      }
      sonTarama[tablo] = new Date().toISOString();
    } catch (e) {
      log(`Tarama hatası (${tablo}):`, e.message);
    }
  }
}

async function main() {
  await tekOrnekKilidi();

  log("═══════════════════════════════════════════");
  log("  Perre Yerel Yedek Servisi (Katman 3)");
  log("═══════════════════════════════════════════");

  ayarlar = ayarlariOku();
  const envKlasor = process.env.YEDEK_KLASORU;
  if (!ayarlar?.yedekKlasoru && envKlasor && fs.existsSync(envKlasor)) {
    ayarlar = { yedekKlasoru: envKlasor, olusturma: new Date().toISOString() };
    ayarlariYaz(ayarlar);
  }
  if (!ayarlar?.yedekKlasoru) {
    log("İlk kurulum: yedek klasörü seçin.");
    const klasor = await klasorSec();
    if (!klasor || !fs.existsSync(klasor)) {
      log("Geçerli bir klasör seçilmedi. Çıkılıyor.");
      process.exit(1);
    }
    ayarlar = { yedekKlasoru: klasor, olusturma: new Date().toISOString() };
    ayarlariYaz(ayarlar);
    log("Klasör kaydedildi:", klasor);
  } else {
    if (!fs.existsSync(ayarlar.yedekKlasoru)) {
      fs.mkdirSync(ayarlar.yedekKlasoru, { recursive: true });
    }
    log("Yedek klasörü:", ayarlar.yedekKlasoru);
  }

  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    log("SUPABASE_URL ve anahtar (.env / ../.env.local) gerekli.");
    process.exit(1);
  }

  supabase = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 10 } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  log("Realtime dinleniyor + 2 dk güvenlik taraması aktif…");

  for (const tablo of TABLOLAR) {
    kanalDinle(tablo);
    sonTarama[tablo] = new Date().toISOString();
  }

  // İlk tarama kısa gecikmeyle
  setTimeout(() => {
    guvenlikTaramasi().catch((e) => log("İlk tarama:", e.message));
  }, 15000);

  setInterval(() => {
    guvenlikTaramasi().catch((e) => log("Tarama:", e.message));
  }, TARAMA_MS);

  log("Servis çalışıyor (arka plan). Durdurmak için görevi kapatın.");

  // Süreci canlı tut
  setInterval(() => {}, 60 * 60 * 1000);
}

main().catch((e) => {
  log(String(e));
  process.exit(1);
});
