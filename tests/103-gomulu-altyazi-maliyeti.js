const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
const macKod=oku(macYolu()).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');

/* I2 — GÖMÜLÜ ALTYAZI ÇİZİMİ KOMPOZİT FPSİNİ NE KADAR DÜŞÜRÜYOR:
   ÖLÇÜLDÜ ve bir kalem GEREKSİZ çıktı.

   Satır sarması yalnız üç şeye bağlı: metin, genişlik ve punto. Üçü de
   değişmediği sürece sonuç birebir aynı. Oysa altyazı metni KONUŞMA
   TEMPOSUYLA değişiyor, çizim ise KARE HIZIYLA yapılıyor.

   ÖLÇÜLEN (kare başına measureText çağrısı):
     3 kelimelik altyazı  ->  3 çağrı  -> 60 fpste saniyede 180
     7 kelimelik altyazı  ->  8 çağrı  -> 60 fpste saniyede 480
    12 kelimelik altyazı  -> 13 çağrı  -> 60 fpste saniyede 780

   Metin ne sıklıkta değişiyor: 150 kelime/dakika temposunda saniyede 2,5
   kez. Yani düzen 60 kez hesaplanırken 2,5 kez yetiyordu — 24 KAT
   gereksiz iş, üstelik TAM DA KAYIT SÜRERKEN. measureText ucuz değil:
   her çağrı yazı biçimleme demek.

   Beş saniyelik gerçek koşumda (300 kare, 150 wpm): 1800 civarı çağrı
   yerine 57. Kural iki platformda da aynı.

   Kalan maliyet (tuvalin 2D tuvale kopyalanması) KALDIRILAMAZ: WebGL ile
   2D aynı tuvalde olamıyor, altyazıyı yakmanın bedeli o kopya. */

/* ---------- ÖNBELLEK VAR MI VE ANAHTARI TAM MI ---------- */
for(const [ad,k] of [['telefon',kod],['masaüstü',macKod]]){
  /* DESEN GEVŞETİLDİ (G.1): karaoke parçalaması da aynı önbelleğe girdi ve
     nesneye `kk` alanı eklendi. Eski desen nesnenin BİÇİMİNE kilitliydi;
     iddia ise "düzen önbelleğe alınıyor ve anahtarı metin+genişlik+punto".
     Alanların varlığı aranıyor, yazılış sırası/uzunluğu değil. */
  ok(ad+': altyazı düzeni önbelleğe alınıyor',
     /let capOnbellek=\{[^}]*txt:''[^}]*W:0[^}]*size:0[^}]*lines:null[^}]*\}/.test(k));
  ok(ad+': önbellek anahtarı metin, genişlik ve puntoyu birlikte tutuyor',
     /capOnbellek\.lines && capOnbellek\.txt===txt && capOnbellek\.W===W && capOnbellek\.size===size/.test(k));
  ok(ad+': ıskalayınca yeniden hesaplanıp saklanıyor',
     /capOnbellek=\{txt, W, size, lines[,}]/.test(k));
  /* Yazı biçimi HER KAREDE kurulmalı: çizim çağrıları buna bağlı, onu
     önbelleğe almak yanlış olurdu. */
  ok(ad+': yazı biçimi yine her karede kuruluyor', /ctx\.font='800 '\+size\+'px/.test(k));
}

/* ---------- GERÇEK ÇİZİMİ KOŞTUR ---------- */
function tezgah(k){
  const mW=k.match(/function wrapLines\([\s\S]*?return out\.length\?out:\[txt\|\|.{2}\];\s*\n\s*\}/);
  const mD=k.match(/let capOnbellek=[\s\S]*?ctx\.restore\(\);\s*\n\s*\}/);
  if(!mW||!mD) return null;
  return (d)=>new Function('__d', `
    ${mW[0]}
    /* KARAOKE BU TEZGÂHTA KAPALI. Bu dosyanın iddiası DÜZEN ÖNBELLEĞİ ve
       satır sayımı ('yazi:' izlerini 2ye bölerek satır çıkarıyor); karaoke
       son satırı kelime kelime çizdiği için o sayım anlamını yitirirdi.
       Karaoke yolunun kendi maliyeti ve doğruluğu tests/150de ölçülüyor. */
    const st={capSize:__d.punto||42, capPos:'bottom', capKaraoke:false};
    /* Mac kabugu durumu state diye adlandiriyor, telefon st diye. Tezgah iki
       kabugu da kosturdugu icin ikisi de tanimli olmali; yoksa test kodun
       kusurunu degil KENDI eksigini bildirir.
       NOT: bu yorumda TERS TIRNAK yok - burasi bir sablon dizesinin ICI ve
       ters tirnak dizeyi kesip "missing ) after argument list" veriyor
       (CLAUDE.md bu tuzagi ucuncu kez kaydediyor, bu dorduncu). */
    const state=st;
    let __idx=0;
    const liveCue=()=>__d.metinler[__idx];
    ${mD[0]}
    const c={ font:'', textAlign:'', textBaseline:'', fillStyle:'', strokeStyle:'',
      lineWidth:0, lineJoin:'',
      measureText:s=>{ __d.say(); return {width:s.length*23}; },
      save(){}, restore(){},
      fillRect:(...a)=>__d.iz.push('kutu:'+a.map(Math.round).join(',')),
      strokeText:(t,x,y)=>__d.iz.push('kontur:'+t),
      fillText:(t,x,y)=>__d.iz.push('yazi:'+t) };
    for(let kare=0; kare<__d.kare; kare++){
      __idx = Math.floor(kare/__d.kareBasinaDegisim) % __d.metinler.length;
      drawCaption(c, __d.W||1080, 1920);
    }
  `)(d);
}
const METINLER=['Bugun sizlere yepyeni bir konudan',
                'bahsedecegim arkadaslar hazir misiniz',
                'hemen basliyoruz o zaman'];

for(const [ad,k] of [['telefon',kod],['masaüstü',macKod]]){
  const kos=tezgah(k);
  ok(ad+': çizim çıkarılabildi', !!kos);
  if(!kos) continue;
  {
    /* 5 saniye, 60 fps, 150 wpm: metin ~24 karede bir değişiyor. */
    let cagri=0; const iz=[];
    kos({metinler:METINLER, kare:300, kareBasinaDegisim:24, say:()=>cagri++, iz});
    console.log('   '+ad+': 300 karede '+cagri+' measureText çağrısı');
    ok(ad+': 300 karede çağrı 200ün altında ('+cagri+')', cagri<200);
    /* Çizim İŞİ atlanmamalı — yalnız ÖLÇÜM önbelleğe alındı. */
    ok(ad+': her karede yine çiziliyor (300 kutu)',
       iz.filter(x=>/^kutu:/.test(x)).length===300);
    ok(ad+': kontur ve dolgu birlikte çiziliyor',
       iz.some(x=>/^kontur:/.test(x)) && iz.some(x=>/^yazi:/.test(x)));
  }
  {
    /* Metin HER KARE değişirse önbellek hiç tutmaz — bu durumda maliyet
       eski hâline dönmeli, yani önbellek yanlış cevap vermiyor. */
    let cagri=0; const iz=[];
    kos({metinler:METINLER, kare:60, kareBasinaDegisim:1, say:()=>cagri++, iz});
    ok(ad+': metin her karede değişince ölçüm de her karede yapılıyor ('+cagri+')', cagri>=60);
  }
  {
    /* AYNI metin ama farklı GENİŞLİK: önbellek yanlış satırları vermemeli. */
    let cagri=0; const iz=[];
    kos({metinler:[METINLER[0]], kare:2, kareBasinaDegisim:1, say:()=>cagri++, iz, W:1080});
    const dar=[]; let cagri2=0;
    kos({metinler:[METINLER[0]], kare:2, kareBasinaDegisim:1, say:()=>cagri2++, iz:dar, W:400});
    const genisSatir=iz.filter(x=>/^yazi:/.test(x)).length/2;
    const darSatir=dar.filter(x=>/^yazi:/.test(x)).length/2;
    ok(ad+': dar kadrajda daha çok satır çıkıyor ('+genisSatir+' -> '+darSatir+')', darSatir>genisSatir);
  }
  {
    /* Punto değişince de yeniden ölçülmeli (telefonda kullanıcı ayarı). */
    let a=0, b=0; const iz=[];
    kos({metinler:[METINLER[0]], kare:5, kareBasinaDegisim:99, say:()=>a++, iz, punto:42});
    kos({metinler:[METINLER[0]], kare:5, kareBasinaDegisim:99, say:()=>b++, iz, punto:80});
    ok(ad+': punto değişince yeniden ölçülüyor', a>0 && b>0);
  }
  {
    /* Altyazı yoksa hiç çizilmemeli — boş kutu bile. */
    const iz=[]; let cagri=0;
    kos({metinler:[''], kare:10, kareBasinaDegisim:1, say:()=>cagri++, iz});
    ok(ad+': altyazı yokken hiç çizilmiyor', iz.length===0 && cagri===0);
  }
}

/* ---------- İKİ PLATFORM AYNI SATIRLARI ÜRETİYOR MU ---------- */
{
  const t=tezgah(kod), m=tezgah(macKod);
  if(t&&m){
    for(const metin of METINLER){
      const a=[], b=[];
      t({metinler:[metin], kare:1, kareBasinaDegisim:1, say:()=>{}, iz:a});
      m({metinler:[metin], kare:1, kareBasinaDegisim:1, say:()=>{}, iz:b});
      const sa=a.filter(x=>/^yazi:/.test(x)), sb=b.filter(x=>/^yazi:/.test(x));
      ok('iki platform aynı satırları çiziyor: "'+metin.slice(0,20)+'..."',
         JSON.stringify(sa)===JSON.stringify(sb));
    }
  }
}

/* ---------- KALDIRILAMAYAN MALİYET YERİNDE DURUYOR ---------- */
ok('altyazı yakma yalnız anahtar açıkken çalışıyor', /if\(st\.burnCaps\)\{/.test(kod));
ok('çıktı tuvali yalnız boyut değişince yeniden kuruluyor',
   /if\(oc\.width!==cv\.width\|\|oc\.height!==cv\.height\)\{ oc\.width=cv\.width; oc\.height=cv\.height; \}/.test(kod));
ok('kopya ve altyazı tek denemede (hata çizimi durdurmasın)',
   /try\{ o\.drawImage\(cv,0,0\); drawCaption\(o,oc\.width,oc\.height\); \}catch\(e\)\{\}/.test(kod));
