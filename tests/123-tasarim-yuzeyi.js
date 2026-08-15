const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, macYolu, oku}=require('./kaynak.js');

/* B.1 başlangıcı — JETONLAR ARTIK KULLANIMDA + sayısal göstergeler sabit.

   ÖLÇÜLEN GERÇEK (2026-08-14, Chrome headless, görünürlük hesaplı):
     telefon ilk açılış:  5 kontrol (TR·EN·kameralı·kamerasız·yardım)
     telefon ana ekran :  9 kontrol (hız −/+ · ayarlar · senaryolar ·
                          hazır · kayıt · ses · oynat · not kapat)
   Yani rakip analizindeki "ilk açılışta 40+ kontrol karşılıyor" iddiası
   TELEFON İÇİN YANLIŞTI — o sayı Mac'in sağ paneline ait. B.3'ün gerçek
   hedefi Mac; telefonun sadeliği ise BOZULMAMASI gereken bir varlık.
   Bu test o varlığı biçim düzeyinde korur (öge sayısı tarayıcı işi,
   ama intro'daki kontrol KİMLİKLERİ işaretlemede sayılabilir). */

const tel = oku(telefonYolu());
const mac = oku(macYolu());
const kodTel = (tel.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];
const cikarKod = (re, ad) => { const m = kodTel.match(re);
  if (!m) { ok('kaynaktan çıkarılabildi: ' + ad, false); return ''; } return m[0]; };

/* ---------- 1. JETONLAR GERÇEKTEN KULLANILIYOR ---------- */
{
  /* --accent artık rol jetonuna bağlı. Değeri kopyalamak DEĞİL bağlamak
     gerekiyor: kopya, jeton güncellenince sessizce ayrışır. */
  ok('telefon: --accent rol jetonuna bağlı',
     /--accent:var\(--r-action\)/.test(tel));
  ok('telefon: --accent-d karşı renk jetonuna bağlı',
     /--accent-d:var\(--on-action\)/.test(tel));
  ok('Mac: --accent rol jetonuna bağlı',
     /--accent:var\(--r-action\)/.test(mac));
  /* Eski sabit değer kural olarak kalmamalı (yorum/canvas hariç).
     ':' öneki CSS değerini yakalar, yorumdaki düz metni yakalamaz. */
  /* Yorumlar ve canvas çizimi sayılmaz: jeton dosyasının kendi açıklaması
     eski değeri tarihçe olarak ANLATIYOR, kural olarak kullanmıyor. İlk
     yazımda yorumları ayıklamadım ve test kendi açıklamasına takıldı. */
  const cssTemiz = tel.replace(/\/\*[\s\S]*?\*\//g, '').replace(/g\.addColorStop[^\n]*/g, '');
  ok('telefon: sabit #00C853 CSS değeri kalmadı', !/:#00C853/i.test(cssTemiz));
}

/* ---------- 2. SAYISAL GÖSTERGELER ZIPLAMAZ ---------- */
{
  /* tabular-nums: süre/WPM her saniye değişirken genişlik sabit kalır.
     Sayaç zıplaması, "amatör ürün" algısının küçük ama sürekli kaynağı. */
  for (const id of ['hEl','recTime','railV','spVal','count']) {
    const m = tel.match(new RegExp('<[^>]*id="' + id + '"[^>]*>'));
    ok('telefon #' + id + ' tabular-nums taşıyor', !!m && /class="[^"]*tnum/.test(m[0]));
  }
  for (const id of ['clock','wc','sbWpm']) {
    const m = mac.match(new RegExp('<[^>]*id="' + id + '"[^>]*>'));
    ok('Mac #' + id + ' tabular-nums taşıyor', !!m && /class="[^"]*tnum/.test(m[0]));
  }
  /* Kuralın kendisi jeton dosyasından geliyor — iki kabukta da gömülü olmalı. */
  ok('tnum kuralı iki kabukta da gömülü',
     /\.tnum[^{]*\{[^}]*tabular-nums/.test(tel) && /\.tnum[^{]*\{[^}]*tabular-nums/.test(mac));
}

/* ---------- 3. TELEFONUN SADELİĞİ KORUNUYOR ---------- */
{
  /* İlk açılış yüzeyi: intro'da yalnız bu kontroller var. Yeni bir düğme
     eklemek isteyen önce buraya gelsin ve gerekçesini yazsın — sadelik
     kazara değil kararla bozulur. Ölçülen: 5 kontrol. */
  /* intro'nun sınırı: kendi kapanışına kadar (langSwitch iç div'i tek
     satırda açılıp kapanıyor, o yüzden ilk satır-başı </div> güvenli).
     İlk yazımda "hud'a kadar" demiştim; hud intro'dan ÖNCE duruyor ve
     desen hiç eşleşmedi — 0 düğme sayıp yanlış yere kırmızı bastı. */
  const intro = (tel.match(/<div id="intro">[\s\S]*?\n<\/div>/) || [''])[0];
  ok('intro bölümü bulunabildi', intro.length > 100);
  const dugmeler = [...intro.matchAll(/<button\b[^>]*>/g)];
  ok('ilk açılışta en fazla 6 düğme (ölçülen 5 + pay 1) — şimdi: ' + dugmeler.length,
     dugmeler.length > 0 && dugmeler.length <= 6);
}

/* ---------- 4. MAC SAĞ PANELİ ÜÇ SEKME (B.3) ---------- */
{
  /* Ölçülen dert: 53 kontrol aynı anda görünüyordu — "hepsi eşit önemde"
     demek hiçbiri önemli değil demek. Telefonun üç katmanı Mac'e taşındı.
     Tarayıcıda doğrulandı: Okuma sekmesindeyken Çekim'in 27 kontrolü DOM
     akışından çıkıyor (display:none), sekme seçimi yeniden yüklemede
     korunuyor (state.rtab). */
  ok('Mac: sekme çubuğu var (rtabs)', /<div id="rtabs" role="tablist">/.test(mac));
  const gruplar = [...mac.matchAll(/<div class="ctrl"[^>]*data-rtab="(read|cam|look)"/g)];
  ok('Mac: 4 grubun 4\'ü de sekmeye atanmış — bulunan: ' + gruplar.length, gruplar.length === 4);
  /* Atamasız grup sekme değişince HEP görünür kalır ve sekme yapısı
     sessizce anlamsızlaşır — o yüzden atama sayısı da kilitli. */
  const atamasiz = (mac.match(/<div class="ctrl"(?![^>]*data-rtab)/g) || []).length;
  ok('Mac: sekmesiz .ctrl grubu yok — bulunan: ' + atamasiz, atamasiz === 0);
  const kod = (mac.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];
  ok('Mac: applyRtab tanımlı VE çağrılıyor',
     /function applyRtab\(\)\{/.test(kod) && /^\s*applyRtab\(\);/m.test(kod));
  ok('Mac: sekme seçimi kaydediliyor (state.rtab + save)',
     /state\.rtab=b\.dataset\.rtab; save\(\);/.test(kod));
  /* Eski kayıtta rtab alanı yok — açık değer kontrolü şart. */
  ok('Mac: rtab eski kayıtlara dayanıklı okunuyor',
     /state\.rtab==='cam'\|\|state\.rtab==='look'/.test(kod));
  ok('Mac: sekme dışı grup akıştan çıkıyor (display:none)',
     /#right \.ctrl\.sekmeDisi\{display:none\}/.test(mac));
  ok('Mac: .seg stili artık tanımlı (dil düğmesi çıplak kalmasın)',
     /\.seg\{display:inline-flex/.test(mac));
}

/* ---------- 5. KROM İKONLARI SVG (B.2) ---------- */
{
  /* Renkli emoji her platformda başka çizilir ve koyu arayüzle uyumsuzdur —
     analizde "amatör algısının yarısı" diye ölçülen kalem. Krom düğmeleri
     stroke SVG'ye geçti; tarayıcıda doğrulandı (4/4 çizim, 22×22).
     KAPSAM BİLEREK DAR: yalnız statik krom düğmeleri. playBtn/pauseBtn
     çalışma zamanında yazılıyor (▶︎/⏸ zaten tek renk sembol), sözlükteki
     emoji önekleri ise İÇERİK — onlara dokunmak i18n birebirlik iddialarını
     kırardı. Genişletme ayrı karar. */
  ok('telefon: ikon tanımları gömülü', /<!-- ==CEKIRDEK:ikonlar\.html== -->/.test(tel));
  for (const [id, ikon] of [['settingsBtn','i-ayarlar'],['scriptsBtn','i-senaryo'],
                            ['readyBtn','i-hazir'],['voiceBtn','i-mikrofon']]) {
    const m = tel.match(new RegExp('<button[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)</button>'));
    ok('telefon #' + id + ' SVG ikon kullanıyor (' + ikon + ')',
       !!m && m[1].includes('href="#' + ikon + '"'));
    /* İkona geçerken ad kaybolmasın: SVG aria-hidden, düğme aria-label'lı. */
    const ac = tel.match(new RegExp('<button[^>]*id="' + id + '"[^>]*>'));
    ok('telefon #' + id + ' erişilebilir adını koruyor', !!ac && /aria-label="[^"]{3,}"/.test(ac[0]));
  }
  for (const ikon of ['i-ayarlar','i-senaryo','i-hazir','i-mikrofon']) {
    ok('sembol tanımlı: ' + ikon, new RegExp('<symbol id="' + ikon + '"').test(tel));
  }
}

/* ---------- 6. DURUM SATIRI: HANGİ MODDAYIM (B.5) ---------- */
{
  /* Kullanıcı hangi modda olduğunu DENEYEREK anlıyordu. Üç mod birbirini
     dışlar; sıra ses > otomatik > elle, çünkü sesle takip açıkken zamanlı
     akış zaten durduruluyor. Tarayıcıda doğrulandı: Elle -> Otomatik geçişi
     ve rol sınıfı ('a') uygulanıyor.

     DİL DE YAZILIYOR ve bu kasıtlı: sesle takip YANLIŞ dilde açıksa hiçbir
     kelime eşleşmez, sufle durur ve kullanıcı sebebini göremez. Sessiz
     kusurun en pahalısı buydu. */
  ok('telefon: mod rozeti HUD içinde', /<div id="hud"><span id="hMode">/.test(tel));
  const uh = cikarKod(/function updateHud\(\)\{[\s\S]*?\n\}/, 'updateHud');
  ok('rozet üç modu da ayırıyor',
     /t\('modeVoice'\)/.test(uh) && /t\('modeAuto'\)/.test(uh) && /t\('modeManual'\)/.test(uh));
  ok('sesle takipte DİL de yazıyor', /st\.voiceLang\|\|'tr-TR'/.test(uh));
  ok('öncelik sırası ses > otomatik > elle',
     uh.indexOf('voiceOn') >= 0 && uh.indexOf('voiceOn') < uh.indexOf('else if(running)'));

  /* rAF TUZAĞI: mod değişince rozet SENKRON güncellenmeli. rAF'a bırakılırsa
     arka plan sekmesinde hiç koşmaz ve rozet bir önceki modu gösterir —
     bu tur ilk denemede tam buna düşüldü. */
  const st_ = cikarKod(/function start\(\)\{[\s\S]*?raf=requestAnimationFrame\(tick\);\n\}/, 'start');
  ok('start() rozeti rAF öncesi SENKRON günceller',
     st_.indexOf('updateHud();') >= 0 && st_.indexOf('updateHud();') < st_.indexOf('requestAnimationFrame'));
  ok('stop() de senkron günceller', /measureTempo\(\); rememberPos\(\); \}/.test(kodTel) &&
     /updateHud\(\);\s*\/\/ bkz\. start/.test(kodTel));
  /* Tazeleme ARAYÜZ katmanında olmalı, stopVoice/startVoice'un İÇİNDE değil:
     o iki fonksiyon tests/36'da kaynaktan çıkarılıp YALITILMIŞ koşturuluyor ve
     içlerine arayüz global'i koyunca 6 iddia birden düştü. Mantık katmanı
     arayüz global'ine bağlanmasın. */
  ok('ses düğmesi rozeti tazeliyor (arayüz katmanı)',
     /voiceOn\?stopVoice\(\):startVoice\(\); updateHud\(\);/.test(kodTel));
  ok('stopVoice arayüz global\'ine bağlı DEĞİL (yalıtım korunuyor)',
     !/function stopVoice\(\)\{[^}]*updateHud/.test(kodTel));
}
