const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,esnek}=require('./kaynak');
const tel=esnek(esnek(oku(telefonYolu()))), mac=esnek(esnek(oku(macYolu())));
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');
const macKod=mac.replace(/\/\*[\s\S]*?\*\//g,'');

/* I3 — ALTYAZI KAYMASI UÇ DEĞERLERDE KUYRUKLARI NEGATİFE DÜŞÜRÜYOR MU?
   NEGATİFE DÜŞÜRMÜYOR (kırpma var) — ama ÇAKIŞTIRIYOR.

   Kaydırıcı -2,0 ile +2,0 sn arası. Negatif kaymada başlangıçlar sıfıra
   kırpılıyor (`Math.max(0, capTimes[i]+off)`) çünkü video 0dan önce başlamaz.
   Sorun şu: kırpılan bölgeye `capMaxW`den fazla kelime düşerse birden çok
   kuyruk AYNI ANA yığılıyor ve bitişler de birbirini örtüyor.

   ÖLÇÜLEN (7 kelimelik kuyruk sınırı, tek satır, 30 kelime):
     kelime aralığı | kayma yok | kayma -2 sn
     0,50 sn        |     0     |     0
     0,30 sn (~200 kelime/dk) | 0 |   1   ← gerçekçi tempoda başlıyor
     0,12 sn        |     0     |     2
     0,05 sn        |     4     |     4
   Yani kayma YOKKEN çakışma ancak 1200 kelime/dk gibi ulaşılamaz bir tempoda
   oluyor; -2 sn kaymayla 200 kelime/dkda başlıyor. Kayma özelliği tam da bu
   iş için var (altyazı geç kalıyorsa öne çek), yani kusur olağan kullanımda.

   Sonuç dosyada üst üste binmiş `00:00:00,000 --> 00:00:00,400` kuyrukları;
   oynatıcılar ya hepsini birden gösteriyor ya titretiyor.

   Çözüm: kuyruklar tek yerde sıraya diziliyor — bir kuyruk öncekinin
   bitişinden önce başlayamaz, en az 0,4 sn görünür kalır. */

function kurBuildCues(src, re, ad){
  const m=src.match(re);
  ok('çıkarılabildi: '+ad, !!m);
  return m && m[0];
}
const sTel=kurBuildCues(kod,/function buildCues\(\)\{[\s\S]*?\n\}/,'telefon buildCues');
const sMac=kurBuildCues(macKod,/function buildCues\(\)\{[\s\S]*?\n  \}/,'Mac buildCues');
if(!sTel || !sMac) return;

function kos(src, {off=0, aralik=0.43, bas=5, adet=30, satir=30, maxW=7}={}){
  return new Function('__o', `
    /* Mac ayni durumu state diye adlandiriyor; ikisini de kur. */
    const st={capOffset:__o.off}; const state=st;
    /* buildCues artik cekimin anlik goruntusunu tercih ediyor (I6). */
    const cekimAltyazi=null;
    const CAP_MAXCH=42, CAP_MAXSEC=6, CAP_GAP=0.08, CAP_MAXW=__o.maxW;
    const capMaxW=()=>__o.maxW;
    const sentenceEnd=w=>/[.!?…]$/.test(w);
    const words=[],wordLine=[],capTimes=[];
    for(let i=0;i<__o.adet;i++){
      words.push({textContent:'k'+i});
      wordLine.push(Math.floor(i/__o.satir));
      capTimes.push(__o.bas+i*__o.aralik);
    }
    ${src}
    return buildCues();
  `)({off,aralik,bas,adet,satir,maxW});
}
const cakisan=c=>{ let n=0; for(let i=0;i+1<c.length;i++) if(c[i].end>c[i+1].start+1e-9) n++; return n; };
const ters=c=>c.filter(x=>x.end<=x.start).length;
const negatif=c=>c.filter(x=>x.start<0||x.end<0).length;

/* ---------- ASIL BULGU: ÇAKIŞMA ---------- */
{
  /* Kusurun tetiklendiği ölçülen bölge. Kayma -2, damgalar hemen başlıyor. */
  for(const ar of [0.30,0.24,0.12,0.06]){
    const c=kos(sTel,{off:-2, aralik:ar, bas:0.05});
    ok('kayma -2 · aralık '+ar+' sn: çakışan kuyruk YOK', cakisan(c)===0);
    ok('kayma -2 · aralık '+ar+' sn: ters kuyruk yok (bitiş > başlangıç)', ters(c)===0);
  }
}
{
  /* Kırpma sınırı: hiçbir damga negatif olamaz. */
  for(const off of [-2,-1.5,-0.7,0,1,2]){
    const c=kos(sTel,{off, bas:0.05, aralik:0.12});
    ok('kayma '+off+': negatif damga yok', negatif(c)===0);
    ok('kayma '+off+': çakışma yok', cakisan(c)===0);
  }
}
{
  /* Yığılan kuyruklar sırayla diziliyor ve her biri görünür kalıyor. */
  const c=kos(sTel,{off:-2, aralik:0.12, bas:0.05});
  ok('ilk kuyruk sıfırdan başlıyor', c[0].start===0);
  ok('kuyruklar artan sırada', c.every((x,i)=>i===0||x.start>=c[i-1].start));
  ok('her kuyruk en az 0,4 sn görünür', c.every(x=>x.end-x.start>=0.4-1e-9));
  ok('yığılanlar arka arkaya diziliyor',
     Math.abs(c[1].start-c[0].end)<1e-9 && Math.abs(c[2].start-c[1].end)<1e-9);
  ok('metinler kaybolmadı', c.every(x=>x.text && x.text.length>0));
}

/* ---------- NORMAL DURUM BOZULMADI ---------- */
{
  /* Sıradan tempolar: düzeltme hiçbir şeyi değiştirmemeli. Değiştirseydi
     kayması olmayan kullanıcıların altyazı zamanlaması kayardı. */
  for(const ar of [0.5,0.43,0.3,0.24]){
    const c=kos(sTel,{off:0, aralik:ar, bas:5});
    ok('kaymasız aralık '+ar+': çakışma yok', cakisan(c)===0);
    ok('kaymasız aralık '+ar+': ilk kuyruk gerçek damgada (5,00)', Math.abs(c[0].start-5)<1e-9);
  }
  /* Pozitif kayma kırpmaya hiç girmiyor: damgalar olduğu gibi ötelenmeli. */
  const p=kos(sTel,{off:1.5, aralik:0.43, bas:5});
  ok('pozitif kayma damgayı olduğu gibi öteliyor', Math.abs(p[0].start-6.5)<1e-9);
  ok('pozitif kaymada çakışma yok', cakisan(p)===0);
}
{
  /* Tek kuyruk ve boş girdi çökertmemeli. */
  const tek=kos(sTel,{off:-2, adet:3, aralik:0.4, bas:0.05});
  ok('tek kuyrukta çökme yok', Array.isArray(tek) && tek.length>=1);
  ok('tek kuyruk da geçerli', tek.every(x=>x.end>x.start));
  const bos=kos(sTel,{adet:0});
  ok('damga yoksa boş liste', Array.isArray(bos) && bos.length===0);
}
{
  /* Kuyruk üst sınırı 6 sn korunuyor (uzun sessizlikte tek altyazı ekranda
     kalmasın). Düzeltme bunu ezmemeli. */
  const c=kos(sTel,{off:0, aralik:3, bas:5, adet:12, maxW:1});
  ok('kuyruk süresi 6 saniyeyi aşmıyor', c.every(x=>x.end-x.start<=6+1e-9));
}

/* ---------- İKİ PLATFORMDA DA ÇAKIŞMA YOK ----------
   DİKKAT: kuyrukların BİREBİR aynı olmasını beklemek YANLIŞ olurdu ve ilk
   yazışımda öyle ölçtüm. İki platform bölme parametrelerinde gerçekten
   ayrışıyor: Mac `CAP_MAXW=7` SABİT ve `CAP_MAXSEC=3,6`; telefonda kelime
   sınırı kullanıcı ayarı ve süre sınırı 6 sn. Bu ayrı bir parite bulgusu
   (plana I10 altına yazıldı), bu turun konusu değil.
   Burada korunan iddia platformdan bağımsız olan: HİÇBİRİ çakışan ya da
   negatif kuyruk üretmemeli. */
{
  const durumlar=[{off:-2,aralik:0.12,bas:0.05},{off:0,aralik:0.43,bas:5},
                  {off:-1,aralik:0.3,bas:0.05},{off:2,aralik:0.43,bas:5},
                  {off:-2,aralik:0.06,bas:0.02}];
  for(const d of durumlar){
    const a=kos(sTel,d), b=kos(sMac,d);
    ok('telefon çakışmasız (kayma '+d.off+', aralık '+d.aralik+')',
       cakisan(a)===0 && negatif(a)===0 && ters(a)===0);
    ok('Mac çakışmasız (kayma '+d.off+', aralık '+d.aralik+')',
       cakisan(b)===0 && negatif(b)===0 && ters(b)===0);
  }
}

/* ---------- KAYNAK DÜZEYİ ---------- */
ok('kayma aralığı -2 ile +2 saniye', /id="capOffset" min="-20" max="20"/.test(tel));
/* Korunan iddia: başlangıç negatife düşemez. Damganın hangi değişkenden
   okunduğu (ekran ya da çekimin anlık görüntüsü) uygulama ayrıntısı — I6da
   altyazı çekime bağlanınca bu iddia davranış bozulmadan kırmızıya döndü. */
ok('başlangıçlar sıfıra kırpılıyor',
   /Math\.max\(0,(?:capTimes\[i\]|kaynak\[i\]\.t)\+off\)/.test(kod));
ok('sıraya dizme telefonda var', /if\(cues\[n\]\.start < onceki\.end\)/.test(kod));
ok('sıraya dizme Mac tarafında da var', /if\(cues\[n\]\.start < onceki\.end\)/.test(macKod));
ok('dizerken görünürlük korunuyor (telefon)',
   /cues\[n\]\.end = cues\[n\]\.start\+0\.4/.test(kod));
ok('dizerken görünürlük korunuyor (Mac)',
   /cues\[n\]\.end = cues\[n\]\.start\+0\.4/.test(macKod));
