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
  /* YORUM DÜĞME DEĞİLDİR (2026-08-17 ölçüldü). Sayım ham HTML üzerinde
     yapılıyordu ve bir açıklama yorumunun içinde geçen `<button>` kelimesi
     yedinci düğme olarak sayıldı — ekranda hiçbir şey değişmemişken kapı
     kırmızı verdi. Kuralın kendisi doğru; ölçtüğü metin yanlıştı. Kullanıcı
     yorumu görmez, o yüzden sayımdan da çıkıyor. */
  const introHam = (tel.match(/<div id="intro">[\s\S]*?\n<\/div>/) || [''])[0];
  const intro = introHam.replace(/<!--[\s\S]*?-->/g, '');
  ok('intro bölümü bulunabildi', intro.length > 100);
  const dugmeler = [...intro.matchAll(/<button\b[^>]*>/g)];
  /* KURAL YENİDEN İFADE EDİLDİ (v9.47) — GEVŞETİLMEDİ.
     Eski hâli "toplam en fazla 6 düğme" diyordu ve gerekçesi şuydu: giriş
     ekranı TEK KARAR sorsun. 20 Ağustos'ta Erdal ölçtürdü ki v9.34 ile
     v9.46'nın giriş ekranı piksel piksel aynıydı; ekran sade değil, BOŞTU.
     Senaryo listesi eklendi ve toplam sayı 7'ye çıktı.

     Sayıyı 7'ye yükseltmek kuralı anlamsızlaştırırdı (bir dahaki sefere 8).
     Ölçülen şey artık RAKİP EYLEM sayısı: dil seçici bir eylem değil (aynı
     ekranın iki dili), liste satırları eylem değil (hangi metni okuyacağını
     SEÇİYORSUN), alttaki metin bağlantıları da eylem değil. Karar hâlâ tek:
     kamerayla mı, kamerasız mı.

     İkinci sınır de kondu: ekran sınırsız büyüyemesin diye TOPLAM denetim
     tavanı. Liste satırları JS ile üretildiği için ayrıca `tests/207`de
     sayıyla kilitli (en çok 4 senaryo + 3 çekim). */
  const rakipEylem = dugmeler.filter(d => /class="[^"]*\b(big|ghostbig)\b/.test(d[0]));
  ok('giriş ekranı TEK KARAR soruyor (asıl eylem sayısı ' + rakipEylem.length + ' ≤ 2)',
     rakipEylem.length >= 1 && rakipEylem.length <= 2);
  ok('giriş ekranı sınırsız büyümüyor (toplam denetim ' + dugmeler.length + ' ≤ 8)',
     dugmeler.length > 0 && dugmeler.length <= 8);
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

  /* ---- MAC PARİTESİ (B.2 kalanı, Tur 41) ---- */
  /* Aynı 4 ikon Mac'te de. Emoji her platformda başka çiziliyor; tek dosyadan
     gelen SVG iki kabuğu da aynı gösteriyor. */
  ok('Mac: ikon tanımları gömülü', /<!-- ==CEKIRDEK:ikonlar\.html== -->/.test(mac));
  for (const [id, ikon] of [['leftToggle','i-senaryo'],['rightToggle','i-ayarlar'],
                            ['readyBtn','i-hazir'],['voiceBtn','i-mikrofon']]) {
    const m = mac.match(new RegExp('<button[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)</button>'));
    ok('Mac #' + id + ' SVG ikon kullanıyor (' + ikon + ')',
       !!m && m[1].includes('href="#' + ikon + '"'));
  }

  /* İKONU SİLEN İKİ TUZAK — ikisi de ölçülerek bulundu:
     ① `data-i18n` DÜĞMENİN ÜSTÜNDE olursa applyLang textContent yazıp SVG'yi
        siler; dil değiştiren kullanıcı ikonu bir daha göremez. İç span'a
        taşındı.
     ② `#voiceBtn` etiketi çalışma zamanında yazılıyordu; düğmenin kendisine
        yazmak ikonu siler. Ayrı bir `#voiceLbl` span'ına yazılıyor. */
  const ready = mac.match(/<button[^>]*id="readyBtn"[^>]*>/);
  ok('Mac #readyBtn üstünde data-i18n YOK (ikonu silerdi)',
     !!ready && !/\bdata-i18n="/.test(ready[0]));
  ok('Mac #readyBtn etiketi iç span üstünden çevriliyor',
     /id="readyBtn"[\s\S]{0,200}<span data-i18n="mReady">/.test(mac));
  ok('Mac #voiceBtn etiketi ayrı span üstünden yazılıyor',
     /id="voiceLbl"/.test(mac) && /\$\('#voiceLbl'\)\.textContent=t\('mVoice/.test(mac));
  ok('Mac sesle takip etiketi düğmeye DOĞRUDAN yazılmıyor',
     !/\$\('#voiceBtn'\)\.textContent=/.test(mac));

  /* ÇALIŞMA ZAMANI ETİKETİ ÇEVRİLİ Mİ — ölçülerek bulunan gerçek kusur:
     etiket sabit Türkçeydi ('🎤 Sesle'), İngilizceye geçen kullanıcı Türkçe
     görüyordu. i18n kapsam kapısı 0 diyordu çünkü yalnız İŞARETLEMEDEKİ
     metni sayıyor — çalışma zamanı yazımları onun kör noktası. */
  ok('Mac sesle takip etiketi sözlükten geliyor',
     !/textContent='🎤 Ses/.test(mac));
  ok('dil değişince çalışma zamanı etiketi de tazeleniyor',
     /voiceLbl'\);\s*if\(vl\)\s*vl\.textContent=t\(voiceOn\?'mVoiceOn':'mVoiceIdle'\)/.test(mac));
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

/* ---------- 7. KISAYOL KARTI (B.6) ---------- */
{
  const mkod = (mac.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];
  /* Mac: durum çubuğu kısayolları gösteriyor AMA 820 pikselin altında
     display:none — dar pencerede tek keşif yolu kayboluyordu. '?' her
     genişlikte çalışır. Tarayıcıda doğrulandı: 7 satır, gerçek bağlardan. */
  ok('Mac: ? tuşu kısayol kartını açıyor', /e\.key==='\?'[\s\S]{0,120}kisayolKarti\(\)/.test(mkod));
  ok('Mac: yazı alanındayken ? yok sayılıyor (kullanıcı ? yazıyordur)',
     /tag!=='textarea' && tag!=='input'/.test(mkod));
  /* KART SABİT LİSTE OLMAMALI: bir kısayol değişince sabit kart sessizce
     yalan söyler ve kimse fark etmez. Kaynağı durum çubuğunun kendisi. */
  ok('Mac: kart gerçek bağlardan üretiliyor (sabit liste değil)',
     /querySelectorAll\('#statusbar span'\)/.test(mkod));
  /* t('x') biçimi ŞART: denetim.py kullanımı bu biçimden tarıyor, doğrudan
     I18N[L].x erişimi anahtarı "hiç kullanılmıyor" gösterip ölü anahtar
     alarmı veriyordu — kapı yakaladı. */
  ok('Mac: kart başlığı sözlükten, t() biçimiyle', /bilgiGoster\(t\('keysTitle'\)/.test(mkod));

  /* Telefon: içerik zaten vardı (renderMap aktif haritayı çiziyor) ama tek
     girişi "Uzaktan kumanda" paneliydi — klavye kullanan orada aramaz. */
  ok('telefon: ? kumanda haritasını açıyor',
     /if\(e\.key==='\?' && !anySheet\(\)\)/.test(kodTel));
  ok('telefon: kart açılırken harita TAZELENİYOR (bayat liste gösterme)',
     /renderMap\(\);\s*\n\s*openSheet\('#remoteSheet'\)/.test(kodTel));
  ok('telefon: öğrenme modu kapalı açılıyor (kart okumak için, öğretmek için değil)',
     /learning=false; learnKey=null; renderLearn\(\); renderMap\(\);/.test(kodTel));
}

/* ---------- 8. KARŞILAMA EYLEMLE BİTİYOR (B.7) ---------- */
{
  /* ÇOK ADIMLI TUR YAZILMADI, bilinçli: her adım bir çıkış noktasıdır ve
     kimse okumaz. 2026 pratiği açıklama değil AKTİVASYON — karşılama tek
     birincil eylemle bitiyor: "Metnimi yapıştır" doğrudan senaryo sayfasını
     açıyor. Tarayıcıda doğrulandı (eylem görünür → tık → senaryo açık,
     karşılama kapalı). */
  ok('karşılamada eylem satırı var', /<div class="sheetbtns hidden" id="onbActions">/.test(tel));
  ok('birincil eylem senaryo sayfasını açıyor',
     /\$\('#onbGo'\)\.onclick[\s\S]{0,600}openSheet\('#scriptsSheet'\)/.test(kodTel));
  /* Odak da gitmeli, yoksa "yapıştır" düğmesi işini yarım yapar. Telefonun
     metin alanı #text — ilk yazımda Mac'in #editor id'sini kopyalamıştım ve
     `&&` guard'ı yüzünden sessizce hiçbir şey olmuyordu; denetim.py yakaladı. */
  ok('birincil eylem metin alanına ODAK veriyor', /const ta=\$\('#text'\); if\(ta\) ta\.focus\(\)/.test(kodTel));
  ok('ikincil eylem yalnız kapatıyor (baskı yok)',
     /\$\('#onbLater'\)\.onclick=\(\)=>closeSheets\(\);/.test(kodTel));
  ok('eylemler YALNIZ ilk açılışta gösteriliyor',
     /\$\('#onbActions'\)\.classList\.remove\('hidden'\);\s*\n\s*openSheet\('#newsSheet'\)/.test(kodTel));
  /* Aynı sayfa iki amaca hizmet ediyor; sürüm notu için elle açıldığında
     "Metnimi yapıştır" yanlış yönlendirir. Gizlemeyi unutmak sessiz kusur. */
  ok('sürüm notu elle açılınca eylemler GİZLENİYOR',
     /function newsElle\(\)\{[^}]*#onbActions'\)\.classList\.add\('hidden'\)[^}]*showNews\(\)/.test(kodTel)
     && /\$\('#newsBtn'\)\.onclick=newsElle;/.test(kodTel));
}

/* ---------- 9. ERİŞİLEBİLİRLİK (B.8) ---------- */
{
  /* DIŞ FONT GÖMÜLMEDİ, ölçülerek karar verildi: OpenDyslexic tek ağırlık
     ~150 KB base64, dört ağırlık Mac dosyasını ikiye katlardı ve "tek dosya,
     sıfır bağımlılık" sözünü bozardı. Telefon bu sorunu zaten SİSTEM
     fontlarıyla çözmüştü; Mac'e aynı yığın taşındı — yığının BİREBİR aynı
     olması şart, yoksa iki platform aynı ayarda farklı görünür. */
  const dysTel = (tel.match(/body\.f-dys\s+#scroller\{([^}]*)\}/) || [])[1] || '';
  const dysMac = (mac.match(/body\[data-fam=dys\] #scroller\{([^}]*)\}/s) || [])[1] || '';
  ok('telefonda disleksi yazı tipi var', /Comic Neue/.test(dysTel));
  ok('Mac\'te disleksi yazı tipi VAR (eskiden yoktu)', /Comic Neue/.test(dysMac));
  const yigin = x => (x.match(/font-family:([^;]*)/) || [])[1] || '';
  ok('iki kabukta font yığını BİREBİR aynı',
     yigin(dysTel).replace(/\s+/g,'') === yigin(dysMac).replace(/\s+/g,''));
  /* Harf aralığı disleksi okunurluğunda fontun kendisi kadar etkili —
     birinde olup öbüründe olmaması sessiz bir fark yaratırdı. */
  ok('harf aralığı iki kabukta da uygulanıyor',
     /letter-spacing:\.02em/.test(dysTel) && /letter-spacing:\.02em/.test(dysMac));
  ok('Mac\'te disleksi düğmesi UI\'da', /<button data-fam="dys" data-i18n="fDys">/.test(mac));

  /* Hareket azaltma: telefonda vardı, Mac'te yoktu. Sufle akışı DURMAZ —
     o süsleme değil ürünün işi; duran şey nabız ve panel geçişleri. */
  ok('telefon hareket azaltmayı gözetiyor', /@media \(prefers-reduced-motion: reduce\)/.test(tel));
  ok('Mac hareket azaltmayı gözetiyor (eskiden gözetmiyordu)',
     /@media \(prefers-reduced-motion: reduce\)/.test(mac));
  const rm = (mac.match(/@media \(prefers-reduced-motion: reduce\)\{([\s\S]*?)\n  \}/) || [])[1] || '';
  ok('Mac kuralı sufle akışını DURDURMUYOR (yalnız süsleme)',
     rm.length > 0 && !/#scroller\b/.test(rm) && !/#prompt\b/.test(rm));
}

/* ---------- 10. MAC YÜKSEK KONTRAST (B.8, ikinci dilim) ---------- */
{
  const mkod = (mac.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];
  /* Sözlükte tgHicon anahtarı VARDI ama uygulama YOKTU — ölü çeviri.
     Ölçülen kazanç: kenarlık kontrastı 1,29:1 → 21:1 (beyaz/siyah). */
  ok('Mac: yüksek kontrast teması tanımlı', /body\.hicon\{--accent:#00ff7f/.test(mac));
  ok('Mac: anahtar UI\'da ve sözlüğe bağlı',
     /data-i18n="tgHicon"[\s\S]{0,80}data-t="hicon"/.test(mac));
  ok('Mac: anahtar tıklanınca tema uygulanıyor', /if\(k==='hicon'\)\{ applyHicon\(\); \}/.test(mkod));
  ok('Mac: applyHicon tanımlı VE başlatmada çağrılıyor',
     /function applyHicon\(\)/.test(mkod) && /^\s*applyHicon\(\);/m.test(mkod));
  /* ESKİ KAYITTA alan yok: açık değer kontrolü şart, `!state.hicon` değil. */
  ok('Mac: eski kayıtlara dayanıklı okuma', /state\.hicon===true/.test(mkod));
  /* İşletim sistemi tercihi BİR KEZ devralınır. Bayrak olmasaydı kullanıcının
     kapattığı ayar her açılışta geri açılırdı. */
  ok('Mac: OS yüksek kontrastı bir kez devralınıyor',
     /if\(!state\.hiconSoruldu\)/.test(mkod) && /prefers-contrast: more/.test(mkod));
  ok('Mac: sufle metni de zorlanıyor (asıl okunan o)',
     /body\.hicon #scroller\{color:#fff!important/.test(mac));
}
