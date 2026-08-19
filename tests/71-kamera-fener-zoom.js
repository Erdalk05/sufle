const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
/* v9.34: setupCaps yetenek KARARLARINI cekirdek/kamera.js'ten soruyor;
   tezgâh o modülü de yüklemeli, yoksa çıkarılan kod tanımsız fonksiyon
   çağırır ve test ÜRÜN DOĞRUYKEN çöker. */
const {cekirdekOku}=require('./kaynak');
const KAM=cekirdekOku('kamera.js','SUFLE_KAMERA');
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
const mTog=kod.match(/const k=s\.dataset\.t;[\s\S]*?\n\}\);/);
ok('anahtar işleyicisi çıkarılabildi', !!mTog);
if(!mCaps || !mTog) return;

/* ---------- FENER HER YENİ AKIŞA UYGULANIYOR MU ---------- */
function capsKos({torch, zoom, odak, poz}){
  const iz=[];
  return new Function('__iz','__t','__z','__o','__p', `
    ${KAM}
    const st={torch:true, zoom:250, camLock:true};
    let vTrack={};
    const caps={}; if(__t) caps.torch=true; if(__z) caps.zoom={min:1,max:3};
    /* D.2: odak/pozlama kilidi de yeteneğe bağlı — taklit onu da sunabilmeli. */
    if(__o) caps.focusMode=['continuous','manual'];
    if(__p) caps.exposureMode=['continuous','manual'];
    /* Bu satır tezgâhı yeniden yazarken bir kez DÜŞÜRÜLDÜ ve yetenekler hiç
       okunmadı: dört fener/zoom iddiası birden kırıldı. Taklit kurarken
       "neyi sağladığımı" değil "neyin okunduğunu" izlemek gerekiyor. */
    vTrack.getCapabilities=()=>caps;
    /* Taklit önce yalnız innerHTML/style sağlıyordu; setupCaps classList'e de
       dokununca "toggle of undefined" verip 25 iddia 2'ye düştü. Taklit
       gerçeğe uyduruldu ve sınıf değişimleri İZ olarak kaydediliyor. */
    const el=(s)=>({ style:{}, textContent:'', value:0, min:0, max:0,
      classList:{ toggle:(c,v)=>__iz.push('sinif '+s+' '+c+'='+v),
                  add:c=>__iz.push('ekle '+s+'.'+c),
                  remove:c=>__iz.push('cikar '+s+'.'+c) } });
    const kutu={}; const $=(s)=>(kutu[s]=kutu[s]||el(s));
    const applyZoom=()=>__iz.push('zoom');
    const applyTorch=()=>__iz.push('fener');
    let kilitOdakKipi, kilitPozKipi;
    const applyCamLock=(a,b)=>__iz.push('kilit '+a+'/'+b);
    ${mCaps[0]}
    setupCaps();
    __iz.torchDurum=st.torch; __iz.zoomDurum=st.zoom; __iz.kilitDurum=st.camLock;
    __iz.torchSatiri=kutu['#torchRow'].style.display;
    __iz.zoomSatiri=kutu['#zoomRow'].style.display;
    __iz.kilitSatiri=kutu['#lockRow'].style.display;
    return __iz;
  `)(iz, torch, zoom, odak, poz);
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
    ${KAM}
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
    el.onclick=async()=>{ ${mTog[0].replace(/\n\s*\};\n\}\);\s*$/,'').replace(/\n\}\);\s*$/,'')} };
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

/* ---------- D.2: ODAK/POZLAMA KİLİDİ YETENEĞE BAĞLI MI ---------- */
{
  /* Desteksiz cihazda anahtar HİÇ görünmemeli ve durum temizlenmeli —
     yoksa kullanıcı açar, hiçbir şey olmaz (deponun 3 numaralı sınıfı). */
  const yok=capsKos({torch:true, zoom:true, odak:false, poz:false});
  ok('kilit desteklenmiyorsa satır gizli', yok.kilitSatiri==='none');
  ok('kilit desteklenmiyorsa durum temizleniyor', yok.kilitDurum===false);
  ok('kilit desteklenmiyorsa kameraya kısıt GÖNDERİLMİYOR',
     !yok.some(x=>String(x).startsWith('kilit ')));
  ok('ipucu da gizleniyor', yok.includes('sinif #lockHint hidden=true'));

  /* Yalnız ODAK destekleniyorsa bile özellik açılmalı: iki yetenekten birini
     şart koşmak, cihazların yarısında özelliği ölü bırakırdı. */
  const yalnizOdak=capsKos({torch:true, zoom:true, odak:true, poz:false});
  ok('yalnız odak desteklense bile satır görünüyor', yalnizOdak.kilitSatiri==='flex');
  ok('yalnız odak desteklense bile kısıt gönderiliyor',
     yalnizOdak.some(x=>String(x).startsWith('kilit manual/undefined')));

  const ikisi=capsKos({torch:true, zoom:true, odak:true, poz:true});
  ok('ikisi de desteklenirse ikisi de gönderiliyor',
     ikisi.some(x=>String(x)==='kilit manual/manual'));
  ok('destek varken kullanıcı tercihi korunuyor', ikisi.kilitDurum===true);
}
