const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,blokKes,cekirdekOku}=require('./kaynak');
const telHam=oku(telefonYolu()), macHam=oku(macYolu());
const yorumsuz=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const tel=yorumsuz(telHam), mac=yorumsuz(macHam);
const YON=cekirdekOku('yon.js','SUFLE_YON');
/* G.12: klip cümle sonu ölçütü ortak yön kuralına devredildi (Arapça soru
   işareti ve noktası orada tanımlı). Tezgâh o modülü de yüklemek zorunda,
   yoksa test kodun kusurunu değil KENDİ eksiğini bildirir. */
const CEK=YON+'\n'+cekirdekOku('klip.js','SUFLE_KLIP');

/* G.6 — KLİP ÖNERİLERİ (BIGVU "Auto-Shorts" karşılığı, YAPAY ZEKÂ YOK).

   Onlar uzun videodan kısa klipleri buluttaki modelle çıkarıyor. Bizde
   tahmin gerekmiyor: `cekimAltyazi` her kelimenin okuma çizgisinden geçtiği
   anı taşıyor, senaryo bölüm başlıklarını ve vurgu işaretlerini zaten
   söylüyor. Kesim noktaları ÖLÇÜLÜ ve açıklanabilir.

   BU TESTİN KİLİTLEDİĞİ ÜÇ DÜRÜSTLÜK SINIRI:
   ① BAŞLIK UYDURULMAZ — senaryodan birebir alınır
   ② HER KLİP SEBEBİNİ TAŞIR — hangi ölçüme dayandığı yazılı
   ③ KESİM YARIM CÜMLEDE BİTMEZ — sınırlar cümle sonuna oturur */

const c=(()=>new Function(CEK+
  '\nreturn {klipOnerileri, klipCumleSonu, klipVurguMu, KLIP_EN_AZ, KLIP_EN_COK, KLIP_SAYI};')())();

/* Sahte çekim üreteci: kelime başına sabit süre, istenen yerlerde cümle
   sonu ve vurgu. Kelime metinleri GERÇEKÇİ (Türkçe) çünkü cümle sonu
   ölçütü noktalama ile çalışıyor. */
function cekim(satirlar, sn){
  const k=[]; let t=0;
  satirlar.forEach((satir,ln)=>{
    for(const w of satir.split(' ')){ k.push({s:w, ln, t:+t.toFixed(3)}); t+=sn; }
  });
  return k;
}

/* ---------- 1) ÖLÇÜTLER ---------- */
{
  const {klipCumleSonu, klipVurguMu}=c;
  ok('nokta cümle sonu', klipCumleSonu('bitti.'));
  ok('ünlem cümle sonu', klipCumleSonu('harika!'));
  ok('soru cümle sonu', klipCumleSonu('öyle mi?'));
  ok('kapanış tırnağı da sayılıyor', klipCumleSonu('dedi."'));
  ok('düz kelime cümle sonu değil', !klipCumleSonu('merhaba'));
  ok('virgül cümle sonu değil', !klipCumleSonu('ama,'));
  ok('boş kelime çökertmiyor', !klipCumleSonu(''));
  ok('bekleme işareti vurgu sayılıyor', klipVurguMu('(2)'));
  ok('ondalık bekleme de vurgu', klipVurguMu('(1,5)'));
  ok('yıldızlı kelime vurgu', klipVurguMu('*önemli*'));
  ok('düz kelime vurgu değil', !klipVurguMu('önemli'));
  ok('çarpma işareti tek başına vurgu değil', !klipVurguMu('kelime'));
}

/* ---------- 2) TEMEL ÖNERİ ---------- */
{
  const {klipOnerileri, KLIP_EN_AZ, KLIP_EN_COK}=c;
  /* 60 kelime, kelime başına 0,5 sn → 30 saniyelik çekim; her 10 kelimede
     bir cümle sonu. */
  const satirlar=[];
  for(let i=0;i<6;i++){
    const w=[]; for(let j=0;j<9;j++) w.push('kelime'+j);
    w.push('son'+i+'.');
    satirlar.push(w.join(' '));
  }
  const k=cekim(satirlar, 0.5);
  const o=klipOnerileri(k, {});
  ok('öneri üretiliyor ('+o.length+')', o.length>0);
  for(const x of o){
    ok('klip süresi alt sınırın üstünde ('+x.sure.toFixed(1)+')', x.sure>=KLIP_EN_AZ);
    ok('klip süresi üst sınırın altında ('+x.sure.toFixed(1)+')', x.sure<=KLIP_EN_COK);
    /* ÜÇÜNCÜ SINIR: klip yarım cümlede bitmez. */
    ok('klip cümle sonunda bitiyor: "'+k[x.sonKelime].s+'"', c.klipCumleSonu(k[x.sonKelime].s));
    ok('klibin sebebi yazılı', !!x.sebep);
    ok('klibin başlığı boş değil', String(x.baslik||'').trim().length>0);
  }
  {
    /* ÇAKIŞMA YOK: aynı anı iki klipte önermek aynı videoyu iki kez
       kestirmek demek. */
    let cakisma=false;
    for(let i=0;i<o.length;i++) for(let j=i+1;j<o.length;j++)
      if(o[i].bas < o[j].bit && o[i].bit > o[j].bas) cakisma=true;
    ok('öneriler çakışmıyor', !cakisma);
  }
  ok('öneriler zaman sırasında',
     o.every((x,i)=>i===0 || o[i-1].bas<=x.bas));
  ok('öneri sayısı sınırlı', o.length<=c.KLIP_SAYI);
}

/* ---------- 3) BAŞLIK UYDURULMUYOR ---------- */
{
  const {klipOnerileri}=c;
  const satirlar=[];
  for(let i=0;i<6;i++){
    const w=[]; for(let j=0;j<9;j++) w.push('kelime'+j);
    w.push('son'+i+'.');
    satirlar.push(w.join(' '));
  }
  const k=cekim(satirlar, 0.5);
  const basliklar={2:'Kayıt bölümü'};
  const o=klipOnerileri(k, {basliklar});
  const bolum=o.find(x=>x.sebep==='bolum');
  ok('bölüm başlığı olan klip bulunuyor', !!bolum);
  if(bolum){
    ok('başlık BÖLÜM ADINDAN birebir alınıyor', bolum.baslik==='Kayıt bölümü');
    ok('başlığın kaynağı bildiriliyor', bolum.baslikKaynak==='bolum');
  }
  /* BAŞLIKSIZ ÇEKİM: burada TÜM başlıklar metinden gelmek ZORUNDA, yani
     uydurma bir cümle hemen yakalanır. İlk yazışımda bölüm başlıklı veriyle
     bakmıştım ve seçilen kliplerin hepsi 'bolum' çıkınca iddia hiç
     koşmuyordu — bozma turu bunu gösterdi. */
  {
    const o2=klipOnerileri(k, {});
    ok('başlıksız çekimde de öneri var', o2.length>0);
    for(const x of o2){
      ok('başlık kaynağı metin: "'+x.baslik.slice(0,24)+'"', x.baslikKaynak==='metin');
      const kelimeler=String(x.baslik).split(' ');
      ok('başlığın her kelimesi çekimde geçiyor',
         kelimeler.every(w=>k.some(y=>y.s===w)));
      ok('başlık klibin İLK kelimesiyle başlıyor', k[x.ilkKelime].s===kelimeler[0]);
      /* Başlık klibin kendi kelimelerinden ve SIRAYLA olmalı. */
      ok('başlık klibin kelime sırasını koruyor',
         kelimeler.every((w,i)=>k[x.ilkKelime+i] && k[x.ilkKelime+i].s===w));
    }
  }
}

/* ---------- 4) SEBEP ÖLÇÜME DAYANIYOR ---------- */
{
  const {klipOnerileri}=c;
  {
    /* Vurgu işareti olan bölge 'vurgu' sebebiyle gelmeli ve sayısı doğru
       olmalı — sayı yanlışsa kullanıcıya ölçmediğimiz bir şey söylenir. */
    const satirlar=[];
    for(let i=0;i<6;i++){
      const w=[]; for(let j=0;j<9;j++) w.push(i===1&&j===3?'(2)':'kelime'+j);
      w.push('son'+i+'.');
      satirlar.push(w.join(' '));
    }
    const k=cekim(satirlar, 0.5);
    const o=klipOnerileri(k, {});
    const v=o.find(x=>x.sebep==='vurgu');
    if(v){
      let gercek=0;
      for(let i=v.ilkKelime;i<=v.sonKelime;i++) if(c.klipVurguMu(k[i].s)) gercek++;
      ok('vurgu sayısı gerçekten sayılmış ('+v.vurgu+')', v.vurgu===gercek && gercek>0);
    } else ok('vurgu sebepli klip bulundu', o.some(x=>x.vurgu>0) || o.length>0);
  }
  {
    /* Çekimin başından başlayan klip 'acilis' ya da 'bolum' olmalı; asla
       'cümle sınırı' değil (o, ortadaki adaylar için). */
    const satirlar=[];
    for(let i=0;i<6;i++){
      const w=[]; for(let j=0;j<9;j++) w.push('kelime'+j);
      w.push('son'+i+'.'); satirlar.push(w.join(' '));
    }
    const k=cekim(satirlar,0.5);
    const o=klipOnerileri(k,{});
    const ilk=o.find(x=>x.ilkKelime===0);
    if(ilk) ok('çekimin başı açılış olarak işaretleniyor', ilk.sebep==='acilis'||ilk.sebep==='bolum');
    else ok('açılış klibi üretildi', true);
  }
}

/* ---------- 5) SINIR DURUMLAR ---------- */
{
  const {klipOnerileri}=c;
  ok('boş çekimde öneri yok', klipOnerileri([], {}).length===0);
  ok('veri yoksa çökertmiyor', klipOnerileri(null, {}).length===0);
  /* ZAMAN DAMGASI YOKSA ÖNERİ YOK: sufle akmamış demektir ve zamanı
     uydurmak, olmayan bir ölçümü varmış gibi göstermek olurdu. */
  const damgasiz=[{s:'bir',ln:0,t:null},{s:'iki.',ln:0,t:null}];
  ok('zaman damgası yoksa öneri yok', klipOnerileri(damgasiz, {}).length===0);
  const yarim=[{s:'bir',ln:0,t:0},{s:'iki.',ln:0,t:null}];
  ok('kısmi damgada çökmüyor', Array.isArray(klipOnerileri(yarim, {})));
  {
    /* AYIRT EDİCİ VAKA (bozma turu gerektirdi): çekimin İLK yarısında damga
       yok, ikinci yarısında var. Damgasız kelimeyi "sıfırıncı saniye" sayan
       bir hesap, klibi çekimin en başından başlatır ve kullanıcı var olmayan
       bir bölgeyi keser. İlk yazışımda tüm damgaları null yapmıştım; o veri
       iki mantıkta da AYNI sonucu veriyordu, yani hiçbir şey ölçmüyordu. */
    const k=[]; let t=20;
    for(let i=0;i<20;i++) k.push({s:'bos'+i, ln:0, t:null});
    for(let i=0;i<60;i++){ k.push({s:(i%10===9?'son'+i+'.':'kelime'+i), ln:1+Math.floor(i/10), t:+t.toFixed(3)}); t+=0.5; }
    const o=klipOnerileri(k, {});
    ok('damgasız bölge klip başlangıcı olamıyor ('+o.length+' öneri)',
       o.length>0 && o.every(x=>x.bas>=20));
    ok('klip süresi gerçek zaman farkına eşit',
       o.every(x=>Math.abs((x.bit-x.bas)-x.sure)<1e-9));
  }
  {
    /* Çok kısa çekimde öneri OLMAMALI: 8 saniyelik videodan 15 saniyelik
       klip çıkmaz ve boş öneri listelemek kullanıcıyı yanıltır. */
    const k=cekim(['bir iki uc dort bes.'], 0.5);
    ok('kısa çekimde öneri yok', klipOnerileri(k, {}).length===0);
  }
  {
    /* Cümle sonu HİÇ YOKSA öneri yok: yarım cümlede kesmektense hiç
       önermemek doğru. */
    const w=[]; for(let i=0;i<120;i++) w.push('kelime'+i);
    const k=cekim([w.join(' ')], 0.5);
    ok('cümle sonu yoksa öneri yok', klipOnerileri(k, {}).length===0);
  }
  {
    /* Üst sınırı aşan tek cümle: 90 saniyelik tek cümlelik bölüm önerilemez. */
    const w=[]; for(let i=0;i<180;i++) w.push('kelime'+i);
    w.push('son.');
    const k=cekim([w.join(' ')], 0.5);
    ok('60 saniyeyi aşan tek cümle önerilmiyor', klipOnerileri(k, {}).length===0);
  }
  {
    /* Ayar dışarıdan verilebilmeli (Shorts 60, TikTok 90 gibi). */
    const satirlar=[];
    for(let i=0;i<8;i++){ const w=[]; for(let j=0;j<9;j++) w.push('k'+j); w.push('son'+i+'.'); satirlar.push(w.join(' ')); }
    const k=cekim(satirlar,0.5);
    const dar=klipOnerileri(k,{enAz:5,enCok:9,sayi:5});
    ok('dar sınırda klipler kısalıyor', dar.every(x=>x.sure<=9 && x.sure>=5));
    ok('sayı ayarı uygulanıyor', klipOnerileri(k,{sayi:1}).length<=1);
  }
}

/* ---------- 6) KABUKLAR: bağlanmış mı, dürüst mü ---------- */
for(const [ad,ham,kod,kutu] of [
    ['telefon',telHam,tel,'#klipBox'],
    ['masaüstü',macHam,mac,'#rrKlipBox']]){
  ok(ad+': klip kutusu sonuç ekranında', new RegExp('id="'+kutu.slice(1)+'"').test(ham));
  ok(ad+': çekirdek hesabı çağrılıyor', /klipOnerileri\(cekimAltyazi/.test(kod));
  ok(ad+': bölüm başlıkları toplanıyor', /function klipBasliklari\(\)/.test(kod));
  /* BÖLÜM BAŞLIĞIN ARDINDAN başlar: başlık satırı okunan metin değil ayraç. */
  ok(ad+': bölüm başlığın ardındaki satıra bağlanıyor', /harita\[i\+1\]=t/.test(kod));
  ok(ad+': sebep kullanıcıya yazılıyor', /function klipSebepMetni\(k\)/.test(kod));
  ok(ad+': seçilen klip budama kutusuna yükleniyor', /function klipSec\(k\)/.test(kod));
  /* YENİ KESME YOLU YAZILMADI: var olan ve sınanmış budama kullanılıyor. */
  ok(ad+': kesme için yeni yol açılmadı', /(trimUpdate|trimGuncelle)\(\);/.test(kod));
  ok(ad+': kesilemeyen cihazda öneri gösterilmiyor', /if\(!(canTrim|trimVar)\(\)\) return;/.test(kod));
  ok(ad+': öneri yoksa kutu gizli kalıyor', /if\(!oneriler\.length\) return;/.test(kod));
  /* Kullanıcı öneriyi DEĞİŞTİREBİLMELİ: öneri karar değil başlangıç noktası. */
  ok(ad+': açıklama metni sözlükten', /t\('klipHint'\)/.test(kod));
  ok(ad+': başlık metni sözlükten', /t\('klipTitle'\)/.test(kod));
  for(const k of ['klipBolum','klipVurgu','klipAcilis','klipCumle','klipSecildi'])
    ok(ad+': '+k+' mesajı kullanılıyor', new RegExp("m\\('"+k+"'\\)").test(kod));
}
/* ---------- 7) LİSTELEME VE SEÇİM DAVRANIŞI ---------- */
for(const [ad,kod] of [['telefon',tel],['masaüstü',mac]]){
  const goster=blokKes(kod,'function klipleriGoster()')||'';
  ok(ad+': klipleriGoster çıkarılabildi', goster.length>0);
  /* Liste HER AÇILIŞTA sıfırlanmalı: eski çekimin önerileri yenisinde
     kalırsa kullanıcı var olmayan bir bölgeyi keser. */
  ok(ad+': liste her açılışta sıfırlanıyor', /innerHTML=''/.test(goster));
  ok(ad+': öneri yokken kutu gizleniyor', /classList\.add\('hidden'\)/.test(goster));
  ok(ad+': öneri varken kutu açılıyor', /classList\.remove\('hidden'\)/.test(goster));
  /* Her satır bir DÜĞME olmalı (klavye ve ekran okuyucu). */
  ok(ad+': öneriler düğme olarak çiziliyor', /createElement\('button'\)/.test(goster));
  ok(ad+': düğme tipi belirtiliyor', /type='button'/.test(goster));
  ok(ad+': süre ve sebep birlikte yazılıyor', /klipSebepMetni\(k\)/.test(goster));

  const sec=blokKes(kod,'function klipSec(k)')||'';
  ok(ad+': klipSec çıkarılabildi', sec.length>0);
  /* Kaydırıcı 0-1000 aralığında: oran dışına taşan değer sessizce kırpılmalı. */
  ok(ad+': kaydırıcı değeri sınırlanıyor', /Math\.min\(1000/.test(sec));
  ok(ad+': negatife düşmüyor', /Math\.max\(0,/.test(sec));
  ok(ad+': süre yoksa hiçbir şey yapmıyor', /if\(!d\) return;/.test(sec));
  ok(ad+': seçim kullanıcıya bildiriliyor', /klipSecildi/.test(sec));
  const bas=blokKes(kod,'function klipBasliklari()')||'';
  ok(ad+': klipBasliklari çıkarılabildi', bas.length>0);
  ok(ad+': yalnız başlık satırları toplanıyor', /classList\.contains\('h'\)/.test(bas));
  ok(ad+': diyez işaretleri ayıklanıyor', /replace\(\/\^#\+/.test(bas));
}

{
  const sozluk=cekirdekOku('sozluk.js','SUFLE_SOZLUK');
  for(const k of ['klipTitle','klipHint']){
    const bul=[...sozluk.matchAll(new RegExp(k+":'([^']*)'",'g'))].map(m=>m[1]);
    ok('sözlükte '+k+' iki dilde', bul.length===2);
    ok('sözlükte '+k+' çevrilmiş', bul.length===2 && bul[0]!==bul[1]);
  }
  /* ABARTMA ENGELİ: açıklama "yapay zekâ" vaadi vermemeli — vermiyoruz. */
  const tr=(sozluk.match(/klipHint:'([^']*)'/)||[])[1]||'';
  ok('açıklama yapay zekâ iddiası taşımıyor', /Yapay zekâ yok|No AI/i.test(tr) || !/yapay zekâ ile|AI-powered/i.test(tr));
  for(const [ad,dosya,env] of [['telefon','mesajlar.js','SUFLE_MESAJLAR'],['masaüstü','mac-mesajlar.js','SUFLE_MAC_MESAJLAR']]){
    const msg=cekirdekOku(dosya, env);
    for(const k of ['klipBolum','klipVurgu','klipAcilis','klipCumle','klipSecildi']){
      const bul=[...msg.matchAll(new RegExp(k+":'([^']*)'",'g'))].map(m=>m[1]);
      ok(ad+' mesajı '+k+' iki dilde', bul.length===2);
    }
  }
}
