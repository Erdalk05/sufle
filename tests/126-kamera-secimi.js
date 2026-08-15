const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, macYolu, oku, cikar}=require('./kaynak.js');

/* D.2 — KAMERA SEÇİMİ.

   ÖLÇÜLEN BOŞLUK: Mac `facingMode:'user'` ile SABİTTİ. Harici webcam'i,
   yakalama kartı ya da iPhone Sürekli Kamera'sı olan masaüstü kullanıcısı
   hiçbirini seçemiyordu — matriste liderin 5 aldığı kalem, SUFLE 2 alıyordu.
   Telefonda `deviceId` zaten kullanılıyordu (mikrofon seçimi), Mac'te sıfır.

   Tarayıcıda doğrulandı: tek kameralı makinede satır GİZLİ kalıyor. */

const tel = oku(telefonYolu());
const mac = oku(macYolu());
const kodMac = (mac.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];

/* ---------- YÜZEY ---------- */
{
  ok('Mac: kamera satırı işaretlemede', /<div class="field" id="camRow"/.test(mac));
  ok('Mac: satır sözlüğe bağlı (iki dilli)', /<span data-i18n="camSel">/.test(mac));
  ok('Mac: seçim kabı var', /<div class="seg" id="camSeg">/.test(mac));
  /* Varsayılan GİZLİ: liste ancak iki kameradan fazlası varsa açılır. Açık
     başlasaydı tek kameralı makinede boş bir satır görünürdü. */
  ok('Mac: satır varsayılan GİZLİ', /id="camRow" style="display:none"/.test(mac));
}

/* ---------- SEÇİM GERÇEKTEN KAMERAYI DEĞİŞTİRİYOR MU ---------- */
{
  const f = cikar(kodMac, /async function setupCams\(\)\{[\s\S]*?\n  \}/, 'setupCams');
  /* TEK KAMERADA HİÇ GÖSTERME: tek satırlık bir "seçenek" seçim yanılsaması
     yaratır ve paneli şişirir. Telefonun mikrofon seçicisinde aynı kural. */
  ok('iki kameradan azsa liste gizleniyor', /if\(kams\.length<2\)\{ row\.style\.display='none'; return; \}/.test(f));
  ok('yalnız videoinput süzülüyor', /d\.kind==='videoinput'/.test(f));
  ok('seçim durumda saklanıyor', /state\.camId=d\.deviceId; save\(\);/.test(f));
  ok('seçilince akış yeniden kuruluyor', /if\(stream\)\{ stopCam\(\); await toggleCam\(\); \}/.test(f));
  /* KAYIT SIRASINDA DEĞİŞTİRME: akışı yeniden kurmak kaydı bozar. Telefonda
     aynı koruma kameraDegisebilir() ile var; sessizce reddetmek yerine
     kullanıcıya SEBEBİ söyleniyor. */
  ok('kayıt sürerken değişim engelleniyor',
     /if\(recorder&&recorder\.state!=='inactive'\)\{/.test(f));
  ok('engelleme sessiz değil, sebebi söyleniyor',
     /toast\('Kayıt sürerken kamera değiştirilemez'\)/.test(f));
  ok('hata günlüğe yazılıyor', /logErr\('cams',e\)/.test(f));
}

/* ---------- getUserMedia SEÇİLENİ İSTİYOR MU ---------- */
{
  /* Liste dolup seçim kaydedilse bile kısıt kullanılmazsa kamera DEĞİŞMEZ:
     ayar açılır, hiçbir şey olmaz — deponun "ölü ayar" sınıfı. */
  ok('seçili kamera deviceId ile isteniyor',
     /state\.camId\?\{deviceId:\{exact:state\.camId\}\}:\{facingMode:'user'\}/.test(kodMac));
  /* Seçim yoksa ESKİ davranış korunuyor: mevcut kullanıcının kamerası
     değişmesin. */
  ok('seçim yoksa eski davranış (ön kamera) sürüyor', /:\{facingMode:'user'\}/.test(kodMac));
}

/* ---------- LİSTE DOĞRU ANLARDA TAZELENİYOR MU ---------- */
{
  /* Tarayıcı, izin verilmeden önce cihaz ADLARINI boş döndürür. Yalnız
     başlangıçta doldurulsaydı liste "Kamera 1 / Kamera 2" diye anlamsız
     kalırdı; kamera açıldıktan sonra tazelenince gerçek adlar geliyor. */
  const sayi = (kodMac.match(/setupCams\(\);/g) || []).length;
  ok('setupCams birden fazla yerden çağrılıyor (başlangıç + izin sonrası) — ' + sayi,
     sayi >= 3);
  ok('kamera açılınca liste tazeleniyor',
     /recBtn\.style\.opacity='1';\s*\n\s*setupCams\(\);/.test(kodMac));
}

/* ---------- TELEFON TARAFI GERİLEMEDİ Mİ ---------- */
{
  /* Telefonda cihaz seçimi zaten vardı; bu turda ona dokunulmadı.
     Gerileme olmadığını kilitle. */
  ok('telefon: mikrofon seçimi duruyor', /async function setupMics\(\)\{/.test(tel));
  ok('telefon: ön/arka kamera seçimi duruyor', /facingMode/.test(tel));
}

/* ---------- ODAK / POZLAMA KİLİDİ (D.2 kalanı) ---------- */
{
  const kodTel = (tel.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];
  /* Kamera çekim ortasında arayış yapmasın: kıpırdayınca odak nefes almasın,
     ışık değişince parlaklık zıplamasın. Rakip matrisinde "kamera kontrolleri"
     kaleminin ikinci yarısı. */
  ok('telefon: kilit anahtarı işaretlemede', /id="lockRow"[\s\S]{0,120}data-t="camLock"/.test(tel));
  ok('telefon: anahtar sözlüğe bağlı', /<span data-i18n="tgLock">/.test(tel));
  ok('telefon: ne işe yaradığı yazıyor (jargon değil)', /data-i18n="lockHint"/.test(tel));

  /* EN ÖNEMLİ KURAL — ÖLÜ AYAR YARATMA: cihaz desteklemiyorsa anahtar HİÇ
     görünmemeli. Deponun 3 numaralı hata sınıfı tam buydu; tarayıcıda
     doğrulandı (kamera açılmadan satır ve ipucu gizli). */
  ok('telefon: satır varsayılan GİZLİ', /id="lockRow" style="display:none"/.test(tel));
  const sc = cikar(kodTel, /function setupCaps\(\)\{[\s\S]*?\n\}/, 'setupCaps');
  ok('görünürlük YETENEĞE bağlı', /\$\('#lockRow'\)\.style\.display=hasLock\?'flex':'none'/.test(sc));
  ok('ipucu da yetenekle birlikte gizleniyor',
     /\$\('#lockHint'\)\.classList\.toggle\('hidden',!hasLock\)/.test(sc));
  /* Cihaz değiştiren kullanıcıda "açık" görünen ama hiçbir şey yapmayan
     bir bayrak kalmamalı. */
  ok('desteklenmiyorsa durum da temizleniyor', /if\(!hasLock\) st\.camLock=false;/.test(sc));
  /* iOS ve Android farklı kip adları veriyor; tek ada kilitlemek özelliği
     bir platformda tümden ölü bırakırdı. */
  ok('iki kip adı da aranıyor (manual / single-shot)',
     /k==='manual'\|\|k==='single-shot'/.test(sc));

  const ap = cikar(kodTel, /function applyCamLock\([\s\S]*?\n\}/, 'applyCamLock');
  /* Desteksiz bir alanı istemek bazı tarayıcılarda TÜM kısıtı reddettiriyor
     ve kilit sessizce hiç uygulanmıyordu — yalnız desteklenen alan gönderiliyor. */
  ok('yalnız desteklenen alan gönderiliyor',
     /if\(kilitOdak\) ileri\.focusMode/.test(ap) && /if\(kilitPoz\)  ileri\.exposureMode/.test(ap));
  ok('kapatınca sürekli kipe dönülüyor', /'continuous'/.test(ap));
  ok('gönderilecek bir şey yoksa çağrı yapılmıyor', /if\(!Object\.keys\(ileri\)\.length\) return;/.test(ap));
  /* Kamera reddederse anahtar AÇIK kalmamalı: kullanıcı kilitli sanır,
     kamera arayışa devam eder — sessiz yalan. */
  ok('kamera reddederse anahtar geri alınıp sebebi söyleniyor',
     /st\.camLock=false; save\(\); apply\(\); toast\(m\('lockNo'\)\)/.test(ap));
  ok('hata günlüğe yazılıyor', /logErr\('camLock',e\)/.test(ap));
  /* Anahtar gerçekten kameraya bağlı olmalı, yoksa ayar açılır hiçbir şey olmaz. */
  ok('anahtar applyCamLock çağırıyor', /if\(k==='camLock'\) applyCamLock\(kilitOdakKipi, kilitPozKipi\);/.test(kodTel));
}
