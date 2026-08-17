/* Önizleme donma nöbetçisinin ORTAK PARÇASI — iki kabukta da aynı.

   NEDEN ÇEKİRDEKTE: nöbetçi önce telefona yazıldı, sonra parite kapısı
   masaüstünde de gerektiğini gösterdi ve kod birebir kopyalandı. Depo
   kuralı: iki kabukta AYNI olan şey tek kaynaktan gelir. Kopya sürüm,
   biri düzeltilip diğeri unutulduğunda sessizce ayrışır — bu depoda
   ölçülmüş bir hata sınıfı (Mac'in metin araçları aylarca geride kaldı).

   Kabuğa özgü olan burada DEĞİL: kayıt durumu, kurtarma merdiveninin son
   basamağı (telefonda openCam, masaüstünde stopCam+toggleCam) ve iOS'a
   özgü mikrofon bırakma. Onlar kabukta kalıyor. */

/* KARE İLERLİYOR MU. Safari `webkitDecodedFrameCount`, Chrome
   `getVideoPlaybackQuality` veriyor; ikisi de yoksa `currentTime` ilerlemesi
   ölçülüyor — MediaStream oynatılırken kare geldikçe artar, donunca durur. */
function onizKareSayisi(){
  if(cam.getVideoPlaybackQuality){
    const q=cam.getVideoPlaybackQuality();
    if(q && typeof q.totalVideoFrames==='number') return q.totalVideoFrames;
  }
  if(typeof cam.webkitDecodedFrameCount==='number') return cam.webkitDecodedFrameCount;
  return Math.round((cam.currentTime||0)*1000);
}
function onizIzleBaslat(){
  onizIzleDurdur();
  onizKare=onizKareSayisi(); onizZaman=Date.now(); onizAdim=0;
  onizT=setInterval(onizNabiz,2000);
}
function onizIzleDurdur(){ if(onizT){ clearInterval(onizT); onizT=null; } }
/* SESSİZ KAYIT — ELE ALINMIŞ DURUM İÇİN. `logErr` kullanıcıya genel bir
   hata uyarısı da gösteriyor (telefonda bildirim, masaüstünde durum şeridi
   rozeti). Uygulamanın fark edip toparladığı bir donmada bu, çökme olmuş
   gibi görünürdü. Kayıt aynı yere düşüyor — teşhis için şart — yalnız
   genel uyarı yok. */
function logNot(where,msg){
  ERRLOG.push({t:Date.now(),where,msg:(msg+'').slice(0,180)});
  if(ERRLOG.length>30) ERRLOG.shift();
  try{ localStorage.setItem(LS+'_err',JSON.stringify(ERRLOG.slice(-10))); }catch(_){}
}
