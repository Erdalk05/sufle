const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, macYolu, oku, cikar, repoOku} = require('./kaynak.js');

/* KESİLEN KLİBİN ALTYAZISI (2026-08-17, çekim sonrası zinciri denetlerken)

   Budama, klibi YENİ bir çekim olarak arşivliyor (kaynak korunuyor — o
   düzeltme 2026-08-16'da yapılmıştı). Ama çekimin kelime zamanları
   (`cekimAltyazi`) TAM ÇEKİME göreydi ve kesimden sonra hiç kaydırılmıyordu:

     30. saniyeden kesilen klip →  altyazı dosyası 30 saniye KAYIYOR
                                →  kesilip atılan bölümün satırları hâlâ içinde
                                →  yayın paketi de aynı dosyayı taşıyor

   Kimse uyarmıyor: .srt "çalışıyor" görünüyor, editörde tutmuyor. Deponun
   2 numaralı hata sınıfı — tam da gerektiği anda yanlış olan çıktı. Aynı
   veri klip önerilerini de besliyor; kaydırılmazsa klipteki öneriler
   videonun dışını gösterir.

   Kural: aralık dışı kelimeler atılır, içindekiler başlangıca kaydırılır,
   tam çekime dönülünce ESKİ zamanlar geri gelir. */

const cek = repoOku('cekirdek/altyazi.js','SUFLE_ALTYAZI');
const src = oku(telefonYolu());
const msrc = oku(macYolu());

/* ---------- İŞLEV KOŞARAK ---------- */
const kirp = new Function(cikar(cek, /function kirpAltyazi\(kelimeler, bas, bit\)\{[\s\S]*?\n\}/, 'kirpAltyazi')
                          + '; return kirpAltyazi;')();
{
  const k = [ {s:'bir', ln:0, t:1},   {s:'iki', ln:0, t:29.5},
              {s:'üç',  ln:1, t:30},  {s:'dört',ln:1, t:35.25},
              {s:'beş', ln:2, t:60},  {s:'altı',ln:2, t:90} ];
  const c = kirp(k, 30, 60);
  ok('aralık dışındaki kelimeler atılıyor', c.length===3);
  ok('zamanlar başlangıca kaydırılıyor', c[0].t===0 && c[1].t===5.25 && c[2].t===30);
  ok('metin ve satır bilgisi korunuyor', c[0].s==='üç' && c[0].ln===1);
  ok('kesim öncesi satırlar dosyada KALMIYOR', !c.some(w=>w.s==='bir'||w.s==='iki'));
  ok('kesim sonrası satırlar da atılıyor', !c.some(w=>w.s==='altı'));
}
{
  /* Zamanı olmayan kelime (okuma çizgisinden hiç geçmemiş) altyazı
     üretmiyor; metnin bütünlüğü için korunuyor ama zamanı null kalıyor. */
  const c = kirp([{s:'a',ln:0,t:null},{s:'b',ln:0,t:5}], 0, 10);
  ok('zamansız kelime korunuyor ama zamanı yok', c.length===2 && c[0].t===null);
}
{
  /* Aralıkta hiç zamanlı kelime yoksa BOŞ DİZİ değil null: boş dizi
     "altyazı verisi yok" sanılır ve kod ekrandaki metne düşüp YİNE
     yanlış zamanları kullanırdı. */
  const c = kirp([{s:'a',ln:0,t:1},{s:'b',ln:0,t:2}], 50, 60);
  ok('aralıkta altyazı yoksa null dönüyor (ekrandaki metne düşmesin)', c===null);
  ok('dizi olmayan girdi olduğu gibi dönüyor', kirp(null,0,1)===null);
}

/* ---------- İKİ KABUKTA DA BAĞLI MI ---------- */
for (const [ad, k, aralik] of [['telefon', src, 'trimA, trimB'], ['masaüstü', msrc, 'trimA, trimB']]) {
  ok(ad+': kesimde altyazı kırpılıyor',
     new RegExp('cekimAltyazi=kirpAltyazi\\(cekimAltyazi, '+aralik+'\\);').test(k));
  ok(ad+': kaynak altyazısı saklanıyor', /kesKaynak=\{blob:lastBlob[^}]*altyazi:cekimAltyazi/.test(k));
  ok(ad+': tam çekime dönünce altyazı geri geliyor',
     /if\(kesKaynak\.altyazi!==undefined\) cekimAltyazi=kesKaynak\.altyazi;/.test(k));
}
/* SIRALAMA KRİTİK: arşive yazma (autoSaveTake) kırpmadan SONRA olmalı,
   yoksa kayda eski zamanlar yazılır ve kusur arşivde kalıcılaşır. */
{
  const blok=(src.match(/cekimAltyazi=kirpAltyazi\([\s\S]{0,200}?autoSaveTake\(/)||[])[0];
  ok('telefon: kırpma arşive yazmadan ÖNCE yapılıyor', !!blok);
}

/* ---------- ARŞİVDEN AÇILAN ÇEKİMİ KESMEK (bileşik durum) ----------
   Kaynak arşiv kaydıysa altyazı ve senaryo BELLEKTE DEĞİL kayıttadır. Kesim
   sırasında bu göz ardı edilince kliple birlikte arşive yazılan üç alan
   birden yanlış oluyordu:
     · başlık  → o anda açık senaryonun adı (başka bir videonun adı)
     · senaryo → boş ya da BAŞKA çekimin anlık görüntüsü
     · altyazı → tam çekimin KAYDIRILMAMIŞ .srt'si (arsivKaynak hâlâ kuruluydu)
   Kendi düzeltmemin kardeş yolu: arşiv kaynağı eklenince kesme yolu
   güncellenmemişti. */
{
  const kaynak = oku(telefonYolu());
  ok('kesimde arşiv kaynağı belleğe alınıyor',
     /cekimAltyazi = arsivKaynak\.kelimeler \|\| cekimAltyazi;/.test(kaynak) &&
     /cekimSenaryo = arsivKaynak\.senaryo   \|\| cekimSenaryo;/.test(kaynak));
  ok('sonra arşiv kaynağı bırakılıyor (klip artık kendi çekimi)',
     /cekimSenaryo = arsivKaynak\.senaryo[\s\S]{0,120}?arsivKaynakSil\(\);/.test(kaynak));
  ok('kaynağın başlığı klibe taşınıyor',
     /const arsivBaslik = arsivKaynak && arsivKaynak\.senaryo/.test(kaynak) &&
     /await autoSaveTake\(arsivBaslik\);/.test(kaynak));
  ok('arşive yazarken başlık sırası: verilen → çekimin damgası → açık senaryo',
     /title:\(baslikUstu\|\|\(cekimSenaryo&&cekimSenaryo\.title\)\|\|active\(\)\.title\|\|''\)/.test(kaynak));
  /* SIRA KRİTİK: kaynak belleğe ALINMADAN kırpma yapılırsa, kırpma boş
     bellek üstünde çalışır ve arşive yine yanlış altyazı yazılır. */
  const sira = kaynak.indexOf('cekimAltyazi = arsivKaynak.kelimeler');
  const kirpma = kaynak.indexOf('cekimAltyazi=kirpAltyazi(cekimAltyazi, trimA, trimB)');
  ok('kaynak belleğe alma, kırpmadan ÖNCE', sira>0 && kirpma>sira);
}
