const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {macYolu, oku, REPO}=require('./kaynak.js');

/* A.2b — MAC i18n KAPSAM KAPISI.

   Mac bugüne dek Türkçeye gömülüydü (data-i18n sayısı 0). Artık sözlüğü
   telefonla PAYLAŞIYOR. Ama iş yarım: bazı etiketler hâlâ i18n'siz.

   ⚠️ DİL DÜĞMESİ BİLEREK EKLENMEDİ. Yarı İngilizce bir arayüz, hiç İngilizce
   olmamasından KÖTÜDÜR: kullanıcı özelliğin bozuk olduğunu sanar ve bu
   deponun 1 numaralı hata sınıfına ("yarım kalmış düzeltme") girer.
   Düğme, aşağıdaki sayaç SIFIRA inince eklenecek.

   ÖLÇÜT BİLEREK "i18n'siz etiket SAYISI", yüzde değil — kapsam.py'de gerekçesi
   ölçülerek seçilen ölçütün aynısı: yüzde, etiket SİLİNCE de yükselir ve
   iyileşme sanılır. Sayı ise yeni i18n'siz etiket eklenince ARTAR (kırmızı),
   çevrilince AZALIR (taban sıkışır).

   İKİNCİ VE ASIL İDDİA: applyLang Türkçede HİÇBİR ŞEYİ DEĞİŞTİRMEMELİ.
   İşaretlemedeki metin sözlükteki TR değeriyle birebir aynı olmalı; değilse
   kullanıcı dili hiç değiştirmediği hâlde etiketlerin oynadığını görür. */

const TABAN_YOL = path.join(REPO, 'tests', 'mac-i18n-taban.json');
const mac = oku(macYolu());
const isaret = mac.replace(/<script[\s\S]*?<\/script>/gi, ' ')
                  .replace(/<style[\s\S]*?<\/style>/gi, ' ');

/* Çalışma zamanında yazılan etiketlere data-i18n KONMAZ: applyLang dil
   değişince o değeri ezer ve kullanıcı bayat metin görür. Ölçüldü, 7 tane. */
const CALISMA = new Set(['bilgiBas','camBtn','playBtn','recBtn','rrDownload','sbVer','voiceBtn']);

const OGE = /<(button|summary|label|h[1-4]|option|legend)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const duz = x => x.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

let toplam = 0, i18nli = 0, eksik = [];
for (const m of isaret.matchAll(OGE)) {
  const oz = m[2], ic = m[3];
  if (/<[a-z]/i.test(ic)) continue;             // iç içe öge: ayrı iş
  const metin = duz(ic);
  if (metin.length < 2) continue;
  if (!/[A-Za-zğüşıöçĞÜŞİÖÇ]/.test(metin)) continue;  // "9:16", "45" gibi saf simge
  const idm = oz.match(/\bid="([\w-]+)"/);
  if (idm && CALISMA.has(idm.group ? idm.group(1) : idm[1])) continue;
  toplam++;
  if (/\bdata-i18n=/.test(oz)) i18nli++;
  else eksik.push(metin.slice(0, 46));
}

/* ⚠️ ÖZNİTELİKLER DE SAYILIR — ilk yazımda sayılmıyordu ve ölçüt "0 eksik"
   diyerek dil düğmesini AÇMAYA yeşil ışık yakıyordu. Oysa Mac'te 28 çevrilmemiş
   metin duruyordu: 20 `title`, 2 `placeholder`, 6 `aria-label`. Kullanıcı
   İngilizceye geçse düğme yazıları İngilizce, ipuçları Türkçe olurdu; ekran
   okuyucu kullanan biri arayüzün TAMAMINI Türkçe duyardı.
   Dar ölçüt = ölçmeyen kapı; bu deponun en pahalı sınıfı. */
const OZNITELIK = { title: 'data-i18n-title', placeholder: 'data-i18n-ph', 'aria-label': 'data-aria' };
let ozToplam = 0;
for (const [oz, i18nOz] of Object.entries(OZNITELIK)) {
  const re = new RegExp('<[^>]*\\b' + oz + '="([^"]{2,})"[^>]*>', 'gi');
  for (const m of isaret.matchAll(re)) {
    if (!/[A-Za-zğüşıöçĞÜŞİÖÇ]/.test(m[1])) continue;
    ozToplam++;
    if (new RegExp('\\b' + i18nOz + '=').test(m[0])) i18nli++;
    else eksik.push(oz + ': ' + m[1].slice(0, 38));
  }
}
toplam += ozToplam;

console.log(`   Mac görünür metin: ${toplam} (${ozToplam} öznitelik) · i18n'li: ${i18nli} · eksik: ${eksik.length}`);
ok('Mac etiketleri sayılabildi (ölçmeyen kapı değil)', toplam > 40);
ok('öznitelikler de sayılıyor (dar ölçüt kapıyı kör eder)', ozToplam > 10);

let taban = null;
try { taban = JSON.parse(fs.readFileSync(TABAN_YOL, 'utf8')).eksik; } catch (_) {}
if (taban === null) {
  ok('taban ilk kez yazılıyor (' + eksik.length + ')', true);
} else {
  ok(`i18n'siz etiket sayısı ARTMADI (taban ${taban} → ${eksik.length})`, eksik.length <= taban);
  if (eksik.length < taban) console.log('   ✓ taban sıkışıyor: ' + taban + ' → ' + eksik.length);
}
if (eksik.length) console.log('   eksik olanlar: ' + eksik.slice(0, 10).join(' · '));

/* Taban yalnız İYİLEŞİNCE yazılır. Kötüleşince yazılsaydı kapı kendini
   gevşetir ve bir daha hiçbir şey yakalamazdı. */
if (taban === null || eksik.length < taban) {
  try { fs.writeFileSync(TABAN_YOL, JSON.stringify({ eksik: eksik.length }, null, 1) + '\n'); }
  catch (e) { console.log('   (taban yazılamadı: ' + e.message + ')'); }
}

/* ---------- applyLang TÜRKÇEDE NO-OP MU ---------- */
{
  const sozYolu = path.join(REPO, 'cekirdek', 'sozluk.js');
  const soz = fs.readFileSync(sozYolu, 'utf8');
  /* Dolaylı eval GENEL kapsamda koşar; yerel `kap` oradan görünmez ve
     "kap is not defined" verir. globalThis üstünden geçiyoruz. */
  (0, eval)(soz.replace('const I18N=', 'globalThis.__SUFLE_I18N='));
  const I = globalThis.__SUFLE_I18N;
  ok('sözlük okunabildi', !!I && !!I.tr && Object.keys(I.tr).length > 200);

  let bagli = 0, uyusmaz = [];
  for (const m of isaret.matchAll(OGE)) {
    const k = (m[2].match(/\bdata-i18n="([\w]+)"/) || [])[1];
    if (!k) continue;
    bagli++;
    const v = I.tr[k];
    if (v === undefined) { uyusmaz.push(k + ' (sözlükte yok)'); continue; }
    if (v !== m[3]) uyusmaz.push(`${k}: sözlük ${JSON.stringify(v)} != işaretleme ${JSON.stringify(m[3])}`);
  }
  ok('data-i18n bağlı öge sayıldı (' + bagli + ')', bagli > 50);
  ok(`applyLang Türkçede hiçbir şeyi değiştirmiyor (uyuşmaz ${uyusmaz.length})`, uyusmaz.length === 0);
  uyusmaz.slice(0, 6).forEach(u => console.log('   ', u));
}

/* ---------- ALTYAPI GERÇEKTEN BAĞLI MI ---------- */
{
  const kod = (mac.match(/<script>([\s\S]*)<\/script>/) || ['', ''])[1];
  ok('Macte applyLang tanımlı', /function applyLang\(\)\{/.test(kod));
  /* Tanımlı ama çağrılmayan altyapı, olmayan altyapıdan KÖTÜDÜR: yapıldı
     sanılır. Çağrının varlığı ayrıca sınanıyor. */
  ok('applyLang başlatmada ÇAĞRILIYOR', /^\s*applyLang\(\);/m.test(kod));
  ok('Macte sözlük gömülü', /\/\* ==CEKIRDEK:sozluk\.js== \*\//.test(mac));
  /* Düğme henüz olmamalı — yarım özellik yayınlanmasın. Sayaç sıfırlanınca
     bu iddia bilinçli olarak değiştirilecek. */
  ok("i18n eksiği varken dil düğmesi EKLENMEMİŞ (yarım özellik yasak)",
     eksik.length === 0 || !/id="langSwitch"/.test(mac));
}
