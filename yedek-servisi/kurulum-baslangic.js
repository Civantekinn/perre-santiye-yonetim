/**
 * Bilgisayar açılınca / oturum açılınca yedek servisini otomatik başlatır.
 * - Startup klasörüne VBS kısayolu
 * - Görev Zamanlayıcı (ONLOGON) — daha güvenilir
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync, spawnSync } = require("child_process");

const servisKlasoru = __dirname;
const vbsYolu = path.join(servisKlasoru, "baslat-gizli.vbs");
const nodeExe = "C:\\Program Files\\nodejs\\node.exe";
const indexJs = path.join(servisKlasoru, "index.js");

const startupDir = path.join(
  os.homedir(),
  "AppData",
  "Roaming",
  "Microsoft",
  "Windows",
  "Start Menu",
  "Programs",
  "Startup"
);

if (!fs.existsSync(startupDir)) {
  fs.mkdirSync(startupDir, { recursive: true });
}

// 1) Startup VBS — penceresiz
const startupVbs = path.join(startupDir, "Perre-Yedek-Servisi.vbs");
fs.writeFileSync(
  startupVbs,
  "' Perre Yedek otomatik baslat\r\n" +
    'CreateObject("WScript.Shell").Run "wscript.exe ""' +
    vbsYolu +
    '""", 0, False\r\n',
  "utf8"
);
console.log("Startup kısayolu:", startupVbs);

// Eski .bat varsa kaldır (çift başlatmayı önle)
const eskiBat = path.join(startupDir, "Perre-Yedek-Servisi.bat");
if (fs.existsSync(eskiBat)) {
  fs.unlinkSync(eskiBat);
  console.log("Eski .bat kaldırıldı.");
}

// 2) Görev Zamanlayıcı — oturum açılınca
const gorevAdi = "PerreYedekServisi";
const tr = `wscript.exe "${vbsYolu}"`;

try {
  execSync(`schtasks /Delete /TN "${gorevAdi}" /F`, { stdio: "ignore" });
} catch (_) {
  /* yoksa sorun değil */
}

const create = spawnSync(
  "schtasks",
  [
    "/Create",
    "/TN",
    gorevAdi,
    "/TR",
    tr,
    "/SC",
    "ONLOGON",
    "/RL",
    "LIMITED",
    "/F",
  ],
  { encoding: "utf8" }
);

if (create.status === 0) {
  console.log("Görev Zamanlayıcı kuruldu:", gorevAdi);
} else {
  console.log(
    "Görev Zamanlayıcı uyarısı:",
    (create.stderr || create.stdout || "").trim() || "bilinmiyor"
  );
  console.log("Startup klasörü yine de hazır — oturum açılınca başlar.");
}

// 3) 5 dakikada bir kontrol — düştüyse tekrar kaldırır (tek örnek kilidi çift açmaz)
const kontrolAdi = "PerreYedekServisiKontrol";
try {
  execSync(`schtasks /Delete /TN "${kontrolAdi}" /F`, { stdio: "ignore" });
} catch (_) {
  /* ignore */
}
const kontrol = spawnSync(
  "schtasks",
  [
    "/Create",
    "/TN",
    kontrolAdi,
    "/TR",
    tr,
    "/SC",
    "MINUTE",
    "/MO",
    "5",
    "/RL",
    "LIMITED",
    "/F",
  ],
  { encoding: "utf8" }
);
if (kontrol.status === 0) {
  console.log("Sağlık kontrolü (5 dk):", kontrolAdi);
}

console.log("\nYedek klasörü: Documents\\Perre-Yedek");
console.log("Log dosyası:", path.join(servisKlasoru, "yedek.log"));
console.log("\nBilgisayar / oturum açılınca servis otomatik ve gizli başlar.");
console.log("Şimdi başlatmak için: npm run baslat");
