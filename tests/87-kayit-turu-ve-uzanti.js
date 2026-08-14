const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* H1 — pickMime HER PLATFORMDA İLK DESTEKLENEN TÜRÜ SEÇİYOR MU: SEÇİYOR.
   Gerçek fonksiyon altı platform profiliyle koşturuldu (isTypeSupported TAM
   eşleşme yapıyor, gerçek tarayıcıdaki gibi):
     iOS Safari              -> video/mp4
     Chrome yeni (mp4 var)   -> video/mp4;codecs=avc1.42E01E,mp4a.40.2
     Chrome eski (webm)      -> video/webm;codecs=vp9,opus
     Firefox (yalnız vp8)    -> video/webm;codecs=vp8,opus
     yalnız düz webm         -> video/webm
     hiçbiri desteklenmiyor  -> "" (tarayıcının kendi varsayılanına düşüyor)
   MP4 önceliği korunuyor, geri düşüş sırayla ilerliyor. Hipotez çürüdü.

   AYRICA ZİNCİRİN GERİSİ DE ÖLÇÜLDÜ — asıl risk buradaydı: kayıt webm
   olurken dosyanın adı .mp4 olsaydı alıcı için bozuk dosya olurdu. Uzantı,
   MIME türü ve uyarı üç yerde de BLOB'un kendi türünden türetiliyor, sabit
   değil. Bu zincir kilitlendi. */

const parca=(re,ad)=>{ const m=kod.match(re); ok('çıkarılabildi: '+ad, !!m); return m&&m[0]; };
const sMime=parca(/function pickMime\(\)\{[\s\S]*?\n\}/,'pickMime');
if(!sMime) return;

function kos(wk,destek){
  return new Function('__wk','__d',
    'const IS_WK=__wk; const window={MediaRecorder:{}};'+
    'const MediaRecorder={isTypeSupported:t=>__d.includes(t)};'+
    sMime+'; return pickMime();')(wk,destek);
}

/* ---------- PLATFORM PROFİLLERİ ---------- */
{
  const T=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4',
           'video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  ok('iOS Safari mp4 seçiyor', kos(true,['video/mp4'])==='video/mp4');
  ok('iOS webm de destekleseydi yine mp4 seçerdi',
     kos(true,['video/mp4','video/webm'])==='video/mp4');
  ok('masaüstü mp4 varsa mp4 seçiyor (galeri/Instagram kabul etsin)',
     kos(false,T)==='video/mp4;codecs=avc1.42E01E,mp4a.40.2');
  ok('kodeksiz mp4 varsa ona düşüyor',
     kos(false,['video/mp4','video/webm'])==='video/mp4');
  ok('mp4 yoksa vp9 webm', kos(false,['video/webm;codecs=vp9,opus','video/webm'])==='video/webm;codecs=vp9,opus');
  ok('vp9 yoksa vp8', kos(false,['video/webm;codecs=vp8,opus','video/webm'])==='video/webm;codecs=vp8,opus');
  ok('yalnız düz webm varsa o', kos(false,['video/webm'])==='video/webm');
  ok('hiçbiri desteklenmiyorsa boş (tarayıcı varsayılanı)', kos(false,[])==='');
  ok('MediaRecorder hiç yoksa da çökmüyor',
     new Function(sMime+'; const IS_WK=false; const window={}; return pickMime();')()==='');
}
{
  /* SIRA ÖNEMLİ: mp4 her zaman webmden ÖNCE denenmeli. Sıra bozulursa
     masaüstünde webm kaydedilir ve paylaşınca galeri kabul etmez —
     v9 öncesinde tam olarak bu oluyordu. */
  /* İKİ AYRI LİSTE VAR (iOS ve diğerleri). İlk yazışımda ikisini tek dizi
     sanıp "son mp4 < ilk webm" diye ölçtüm ve kendi testim yanlış kırmızı
     verdi — listeler ardışık yazıldığı için ikinci listenin mp4si birincinin
     webminden sonra geliyor. Sıra HER LİSTE İÇİNDE ayrı ayrı sınanmalı. */
  const listeler=(sMime.match(/\[[^\]]*'video\/[^\]]*\]/g)||[])
    .map(b=>(b.match(/'video\/[^']+'/g)||[]).map(x=>x.slice(1,-1)));
  ok('iki tür listesi de bulundu', listeler.length===2);
  for(let i=0;i<listeler.length;i++){
    const L=listeler[i];
    const ilkWebm=L.findIndex(x=>x.startsWith('video/webm'));
    const sonMp4=L.map(x=>x.startsWith('video/mp4')).lastIndexOf(true);
    ok('liste '+(i+1)+': mp4 seçenekleri webmden ÖNCE ('+L.length+' tür)',
       sonMp4>=0 && (ilkWebm===-1 || sonMp4<ilkWebm));
    ok('liste '+(i+1)+': ilk sıra mp4', L[0].startsWith('video/mp4'));
  }
}

/* ---------- ZİNCİR: UZANTI VE TÜR BLOBDAN TÜRÜYOR MU ---------- */
{
  const sSave=parca(/async function saveRec\(\)\{[\s\S]*?\n\}/,'saveRec');
  if(sSave){
    ok('uzantı blobun türünden türüyor', /const isMp4=lastBlob\.type\.indexOf\('mp4'\)>=0/.test(sSave));
    ok('uzantı sabit değil', /const ext=isMp4\?'mp4':'webm'/.test(sSave));
    /* iOS: tür boş ya da webm ise "Videoyu Kaydet" seçeneği çıkmıyor —
       bu yüzden tür boşsa da doldurmak gerekiyor. */
    ok('tür boşsa uygun bir tür konuyor', /lastBlob\.type\|\|\(isMp4\?'video\/mp4':'video\/webm'\)/.test(sSave));
    ok('dosya adı uzantıyla kuruluyor', /new File\(\[lastBlob\],fileName\(\)\+'\.'\+ext,\{type\}\)/.test(sSave));
    /* mp4 DEĞİLSE kullanıcıya söyleniyor: bazı uygulamalar webm kabul etmez. */
    ok('mp4 değilse kullanıcı uyarılıyor', /if\(!isMp4\) toast\(m\('notMp4'\)\)/.test(sSave));
  }
}
{
  /* Aynı kural yayın paketinde ve indirmede de geçerli olmalı — üç yol da
     blobun türüne bakmalı, biri sabit kalırsa o yolda bozuk dosya çıkar. */
  ok('yayın paketi uzantıyı türden alıyor', /ad:taban\+\(mp4\?'\.mp4':'\.webm'\)/.test(kod));
  ok('indirme uzantıyı türden alıyor', /fileName\(\)\+'\.'\+\(isMp4\?'mp4':'webm'\)/.test(kod));
  const mp4Karar=(kod.match(/indexOf\('mp4'\)>=0/g)||[]).length;
  ok('tür kararı her yolda blobdan veriliyor ('+mp4Karar+' yer)', mp4Karar>=3);
  /* Hiçbir yerde sabit .mp4 uzantısı olmamalı (yetenek sınaması hariç). */
  const sabit=(kod.match(/fileName\(\)\+'\.mp4'/g)||[]).length;
  ok('sabit .mp4 uzantısı kullanılmıyor', sabit===0);
}
{
  /* Arşive yazarken de gerçek tür saklanmalı: sonradan paylaşırken uzantı
     buradan türüyor. Sabit yazılsaydı arşivden paylaşım bozulurdu. */
  ok('arşive gerçek tür yazılıyor', /type:lastBlob\.type/.test(kod));
}

/* ---------- KAYIT SEÇENEKLERİ ---------- */
{
  ok('tür boşsa MediaRecorder seçeneksiz kuruluyor', /const base = mime\?\{mimeType:mime\}:\{\}/.test(kod));
  /* iOS'ta bit hızı seçenekleri kaydı bozabiliyor: orada yalnız tür veriliyor. */
  ok('iOS tarafında bit hızı seçeneği eklenmiyor', /IS_WK \? base :/.test(kod));
  ok('diğer platformlarda bit hızı veriliyor', /videoBitsPerSecond: vBitrate\(\)/.test(kod));
  /* Son çare: seçenekler sorun çıkarırsa hiç seçenek verilmeden denenebiliyor. */
  ok('seçeneksiz yeniden deneme yolu var', /st\.forceNoOpts \? \{\} :/.test(kod));
}
