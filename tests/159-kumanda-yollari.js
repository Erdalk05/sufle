const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,blokKes,cekirdekOku}=require('./kaynak');
const telHam=oku(telefonYolu()), macHam=oku(macYolu());
const yorumsuz=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const tel=yorumsuz(telHam), mac=yorumsuz(macHam);
const CEK=cekirdekOku('kumanda.js','SUFLE_KUMANDA');

/* G.14 — KUMANDA BAĞLANTI YOLLARI.

   Rakip (teleprompter.com) bağlantıyı kendi seçiyor: internet yoksa
   Bluetooth, aynı Wi-Fi'daysa yerel ağ, uzaktaysa internet. Bizde üç yolun
   ikisi var, üçüncüsü mimari bir KARAR (bize ait sunucu yok ve olmayacak).

   BU MADDENİN İŞİ YENİ YOL AÇMAK DEĞİL, SEBEBİ GÖRÜNÜR KILMAK:
   "kumanda çalışmıyor" şikâyetinin yarısı, çalışmayan yolun sebebinin
   hiçbir yerde yazmamasından geliyor. Bu depoda ölçülmüş iki gerçek:
   · ucuz kumandalar Ses Aç/Kıs gönderir, iOS ve Android bunu tarayıcıya
     hiç vermez — uygulamanın yapabileceği bir şey yok;
   · telefon yerel sunucu ÇALIŞTIRAMAZ, yani ikinci cihaz kumandası yalnız
     masaüstünde var. */

const c=(()=>new Function(CEK+'\nreturn {kumandaYollari};')())();

/* ---------- 1) ÜÇ YOL, HER DURUMDA SEBEP ---------- */
{
  const {kumandaYollari}=c;
  const telefon=kumandaYollari('telefon', {});
  ok('telefonda üç yol da listeleniyor', telefon.length===3);
  ok('yollar bt, lan, internet sırasında',
     telefon.map(y=>y.yol).join(',')==='bt,lan,internet');
  ok('telefonda Bluetooth kullanılabilir', telefon[0].durum==='var');
  /* TELEFON SUNUCU ÇALIŞTIRAMAZ: bu bir eksik değil, tarayıcı sınırı. */
  ok('telefonda yerel ağ yolu yok', telefon[1].durum==='yok');
  ok('telefonda sebep sunucusuzluk', telefon[1].sebep==='telefonSunucuYok');
  ok('internet yolu yok', telefon[2].durum==='yok');
  ok('internet sebebi bizim sunucumuz olmaması', telefon[2].sebep==='sunucuYok');

  const macAcik=kumandaYollari('mac', {sunucu:true});
  ok('Macte sunucu açıkken yerel ağ var', macAcik[1].durum==='var');
  ok('kullanılabilir yolda sebep yazılmıyor', macAcik[1].sebep===null);
  const macKapali=kumandaYollari('mac', {sunucu:false});
  /* KAPALI ile YOK farklı şeyler: biri açılabilir, diğeri açılamaz.
     Aynı kelimeyle anlatmak kullanıcıyı boşuna uğraştırır. */
  ok('Macte sunucu kapalıyken durum kapalı', macKapali[1].durum==='kapali');
  ok('kapalı durumun sebebi ayrı', macKapali[1].sebep==='sunucuKapali');
  ok('kapalı ile yok aynı sebep değil', macKapali[1].sebep!==telefon[1].sebep);

  /* HER OLUMSUZ DURUMUN SEBEBİ OLMALI — sessiz "yok" yasak. */
  for(const kabuk of ['telefon','mac'])
    for(const durum of [{}, {sunucu:true}])
      for(const y of kumandaYollari(kabuk, durum)){
        if(y.durum==='var') ok(kabuk+': kullanılabilir yolda sebep yok', y.sebep===null);
        else ok(kabuk+'/'+y.yol+': olumsuz durumun sebebi var', !!y.sebep);
      }
  ok('durum verilmezse çökmüyor', kumandaYollari('mac').length===3);
  ok('bilinmeyen kabuk telefon gibi ele alınıyor',
     kumandaYollari('yokboyle',{}).map(y=>y.durum).join(',')===telefon.map(y=>y.durum).join(','));
}

/* ---------- 2) KABUKLAR PANELDE GÖSTERİYOR MU ---------- */
for(const [ad,ham,kod,kabuk] of [['telefon',telHam,tel,'telefon'],['masaüstü',macHam,mac,'mac']]){
  ok(ad+': yol listesi arayüzde', /id="yolListe"/.test(ham));
  ok(ad+': çekirdek çağrılıyor', new RegExp("kumandaYollari\\('"+kabuk+"'").test(kod));
  const yaz=blokKes(kod,'function yollariYaz()')||'';
  ok(ad+': yollariYaz çıkarılabildi', yaz.length>0);
  ok(ad+': liste her çizimde sıfırlanıyor', /innerHTML=''/.test(yaz));
  /* DURUM VE SEBEP BİRLİKTE: yalnız ikon göstermek "neden" sorusunu
     yanıtsız bırakır. */
  ok(ad+': sebep metni de yazılıyor', /yolSebepMetni\(y\.sebep\)/.test(yaz));
  ok(ad+': üç durum için üç ayrı işaret', /'✅'/.test(yaz) && /'⏸'/.test(yaz) && /'⛔'/.test(yaz));
  const sebep=blokKes(kod,'function yolSebepMetni(')||'';
  ok(ad+': üç sebep de çeviriye bağlı',
     /yolTelefonSunucuYok/.test(sebep) && /yolSunucuKapali/.test(sebep) && /yolSunucuYok/.test(sebep));
  const adf=blokKes(kod,'function yolAdi(')||'';
  ok(ad+': yol adları çeviriden', /yolBt/.test(adf) && /yolLan/.test(adf) && /yolInternet/.test(adf));
}
{
  /* MAC: sunucunun ayakta olduğu VARSAYILMIYOR, bağlantı göstergesinden
     okunuyor. Ayrı bir bayrak tutmak iki kaynağın ayrışması demekti — bu
     depoda ölü adres gösteren kusur böyle doğmuştu. */
  const yaz=blokKes(mac,'function yollariYaz()')||'';
  /* İDDİA DARALTILDI: "connDot geçiyor mu" diye bakmak, `const ayakta=true`
     yazan bir bozmayı geçiriyordu çünkü yorumda da geçiyordu. Doğru iddia
     DEĞİŞKENİN GERÇEKTEN göstergeden türetilmesi. */
  ok('Mac sunucu durumu göstergeden türetiliyor',
     /const ayakta=!!\(nokta && nokta\.classList\.contains\('on'\)\)/.test(yaz));
  ok('Mac sunucu durumu sabit değere bağlanmamış', !/const ayakta=(true|false)/.test(yaz));
  /* Gösterge değişince liste de tazelenmeli, yoksa panel bayat kalır. */
  ok('bağlantı açılınca liste tazeleniyor', /onopen=\(\)=>\{[^}]*yollariYaz\(\)/.test(mac));
  ok('bağlantı kopunca liste tazeleniyor', /onerror=\(\)=>\{[^}]*yollariYaz\(\)/.test(mac));
}
{
  const sozluk=cekirdekOku('sozluk.js','SUFLE_SOZLUK');
  for(const k of ['yolTitle','yolBt','yolLan','yolInternet','yolVar','yolYok','yolKapali',
                  'yolTelefonSunucuYok','yolSunucuKapali','yolSunucuYok']){
    const bul=[...sozluk.matchAll(new RegExp(k+":'([^']*)'",'g'))].map(m=>m[1]);
    ok('sözlükte '+k+' iki dilde', bul.length===2);
    ok('sözlükte '+k+' çevrilmiş', bul.length===2 && bul[0]!==bul[1]);
  }
  /* İnternet sebebi bir KARAR anlatmalı, bir eksiklik değil: gizlilik sözü
     tam da burada duruyor. */
  const tr=(sozluk.match(/yolSunucuYok:'([^']*)'/)||[])[1]||'';
  ok('internet sebebi gizlilik kararını söylüyor', /cihaz/i.test(tr));
}
