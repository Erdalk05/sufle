const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* YAPIŞTIRILAN METİNDEKİ GÖRÜNMEZ KARAKTERLER
   Senaryolar neredeyse hep başka bir yerden yapıştırılıyor — ürünün ana girdi
   yolu bu. `stripInvisible` sıfır genişlik ve kırılmayan boşluğu temizliyordu
   ama BEŞ SINIF KAÇIYORDU. Gerçek fonksiyon koşturularak ölçüldü:

     U+00AD  yumuşak tire   "mer<AD>haba" ekranda "merhaba" görünür ama
                            UZUNLUĞU 8'DİR (ölçüldü) → sesle takip kelimeyi
                            eşleştiremez, karakter ALTYAZI dosyasına girer.
     U+2028  satır ayracı   \n değil; split(/\r?\n/) TEK PARÇA döndürüyordu
     U+2029  paragraf ayr.  (ölçüldü) → iki paragraf tek satır oluyor ve sufle
                            tek dev satır gösteriyor.
     U+200E/200F, U+202A-202E, U+2066-2069  yön denetimleri → görünmez, altyazıya sızar.

   Bunlar kozmetik değil: ikisi doğrudan sesle takibi ve yayımlanan .srt
   dosyasını bozuyor.

   NOT: bu dosyada görünmez karakterler YALNIZ kaçış diziyle yazılıyor. Literal
   U+2028 JavaScript'te satır sonu sayılır ve kaynağı kırar — bu turda tam
   olarak öyle oldu. */

const C=n=>String.fromCharCode(n);
const strip=new Function(
  cikar(kod,/function stripInvisible\(x\)\{[\s\S]*?\n\}/,'stripInvisible')+'; return stripInvisible;')();
const GORUNMEZ=new RegExp('[\\u00AD\\u200B-\\u200F\\u2028\\u2029\\u202A-\\u202E\\u2060\\u2066-\\u2069\\uFEFF]');

/* ---------- HİÇBİRİ GEÇMİYOR ---------- */
const SINIFLAR=[
  ['yumuşak tire U+00AD',            'mer'+C(0x00AD)+'haba'],
  ['sıfır genişlik U+200B',          'a'+C(0x200B)+'b'],
  ['ZWNJ U+200C',                    'a'+C(0x200C)+'b'],
  ['ZWJ U+200D',                     'a'+C(0x200D)+'b'],
  ['LTR işareti U+200E',             'a'+C(0x200E)+'b'],
  ['RTL işareti U+200F',             'a'+C(0x200F)+'b'],
  ['kelime birleştirici U+2060',     'a'+C(0x2060)+'b'],
  ['yön gömme U+202A',               C(0x202A)+'metin'+C(0x202C)],
  ['yön geçersiz kılma U+202D',      C(0x202D)+'metin'+C(0x202C)],
  ['yön yalıtımı U+2066',            C(0x2066)+'metin'+C(0x2069)],
  ['BOM U+FEFF',                     C(0xFEFF)+'metin'],
];
for(const [ad,girdi] of SINIFLAR)
  ok(ad+' temizleniyor', !GORUNMEZ.test(strip(girdi)));

/* ---------- ASIL ETKİ: KELİME BÜTÜNLÜĞÜ ---------- */
ok('yumuşak tireli kelime tam uzunlukta ("merhaba" = 7)',
   strip('mer'+C(0x00AD)+'haba').length === 7);
ok('yumuşak tireli kelime doğru okunuyor', strip('mer'+C(0x00AD)+'haba') === 'merhaba');
/* Sesle takip kelimeyi normalleştirip eşleştiriyor; görünmez karakter kalırsa
   eşleşme hiç tutmaz. */
{
  const norm=s=>String(s).toLocaleLowerCase('tr').replace(/[^a-zçğıöşü]/g,'');
  ok('temizlenmiş kelime sesle takip için eşleşebilir',
     norm(strip('mer'+C(0x00AD)+'haba')) === 'merhaba');
}

/* ---------- ASIL ETKİ: SATIR BÖLÜNMESİ ---------- */
ok('U+2028 gerçek satır sonuna çevriliyor',
   JSON.stringify(strip('birinci'+C(0x2028)+'ikinci').split(/\r?\n/)) === JSON.stringify(['birinci','ikinci']));
ok('U+2029 gerçek satır sonuna çevriliyor',
   JSON.stringify(strip('birinci'+C(0x2029)+'ikinci').split(/\r?\n/)) === JSON.stringify(['birinci','ikinci']));
/* SİLİNMEMELİ, ÇEVRİLMELİ: atmak iki paragrafı birleştirirdi — kaçırmaktan
   farklı ama aynı derecede yanlış. */
ok('ayraç silinmiyor, metin birleşmiyor',
   strip('birinci'+C(0x2028)+'ikinci') !== 'birinciikinci');

/* ---------- ESKİDEN ÇALIŞANLAR BOZULMADI ---------- */
ok('kırılmayan boşluk normal boşluğa çevriliyor', strip('a'+C(0x00A0)+'b') === 'a b');
ok('eğri tek tırnak düzleştiriliyor', strip(C(0x2018)+'x'+C(0x2019)) === "'x'");
ok('eğri çift tırnak düzleştiriliyor', strip(C(0x201C)+'x'+C(0x201D)) === '"x"');
ok('CRLF tek satır sonuna çevriliyor', strip('a\r\nb') === 'a\nb');
ok('tek CR de satır sonuna çevriliyor', strip('a\rb') === 'a\nb');

/* ---------- GÖRÜNEN METNE DOKUNULMUYOR ----------
   Aşırı temizlik metni bozar; Türkçe harfler ve noktalama aynen kalmalı. */
ok('Türkçe harfler korunuyor', strip('çğıöşü ÇĞİÖŞÜ') === 'çğıöşü ÇĞİÖŞÜ');
ok('işaretleme korunuyor', strip('*vurgu* {telaffuz} (2) // /') === '*vurgu* {telaffuz} (2) // /');
ok('tire ve uzun tire korunuyor', strip('a-b '+C(0x2013)+' '+C(0x2014)) === 'a-b '+C(0x2013)+' '+C(0x2014));
ok('emoji korunuyor', strip('🎬 çekim') === '🎬 çekim');
ok('boş girdi çökertmiyor', strip('') === '' && strip(null) === '' && strip(undefined) === '');

/* ---------- GERÇEK BİR YAPIŞTIRMA ---------- */
{
  /* Yumuşak tire KELİME İÇİNDE olur — Word'ün heceleme noktası. İlk yazışımda
     iki kelimenin arasına koydum ve "bir test" birleşince testi yanlış sandım;
     oysa birleşme doğru davranış, örneğim gerçekçi değildi. */
  const ham = C(0xFEFF)+'Bu'+C(0x00A0)+'bir'+C(0x2028)+
              C(0x202A)+'mer'+C(0x00AD)+'haba'+C(0x200B)+' paragrafı.'+C(0x202C);
  const t = strip(ham);
  ok('karışık yapıştırmada hiç görünmez kalmıyor', !GORUNMEZ.test(t));
  ok('karışık yapıştırma iki satıra bölünüyor', t.split('\n').length === 2);
  ok('karışık yapıştırmanın metni doğru',
     t === 'Bu bir\nmerhaba paragrafı.');
}

/* ---------- TEMİZLİK GERÇEKTEN UYGULANIYOR MU ----------
   "Yazıldı ama çağrılmıyor" olursa hiçbir şey değişmez. */
ok('editörden okurken uygulanıyor',
   /s\.text=stripInvisible\(\$\('#text'\)\.value\)/.test(cikar(kod,/function pullEditor\(\)\{[\s\S]*?\n\}/,'pullEditor')));
