const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
/* v9.34: sebepler sözlükten okunuyor; tezgâh gerçek sözlüğü yüklüyor.
   Yorumda ters tırnak yok — şablon dizesinin içine giriyor. */
const {cekirdekOku}=require('./kaynak');
const SOZ=cekirdekOku('sozluk.js','SUFLE_SOZLUK').replace(/\/\*[\s\S]*?\*\//g,'');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* G3 — CHROMA EŞİĞİ UÇ DEĞERLERDE ÇÖKÜYOR MU: ÇÖKMÜYOR (hipotez çürüdü).
   Ölçüldü:
     · kaydırıcılar zaten sınırlı: eşik 5-80, yumuşaklık 1-40, saçak 0-100
     · `smo` en az 0,01 olacak şekilde kıstırılıyor, yani smoothstep hiçbir
       zaman edge0==edge1 almıyor — 0 ve 100 uçlarında tanımsız davranış yok
     · uniform değerleri KARE BAŞINA yazılıyor, yani kaydırıcılar canlı çalışıyor
       ("ayar değişti ama uygulanmadı" burada YOK)
     · saçak temizliği `st.spill==null?60:st.spill` ile okunuyor — 0 değeri
       doğru korunuyor
   Bunlar aşağıda kilitlendi ki sessizce bozulmasınlar.

   AMA AYNI YERDE BAŞKA BİR KUSUR ÇIKTI — depodaki en verimli sınıf:
   ÖN KOŞULU OLAN AYAR = ÖLÜ AYAR. Yeşil ekran KAPALIYKEN perde rengi, rengi
   kameradan ölçme, eşik, kenar yumuşaklığı, saçak temizliği ve arka plan
   seçiminin tamamı görünüyor, sürüklenebiliyor ve hiçbir şey yapmıyor:
   gölgelendirici `if(useKey<0.5){...return;}` ile daha ilk satırda çıkıyor.
   Aynısı altyazı gömme kapalıyken boyut/konum/biçim/satır ayarları için.
   v9.5te bu sınıf anahtarlar için düzeltilmişti (11.5 gateSettings) ama
   düzeltme YALNIZ `.tog` anahtarlarını kapsıyordu — kaydırıcıları değil.
   "Bir yön kontrol edildi, tersi edilmedi" deseni. */

/* ---------- UÇ DEĞERLER: SINIRLAR VE KIRPMA ---------- */
const sl = id => (tel.match(new RegExp('<input type="range" id="'+id+'"[^>]*>'))||[''])[0];
for(const [id,mn,mx] of [['keySim',5,80],['keySmooth',1,40],['spill',0,100]]){
  const s=sl(id);
  ok(id+' kaydırıcısı var', !!s);
  ok(id+' alt sınırı '+mn, new RegExp('min="'+mn+'"').test(s));
  ok(id+' üst sınırı '+mx, new RegExp('max="'+mx+'"').test(s));
}
/* smoothstep(edge0,edge1,x) için edge0<edge1 şart; smo sıfırlanırsa uç
   değerde tanımsız davranış olur. Kırpma bu yüzden duruyor. */
ok('kenar yumuşaklığı en az 0,01e kıstırılıyor',
   /'smo'\),Math\.max\(0\.01,\(st\.keySmooth\|\|10\)\/100\)/.test(kod));
ok('saçak temizliğinde 0 değeri korunuyor (==null kullanılıyor)',
   /'spill'\),\(st\.spill==null\?60:st\.spill\)\/100/.test(kod));

/* ---------- GÖLGELENDİRİCİ MATEMATİĞİ UÇ DEĞERLERDE ---------- */
function smoothstep(e0,e1,x){ const t=Math.min(1,Math.max(0,(x-e0)/(e1-e0))); return t*t*(3-2*t); }
{
  /* a = tutma katsayısı: 0 ise arka plan, 1 ise kamera görüntüsü. */
  const uc=[[5,1],[5,40],[80,1],[80,40]];
  for(const [sim,smo] of uc){
    const e0=sim/100, e1=e0+Math.max(0.01,smo/100);
    const degerler=[0,0.1,0.3,0.6,1.0,1.732].map(d=>smoothstep(e0,e1,d));
    ok('eşik '+sim+' / yumuşaklık '+smo+' sonlu değer üretiyor',
       degerler.every(v=>Number.isFinite(v)));
    ok('eşik '+sim+' / yumuşaklık '+smo+' 0-1 aralığında kalıyor',
       degerler.every(v=>v>=0 && v<=1));
  }
  ok('perde rengine tam eşit piksel tamamen siliniyor', smoothstep(0.05,0.06,0)===0);
  ok('perdeden çok uzak piksel tamamen korunuyor', smoothstep(0.8,1.2,1.732)===1);
  /* Eşik büyüdükçe DAHA ÇOK siliniyor — etiket "ne kadarı silinsin" diyor. */
  const orta=0.4;
  ok('eşik büyüdükçe daha çok siliniyor (etiket doğru)',
     smoothstep(0.80,0.90,orta) < smoothstep(0.05,0.15,orta));
}

/* ---------- ASIL BULGU: ÖLÜ AYARLAR ARTIK SÖYLENİYOR ---------- */
ok('gölgelendirici yeşil ekran kapalıyken erken çıkıyor (ölülüğün kanıtı)',
   /if\(useKey<0\.5\)\{gl_FragColor=vec4\(c,1\.0\);return;\}/.test(kod));
ok('chroma bağımlı ayarlar bir bloğa alındı', /<div id="chromaDeps">/.test(tel));
ok('altyazı gömme bağımlı ayarlar bir bloğa alındı', /<div id="burnDeps">/.test(tel));

const mGate=kod.match(/function gateSettings\(\)\{[\s\S]*?\n\}/);
ok('gateSettings çıkarılabildi', !!mGate);
if(!mGate) return;
ok('blok kuralı yeşil ekrana bağlı', /'#chromaDeps', \(\)=>!!st\.chroma/.test(mGate[0]));
ok('blok kuralı altyazı gömmeye bağlı', /'#burnDeps',\s+\(\)=>!!st\.burnCaps/.test(mGate[0]));
/* v9.34: sebepler sözlüğe taşındı (tests/197). Ölçüt aynı — sebep İKİ DİLDE
   de var mı — ama artık doğru yerde aranıyor: sözlükte. */
ok('sebep iki dilde yazılıyor',
   /gwKroma:'yeşil ekran açık olmalı'/.test(tel) && /gwKroma:'needs green screen'/.test(tel) &&
   /gwGomme:'altyazı gömme açık olmalı'/.test(tel) && /gwGomme:'needs burned-in captions'/.test(tel));
ok('kapı sebebi sözlükten okuyor', /rKroma=t\('gwKroma'\)/.test(mGate[0]));
/* İDDİA "kapı her apply()te koşuyor"dur, satırın BİÇİMİ değil. Eski desen
   `renderVad(); gateSettings()` diye birebir yazılmıştı ve araya yeni bir
   render çağrısı girince kullanıcı için hiçbir şey değişmediği hâlde kırmızı
   verdi — CLAUDE.mddeki "biçime kilitlenmiş desen" sınıfının bir vakası daha.
   Ölçüt: render zincirinin AYNI satırında gateSettings çağrılıyor. */
ok('kapı ayar uygulanırken koşuyor', /renderVad\(\);[^\n]*gateSettings\(\)/.test(kod));

/* ---------- KAPI GERÇEKTEN NE YAPIYOR ---------- */
function kapiKos({chroma, burnCaps, comp, compOn}){
  return new Function('__c','__b','__k','__ko', `
    const st={chroma:__c, burnCaps:__b, voiceCmd:__b, comp:__k};
    const L='tr';
    ${SOZ}
    const t=(k)=>I18N[L][k];
    /* K2 kurallarinin okudugu durum (stream asagida zaten tanimli). */
    const sections=[];
    const kutular={};
    function blok(){ return { style:{}, cocuklar:[],
      querySelector(q){ return this.cocuklar.find(x=>x.sinif==='gateWhy')||null; },
      insertBefore(e){ this.cocuklar.unshift(e); }, get firstChild(){ return this.cocuklar[0]||null; } }; }
    /* K2de kapıya wakeDeps de eklendi; tezgâh onu tanımayınca gateSettings
       tanımsız bir öğeye yazmaya çalışıyordu. Kapının blok listesi büyüdükçe
       burası da büyümeli — iddia sayacı bu daralmayı yakaladı. */
    /* 2026-08-17: görüntü filtresi de bloğa alındı (segment + sürgü);
       comp nesnesi de tezgâha girdi: kural kompozitin GERÇEKTEN koştuğuna bakıyor. */
    kutular['#chromaDeps']=blok(); kutular['#burnDeps']=blok(); kutular['#wakeDeps']=blok();
    kutular['#vfxDeps']=blok();
    const comp={ on:!!__ko };
    const $=(s)=>{ if(kutular[s]) return kutular[s];
      return { querySelector:()=>null }; };
    const document={ createElement:()=>({ sinif:'', style:{cssText:''}, textContent:'',
      set className(v){ this.sinif=v; }, get className(){ return this.sinif; },
      remove(){} }) };
    const stream=null;
    ${mGate[0]}
    gateSettings();
    return { chromaSolgun: kutular['#chromaDeps'].style.opacity,
             burnSolgun:   kutular['#burnDeps'].style.opacity,
             vfxSolgun:    kutular['#vfxDeps'].style.opacity,
             chromaSebep:  (kutular['#chromaDeps'].cocuklar[0]||{}).textContent,
             burnSebep:    (kutular['#burnDeps'].cocuklar[0]||{}).textContent,
             vfxSebep:     (kutular['#vfxDeps'].cocuklar[0]||{}).textContent };
  `)(chroma, burnCaps, comp, compOn);
}
{
  const r=kapiKos({chroma:false, burnCaps:false});
  ok('yeşil ekran kapalıyken bağlı ayarlar soluklaşıyor', r.chromaSolgun==='0.45');
  ok('yeşil ekran kapalıyken NEDEN yazılıyor', /yeşil ekran açık olmalı/.test(r.chromaSebep||''));
  ok('altyazı gömme kapalıyken bağlı ayarlar soluklaşıyor', r.burnSolgun==='0.45');
  ok('altyazı gömme kapalıyken NEDEN yazılıyor', /altyazı gömme açık olmalı/.test(r.burnSebep||''));
}
{
  const r=kapiKos({chroma:true, burnCaps:true});
  ok('yeşil ekran açıkken ayarlar normal görünüyor', r.chromaSolgun==='');
  ok('yeşil ekran açıkken gereksiz açıklama yok', !r.chromaSebep);
  ok('altyazı gömme açıkken ayarlar normal görünüyor', r.burnSolgun==='');
  ok('altyazı gömme açıkken gereksiz açıklama yok', !r.burnSebep);
}
{
  /* İkisi bağımsız olmalı: biri açıkken diğeri kapalı kalabilir. */
  const r=kapiKos({chroma:true, burnCaps:false});
  ok('iki blok birbirinden bağımsız', r.chromaSolgun==='' && r.burnSolgun==='0.45');
}
/* ---------- GÖRÜNTÜ FİLTRESİ DE KAPININ İÇİNDE (2026-08-17) ----------
   `vidParams()` yalnız `drawComp()` içinde okunuyor: kompozit kapalıyken
   filtre ne önizlemeye ne kayda işliyor. Varsayılan `comp:false` olduğu için
   bu HER YENİ KULLANICIDA böyleydi ve kart yine de "Doğal" yazıyordu.
   K2 taraması bunu kaçırdı çünkü ölçütü ANAHTAR (`data-t=…`) idi; görüntü
   filtresi bir segment + bir sürgü. Kapının kör noktası buydu. */
{
  const kapali=kapiKos({chroma:false, burnCaps:false, comp:false, compOn:false});
  ok('kompozit kapalıyken filtre bloğu soluklaşıyor', kapali.vfxSolgun==='0.45');
  ok('kompozit kapalıyken NEDEN yazılıyor', /kompozit açık olmalı/.test(kapali.vfxSebep||''));
  /* ANAHTAR AÇIK AMA BORU HATTI KOŞMUYORSA DA ÖLÜ: `st.comp` kullanıcının
     niyeti, `comp.on` gerçeğidir. Kamera yokken ikincisi kurulamaz. */
  const niyet=kapiKos({chroma:false, burnCaps:false, comp:true, compOn:false});
  ok('anahtar açık ama boru hattı koşmuyorsa yine soluk', niyet.vfxSolgun==='0.45');
  const acik=kapiKos({chroma:false, burnCaps:false, comp:true, compOn:true});
  ok('kompozit gerçekten koşarken filtre normal görünüyor', acik.vfxSolgun==='');
  ok('kompozit koşarken gereksiz açıklama yok', !acik.vfxSebep);
}
{
  const tel2=oku(telefonYolu());
  ok('filtre denetimleri bir bloğa alındı', /<div id="vfxDeps">/.test(tel2));
  /* BLOĞUN İÇİ GERÇEKTEN KESİLİYOR. İlk yazışımda desen
     `<div id="vfxDeps">[\s\S]*?id="vidAmt"` idi ve tembel eşleşme kapanış
     etiketini AŞIYORDU: sürgüyü bloğun dışına taşıyan kasıtlı bozma
     yakalanmadı, yani test ayırt etmiyordu. Blok, kendisinden sonraki ilk
     ipucuna (filtre açıklaması) kadar kesilip İÇİNE bakılıyor. */
  /* 🔴 KESME ARTIK İÇ İÇE DİV SAYIYOR (2026-08-19). Eski hâli "vfxHint'e
     kadar oku, SON `</div>`e kadar kes" diyordu; blokta bir `<div class=hint>`
     bulunduğu anda son kapanış O ipucununki oluyor ve kesilen parça bloğun
     DIŞINDAKİ ögeleri de içine alıyordu. Sonuç: güzellik sürgüsü bloğun
     dışına taşındığı hâlde iddia YİNE geçti — yani test kendi kesme
     hatası yüzünden yanlış şeyi ölçüyordu. */
  const iBas = tel2.indexOf('<div id="vfxDeps">');
  const icerik = (()=>{
    if(iBas < 0) return '';
    let derinlik = 0, i = iBas;
    const acik = /<div\b/g, kapa = /<\/div>/g;
    while(i < tel2.length){
      acik.lastIndex = i; kapa.lastIndex = i;
      const a2 = acik.exec(tel2), k2 = kapa.exec(tel2);
      if(!k2) return tel2.slice(iBas);
      if(a2 && a2.index < k2.index){ derinlik++; i = a2.index + 4; }
      else { derinlik--; if(derinlik === 0) return tel2.slice(iBas, k2.index); i = k2.index + 6; }
    }
    return tel2.slice(iBas);
  })();
  ok('blok kesilebildi', !!icerik);
  ok('segment bloğun içinde', /id="vfxSeg"/.test(icerik));
  ok('sürgü de bloğun içinde', /id="vidAmt"/.test(icerik));
  /* 🔴 KARAR DEĞİŞTİ (2026-08-19) — v9.33'te bu iddia TERSİNİ söylüyordu ve
     YANLIŞTI. Güzellik gereken boru hattını KENDİSİ açıyor (`ensureCompVfx`),
     yani onun için "kompozit açık olmalı" diye bir ön koşul YOK. Bloğun
     içinde durduğu sürece satır soluklaşıyor ve "önce şunu aç" yazıyordu;
     Erdal canlı uygulamada tam bu yüzden "güzellik görünmüyor" dedi.
     Renk filtresi (segment + `vidAmt`) gerçekten kompozite bağlı, o blokta
     KALIYOR. Yani kural değişmedi: gerçekten ön koşulu olan gölgelenir,
     olmayan gölgelenmez. */
  ok('güzellik sürgüsü bloğun DIŞINDA (kendi ön koşulunu sağlıyor)',
     !/id="btyAmt"/.test(icerik) && /id="btyAmt"/.test(tel2));
  ok('blok kuralı kompozitin gerçekten koştuğuna bakıyor',
     /'#vfxDeps',\s+\(\)=>!!\(st\.comp&&comp\.on\)/.test(mGate[0]));
  /* Seçim yapmak AÇIK bir istektir: koşulu kendimiz sağlıyoruz (burnCaps ve
     chroma ile aynı karar). Fark: seçim geri ALINMIYOR, çünkü anahtar değil. */
  ok('filtre seçilince kompozit açılmaya çalışılıyor',
     /vfxSeg button'\)\.forEach\(b=>b\.onclick=\(\)=>\{[^}]*ensureCompVfx\(\)/.test(tel2.replace(/\/\*[\s\S]*?\*\//g,'')));
  /* DEĞİŞMEZ v9.33'te GENİŞLEDİ: kural "filtre kapalıysa boşuna kompozit
     açma" (pil ve ısı) idi ve geçerliliğini koruyor. Ama güzellik de aynı GL
     boru hattında çiziliyor ve renk filtresinden BAĞIMSIZ açılabiliyor —
     eski koşul onu sessizce ölü bırakırdı. Yeni koşul ikisini birden tutuyor:
     boru hattı YALNIZ gerçekten çizilecek bir şey varken kuruluyor. */
  ok('kapalı seçilirse ve güzellik de kapalıysa kompozit açılmıyor',
     /if\(\(st\.vidFx==='off' && !\(st\.bty>0\)\) \|\| comp\.on\) return true;/.test(tel2));
  ok('güzellik açıkken filtre kapalı olsa da boru hattı kuruluyor',
     /!\(st\.bty>0\)/.test(tel2));
  ok('kamera yoksa sebebi söyleniyor', /if\(!stream\)\{ toast\(m\('needCam'\)\); apply\(\); return false; \}/.test(tel2));
}

/* ---------- ESKİ ANAHTAR KAPISI DURUYOR ---------- */
for(const k of ['burnCaps','chroma','maskPrev','torch','voiceCmd'])
  ok('anahtar kapısında hâlâ var: '+k, new RegExp("\\['"+k+"',").test(mGate[0]));
