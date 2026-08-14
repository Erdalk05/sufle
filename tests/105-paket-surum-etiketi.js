const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');

/* J4 — YAYIN PAKETİ İKİNCİ SÜRÜMÜ DE İÇERMELİ Mİ (C1 İLE AYNI KARAR):
   HAYIR, İÇERMEMELİ — C1 kararı yerinde ve doğru. İkinci sürüm BAŞKA bir
   videonun metni; bu videonun paketine koymak yanıltıcı olurdu.

   AMA AYNI YERDE ÖLÜ BİR ÖLÇÜM ÇIKTI. Çekim başlarken `surum2` damgası
   alınıyordu ve HİÇBİR YERDE OKUNMUYORDU. Sonuç: iki sürümlü bir
   senaryoda pakete yalnız çekilen sürüm giriyor (doğru), ama paketin
   içinde HANGİ sürüm olduğu hiçbir yerde yazmıyordu. İki dilde çekim
   yapan biri iki paket indiriyor, ikisinin içinde de `senaryo.txt` var
   ve hangisinin hangi videoya ait olduğunu ancak metni okuyarak anlıyor.

   Ölçüm zaten yapılıyordu; artık işini yapıyor. Sürüm numarası ve dil
   ÇEKİM ANINDA damgalanıyor (C1 dersi: ayar çekimden sonra değişebilir,
   videonun içindekiler değişmez). Tek sürümlü senaryoda satır hiç
   çıkmıyor — gereksiz gürültü olurdu. */

/* ---------- C1 KARARI YERİNDE ---------- */
ok('pakete yalnız çekilen sürümün metni giriyor',
   /const s=cekimSenaryo\|\|active\(\);\s*\n\s*if\(s && \(s\.text\|\|''\)\.trim\(\)\) dosyalar\.push\(\{ad:'senaryo\.txt'/.test(kod));
ok('ikinci sürüm metni pakete hiç konmuyor', !/text2[^\n]*dosyalar\.push/.test(kod));
ok('yayın notu da çekilen senaryodan üretiliyor',
   /const s=cekimSenaryo\|\|active\(\)\|\|\{\}, ham=s\.text\|\|'';/.test(kod));

/* ---------- DAMGA ÇEKİM ANINDA ALINIYOR ---------- */
const mDamga=kod.match(/cekimSenaryo=_s \? \{[\s\S]*?\} : null;/);
ok('çekim damgası çıkarılabildi', !!mDamga);
if(!mDamga) return;
const d=mDamga[0];
ok('damga metnin KOPYASINI alıyor (sonradan düzenleme bozmasın)', /text:_s\.text\|\|''/.test(d));
ok('damga hangi sürüm olduğunu tutuyor', /surum2:!!_s\.surum2/.test(d));
ok('damga senaryonun iki sürümlü olup olmadığını tutuyor', /ikiSurumlu:!!\(_s\.text2\|\|''\)\.trim\(\)/.test(d));
ok('damga dili de tutuyor', /dil:_s\.dil\|\|''/.test(d));
ok('senaryo yoksa damga da yok', /: null;/.test(d));

/* ---------- DAMGA ARTIK OKUNUYOR (ÖLÜ DEĞİL) ---------- */
const mNot=kod.match(/function yayinNotu\(\)\{[\s\S]*?\n\}/);
ok('yayinNotu çıkarılabildi', !!mNot);
if(!mNot) return;
ok('yayın notu sürüm damgasını okuyor', /cekimSenaryo && cekimSenaryo\.ikiSurumlu \?/.test(mNot[0]));
ok('sürüm numarası yazılıyor', /cekimSenaryo\.surum2\?'2':'1'/.test(mNot[0]));
ok('dil varsa o da yazılıyor', /cekimSenaryo\.dil\?' \('\+dilAdi\(cekimSenaryo\.dil\)\+'\)':''/.test(mNot[0]));
ok('satır iki dilde', /Çekilen sürüm: /.test(tel) && /Version used: /.test(tel));
ok('pakette yalnız bu sürümün olduğu da söyleniyor',
   /pakette yalnız bu sürüm var/.test(tel) && /only this version is in the bundle/.test(tel));

/* ---------- GERÇEK NOTU KOŞTUR ---------- */
function not(damga){
  return new Function('__c', `
    const cekimSenaryo=__c; const L='tr'; const lastDur=42; const lastPath=null;
    const active=()=>cekimSenaryo||{text:''};
    const duzMetin=x=>x.replace(/^#{1,3}\\s*/gm,'');
    const clock=s=>String(s);
    const dilAdi=k=>({'tr-TR':'Türkçe','en-US':'English'})[k]||k;
    ${mNot[0]}
    return yayinNotu();
  `)(damga);
}
const METIN='# Baslik\nBir cumle. Iki cumle.';
{
  const r=not({title:'T', text:METIN, surum2:false, ikiSurumlu:true, dil:'tr-TR'});
  ok('iki sürümlü senaryoda satır ÇIKIYOR', /Çekilen sürüm: 1/.test(r));
  ok('dil adı okunur biçimde yazılıyor', /\(Türkçe\)/.test(r));
  ok('pakette yalnız bu sürümün olduğu yazıyor', /pakette yalnız bu sürüm var/.test(r));
}
{
  const r=not({title:'T', text:METIN, surum2:true, ikiSurumlu:true, dil:'en-US'});
  ok('ikinci sürümden çekildiyse 2 yazıyor', /Çekilen sürüm: 2 \(English\)/.test(r));
  ok('birinci sürüm yazmıyor', !/Çekilen sürüm: 1/.test(r));
}
{
  const r=not({title:'T', text:METIN, surum2:false, ikiSurumlu:false, dil:'tr-TR'});
  ok('TEK sürümlü senaryoda satır hiç çıkmıyor (gereksiz gürültü yok)', !/Çekilen sürüm/.test(r));
}
{
  const r=not({title:'T', text:METIN, surum2:true, ikiSurumlu:true, dil:''});
  ok('dil seçilmemişse yalnız sürüm numarası yazılıyor',
     /Çekilen sürüm: 2 — pakette yalnız bu sürüm var/.test(r));
  ok('boş parantez bırakılmıyor', !/\(\)/.test(r));
}
{
  ok('hiç çekim yapılmamışsa çökmüyor ve satır çıkmıyor',
     typeof not(null)==='string' && !/Çekilen sürüm/.test(not(null)));
}
{
  /* Notun asıl işi bozulmamalı — satır araya girdi, gerisi yerinde kalsın. */
  const r=not({title:'T', text:METIN, surum2:false, ikiSurumlu:true, dil:'tr-TR'});
  ok('not başlığı yerinde', /SUFLE YAYIN NOTU/.test(r));
  ok('süre ve kelime satırı yerinde', /Süre: /.test(r) && /Kelime: /.test(r));
  ok('başlık adayları yerinde', /BAŞLIK ADAYLARI/.test(r) && /1\) Baslik/.test(r));
  ok('açıklama taslağı yerinde', /AÇIKLAMA \(taslak\)/.test(r));
  ok('etiket adayları yerinde', /ETİKET ADAYLARI/.test(r));
  ok('sürüm satırı açıklamadan ÖNCE (üstte, göze çarpsın)',
     r.indexOf('Çekilen sürüm') < r.indexOf('AÇIKLAMA'));
  ok('yapay zekâ notu en sonda', r.trimEnd().endsWith('yapay zekâ kullanılmadı.'));
}
{
  /* İngilizce not da tam olmalı. */
  const rEn=new Function('__c', `
    const cekimSenaryo=__c; const L='en'; const lastDur=42; const lastPath=null;
    const active=()=>cekimSenaryo;
    const duzMetin=x=>x.replace(/^#{1,3}\\s*/gm,'');
    const clock=s=>String(s);
    const dilAdi=k=>({'tr-TR':'Türkçe','en-US':'English'})[k]||k;
    ${mNot[0]}
    return yayinNotu();
  `)({title:'T', text:METIN, surum2:true, ikiSurumlu:true, dil:'en-US'});
  ok('İngilizce notta da sürüm satırı var', /Version used: 2 \(English\)/.test(rEn));
  ok('İngilizce açıklama da yerinde', /only this version is in the bundle/.test(rEn));
}
