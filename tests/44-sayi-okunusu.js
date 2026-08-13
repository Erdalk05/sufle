const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* "SAYILARI YAZIYA ÇEVİR" ARACI OKUNAMAZ METİN ÜRETİYORDU
   Araç senaryoyu SESLİ OKUMAYA hazırlamak için var: kameraya bakarken rakam
   çevirmek tökezleme sebebi. Ama her rakam öbeğini AYRI AYRI çeviriyordu.
   Düzeltmeden önce ölçülen gerçek çıktılar:

     "1.500"      → "bir.beş yüz"                 (olması gereken: bin beş yüz)
     "1.250.000"  → "bir.iki yüz elli.sıfır"      (bir milyon iki yüz elli bin)
     "%12,5"      → "yüzde on iki,beş"            (yüzde on iki virgül beş)
     "14:30"      → "on dört:otuz"                (on dört otuz)
     "12,5%"      → "on iki,yüzde beş"            <-- EN PAHALISI

   Sonuncusunda yüzde işareti sayının YANLIŞ parçasına yapışıyor: kullanıcı
   kameraya "on iki, yüzde beş" diyor — söylemek istediğinden bambaşka bir
   iddia, üstelik metne bakınca doğru görünüyor. */

const sabitler=['ONES_TR','TENS_TR']
  .map(v=>cikar(kod,new RegExp('const '+v+'=\\[[^\\]]*\\];'),v)).join('\n');
const desen=cikar(kod,/const SAYI_DESEN = '[^']*';/,'SAYI_DESEN');
const govde=['tr3','trNum','sayiOku','numbersToWords']
  .map(f=>cikar(kod,new RegExp('function '+f+'\\([\\s\\S]*?\\n\\}'),f)).join('\n');
const cevir=new Function(sabitler+'\n'+desen+'\n'+govde+'; return numbersToWords;')();
const sayiOku=new Function(sabitler+'\n'+govde+'; return sayiOku;')();

/* ---------- ASIL HATALAR ---------- */
const VAKALAR=[
  ['%12,5',            'yüzde on iki virgül beş',      'yüzde + ondalık'],
  ['12,5%',            'yüzde on iki virgül beş',      'ondalık + yüzde (yüzde doğru parçaya yapışıyor)'],
  ['3,5 saniye',       'üç virgül beş saniye',         'ondalık virgülle okunuyor'],
  ['1.500 kişi',       'bin beş yüz kişi',             'binlik ayracı tek sayı sayılıyor'],
  ['1.250.000 TL',     'bir milyon iki yüz elli bin TL','milyonlu binlik ayracı'],
  ['saat 14:30',       'saat on dört otuz',            'saat iki parçaya bölünmüyor'],
  ['09:05',            'dokuz sıfır beş',              'dakikadaki baştaki sıfır okunuyor'],
  ['0,05 gram',        'sıfır virgül sıfır beş gram',  'ondalıkta baştaki sıfır ANLAMLI (değer 10 kat değişirdi)'],
];
for(const [girdi,beklenen,ad] of VAKALAR)
  ok(ad+' — "'+girdi+'"', cevir(girdi) === beklenen);

/* ---------- ZATEN DOĞRU OLANLAR BOZULMASIN ---------- */
const KORUNAN=[
  ['2026 yılı',   'iki bin yirmi altı yılı'],
  ['25 yaşında',  'yirmi beş yaşında'],
  ['%100',        'yüzde yüz'],
  ['0,5 litre',   'sıfır virgül beş litre'],
  ['100 %',       'yüzde yüz'],
  ['% 40',        'yüzde kırk'],
];
for(const [girdi,beklenen] of KORUNAN)
  ok('bozulmadı — "'+girdi+'"', cevir(girdi) === beklenen);

/* ---------- ÇEVİRİLEMEYEN SAYI OLDUĞU GİBİ KALIR ----------
   trNum milyarın üstünü çevirmiyor. Yarım çeviri ("bin milyar" gibi saçma bir
   çıktı) rakamın kendisinden daha kötü olurdu — dokunulmuyor. */
ok('9 haneden büyük sayı bozulmadan bırakılıyor',
   cevir('12.345.678.901 çok büyük') === '12.345.678.901 çok büyük');
ok('çevrilemeyen sayı için sayiOku null diyor (sessizce yanlış üretmiyor)',
   sayiOku('12345678901') === null);

/* ---------- METNİN GERİ KALANINA DOKUNULMUYOR ---------- */
ok('rakamsız metin hiç değişmiyor',
   cevir('Merhaba, bugün hava çok güzel.') === 'Merhaba, bugün hava çok güzel.');
ok('birden çok sayı aynı cümlede çevriliyor',
   cevir('12,5 ve 1.500') === 'on iki virgül beş ve bin beş yüz');
ok('sayının etrafındaki noktalama korunuyor',
   cevir('(25)') === '(yirmi beş)');

/* ---------- BİRİM TESTLERİ: sayiOku ---------- */
ok('sayiOku binlik ayracını çözüyor', sayiOku('1.500') === 'bin beş yüz');
ok('sayiOku ondalığı virgülle söylüyor', sayiOku('12,5') === 'on iki virgül beş');
ok('sayiOku ondalıkta baştaki sıfırı rakam rakam okuyor',
   sayiOku('0,05') === 'sıfır virgül sıfır beş');
ok('sayiOku baştaki sıfır YOKSA kesri sayı gibi okuyor',
   sayiOku('12,55') === 'on iki virgül elli beş');
ok('sayiOku tam sayıda virgül demiyor', sayiOku('25') === 'yirmi beş');

/* ---------- SIRA ÖNEMLİ ----------
   Saat, yüzdeden ve düz sayıdan ÖNCE işlenmeli; yüzde de düz sayıdan önce.
   Sıra bozulursa "14:30" iki parçaya bölünür ya da yüzde yarım sayıya yapışır. */
const ntw=cikar(kod,/function numbersToWords\(t\)\{[\s\S]*?\n\}/,'numbersToWords');
const iSaat=ntw.indexOf(':(');            // saat deseni
const iYuzde=ntw.indexOf("'%");           // yüzde deseni
const iDuz=ntw.lastIndexOf('SAYI_DESEN'); // düz sayı çevirimi (en son geçiş)
ok('saat deseni kodda var', iSaat >= 0);
ok('yüzde deseni kodda var', iYuzde >= 0);
ok('saat, yüzdeden ÖNCE işleniyor (yoksa 14:30 iki sayıya bölünür)', iSaat < iYuzde);
ok('yüzde, düz sayıdan ÖNCE işleniyor (yoksa yüzde yarım sayıya yapışır)', iYuzde < iDuz);
ok('yüzde deseni sayının TAMAMINI kapsıyor (SAYI_DESEN kullanıyor)',
   ntw.slice(iYuzde, iYuzde+40).includes('SAYI_DESEN'));

/* ---------- ARAÇ GERÇEKTEN BAĞLI MI ----------
   "yazıldı ama düğmeye bağlı değil" sınıfı bu depoda birden çok kez çıktı. */
ok('araç bir düğmeye bağlı', /\$\('#tNum'\)\.onclick=\(\)=>applyTool\(numbersToWords/.test(kod));

/* ---------- MAC PARİTESİ ----------
   Aynı hata Mac'te birebir vardı: aynı üç satırlık eski sürüm. Masaüstünde
   uzun metinler yazılıyor, sayılar oradan giriyor. */
const mac=oku(require('./kaynak').macYolu()).replace(/\/\*[\s\S]*?\*\//g,'');
const macSab=['ONES_TR','TENS_TR']
  .map(v=>cikar(mac,new RegExp('const '+v+'=\\[[^\\]]*\\];'),v)).join('\n');
const macCevir=new Function(
  macSab+'\n'+cikar(mac,/const SAYI_DESEN = '[^']*';/,'mac SAYI_DESEN')+'\n'+
  ['tr3','trNum','sayiOku','numbersToWords']
    .map(f=>cikar(mac,new RegExp('function '+f+'\\([\\s\\S]*?\\n  \\}'),'mac '+f)).join('\n')+
  '; return numbersToWords;')();
for(const [girdi,beklenen] of [
  ['12,5%','yüzde on iki virgül beş'],
  ['1.250.000 TL','bir milyon iki yüz elli bin TL'],
  ['saat 14:30','saat on dört otuz'],
  ['0,05 gram','sıfır virgül sıfır beş gram'],
]) ok('Mac de doğru — "'+girdi+'"', macCevir(girdi) === beklenen);
ok('araç tek adımlık geri alma sunuyor', /undoText=cur;/.test(cikar(kod,/function applyTool\([\s\S]*?\n\}/,'applyTool')));
