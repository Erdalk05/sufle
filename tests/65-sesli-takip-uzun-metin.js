const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* SESLE TAKİP UZUN METİNDE KAYBOLUYOR MU — ÖLÇÜLDÜ, HİPOTEZ ÇÜRÜDÜ.
   Gerçek matchVoice kaynaktan çıkarılıp sentetik okumayla koşturuldu:
   %5 kelime atlama, %8 tanıma hatası, gerçek Türkçe kelimelerden kurulu metin.

   ÖLÇÜLEN SONUÇ:
     · 800 / 2000 / 5000 kelimede işaretçi sona TAM ulaşıyor (sapma 0)
     · geniş arama neredeyse hiç gerekmiyor
     · 600 kelime ileri sıçrayan kullanıcı ~6 kelimede yakalanıyor
     · 500 kelime geriye dönen kullanıcı ~5 kelimede yakalanıyor

   BU ÖLÇÜMÜ ÜÇ KEZ YANLIŞ YAPTIM; üçü de HARNESS hatasıydı, üründe değil:
   1) Her adımda kelimeyi İKİ KEZ gönderiyordum; `recent` zaten son 5 kelimeyi
      biriktirdiği için yinelenen kelimeler oluşuyor ve hiç eşleşme çıkmıyordu.
   2) Düzeltince "ortalama sapma 52" çıktı, kusur sandım ve geniş modda
      tek-kelime kabulünü kapatan bir yama yazdım — yama sayıları HİÇ
      değiştirmedi, çünkü sebep o değildi. Geri aldım.
   3) Asıl kirlilik kelime üreticisindeydi: 'sozcuk0, sozcuk1, ...' 6 harflik
      ORTAK ÖNEK paylaşıyor ve wordEq'in ortak-kök kuralı (ok>=kisa*0.7)
      onları BİRBİRİNE eşliyor — 'sozcuk407' ile 'sozcuk58' eşleşiyordu.
      Yani ölçüm metni değil, eşleştiricinin kendi kuralını sınıyordu. Bu
      artefakt yüzünden "geriye dönüş 70 kelime sürüyor" diye YANLIŞ bir bulgu
      kaydettim (D11); gerçek sözlükle ölçünce 5 kelime çıktı.

   DERS: sentetik derlem, ölçtüğü sistemin DENKLİK KURALLARINA karşı da
   doğrulanmalı — yoksa harness kendini ölçer. Aşağıda sözlüğün kendisi
   wordEq ile sınanıyor ve bu artefakt kapıya bağlanıyor. */

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
/* GERÇEKÇİ SÖZLÜK — HARNESS ARTEFAKTINDAN SONRA.
   İlk üreticim 'sozcuk0, sozcuk1, ...' üretiyordu. Bunlar 6 harflik ORTAK ÖNEK
   paylaşıyor ve wordEq'in ortak-kök kuralı (ok>=kisa*0.7) onları BİRBİRİNE
   EŞLİYOR: 'sozcuk407' ile 'sozcuk58' eşleşiyordu. Yani ölçüm, eşleştiricinin
   kendi kuralını sınıyordu, metni değil. Bu artefakt yüzünden "geriye dönüş 70
   kelime sürüyor" diye YANLIŞ bir bulgu kaydettim ve düzeltmek için iki yama
   yazdım; ikisi de hiçbir şeyi değiştirmedi, çünkü ortada sorun yoktu.
   Ders: sentetik derlem, eşleştiricinin denklik kurallarına karşı da
   doğrulanmalı — yoksa harness kendini ölçer. */
const SOZLUK=('kamera isik ses kayit ekran metin okuma hizli yavas bugun yarin dun sabah aksam gece '+
 'insan cocuk kadin erkek arkadas komsu ogretmen ogrenci doktor muhendis yazar sanatci '+
 'masa sandalye pencere kapi duvar tavan zemin merdiven bahce sokak cadde meydan '+
 'kitap defter kalem silgi canta ayakkabi gomlek pantolon ceket sapka eldiven '+
 'elma armut uzum kiraz seftali kavun karpuz domates biber patlican havuc '+
 'kirmizi mavi yesil sari mor turuncu beyaz siyah gri pembe lacivert '+
 'gitmek gelmek almak vermek bakmak gormek duymak soylemek anlamak bilmek '+
 'buyuk kucuk uzun kisa genis dar yuksek alcak agir hafif sicak soguk').split(' ');
const DOLGU=['ve','bir','bu','de','da','icin','ile','ama','cok','sonra'];
function uret(n,tohum=3){
  let r=tohum; const R=()=>{ r=(r*1103515245+12345)&0x7fffffff; return r/0x7fffffff; };
  const o=[];
  while(o.length<n) o.push(R()<0.3 ? DOLGU[Math.floor(R()*DOLGU.length)] : SOZLUK[Math.floor(R()*SOZLUK.length)]);
  return o;
}
/* Sözlüğün kendisi eşleştiriciyi yanıltmıyor mu — ARTEFAKTI KAPIYA BAĞLA. */
{
  const eq=new Function(
    ['yumusat','ortakOnek','birHata','wordEq'].map(f=>cikar(kod,new RegExp('function '+f+'\\([\\s\\S]*?\\n\\}'),f)).join('\n')
    +'; return wordEq;')();
  let yanlis=0;
  for(let i=0;i<SOZLUK.length;i++)
    for(let j=i+1;j<SOZLUK.length;j++)
      if(eq(SOZLUK[i],SOZLUK[j])) yanlis++;
  ok('sözlükteki farklı kelimeler birbirine eşleşmiyor ('+yanlis+' çift)', yanlis===0);
}

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
  ok(n+' kelimelik metinde işaretçi sona TAM ulaşıyor (ölçülen sapma 0)', Math.abs(r.son-(r.sonI+1)) === 0);
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
  ok('ileri yakalama 15 kelimeden kısa ('+adim+' kelime, ölçülen 6)', adim<15);
}

/* ---------- GERİYE SIÇRAMA (baştan okumak) ---------- */
{
  const k=uret(2000), t=kur(k);
  for(let i=0;i<600;i++) t.konus(k[i],400);
  let son=t.vptr, adim=0;
  for(let i=100;i<200;i++){ const r=t.konus(k[i],400); adim++; son=r.vptr; if(son<250) break; }
  ok('geriye dönen kullanıcı da yakalanıyor', son<250);
  /* Gerçekçi sözlükle ölçülen: ileri ~6, geriye ~5 kelime. Asimetri YOK.
     Önceki "geriye dönüş 4 kat yavaş" bulgusu üreticinin artefaktıydı. */
ok('geriye yakalama 15 kelimeden kısa ('+adim+' kelime, ölçülen 5)', adim<15);
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
