const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
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
ok('sebep iki dilde yazılıyor',
   /yeşil ekran açık olmalı[\s\S]*?needs green screen/.test(mGate[0]) &&
   /altyazı gömme açık olmalı[\s\S]*?needs burned-in captions/.test(mGate[0]));
ok('kapı ayar uygulanırken koşuyor', /renderVad\(\); gateSettings\(\)/.test(kod));

/* ---------- KAPI GERÇEKTEN NE YAPIYOR ---------- */
function kapiKos({chroma, burnCaps}){
  return new Function('__c','__b', `
    const st={chroma:__c, burnCaps:__b, voiceCmd:__b};
    const L='tr';
    /* K2 kurallarinin okudugu durum (stream asagida zaten tanimli). */
    const sections=[];
    const kutular={};
    function blok(){ return { style:{}, cocuklar:[],
      querySelector(q){ return this.cocuklar.find(x=>x.sinif==='gateWhy')||null; },
      insertBefore(e){ this.cocuklar.unshift(e); }, get firstChild(){ return this.cocuklar[0]||null; } }; }
    /* K2de kapıya wakeDeps de eklendi; tezgâh onu tanımayınca gateSettings
       tanımsız bir öğeye yazmaya çalışıyordu. Kapının blok listesi büyüdükçe
       burası da büyümeli — iddia sayacı bu daralmayı yakaladı. */
    kutular['#chromaDeps']=blok(); kutular['#burnDeps']=blok(); kutular['#wakeDeps']=blok();
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
             chromaSebep:  (kutular['#chromaDeps'].cocuklar[0]||{}).textContent,
             burnSebep:    (kutular['#burnDeps'].cocuklar[0]||{}).textContent };
  `)(chroma, burnCaps);
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

/* ---------- ESKİ ANAHTAR KAPISI DURUYOR ---------- */
for(const k of ['burnCaps','chroma','maskPrev','torch','voiceCmd'])
  ok('anahtar kapısında hâlâ var: '+k, new RegExp("\\['"+k+"',").test(mGate[0]));
