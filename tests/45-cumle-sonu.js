const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar, metinCekirdegi}=require('./kaynak');

/* ALTYAZI KUYRUKLARI KISALTMALARDA ORTASINDAN KESİLİYORDU
   Kuyruk bölme ölçütlerinden biri "önceki kelime cümle sonu mu": kural
   /[.!?…:;]["')\]]?$/ idi, yani NOKTAYLA BİTEN HER KELİME cümle sonu sayılıyordu.
   Türkçede nokta cümleyi bitirmek zorunda değil:
     · kısaltmalar — vb. vs. Dr. Sn. Prof. no.
     · sıra sayıları — 3. 12.
     · nokta içeren kısaltmalar — T.C. A.Ş.

   Ölçüm (düzeltmeden önce), tek bir cümlede:
     "…ışık vb. donanımlar 3. nesil… Dr. Ayşe Sn. Mehmet ile T.C. kimlik no. …"
     cümle sonu sayılanlar: vb. | 3. | Dr. | Sn. | T.C. | no. | edildi.
     → 6 YANLIŞ kırılma, 1 doğru.

   Sonuç: ekranda tek kelimelik "vb." altyazı kutucukları; canlı altyazı
   önizlemesi de (liveCue) aynı yerden kırpılıyordu. Altyazı bu ürünün
   yayımlanan çıktısı — her videoda görünüyor. */

function kur(kaynak, ad){
  const kod=oku(kaynak).replace(/\/\*[\s\S]*?\*\//g,'');
  /* PAYLAŞILAN ARAÇ ÇEKİRDEKTEN. Kabuktan çıkarmak girintiye kilitlenmekti
     (Mac 2 boşluk, telefon 0) ve Tur 46'da tam bu yüzden kırıldı. Kabukların
     AYNI kodu gömdüğü ayrıca sınanıyor (aşağıda). */
  const cek=metinCekirdegi();
  const set=cikar(cek,/const KISALTMA=new Set\(\[[\s\S]*?\]\);/, 'KISALTMA');
  const fn=cikar(cek,/function sentenceEnd\(s\)\{[\s\S]*?\n\}/, 'sentenceEnd');
  return new Function(set+'\n'+fn+'; return sentenceEnd;')();
}
const se=kur(telefonYolu(),'telefon');

/* ---------- CÜMLEYİ GERÇEKTEN BİTİRENLER ---------- */
for(const w of ['bitti.','Neden?','Harika!','sonra…','şöyle:','önce;','yaptı.'])
  ok('cümleyi bitiriyor — "'+w+'"', se(w) === true);
/* Tırnak/parantez kapanışı noktalamadan SONRA gelebilir; eski kural bunu
   zaten gözetiyordu, bozulmasın. */
for(const w of ['"bitti."','(bitti.)',"'bitti.'",'[bitti.]'])
  ok('kapanış işaretiyle de bitiriyor — '+w, se(w) === true);

/* ---------- BİTİRMEMESİ GEREKENLER ---------- */
for(const w of ['vb.','vs.','vd.','bkz.','örn.','Dr.','Doç.','Prof.','Sn.','Av.','no.','Tel.','Cad.','Mah.'])
  ok('kısaltma cümleyi bitirmiyor — "'+w+'"', se(w) === false);
for(const w of ['1.','3.','12.','2026.'])
  ok('sıra sayısı cümleyi bitirmiyor — "'+w+'"', se(w) === false);
for(const w of ['T.C.','A.Ş.','M.Ö.'])
  ok('noktalı kısaltma cümleyi bitirmiyor — "'+w+'"', se(w) === false);

/* Büyük/küçük harf farkı olmamalı: kullanıcı "VB." ya da "dr." yazabilir. */
ok('kısaltma büyük harfle de tanınıyor', se('VB.') === false);
ok('kısaltma küçük harfle de tanınıyor', se('dr.') === false);
/* Türkçe I/İ tuzağı: "SN." küçültülünce 'sn' olmalı, 'sn' kalmalı. */
ok('Türkçe küçültme doğru — "SN."', se('SN.') === false);

/* ---------- SINIR DURUMLARI ---------- */
ok('noktalama yoksa bitirmiyor', se('kelime') === false);
ok('boş girdi çökertmiyor', se('') === false);
ok('yalnız nokta bitirir sayılıyor (tek karakter)', se('.') === true);
/* Kısaltmaya BENZEYEN ama olmayan kelime normal davranmalı. */
ok('kısaltma listesinde olmayan kelime cümleyi bitiriyor', se('kamera.') === true);
ok('kısaltma listesindeki kelime nokta OLMADAN cümle sonu değil', se('vb') === false);

/* ---------- ASIL ÖLÇÜM: TAM CÜMLE ---------- */
const CUMLE='Bu üründe kamera, mikrofon, ışık vb. donanımlar 3. nesil teknolojiyle '+
            'çalışıyor ve Dr. Ayşe Sn. Mehmet ile T.C. kimlik no. üzerinden test edildi.';
const kirilma=CUMLE.split(/\s+/).filter(w=>se(w));
ok('örnek cümlede TEK kırılma kaldı (önceden 7 idi)', kirilma.length === 1);
ok('kalan kırılma gerçek cümle sonu', kirilma[0] === 'edildi.');

/* ---------- İKİ KULLANIM YERİ DE AYNI KURALI KULLANIYOR ----------
   Altyazı dosyası ve canlı altyazı önizlemesi ayrışırsa kullanıcı ekranda
   gördüğüyle dosyada bulduğu farklı olur. */
const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');
ok('altyazı kuyruğu bu kuralı kullanıyor',
   /sentenceEnd\(cur\.words\[cur\.words\.length-1\]\)/.test(cikar(kod,/function buildCues\(\)\{[\s\S]*?\n\}/,'buildCues')));
ok('canlı altyazı önizlemesi de aynı kuralı kullanıyor',
   /sentenceEnd\(p2\.textContent\)/.test(cikar(kod,/function liveCue\(\)\{[\s\S]*?\n\}/,'liveCue')));

/* ---------- MAC PARİTESİ ---------- */
const seMac=kur(macYolu(),'Mac');
for(const [w,b] of [['vb.',false],['3.',false],['T.C.',false],['Dr.',false],['bitti.',true],['Neden?',true]])
  ok('Mac de aynı — "'+w+'"', seMac(w) === b);
ok('Mac örnek cümlede de tek kırılma', CUMLE.split(/\s+/).filter(w=>seMac(w)).length === 1);
