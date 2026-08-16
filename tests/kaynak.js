/* Test dosyalarının kaynak dosyaları nerede bulacağını tek yerden çözer.
   Eskiden her testte mutlak masaüstü yolu gömülüydü — depo başka bir makineye
   klonlandığında hepsi kırılırdı. Sıra: ortam değişkeni → depo içi → masaüstü. */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const HOME = process.env.HOME || '';

/* AÇIKÇA VERİLEN YOL YANLIŞSA SESSİZCE DEPOYA DÜŞME.
   Ortam değişkeni yalnız kasıtlı bozma turlarında veriliyor. Yol yanlışsa
   eski davranış onu atlayıp DEPODAKİ gerçek dosyayı sınıyordu: bozma hiç
   ölçülmüyor ama test "geçti" diyor. 2026-08-14 gecesi tam bu yüzden üç
   bozma "yakalanmadı" göründü; oysa bozma dosyaları hiç yazılmamıştı.
   Ölçmeyen kapı sınıfı — açıkça verilen yol VARSA doğru olmalı. */
function ilkVarOlan(adaylar, ad, acikYol) {
  if (acikYol && !fs.existsSync(acikYol))
    throw new Error('Verilen yol yok: ' + acikYol + ' (' + ad + ')\n' +
      'Ortam değişkeni yanlışsa bozma turu HİÇBİR ŞEY ölçmez.');
  for (const p of adaylar) if (p && fs.existsSync(p)) return p;
  throw new Error(
    'Kaynak bulunamadı: ' + ad + '\nBakılan yerler:\n  ' + adaylar.filter(Boolean).join('\n  ') +
    '\nÇözüm: SUFLE_TELEFON / SUFLE_MAC ortam değişkeniyle yolu ver.'
  );
}

const telefonYolu = () => ilkVarOlan([
  process.env.SUFLE_TELEFON,
  path.join(REPO, 'index.html'),
  path.join(HOME, 'Desktop/iPhone Teleprompter/index.html'),
], 'telefon index.html', process.env.SUFLE_TELEFON);

/* SIRA DEPODAN BAŞLAR — 2026-08-13'te bu sıra tersti ve gerçekten yanılttı.
   Depodaki mac/ dosyası düzenlenip masaüstü kopyası eşitlenmeyince testler
   ESKİ dosyayı sınayıp 766/0 verdi; düzenlemem hiç ölçülmemişti. Kapı neyi
   yayınlıyorsa onu sınamalı, yayınlanan da depodaki kopya. Masaüstü
   kopyalarının bayatlığı ayrı bir kontrol (kapi.sh 5. adım). */
const macYolu = () => ilkVarOlan([
  process.env.SUFLE_MAC,
  path.join(REPO, 'mac/Teleprompter Pro.html'),
  path.join(HOME, 'Desktop/Teleprompter/Teleprompter Pro.html'),
], 'Mac Teleprompter Pro.html', process.env.SUFLE_MAC);

const oku = p => fs.readFileSync(p, 'utf8');

/* Kaynaktan gerçek fonksiyonu çıkarır. Testler kodun KOPYASINI değil
   kendisini sınasın diye — kopya test, kod değişince sessizce yalan söyler. */
function cikar(src, re, ad) {
  const m = src.match(re);
  if (!m) throw new Error('Kaynakta bulunamadı: ' + (ad || re));
  return m[0];
}

/* m('anahtar') → KULLANICININ GÖRDÜĞÜ Türkçe metin.

   A.2c'de Mac mesajları sözlüğe taşındı: `toast('Metin bitti')` artık
   `toast(m('textEnd'))`. Metin değişmedi, YERİ değişti. Ama on bir test
   kullanıcıya ne SÖYLENDİĞİNİ arıyordu ve hepsi kırmızıya döndü — CLAUDE.md'de
   yazılı "desene değil iddiaya bağlan" sınıfının bir örneği daha.

   İki yanlış çözüm vardı: (a) testleri gevşetip "bir şey söyleniyor" demek —
   o zaman BOŞ bir uyarı da geçerdi; (b) her teste anahtar listesi gömmek —
   sözlük değişince sessizce yalan söylerdi. Doğrusu: anahtarı GERÇEK sözlükten
   çözüp yerine koymak. İddia yine kullanıcının okuduğu cümleye bağlı kalıyor.

   Çözülemeyen anahtar OLDUĞU GİBİ bırakılmaz, atılmaz: sözlükte karşılığı
   olmayan bir anahtar sessizce "geçer" hâle gelmesin diye görünür bir işaretle
   (⟪anahtar⟫) değiştiriliyor — testte eşleşmez, kırmızı verir. */
function macSozlugu() {
  const s = fs.readFileSync(path.join(REPO, 'cekirdek/mac-mesajlar.js'), 'utf8');
  const kap = {};
  new Function('g', s + '\ng.MMSG=MMSG;')(kap);
  return kap.MMSG.tr;
}

/* TIRNAK METNE GÖRE SEÇİLİR, sabit değil. İlk yazımda hepsini tek tırnakla
   sarmıştım; "Mac'in Wi-Fi adresi bulunamadı" mesajı tezgâhı SyntaxError ile
   kesti. Kaçış eklemek de yanlış olurdu: `Mac\'in` yazan bir kaynakta metni
   arayan test artık metni bulamaz. Doğrusu, o metinde GEÇMEYEN bir tırnak
   seçmek — metin harfi harfine korunuyor. */
function sar(metin) {
  for (const q of ["'", '"', '`'])
    if (!metin.includes(q) && !(q === '`' && metin.includes('${'))) return q + metin + q;
  return JSON.stringify(metin);
}

function macCoz(src) {
  const tr = macSozlugu();
  return src.replace(/\bm\('([A-Za-z0-9_]+)'\)/g,
    (t, k) => tr[k] !== undefined ? sar(tr[k]) : "'\u27ea" + k + "\u27eb'");
}

/* Mac kaynağı, mesaj anahtarları çözülmüş hâlde. Metin arayan ya da çıkardığı
   kodu KOŞTURAN testler bunu kullanır (koşturanlar için m() zaten tanımsızdı,
   tezgâh çöküyordu). Anahtarın kendisini sayan testler (122) ham oku()'yu
   kullanmaya devam eder. */
const macMetni = () => macCoz(oku(macYolu()));

/* var(--jeton) -> GERÇEK DEĞER.

   B.1'de tipografi ve boşluk ölçeği jetona bağlandı: `padding:12px` artık
   `padding:var(--sp-3)`. Değer DEĞİŞMEDİ, yeri değişti. Ama sayıyı kaynaktan
   okuyan testler `NaN` görmeye başladı ve iki dosya birden kırmızıya döndü —
   kod doğruyken. Aynı sınıf A.2c'de mesajlarda da çıkmıştı.

   İki yanlış çözüm vardı: (a) testleri "bir padding var" diye gevşetmek —
   o zaman yanlış değer de geçerdi; (b) jeton bağlamayı geri almak — ölçek
   yine ölürdü. Doğrusu: jetonu GERÇEK sözlüğünden çözüp yerine koymak.
   Çözülemeyen jeton olduğu gibi bırakılmaz, görünür bir işaretle değiştirilir
   ki test sessizce geçmesin. */
/* ÖLÇÜLDÜ (2026-08-16): jeton tablosu HER ZAMAN depodaki dosyadan okunuyordu,
   yani `SUFLE_JETON` ile bozulmuş bir kopya verilse bile çözülen renk eski
   kalıyordu — `tests/83` gibi renk ölçen testlere bozma HİÇ ULAŞMIYORDU.
   Bu, kapının aynı gece üçüncü kez çıkan kör noktası: ölçüm aracının kendisi
   gerçek dosyayı okuyunca bozma turu sessizce silahsız kalıyor. */
function jetonlar() {
  const v = process.env.SUFLE_JETON;
  if (v && !fs.existsSync(v)) throw new Error('Verilen yol yok: ' + v);
  const s = fs.readFileSync(v || path.join(REPO, 'cekirdek', 'jetonlar.css'), 'utf8');
  const m = {};
  for (const [, ad, deger] of s.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g))
    m[ad] = deger.trim();
  return m;
}

function cozJeton(metin) {
  const j = jetonlar();
  let onceki = null, cikti = metin;
  /* İç içe jeton olabilir (bir jeton başka bir jetonu kullanabilir); değişim
     durana kadar çöz, ama sonsuz döngüye girme. */
  for (let i = 0; i < 5 && cikti !== onceki; i++) {
    onceki = cikti;
    cikti = cikti.replace(/var\((--[a-z0-9-]+)\)/g,
      (t, ad) => j[ad] !== undefined ? j[ad] : '\u27ea' + ad + '\u27eb');
  }
  return cikti;
}

/* Paylaşılan metin araçları TEK dosyada (A.3, Tur 46). Testler onları
   kabuktan çıkarmaya çalışırsa GİRİNTİYE kilitlenir: Mac kopyası 2 boşlukla
   yazılıydı, gömülü blok 0 girintiyle geliyor ve beş test birden "iddia sayısı
   düştü" diye kırıldı — davranış hiç değişmemişti. Kaynağın kendisi okunuyor. */
function metinCekirdegi() {
  /* AÇIKÇA VERİLEN YOL YANLIŞSA SESSİZCE DEPOYA DÜŞME. Bozma turu geçici bir
     kopya yazıp SUFLE_METIN ile gösteriyor; depo dosyası okunursa bozma
     HİÇBİR ŞEY ölçmeden "geçti" görünür. Bu tuzağa bu oturumda üç kez
     düşüldü (docx, prova, kumanda) — kural artık burada da yazılı. */
  const acik = process.env.SUFLE_METIN;
  if (acik && !fs.existsSync(acik))
    throw new Error('Verilen metin çekirdeği yolu yok: ' + acik);
  return fs.readFileSync(acik || path.join(REPO, 'cekirdek', 'metin.js'), 'utf8');
}

/* SÜSLÜ PARANTEZ SAYARAK BLOK KESME.
   Regexle fonksiyon çıkarmak bu depoda İKİ KEZ testi sessizce çökertti:
   `[\s\S]*?\n\s*\}` deseni fonksiyonun İÇİNDEKİ ilk kapanışa takılıyor
   (for döngüsü, iç içe forEach, erken bir ctx.restore()) ve yarım kod
   çıkarıyor. Yarım kod SyntaxError verir; test "HATA" satırı basmadan
   ölür, yani çıkış koduna bakmayan biri onu GEÇTİ sanır.
   `imza` fonksiyonun başlangıcı, `bas` istenirse daha erken bir noktadan
   (ör. önbellek değişkeninin tanımı) başlatır. */
/* ÇEKİRDEK MODÜLÜNÜ ORTAM DEĞİŞKENİNE SAYGIYLA OKU.
   Testin doğrudan depo dosyasını okuması, bozma turunu KÖR eder: tezgâh
   geçici bozuk kopyayı yazar, test depodakini ölçer ve "geçti" der. Bu
   tuzağa depoda üç kez düşüldü (docx, prova, kumanda) — dördüncüsü olmasın.
   Yol verilmiş ama dosya yoksa sessizce depoya DÜŞMEK yerine hata ver. */
function cekirdekOku(ad, envAd) {
  const acik = process.env[envAd];
  if (acik && !fs.existsSync(acik))
    throw new Error('Verilen çekirdek yolu yok: ' + acik);
  return fs.readFileSync(acik || path.join(REPO, 'cekirdek', ad), 'utf8');
}

/* ÖLÇÜLDÜ (2026-08-16): bu tezgâh süslü parantezleri KÖRÜ KÖRÜNE sayıyordu ve
   dizeyle düzenli ifadenin içindekileri de sayıyordu. `duzMetin` içindeki
   `\{[^}]{1,24}\}` deseni yüzünden fonksiyon YARISINDAN kesiliyor, çağıran
   test ya çöküyor ya da yarım kodu ölçüp yanlış sonuç veriyordu — bu depoda
   en pahalı hata sınıfı, çünkü kırmızı vermek yerine YANLIŞ ÖLÇÜYOR.
   Artık küçük bir tarayıcı var: dize ('/"/`), satır ve blok yorumu, düzenli
   ifade sabiti ve kaçış karakteri atlanıyor. Düzenli ifade sabiti, bir
   önceki anlamlı karakterden anlaşılıyor (JS'te `/` hem bölme hem desen).
   `tests/161` bu tezgâhı İKİ KABUKTAKİ HER fonksiyonla sınıyor: çıkarılan
   her blok ayrıştırılabilmeli. */
function blokKes(kod, imza, bas) {
  const iBas = bas ? kod.indexOf(bas) : -1;
  const i = kod.indexOf(imza);
  if (i < 0) return null;
  const bosMu = c => c === ' ' || c === '\t' || c === '\n' || c === '\r';
  /* `/` bölme mi desen mi: bir önceki anlamlı karakter değer bitiriyorsa
     (harf, rakam, `)`, `]`) bölmedir; aksi hâlde desen başlangıcıdır. */
  const desenMi = (j) => {
    let k = j - 1;
    while (k >= 0 && bosMu(kod[k])) k--;
    if (k < 0) return true;
    return !/[A-Za-z0-9_$)\]]/.test(kod[k]);
  };
  let d = 0, basladi = false;
  let j = kod.indexOf('{', i);
  if (j < 0) return null;
  for (; j < kod.length; j++) {
    const c = kod[j];
    if (c === '\\') { j++; continue; }
    if (c === '/' && kod[j + 1] === '/') { j = kod.indexOf('\n', j); if (j < 0) return null; continue; }
    if (c === '/' && kod[j + 1] === '*') { j = kod.indexOf('*/', j); if (j < 0) return null; j++; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const tir = c;
      for (j++; j < kod.length; j++) {
        if (kod[j] === '\\') { j++; continue; }
        if (kod[j] === tir) break;
      }
      continue;
    }
    if (c === '/' && desenMi(j)) {
      let sinif = false;
      for (j++; j < kod.length; j++) {
        if (kod[j] === '\\') { j++; continue; }
        if (kod[j] === '[') sinif = true;
        else if (kod[j] === ']') sinif = false;
        else if (kod[j] === '/' && !sinif) break;
        else if (kod[j] === '\n') return null;   // desen satır sonuna taşmaz
      }
      continue;
    }
    if (c === '{') { d++; basladi = true; }
    else if (c === '}') {
      d--;
      if (basladi && d === 0) return kod.slice(iBas >= 0 ? iBas : i, j + 1);
    }
  }
  return null;
}

/* Dize, düzenli ifade ve yorum İÇERİĞİNİ boşlukla değiştirir; uzunluk ve
   satır sayısı KORUNUR. Süslü parantez/köşeli parantez sayan her ölçüm buna
   muhtaç: `const RTL_ARALIK = /[֐-׿]/` satırındaki köşeli parantezi saymak,
   derinlik takibini olduğu gibi yanıltıyordu (2026-08-16de ölçüldü —
   çekirdeğin bildirimleri "0 bildirim" görünüyordu). */
function dizeSil(kod){
  const out=kod.split('');
  const bosMu=c=>c===' '||c==='\t'||c==='\n'||c==='\r';
  const desenMi=j=>{ let k=j-1; while(k>=0&&bosMu(kod[k])) k--; if(k<0) return true;
                     return !/[A-Za-z0-9_$)\]]/.test(kod[k]); };
  const sil=(a,b)=>{ for(let k=a;k<b&&k<out.length;k++) if(out[k]!=='\n') out[k]=' '; };
  for(let j=0;j<kod.length;j++){
    const c=kod[j];
    if(c==='/'&&kod[j+1]==='/'){ const e=kod.indexOf('\n',j); const s2=e<0?kod.length:e; sil(j,s2); j=s2; continue; }
    if(c==='/'&&kod[j+1]==='*'){ const e=kod.indexOf('*/',j); const s2=e<0?kod.length:e+2; sil(j,s2); j=s2-1; continue; }
    if(c==='"'||c==="'"||c==='`'){
      const tir=c; let k=j+1;
      for(;k<kod.length;k++){ if(kod[k]==='\\'){k++;continue;} if(kod[k]===tir) break; }
      sil(j+1,k); j=k; continue;
    }
    if(c==='/'&&desenMi(j)){
      let k=j+1, sinif=false, bitti=false;
      for(;k<kod.length;k++){
        if(kod[k]==='\\'){k++;continue;}
        if(kod[k]==='[') sinif=true;
        else if(kod[k]===']') sinif=false;
        else if(kod[k]==='\n') break;
        else if(kod[k]==='/'&&!sinif){ bitti=true; break; }
      }
      if(bitti){ sil(j+1,k); j=k; }
      continue;
    }
  }
  return out.join('');
}

/* Mac yerel sunucusunun yolu — ortam değişkenine saygılı.
   ÖLÇÜLDÜ (2026-08-16): dört test bu dosyayı DOĞRUDAN okuyordu ve dosya
   `bozma.py` KAYNAK tablosunda hiç yoktu; yani kumanda sunucusunun tamamı
   kasıtlı bozma turunun dışındaydı. */
function sunucuYolu() {
  const v = process.env.SUFLE_SUNUCU;
  if (v && !fs.existsSync(v)) throw new Error('Verilen yol yok: ' + v);
  return v || path.join(REPO, 'mac', 'teleprompter_server.py');
}

/* Depodaki HERHANGİ bir dosyayı ortam değişkenine saygılı okur.
   NEDEN VAR (2026-08-16de ölçüldü): kapının 8. adımı dosyayı geçici kopyada
   bozup testin ayırt ettiğini kanıtlıyor — ama test dosyayı DOĞRUDAN depodan
   okuyorsa bozmayı hiç görmez ve "yakalanmadı" der. Yani `sw.js`, `sozluk.js`,
   `GIZLILIK.md` gibi kaynaklar için bozma turu SESSİZCE etkisizdi.
   Verilen yol yoksa hata: sessizce gerçek dosyaya düşmek, bozmayı hiç
   uygulamadan "geçti" demek olurdu (bu depoda bir kez yaşandı). */
function repoOku(goreli, envAd){
  const v = envAd ? process.env[envAd] : null;
  if (v && !fs.existsSync(v)) throw new Error('Verilen yol yok: ' + v);
  return fs.readFileSync(v || path.join(REPO, goreli), 'utf8');
}

module.exports = { telefonYolu, macYolu, oku, cikar, REPO, macCoz, macMetni, repoOku,
                   cozJeton, metinCekirdegi, blokKes, cekirdekOku, dizeSil, sunucuYolu };

