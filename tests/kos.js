#!/usr/bin/env node
/* Tüm regresyon testlerini koşturur.  Kullanım:  node tests/kos.js
   Çıkış kodu 0 = hepsi geçti, 1 = en az bir hata.

   Bu testlerin ayırıcı özelliği: mantığı kopyalamıyorlar, gerçek kaynak
   dosyadan regex ile ÇIKARIP koşuyorlar. Kod değişince test de değişir;
   kopya test kod değiştiğinde sessizce yalan söyler. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/* TEST BAŞINA SÜRE TAVANI (M3).
   `execFileSync` zaman aşımsız çağrılıyordu: TEK bir asılı test kapıyı
   SÜRESİZ bekletiyor. ÖLÇÜLDÜ: `setInterval(()=>{},1000)` içeren bir dosya
   eklendi, koşturucu 8 saniye sonra hâlâ koşuyordu ve kendiliğinden hiç
   bitmeyecekti. Gece fabrikası gibi gözetimsiz koşan bir düzende bu, kapının
   kırmızı vermesi değil HİÇ CEVAP VERMEMESİ demek — en kötü hâli, çünkü
   "sürüyor" ile "öldü" ayırt edilemez.
   Zaman aşımı KIRMIZI sayılıyor; sessizce atlanırsa test kapsamı sessizce
   düşer (M2de kapattığımız kör noktanın aynısı olurdu).
   Tavan cömert. ÖLÇÜLEN süreler: en yavaş üç test 75-iphone-sunucu (5,5 sn,
   gerçek HTTPS sunucusu başlatıyor), 35-arsiv-askida-kalma (3,3 sn) ve
   29-yerel-sunucu (3,2 sn); 77 dosyanın tamamı 14,8 sn. 60 saniyelik tavan
   en yavaş testin 11 katı — yavaş bir makinede bile yanlış alarm vermez. */
const SURE_TAVANI = +(process.env.SUFLE_TEST_TAVAN || 60000);
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
  let asildi = false;
  try {
    cikti = execFileSync(process.execPath, [path.join(dizin, f)],
                         { encoding: 'utf8', timeout: SURE_TAVANI, killSignal: 'SIGKILL' });
  } catch (e) {
    ok = false;
    cikti = (e.stdout || '') + (e.stderr || '');
    /* Zaman aşımında Node ya `killed` bayrağını ya da ETIMEDOUT kodunu verir. */
    if (e.killed || e.code === 'ETIMEDOUT') asildi = true;
  }
  const gecen = (cikti.match(/✓/g) || []).length;
  const kalan = (cikti.match(/✗/g) || []).length;
  toplam += gecen; hata += kalan;
  const atlandi = /ATLANDI:/.test(cikti);
  const eski = taban[f];
  const notlar = [];
  if (asildi) notlar.push(`SÜRE AŞIMI (${SURE_TAVANI / 1000} sn) — test asılı kaldı, öldürüldü`);
  /* Hiç iddia koşmadıysa test bir şey ÖLÇMEMİŞTİR — geçti sayılamaz. */
  if (gecen + kalan === 0) notlar.push('HİÇ İDDİA KOŞMADI');
  /* Koruma daralmışsa söyle. Atlanan testte karşılaştırma yapılmaz. */
  else if (!atlandi && eski != null && gecen + kalan < eski)
    notlar.push(`iddia sayısı DÜŞTÜ: ${eski} → ${gecen + kalan}`);
  if (atlandi) notlar.push('ortam eksik, taban karşılaştırması atlandı');
  /* Taban yalnız yukarı taşınır; düşüşü burada kabul etmek kapıyı kör ederdi. */
  /* Asılı test yarım çıktı verir, ama `Math.max` zaten tabanı düşürmüyor —
     bunun için ayrı bir dal yazmıştım, kasıtlı bozma turunda o dalın hiçbir
     şey değiştirmediği ölçüldü ve kaldırıldı. Kanıtlanmamış koruma tutma. */
  if (!atlandi) yeniTaban[f] = Math.max(eski || 0, gecen + kalan);
  else if (eski != null) yeniTaban[f] = eski;
  const sorunlu = notlar.some(n => /HİÇ İDDİA|DÜŞTÜ|SÜRE AŞIMI/.test(n));
  const durum = ok && !kalan && !sorunlu ? '✓' : '✗';
  console.log(`${durum} ${f.padEnd(34)} ${String(gecen).padStart(3)} test` +
              (notlar.length ? '   ← ' + notlar.join(' · ') : ''));
  if (sorunlu && !kirik.includes(f)) kirik.push(f);
  if (!ok || kalan) {
    if (!kirik.includes(f)) kirik.push(f);
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
