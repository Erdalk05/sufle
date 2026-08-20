const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,esnek}=require('./kaynak');
const tel=esnek(esnek(oku(telefonYolu())));
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* A1 — YENİDEN ÖLÇÜM MALİYETİ: SORUN ÖLÇÜMÜN KENDİSİ DEĞİL, KAÇ KEZ KOŞTUĞU.

   measure() zaten kendi süresini ölçüyor ve 120 ms aşılırsa bir kez uyarıyor.
   Asıl bulgu çağıranlardaydı: yazı boyutu, satır aralığı, kenar boşluğu,
   okuma çizgisi, kalınlık ve harf aralığı kaydırıcılarının hepsi `oninput`
   ile bağlı — parmağını sürüklerken olay her piksel hareketinde ateşleniyor.
   Her olay AYRI bir requestAnimationFrame kuruyordu ve rAF geri çağrıları
   BİRLEŞTİRİLMEZ: aynı karede biriken 12 olay, 12 tam yeniden ölçüm demekti.
   Ölçüm bütün kelimelerin offsetTop değerini okuduğu için uzun senaryoda bu
   doğrudan takılma olarak hissedilir.

   NE ÖLÇÜLDÜ, NE ÖLÇÜLMEDİ — dürüst sınır: buradaki tezgâh gerçek tarayıcı
   düzeni koşturamaz, yani "10.000 kelimede ölçüm X ms sürüyor" diyemem.
   Ölçülen şey SAYIM: bir karede kaç yeniden ölçüm tetikleniyor. Düzeltmeden
   önce olay sayısı kadar, sonra tam olarak bir. Milisaniye iddiası yok. */

/* ---------- KAYNAK DÜZEYİ ---------- */
const mPlan=kod.match(/function olcPlanla\(\)\{[\s\S]*?\n\}/);
ok('olcPlanla tanımlı', !!mPlan);
const mBind=kod.match(/const bind=\(sel,key,after\)=>\{[^\n]*\};/);
ok('bind tanımlı', !!mBind);
if(!mPlan || !mBind) return;

ok('kaydırıcılar hâlâ oninput ile bağlı (canlı önizleme korunuyor)',
   /\$\(sel\)\.oninput=/.test(mBind[0]));
/* Hiçbir çağıran planlayıcıyı atlamamalı; yoksa o yol eski davranışa döner. */
ok('doğrudan requestAnimationFrame(yenidenOlc) çağrısı kalmadı',
   !/requestAnimationFrame\(yenidenOlc\)/.test(kod));
const olcenler=(kod.match(/olcPlanla\(\)/g)||[]).length;
ok('yeniden ölçüm isteyen tüm yollar planlayıcıdan geçiyor ('+olcenler+' çağrı)', olcenler>=9);
/* Yön değiştirme kasıtlı olarak gecikmeli: iOS dönme animasyonu bitmeden
   ölçmek yanlış yükseklik verir. Planlayıcıya bağlanmamalı. */
ok('yön değiştirme kendi gecikmesini koruyor',
   /orientationchange[\s\S]{0,60}setTimeout\(yenidenOlc,\s*\d+\)/.test(kod));

/* ---------- SÜRÜKLEME SİMÜLASYONU: KARE BAŞINA KAÇ ÖLÇÜM ---------- */
function surukle(olaySayisi, kare){
  return new Function('__n','__kare', `
    let olcRaf=null, olcumSayisi=0, applySayisi=0;
    let kuyruk=[];
    const requestAnimationFrame=f=>{ kuyruk.push(f); return kuyruk.length; };
    const st={};
    const apply=()=>{ applySayisi++; };
    const save=()=>{};
    const yenidenOlc=()=>{ olcumSayisi++; };
    const el={oninput:null};
    const $=()=>el;
    ${mBind[0]}
    ${mPlan[0]}
    bind('#fs','fs',()=>olcPlanla());
    const kareKos=()=>{ const k=kuyruk; kuyruk=[]; k.forEach(f=>f()); };
    const sonuc=[];
    for(let f=0; f<__kare; f++){
      for(let i=0;i<__n;i++) el.oninput({target:{value:40+i}});
      kareKos();
      sonuc.push(olcumSayisi);
    }
    return {kareSonu:sonuc, toplamOlcum:olcumSayisi, toplamApply:applySayisi, bekleyen:olcRaf};
  `)(olaySayisi, kare);
}
{
  const r=surukle(12,1);
  ok('bir karedeki 12 olay TEK ölçüme iniyor (eskiden 12)', r.toplamOlcum===1);
  /* apply() olay başına koşmaya devam etmeli: kaydırıcının anlık etkisi
     ondan geliyor. Kısılan şey yalnız PAHALI yeniden ölçüm. */
  ok('anlık önizleme kısılmıyor (apply her olayda koştu)', r.toplamApply===12);
  ok('kare bitince bekleyen istek temizleniyor', r.bekleyen===null);
}
{
  /* Kilitlenme riski: bayrak sıfırlanmazsa ilk kareden sonra hiç ölçüm olmaz
     ve kullanıcı boyutu değiştirdiği hâlde metin hiç yeniden sarılmaz. */
  const r=surukle(8,5);
  ok('her karede yeniden ölçüm sürüyor (bayrak takılı kalmıyor)', r.toplamOlcum===5);
  ok('kare kare tam olarak birer artıyor',
     JSON.stringify(r.kareSonu)===JSON.stringify([1,2,3,4,5]));
}
{
  const r=surukle(1,3);
  ok('tek tek gelen olaylarda davranış aynı kalıyor', r.toplamOlcum===3);
}
{
  /* Sürükleme bitmeden kare gelmezse de tek ölçüm borçlu kalmalı. */
  const r=surukle(60,1);
  ok('60 olaylık uzun sürüklemede de tek ölçüm', r.toplamOlcum===1);
}

/* ---------- ÖLÇÜMÜN KENDİ MALİYET UYARISI DURUYOR MU ----------
   A1 iki parçalı: sayımı kıstık, süreyi de görünür tutuyoruz. */
const mm=kod.match(/function measure\(\)\{[\s\S]*?\n\}/);
ok('measure çıkarılabildi', !!mm);
if(mm){
  ok('ölçüm kendi süresini ölçüyor', /const cost=performance\.now\(\)-t0m/.test(mm[0]));
  ok('eşik aşılırsa günlüğe kelime sayısıyla yazılıyor',
     /logErr\('measure'[\s\S]{0,60}kelime/.test(mm[0]));
  ok('uyarı yalnız BİR kez veriliyor (her karede uyarı = ikinci bir yavaşlık)',
     /!measureWarned\)\{ measureWarned=true/.test(mm[0]));
  /* Ölçüm sırası: önce yazımlar, sonra okumalar. Araya yazım girerse her
     okuma yeni bir düzen hesabı zorlar (layout thrashing). */
  const yaziIdx=mm[0].indexOf('pt.style.height');
  const okuIdx=mm[0].indexOf('w.offsetTop');
  ok('düzen yazımları okumalardan ÖNCE (araya yazım girmiyor)',
     yaziIdx>=0 && okuIdx>yaziIdx);
}
