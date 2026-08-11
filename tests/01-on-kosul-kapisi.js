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
const ok=(n,c)=>console.log((c?'✓':'✗ HATA')+' '+n);

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
