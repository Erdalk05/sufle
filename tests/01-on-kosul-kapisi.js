// index.html'den ÇIKARILAN gerçek mantık, sentetik durumla koşuyor
let comp={on:false}, stream={}, st={burnCaps:false,chroma:false,comp:false}, toasts=[], started=0;
const m=k=>k, toast=t=>toasts.push(t), apply=()=>{}, save=()=>{};
const startComp=()=>{ started++; comp.on=true; return true; };
function ensureComp(k){
  if(!st[k] || comp.on) return true;
  if(!stream){ st[k]=false; apply(); save(); toast(m('needCam')); return false; }
  if(!startComp()){ st[k]=false; apply(); save(); return false; }
  st.comp=true; apply(); save(); toast(m('needsComp')); return true;
}
/* ÖLÇÜLDÜ (2026-08-16): bu satır ÇIKIŞ KODUNU AYARLAMIYORDU, yani bu dosya
   kurulduğundan beri kapıyı hiç kırmızıya çeviremiyordu — iddiaları
   yazdırıyor ama sonucu kimseye bildirmiyordu. Kasıtlı bozma turunda iki
   bozma "yakalanmadı" dedi, oysa iddialar HATA basıyordu. `tests/114`
   artık her test dosyasının çıkış kodunu ayarladığını denetliyor. */
const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };

// 1: kamera varken burnCaps açılınca kompozit kendiliğinden açılıyor mu
st.burnCaps=true; ensureComp('burnCaps');
ok('burnCaps → kompozit açıldı', comp.on && st.comp && toasts.pop()==='needsComp');
// 2: zaten açıkken ikinci kez başlatmıyor
st.chroma=true; ensureComp('chroma');
ok('kompozit açıkken tekrar başlatmıyor', started===1 && st.chroma);
// 3: kamera yokken anahtarı geri alıyor
comp={on:false}; stream=null; st={burnCaps:false,chroma:true,comp:false}; toasts=[];
ensureComp('chroma');
ok('kamera yok → chroma geri alındı', st.chroma===false && toasts[0]==='needCam');
// 4: kapatma yönünde hiç müdahale yok
comp={on:true}; stream={}; st={burnCaps:false,comp:true}; toasts=[];
ok('kapatırken sessiz', ensureComp('burnCaps')===true && toasts.length===0);

// --- keydown sırası: Escape öğrenilebiliyor mu ---
function press(key,{sheetOpen,learning}){
  const r={gotKey:false,learnKey:null,closed:false,act:null};
  r.gotKey=true;
  if(sheetOpen && learning){ r.learnKey=key; return r; }
  if(key==='Escape'){ r.closed=true; return r; }
  const MAP={' ':'toggle','ArrowUp':'faster'}; if(MAP[key]) r.act=MAP[key];
  return r;
}
ok('öğrenme modunda Escape yakalanıyor', press('Escape',{sheetOpen:1,learning:1}).learnKey==='Escape');
ok('normalde Escape sayfayı kapatıyor', press('Escape',{sheetOpen:0,learning:0}).closed===true);
ok('öğrenme modunda Boşluk eyleme gitmiyor', press(' ',{sheetOpen:1,learning:1}).act===null);
ok('normalde Boşluk çalışıyor', press(' ',{sheetOpen:0,learning:0}).act==='toggle');
ok('her tuş gotKey damgalıyor', press('VolumeUp',{sheetOpen:1,learning:0}).gotKey===true);

/* ---------- GERÇEK `ensureComp` KOŞUYOR MU ----------
   YUKARISI KOPYA: `ensureComp` bu dosyada yeniden yazılmıştı, yani kaynak
   değişse test yine yeşil kalırdı (aynı sınıf `tests/02` ve `tests/10`da
   yakalandı). Aşağısı kuralı KAYNAKTAN çıkarıp koşturuyor. */
{
  const {telefonYolu,oku,blokKes}=require('./kaynak');
  const kaynak=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');
  const govde=blokKes(kaynak,'function ensureComp(');
  ok('gerçek ensureComp çıkarılabildi', !!govde);
  if(govde){
    const kur=({kamera=true, kompozitAcik=false, baslar=true}={})=>{
      const iz={toast:[], kaydedildi:0, uygulandi:0, baslatildi:0};
      const durum={burnCaps:true, chroma:false, comp:kompozitAcik};
      const f=new Function('__iz','__st','__o', `
        const st=__st;
        const comp={on:__o.kompozitAcik};
        const stream=__o.kamera?{}:null;
        const apply=()=>{ __iz.uygulandi++; };
        const save=()=>{ __iz.kaydedildi++; };
        const toast=k=>__iz.toast.push(k);
        const m=k=>k;
        const startComp=()=>{ __iz.baslatildi++; comp.on=__o.baslar; return __o.baslar; };
        ${govde}
        return ensureComp;
      `);
      return {iz, durum, ensureComp:f(iz, durum, {kamera,kompozitAcik,baslar})};
    };
    {
      const {iz,durum,ensureComp}=kur();
      ok('gerçek: ön koşul sağlanınca kompozit açılıyor', ensureComp('burnCaps')===true);
      ok('gerçek: kompozit durumu kaydediliyor', durum.comp===true && iz.kaydedildi>0);
      ok('gerçek: kullanıcıya sebebi söyleniyor', iz.toast.includes('needsComp'));
    }
    {
      /* KAMERA YOKKEN AYAR GERİ ALINMALI: açık kalan ama hiçbir şey yapmayan
         anahtar bu deponun 3 numaralı hata sınıfı (ön koşulu olan ayar). */
      const {iz,durum,ensureComp}=kur({kamera:false});
      ok('gerçek: kamera yokken kapı kapalı', ensureComp('burnCaps')===false);
      ok('gerçek: kamera yokken ayar geri alınıyor', durum.burnCaps===false);
      ok('gerçek: kamera yokken sebep yazılıyor', iz.toast.includes('needCam'));
      ok('gerçek: kamera yokken kompozit başlatılmıyor', iz.baslatildi===0);
    }
    {
      /* Kompozit ZATEN AÇIKSA ikinci kez başlatmak WebGL bağlamını yeniden
         kurar; ölçülmüş kusur sınıfı. */
      const {iz,ensureComp}=kur({kompozitAcik:true});
      ok('gerçek: kompozit açıkken tekrar başlatılmıyor',
         ensureComp('burnCaps')===true && iz.baslatildi===0);
      ok('gerçek: gereksiz bildirim yok', iz.toast.length===0);
    }
    {
      /* Ayar KAPALIYSA kapı sessiz geçmeli — kullanıcı kapatırken uyarı almaz. */
      const {iz,durum,ensureComp}=kur();
      durum.burnCaps=false;
      ok('gerçek: kapalı ayarda sessiz geçiliyor',
         ensureComp('burnCaps')===true && iz.toast.length===0 && iz.baslatildi===0);
    }
    {
      /* Kompozit başlatılamazsa (WebGL yok) ayar yine geri alınmalı. */
      const {durum,ensureComp}=kur({baslar:false});
      ok('gerçek: kompozit açılamazsa ayar geri alınıyor',
         ensureComp('burnCaps')===false && durum.burnCaps===false);
    }
  }
}
