const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {macYolu, oku, REPO}=require('./kaynak.js');

/* A.2b/c — MAC i18n KAPSAM KAPISI.

   Mac bugüne dek Türkçeye gömülüydü (data-i18n sayısı 0). Artık sözlüğü
   telefonla PAYLAŞIYOR — ama iş bitmedi.

   ⚠️ DİL DÜĞMESİ HÂLÂ EKLENMEDİ, BİLEREK. Yarı İngilizce arayüz, hiç İngilizce
   olmamasından KÖTÜDÜR: kullanıcı özelliğin bozuk olduğunu sanar. Düğme
   aşağıdaki sayaç SIFIRA inince gelecek; bu testin son iddiası onu koruyor.

   ÖLÇÜTÜN İKİ KEZ DARLIĞI YAKALANDI — ikisi de kapıyı kör edecekti:
     1) Önce yalnız <button>/<label> gibi ögelerin METNİ sayılıyordu. Ölçüt
        "0 eksik" deyip düğmeye yeşil ışık yakıyordu; oysa 28 öznitelik
        (20 title, 2 placeholder, 6 aria-label) çevrilmemişti. Ekran okuyucu
        kullanan biri arayüzün tamamını Türkçe duyardı.
     2) Sonra öznitelikler eklendi ama <span> ve iç içe ögeler hâlâ dışarıdaydı:
        durum çubuğundaki "Boşluk başlat · hız · sade" ve bütün anahtar
        etiketleri ("🪞 Ayna", "🎯 Göz çizgisi") sayılmıyordu. 53 metin daha.

   Bugünkü ölçüt bu yüzden ELEME ile çalışıyor: işaretlemedeki BÜTÜN görünür
   metinler sayılır, kapsananlar ve gerekçesi yazılı istisnalar düşülür. Yeni
   bir öge türü eklemek ölçütü artık sessizce kör edemez.

   ÖLÇÜT "eksik SAYISI", yüzde değil — kapsam.py'de gerekçesi ölçülerek
   seçilen ölçütün aynısı: yüzde, etiket SİLİNCE de yükselir. */

const TABAN_YOL = path.join(REPO, 'tests', 'mac-i18n-taban.json');
const mac = oku(macYolu());

let isaret = mac.replace(/<script[\s\S]*?<\/script>/gi, ' ')
                .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                .replace(/<!--[\s\S]*?-->/g, ' ');

/* Gerekçesi yazılı istisnalar. Listeye ekleme YAPMAK kolay olmasın diye her
   satırın nedeni burada duruyor; nedensiz eleme, ölçüyü kandırmaktır. */
const ISTISNA = [
  /* Ürün adı — çevrilmez, marka. */            'Teleprompter Pro — Video Çekim Sufle',
  'Teleprompter', 'Pro',
  /* Örnek senaryo metni: kullanıcı ilk açılışta bunu siliyor, arayüz değil. */
  'Merhaba! Bu Teleprompter Pro.',
  /* Dil düğmesinin kendi yazıları. 'TR' ve 'EN' iki dilde de AYNI görünür —
     kullanıcı hangi dilde olursa olsun kendi dilini adıyla aramalı.
     Telefon kabuğu da aynısını yapıyor (<button data-lang="tr">TR). */
  'TR', 'EN',
  /* Çalışma zamanında yazılan sayaç/etiketler — applyLang bunları EZERSE
     kullanıcı bayat değer görür, o yüzden i18n'lenmemeleri DOĞRU. */
  '0 kelime', '~0 sn', 'WPM',
];
/* Çalışma zamanında yazılan ögeler. data-i18n konsaydı applyLang dil
   değişince o değeri EZER ve kullanıcı bayat metin görür:
     modeV  <- curMode().name        (satır 1255)
     bandV  <- state.band+' satır'   (satır 1310)
   İkisi de kod tarafından basılıyor; çevirileri kendi üretim yerlerine
   bağlanmalı, işaretlemeye değil. Bu yüzden kapsam dışı — ELEME GEREKÇESİ. */
const CALISMA_ID = ['bilgiBas','camBtn','playBtn','recBtn','rrDownload','sbVer','voiceBtn',
                    'sbErr','wc','rt','modeV','bandV',
                    /* D.6 budama göstergeleri: trimGuncelle bunları her
                       kaydırmada yeniden yazıyor. data-i18n konsaydı
                       applyLang seçilen süreyi ezip bayat değer basardı. */
                    'rrTrimAV','rrTrimBV','rrTrimInfo'];

/* Kapsanmış ögelerin İÇİNİ maskele: data-i18n taşıyan bir öge ve altındaki
   her şey çevrilmiş sayılır. */
const maskele = (t) => {
  const d = /<(\w+)\b[^>]*\bdata-i18n="[^"]*"[^>]*>[\s\S]*?<\/\1>/;
  let g = 0;
  while (d.test(t) && g++ < 500) t = t.replace(d, (x) => ' '.repeat(x.length));
  return t;
};
/* Çalışma zamanı ögelerini de maskele. */
let maskeli = isaret;
for (const id of CALISMA_ID) {
  const d = new RegExp('<(\\w+)\\b[^>]*\\bid="' + id + '"[^>]*>[\\s\\S]*?<\\/\\1>');
  maskeli = maskeli.replace(d, (x) => ' '.repeat(x.length));
}
maskeli = maskele(maskeli);

const cozHtml = (x) => x.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
                        .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
const harfli = (x) => /[A-Za-zğüşıöçĞÜŞİÖÇ]/.test(x);

let eksik = [];
for (const m of maskeli.matchAll(/>([^<>]{2,})</g)) {
  const t = cozHtml(m[1]).replace(/\s+/g, ' ').trim();
  if (t.length < 2 || !harfli(t)) continue;
  if (ISTISNA.some(i => t.startsWith(i) || i.startsWith(t))) continue;
  eksik.push(t.slice(0, 50));
}
/* Öznitelikler: title / placeholder / aria-label */
const OZ = { title:'data-i18n-title', placeholder:'data-i18n-ph', 'aria-label':'data-aria' };
let ozSayi = 0;
for (const [oz, i18nOz] of Object.entries(OZ)) {
  for (const m of isaret.matchAll(new RegExp('<[^>]*\\b' + oz + '="([^"]{2,})"[^>]*>', 'gi'))) {
    if (!harfli(m[1])) continue;
    ozSayi++;
    if (!new RegExp('\\b' + i18nOz + '=').test(m[0])) eksik.push(oz + ': ' + m[1].slice(0, 40));
  }
}

const i18nli = (mac.match(/data-i18n="/g) || []).length;
console.log(`   Mac: ${i18nli} öge i18n'li · ${ozSayi} öznitelik taranmış · KAPSANMAYAN: ${eksik.length}`);
ok('ölçüt gerçekten tarıyor (ölçmeyen kapı değil)', i18nli > 50 && ozSayi > 20);

let taban = null;
try { taban = JSON.parse(fs.readFileSync(TABAN_YOL, 'utf8')).eksik; } catch (_) {}
if (taban === null) ok('taban ilk kez yazılıyor (' + eksik.length + ')', true);
else {
  ok(`kapsanmayan metin ARTMADI (taban ${taban} → ${eksik.length})`, eksik.length <= taban);
  if (eksik.length < taban) console.log('   ✓ taban sıkışıyor: ' + taban + ' → ' + eksik.length);
}
if (eksik.length) console.log('   örnek: ' + eksik.slice(0, 8).join(' · '));
/* Taban YALNIZ iyileşince yazılır; kötüleşince yazsaydı kapı kendini gevşetirdi. */
if (taban === null || eksik.length < taban) {
  try { fs.writeFileSync(TABAN_YOL, JSON.stringify({ eksik: eksik.length }, null, 1) + '\n'); }
  catch (e) { console.log('   (taban yazılamadı: ' + e.message + ')'); }
}

/* ---------- applyLang TÜRKÇEDE NO-OP MU ---------- */
{
  const soz = fs.readFileSync(path.join(REPO, 'cekirdek', 'sozluk.js'), 'utf8');
  (0, eval)(soz.replace('const I18N=', 'globalThis.__SUFLE_I18N='));
  const I = globalThis.__SUFLE_I18N;
  ok('sözlük okunabildi', !!I && !!I.tr && Object.keys(I.tr).length > 250);

  let uyusmaz = [];
  for (const m of isaret.matchAll(/<(button|summary|label|h[1-4]|option|legend)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    const k = (m[2].match(/\bdata-i18n="([\w]+)"/) || [])[1];
    if (!k) continue;
    const v = I.tr[k];
    if (v === undefined) { uyusmaz.push(k + ' (sözlükte yok)'); continue; }
    if (v !== m[3]) uyusmaz.push(`${k}: ${JSON.stringify(v)} != ${JSON.stringify(m[3])}`);
  }
  /* Öznitelikler için de aynı iddia: applyLang title/aria'yı da yazıyor. */
  for (const [oz, i18nOz] of Object.entries(OZ)) {
    for (const m of isaret.matchAll(new RegExp('<[^>]*\\b' + oz + '="([^"]*)"[^>]*\\b' + i18nOz + '="(\\w+)"[^>]*>', 'gi'))) {
      const v = I.tr[m[2]];
      if (v === undefined) { uyusmaz.push(m[2] + ' (sözlükte yok)'); continue; }
      if (v !== m[1]) uyusmaz.push(`${oz}/${m[2]}: ${JSON.stringify(v)} != ${JSON.stringify(m[1])}`);
    }
  }
  ok(`applyLang Türkçede hiçbir şeyi değiştirmiyor (uyuşmaz ${uyusmaz.length})`, uyusmaz.length === 0);
  uyusmaz.slice(0, 6).forEach(u => console.log('   ', u));
}

/* ---------- ALTYAPI GERÇEKTEN BAĞLI MI ---------- */
{
  const kod = (mac.match(/<script>([\s\S]*)<\/script>/) || ['', ''])[1];
  ok('Macte applyLang tanımlı', /function applyLang\(\)\{/.test(kod));
  /* Tanımlı ama çağrılmayan altyapı, olmayan altyapıdan KÖTÜDÜR: yapıldı sanılır. */
  ok('applyLang başlatmada ÇAĞRILIYOR', /^\s*applyLang\(\);/m.test(kod));
  ok('title ve aria da çevriliyor', /data-i18n-title/.test(kod) && /data-aria/.test(kod));
  ok('Macte sözlük gömülü', /\/\* ==CEKIRDEK:sozluk\.js== \*\//.test(mac));
  /* Dil OKUMASI ve YAZMASI birlikte gelmeli. Bugün ikisi de yok ve bu DOĞRU:
     yalnız okuma koymak yarım yapıdır, denetim.py "okunuyor ama yazılmıyor"
     diye yakaladı. Düğme geldiğinde okumanın `state.lang==='en'` biçiminde
     olması ZORUNLU — `!state.lang` eski kullanıcıyı bambaşka bir dala sokar
     (deponun 6 numaralı hata sınıfı). */
  const okur = /state\.lang/.test(kod), yazar = /state\.lang\s*=/.test(kod);
  ok('dil okuma ve yazma birlikte (ikisi de yok ya da ikisi de var)', okur === yazar);
  ok('dil okunuyorsa eski kayıtlara dayanıklı biçimde',
     !okur || /state\.lang===['"]en['"]/.test(kod));
  ok("kapsam sıfırlanmadan dil düğmesi EKLENMEMİŞ (yarım özellik yasak)",
     eksik.length === 0 || !/id="langSwitch"/.test(mac));
}

/* ---------- MESAJLAR DA ÇEVRİLİYOR MU (A.2c kalanı) ----------
   DENETİMDE BULUNDU (2026-08-15): Mac etiketlerde tam iki dilli ve dil
   düğmesi var, AMA toast mesajları hâlâ Türkçe sabit. Yani İngilizceye geçen
   Mac kullanıcısı düğmeleri İngilizce, uyarıları Türkçe görüyor — yarım
   özellik, deponun 1 numaralı hata sınıfı.

   Ölçüt kapsam.py ile aynı mantıkta: ÇEVRİLMEMİŞ MESAJ SAYISI, yüzde değil.
   Yeni sabit mesaj eklemek sayıyı ARTIRIR (kırmızı), sözlüğe bağlamak
   AZALTIR (taban sıkışır). Taban dosyası: tests/mac-mesaj-taban.json */
{
  const TABAN_MESAJ = path.join(REPO, 'tests', 'mac-mesaj-taban.json');
  const kodM = (mac.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];
  /* SAYAÇ İÇ PARANTEZE DAYANIKLI OLMALI. İlk yazımda desen `toast(` ile
     kapanış parantezi arasını "parantez içermeyen" diye tarıyordu; mesajlar
     m('anahtar') biçimine geçince toplam 73ten 17ye düştü ve sayaç kendi
     kendini kör etti. Artık `toast(` sayılıyor, sınıflandırma ise hemen
     SONRASINA bakılarak yapılıyor. */
  const cagri = [...kodM.matchAll(/toast\(/g)];
  /* Doğrudan tırnakla başlayan = çevrilmemiş. m( ile başlayan çevrilmiş. */
  const sabit = [...kodM.matchAll(/toast\('((?:[^'\\]|\\.)*)'/g)]
    .filter(c => /[A-Za-zğüşıöçĞÜŞİÖÇ]{3,}/.test(c[1]));
  console.log('   Mac toast: ' + cagri.length + ' · çevrilmemiş: ' + sabit.length);
  ok('toast çağrıları sayılabildi (ölçmeyen kapı değil)', cagri.length > 40);

  let tabanM = null;
  try { tabanM = JSON.parse(fs.readFileSync(TABAN_MESAJ, 'utf8')).cevrilmemis; } catch (_) {}
  if (tabanM === null) ok('mesaj tabanı ilk kez yazılıyor (' + sabit.length + ')', true);
  else {
    ok(`çevrilmemiş mesaj ARTMADI (taban ${tabanM} → ${sabit.length})`, sabit.length <= tabanM);
    if (sabit.length < tabanM) console.log('   ✓ taban sıkışıyor: ' + tabanM + ' → ' + sabit.length);
  }
  /* Taban YALNIZ iyileşince yazılır; kötüleşince yazsaydı kapı kendini
     gevşetir ve bir daha hiçbir şey yakalamazdı. */
  if (tabanM === null || sabit.length < tabanM) {
    try { fs.writeFileSync(TABAN_MESAJ, JSON.stringify({ cevrilmemis: sabit.length }, null, 1) + '\n'); }
    catch (e) { console.log('   (taban yazılamadı: ' + e.message + ')'); }
  }
  /* Dil düğmesi VARKEN mesajların çevrilmemiş olması yarım özelliktir.
     Sayı sıfırlanınca bu iddia da anlamını yitirir ve m() beklenir. */
  ok('mesajlar bittiğinde m() de tanımlı olmalı',
     sabit.length > 0 || /const m=k=>/.test(kodM));
}
