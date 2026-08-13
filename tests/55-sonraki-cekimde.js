const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* SESSİZ SAPMA: KAYDA ÇEKİM BAŞINDA GİREN AYARLAR
   Ses Stüdyosu zinciri makeFxTrack() ile kayıt başlarken kuruluyor — fxParams()
   orada BİR KEZ okunuyor (kaynakta yalnız iki yerde geçiyor: makeFxTrack ve
   arayüzü çizen renderFx). Bit hızı da MediaRecorder'a kayıt başlarken
   veriliyor. Yani çekim sürerken:
     · ses hazır ayarını değiştirmek
     · kapı/anlaşılırlık/gövde kaydırıcılarını oynatmak
     · bit hızını değiştirmek
   arayüzü güncelliyor ama KAYDA HİÇ YANSIMIYOR — ve hiçbir şey söylenmiyordu.

   Bu, insanın en çok yapacağı şey: sesini çekim sırasında beğenmeyip ayarla
   oynuyor, sonra kaydı dinleyince hiçbir şeyin değişmediğini görüyor.

   H6/F4/G11 ile aynı sınıf ama farklı çözüm: burada ENGELLEMİYORUZ. Kullanıcı
   sonraki çekim için hazırlık yapıyor olabilir ve bu ayarlar hiçbir şeyi
   bozmuyor — yalnız NE ZAMAN geçerli olacağını söylüyoruz. */

const sc=cikar(kod,/function sonrakiCekimde\(\)\{[\s\S]*?\n\}/,'sonrakiCekimde');
function kos({kayitta=true, kez=1}={}){
  const iz=[];
  const f=new Function('__iz','__k','__kez',`
    let sonrakiUyarildi=false;
    const rec = __k ? {state:'recording'} : null;
    const toast=x=>__iz.push('toast:'+x);
    const m=x=>x;
    ${sc}
    for(let i=0;i<__kez;i++) sonrakiCekimde();
    __iz.bayrak=sonrakiUyarildi;
  `);
  f(iz,kayitta,kez);
  return iz;
}
{
  const iz=kos({kayitta:true});
  ok('kayıt sürerken uyarı veriliyor', iz.some(x=>/nextTakeOnly/.test(x)));
}
{
  const iz=kos({kayitta:false});
  ok('kayıt yokken uyarı YOK (gereksiz gürültü)', iz.length===0);
  ok('kayıt yokken bayrak da kirletilmiyor', iz.bayrak === false);
}
{
  /* Kaydırıcı her oynatıldığında oninput ateşleniyor — çekim başına bir kez
     uyarmazsak ekran bildirim yağmuruna dönüyordu. */
  const iz=kos({kayitta:true, kez:25});
  ok('kaydırıcı 25 kez oynatılsa da tek uyarı', iz.filter(x=>/nextTakeOnly/.test(x)).length === 1);
}

/* ---------- YENİ ÇEKİMDE UYARI HAKKI TAZELENİYOR ----------
   Bayrak sıfırlanmazsa ikinci çekimde kullanıcı hiç uyarılmaz. */
const ds=cikar(kod,/function doStartRec\(\)\{[\s\S]*?\n\}/,'doStartRec');
ok('çekim başında bayrak sıfırlanıyor', /sonrakiUyarildi=false;/.test(ds));

/* ---------- BEŞ AYARIN HEPSİ BAĞLI ---------- */
const bagli=[
  ["ses hazır ayarı", /\$\$\('#fxSeg button'\)\.forEach\(b=>b\.onclick=\(\)=>\{ sonrakiCekimde\(\);/],
  ["gürültü kapısı",  /\$\('#fxGate'\)\.oninput=e=>\{ sonrakiCekimde\(\);/],
  ["anlaşılırlık",    /\$\('#fxPres'\)\.oninput=e=>\{ sonrakiCekimde\(\);/],
  ["gövde",           /\$\('#fxWarm'\)\.oninput=e=>\{ sonrakiCekimde\(\);/],
  ["bit hızı",        /\$\$\('#brSeg button'\)\.forEach\(b=>b\.onclick=\(\)=>\{ sonrakiCekimde\(\);/],
];
for(const [ad,re] of bagli) ok(ad+' ayarı uyarıya bağlı', re.test(kod));

/* ---------- GEREKÇE HÂLÂ GEÇERLİ Mİ ----------
   Uyarının dayanağı: bu değerler kayda ÇEKİM BAŞINDA giriyor. Zincir canlı
   güncellenir hâle gelirse uyarı yanlış olur ve kaldırılmalı. */
/* Sayarken TANIM satırını dışarıda bırak: "function fxParams(){" da
   "fxParams()" dizisini içeriyor ve ilk yazışımda onu da saydım. */
const fxCagri=(kod.match(/(?<!function\s)fxParams\(\)/g)||[]);
ok('ses ayarları yalnız iki yerde okunuyor: zincir kurulumu + arayüz çizimi',
   fxCagri.length === 2);
ok('okunan yerlerden biri zincir kurulumu (makeFxTrack)',
   /const P=fxParams\(\);/.test(cikar(kod,/function makeFxTrack\(\)\{[\s\S]*?\n\}/,'makeFxTrack')));
ok('ses zinciri kayıt başlarken kuruluyor', /fxTrack=makeFxTrack\(\);/.test(ds));
ok('bit hızı kayıt başlarken veriliyor', /videoBitsPerSecond: vBitrate\(\)/.test(ds));

/* ---------- ENGELLEME YOK: AYAR YİNE DEĞİŞİYOR ----------
   Kullanıcı sonraki çekim için hazırlanabilmeli; uyarı bir kapı değil. */
ok('ses hazır ayarı yine yazılıyor', /sonrakiCekimde\(\); st\.audioFx=b\.dataset\.fx;/.test(kod));
ok('bit hızı yine yazılıyor', /sonrakiCekimde\(\); st\.bitrate=b\.dataset\.br;/.test(kod));
ok('kaydırıcı değeri yine yazılıyor', /sonrakiCekimde\(\); st\.fxGate=\+e\.target\.value;/.test(kod));

/* ---------- MESAJ ---------- */
ok('mesaj iki dilde tanımlı', (tel.match(/nextTakeOnly:'/g)||[]).length >= 2);
ok('mesaj ne zaman geçerli olduğunu söylüyor', /nextTakeOnly:'[^']*SONRAKİ çekimde/.test(tel));
ok('mesaj süren kayda yansımadığını da söylüyor', /nextTakeOnly:'[^']*süren kayda yansımıyor/.test(tel));
/* Bu bir ENGEL değil bilgi — kırmızı uyarı gibi görünmemeli. */
ok('mesaj engel dilinde değil (⛔ yok)', !/nextTakeOnly:'⛔/.test(tel));
