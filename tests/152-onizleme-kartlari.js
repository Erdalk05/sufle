const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,blokKes,cekirdekOku}=require('./kaynak');
const telHam=oku(telefonYolu()), macHam=oku(macYolu());
const yorumsuz=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const tel=yorumsuz(telHam), mac=yorumsuz(macHam);
const YON=cekirdekOku('yon.js','SUFLE_YON');
const CEK=YON+'\n'+cekirdekOku('altyazi.js','SUFLE_ALTYAZI');

/* G.3 — ÖNİZLEME KARTLARI.

   NEDEN: BIGVU altyazı görünümünü küçük resim kartlarıyla seçtiriyor, bizde
   ayar ADI yazan düğmeler vardı. "Hap" ne demek olduğunu ancak deneyerek
   öğrenirsin; kart, çekimin üstünde ne göreceğini gösterir.

   EN BÜYÜK RİSK VE BU TESTİN ASIL İŞİ: kart, kaydın çizim önbelleğini
   KİRLETMEMELİ. Önbellek metin+genişlik+punto anahtarıyla çalışıyor ve
   kart bambaşka bir metni bambaşka bir genişlikte çiziyor. Paylaşılsaydı
   kart çizilir çizilmez bir sonraki KAYIT karesi yanlış satırlarla çizilirdi
   — üstelik yalnız ayarlar açıkken, yani hata "bazen" görünürdü.

   GERÇEK TARAYICIDA ÖLÇÜLDÜ (Chrome, 430 px, sahte kamera):
     6 kart çizildi · 6 kartın 6'sı BİRBİRİNDEN FARKLI görünüm üretti
     tema değişimi 1,8 ms · adsız öge 0 · sayfa taşması yok */

function tezgah(k){
  const mW=k.match(/function wrapLines\([\s\S]*?return out\.length\?out:\[txt\|\|.{2}\];\s*\n\s*\}/);
  const mP=[blokKes(k,'function kkParcala(')];
  const mR=k.match(/function kkRenk\(\)\{[\s\S]*?\n\s*\}/);
  const mV=blokKes(k,'function kkVurguMetin()');
  const mD=blokKes(k,'function drawCaption(','let capOnbellek=');
  if(!mW||!mP||!mR||!mV||!mD) return null;
  return (d)=>new Function('__d', [
    CEK,
    'let kkRenkOnb="", kkVurguMetinOnb="";',
    mW[0], mP[0], mR[0], mV,
    'const st=__d.st||{}; const state=st;',
    'const document={documentElement:{}};',
    'const getComputedStyle=()=>({getPropertyValue:(a)=>(__d.jetonlar||{})[a]||""});',
    'const logErr=()=>{};',
    'const performance={now:()=>__d.saat?__d.saat():0};',
    mD,
    'const c={ font:"", textAlign:"center", textBaseline:"", fillStyle:"", strokeStyle:"",',
    '  globalAlpha:1, shadowColor:"", shadowBlur:0, shadowOffsetY:0, lineWidth:0, lineJoin:"",',
    '  measureText:s=>{ __d.say&&__d.say(); return {width:String(s).length*20}; },',
    '  save(){}, restore(){}, translate(){}, scale(){},',
    '  beginPath(){}, moveTo(){}, lineTo(){}, quadraticCurveTo(){}, closePath(){},',
    '  rect(){}, fill(){ __d.iz.push({t:"zemin", renk:c.fillStyle}); },',
    '  fillRect(){ __d.iz.push({t:"bant"}); },',
    '  strokeText:(t)=>__d.iz.push({t:"kontur", s:t}),',
    '  fillText:(t,x,y)=>__d.iz.push({t:"yazi", s:t, x:x, y:y, renk:c.fillStyle, alfa:c.globalAlpha}) };',
    'const liveCue=()=>__d.metin;',
    '__d.cizimler.forEach(z=>drawCaption(c, z.W||1080, z.H||1920, z.ops));',
    'return {onbellek:{txt:capOnbellek.txt, W:capOnbellek.W, size:capOnbellek.size}};'
  ].join('\n'))(d);
}

const JETONLAR={'--r-warn':'#FFB020','--on-warn':'#231704'};
const DURUM={capSize:42, capPos:'bottom', capKaraoke:true, capAnim:'yok', capTema:'sade'};

for(const [ad,k] of [['telefon',tel],['masaüstü',mac]]){
  const kos=tezgah(k);
  ok(ad+': tezgâh kuruldu', !!kos);
  if(!kos) continue;

  {
    /* ① KART, KAYDIN ÖNBELLEĞİNİ KİRLETMİYOR. */
    const iz=[];
    const r=kos({metin:'kayit metni burada akiyor', iz, jetonlar:JETONLAR, st:DURUM, cizimler:[
      {},                                                    // kayıt karesi
      {W:264, H:152, ops:{metin:'kart ornegi', tema:'hap', punto:150, anim:'yok'}}, // kart
    ]});
    ok(ad+': kart çizimi sonrası önbellek hâlâ KAYIT metnini tutuyor',
       r.onbellek.txt==='kayit metni burada akiyor');
    ok(ad+': önbellekteki genişlik kayıt karesinin genişliği', r.onbellek.W===1080);
  }
  {
    /* ② VE ÖLÇÜM TEKRARLANMIYOR: kayıt karesi kart yüzünden yeniden
       ölçülseydi kare başına maliyet geri gelirdi. */
    let cagri=0;
    kos({metin:'ayni metin', iz:[], jetonlar:JETONLAR, st:DURUM, say:()=>cagri++, cizimler:[
      {}, {}, {}
    ]});
    const yalnizKayit=cagri;
    cagri=0;
    kos({metin:'ayni metin', iz:[], jetonlar:JETONLAR, st:DURUM, say:()=>cagri++, cizimler:[
      {}, {W:264,H:152,ops:{metin:'kart', tema:'hap', punto:150}}, {}
    ]});
    ok(ad+': araya kart girse de kayıt karesi yeniden ölçülmüyor ('+yalnizKayit+' → '+cagri+')',
       cagri>yalnizKayit && cagri-yalnizKayit<=6);
  }
  {
    /* ③ ops ALANLARI GERÇEKTEN OKUNUYOR. */
    const iz=[];
    kos({metin:'ekranda olmayan metin', iz, jetonlar:JETONLAR, st:DURUM, cizimler:[
      {W:264,H:152,ops:{metin:'kart metni', tema:'seritsiz', punto:150, anim:'yok', konum:'top'}}
    ]});
    const yazi=iz.filter(x=>x.t==='yazi');
    ok(ad+': kart metni ops üzerinden geliyor',
       yazi.length>0 && yazi.map(x=>x.s).join(' ').indexOf('kart')>=0);
    ok(ad+': canlı cue metni karta SIZMIYOR',
       yazi.every(x=>String(x.s).indexOf('ekranda')<0));
    const ustY=yazi[0].y;
    const iz2=[];
    kos({metin:'x', iz:iz2, jetonlar:JETONLAR, st:DURUM, cizimler:[
      {W:264,H:152,ops:{metin:'kart metni', tema:'seritsiz', punto:150, anim:'yok', konum:'bottom'}}
    ]});
    ok(ad+': kart konumu ops üzerinden değişiyor', iz2.filter(x=>x.t==='yazi')[0].y>ustY);
    /* KARTIN TEMASI DURUMDAN BAĞIMSIZ OLMALI: altı kart aynı anda çizilir ve
       hepsi durumdaki temayı kullansaydı altısı da AYNI görünürdü — kartın
       varlık sebebi tam da farkı göstermek. */
    const kutu=[], seritli=[];
    kos({metin:'x', iz:kutu, jetonlar:JETONLAR, st:DURUM, cizimler:[
      {W:264,H:152,ops:{metin:'iki kelime', tema:'kutu', punto:150, anim:'yok'}}]});
    kos({metin:'x', iz:seritli, jetonlar:JETONLAR, st:DURUM, cizimler:[
      {W:264,H:152,ops:{metin:'iki kelime', tema:'sade', punto:150, anim:'yok'}}]});
    ok(ad+': kart teması durumdakinden bağımsız (kutu ≠ şerit)',
       kutu.filter(x=>x.t==='zemin').length>0 && seritli.filter(x=>x.t==='zemin').length===0);
    ok(ad+': şerit temalı kart tam genişlik bant çiziyor',
       seritli.filter(x=>x.t==='bant').length===1 && kutu.filter(x=>x.t==='bant').length===0);
  }
  {
    /* ④ KARTTA ANİMASYON YOK: kart durağan bir örnek, oynayan bir şey değil.
       (Durum ayarı "yumuşak" olsa bile kart tam görünür çizilmeli, yoksa
       kullanıcı yarı saydam bir kelime görüp temayı öyle sanır.) */
    const iz=[];
    kos({metin:'x', iz, jetonlar:JETONLAR, st:Object.assign({},DURUM,{capAnim:'yumusak'}), saat:()=>0,
         cizimler:[{W:264,H:152,ops:{metin:'iki kelime', tema:'sade', punto:150}}]});
    const kartYazi=iz.filter(x=>x.t==='yazi');
    ok(ad+': kartta iki kelime de çiziliyor', kartYazi.length===2);
    /* Asıl iddia SAYDAMLIK: animasyon uygulanırsa vurgulanan kelime alfa 0
       ile başlar ve kart yarı görünmez bir örnek gösterir. */
    ok(ad+': kartta hiçbir kelime saydam değil', kartYazi.every(x=>x.alfa===1));
  }
}

/* ---------- KAYNAK: şerit, etiketler, tazeleme ---------- */
for(const [ad,ham,kod,dev,acilis] of [
    ['telefon',telHam,tel,'st','openSheet'],
    ['masaüstü',macHam,mac,'state','applyRtab']]){
  ok(ad+': kart şeridi işaretlemede var', /id="capTemaKart"/.test(ham));
  ok(ad+': eski düğme şeridi kaldırıldı', !/id="capTemaSeg"/.test(ham));
  /* Şerit TEMA LİSTESİNDEN kuruluyor: yeni tema eklenince kart kendiliğinden
     çıkmalı. Elle yazılmış altı düğme olsaydı yedinci tema görünmezdi. */
  ok(ad+': kartlar tema listesinden üretiliyor', /ALTYAZI_TEMA_SIRA\.forEach/.test(kod));
  ok(ad+': her kart bir düğme', /b\.type='button'; b\.className='kart'/.test(kod));
  /* İDDİA DARALTILDI: yalnız "aria-pressed geçiyor mu" diye bakmak,
     removeAttribute('aria-pressed') yazan bir bozmayı da geçiriyordu. */
  ok(ad+': seçili kart aria-pressed ile bildiriliyor',
     /setAttribute\('aria-pressed',\s*b\.dataset\.ct===/.test(kod));
  ok(ad+': kart çizimi drawCaption çağırıyor', /drawCaption\(c, W, H, \{metin:ornek/.test(kod));
  ok(ad+': kart tuvali retina için iki kat', /cv\.width=KART_W\*2/.test(kod));
  ok(ad+': kamera varsa kartta kamera görüntüsü', /drawImage\(\s*(cam|vid)\s*,/.test(kod));
  ok(ad+': kamera yoksa düz yüzey', /createLinearGradient/.test(kod));
  ok(ad+': kamera kırpılarak sığdırılıyor (çarpıtma yok)', /Math\.max\(W\/(cam|vid)\.videoWidth/.test(kod));
  ok(ad+': görünmezken çizilmiyor', /!kap\.offsetParent/.test(kod));
  ok(ad+': panel açılınca zorla çiziliyor', new RegExp(acilis+'[\\s\\S]{0,900}temaKartlariCiz\\(true\\)').test(kod));
  ok(ad+': tema seçimi durumu güncelliyor', new RegExp(dev+'\\.capTema=ad').test(kod));
  /* Etiket anahtarları AÇIKÇA t() ile çağrılmalı: değişkenle çağrılan anahtar
     ölü anahtar taramasının kör noktası (bu depoda bir kez yakalandı). */
  for(const key of ['ctSade','ctKutu','ctHap','ctSeritsiz','ctVurguHap','ctGolge'])
    ok(ad+": "+key+" açıkça t() ile çağrılıyor", new RegExp("t\\('"+key+"'\\)").test(kod));
  ok(ad+': örnek metin sözlükten geliyor', /t\('kartOrnek'\)/.test(kod));
  ok(ad+': etiket data-i18n ile bağlanıyor (dil değişince tazelenir)',
     /et\.dataset\.i18n=kartEtiketi\(ad\)/.test(kod));
}
/* ---------- KURUCU VE ETİKET FONKSİYONLARI ---------- */
for(const [ad,kod] of [['telefon',tel],['masaüstü',mac]]){
  /* temaKartlariKur BİR KEZ kurmalı: her çizimde yeniden kurulsaydı kart
     sayısı katlanır ve tıklama bağları birikirdi. */
  ok(ad+': temaKartlariKur bir kez kuruyor', /temaKartlariKur\(\)\{[\s\S]{0,200}kap\.dataset\.kuruldu/.test(kod));
  ok(ad+': kurulum bittiğinde işaretleniyor', /kap\.dataset\.kuruldu='1'/.test(kod));
  ok(ad+': çizim önce kurulumu çağırıyor', /temaKartlariCiz\(zorla\)\{[\s\S]{0,160}temaKartlariKur\(\)/.test(kod));
  /* temaEtiketMetni her tema için bir dal içermeli: eksik dal = adsız kart. */
  const govde=blokKes(kod,'function temaEtiketMetni(')||'';
  ok(ad+': temaEtiketMetni çıkarılabildi', govde.length>0);
  const dal=(govde.match(/case '/g)||[]).length;
  ok(ad+': temaEtiketMetni altı temanın altısını da karşılıyor ('+dal+')', dal===6);
  ok(ad+': bilinmeyen tema adında çökmüyor (yedek dönüş)', /return ad;/.test(govde));
  ok(ad+': kartEtiketi haritadan okuyor', /function kartEtiketi\(ad\)\{ return TEMA_ETIKET\[ad\]/.test(kod));
}

{
  const sozluk=cekirdekOku('sozluk.js','SUFLE_SOZLUK');
  const bulunan=[...sozluk.matchAll(/kartOrnek:'([^']*)'/g)].map(m=>m[1]);
  ok('kartOrnek TR+EN var', bulunan.length===2);
  ok('kartOrnek çevrilmiş', bulunan.length===2 && bulunan[0]!==bulunan[1]);
  ok('kartOrnek kısa (kartta iki satırı geçmez)', bulunan.every(v=>v.length<=32));
}
{
  /* Tema listesi ile etiket haritası AYNI kümeyi kapsamalı: biri eklenip
     diğeri unutulursa kart adsız kalır (erişilebilirlik ihlali). */
  const temalar=(CEK.match(/const ALTYAZI_TEMA_SIRA = \[([^\]]+)\]/)||[])[1]||'';
  const liste=temalar.split(',').map(s=>s.trim().replace(/'/g,'')).filter(Boolean);
  for(const kabuk of [tel,mac]){
    const harita=(kabuk.match(/const TEMA_ETIKET=\{([\s\S]*?)\};/)||[])[1]||'';
    for(const ad of liste)
      ok('etiket haritasında '+ad+' var', new RegExp('\\b'+ad+':').test(harita));
  }
}
