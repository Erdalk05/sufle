const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs');
const {telefonYolu, macYolu, oku}=require('./kaynak.js');

/* iOS'TA SESSİZLİK SESLE TAKİBİ ÖLDÜRÜYORDU (Erdal bildirdi, 2026-08-15).

   Bildirim: "iPhone, ses durunca sesli takip çalışmıyor."

   TEŞHİS ÖLÇÜLDÜ, TAHMİN EDİLMEDİ. `restartVoice` ve `onend` gerçek kaynaktan
   çıkarılıp sanal saatle koşturuldu. iPhone'da `continuous=true` sürmez:
   kullanıcı cümlesini bitirip nefes alınca tanıma oturumu KAPANIR. Eski
   mantık sağlığı yalnız SÜREYE bakarak ölçüyordu (3 sn'den kısa yaşadıysa
   arıza sayılıyordu), bu yüzden her duraklama bir arıza puanı yazıyordu:

     oturum 1,5 sn → özellik 12,8 saniyede KENDİNİ KAPATIYOR
     oturum 0,8 sn → 8,6 saniyede kapanıyor
     oturum 30 sn (Chrome) → ayakta

   Yani kusur iPhone'a özeldi ve masaüstünde HİÇ görünmüyordu — bu deponun
   5 numaralı teşhis kuralının (iki platformu karşılaştır) tersten hâli.
   Ölmeden önce de zarar veriyordu: gecikme 250·srFails ile büyüdüğü için
   toplam 3.750 ms hiç dinlenmiyordu.

   DÜZELTME: ölçüt SÜRE değil ÜRETİM. Oturum sonuç verdiyse sağlıklıdır, bir
   saniye bile yaşasa. Sağlıklı bitiş sayaç artırmaz, 150 ms'de geri döner.

   KORUNAN ŞEY: gerçek arıza (tanıma açılıp HİÇ sonuç vermemesi — kameranın
   mikrofonu tutması) hâlâ sayılıyor ve altıncıda özellik görünür şekilde
   kapanıyor. Bir önceki turda eklenen o koruma gevşetilmedi; aşağıdaki
   davranış sınavı ikisini BİRDEN kanıtlıyor. */

const tel = oku(telefonYolu());

/* ---------- KAYNAK DÜZEYİ ---------- */
const restartSrc = (tel.match(/function restartVoice\([^)]*\)\{[\s\S]*?\n\}/) || [])[0];
const onendSrc   = (tel.match(/sr\.onend=\(\)=>\{[\s\S]*?\};/) || [])[0];
ok('restartVoice çıkarılabildi', !!restartSrc);
ok('onend çıkarılabildi', !!onendSrc);

if (restartSrc && onendSrc) {
  ok('restartVoice sağlıklı/arızalı ayrımını PARAMETRE olarak alıyor',
     /function restartVoice\(\s*saglikli\s*\)/.test(restartSrc));
  ok('sayaç YALNIZ arızalı bitişte artıyor',
     /if\(!saglikli && \+\+srFails>5\)/.test(restartSrc));
  ok('arıza sınırı ve görünür kapanma korundu',
     /toast\(m\('voiceDied'\)\); stopVoice\(\);/.test(restartSrc));
  ok('sağlıklı bitişte hızlı, arızada artan gecikme',
     /saglikli\?SR_HIZLI_MS:250\*srFails/.test(restartSrc));
  ok('yeniden başlarken sonuç dizisi durumu sıfırlanıyor (ilk kelimeler atlanmasın)',
     /srSonuc=false; srIdx=-1; srSeen=''/.test(restartSrc));
  ok('sağlık ölçütü ÜRETİME bakıyor (yalnız süreye değil)',
     /srSonuc \|\| \(srBasladi/.test(onendSrc));
  ok('onend kararı restartVoice\'a taşınıyor',
     /restartVoice\(saglikli\)/.test(onendSrc));
}
ok('sonuç gelince oturum sağlıklı işaretleniyor', /srFails=0; srSonuc=true;/.test(tel));
ok('yeni oturum sonuç bayrağını sıfırlıyor',
   /sr\.start\(\); srBasladi=performance\.now\(\); srSonuc=false;/.test(tel));

const hizli = +((tel.match(/SR_HIZLI_MS=(\d+)/) || [])[1] || -1);
ok('hızlı dönüş süresi tanımlı ve makul (' + hizli + ' ms)', hizli > 0 && hizli <= 500);
ok('süre ölçütü de duruyor (uzun oturum da sağlıklıdır)', /SR_SAGLIKLI_MS=\d+/.test(tel));

/* ---------- DAVRANIŞ SINAVI: gerçek kodu sanal saatle koştur ----------
   Kaynak düzeyi desenler biçimi kilitler, davranışı değil. Asıl iddia şu:
   duraklamalarla dolu bir çekim boyunca özellik AYAKTA kalmalı, ama gerçek
   arızada kapanmalı. İkisi aynı tezgâhta ölçülüyor. */
function kos(restartSrc, onendSrc, oturumMs, sonucVeriyor, tur) {
  let saat=0, kuyruk=[], voiceOn=true, srFails=0, srBasladi=0, srSonuc=false;
  let srIdx=-1, srSeen='', srRetryT=null, kapandi=false, baslatma=0, dinlenmeyen=0;
  const sr={ start(){ baslatma++; } };
  const performance={ now:()=>saat };
  const setTimeout=(fn,ms)=>{ const id={}; kuyruk.push({t:saat+ms,fn,id}); return id; };
  const clearTimeout=id=>{ kuyruk=kuyruk.filter(x=>x.id!==id); };
  const ctx={
    get voiceOn(){return voiceOn;}, get sr(){return sr;},
    get srFails(){return srFails;}, set srFails(v){srFails=v;},
    get srRetryT(){return srRetryT;}, set srRetryT(v){srRetryT=v;},
    get srBasladi(){return srBasladi;}, set srBasladi(v){srBasladi=v;},
    get srSonuc(){return srSonuc;}, set srSonuc(v){srSonuc=v;},
    get srIdx(){return srIdx;}, set srIdx(v){srIdx=v;},
    get srSeen(){return srSeen;}, set srSeen(v){srSeen=v;},
    SR_SAGLIKLI_MS:+((tel.match(/SR_SAGLIKLI_MS=(\d+)/)||[])[1]||3000),
    SR_HIZLI_MS:hizli, setTimeout, clearTimeout, performance,
    toast:()=>{}, m:k=>k, logErr:()=>{}, logNot:()=>{},
    /* 2026-08-17: restartVoice artık kayıt sürerken iOSta yeniden başlatmıyor.
       Bu tezgâh KAYIT YOKKEN sessizlik davranışını ölçüyor, o yüzden yasak
       kapalı; kayıt dalı tests/36da ayrıca kilitli. */
    sesleKayittaYasak:()=>false, srKayittaSon:0, recElapsed:()=>0,
    stopVoice:()=>{ voiceOn=false; kapandi=true; },
  };
  const restartVoice=new Function('ctx',`with(ctx){ ${restartSrc}; return restartVoice; }`)(ctx);
  ctx.restartVoice=restartVoice;
  /* Mac kabuğu tanıyıcıyı `rec` diye adlandırıyor, telefon `sr` — ikisi de
     aynı tezgâhta koşsun diye iki ad da tanımlanıyor. */
  ctx.rec=sr;
  const onend=new Function('ctx',
    `with(ctx){ const sr={}, rec={}; ${onendSrc}; return sr.onend||rec.onend; }`)(ctx);
  sr.start(); srBasladi=saat; srSonuc=false;
  for(let i=0;i<tur && voiceOn;i++){
    saat=srBasladi+oturumMs;
    if(sonucVeriyor) srSonuc=true;
    onend();
    if(!voiceOn) break;
    const is=kuyruk.shift();
    if(is){ dinlenmeyen+=is.t-saat; saat=is.t; is.fn(); srBasladi=saat; }
  }
  return { ayakta:voiceOn, kapandi, baslatma, dinlenmeyen, saat };
}

function sinaKabuk(ad, rSrc, oSrc) {
  const a = kos(rSrc, oSrc, 1500, true, 40);
  ok(ad + ': 40 duraklamadan sonra sesle takip HÂLÂ AÇIK (önce 6\'da ölüyordu)', a.ayakta);
  ok(ad + ': her duraklamada gerçekten yeniden başlıyor (' + a.baslatma + ' başlatma)',
     a.baslatma >= 40);
  ok(ad + ': duraklama başına dinlenmeyen süre küçük (' +
     Math.round(a.dinlenmeyen/40) + ' ms)', a.dinlenmeyen/40 <= 300);

  const b = kos(rSrc, oSrc, 800, true, 40);
  ok(ad + ': çok kısa duraklarda da ayakta', b.ayakta);

  /* KORUMA SINAVI — bu iddia olmadan düzeltme "sayacı söktüm"e dönerdi.
     Mac'te bu koruma BUGÜNE KADAR HİÇ ÇALIŞMIYORDU: sayaç her başarılı
     start() ile sıfırlanıyordu, yani 5 sınırına asla ulaşılmıyordu. */
  const c = kos(rSrc, oSrc, 300, false, 40);
  ok(ad + ': GERÇEK ARIZA yakalanıyor — hiç sonuç gelmezse özellik kapanıyor', c.kapandi);
  ok(ad + ': arızada sonsuz yeniden başlatma yok (' + c.baslatma + ' deneme)', c.baslatma <= 8);

  const d = kos(rSrc, oSrc, 30000, true, 12);
  ok(ad + ': uzun oturum davranışı bozulmadı', d.ayakta);
}

if (restartSrc && onendSrc) sinaKabuk('iPhone', restartSrc, onendSrc);

/* ---------- MAC PARİTESİ ----------
   "Telefonda olup Mac'te olmayan özellik yarım özelliktir" (CLAUDE.md).
   Mac aynı subsistemde BİR TUR GERİDEYDİ ve ölçüldü: sayaç her başarılı
   `rec.start()` ile sıfırlanıyordu, yani arıza koruması hiç tetiklenemezdi. */
{
  const mac = fs.readFileSync(macYolu(), 'utf8');
  const mR = (mac.match(/function restartVoice\([^)]*\)\{[\s\S]*?\n  \}/) || [])[0];
  const mO = (mac.match(/rec\.onend=\(\)=>\{[\s\S]*?\};/) || [])[0];
  ok('Mac restartVoice çıkarılabildi', !!mR);
  ok('Mac onend çıkarılabildi', !!mO);
  if (mR && mO) {
    ok('Mac de sağlık ölçütünü ÜRETİME bağlıyor', /srSonuc \|\| \(srBasladi/.test(mO));
    ok('Mac sayacı artık başlatmada körü körüne sıfırlamıyor',
       !/rec\.start\(\); srFails=0;/.test(mac));
    /* Davranış tezgâhı `srSonuc`u dışarıdan kuruyor, yani onresult'un bayrağı
       gerçekten yazdığını GÖREMEZ (bozma turu bunu yakaladı). Kaynak düzeyi
       iddia o kör noktayı kapatıyor. */
    ok('Mac: sonuç gelince oturum sağlıklı işaretleniyor',
       /srFails=0; srSonuc=true;/.test(mac));
    sinaKabuk('Mac', mR, mO);
  }
}
