const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* F2 — KAMERA YENİDEN AÇILINCA FENER SESSİZCE SÖNÜYORDU.

   Görev "ön/arka geçişte zoom + fener sızıntısı testte kilitli mi" diyordu.
   ÖLÇÜM: kamera değiştirmede sıfırlama zaten VARDI (st.zoom=100, st.torch=false)
   ve hiçbir testte anılmıyordu — yani sessizce silinebilirdi. Ama asıl kusur
   ters yöndeydi ve daha genişti:

   applyTorch() KAYNAKTA TEK YERDEN çağrılıyordu: fener anahtarının kendisi.
   Oysa kamerayı yeniden açan altı yol var — mikrofon değiştirme, çözünürlük
   değiştirme, ham ses, güvenli ses, "kamerayı yeniden aç" ve iz bitince
   çalışan kurtarma. Her birinde YENİ bir video izi doğuyor ve yeni iz fener
   sönük başlıyor; st.torch true kaldığı için anahtar "açık" göstermeye devam
   ediyordu. Kullanıcı ışığın neden gittiğini hiçbir yerde göremiyordu.
   Zoom'da aynı iş zaten doğruydu: setupCaps applyZoom() çağırıyor. Fenerde
   karşılığı yoktu — asimetri.

   İKİNCİ KUSUR (sıra): kamera değiştirmede sıfırlama apply()'den SONRA
   koşuyordu, yani arayüz eski değeri çiziyordu. Anahtar "açık" görünürken
   st.torch false oluyor; sonraki dokunuş anahtarı KAPALI gösterip ışığı
   YAKIYORDU. Sıfırlama apply()'den önceye alındı. */

const mCaps=kod.match(/function setupCaps\(\)\{[\s\S]*?\n\}/);
ok('setupCaps çıkarılabildi', !!mCaps);
const mTog=kod.match(/\$\$\('\.sw'\)\.forEach\(s=>s\.onclick=async\(\)=>\{[\s\S]*?\n\}\);/);
ok('anahtar işleyicisi çıkarılabildi', !!mTog);
if(!mCaps || !mTog) return;

/* ---------- FENER HER YENİ AKIŞA UYGULANIYOR MU ---------- */
function capsKos({torch, zoom}){
  const iz=[];
  return new Function('__iz','__t','__z', `
    const st={torch:true, zoom:250};
    let vTrack={};
    const caps={}; if(__t) caps.torch=true; if(__z) caps.zoom={min:1,max:3};
    vTrack.getCapabilities=()=>caps;
    const el=()=>({ style:{}, textContent:'', value:0, min:0, max:0 });
    const kutu={}; const $=(s)=>(kutu[s]=kutu[s]||el());
    const applyZoom=()=>__iz.push('zoom');
    const applyTorch=()=>__iz.push('fener');
    ${mCaps[0]}
    setupCaps();
    __iz.torchDurum=st.torch; __iz.zoomDurum=st.zoom;
    __iz.torchSatiri=kutu['#torchRow'].style.display;
    __iz.zoomSatiri=kutu['#zoomRow'].style.display;
    return __iz;
  `)(iz, torch, zoom);
}
{
  const r=capsKos({torch:true, zoom:true});
  ok('fener yeteneği varsa YENİ akışa uygulanıyor', r.includes('fener'));
  ok('zoom da yeni akışa uygulanıyor (zaten doğruydu)', r.includes('zoom'));
  ok('fener ayarı korunuyor', r.torchDurum===true);
  ok('fener satırı gösteriliyor', r.torchSatiri==='flex');
}
{
  const r=capsKos({torch:false, zoom:true});
  ok('feneri olmayan kamerada ayar kapatılıyor', r.torchDurum===false);
  ok('feneri olmayan kamerada satır gizleniyor', r.torchSatiri==='none');
  /* Sönük bir izde fener uygulamaya çalışmak anlamsız; kısıt hatası üretir. */
  ok('feneri olmayan kamerada boşuna uygulanmıyor', !r.includes('fener'));
}
{
  const r=capsKos({torch:true, zoom:false});
  ok('zoom yoksa zoom uygulanmıyor', !r.includes('zoom'));
  ok('zoom yoksa fener yine de uygulanıyor', r.includes('fener'));
  ok('zoom satırı gizleniyor', r.zoomSatiri==='none');
}

/* ---------- KAMERA DEĞİŞTİRMEDE SIRA ---------- */
function anahtarKos(k){
  const iz=[];
  return new Function('__iz','__k', `
    const st={backCam:false, zoom:250, torch:true, vad:false, wake:false, bionic:false};
    let stream=null, rec=null, comp={on:false};
    const apply=()=>__iz.push('cizildi:zoom='+st.zoom+',torch='+st.torch);
    const save=()=>__iz.push('kaydedildi:zoom='+st.zoom+',torch='+st.torch);
    const openCam=async()=>__iz.push('kameraAcildi');
    const vadBaslat=()=>{}, vadDurdur=()=>{}, requestWake=()=>{};
    const applyTorch=()=>__iz.push('fenerUygulandi');
    const buildContent=()=>{}, measure=()=>{}, setPos=()=>{}, yakinIdx=()=>0, eyeOff=()=>0;
    const toast=()=>{}, m=x=>x;
    let activeIdx=-1, wordTops=[], maxPos=0, pos=0;
    const kameraDegisebilir=()=>true;
    const s={dataset:{t:__k}};
    const el={onclick:null};
    const $$=()=>[el];
    ${mTog[0].replace("$$('.sw').forEach(s=>s.onclick=","el.onclick=(")
             .replace(/\}\);\s*$/,'});')}
    return {calistir:async()=>{ await el.onclick(); __iz.son='zoom='+st.zoom+',torch='+st.torch; return __iz; }};
  `)(iz, k);
}
{
  /* Kurulum notu: yukarıdaki tezgâh gerçek işleyiciyi kaynaktan koşturuyor.
     s.dataset.t anahtarın hangi ayar olduğunu söylüyor. */
  const t=anahtarKos('backCam');
  return t.calistir().then(r=>{
    ok('kamera değişince zoom sıfırlanıyor', /zoom=100/.test(r.son));
    ok('kamera değişince fener kapatılıyor', /torch=false/.test(r.son));
    const cizim=r.find(x=>/^cizildi:/.test(x));
    ok('arayüz SIFIRLANMIŞ değerle çiziliyor (sıra doğru)',
       cizim==='cizildi:zoom=100,torch=false');
    const kayit=r.find(x=>/^kaydedildi:/.test(x));
    ok('diske de sıfırlanmış değer yazılıyor', kayit==='kaydedildi:zoom=100,torch=false');
    son(r);
  });
}

function son(){
  /* ---------- KAYNAK DÜZEYİ: TEK ÇAĞRI NOKTASI KALMADI ---------- */
  ok('fener artık yetenek kurulumundan da uygulanıyor',
     /if\(!hasTorch\) st\.torch=false; else applyTorch\(\);/.test(kod));
  /* Gerekçe: aşağıdaki yolların HEPSİ openCam çağırıyor, openCam de setupCaps.
     Biri eklenip fener unutulursa hata yalnız o yolda geri gelir. */
  ok('yetenek kurulumu kamera açılışının parçası', /setupCaps\(\)/.test(
     (kod.match(/async function openCam\(\)\{[\s\S]*?\n\}/)||[''])[0]));
  const yollar=['st.micId=d.deviceId','st.quality=b.dataset.q',
                "k==='backCam'||k==='rawAudio'||k==='safeAudio'",
                "$('#reopenCam').onclick",'track ended'];
  for(const y of yollar)
    ok('kamerayı yeniden açan yol duruyor: '+JSON.stringify(y.slice(0,32)), kod.includes(y));
  ok('fener anahtarı hâlâ doğrudan da uyguluyor', /if\(k==='torch'\) applyTorch\(\)/.test(kod));
  ok('fener uygulaması iz yoksa sessizce çıkıyor',
     /function applyTorch\(\)\{ if\(!vTrack\) return;/.test(kod));
}
