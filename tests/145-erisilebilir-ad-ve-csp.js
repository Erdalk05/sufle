const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu, macYolu, oku, REPO}=require('./kaynak.js');

/* B1 + B2 — ERİŞİLEBİLİR AD ve İÇERİK GÜVENLİK İLKESİ (2026-08-15).

   İki bulgu da GERÇEK TARAYICIDA ölçülerek çıktı, kaynağa bakarak değil —
   bu yüzden ikisini de statik denetim kaçırmıştı:

   B1 — ADSIZ KAYDIRICILAR. Ayarların dört sekmesinde 16 kaydırıcının 16'sının
        da erişilebilir adı yoktu: ekran okuyucu hepsini "kaydırıcı, %50" diye
        okuyordu. Hız, okuma çizgisi, mesafe, yazı boyutu, satır aralığı,
        kenar boşluğu, kalınlık, harf aralığı, karartma, filtre miktarı, üç
        ses işleme ayarı, altyazı kayması, hedef süre ve nefes duyarlılığı
        birbirinden AYIRT EDİLEMİYORDU. Kusur işaretlemede görünmüyordu çünkü
        etiketler zaten oradaydı — eksik olan tek şey `for` bağıydı.
        Çözüm YENİ SÖZLÜK ANAHTARI DEĞİL: mevcut, zaten çevrilmiş `<label>`
        `for` ile bağlandı. Tek kaynak korunur, dil değişince ad da değişir.
        Etiketi olmayan tek kaydırıcı (#vidAmt) ARIA sözlüğünden ad alıyor.

   B2 — CSP YOKTU. Ölçüldü: uygulamada fetch/XHR/WebSocket/EventSource/
        sendBeacon ve dış kaynak SIFIR, yani GIZLILIK.md bugün doğru. Ama
        bunu koruyan tek şey dikkatti: tek bir `fetch` satırı gizlilik
        metnini, tests/131'in 40 iddiasını ve mağaza beyanını aynı anda
        SESSİZCE yalanlardı. `connect-src` ile ihlal artık platforma takılır.

   NİYE BU TEST KAYNAĞA BAKIYOR: tarayıcı ölçümü `kontrast.py`de yaşıyor
   (kapı adımı 9) ve Chrome yoksa ATLANIYOR. Bu dosya Chrome'suz makinede de
   koşan ikinci kilittir; ikisi aynı şeyi iki farklı yerden tutuyor. */

const tel = oku(telefonYolu());
const mac = fs.readFileSync(macYolu(), 'utf8');

/* ---------- B1: HER KAYDIRICININ BİR ADI VAR ---------- */
{
  const kayd = [...tel.matchAll(/<input[^>]*type="range"[^>]*>/g)].map(m => m[0]);
  ok('telefonda kaydırıcılar bulundu (ölçüm bir şey ölçüyor)', kayd.length >= 16);

  const adsiz = [];
  for (const etiket of kayd) {
    const kid = (etiket.match(/\bid="([^"]+)"/) || [])[1];
    if (!kid) { adsiz.push('(id yok) ' + etiket.slice(0, 60)); continue; }
    const forVar = new RegExp('<label[^>]*\\bfor="' + kid + '"').test(tel);
    const ariaVar = new RegExp('<input[^>]*\\bdata-aria="[^"]+"[^>]*\\bid="' + kid + '"')
      .test(tel) ||
      new RegExp('<input[^>]*\\bid="' + kid + '"[^>]*\\bdata-aria="[^"]+"').test(tel);
    const elleAria = new RegExp('<input[^>]*\\bid="' + kid + '"[^>]*\\baria-label=').test(tel);
    if (!forVar && !ariaVar && !elleAria) adsiz.push('#' + kid);
  }
  ok('her kaydırıcının erişilebilir adı var' +
     (adsiz.length ? ' — adsız: ' + adsiz.join(', ') : ''), adsiz.length === 0);

  /* Ad tek kaynaktan gelsin: `for` ile bağlanan etiketler ÇEVRİLİ olmalı,
     yoksa İngilizce arayüzde Türkçe ad duyulur (bu deponun tekrar eden
     "dil değişince yenilenmiyor" sınıfı, üç kez yaşandı). */
  const forlar = [...tel.matchAll(/<label[^>]*\bfor="([^"]+)"[^>]*>/g)];
  ok('for ile bağlanan etiketler bulundu', forlar.length >= 15);
  const cevrilmemis = forlar.filter(m => !/data-i18n="/.test(m[0])).map(m => m[1]);
  ok('for ile bağlanan her etiket çevrili (data-i18n taşıyor)' +
     (cevrilmemis.length ? ' — eksik: ' + cevrilmemis.join(', ') : ''),
     cevrilmemis.length === 0);

  /* Etiketsiz tek kaydırıcı ARIA sözlüğünden besleniyor ve TR/EN paritesi
     korunuyor — tek dilde eklenen anahtar sessizce boş ad üretir. */
  ok('#vidAmt data-aria ile bağlı', /data-aria="vidAmt"/.test(tel));
  ok('vidAmt ARIA anahtarı TR ve EN dilinde birden var',
     /vidAmt:'Filtre miktarı'/.test(tel) && /vidAmt:'Filter amount'/.test(tel));
}

/* ---------- B1-MAC: PARİTE — AYNI KUSUR MAC'TE DE VARDI ---------- */
{
  /* CLAUDE.md'nin 5. teşhis kuralı: iki platformu karşılaştır. Telefondaki
     24 kaydırıcı adlandırılırken Mac'in 15'i de ölçüldü ve 15'i de adsızdı.
     Telefonu düzeltip Mac'i bırakmak "yarım özellik" olurdu — bu deponun
     1 numaralı hata sınıfı. Mac'te üç ayrı biçim çıktı ve üçü de ayrı
     çözüldü: düz etiket (`for`), `<span>` etiketi (`aria-labelledby`,
     CSS'e dokunmamak için) ve yüzen pencerede üretilen id'siz kaydırıcı
     (`aria-label`). */
  const kayd = [...mac.matchAll(/<input[^>]*type="range"[^>]*>/g)].map(m => m[0]);
  ok('Mac kaydırıcıları bulundu (ölçüm bir şey ölçüyor)', kayd.length >= 15);
  const adsiz = [];
  for (const etiket of kayd) {
    const kid = (etiket.match(/\bid="([^"]+)"/) || [])[1];
    if (/aria-label(?:ledby)?="/.test(etiket)) continue;
    if (!kid) { adsiz.push('(id yok)'); continue; }
    if (!new RegExp('<label[^>]*\\bfor="' + kid + '"').test(mac)) adsiz.push('#' + kid);
  }
  ok('Mac: her kaydırıcının erişilebilir adı var' +
     (adsiz.length ? ' — adsız: ' + adsiz.join(', ') : ''), adsiz.length === 0);
  /* aria-labelledby hedefi GERÇEKTEN var olmalı: olmayan id'ye işaret eden
     bağ, ekran okuyucuda adsızdan farksızdır ama işaretlemede doğru görünür. */
  for (const m of mac.matchAll(/aria-labelledby="([^"]+)"/g)) {
    ok('Mac: aria-labelledby hedefi var (' + m[1] + ')',
       new RegExp('id="' + m[1] + '"').test(mac));
  }
}

/* ---------- B1b: DİL DEĞİŞİNCE ÇALIŞMA ZAMANI ÇIKTILARI TAZELENİYOR ---------- */
{
  /* Aynı sınıfın üçüncü ve dördüncü vakası: bir kez çizilen kutular dil
     değişince eski dilde kalıyordu. `#result` T49'da kapatılmıştı; ışık
     denetçisi ve konuşulabilirlik denetimi 2026-08-15'te kapıya ayar
     sekmeleri eklenince yakalandı. */
  /* ÇIKARIM SÜSLÜ PARANTEZ SAYARAK: regex deseni fonksiyonun İÇİNDEKİ ilk
     kapanışa takılıp yarım kod çıkarıyordu ve iddia kodun kusurunu değil
     kendi eksikliğini bildiriyordu (bu gece üçüncü vakası). */
  const govde = require('./kaynak').blokKes(tel, 'function applyLang()');
  const al = govde ? [govde] : null;
  ok('applyLang bulundu', !!al);
  if (al) {
    ok('dil değişince ışık denetçisi çıktısı yenileniyor',
       /#lightOut[\s\S]{0,80}renderLight\(\)/.test(al[0]));
    ok('dil değişince konuşulabilirlik denetimi yenileniyor',
       /#checkOut[\s\S]{0,80}renderCheck\(\)/.test(al[0]));
    ok('yenileme yalnız DOLU kutuda çalışıyor (kapalı denetimi açmıyor)',
       /#lightOut'\)\.innerHTML\.trim\(\)/.test(al[0]));
  }
}

/* ---------- B2: İÇERİK GÜVENLİK İLKESİ ---------- */
function csp(kaynak) {
  const m = kaynak.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  return m ? m[1] : null;
}
{
  const t = csp(tel), k = csp(mac);
  ok('telefonda CSP var', !!t);
  ok('Mac kabuğunda CSP var', !!k);

  if (t) {
    /* ASIL İDDİA: ağ çıkışı yasak. Gizlilik vaadinin tek kilidi budur. */
    ok('telefon: connect-src none — hiçbir ağ isteği çıkamaz',
       /connect-src 'none'/.test(t));
    ok('telefon: default-src self — dış kaynak yasak', /default-src 'self'/.test(t));
    ok('telefon: object-src none', /object-src 'none'/.test(t));
    ok('telefon: base-uri none (temel adres kaçırılamaz)', /base-uri 'none'/.test(t));
    ok('telefon: form-action none (form ile veri gönderilemez)',
       /form-action 'none'/.test(t));
    /* Kayıt ve önizleme blob: URL kullanıyor; unutulursa video oynatılamaz. */
    ok('telefon: blob medyaya izinli (kayıt önizlemesi çalışsın)',
       /media-src[^;]*blob:/.test(t));
    ok('telefon: blob/data görsele izinli', /img-src[^;]*blob:/.test(t) &&
       /img-src[^;]*data:/.test(t));
  }
  if (k) {
    /* MAC FARKI ÖLÇÜLDÜ: kumanda sunucusu aynı kökenden konuşuyor
       (/events, /info, /preview, /qr). 'none' yazmak kumandayı SESSİZCE
       öldürürdü — bu dosyada kumandanın sessizce ölmesi iki kez yaşandı. */
    ok('Mac: connect-src self — kumanda sunucusu çalışsın',
       /connect-src 'self'/.test(k));
    ok('Mac: dış kökene bağlanamaz (self dışında kaynak yok)',
       !/connect-src[^;]*https?:\/\//.test(k));
  }

  /* CSP'nin ilan ettiği şey GERÇEKTEN doğru olsun: kod dışarı çağrı
     yapmıyorsa vaat tutulur. Bu iddia tests/131'in gizlilik iddialarıyla
     aynı yöne bakıyor ama farklı yerden tutuyor: orada BELGE, burada KOD. */
  const telJs = (tel.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || []).join('');
  ok('telefonda fetch/XHR/WebSocket/EventSource/sendBeacon yok (CSP boşuna değil)',
     !/\bfetch\(|XMLHttpRequest|new WebSocket|new EventSource|sendBeacon/.test(telJs));
  ok('telefonda dış kaynak (http adresi) yok',
     !/(src|href)="https?:\/\/(?!erdalk05\.github\.io)/.test(tel));
}

/* ---------- KAPI KENDİSİ SİLAHLI MI ---------- */
{
  /* tests/113'ün dersi: kapı adımının VAR OLMASI yetmez, kuralı da durmalı.
     Adsız öge kuralı tabana bağlanırsa biri tabanı yükseltip kusuru
     kalıcılaştırabilir — bu yüzden mutlak (0) olmalı. */
  /* BOZMA TURU GEÇİCİ KOPYAYI YAZAR — testi ORAYA baktır. Depo dosyasını
     okuyan bir test, bozma inse bile geçer ve "ayırt ediyor" yalanını üretir
     (`SUFLE_PROVA` ile bir kez yaşandı, belgede yazılı). */
  const kon = fs.readFileSync(process.env.SUFLE_KONTRAST ||
                              path.join(REPO, 'kontrast.py'), 'utf8');
  ok('kontrast.py adsız öge ölçüyor', /adsiz\.push/.test(kon));
  ok('adsız öge kuralı MUTLAK (taban karşılaştırması değil)',
     /if adsiz:\s*\n\s*print\([\s\S]{0,200}kirmizi = True/.test(kon));
  /* DESEN TIRNAKLA KAPANSIN. İlk hâli çıplak `telefon-gorunum` arıyordu ve
     bozma turu bunu yakaladı: durumu `telefon-gorunumX` diye yeniden
     adlandırmak ölçümü kapatıyor ama desen hâlâ eşleşiyordu (CLAUDE.md'deki
     "gevşek desen" tuzağı). Aranan şey artık durum listesindeki tam ad. */
  ok('ayarların üç sekmesi de ölçülüyor',
     /'telefon-gorunum',/.test(kon) && /'telefon-kamera',/.test(kon) &&
     /'telefon-diger',/.test(kon));
  ok('dil adı muafiyeti METNE bağlı, yola değil (gerçek kusur gizlenmesin)',
     /DIL_ADI = \{'Türkçe'\}/.test(kon) && /v not in DIL_ADI/.test(kon));
}
