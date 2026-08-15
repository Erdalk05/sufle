const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu, macYolu, oku, REPO}=require('./kaynak.js');

/* F.4 — MAĞAZA METNİ: her cümlenin karşılığı VAR MI.

   Mağaza metni pazarlama değil SÖZ. Olmayan bir özelliği yazmak, indiren
   kullanıcının ilk beş dakikada terk etmesi demek. Bu test metindeki her
   somut iddiayı koddaki karşılığına bağlıyor: biri metne yeni bir cümle
   eklerse ve karşılığı yoksa kapı kırılır.

   Sözlü/genel cümleler (ör. "göz teması bozulmaz") sınanmıyor; sınanan şey
   ADI OLAN özellikler. */

const tel = oku(telefonYolu());
const mac = oku(macYolu());
/* Bozma turu metni geçici kopyada bozup yolu SUFLE_MAGAZA ile veriyor;
   bu satır olmadan test hep depodaki temiz metni okur ve abartma engelinin
   çalıştığı KANITLANAMAZ. SUFLE_JETON/SOZLUK/DOCX ile aynı kural. */
const magYolu = (() => {
  const v = process.env.SUFLE_MAGAZA;
  if (v && !fs.existsSync(v))
    throw new Error('Verilen yol yok: ' + v + ' (SUFLE_MAGAZA) — bozma hiçbir şey ölçmez.');
  return v || path.join(REPO,'MAGAZA.md');
})();
const mag = fs.readFileSync(magYolu,'utf8').replace(/\s+/g,' ');
const tek = fs.readFileSync(path.join(REPO,'MAGAZA_TEKNIK.md'),'utf8').replace(/\s+/g,' ');

/* ---------- METİNDEKİ İDDİALARIN KARŞILIĞI ---------- */
{
  /* [metinde geçen söz, hangi kabuk, koddaki kanıt] */
  const IDDIA = [
    ['Sesle takip',            tel, /SpeechRecognition/],
    ['WPM sabit hız',          tel, /wpm/i],
    ['Reels ve Shorts oranı',  tel, /reels|shorts/i],
    ['güvenli alan işareti',   tel, /data-t="safe"/],
    ['okuma şeridi',           tel, /band/i],
    ['nefes işareti',          tel, /tBreath|breathMarks|nefes/i],
    ['biyonik okuma',          tel, /bionic/],
    ['disleksi yazı tipi',     tel, /f-dys/],
    ['yüksek kontrast',        tel, /body\.hicon/],
    ['hareket azaltma',        tel, /prefers-reduced-motion/],
    ['baştan sondan kesme',    tel, /function doTrim/],
    ['altyazı senaryodan',     tel, /srt/i],
    ['docx içe aktarma',       tel, /docxMetni/],
    ['tek dosyaya yedekleme',  tel, /function yedekDosyaya/],
    ['harici kamera seçimi',   mac, /function setupCams/],
    ['kayıtta panel kapanır',  mac, /fullOncesi/],
    ['telefondan kumanda',     mac, /remoteBox/],
    ['kumandada önizleme',     mac, /onizlemeBaslat/],
    ['yayın (OBS) kipi',       mac, /body\.obs\{/],
    ['iki dilli arayüz',       mac, /id="langSwitch"/],
  ];
  for (const [soz, kaynak, kanit] of IDDIA)
    ok('metindeki söz kodda karşılanıyor: ' + soz, kanit.test(kaynak));
}

/* ---------- ABARTMA VE YANLIŞ BEYAN YOK MU ---------- */
{
  /* Ölçülüp ELENEN şeyler metne sızmamalı. Sanal kamera yazılamaz, PDF
     desteklenmiyor, bulut yok — biri bunları metne koyarsa kapı kırılsın. */
  ok('sanal kamera vaat edilmiyor', !/sanal kamera|virtual camera/i.test(mag));
  ok('PDF içe aktarma vaat edilmiyor', !/PDF (dosyas|import|file)/i.test(mag));
  ok('bulut senkron vaat edilmiyor', !/bulut senkron|cloud sync/i.test(mag));
  ok('yapay zekâ vaat edilmiyor', !/yapay zekâ|\bAI\b/i.test(mag));
  /* Gizlilik iddiası metinde de İSTİSNASIYLA birlikte anılmalı: kısa
     açıklamada "veri toplamıyoruz" deyip istisnayı yutmak yanlış beyandır. */
  ok('gizlilik sözü istisnasıyla birlikte yazılı',
     /Tek istisna sesle takiptir/.test(mag) && /varsayılan olarak kapalıdır/.test(mag));
  ok('İngilizce metinde de istisna var', /The one exception is voice follow|one exception is voice follow/.test(mag));
}

/* ---------- MAĞAZA SINIRLARI ---------- */
{
  /* Play Store kısa açıklama 80, App Store alt başlık 30 karakter.
     Sığmayan metin başvuruda kesilir ve cümle yarım görünür. */
  const kisa = mag.match(/Telefonun önünde okurken çek\.[^`]*?göz teması\./);
  ok('TR kısa açıklama bulundu', !!kisa);
  ok('TR kısa açıklama 80 karaktere sığıyor', !!kisa && kisa[0].length <= 80);
  const kisaEn = mag.match(/Read while you record\.[^`]*?eye contact\./);
  ok('EN kısa açıklama 80 karaktere sığıyor', !!kisaEn && kisaEn[0].length <= 80);
  /* Alt başlık için sığmayan aday AÇIKÇA elenmiş olmalı — sessizce
     kısaltmak, sonra yanlış metnin gönderilmesine yol açar. */
  ok('sığmayan alt başlık adayı elendiği yazılı', /sığmıyor/.test(mag));
}

/* ---------- TEKNİK ÖLÇÜM DÜRÜST MÜ ---------- */
{
  /* En büyük engel saklanmamalı: iOS WKWebView'da SpeechRecognition yok,
     yani kabuğa alınan PWA sesle takibi KAYBEDER. Bunu yazmadan kabuk
     kurmak, ürünün en güçlü özelliğini sessizce kaybetmek olurdu. */
  ok('iOS sesle takip engeli açıkça yazılı',
     /WKWebView.{0,40}YOK|iOS.{0,60}sesle takip/i.test(tek));
  ok('üç çözüm yolu da yazılı ve karar Erdala bırakılmış',
     /Whisper/.test(tek) && /Karar Erdal/.test(tek));
  ok('yapılamayacaklar sebebiyle yazılı',
     /Sanal kamera:.{0,80}yazılamaz/.test(tek) && /Arka planda kayıt/.test(tek));
  ok('gereken izinler sayılmış',
     /NSCameraUsageDescription/.test(tek) && /RECORD_AUDIO/.test(tek));
}
