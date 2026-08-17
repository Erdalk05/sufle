const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku, repoOku} = require('./kaynak.js');

/* ÖNİZLEME DONMASI (2026-08-17, GERÇEK CİHAZDAN BİLDİRİLDİ — iPhone)

   Erdal ölçtü: kayda BASMADAN önizleme yaparken bir süre sonra GÖRÜNTÜ
   donuyor, ses akmaya devam ediyor.

   Neden kapı bunu hiç görmemişti: kamera korumalarının HEPSİ kayıt yoluna
   yazılmıştı (iz öldü → çekimi bitir, görüntü kesildi → uyar). Önizleme
   yolunda tek bir nöbetçi yoktu — deponun 1 numaralı hata sınıfı, kardeş
   yolun açıkta kalması.

   İkinci ve daha sinsi sebep: var olan tek kurtarma `readyState==='ended'`
   arıyordu. iOS'ta kesinti izi ÖLDÜRMÜYOR, SUSTURUYOR (`track.muted`):
   kare akışı durur, iz "live" görünür. Ölçen kontrol YANLIŞ ŞEYE bakınca
   kusur "yok" sanılır.

   Bu test nöbetçinin merdivenini kilitliyor. iOS tetiğini burada üretemeyiz;
   MEKANİZMA sınanıyor (donma algılandı mı, sırayla ne denendi, kayıt
   sürerken karışıyor mu). Kurtarmanın kendisi gerçek tarayıcıda da ölçüldü:
   duraklatılan önizleme 9 saniye içinde geri geldi ve günlüğe durum yazıldı. */

const src = oku(telefonYolu());

ok('nöbetçi kaynakta var', /function onizNabiz\(\)\{/.test(src));
ok('kamera açılınca başlıyor', /onizIzleBaslat\(\);\n    return true;/.test(src));
ok('iz susunca ANINDA haber veriliyor (2 sn nabzı bekleme)',
   /vTrack\.addEventListener\('mute'/.test(src) && /vTrack\.addEventListener\('unmute'/.test(src));
ok('susma sonrası görüntü yeniden oynatılıyor',
   /addEventListener\('unmute'[\s\S]{0,220}cam\.play\(\)/.test(src));
ok('kare sayısı iki tarayıcı yoluyla da okunuyor (Safari + Chrome)',
   /getVideoPlaybackQuality/.test(src) && /webkitDecodedFrameCount/.test(src));
ok('kare sayacı yoksa currentTime ile ölçülüyor',
   /return Math\.round\(\(cam\.currentTime\|\|0\)\*1000\);/.test(src));
ok('teşhis satırı hangi yolun tuttuğunu yazıyor',
   /sesle takip:'\+\(!!voiceOn\)/.test(src) && /nefes:'\+\(!!\(vad&&vad\.ctx\)\)/.test(src));
/* Ele alınmış durum, ÇÖKME uyarısı gibi görünmemeli. */
ok('nöbetçi genel hata bildirimini tetiklemiyor (sessiz kayıt)',
   /function logNot\(where,msg\)\{/.test(src) && /logNot\('oniz'/.test(src) &&
   !/logErr\('oniz','önizleme donmuş/.test(src));
ok('sessiz kayıt yine de günlüğe yazıyor (teşhis kaybolmasın)',
   /function logNot\(where,msg\)\{[\s\S]{0,400}?localStorage\.setItem\(LS\+'_err'/.test(src));

/* ---------- MERDİVEN KOŞARAK ---------- */
const blok=(src.match(/async function onizNabiz\(\)\{[\s\S]*?\n\}/)||[])[0];
ok('nabız çıkarılabildi', !!blok);
if (blok) {
  const kur=(durum)=>{
    const iz={muted:durum.izSusmus||false, readyState:'live'};
    const d={
      iz, iyileşme:[], toastlar:[], gunluk:[],
      cam:{ paused:durum.duraklamis||false,
            play(){ d.iyileşme.push('play'); this.paused=false; return Promise.resolve(); },
            set srcObject(v){ d.iyileşme.push('yeniden-bagla'); }, get srcObject(){ return {}; } },
    };
    const f=new Function('d','durum', `
      const stream={ getVideoTracks:()=>[d.iz] };
      const body={ classList:{ contains:()=>true } };
      const rec=durum.kayitta ? {state:'recording'} : null;
      const document={ visibilityState: durum.gizli ? 'hidden' : 'visible' };
      const cam=d.cam;
      const logNot=(w,m)=>d.gunluk.push(m);
      const logErr=(w,m)=>d.gunluk.push('HATA:'+m);
      const toast=x=>d.toastlar.push(x);
      const m=k=>k;
      const IS_WK=!!durum.ios;
      const voiceOn=!!durum.sesle;
      let vad=durum.nefes ? {ctx:{}} : null;
      const vadDurdur=()=>{ d.iyileşme.push('nefes-birakildi'); vad=null; };
      const openCam=async()=>{ d.iyileşme.push('kamera-yeniden-acildi'); return true; };
      let onizAdim=durum.adim||0, onizZaman=0, onizKare=durum.kare||0, onizSoylendi=!!durum.soylendi;
      const onizKareSayisi=()=>durum.kare||0;   // KARE İLERLEMİYOR = donuk
      ${blok}
      return onizNabiz().then(()=>({adim:onizAdim, soylendi:onizSoylendi}));
    `);
    return f(d,durum).then(son=>({...d, son}));
  };

  (async()=>{
    /* 1. adım: duraklamış öge → play */
    let r=await kur({duraklamis:true});
    ok('donma algılanıyor ve önce play() deneniyor', r.iyileşme.includes('play'));
    ok('kullanıcıya BİR KEZ ne olduğu söyleniyor', r.toastlar.length===1);
    ok('günlüğe durum yazılıyor', r.gunluk.length===1 && /önizleme donmuş/.test(r.gunluk[0]));
    /* 2. adım: hâlâ donuk → akışı yeniden bağla */
    r=await kur({adim:1, soylendi:true});
    ok('ikinci turda akış ögeye yeniden bağlanıyor', r.iyileşme.includes('yeniden-bagla'));
    ok('ikinci turda tekrar tekrar bildirim yağmıyor', r.toastlar.length===0);
    /* 2. adımda iOS + nefes takibi açıksa mikrofon bırakılıyor */
    r=await kur({adim:1, soylendi:true, ios:true, nefes:true});
    ok('iOSta mikrofonu tutan nefes takibi bırakılıyor', r.iyileşme.includes('nefes-birakildi'));
    ok('bırakma sessiz değil, sebebi söyleniyor', r.toastlar.some(x=>/onizNefesKapandi/.test(x)));
    r=await kur({adim:1, soylendi:true, ios:false, nefes:true});
    ok('iOS dışında nefes takibine dokunulmuyor', !r.iyileşme.includes('nefes-birakildi'));
    /* 3. adım: kamera baştan açılıyor */
    r=await kur({adim:2, soylendi:true});
    ok('üçüncü turda kamera baştan açılıyor', r.iyileşme.includes('kamera-yeniden-acildi'));
    ok('merdiven başa dönüyor (sonsuz açma döngüsü yok)', r.son.adim===0);
    /* KAYIT SÜRERKEN AKIŞA DOKUNULMAZ — o yolun kendi kuralları var. */
    r=await kur({duraklamis:true, kayitta:true});
    ok('kayıt sürerken nöbetçi karışmıyor', r.iyileşme.length===0 && r.toastlar.length===0);
    /* ARKA PLANDA DONMA NORMALDİR — yanlış alarm vermemeli. */
    r=await kur({duraklamis:true, gizli:true});
    ok('arka planda yanlış alarm vermiyor', r.iyileşme.length===0 && r.toastlar.length===0);
  })();
}

/* KAMERA DEĞİŞİRKEN NÖBETÇİ SUSMALI (2026-08-17). Kamera/mikrofon
   değiştirilirken ya da "Sesi onar" düğmesinde izler durduruluyor; kareler
   MEŞRU olarak akmaz. Nöbetçi o sırada açık kalırsa donma sanıp yanlış alarm
   verir — ölçüm aracının kullanıcıya olmayan kusuru anlatması, kusurdan
   beterdir (bu turda kapının kendisi de aynı hatayı yaptı). */
{
  const kaynak = oku(telefonYolu());
  ok('kamera yeniden açılırken nöbetçi durduruluyor',
     /onizIzleDurdur\(\);\n    if\(stream\) stream\.getTracks\(\)\.forEach\(x=>x\.stop\(\)\);/.test(kaynak));
  ok('ses onarma yolunda da durduruluyor',
     /onizIzleDurdur\(\);\s*\/\/ izler duracak/.test(kaynak));
  ok('durdurma zamanlayıcıyı gerçekten temizliyor',
     /function onizIzleDurdur\(\)\{ if\(onizT\)\{ clearInterval\(onizT\); onizT=null; \} \}/.test(kaynak));
}

/* ---------- MASAÜSTÜNDE DE AYNI NÖBETÇİ (parite kapısı gösterdi) ----------
   İlk yazımda nöbetçi yalnız telefona kondu; tests/110 "telefonda korunup
   Macte korunmayan yol" diye anında bağırdı. Masaüstünde tetik başka
   (uyku/uyanma, kameranın çıkarılması, başka uygulamanın kamerayı alması)
   ama sonuç aynı: donmuş önizlemenin karşısında çekim yapılır ve kimse
   söylemez. Muafiyet yazmak yerine kural taşındı. */
{
  const {macYolu} = require('./kaynak.js');
  const msrc = oku(macYolu());
  ok('masaüstünde de nöbetçi var', /async function onizNabiz\(\)\{/.test(msrc));
  ok('kamera açılınca başlıyor', /onizIzleBaslat\(\);/.test(msrc));
  ok('kamera kapanınca duruyor', /function stopCam\(\)\{\n    onizIzleDurdur\(\);/.test(msrc));
  ok('kayıt sürerken karışmıyor',
     /if\(recorder && recorder\.state==='recording'\) return;/.test(msrc));
  ok('iz susması masaüstünde de dinleniyor',
     /vIz\.addEventListener\('mute'/.test(msrc) && /vIz\.addEventListener\('unmute'/.test(msrc));
  ok('masaüstünde de sessiz kayıt yolu var (durum şeridi çökme sanmasın)',
     /function logNot\(where,msg\)\{/.test(msrc) && /logNot\('oniz'/.test(msrc));
  ok('mesaj masaüstü sözlüğünde iki dilde',
     /onizDondu:'📷 Önizleme dondu/.test(msrc) && /onizDondu:'📷 The preview froze/.test(msrc));
  /* Üçüncü basamak: masaüstünde kamerayı baştan açmak = kapat + aç. */
  ok('son çare kamerayı baştan açıyor', /stopCam\(\); await toggleCam\(\);/.test(msrc));
}

/* ---------- ORTAK PARÇA TEK KAYNAKTAN (2026-08-17) ----------
   Nöbetçinin kare ölçümü, zamanlayıcısı ve sessiz kaydı iki kabukta BİREBİR
   aynıydı; kopya sürüm bırakmak bu depoda ölçülmüş bir ayrışma sebebi. Ortak
   parça `cekirdek/oniz.js`e alındı ve iki kabuğa gömülüyor. */
{
  const cek = repoOku('cekirdek/oniz.js','SUFLE_ONIZ');
  ok('ortak parça çekirdekte', /function onizKareSayisi\(\)\{/.test(cek) &&
     /function onizIzleBaslat\(\)\{/.test(cek) && /function logNot\(where,msg\)\{/.test(cek));
  ok('nabız 2 saniyede bir bakıyor', /setInterval\(onizNabiz,2000\)/.test(cek));
  ok('durdurma zamanlayıcıyı temizliyor', /clearInterval\(onizT\); onizT=null;/.test(cek));
  ok('sessiz kayıt diske de yazıyor', /localStorage\.setItem\(LS\+'_err'/.test(cek));
  /* İki kabuk da AYNI kaynaktan besleniyor mu: gömülü blok işaretli. */
  const {macYolu:mY} = require('./kaynak.js');
  ok('telefon kabuğuna gömülü', /==CEKIRDEK:oniz\.js==/.test(oku(telefonYolu())));
  ok('masaüstü kabuğuna gömülü', /==CEKIRDEK:oniz\.js==/.test(oku(mY())));
}
