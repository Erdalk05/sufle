const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar,cekirdekOku}=require('./kaynak');
/* G.11: hesap cekirdek/tempo.jse taşındı (Mac de aynı sayıyı göstersin
   diye). Tezgâh çekirdeği de yüklüyor, yoksa çıkarılan sarmalayıcı
   tanımsız fonksiyon çağırır ve test KENDİ eksiğini bildirir. */
const TEMPO=cekirdekOku('tempo.js','SUFLE_TEMPO');
const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* TAHMİNİ SÜRE DURAKLAMALARI SAYMIYORDU
   Üç ayrı yerde de süre = kelime sayısı / wpm:
     · platform açıklaması ("sınıra uygun ✓" / "N sn FAZLA ✗")
     · hazırlık kontrolü ("~2:30 / sınır 3:00")
     · konuşulabilirlik denetimi ("sınırı N sn aşıyor")
   Ama sufle metindeki / // (2) işaretlerinde GERÇEKTEN duruyor (tick içindeki
   holdPoints) ve "nefes akışı" açıkken paragraf sonlarında 420 ms bekliyor.

   ÖLÇÜLDÜ (gerçek fonksiyonla):
     20 cümlelik, nefes işaretli metin (100 kelime, 140 wpm):
       eski tahmin 42,9 sn → gerçek 49,9 sn   = %16 sapma
     Bilinçli (3) duraklamalı kısa metin: 9 sn = 60 sn Reels sınırının %15'i

   Üstelik o / işaretlerini uygulamanın KENDİ "🫁 Nefes işareti" aracı koyuyor.
   Yani araç metni uzatıyor, tahmin bunu görmüyor, uygulama "sınıra uygun ✓"
   diyor ve kullanıcı sınırı aşan bir çekim yapıyor — kararı tam da bu sayıya
   bakarak verdiği hâlde. */

const D=(t,breathe=false)=>new Function('st',
  TEMPO+'\n'+cikar(kod,/function duraklamaSn\(t\)\{[\s\S]*?\n\}/,'duraklamaSn')+'; return duraklamaSn;')({breathe})(t);

/* ---------- İŞARET SÜRELERİ markup() İLE AYNI ---------- */
ok('/ = 0,35 sn', D('a / b') === 0.35);
ok('// = 0,8 sn', D('a // b') === 0.8);
ok('(2) = 2 sn', D('a (2) b') === 2);
ok('(1,5) virgüllü ondalık = 1,5 sn', D('a (1,5) b') === 1.5);
ok('(1.5) noktalı ondalık = 1,5 sn', D('a (1.5) b') === 1.5);
ok('(3s) sn ekli yazım = 3 sn', D('a (3s) b') === 3);
ok('aşırı uzun bekleme 10 sn ile sınırlı', D('a (60) b') === 10);
ok('birden çok işaret toplanıyor', D('a / b // c (2) d') === 0.35+0.8+2);

/* İşaret süreleri markup() ile AYNI kaynaktan olmalı; ayrışırsa gösterilen
   süre yine yalan olur. */
const mk=cikar(kod,/function markup\(raw\)\{[\s\S]*?\n\}/,'markup');
ok('markup da // için 800 ms kullanıyor', /data-ms="800"/.test(mk));
ok('markup da / için 350 ms kullanıyor', /data-ms="350"/.test(mk));
ok('markup da 10 sn tavanı uyguluyor', /Math\.min\(10000/.test(mk));

/* ---------- İŞARET OLMAYAN METİN ---------- */
ok('düz metinde duraklama yok', D('bu bir cümledir') === 0);
ok('boş metin çökertmiyor', D('') === 0 && D(null) === 0 && D(undefined) === 0);
/* Kelimeye yapışık eğik çizgi duraklama DEĞİL — markup da öyle sayıyor. */
ok('kelimeye yapışık / duraklama sayılmıyor', D('ve/veya') === 0);
ok('parantez içindeki metin duraklama sayılmıyor', D('(not) burada') === 0);
ok('rakamsız parantez duraklama sayılmıyor', D('(a) burada') === 0);

/* ---------- NEFES AKIŞI: PARAGRAF SONLARI ---------- */
{
  const par='Birinci paragraf.\n\nİkinci paragraf.\n\nÜçüncü paragraf.';
  ok('nefes akışı KAPALIYKEN paragraf beklemesi sayılmıyor', D(par,false) === 0);
  ok('nefes akışı AÇIKKEN paragraf başına 0,42 sn', Math.abs(D(par,true) - 0.84) < 1e-9);
}
ok('tek paragrafta bekleme yok', D('tek paragraf',true) === 0);
/* Metnin başındaki boş satır paragraf sonu değil — measure() de öyle sayıyor
   (i>0 koşulu). */
ok('baştaki boş satır sayılmıyor', D('\nmetin',true) === 0);

/* ---------- ASIL ETKİ: GERÇEKÇİ METİN ---------- */
{
  const nefesli=Array.from({length:20},()=>'Bu bir cümle örneğidir burada. /').join(' ');
  const ek=D(nefesli);
  ok('20 cümlelik nefes işaretli metin 7 sn duraklama ekliyor', Math.abs(ek-7) < 1e-9);
  const kelime=100, wpm=140, saf=kelime/wpm*60;
  ok('sapma %15 üstünde (görmezden gelinemez)', ek/saf > 0.15);
}
{
  const dram='Söyleyeceğim şey şu. (3) Hazır mısınız? (3) İşte böyle. (3)';
  ok('bilinçli duraklamalar 9 sn ediyor', D(dram) === 9);
  ok('60 sn sınırında bu sürenin %10 üstü', D(dram)/60 > 0.10);
}

/* ---------- ÜÇ TAHMİN DE DÜZELTİLDİ ----------
   Biri unutulursa aynı ekranda iki farklı süre görünür ve hangisinin doğru
   olduğu belli olmaz. */
const sayfa=kod;
/* DESENLER İDDİAYA GEVŞETİLDİ (G.11): hesap ortak çekirdeğe taşındı, yani
   formülün YAZILIŞI değişti ama iddia aynı — üç tahmin de duraklamayı
   hesaba katıyor. Bu tam da CLAUDE.mddeki "kodun biçimine değil iddiaya
   bağlan" kuralının vakası. */
ok('platform açıklamasında duraklama sayılıyor',
   /const secs=tahminiSure\(countWords\(_mt\), st\.wpm, duraklamaSn\(_mt\)\)/.test(sayfa));
ok('hazırlık kontrolünde duraklama sayılıyor',
   /const secs=wc\/st\.wpm\*60 \+ duraklamaSn\(_mt2\);/.test(sayfa));
ok('konuşulabilirlik denetiminde duraklama sayılıyor',
   /const secs=wc\/st\.wpm\*60 \+ duraklamaSn\(txt\)/.test(sayfa));
ok('duraklama saymayan eski tahmin kalmadı',
   !/const secs=(countWords\([^)]*\)|wc)\/st\.wpm\*60[,;]/.test(sayfa));

/* ---------- TAHMİN GERÇEKTEN KULLANILIYOR MU ---------- */
ok('sınır aşımı hazırlık kontrolünde bildiriliyor',
   /lim && secs>lim/.test(cikar(kod,/function readyChecks\(\)\{[\s\S]*?\n\}/,'readyChecks')));
ok('platform açıklaması sınıra uygunluk söylüyor', /sınıra uygun ✓/.test(sayfa));
