const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, macYolu, oku, cikar}=require('./kaynak.js');

/* D.6 — VİDEO BUDAMA (baştan/sondan kes).

   ÖLÇÜLEN DURUM: telefonda TAM ÇALIŞIYORDU (kaydırmalar, önizleme, uygula,
   gerçek yeniden kayıt). Mac'te HİÇ YOKTU — üstelik paylaşılan sözlükte
   trimStart/trimEnd/trimGo/trimPrev anahtarları duruyordu, yani yine
   iki dilde çevrilmiş ama hiçbir yerde görünmeyen ölü metinlerdi.

   YÖNTEM neden bu: tarayıcıda yeniden kodlama kütüphanesi olmadan tek dürüst
   yol, videoyu seçilen aralıkta oynatıp captureStream'i yeniden kaydetmek.
   ffmpeg.wasm gömmek "tek dosya, sıfır bağımlılık" sözünü bozardı — jeton
   fontlarında ölçülen aynı gerekçe. Bedeli kullanıcıya AÇIKÇA söyleniyor:
   kesme, seçilen süre kadar sürer. */

const tel = oku(telefonYolu());
const mac = oku(macYolu());
const kodMac = (mac.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];
const kodTel = (tel.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];

/* ---------- İKİ KABUKTA DA VAR MI ---------- */
{
  ok('telefon: budama kutusu duruyor', /id="trimBox"/.test(tel));
  ok('telefon: doTrim duruyor', /async function doTrim\(\)\{/.test(kodTel));
  ok('Mac: budama kutusu VAR (eskiden yoktu)', /id="rrTrimBox"/.test(mac));
  ok('Mac: iki kaydırma da var', /id="rrTrimA"/.test(mac) && /id="rrTrimB"/.test(mac));
  ok('Mac: önizleme ve uygula düğmeleri var',
     /id="rrTrimPrev"/.test(mac) && /id="rrTrimGo"/.test(mac));
  /* Sözlükteki ölü anahtarlar artık GERÇEKTEN kullanılıyor. */
  ok('Mac: etiketler sözlüğe bağlı (ölü çeviri kalmadı)',
     /data-i18n="trimStart"/.test(mac) && /data-i18n="trimEnd"/.test(mac) &&
     /data-i18n="trimPrev"/.test(mac) && /data-i18n="trimGo"/.test(mac));
}

/* ---------- ÖLÜ AYAR YARATILMADI MI ---------- */
{
  /* Tarayıcı captureStream desteklemiyorsa kutu HİÇ AÇILMAMALI. Açıp sonra
     "olmuyor" demek, kullanıcıya çekimiyle oynadığını sandırır. */
  ok('Mac: kutu varsayılan GİZLİ', /id="rrTrimBox" class="hidden"/.test(mac));
  const ac = cikar(kodMac, /function trimAc\(\)\{[\s\S]*?\n  \}/, 'trimAc');
  ok('Mac: destek yoksa kutu açılmıyor',
     /if\(!trimVar\(\)\|\|!trimSure\(\)\)\{ \$\('#rrTrimBox'\)\.classList\.add\('hidden'\); return; \}/.test(ac));
  ok('Mac: destek denetimi captureStream tabanlı',
     /v\.captureStream\|\|v\.mozCaptureStream/.test(kodMac));
  /* Süre metadata ile geldiği için sonuç açılışında gecikmeli hazırlanıyor;
     hemen çağrılsaydı süre 0 görünüp kutu hep gizli kalırdı. */
  ok('Mac: sonuç açılınca kutu hazırlanıyor', /setTimeout\(trimAc,150\)/.test(kodMac));
}

/* ---------- KULLANICININ ÇEKİMİ KORUNUYOR MU ---------- */
{
  const uy = cikar(kodMac, /async function trimUygula\(\)\{[\s\S]*?\n  \}/, 'trimUygula');
  /* EN ÖNEMLİ KURAL: boş ya da bozuk çıktı ESKİSİNİ EZMEMELİ. */
  ok('Mac: boş çıktı eskisini ezmiyor', /if\(nb\.size<1000\) throw new Error\('empty'\)/.test(uy));
  ok('telefon tarafında da aynı koruma', /if\(nb\.size<1000\) throw new Error\('empty'\)/.test(kodTel));
  ok('Mac: hata olursa çekimin durduğu SÖYLENİYOR',
     /toast\('Kesilemedi — çekim olduğu gibi duruyor'\)/.test(uy));
  ok('Mac: hata günlüğe yazılıyor', /logErr\('trim',e\)/.test(uy));
  /* Çift tıklama iki kayıt başlatır ve ikisi birbirini bozar. */
  ok('Mac: çift çalıştırma engelli', /if\(trimming\) return;/.test(uy));
  /* Seek ya da oynatma takılırsa süresiz beklememeli. */
  ok('Mac: üst süre sınırı var', /setTimeout\(\(\)=>\{ clearInterval\(iv\); res\(\); \}, \(sec\+4\)\*1000\)/.test(uy));
  ok('Mac: çok kısa seçim reddediliyor', /if\(sec<0\.3\)/.test(uy));
}

/* ---------- BEDELİ SÖYLENİYOR MU ---------- */
{
  const g = cikar(kodMac, /function trimGuncelle\(\)\{[\s\S]*?\n  \}/, 'trimGuncelle');
  /* Kesme gerçek zamanlı oynatmayla yapılıyor: 3 dakikalık seçim 3 dakika
     sürer. Bunu söylememek, kullanıcıya donmuş uygulama izlenimi verirdi. */
  ok('Mac: işlemin ne kadar süreceği yazılıyor',
     /kesme işlemi yaklaşık '\+Math\.ceil\(sec\)\+' sn sürer/.test(g));
  ok('Mac: seçilen ve toplam süre birlikte gösteriliyor',
     /Seçilen: '\+sec\.toFixed\(1\)/.test(g) && /toplam '\+d\.toFixed\(1\)/.test(g));
  ok('telefonda da aynı bilgi veriliyor', /kesme işlemi yaklaşık/.test(kodTel));
}
