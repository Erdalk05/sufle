#!/usr/bin/env node
/* Tüm regresyon testlerini koşturur.  Kullanım:  node tests/kos.js
   Çıkış kodu 0 = hepsi geçti, 1 = en az bir hata.

   Bu testlerin ayırıcı özelliği: mantığı kopyalamıyorlar, gerçek kaynak
   dosyadan regex ile ÇIKARIP koşuyorlar. Kod değişince test de değişir;
   kopya test kod değiştiğinde sessizce yalan söyler. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dizin = __dirname;
const dosyalar = fs.readdirSync(dizin)
  .filter(f => /^\d\d-.*\.js$/.test(f))
  .sort();

/* İDDİA SAYISI DA BİR KAPI (M2).
   Koşturucu çıkış kodunu zaten alıyordu ama İDDİA SAYISI ölçülmüyordu ve iki
   kör noktası vardı:
     1) SIFIR İDDİALI TEST YEŞİL GEÇİYORDU. `gecen=0, kalan=0, ok=true` durumu
        "✓ 0 test" basıp toplamı hiç değiştirmiyordu. Yani bir test sessizce
        boşalırsa (çıkarım deseni tutmaz, erken `return`, koşul hiç sağlanmaz)
        kapı bunu göremiyordu. Ölçüldü: 0 iddialı bir dosya eklendi, kapı yeşil
        kaldı ve 2355 sayısı değişmedi.
     2) İDDİA SAYISININ DÜŞMESİ görünmezdi. 42 iddialı bir test 12 iddiaya
        inse kapı yine yeşil derdi — koruma yarıya inmiş olur, kimse duymaz.
   Çözüm: dosya başına sayım `tests/beklenen.json` içinde tutuluyor. Sayı
   DÜŞERSE kapı kırmızı; artarsa taban güncelleniyor (büyüme serbest).
   Ortama bağlı atlamalar için testler `ATLANDI:` satırı basabiliyor. */
const TABAN = path.join(dizin, 'beklenen.json');
let taban = {};
try { taban = JSON.parse(fs.readFileSync(TABAN, 'utf8')); } catch (e) { taban = {}; }
const yeniTaban = {};

let toplam = 0, hata = 0, kirik = [];
for (const f of dosyalar) {
  let cikti = '';
  let ok = true;
  try {
    cikti = execFileSync(process.execPath, [path.join(dizin, f)], { encoding: 'utf8' });
  } catch (e) {
    ok = false;
    cikti = (e.stdout || '') + (e.stderr || '');
  }
  const gecen = (cikti.match(/✓/g) || []).length;
  const kalan = (cikti.match(/✗/g) || []).length;
  toplam += gecen; hata += kalan;
  const atlandi = /ATLANDI:/.test(cikti);
  const eski = taban[f];
  const notlar = [];
  /* Hiç iddia koşmadıysa test bir şey ÖLÇMEMİŞTİR — geçti sayılamaz. */
  if (gecen + kalan === 0) notlar.push('HİÇ İDDİA KOŞMADI');
  /* Koruma daralmışsa söyle. Atlanan testte karşılaştırma yapılmaz. */
  else if (!atlandi && eski != null && gecen + kalan < eski)
    notlar.push(`iddia sayısı DÜŞTÜ: ${eski} → ${gecen + kalan}`);
  if (atlandi) notlar.push('ortam eksik, taban karşılaştırması atlandı');
  /* Taban yalnız yukarı taşınır; düşüşü burada kabul etmek kapıyı kör ederdi. */
  if (!atlandi) yeniTaban[f] = Math.max(eski || 0, gecen + kalan);
  else if (eski != null) yeniTaban[f] = eski;
  const sorunlu = notlar.some(n => /HİÇ İDDİA|DÜŞTÜ/.test(n));
  const durum = ok && !kalan && !sorunlu ? '✓' : '✗';
  console.log(`${durum} ${f.padEnd(34)} ${String(gecen).padStart(3)} test` +
              (notlar.length ? '   ← ' + notlar.join(' · ') : ''));
  if (sorunlu && !kirik.includes(f)) kirik.push(f);
  if (!ok || kalan) {
    kirik.push(f);
    cikti.split('\n').filter(l => l.includes('✗') || l.includes('Error')).forEach(l => console.log('    ' + l.trim()));
  }
}
/* Silinen test dosyalarının tabanı birikmesin. */
console.log('─'.repeat(52));
console.log(`${toplam} test geçti, ${hata} hata` + (kirik.length ? ` — kırık: ${kirik.join(', ')}` : ''));
if (!process.env.SUFLE_TABAN_YAZMA) {
  try {
    const gecici = TABAN + '.tmp';
    fs.writeFileSync(gecici, JSON.stringify(yeniTaban, null, 1) + '\n');
    fs.renameSync(gecici, TABAN);   // atomik: yarım yazılmış taban kapıyı yanıltır
  } catch (e) { console.log('  ! taban yazılamadı: ' + e.message); }
}
process.exit(hata || kirik.length ? 1 : 0);
