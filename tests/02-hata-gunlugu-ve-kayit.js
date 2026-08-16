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

/* ---------- GERÇEK KAYNAKTAN KOŞTURMA ----------
   YUKARIDAKİ BLOKLAR KOPYA. Bu depoda kural açık: "testler mantığı kopyalamaz,
   gerçek kaynaktan çıkarıp koşturur — kopya test, kod değişince sessizce yalan
   söyler." Ölçüldü (2026-08-16): `ERRLOG` tavanını kaynaktan SÖKÜNCE bu dosya
   yine yeşil kaldı, çünkü kendi kopyasını ölçüyordu. Kopyalar okunabilir birer
   model olarak duruyor; aşağıdaki bölüm GERÇEK `logErr`i koşturuyor. */
{
  const {telefonYolu,oku,blokKes}=require('./kaynak');
  const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');
  const govde=blokKes(kod,'function logErr(');
  ok('gerçek logErr çıkarılabildi', !!govde);
  if(govde){
    const kur=()=>{
      const iz={gunluk:[], uyari:0, yazilan:null};
      const f=new Function('__iz','__zaman', `
        const ERRLOG=__iz.gunluk; let errShown=0;
        const LS='x';
        const Date={now:()=>__zaman()};
        const localStorage={setItem:(k,v)=>{ __iz.yazilan=v; }};
        const toast=()=>{ __iz.uyari++; };
        const m=k=>k;
        ${govde}
        return logErr;
      `);
      let t=1770000000000;
      const logErr=f(iz, ()=>t);
      return {iz, logErr, ilerlet:(ms)=>{ t+=ms; }};
    };
    {
      const {iz, logErr, ilerlet}=kur();
      for(let i=0;i<50;i++){ ilerlet(100); logErr('js', new Error('hata'+i)); }
      ok('gerçek günlük 30 ile sınırlı ('+iz.gunluk.length+')', iz.gunluk.length===30);
      ok('gerçek günlükte en yenisi duruyor', iz.gunluk[29].msg==='hata49');
      /* Uyarı 8 sn'de bir: 50 hata 5 saniyeye yayıldı, yani tek uyarı. */
      ok('gerçek uyarı boğmuyor ('+iz.uyari+')', iz.uyari===1);
      /* Kalıcılık: son 10 kayıt diske yazılıyor — sonraki oturumda okunabilsin. */
      ok('gerçek günlük diske yazılıyor', typeof iz.yazilan==='string');
      ok('diske yalnız son 10 kayıt yazılıyor', JSON.parse(iz.yazilan).length===10);
    }
    {
      const {iz, logErr}=kur();
      logErr('x','a'.repeat(500));
      ok('gerçek mesaj 180 karakterde kırpılıyor', iz.gunluk[0].msg.length===180);
    }
  }
}
