const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const src=oku(telefonYolu());
const jsHam=src.match(/<script>([\s\S]*)<\/script>/)[1];
const L='tr';

/* TÜRKÇE TELAFFUZ TOLERANSI
   Erdal: "her zaman her kelime doğru telaffuz edilmeyebilir".
   Ölçtüm: eski karşılaştırma gerçekçi Türkçe çiftlerin %40'ını yakalıyordu ve
   ünsüz yumuşamasının TAMAMINI kaçırıyordu. Bu dosya hem YAKALAMAYI hem
   YANLIŞ EŞLEŞMEYİ kilitliyor — biri olmadan diğeri anlamsız. */
eval(cikar(jsHam,/const FOLD=\{[^}]*\};/,'FOLD').replace('const','var'));
eval(cikar(jsHam,/function norm\(x\)\{[\s\S]*?FOLD\[c\]\|\|c\); \}/,'norm'));
eval(cikar(jsHam,/function yumusat\(x\)\{[^\n]*\}/,'yumusat'));
eval(cikar(jsHam,/function ortakOnek\(a,b\)\{[\s\S]*?\n\}/,'ortakOnek'));
eval(cikar(jsHam,/function birHata\(a,b\)\{[\s\S]*?\n\}/,'birHata'));
eval(cikar(jsHam,/function wordEq\(nw,tok\)\{[\s\S]*?\n\}/,'wordEq'));
const es=(a,b)=>wordEq(norm(a),norm(b));

// ---------- ÜNSÜZ YUMUŞAMASI: Türkçe'nin en yaygın ses olayı ----------
[['kitabı','kitap'],['ağacı','ağaç'],['kanadı','kanat'],['bardağı','bardak'],
 ['rengi','renk'],['ucu','uç'],['dibi','dip'],['ceviz','cevizi']]
 .forEach(([a,b])=>ok('yumuşama: '+a+' ↔ '+b, es(a,b)));

// ---------- EK FARKLARI ----------
[['okuyorum','okuyor'],['geliyoruz','geliyor'],['anlatacağım','anlatacak'],
 ['deneyimlerime','deneyimler'],['yapıyorum','yapıyom'],
 ['istiyorum','istiyom']]
 .forEach(([a,b])=>ok('ek farkı: '+a+' ↔ '+b, es(a,b)));

// ---------- TANIYICI YANILMASI ----------
[['değil','deil'],['bahsedeceğim','bahsedecem'],['geldiğinde','geldiginde'],
 ['arkadaşlar','arkadaslar'],['göründüğü','gorundugu'],['çok','cok'],['şey','sey']]
 .forEach(([a,b])=>ok('yanılma: '+a+' ↔ '+b, es(a,b)));

// söylemek/söyleyeceğim kasten çıkarıldı: o bir YENİDEN İFADE, telaffuz farkı
// değil. Onu yakalamak için gereken gevşeklik 'kırkbeş/kırkyedi'yi de eşleştiriyordu.
// Yeniden ifade zaten geniş arama kurtarmasının işi.

// ---------- YANLIŞ EŞLEŞMEMELİ (bu olmadan yukarısı anlamsız) ----------
[['kırkbeş','kırkyedi'],['yirmibir','yirmiiki'],['bir','bin'],['gel','gör'],['kitap','kitle'],['sonra','sonuç'],['deniz','demir'],
 ['yapmak','yatmak'],['bu','şu'],['dört','dert'],['kalem','kalın'],['güzel','gizli'],
 ['hayat','hayal'],['salı','sarı'],['beş','baş'],['yol','yıl']]
 .forEach(([a,b])=>ok('AYIRIYOR: '+a+' ≠ '+b, !es(a,b)));

// ---------- KURALLARIN KENDİSİ ----------
ok('yumuşama b→p, d→t, g→k', yumusat('bdg')==='ptk');
ok('yumuşama diğer harflere dokunmuyor', yumusat('kalem')==='kalem');
ok('ortak önek doğru sayıyor', ortakOnek('kitap','kitle')===3);
ok('ortak önek eşitte tam uzunluk', ortakOnek('abc','abc')===3);
ok('tek hata: harf düşmesi', birHata('kalem','kalm'));
ok('tek hata: harf eklenmesi', birHata('kalm','kalem'));
ok('tek hata: harf değişimi', birHata('kalem','kalom'));
ok('iki hata reddediliyor', !birHata('kalem','kolom'));
ok('uzunluk farkı 2 reddediliyor', !birHata('kalem','kal'));
ok('boş kelimeler çökertmiyor', birHata('','')===true);

// ---------- TELAFFUZ İPUCU EŞLEŞTİRMEYE KATILIYOR ----------
ok('buildNorm ipucunu okuyor', /w\.dataset\.ph \? norm\(w\.dataset\.ph\.replace/.test(jsHam));
ok('ipucundaki tireler atılıyor', /replace\(\/-\/g,''\)/.test(jsHam));
ok('eşleştirme ipucu biçimini de deniyor', /nw\.ph && wordEq\(nw\.ph,recent\[j\]\)/.test(jsHam));
// davranış: "Nietzsche{ni-çe}" yazıp "niçe" dersen
const ph=norm('ni-çe'.replace(/-/g,''));
ok('ipucu üzerinden eşleşiyor', wordEq(ph, norm('niçe')));
ok('yazılı biçim tek başına eşleşmiyordu', !wordEq(norm('Nietzsche'), norm('niçe')));

// ---------- OKUNAN SATIR SOLUK KALIYORDU (v8.4, tarayıcıda ölçüldü) ----------
// Ölçüm: okuma çizgisindeki satırın saydamlığı 0.55, altındaki OKUNMAMIŞ
// satırlar 1.0. Yani baktığın satır soluk, bakmadığın satırlar parlaktı.
// Sebep: 'done' (okundu) etiketi aktif kelimeye de veriliyordu.
ok('aktif kelime solduruluyor değil (ileri)', /for\(let i=Math\.max\(0,activeIdx\);i<idx;i\+\+\)/.test(jsHam));
ok('geri sarmada aktif kelimenin soldurması kalkıyor', /for\(let i=idx;i<=activeIdx;i\+\+\)/.test(jsHam));
// davranış: hangi kelimeler 'done' olur
function done(activeIdx, idx){
  const s=new Set();
  if(idx>activeIdx){ for(let i=Math.max(0,activeIdx);i<idx;i++) s.add(i); }
  return [...s];
}
ok('baştan ilk kelimeye geçişte hiçbiri okunmuş sayılmıyor', done(-1,0).length===0);
ok('üçüncü kelimede yalnız ilk ikisi okunmuş', JSON.stringify(done(0,3))==='[0,1,2]');
ok('aktif kelime listede yok', !done(0,3).includes(3));
