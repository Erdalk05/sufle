const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu()), mac=oku(macYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');
const macKod=mac.replace(/\/\*[\s\S]*?\*\//g,'');

/* I10 — MAC ALTYAZISI TELEFONLA AYNI SONUCU VERİYOR MU?
   HİPOTEZİN BÜYÜK KISMI ÇÜRÜDÜ. Aynı girdiyle iki gerçek motor koşturuldu:
   VARSAYILAN ayarda kuyruklar BİREBİR aynı çıkıyor (başlangıç, bitiş, metin).
   Parametreler de aynıydı: 42 karakter, 3,6 sn, 0,08 sn boşluk.

   ÖN BULGUMU BURADA DÜZELTİYORUM: I3 turunda "Mac CAP_MAXSEC=3,6, telefonda
   6" diye not düşmüştüm — YANLIŞTI. Telefonunki de 3,6; oradaki 6 değerini
   testin tezgâhına kendi elimle koymuştum ve kaynaktan geldiğini sanmıştım.

   GERİYE TEK GERÇEK FARK KALDI: "satırda en fazla kelime" telefonda bir
   KULLANICI AYARI (3-12), Mac'te sabit 7di. Ölçüldü: telefon 4 kelimeye
   ayarlıyken aynı metin 8 kuyruğa bölünüyor, Mac 7 kuyruk üretiyor.
   Aynı kişi aynı senaryoyu iki cihazda çekince altyazılar ayrışıyordu.
   Mac'e aynı ayar eklendi; bu test artık pariteyi kapıya bağlıyor. */

const parcala=(src,re,ad)=>{ const m=src.match(re); ok('çıkarılabildi: '+ad, !!m); return m&&m[0]; };
const sT   = parcala(kod,/function buildCues\(\)\{[\s\S]*?\n\}/,'telefon buildCues');
const sM   = parcala(macKod,/function buildCues\(\)\{[\s\S]*?\n  \}/,'Mac buildCues');
const sabT = parcala(kod,/const CAP_MAXCH=[^\n]*/,'telefon sabitleri');
const sabM = parcala(macKod,/const CAP_MAXCH=[^\n]*/,'Mac sabitleri');
const seT  = parcala(kod,/function sentenceEnd\(s\)\{[\s\S]*?\n\}/,'telefon sentenceEnd');
const seM  = parcala(macKod,/function sentenceEnd\(s\)\{[\s\S]*?\n  \}/,'Mac sentenceEnd');
const kisT = parcala(kod,/const KISALTMA=new Set\([\s\S]*?\);/,'telefon KISALTMA');
const kisM = parcala(macKod,/const KISALTMA=new Set\([\s\S]*?\);/,'Mac KISALTMA');
const mwT  = parcala(kod,/function capMaxW\(\)\{[^\n]*\}/,'telefon capMaxW');
const mwM  = parcala(macKod,/function capMaxW\(\)\{[^\n]*\}/,'Mac capMaxW');
if(!sT||!sM||!sabT||!sabM||!seT||!seM||!kisT||!kisM||!mwT||!mwM) return;

function kos(src,sabit,se,kis,mw,o){
  return new Function('__o',
    sabit+'\n'+kis+'\n'+se+'\n'+
    'const st={capOffset:__o.off,capMaxW:__o.maxW}; const state=st;\n'+mw+'\n'+
    'const words=[],wordLine=[],capTimes=[];'+
    'for(let i=0;i<__o.k.length;i++){ words.push({textContent:__o.k[i]});'+
    ' wordLine.push(Math.floor(i/__o.satir)); capTimes.push(__o.bas+i*__o.ar); }'+
    src+'; return buildCues();')(o);
}
const telefon=o=>kos(sT,sabT,seT,kisT,mwT,o);
const macOl  =o=>kos(sM,sabM,seM,kisM,mwM,o);
const imza=c=>JSON.stringify(c.map(x=>[+x.start.toFixed(3),+x.end.toFixed(3),x.text]));

/* ---------- PARAMETRELER AYNI MI ---------- */
ok('karakter sınırı iki platformda aynı (42)',
   /CAP_MAXCH=42/.test(sabT) && /CAP_MAXCH=42/.test(sabM));
ok('süre sınırı iki platformda aynı (3,6 sn)',
   /CAP_MAXSEC=3\.6/.test(sabT) && /CAP_MAXSEC=3\.6/.test(sabM));
ok('kuyruk arası boşluk aynı (0,08 sn)',
   /CAP_GAP=0\.08/.test(sabT) && /CAP_GAP=0\.08/.test(sabM));
ok('kelime sınırı artık iki platformda da AYAR', /state\.capMaxW\|\|7/.test(mwM) && /st\.capMaxW\|\|7/.test(mwT));
ok('Mac tarafında sabit CAP_MAXW kalmadı', !/CAP_MAXW/.test(macKod));

/* ---------- AYNI GİRDİ, AYNI ÇIKTI ---------- */
const METIN=('Merhaba arkadaslar bugun size cok onemli bir konudan bahsedecegim. '+
  'Bu konu vb. seyler icin gecerli. Dr. Ahmet de boyle diyor! '+
  'Ucuncu maddeye geciyorum simdi; dikkatle dinleyin. Son olarak 3. maddeyi ozetleyeyim.').split(' ');
{
  for(const maxW of [3,4,5,7,9,12]){
    const o={k:METIN,bas:1,ar:0.43,satir:8,off:0,maxW};
    const a=telefon(o), b=macOl(o);
    ok('kelime sınırı '+maxW+': iki platform BİREBİR aynı ('+a.length+' kuyruk)', imza(a)===imza(b));
  }
}
{
  /* Kayma, tempo ve satır uzunluğu değişse de eşitlik bozulmamalı. */
  const durumlar=[
    {ar:0.43, off:0,    satir:8,  ad:'normal tempo'},
    {ar:0.25, off:0,    satir:8,  ad:'hızlı konuşma'},
    {ar:0.9,  off:0,    satir:8,  ad:'yavaş konuşma'},
    {ar:0.43, off:-2,   satir:8,  ad:'iki saniye öne çekilmiş'},
    {ar:0.43, off:2,    satir:8,  ad:'iki saniye geciktirilmiş'},
    {ar:0.12, off:-2,   satir:40, ad:'uç durum: hızlı + öne çekilmiş + tek satır'},
  ];
  for(const d of durumlar){
    const o={k:METIN,bas:d.off<0?0.05:1,ar:d.ar,satir:d.satir,off:d.off,maxW:7};
    ok(d.ad+': iki platform aynı', imza(telefon(o))===imza(macOl(o)));
  }
}
{
  /* Kısaltmalar iki tarafta da cümle sonu SAYILMAMALI — B10da telefonda
     düzeltilmişti, Mac de aynı kuralı taşımalı. */
  const k='vb. Dr. Sn. 3. T.C. bitti. yeni'.split(' ');
  const o={k,bas:1,ar:0.43,satir:20,off:0,maxW:12};
  const a=telefon(o), b=macOl(o);
  ok('kısaltmalar iki platformda da bölmüyor', imza(a)===imza(b));
  ok('kısaltmalar gerçekten bölmüyor (tek kuyruk beklenir)', a.length<=2);
}
{
  /* Boş ve tek kelimelik girdi. */
  ok('boş metinde ikisi de boş liste',
     telefon({k:[],bas:1,ar:0.4,satir:8,off:0,maxW:7}).length===0 &&
     macOl({k:[],bas:1,ar:0.4,satir:8,off:0,maxW:7}).length===0);
  const o={k:['tek'],bas:1,ar:0.4,satir:8,off:0,maxW:7};
  ok('tek kelimede ikisi aynı', imza(telefon(o))===imza(macOl(o)));
}

/* ---------- MAC AYARI GERÇEKTEN BAĞLI MI ---------- */
ok('Mac kaydırıcısı sayfada var', /id="capMaxW" min="3" max="12"/.test(mac));
ok('Mac varsayılanı 7', /capMaxW:7/.test(macKod));
ok('Mac ayarı arayüze yansıyor', /#capMaxWV[\s\S]{0,120}state\.capMaxW/.test(macKod));
ok('Mac ayarı kaydediliyor', /#capMaxW'\)\.addEventListener\('input'[\s\S]{0,90}save\(\)/.test(macKod));
ok('telefon kaydırıcısı da duruyor', /id="capMaxW" min="3" max="12"/.test(tel));
{
  /* Ayar gerçekten SONUCU değiştiriyor mu — bağlanmış ama etkisiz olmasın. */
  const az=macOl({k:METIN,bas:1,ar:0.43,satir:8,off:0,maxW:3});
  const cok=macOl({k:METIN,bas:1,ar:0.43,satir:8,off:0,maxW:12});
  ok('Mac ayarı çıktıyı gerçekten değiştiriyor ('+az.length+' vs '+cok.length+' kuyruk)', az.length>cok.length);
}
