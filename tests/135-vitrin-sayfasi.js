const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu, oku, REPO, repoOku}=require('./kaynak.js');

/* F.6 — VİTRİN SAYFASI (tanitim.html).

   NEDEN AYRI SAYFA: uygulamanın kendi <head>'i (tests/133) arama sonucunda
   görünen sözleri taşıyor, ama uygulamanın İÇİNE uzun tanıtım metni koymak
   tek dosyayı şişirir ve açılışı yavaşlatır. Vitrin o metnin yeri.

   ⚠️ BU DOSYANIN ASIL İŞİ, MAĞAZA METNİNDEKİYLE AYNI: ABARTMAYI ENGELLEMEK.
   Vitrin sayfası kullanıcının uygulamayı açmadan ÖNCE okuduğu sözlerdir.
   Tutulmayan söz, indirip ilk dakikada kapatan kullanıcı demektir. Bu yüzden
   sayfadaki her somut söz KODDAKİ karşılığına bağlanıyor.

   İkinci iş: sayfanın kendi gizlilik iddiasını tutması. Sayfa "üçüncü taraf
   kütüphane 0" diyor; bunu derken CDN'den yazı tipi çekiyor olsaydı kendi
   cümlesini yalanlardı. */

/* AÇIKÇA VERİLEN YOL YANLIŞSA SESSİZCE DEPOYA DÜŞME — bozma turu hiçbir şey
   ölçmeden "geçti" derdi. kaynak.js'teki aynı disiplin. */
const acik = process.env.SUFLE_VITRIN;
if (acik && !fs.existsSync(acik))
  throw new Error('Verilen vitrin yolu yok: ' + acik + ' — bozma turu HİÇBİR ŞEY ölçmez.');
const YOL = acik || path.join(REPO, 'tanitim.html');
ok('vitrin sayfası depoda', fs.existsSync(YOL));
if (!fs.existsSync(YOL)) { process.exit(1); }

const v = fs.readFileSync(YOL, 'utf8');
const tel = oku(telefonYolu());
/* Yorumlar kullanıcıya GÖRÜNMEZ: iddialar yalnız gerçek içerikte aransın.
   tests/121'de aynı tuzağa düşmüştüm — yorumdaki bir örnek kırmızı vermişti. */
const temiz = v.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

/* ---------- SÖZLER KODDA KARŞILANIYOR MU ---------- */
{
  /* Sol taraf sayfada GEÇEN söz, sağ taraf uygulamada onu var eden şey.
     Biri kaldırılırsa sayfa yalan söylemeye başlar ve kapı önce kırılır. */
  const SOZ = {
    'Sesle takip': /SpeechRecognition/,
    'dakikadaki kelime': /wpm/i,
    'Kamera ve mikrofon uygulamanın içinde': /MediaRecorder/,
    'Reels, Shorts, Story ve YouTube oranları': /reels:.*shorts:|shorts:/s,
    'disleksi yazı tipi': /data-fam=.?dys|dyslex/i,
    'Yüksek kontrast': /hicon/,
    'baştan ve sondan kesebilir': /trimA|openTrim/,
    'altyazı dosyasını senaryodan': /srt/i,
    'Word dosyası \\(\\.docx\\)': /docxMetni/,
    'tek dosyaya yedekleyip': /bkExport|yedekDosyaya/,
    'çevrimdışı da çalışır': /serviceWorker/,
  };
  for (const soz in SOZ) {
    ok('vitrindeki söz sayfada geçiyor: ' + soz, new RegExp(soz).test(temiz));
    ok('vitrindeki söz kodda karşılanıyor: ' + soz, SOZ[soz].test(tel));
  }
}

/* ---------- MASAÜSTÜ SÖZLERİ MAC KABUĞUNDA KARŞILANIYOR MU ---------- */
{
  const {macYolu} = require('./kaynak.js');
  const mac = oku(macYolu());
  const MAC_SOZ = {
    'Harici kamera seçimi': /setupCams/,
    'uzaktan kumanda': /remote|kumanda/i,
    'yayın kipi': /obs/i,
  };
  for (const soz in MAC_SOZ) {
    ok('masaüstü sözü sayfada geçiyor: ' + soz, new RegExp(soz).test(temiz));
    ok('masaüstü sözü Mac kabuğunda karşılanıyor: ' + soz, MAC_SOZ[soz].test(mac));
  }
}

/* ---------- ABARTMA ---------- */
{
  /* Ölçülüp ELENENLER (D.5, MAGAZA_TEKNIK.md): sanal kamera tarayıcıdan
     yazılamaz, PDF okunmuyor, bulut yok, yapay zekâ yok. */
  ok('sanal kamera vaat edilmiyor', !/sanal kamera|virtual camera/i.test(temiz));
  ok('PDF vaat edilmiyor', !/PDF/i.test(temiz));
  ok('bulut vaat edilmiyor', !/bulut senkron|cloud sync/i.test(temiz));
  ok('yapay zekâ vaat edilmiyor', !/yapay zekâ|\bAI\b/i.test(temiz));

  /* "Ücretsiz" üç yerde yazıyor (başlık, açıklama, JSON-LD). Ödeme duvarı
     eklenirse üçü birden yalan söyler. */
  const odeme = /paywall|abonelik|subscription|satın al|in-app purchase/i.test(
    tel.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, ''));
  ok('kodda ödeme duvarı yok (ücretsiz sözü doğru)', !odeme);
  ok('vitrin JSON-LD fiyatı 0', /"price":"0"/.test(v));
}

/* ---------- GİZLİLİK İDDİASI SAYFANIN KENDİSİ İÇİN DE GEÇERLİ ---------- */
{
  /* Sayfa "üçüncü taraf kütüphane 0" diyor. Dışarıdan yüklenen TEK kaynak
     bile bu cümleyi yalanlar. Ölçüt YÜKLENEN kaynak: canonical, og:image ve
     twitter:image üstveri işaretçisidir, tarayıcı onları indirmez. */
  const disSrc = [...v.matchAll(/\bsrc\s*=\s*["']https?:\/\/[^"']+/gi)];
  const disLink = [...v.matchAll(/<link\b[^>]*>/gi)].filter(m =>
    /href\s*=\s*["']https?:\/\//i.test(m[0]) &&
    /rel\s*=\s*["'](?:stylesheet|preload|prefetch|icon|apple-touch-icon|manifest)/i.test(m[0]));
  ok('vitrin dışarıdan kaynak YÜKLEMİYOR — bulunan: ' + (disSrc.length + disLink.length),
     disSrc.length + disLink.length === 0);
  ok('@import ile dış stil de yok', !/@import\s+url\(\s*["']?https?:/i.test(v));

  /* İstisna saklanmasın: gizliliği satış argümanı yapan sayfa, sesle takibin
     cihazdan çıktığını AÇIKÇA yazmalı. Saklamak yanlış beyandır. */
  /* İDDİA, KULLANICININ OKUDUĞU METNE bağlı. İşaretlemedeki kopyayı aramak
     YETMİYOR: sayfa yüklenince dil() sözlükten innerHTML yazıyor, yani
     işaretlemedeki metin bir kez bile görünmüyor. Bozma turunda tam bu
     çıktı — işaretlemeyi bozdum, test geçti, çünkü sözlük hâlâ doğruyu
     söylüyordu (ve kullanıcı da doğruyu görüyordu). Sözlükte aranıyor. */
  const soz = v.slice(v.indexOf('const S={'));
  ok('vitrin sözlüğü ayrılabildi (ölçmeyen kapı değil)', soz.length > 3000);
  ok('sesle takip istisnası İKİ DİLDE de sözlükte yazılı',
     /Tek istisna: sesle takip/.test(soz) && /ses tanıma servisine/.test(soz));
  ok('istisnanın varsayılan KAPALI olduğu yazılı', /varsayılan olarak kapalıdır/.test(temiz));
  ok('İngilizce metinde de istisna var', /one exception: voice follow/i.test(v));
}

/* ---------- İKİ DİL ---------- */
{
  /* Uygulama iki dilli; vitrin tek dilde kalsaydı İngilizce arayan biri
     ürünün İngilizce konuştuğunu hiç öğrenemezdi. */
  const anahtarlar = [...v.matchAll(/^\s([a-zA-Z0-9]+):\[/gm)].map(m => m[1]);
  ok('vitrin sözlüğü okunabildi (ölçmeyen kapı değil) — ' + anahtarlar.length,
     anahtarlar.length >= 20);
  /* HER anahtarın işaretlemede karşılığı olmalı: sözlükte durup hiçbir yere
     yazılmayan metin ölü çeviridir (bu depoda üç kez oldu). */
  const olu = anahtarlar.filter(k => !new RegExp('data-i="' + k + '"').test(v));
  ok('sözlükte ölü anahtar yok — ' + olu.join(','), olu.length === 0);
  /* Ve tersi: işaretlemedeki her data-i sözlükte OLMALI, yoksa dil
     değişince o metin Türkçe kalır. */
  /* YALNIZ İŞARETLEMEDE ara. Bütün dosyada arayınca betikteki
     `'[data-i="'+anahtar+'"]'` seçicisi de eşleşti ve test "'+anahtar+'
     çevirisi yok" diye GERÇEK OLMAYAN bir hata verdi. Bu depoda aynı tuzağa
     tests/106 ve 107'de de düşülmüştü: gövdeyi ilk betiğe kadar kes. */
  const isaret = v.slice(v.indexOf('<body'), v.indexOf('<script', v.indexOf('<body')));
  ok('işaretleme bölümü ayrılabildi (ölçmeyen kapı değil)', isaret.length > 2000);
  const kullanilan = [...new Set([...isaret.matchAll(/data-i="([^"]+)"/g)].map(m => m[1]))];
  const eksik = kullanilan.filter(k => !anahtarlar.includes(k));
  ok('çevirisi olmayan işaretleme yok — ' + eksik.join(','), eksik.length === 0);

  ok('dil düğmeleri var', /id="tr"/.test(v) && /id="en"/.test(v));
  ok('başlık da çevriliyor (sekme ve arama sonucu)', /document\.title\s*=\s*BASLIK/.test(v));
  ok('html lang dille birlikte değişiyor', /document\.documentElement\.lang\s*=\s*k/.test(v));
}

/* ---------- GÖRSELLER GERÇEKTEN VAR MI ---------- */
{
  /* Olmayan dosyaya işaret eden <img> kırık simge gösterir. Taslak kareler
     .gitignore'da; vitrin YALNIZ mağazaya hazır olanları kullanmalı. */
  const gorseller = [...v.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => m[1]);
  ok('vitrinde görsel var', gorseller.length > 0);
  for (const g of gorseller) {
    ok('görsel dosyası gerçekten var: ' + g, fs.existsSync(path.join(REPO, g)));
    ok('taslak kare vitrine konmamış: ' + g, !/\.taslak\./.test(g));
    /* alt metni olmayan görsel ekran okuyucuda hiçbir şey söylemez. */
  }
  const altsiz = [...v.matchAll(/<img(?![^>]*\balt=)[^>]*>/g)];
  ok('her görselin alt metni var — altsız: ' + altsiz.length, altsiz.length === 0);
}

/* ---------- UYGULAMAYA GÖTÜRÜYOR MU ---------- */
{
  /* Vitrin sayfasının tek işi kullanıcıyı uygulamaya götürmek. Bağlantı
     kırılırsa sayfa güzel ama işlevsiz bir broşür olur. */
  ok('uygulamaya bağlantı var', /href="\.\/index\.html"/.test(v));
  ok('gizlilik belgesine bağlantı var', /href="\.\/GIZLILIK\.md"/.test(v));
  ok('bağlantı hedefi gerçekten var', fs.existsSync(path.join(REPO, 'index.html')) &&
     fs.existsSync(process.env.SUFLE_GIZLILIK || path.join(REPO, 'GIZLILIK.md')));
  ok('canonical vitrin adresini gösteriyor',
     /<link rel="canonical" href="https:\/\/erdalk05\.github\.io\/sufle\/tanitim\.html">/.test(v));
}

/* ---------- JETONLAR TEK KAYNAKTAN ---------- */
{
  /* Renkler elle yazılırsa tanıtım ile ürün zamanla ayrışır ve kimse fark
     etmez. Vitrin de derle.py ile aynı jetonları gömüyor. */
  ok('jeton bloğu gömülü', /==CEKIRDEK:jetonlar\.css==/.test(v));
  ok('renkler jetondan okunuyor', /var\(--r-action\)/.test(v) && /var\(--s-bg\)/.test(v));
  const jeton = repoOku('cekirdek/jetonlar.css','SUFLE_JETON');
  const cek = /--r-action:(#[0-9A-Fa-f]{6})/;
  ok('gömülü jeton kaynakla aynı (bayat kopya değil)',
     (jeton.match(cek) || [])[1] === (v.match(cek) || [])[1]);
}

/* ---------- VİTRİNE GİDEN YOL VAR MI ---------- */
{
  /* Hiçbir yerden bağlantı almayan sayfa ÖLÜ SAYFADIR — bu deponun 1
     numaralı hata sınıfı. Arama motoru da içeriden bağlantı almayan bir
     sayfayı geç bulur. Uygulamanın gizlilik özetinden vitrine bir kapı
     açıldı; iki dilde de olmalı, yoksa İngilizce kullanıcı kapıyı görmez. */
  ok('uygulamadan vitrine bağlantı var', /href="tanitim\.html"/.test(tel));
  const bag = (tel.match(/href="tanitim\.html"/g) || []).length;
  ok('bağlantı iki dilde de var (bulunan ' + bag + ')', bag >= 2);
  /* target=_blank + rel=noopener: yeni sekmede açılan sayfa opener üstünden
     uygulamaya erişebilir; sufle çalışırken bu istenmez. */
  ok('yeni sekme bağlantısı noopener taşıyor',
     !/href="tanitim\.html"[^>]*target="_blank"(?![^>]*rel="noopener")/.test(tel));
}
