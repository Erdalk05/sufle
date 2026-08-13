const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());
const mac=oku(macYolu());

/* KAYIT SÜRERKEN SESİN ÖLMESİ — İKİ AYRI YOL, İKİSİ DE SESSİZDİ
   Görüntü izi için gözcü vardı ("⛔ GÖRÜNTÜ KESİLDİ"), ses için YOKTU.
   Oysa aynı hata sınıfı ve kullanıcıya maliyeti daha yüksek: görüntü donunca
   ekranda fark ediliyor, ses gidince hiçbir belirti yok. Çekim bitiyor,
   kullanıcı yayına hazırlanıyor, sesin yarısının olmadığını izlerken görüyor.

   YOL 1 — mikrofon izi biter (Bluetooth kulaklık kopar, gelen arama mikrofonu
   kapar, USB mikrofon çıkar). Kayıt sürer, o saniyeden sonrası sessizdir.
   YOL 2 — Ses Stüdyosu zinciri kayıt ortasında askıya alınır. Askıdaki
   AudioContext SESSİZLİK üretir. Kurulum anında kontrol ediliyordu ama çekim
   başladıktan sonra bir daha bakılmıyordu.

   Kayıt başladıktan sonra izleri değiştirmek mümkün değil; yapılabilecek tek
   şey bağlamı geri getirmeyi denemek, olmazsa SÖYLEMEK. */

const kod = tel.replace(/\/\*[\s\S]*?\*\//g,'');
const doStart = cikar(kod, /function doStartRec\(\)\{[\s\S]*?\n\}/, 'doStartRec');

/* ---------- YOL 1: MİKROFON İZİ ÖLÜRSE ----------
   Kaynak düzeyi iddialar SİMÜLASYONDAN ÖNCE: gözcü hiç yoksa ya da yanlış ize
   bağlıysa simülasyon çöküyor ve çökmüş bir test adı olan tek bir iddia bile
   basmıyor — çıkış kodu doğru olsa da rapor okunmuyor. */
ok('ses gözcüsü doStartRec içinde var', /const aIz=/.test(doStart));
/* HANGİ İZ İZLENİYOR — kritik ayrım.
   Ses Stüdyosu açıkken kayda giden iz bir MediaStreamDestination izidir ve
   mikrofon ölse bile o iz "bitmez", sadece sessizlik akıtır. Gözcü bu yüzden
   ham mikrofon izine (stream) bakmalı, kayda giden akışa (src) değil. */
ok('gözcü HAM mikrofon izine bakıyor (src değil stream)',
   /const aIz=stream\.getAudioTracks\(\)\[0\];/.test(doStart));
ok('görüntü gözcüsü ise kayda giden akışa bakıyor (bozulmamış)',
   /const vIz=src\.getVideoTracks\(\)\[0\];/.test(doStart));

function sesIziOlur(){
  const iz=[];
  const parca = cikar(doStart, /sesOldu=0;[\s\S]*?\{once:true\}\);/, 'ses gözcüsü');
  new Function('__iz', `
    let sesOldu=0;
    const stream={ getAudioTracks:()=>[{ addEventListener:(t,f)=>{ if(t==='ended') __f=f; } }] };
    let __f=null;
    const recElapsed=()=>42.5;
    const logErr=(w,e)=>__iz.push('log:'+e);
    const toast=k=>__iz.push('toast:'+k);
    const buzz=()=>__iz.push('titresim');
    const m=k=>k;
    ${parca}
    if(__f) __f(); else __iz.push('DINLEYICI YOK');
    __iz.an = sesOldu;
  `)(iz);
  return iz;
}
{
  /* Çökme de bir sonuçtur ama ADI OLMALI: yığın izi yerine kırılan iddia gör. */
  let iz; try{ iz = sesIziOlur(); }
  catch(e){ ok('ses gözcüsü koşturulabiliyor ('+e.message+')', false); iz=[]; }
  ok('mikrofon izi ölünce dinleyici gerçekten var', !iz.includes('DINLEYICI YOK'));
  ok('kullanıcıya SÖYLENİYOR', iz.some(x=>/toast:audDied/.test(x)));
  ok('titreşimle de uyarılıyor (kullanıcı sufleye bakıyor olabilir)', iz.includes('titresim'));
  ok('kopma anı saniyesiyle günlüğe yazılıyor', iz.some(x=>/log:ses izi öldü @42\.5s/.test(x)));
  ok('kopma anı sonuç ekranı için saklanıyor', iz.an === 42.5);
}

/* ---------- YOL 2: SES STÜDYOSU BAĞLAMI ASKIYA ALINIRSA ---------- */
function fxGozcusu({durum='suspended', geriGelir=false, kayitta=true, duraklatildi=false, fxAcik=true}={}){
  const iz=[];
  const parca = cikar(doStart, /clearInterval\(fxWatch\); fxWatch=0; fxWarned=false;[\s\S]*?\n  \},1000\);/, 'fx gözcüsü');
  let tick=null;
  const f=new Function('__iz','__d','__g','__k','__p','__x','__setTick', `
    let fxWatch=0, fxWarned=false;
    const clearInterval=()=>{};
    const setInterval=(fn)=>{ __setTick(fn); return 1; };
    const rec = __k ? {state:'recording'} : {state:'inactive'};
    const recPaused = __p;
    const fxUsed = __x;
    const afx = { ctx:{ state:__d, resume(){ if(__g) afx.ctx.state='running'; return Promise.resolve(); } } };
    const recElapsed=()=>7.5;
    const logErr=(w,e)=>__iz.push('log:'+e);
    const toast=k=>__iz.push('toast:'+k);
    const buzz=()=>__iz.push('titresim');
    const m=k=>k;
    ${parca}
    __iz.kuruldu = fxWatch===1;
  `);
  f(iz,durum,geriGelir,kayitta,duraklatildi,fxAcik,fn=>{tick=fn;});
  if(tick){ tick(); tick(); }   // iki tur: uyarı tekrarlamamalı
  return new Promise(r=>setImmediate(()=>setImmediate(()=>r(iz))));
}

(async () => {
{
  const iz = await fxGozcusu({durum:'suspended', geriGelir:false});
  ok('bağlam askıya alınınca gözcü yakalıyor', iz.some(x=>/log:bağlam kayıt sırasında suspended @7\.5s/.test(x)));
  ok('geri gelmiyorsa "bundan sonrası SESSİZ" deniyor', iz.some(x=>/toast:fxDead/.test(x)));
  ok('titreşimle de uyarılıyor', iz.includes('titresim'));
  ok('uyarı her saniye tekrarlanmıyor', iz.filter(x=>/toast:fxDead/.test(x)).length === 1);
}
{
  const iz = await fxGozcusu({durum:'suspended', geriGelir:true});
  ok('önce geri getirmeyi DENİYOR', iz.some(x=>/toast:fxBack/.test(x)));
  ok('geri geldiyse "sessiz kaydediliyor" denmiyor (yanlış alarm yok)',
     !iz.some(x=>/fxDead/.test(x)));
}
{
  const iz = await fxGozcusu({durum:'running'});
  ok('sağlam bağlamda hiç uyarı yok', !iz.some(x=>/toast:/.test(x)));
}
{
  const iz = await fxGozcusu({durum:'suspended', kayitta:false});
  ok('kayıt yokken çalışmıyor', !iz.some(x=>/toast:/.test(x)));
}
{
  const iz = await fxGozcusu({durum:'suspended', duraklatildi:true});
  ok('kayıt duraklatılmışken yanlış alarm vermiyor', !iz.some(x=>/toast:/.test(x)));
}
{
  const iz = await fxGozcusu({durum:'suspended', fxAcik:false});
  ok('Ses Stüdyosu kullanılmıyorsa gözcü hiç kurulmuyor', iz.kuruldu === false);
}

/* ---------- GÖZCÜ KAPATILIYOR MU ----------
   Kapatılmazsa çekim bittikten sonra da saniyede bir çalışır: pil yakar ve
   sonraki çekimde eski durumdan yanlış alarm verir. */
const stopRec = cikar(kod, /function stopRec\(\)\{[\s\S]*?\n\}/, 'stopRec');
ok('çekim bitince gözcü durduruluyor', /clearInterval\(fxWatch\); fxWatch=0;/.test(stopRec));
ok('uyarı bayrağı da sıfırlanıyor (sonraki çekim temiz başlasın)',
   /fxWarned=false;/.test(stopRec));

/* ---------- SONUÇ EKRANI SON ŞANS ----------
   Kayıt sırasındaki uyarıyı kaçırmış olabilir; sonuç ekranında da yazmalı. */
ok('sonuç ekranında "SES ... SANİYEDE KESİLDİ" var', /SES '\+clock\(sesOldu\)\+' SANİYEDE KESİLDİ/.test(kod));
ok('sonuç ekranı iki dilde', /AUDIO STOPPED AT '\+clock\(sesOldu\)/.test(kod));
ok('ne yapacağı söyleniyor (kulaklığı kontrol et)', /Kulaklığı kontrol et/.test(kod));
ok('görüntü donması tanısı bozulmadı', /GÖRÜNTÜ '\+clock\(nerede\)\+' SANİYEDE DONMUŞ/.test(kod));

/* ---------- MESAJLAR ---------- */
for(const k of ['audDied','fxDead','fxBack'])
  ok('"'+k+'" iki dilde tanımlı', (tel.match(new RegExp(k+":'","g"))||[]).length >= 2);
ok('ses ölümü mesajı ne yapılacağını söylüyor', /audDied:'[^']*kaydı bitir/.test(tel));
ok('sessiz kayıt mesajı sonucunu söylüyor (SESSİZ)', /fxDead:'[^']*SESSİZ/.test(tel));

/* ---------- KURULUM ANINDAKİ KORUMA DURUYOR MU ----------
   Bu düzeltme onun yerine geçmiyor, üstüne ekleniyor. */
const mk = cikar(kod, /function makeFxTrack\(\)\{[\s\S]*?\n\}/, 'makeFxTrack');
ok('kurulumda askıdaki bağlamda hâlâ ham ize düşülüyor',
   /if\(ctx\.state!=='running'\)\{[\s\S]{0,200}?return null;/.test(mk));

/* ---------- MAC PARİTESİ ----------
   Aynı delik Mac'te de vardı; USB/Bluetooth mikrofonun kopması masaüstünde
   telefondan bile olası. Mac'te fxWatch YOK — orada Ses Stüdyosu bağlamı
   kayıt boyunca sayfayla birlikte yaşıyor; izlenen tek şey mikrofon izi. */
ok('Mac de ses izi ölümünü izliyor', /const aIz=stream\.getAudioTracks\(\)\[0\];/.test(mac));
ok('Mac uyarısı ne yapılacağını söylüyor', /SES KESİLDİ[^']*kaydı bitir/.test(mac));
ok('Mac ham mikrofon izine bakıyor (dest izi değil)',
   !/const aIz=src\.getAudioTracks/.test(mac));
ok('Mac sonuç ekranında da yazıyor', /SES '\+fmtTime\(sesOldu\)/.test(mac));
ok('Mac görüntü gözcüsü bozulmadı', /const vIz=src\.getVideoTracks\(\)\[0\];/.test(mac));
})();
