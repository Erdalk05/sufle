const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* SESLE TAKİP UZUN METİNDE KAYBOLUYOR MU — ÖLÇÜLDÜ, HİPOTEZ ÇÜRÜDÜ.
   Gerçek matchVoice kaynaktan çıkarılıp sentetik okumayla koşturuldu:
   5000 kelimelik metin, %5 kelime atlama, %8 tanıma hatası, %64 benzersiz
   kelime (gerçek Türkçe metne yakın; kalanı ve/bir/bu gibi dolgu).

   SONUÇ:
     · okuma bittiğinde işaretçi 4999/5000 — metnin TAM sonunda
     · geniş arama 4734 adımda yalnız 3 kez devreye girdi
     · 200. kelimeden 800e sıçrayan kullanıcı 17 kelimede yakalanıyor

   İLK ÖLÇÜMÜM YANLIŞTI, iki kez:
   1) Harness her adımda kelimeyi İKİ KEZ gönderiyordu; `recent` zaten son 5
      kelimeyi biriktirdiği için yinelenen kelimeler oluşuyor ve benzersiz
      kelimeli metinde hiç eşleşme çıkmıyordu.
   2) Düzeltince "ortalama sapma 52, en büyük 732" çıktı ve bunu kusur sandım;
      hatta geniş modda tek-kelime kabulünü kapatan bir yama yazdım. Yama
      sayıları HİÇ DEĞİŞTİRMEDİ — çünkü sebep o değildi. Ölçünce görüldü:
      o sapmalar, geniş aramanın devreye girmesi için gereken 1,2 saniye
      boyunca yaşanan GEÇİCİ GECİKME; kurtarma sonrası kapanıyor. Yamayı geri
      aldım: etkisini gösteremediğim bir değişikliği tutmak, düzeltme değil
      gürültüdür.

   Bu dosya ölçümü kilitliyor: eşikler ya da pencere değişirse yakalanır. */

const parcalar=[
  cikar(kod,/const WIN_BACK=\d+, WIN_FWD=\d+, MAX_JUMP=\d+;/,'sabitler'),
  cikar(kod,/function yumusat\(x\)\{[^\n]*\}/,'yumusat'),
  cikar(kod,/function ortakOnek\(a,b\)\{[\s\S]*?\n\}/,'ortakOnek'),
  cikar(kod,/function birHata\(a,b\)\{[\s\S]*?\n\}/,'birHata'),
  cikar(kod,/function wordEq\(nw,tok\)\{[\s\S]*?\n\}/,'wordEq'),
  cikar(kod,/function matchVoice\(spoken\)\{[\s\S]*?\n\}/,'matchVoice'),
].join('\n');

function kur(kelimeler){
  const log={};
  return new Function('__k','__log', `
    let voicePaused=false, vptr=0, vTarget=0, recent=[], lastTokAt=0, lastHitAt=0;
    let jumpSwallow=0, vPrev={i:-1,t:0}, srSeen='', srIdx=-1;
    let normWords=__k.map((w,i)=>({i,n:w,ph:''}));
    let wordTops=__k.map((_,i)=>i*60+30);
    const st={wpm:140};
    let __saat=0;
    const performance={now:()=>__saat};
    const eyeOff=()=>200;
    const setVoiceBadge=()=>{};
    const vHud=(d,_t,_y,genis)=>{ __log.durum=d; __log.genis=genis; };
    const markDiff=()=>{};
${parcalar}
    return { konus(w,dt){ __saat+=dt; __log.durum=null; __log.genis=null; matchVoice([w]);
      return {vptr, durum:__log.durum, genis:__log.genis}; }, get vptr(){return vptr;} };
  `)(kelimeler, log);
}
/* Gerçekçi metin: benzersiz sözcükler + gerçek metinlerdeki dolgu kelimeleri. */
function uret(n,tohum=3){
  let r=tohum; const R=()=>{ r=(r*1103515245+12345)&0x7fffffff; return r/0x7fffffff; };
  const S=['ve','bir','bu','de','da','icin','ile','ama','cok','sonra'];
  const o=[]; let i=0;
  while(o.length<n){ if(R()<0.35) o.push(S[Math.floor(R()*S.length)]); else o.push('sozcuk'+(i++)); }
  return o.slice(0,n);
}
ok('sentetik metin gerçekçi tekrar oranında (%50-80 benzersiz)', (()=>{
  const k=uret(2000); const oran=new Set(k).size/k.length; return oran>0.5 && oran<0.8;
})());

/* ---------- UZUN METİNDE SONA KADAR TAKİP ---------- */
function duzOku(n){
  const k=uret(n), t=kur(k);
  let rnd=1; const R=()=>{ rnd=(rnd*1103515245+12345)&0x7fffffff; return rnd/0x7fffffff; };
  let genisSayisi=0, sonI=-1;
  for(let i=0;i<k.length;i++){
    if(R()<0.05) continue;                                  // kullanıcı kelime atladı
    let w=k[i]; if(R()<0.08) w=w.slice(0,Math.max(2,w.length-1));  // tanıma hatası
    const r=t.konus(w,400);
    if(r.genis) genisSayisi++;
    sonI=i;
  }
  return {son:t.vptr, sonI, genisSayisi, uzunluk:k.length};
}
for(const n of [800, 2000, 5000]){
  const r=duzOku(n);
  ok(n+' kelimelik metinde işaretçi sona ulaşıyor (sapma ≤2)', Math.abs(r.son-(r.sonI+1)) <= 2);
  ok(n+' kelimelik metinde geniş arama nadiren gerekiyor (<%1)', r.genisSayisi/n < 0.01);
}

/* ---------- ATLAYAN KULLANICI YAKALANIYOR ---------- */
{
  const k=uret(2000), t=kur(k);
  for(let i=0;i<200;i++) t.konus(k[i],400);
  const once=t.vptr;
  ok('düz okumada işaretçi ilerliyor', once>150);
  let adim=0, son=once;
  for(let i=800;i<900;i++){ const r=t.konus(k[i],400); adim++; son=r.vptr; if(son>780) break; }
  ok('600 kelime ileri sıçrayan kullanıcı yakalanıyor', son>780);
  ok('yakalama 30 kelimeden kısa sürüyor ('+adim+' kelime)', adim<30);
}

/* ---------- GERİYE SIÇRAMA (baştan okumak) ---------- */
{
  const k=uret(2000), t=kur(k);
  for(let i=0;i<600;i++) t.konus(k[i],400);
  let son=t.vptr, adim=0;
  for(let i=100;i<200;i++){ const r=t.konus(k[i],400); adim++; son=r.vptr; if(son<250) break; }
  ok('geriye dönen kullanıcı da yakalanıyor', son<250);
  /* ÖLÇÜLEN ASİMETRİ: ileri sıçrama ~17 kelimede, GERİYE dönüş ~70 kelimede
     yakalanıyor — dört kat yavaş. Sebebi tasarımda: pencere geriye 8, ileriye
     26 kelime bakıyor (WIN_BACK<WIN_FWD) ve geniş arama ancak 1,2 saniye
     HİÇ eşleşme olmayınca açılıyor; geride kalan dolgu kelimeleri zayıf
     eşleşmeler üretip o sayacı sürekli sıfırlıyor.
     Cümleyi baştan okumak sık yapılan bir şey, yani bu gerçek bir gecikme.
     Eşiği UYDURMUYORUM: ölçülen değeri paylayla kilitliyorum. Bunu iyileştirmek
     ayrı bir iş — bu gece bir kez, etkisini gösteremediğim bir yamayı geri
     almak zorunda kaldım; aynı hatayı tekrarlamıyorum. */
  ok('geriye yakalama ölçülen sınırda ('+adim+' kelime, tavan 90)', adim<90);
}

/* ---------- KURTARMA MEKANİZMASININ PARÇALARI DURUYOR MU ----------
   Ölçümün dayandığı davranışlar; biri kalkarsa yukarıdaki sayılar değişir. */
const mv=cikar(kod,/function matchVoice\(spoken\)\{[\s\S]*?\n\}/,'matchVoice');
ok('uzun sessizlikten sonra eski kelimeler unutuluyor', /now-lastTokAt>4000\) recent\.length=0/.test(mv));
ok('takılınca pencere tüm metne açılıyor', /const lo = genis \? 0 : Math\.max\(0,vptr-WIN_BACK\)/.test(mv));
ok('geniş arama 1,2 saniyeden sonra devreye giriyor', /kayipSure>1200/.test(mv));
ok('büyük sıçrama üç kez yutulup sonra kabul ediliyor', /if\(\+\+jumpSwallow<3\) return;/.test(mv));
ok('eşleşemeyince kullanıcıya söyleniyor', /setVoiceBadge\('lost'\)/.test(mv));
ok('son duyulan kelimeye daha yüksek ağırlık veriliyor', /j===recent\.length-1\?1\.6:1/.test(mv));
ok('pencere sabitleri beklenen değerlerde',
   /const WIN_BACK=8, WIN_FWD=26, MAX_JUMP=14;/.test(kod));
