const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
let toasts=[]; const toast=t=>toasts.push(t), m=k=>k;

// --- HATA GÜNLÜĞÜ: 30 tavanı + 8 sn'de tek uyarı ---
const ERRLOG=[]; let errShown=0, NOW=0;
function logErr(where,e){
  const msg=((e&&(e.message||e.reason||e))+'').slice(0,180);
  ERRLOG.push({t:NOW,where,msg}); if(ERRLOG.length>30) ERRLOG.shift();
  if(NOW-errShown>8000){ errShown=NOW; toast(m('jsErr')); }
}
const T0=1770000000000; for(let i=0;i<50;i++){ NOW=T0+i*100; logErr('js',new Error('hata'+i)); }
ok('günlük 30 ile sınırlı', ERRLOG.length===30);
ok('en yenisi duruyor', ERRLOG[29].msg==='hata49');
ok('5 sn içinde tek uyarı (spam yok)', toasts.length===1);
NOW=T0+20000; logErr('js','yeni'); ok('8 sn sonra tekrar uyarıyor', toasts.length===2);
ok('uzun mesaj kırpılıyor', (logErr('x','a'.repeat(500)), ERRLOG[29].msg.length===180));

// --- SESLE TAKİP: 5 denemede pes edip görünür şekilde kapanıyor mu ---
let voiceOn=true, srFails=0, stopped=false, starts=0;
const sr={ start(){ starts++; throw new Error('yasak'); } };
function stopVoice(){ voiceOn=false; stopped=true; }
function restartVoice(){
  if(!voiceOn||!sr) return;
  if(++srFails>5){ toast(m('voiceDied')); stopVoice(); return; }
  try{ sr.start(); srFails=0; }catch(e){ restartVoice(); }
}
restartVoice();
ok('sonsuz döngüye girmiyor', starts===5);
ok('pes edince görünür kapanıyor', stopped===true && toasts.includes('voiceDied'));

// başarılı olursa sayaç sıfırlanıyor mu
voiceOn=true; srFails=0; stopped=false; let n=0;
const sr2={ start(){ if(++n<3) throw new Error('x'); } };
function restart2(){ if(!voiceOn) return; if(++srFails>5){ stopVoice(); return; }
  try{ sr2.start(); srFails=0; }catch(e){ restart2(); } }
restart2();
ok('geçici hatadan sonra toparlıyor', n===3 && srFails===0 && !stopped);

// --- KAYIT BAŞLAMA GÖZCÜSÜ: yanlış alarm vermiyor mu ---
function watch({recActive,state,chunks,isWK}){
  const out=[];
  if(!recActive) return out;                       // kullanıcı durdurmuş
  if(state!=='recording'){ out.push('recNoStart'); return out; }
  if(!isWK && !chunks) out.push('recNoData');
  return out;
}
ok('durdurulmuşsa susuyor', watch({recActive:false,state:'inactive',chunks:0,isWK:false}).length===0);
ok('başlamadıysa uyarıyor', watch({recActive:true,state:'inactive',chunks:0,isWK:false})[0]==='recNoStart');
ok('iOS parça beklemiyor', watch({recActive:true,state:'recording',chunks:0,isWK:true}).length===0);
ok('iOS dışı veri yoksa uyarıyor', watch({recActive:true,state:'recording',chunks:0,isWK:false})[0]==='recNoData');
ok('sağlıklı kayıtta susuyor', watch({recActive:true,state:'recording',chunks:3,isWK:false}).length===0);

// --- KAMERA YENİDEN BAĞLANMA: kayıt sırasında akışa dokunmuyor mu ---
function shouldReopen({visible,stream,recState,track}){
  if(!visible||!stream) return false;
  if(recState==='recording') return false;
  return !!(track&&track==='ended');
}
ok('kayıt sürerken dokunmuyor', shouldReopen({visible:1,stream:1,recState:'recording',track:'ended'})===false);
ok('kopan akışı yeniliyor', shouldReopen({visible:1,stream:1,recState:'inactive',track:'ended'})===true);
ok('sağlam akışa dokunmuyor', shouldReopen({visible:1,stream:1,recState:'inactive',track:'live'})===false);
ok('arka plandayken dokunmuyor', shouldReopen({visible:0,stream:1,recState:'inactive',track:'ended'})===false);
