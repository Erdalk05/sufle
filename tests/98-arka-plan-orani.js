const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');

/* G4 — ARKA PLAN GÖRSELİ ORAN KORUMASI TESTTE KİLİTLİ Mİ:
   KİLİTLİ DEĞİLDİ (tek test dosyası dokunmuyordu) ve İKİ GERÇEK KUSUR ÇIKTI.

   1) YATAY HEDEFTE DOKU YANLIŞ ORANDA KURULUYORDU.
      Sınır `min(1080,W) x min(1920,H)` idi. 1920x1080 istenirken
      1080x1080 kare doku kuruluyor, gölgelendirici onu tüm dörtgene
      yayınca arka plan yatay geriliyordu. Ölçülen gerilme:
        16:9 hedef            -> 1,78 kat
        kamera 1280x720       -> 1,19 kat
      Kırpma matematiği DOĞRUYDU ama YANLIŞ ORANA kırpıyordu; yani kodun
      kendi yorumunda anlatılan düzeltme ("yatay fotoğrafı EZİYORDU")
      yatay çıktıda kendi kendini iptal ediyordu.

   2) ORAN SONRADAN DEĞİŞİNCE DOKU YENİDEN KURULMUYORDU.
      `resizeComp` tuvali büyütüp küçültüyor ama arka planı bırakıyordu:
      Reels (9:16) için seçilen arka plan YouTube (16:9) profiline
      geçilince 1,78 kat geriliyordu. Profil değiştirmek bunu TEK
      DOKUNUŞLA yapıyor (`if(M.asp) st.asp=M.asp`).

   Kırpmanın kendisi (cover) altı görsel oranında ayrıca sınandı ve
   doğru çıktı — o kısım bozulmasın diye kilitleniyor. */

/* ---------- DOKU BOYU HEDEF ORANI KORUYOR MU ---------- */
const mBoy=kod.match(/function bgDokuBoyu\(W,H\)\{[\s\S]*?\n\}/);
ok('bgDokuBoyu çıkarılabildi', !!mBoy);
if(!mBoy) return;
const boy=new Function('W','H', mBoy[0].replace(/^function bgDokuBoyu\(W,H\)\{/,'').replace(/\}$/,''));

const HEDEFLER=[
  ['9:16',   1080,1920], ['16:9', 1920,1080], ['4:5', 1080,1350],
  ['1:1',    1080,1080], ['kamera varsayılanı', 1280,720], ['4K', 3840,2160],
];
for(const [ad,W,H] of HEDEFLER){
  const [tw,th]=boy(W,H);
  ok(ad+': doku hedefle AYNI oranda ('+tw+'x'+th+')', Math.abs(W/H-tw/th)<0.002);
  ok(ad+': doku boyutu sınırlı (uzun kenar<=1920, kısa kenar<=1080)',
     Math.max(tw,th)<=1920 && Math.min(tw,th)<=1080);
  ok(ad+': doku pozitif tamsayı', Number.isInteger(tw)&&Number.isInteger(th)&&tw>0&&th>0);
}
{
  /* Dikey hedeflerde davranış DEĞİŞMEMELİ — eski sınır orada doğruydu. */
  ok('9:16te eski sınırla aynı sonuç', JSON.stringify(boy(1080,1920))==='[1080,1920]');
  ok('4:5te eski sınırla aynı sonuç', JSON.stringify(boy(1080,1350))==='[1080,1350]');
  /* Küçültme gerektiğinde tek ölçek uygulanmalı (iki eksen bağımsız kırpılmamalı). */
  const [a,b]=boy(3840,2160);
  ok('büyük hedef tek ölçekle küçültülüyor', a/3840===b/2160);
}

/* ---------- KIRPMA (COVER) HÂLÂ DOĞRU ---------- */
const mKirp=kod.match(/const sA=img\.width\/img\.height, tA=tw\/th;[\s\S]*?x\.drawImage\(img,[^;]*\);/);
ok('görsel kırpma çıkarılabildi', !!mKirp);
if(!mKirp) return;
function kirp(iw,ih,tw,th){
  return new Function('img','tw','th', `
    let __c; const x={ drawImage:(...a)=>{ __c=a; } };
    ${mKirp[0]}
    return __c.slice(1,5);
  `)({width:iw,height:ih}, tw, th);
}
{
  const TW=1080, TH=1920, tA=TW/TH;
  const GORSELLER=[
    ['yatay 4:3', 4000,3000], ['dikey 9:16', 1080,1920], ['kare', 2000,2000],
    ['panorama 4:1', 8000,2000], ['çok uzun 1:5', 1000,5000], ['tam hedef oranı', 540,960],
  ];
  for(const [ad,iw,ih] of GORSELLER){
    const [sx,sy,sw,sh]=kirp(iw,ih,TW,TH);
    ok(ad+': kırpılan alan hedef oranında', Math.abs(sw/sh-tA)<0.0001);
    ok(ad+': kırpma görselin DIŞINA taşmıyor',
       sx>=-0.001 && sy>=-0.001 && sx+sw<=iw+0.001 && sy+sh<=ih+0.001);
    ok(ad+': kırpma ortalanmış',
       Math.abs(sx-(iw-sw)/2)<0.001 && Math.abs(sy-(ih-sh)/2)<0.001);
  }
  /* Yatay hedefte de kırpma doğru olmalı — asıl kusurun olduğu yön. */
  const [,,sw2,sh2]=kirp(1080,1920,1920,1080);
  ok('yatay hedefte dikey görsel doğru kırpılıyor', Math.abs(sw2/sh2-1920/1080)<0.0001);
}

/* ---------- ORAN DEĞİŞİNCE ARKA PLAN YENİDEN KURULUYOR ---------- */
const mRes=kod.match(/function resizeComp\(\)\{[\s\S]*?\n\}/);
ok('resizeComp çıkarılabildi', !!mRes);
if(!mRes) return;
ok('boyut değişmediyse hiçbir şey yapılmıyor (boşuna yeniden kurma yok)',
   /if\(comp\.cv\.width===W && comp\.cv\.height===H\) return;/.test(mRes[0]));
ok('boyut değişince arka plan yeniden kuruluyor', /loadCompBg\(\);/.test(mRes[0]));
ok('yeniden kurma tuval boyutlandıktan SONRA (yeni boyutu görsün)',
   mRes[0].indexOf('comp.cv.width=W') < mRes[0].indexOf('loadCompBg()'));
ok('çıktı tuvali de birlikte boyutlanıyor', /oc\.width=W; oc\.height=H;/.test(mRes[0]));
/* Oran düğmeleri gerçekten bu yolu tetikliyor. */
ok('oran düğmesi drawAspect çağırıyor',
   /\$\$\('#aspSeg button'\)\.forEach\(b=>b\.onclick=\(\)=>\{ st\.asp=b\.dataset\.asp;[^}]*drawAspect\(\)/.test(kod));
ok('drawAspect resizeComp ile başlıyor', /function drawAspect\(\)\{\s*resizeComp\(\);/.test(kod));
ok('profil değiştirmek oranı da değiştiriyor (tek dokunuşluk yol)',
   /if\(M\.asp\) st\.asp=M\.asp;/.test(kod));

{
  /* resizeComp gerçekten koştur: oran değişince yeniden kurulum çağrılıyor mu. */
  function kos(eskiW,eskiH,yeniW,yeniH){
    return new Function('__e','__y', `
      const iz=[];
      const comp={on:true, gl:{viewport:()=>iz.push('viewport')}, cv:{width:__e[0],height:__e[1]}};
      const compSize=()=>__y;
      const $=()=>({});
      const loadCompBg=()=>iz.push('bgYenidenKuruldu');
      ${mRes[0]}
      resizeComp();
      return {iz, cv:[comp.cv.width, comp.cv.height]};
    `)([eskiW,eskiH],[yeniW,yeniH]);
  }
  const r=kos(1080,1920,1920,1080);
  ok('oran 9:16 -> 16:9 olunca tuval yeniden boyutlanıyor', r.cv[0]===1920 && r.cv[1]===1080);
  ok('oran 9:16 -> 16:9 olunca arka plan YENİDEN KURULUYOR', r.iz.includes('bgYenidenKuruldu'));
  const ayni=kos(1080,1920,1080,1920);
  ok('boyut aynıysa arka plan boşuna kurulmuyor', !ayni.iz.includes('bgYenidenKuruldu'));
  const kapali=new Function(`
    const iz=[]; const comp={on:false, gl:null, cv:{width:0,height:0}};
    const compSize=()=>[1920,1080]; const $=()=>({});
    const loadCompBg=()=>iz.push('bgYenidenKuruldu');
    ${mRes[0]}
    resizeComp(); return iz;
  `)();
  ok('kompozit kapalıyken hiç çalışmıyor', kapali.length===0);
}

/* ---------- ÜRETİLEN ZEMİNLER DE AYNI BOYU KULLANIYOR ---------- */
ok('üretilen zeminler oran koruyan boyu kullanıyor',
   /makeBgCanvas\(kind,\.\.\.bgDokuBoyu\(W,H\)\)/.test(kod));
ok('görsel yolu da aynı boyu kullanıyor', /const \[tw,th\]=bgDokuBoyu\(W,H\);/.test(kod));
ok('eski sabit sınır hiç kalmadı',
   !/Math\.min\(1080,W\), *Math\.min\(1920,H\)/.test(kod) && !/Math\.min\(1080,W\),Math\.min\(1920,H\)/.test(kod));
