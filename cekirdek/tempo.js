/* TEMPO — süre tahmini ve hedefe sığdırma. TEK KAYNAK (G.11).

   ÖLÇÜLEN BAŞLANGIÇ (2026-08-16):
   ① Telefonda "Hedef süre (pacing)" yalnız bir ROZET besliyordu: ne kadar
      geri/ileri olduğunu söylüyor ama hızı SÜRMÜYOR. Kullanıcı 60 saniyeye
      sığdırmak istiyorsa WPM ayarını kendi tahmin etmek zorundaydı.
      Rakipte (teleprompter.com) bu iş "sabit süreli kaydırma" diye satılıyor.
   ② Masaüstünde hedef süre HİÇ YOK ve tahmini süre duraklamaları saymıyor
      (`kelime/hız*60`). Telefonda bu kusur düzeltilmişti — 20 cümlelik
      nefes işaretli bir metinde ölçülen sapma 7 saniyeydi — ama Mac'e hiç
      taşınmamış. Yarım özellik, bu deponun 1 numaralı hata sınıfı.

   Hesap çekirdekte çünkü iki kabuk da aynı sayıyı göstermek zorunda:
   kullanıcı telefonda "sınıra uygun" görüp masaüstünde 7 saniye taşarsa
   hangisine güveneceğini bilemez. */

/* İşaretlerin durdurduğu toplam süre (saniye).
   `/` kısa, `//` uzun, `(2)` sayılı bekleme; nefes açıksa paragraf sonları.
   Değerler sufle motorundaki duraklama süreleriyle BİREBİR aynı olmalı,
   yoksa tahmin ile gerçek çekim ayrışır. */
function duraklamaSaniye(metin, nefes){
  let ms=0;
  for(const x of String(metin||'').split(/\s+/)){
    if(x==='//') ms+=800;
    else if(x==='/') ms+=350;
    else {
      const m=x.match(/^\((\d+(?:[.,]\d+)?)s?\)$/);
      if(m) ms+=Math.min(10000, Math.round(parseFloat(m[1].replace(',','.'))*1000));
    }
  }
  if(nefes){
    const sat=String(metin||'').split(/\r?\n/);
    for(let i=1;i<sat.length;i++) if(!sat[i].trim()) ms+=420;
  }
  return ms/1000;
}

/* Metnin tahmini süresi: okuma + duraklamalar. Hız sıfır/negatif gelirse
   (kumandadan düşebiliyor) anlamlı bir tabana çekiliyor — sıfıra bölmek
   Sonsuz üretir ve ekranda "~Infinity" yazardı. */
function tahminiSure(kelime, wpm, duraklama){
  const h=Math.max(20, +wpm||0);
  return (+kelime||0)/h*60 + (+duraklama||0);
}

/* HEDEFE SIĞDIRMA. Verilen süre içinde bitirmek için gereken WPM.
   Duraklamalar hedeften DÜŞÜLÜR: 60 saniyelik hedefte 12 saniye duraklama
   varsa metin 48 saniyede okunmalı. Bunu atlamak, kullanıcıya sığacak
   diyip çekimde taşırmak demektir.

   DÜRÜSTLÜK SINIRI: sığmıyorsa SESSİZCE KIRPMIYORUZ. Üç ayrı sebep var ve
   üçü de kullanıcıya farklı bir şey söyler:
     'duraklama' → yalnız işaretler hedefi dolduruyor, metni kısaltmak yetmez
     'hizli'     → gereken hız üst sınırın üstünde (okunamaz)
     'yavas'     → gereken hız alt sınırın altında (metin çok kısa)
   Her durumda `wpm` yine döner (sınıra çekilmiş hâliyle) ki arayüz isterse
   uygulayabilsin; ama `sigar` false ve `sebep` dolu olur. */
function gerekenWpm(kelime, hedefSn, duraklama, altSinir, ustSinir, adim){
  const k=+kelime||0, h=+hedefSn||0, d=+duraklama||0;
  const alt=+altSinir||40, ust=+ustSinir||320;
  const a=+adim>0 ? +adim : 1;
  if(k<=0 || h<=0) return null;
  const okumaSn = h - d;
  if(okumaSn <= 0)
    return {wpm:ust, sigar:false, sebep:'duraklama', okumaSn:0, gereken:null};
  const gereken = Math.round(k/okumaSn*60);
  /* KAYDIRICININ ADIMINA OTURT — ve YUKARI yuvarla.
     ÖLÇÜLDÜ (gerçek Chrome): hesap 79 WPM dedi, kaydırıcı 5lik adımlarla
     80e oturdu; yani mesaj 79 yazarken uygulanan 80 oluyordu — "ekranda
     yazan ile eldeki ayrışıyor" sınıfı. Yön de rastgele değil: daha DÜŞÜK
     hız metni UZATIR, yani hedefi aşar. Sığdırmanın işi budur, o yüzden
     yukarı yuvarlanıyor (biraz erken bitmek, taşmaktan iyidir). */
  const oturmus = Math.ceil(gereken/a)*a;
  const wpm = Math.max(alt, Math.min(ust, oturmus));
  if(gereken > ust) return {wpm, sigar:false, sebep:'hizli', okumaSn, gereken};
  if(gereken < alt) return {wpm, sigar:false, sebep:'yavas', okumaSn, gereken};
  return {wpm, sigar:true, sebep:null, okumaSn, gereken};
}
