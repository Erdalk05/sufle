const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* K8 — DOKUNMA HEDEFLERİ 44x44 ALTINDA MI: BİRİ ÖYLEYDİ VE EN ÇOK KULLANILANI.

   CSSten ölçüldü (genişlik x yükseklik):
     .cbtn              54 x 54   geçti
     .sheetbtns button  esnek x 49 geçti
     .sw                48 x 29   ALTINDA  <- 28 ayar anahtarının hepsi
     .iconbtn           esnek x 35 ALTINDA
     .seg button        esnek x 40 ALTINDA
     .tabs button       esnek x 38 ALTINDA

   Anahtar en kritik olanıydı: 28 tane var ve tıklama YALNIZ 29 piksellik
   anahtara bağlıydı. Yanındaki etikete basmak hiçbir şey yapmıyordu —
   parmak kayınca "bastım ama olmadı" hissi. Oysa anahtarın içinde durduğu
   `.tog` satırı zaten 44 pikselden yüksek.

   ÇÖZÜM: işleyici satıra taşındı. Hedef 29 -> 44+ piksel, GÖRÜNÜM AYNI.
   Ölçüldü: 28 anahtarın 28i de bir `.tog` satırında, yani hiçbiri
   tıklanamaz hâle gelmiyor. Bu testin en önemli iddiası budur —
   bir anahtar satırın DIŞINA çıkarsa artık hiç çalışmaz.

   Kalan üçü (ikon düğmesi, segment, sekme) GÖRÜNÜMÜ değiştirmeden
   büyütülemez; tasarım kararı olarak Erdala bırakıldı (K9 ile birlikte). */

/* ---------- CSS ÖLÇÜMÜ ---------- */
const kural=sec=>{
  const m=tel.match(new RegExp('(?:^|\\})\\s*'+sec.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{([^}]*)\\}'));
  return m?m[1]:'';
};
const px=(blok,ad)=>{ const m=blok.match(new RegExp(ad+':(\\d+)px')); return m?+m[1]:null; };

{
  const tog=kural('.tog');
  ok('.tog kuralı bulundu', !!tog);
  /* Yükseklik iki yerden gelir: min-height ve dolgu. İkisi de sayılmalı. */
  const mh=px(tog,'min-height');
  ok('.tog satırında min-height var', mh!==null);
  ok('.tog dokunma hedefi en az 44 piksel (ölçülen '+mh+')', mh!==null && mh>=44);
  ok('.tog dokunulabilir görünüyor (imleç)', /cursor:pointer/.test(tog));
  /* Anahtarın kendisi KÜÇÜK kalmalı — görünüm değişmesin diye.
     `.sw` iki kez tanımlı (biri yalnız imleç), boyut vereni ara. */
  const sw=(tel.match(/\.sw\{[^}]*width:[^}]*\}/)||[''])[0];
  ok('.sw görünümü değişmedi (48x29)', px(sw,'width')===48 && px(sw,'height')===29);
}

/* ---------- HER ANAHTAR BİR SATIRIN İÇİNDE Mİ ---------- */
{
  const swSay=(tel.match(/<div class="sw[^"]*"/g)||[]).length;
  ok('sayfada anahtar var ('+swSay+' adet)', swSay>=20);
  const satirlar=tel.match(/<div class="tog"[^>]*>[\s\S]*?<\/div>\s*(?=<)/g)||[];
  const icinde=satirlar.reduce((n,r)=>n+(r.match(/<div class="sw/g)||[]).length,0);
  ok('anahtarların HEPSİ bir .tog satırında ('+icinde+'/'+swSay+')', icinde===swSay);
  /* Satırda anahtardan başka tıklanabilir öge olmamalı: olsaydı ona basmak
     da ayarı değiştirirdi. */
  const kirli=satirlar.filter(r=>/<button|<select|<input/.test(r));
  ok('satırlarda başka etkileşimli öge yok', kirli.length===0);
}

/* ---------- İŞLEYİCİ GERÇEKTEN SATIRA BAĞLI ---------- */
ok('tıklama satıra bağlanıyor', /\$\$\('\.tog'\)\.forEach\(row=>\{/.test(kod));
ok('anahtar satırın içinden bulunuyor', /const s=row\.querySelector\('\.sw'\); if\(!s\) return;/.test(kod));
ok('işleyici satırın kendisine yazılıyor', /row\.onclick=async\(\)=>\{/.test(kod));
ok('anahtara doğrudan tıklama işleyicisi KALMADI', !/\$\$\('\.sw'\)\.forEach\(s=>s\.onclick/.test(kod));
/* Klavye yolu duruyor mu: boşluk/enter anahtarı tetikliyor, o da satıra kabarıyor. */
ok('klavye ile açıp kapatma duruyor', /s\.addEventListener\('keydown'[\s\S]{0,400}?s\.click\(\);/.test(kod));
ok('anahtar hâlâ odaklanabilir', /s\.setAttribute\('tabindex','0'\)/.test(kod));

/* ---------- DAVRANIŞ: SATIRA BASMAK BİR KEZ ÇALIŞIYOR ---------- */
const m=kod.match(/\$\$\('\.tog'\)\.forEach\(row=>\{[\s\S]*?\n  \};\n\}\);/);
ok('bağlama bloğu çıkarılabildi', !!m);
if(!m) return;

function tezgah(baslangic){
  return new Function('__st', `
    const cagri=[]; const st=__st;
    /* Sahte satır: içinde bir anahtar ve bir etiket var. */
    const anahtar={ dataset:{t:'bionic'} };
    const satir={ _click:null,
      querySelector(q){ return q==='.sw'?anahtar:null; },
      set onclick(f){ this._click=f; }, get onclick(){ return this._click; } };
    const $$=(sel)=>sel==='.tog'?[satir]:[];
    const rec=null, stream=null, comp={on:false};
    const apply=()=>cagri.push('apply');
    const save=()=>cagri.push('save');
    const toast=()=>cagri.push('toast');
    const m=k=>k;
    const kameraDegisebilir=()=>true;
    const openCam=async()=>cagri.push('openCam');
    const vadBaslat=()=>cagri.push('vadBaslat'), vadDurdur=()=>cagri.push('vadDurdur');
    const applyTorch=()=>cagri.push('applyTorch');
    const requestWake=()=>cagri.push('requestWake');
    const releaseWake=()=>cagri.push('releaseWake');
    const startComp=()=>{ cagri.push('startComp'); return true; };
    const stopComp=()=>cagri.push('stopComp');
    const gateSettings=()=>cagri.push('gateSettings');
    const renderVad=()=>{}, wakeUyar=()=>{};
    const IS_WK=false;
    const sections=[];
    const $=()=>null;
    /* Biyonik yolu okunan kelimeyi geri getiriyor; tezgâhta yalnız var olsun. */
    let activeIdx=-1, pos=0; const wordTops=[]; const maxPos=0;
    const yakinIdx=()=>-1, eyeOff=()=>0, setPos=()=>{}, buildContent=()=>cagri.push('buildContent');
    const ensureComp=()=>cagri.push('ensureComp');
    const body={ classList:{ toggle(){} } };
    const window={ SpeechRecognition:1 };
    ${m[0]}
    return { bas(t){ if(t) anahtar.dataset.t=t; return satir._click(); },
             baglandiMi(){ return typeof satir._click==='function'; },
             get cagri(){ return cagri.slice(); }, st };
  `)(baslangic);
}
{
  const t=tezgah({bionic:false});
  ok('işleyici satıra gerçekten bağlandı', t.baglandiMi());
  t.bas('bionic');
  ok('satıra basmak ayarı değiştiriyor', t.st.bionic===true);
  ok('değişiklik uygulanıp kaydediliyor',
     t.cagri.includes('apply') && t.cagri.includes('save'));
  /* ÇİFT TETİKLEME OLMAMALI: tek işleyici olduğu için basış başına tek apply. */
  ok('tek basışta tek uygulama', t.cagri.filter(x=>x==='apply').length===1);
  t.bas('bionic');
  ok('ikinci basış geri alıyor', t.st.bionic===false);
}
{
  /* Anahtarın KENDİSİNE basmak da aynı satır işleyicisine kabarır; tarayıcıda
     tek yol olduğu için burada da tek çağrı olmalı. Kabarma simüle edilemez,
     ama tek işleyici bulunduğunu kaynak düzeyinde kilitledik (yukarıda). */
  const t=tezgah({torch:false});
  t.bas('torch');
  ok('fener anahtarı satırdan da çalışıyor', t.st.torch===true && t.cagri.includes('applyTorch'));
}
{
  /* Anahtarsız bir satır olursa çökmemeli — sayfada başlık satırı eklenebilir. */
  const bos=new Function(`
    const satir={ querySelector(){ return null; }, set onclick(f){ this._f=f; } };
    const $$=(sel)=>sel==='.tog'?[satir]:[];
    const st={}, rec=null, stream=null, comp={on:false};
    const apply=()=>{}, save=()=>{}, toast=()=>{}, m=k=>k;
    const kameraDegisebilir=()=>true;
    const openCam=async()=>{}, vadBaslat=()=>{}, vadDurdur=()=>{}, applyTorch=()=>{};
    const requestWake=()=>{}, releaseWake=()=>{}, startComp=()=>true, stopComp=()=>{};
    const gateSettings=()=>{}, renderVad=()=>{}, wakeUyar=()=>{};
    const IS_WK=false; const sections=[]; const $=()=>null;
    ${m[0]}
    return satir._f===undefined;
  `)();
  ok('anahtarsız satır sessizce atlanıyor', bos===true);
}
