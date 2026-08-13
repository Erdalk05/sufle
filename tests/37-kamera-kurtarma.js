const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());
const mac=oku(macYolu());

/* KAMERA KURTARMA — TELEFON TARAFI TESTSİZDİ
   iOS uygulamayı arka plana alınca kamera izini KAPATABİLİYOR. Eskiden ekran
   siyah kalıyordu ve tek çare uygulamayı kapatıp açmaktı; v5.8'de otomatik
   yeniden bağlanma eklendi.

   Kapsam haritası şunu gösterdi: Mac'in kamera hata ayrımı test 15'te kilitli
   ama TELEFONUNKİ hiçbir testte geçmiyor (camDenied/camBusy/camNone/camBack
   sıfır dosyada) — üstelik asıl ürün telefon. Test 14 yalnız openCam'in
   temizlik zincirini kilitliyor, kurtarma yolunu değil.

   Bu dosya iki şeyi kilitliyor: yeniden bağlanma yolu ve hata ayrımı. */

const kod = tel.replace(/\/\*[\s\S]*?\*\//g,'');
const isleyici = cikar(kod,
  /document\.addEventListener\('visibilitychange',async\(\)=>\{[\s\S]*?\n\}\);/, 'kurtarma işleyicisi');

/* ---------- YENİDEN BAĞLANMA YOLU GERÇEKTEN KOŞULUYOR ---------- */
function kos({gorunur=true, akisVar=true, izDurumu='ended', kayitta=false, camAcilir=true}={}){
  const iz=[];
  const f=new Function('__iz','__g','__a','__d','__k','__c', `
    const document={ visibilityState: __g?'visible':'hidden', addEventListener:(t,f)=>{ __f=f; } };
    let __f=null;
    const stream = __a ? { getVideoTracks:()=>[{readyState:__d}] } : null;
    const rec = __k ? {state:'recording'} : null;
    const logErr=(w,e)=>__iz.push('log:'+e);
    const toast=m=>__iz.push('toast:'+m);
    const m=k=>k;
    const openCam=async()=>{ __iz.push('openCam'); return __c; };
    ${isleyici}
    return __f;
  `);
  const handler=f(iz,gorunur,akisVar,izDurumu,kayitta,camAcilir);
  return handler().then(()=>iz);
}

(async () => {
{
  const iz = await kos({izDurumu:'ended'});
  ok('kopan kamera izinde yeniden bağlanılıyor', iz.includes('openCam'));
  ok('kopma hata günlüğüne yazılıyor', iz.some(x=>/log:track ended/.test(x)));
  ok('başarılı bağlanma kullanıcıya söyleniyor', iz.some(x=>/toast:camBack/.test(x)));
}
{
  const iz = await kos({izDurumu:'live'});
  ok('sağlam izde gereksiz yere yeniden bağlanılmıyor', !iz.includes('openCam'));
}
{
  const iz = await kos({gorunur:false});
  ok('sayfa görünmezken akışa dokunulmuyor', !iz.includes('openCam'));
}
{
  const iz = await kos({akisVar:false});
  ok('hiç akış yokken çalışmıyor', !iz.includes('openCam'));
}
/* KAYIT SIRASINDA AKIŞA DOKUNULMAZ: kamerayı yeniden açmak süren kaydı
   bozar — MediaRecorder eski ize bağlı. */
{
  const iz = await kos({kayitta:true, izDurumu:'ended'});
  ok('kayıt sürerken akışa DOKUNULMUYOR', !iz.includes('openCam'));
}
/* Bağlanamazsa "geri geldi" demek yanlış bilgi olurdu. */
{
  const iz = await kos({izDurumu:'ended', camAcilir:false});
  ok('bağlanamayınca "geri geldi" denmiyor', !iz.some(x=>/camBack/.test(x)));
  ok('bağlanamayınca yine de denendiği kayda geçiyor', iz.includes('openCam'));
}

/* ---------- HATA AYRIMI (telefon) ----------
   "Kamera açılamadı: NotAllowedError" hiçbir şey anlatmıyordu. Üç sebep üç
   ayrı mesaj almalı; kullanıcı ne yapacağını ancak böyle bilir. */
const openCam = cikar(kod, /async function openCam\(\)\{[\s\S]*?\n\}/, 'openCam');
ok('izin reddi ayrı mesaj', /NotAllowedError'\|\|n==='SecurityError'\)\s*toast\(m\('camDenied'\)\)/.test(openCam));
ok('kamera meşgul ayrı mesaj', /NotReadableError'\|\|n==='AbortError'\)\s*toast\(m\('camBusy'\)\)/.test(openCam));
ok('kamera bulunamadı ayrı mesaj', /NotFoundError'\|\|n==='OverconstrainedError'\)\s*toast\(m\('camNone'\)\)/.test(openCam));
for (const k of ['camDenied','camBusy','camNone','camBack'])
  ok('"'+k+'" iki dilde tanımlı', (tel.match(new RegExp(k+":'","g"))||[]).length >= 2);

/* ---------- MİKROFON YOKSA SÖYLENİYOR ---------- */
ok('mikrofon yoksa kullanıcıya söyleniyor', /if\(!aTrack\) setTimeout\(\(\)=>toast\(m\('noMic'\)\)/.test(openCam));

/* ---------- GÖRÜNTÜ ÖLÜMÜ GÖZCÜSÜ ----------
   Kayıt sırasında video izi ölebiliyor: ses sürdüğü için kayıt sürüyor
   sanılıyor ama görüntü o saniyede donuyor. */
ok('kayıt sırasında görüntü ölümü izleniyor', /vidDied/.test(kod));
ok('görüntü ölümü mesajı iki dilde', (tel.match(/vidDied:'/g)||[]).length >= 2);

/* ---------- PLATFORM PARİTESİ ----------
   Mac'te hata ayrımı zaten kilitliydi; telefonun da aynı üç ayrımı olmalı. */
for (const [ad,d] of [['izin','NotAllowedError'],['meşgul','NotReadableError'],['bulunamadı','NotFoundError']])
  ok('hata ayrımı iki platformda da var — '+ad, new RegExp(d).test(tel) && new RegExp(d).test(mac));
})();
