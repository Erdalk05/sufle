/* KUMANDA TUŞ EŞLEMESİ — ORTAK ÇEKİRDEK.

   İki kabuk da aynı soruyu soruyor: "bu tuş hangi eylemi çalıştırır?" Cevabın
   kuralları (geçerli eylem nedir, tuş nasıl yazılır, öğrenilen eşleme
   varsayılanın üstüne nasıl biner) tek yerde durmalı. Kopyalansaydı biri
   düzeltilip diğeri unutulurdu — bu deponun en pahalı hata sınıfı.

   VARSAYILAN EŞLEME KABUĞA ÖZELDİR ve burada DEĞİL: telefonda `lock`
   (ekran kilidi) diye bir eylem var, Mac'te yok; Mac'te `mirror` ve
   `fullscreen` var, telefonda yok. Ortak olan kurallar, liste değil.

   `EYLEMLER` her iki kabuğun eylem kimliklerinin BİRLEŞİMİ. Kabuk kendi
   sözlüğünde olmayan bir kimliği zaten çalıştıramaz (tabloda karşılığı yok),
   ama profil dosyası bir kabuktan diğerine taşınabildiği için doğrulama
   birleşim üzerinden yapılıyor: bilinmeyen kimlik reddedilir, bilinen ama o
   kabukta karşılığı olmayan kimlik sessizce yok sayılır. */

const KUMANDA_EYLEMLERI = new Set([
  'toggle',     // başlat / duraklat
  'nextLine',   // sonraki satır
  'prevLine',   // önceki satır
  'faster',     // hızlan
  'slower',     // yavaşla
  'rec',        // kayıt başlat / durdur
  'reset',      // başa dön
  'lock',       // ekranı kilitle (telefon)
  'mirror',     // ayna (Mac)
  'fullscreen', // tam ekran (Mac)
  'none',       // bilerek boş: tuşu ETKİSİZLEŞTİRMEK de bir seçim
]);

/* Kullanıcı "Boşluk"a bastığını görmeli; ekranda boş bir hücre "tuş gelmedi"
   gibi okunur ve şikâyetin yarısı bu geri bildirimin yokluğundan çıkıyor. */
function tusEtiketi(k, dil){
  if (k === ' ') return dil === 'en' ? 'Space' : 'Boşluk';
  return k;
}

/* Öğrenilen eşleme varsayılanın ÜSTÜNE biner. Kopya döner: çağıran taraf
   sonucu değiştirirse varsayılan tablo bozulmasın (telefonda tam bu yüzden
   `Object.assign({},...)` kullanılıyordu). */
function tusEslemesi(varsayilan, ogrenilen){
  return Object.assign({}, varsayilan || {}, ogrenilen || {});
}

/* Dışarıdan gelen eşleme (profil dosyası, eski kayıt) GÜVENİLMEZ: bilinmeyen
   eylem kimliği taşıyan girdi sessizce çalışmayan bir tuş üretir. Süzülüyor. */
function tusEslemesiSuz(ham){
  const temiz = {};
  if (!ham || typeof ham !== 'object') return temiz;
  for (const k of Object.keys(ham)) {
    if (typeof k !== 'string' || !k) continue;
    const a = ham[k];
    if (typeof a === 'string' && KUMANDA_EYLEMLERI.has(a)) temiz[k] = a;
  }
  return temiz;
}

/* KUMANDA BAĞLANTI YOLLARI (G.14).

   Rakip (teleprompter.com) bağlantıyı kendi seçiyor: internet yoksa
   Bluetooth, aynı Wi-Fi'daysa yerel ağ, uzaktaysa internet. Bizde üç yolun
   ikisi var ve üçüncüsü mimari olarak yok. ÖNEMLİ OLAN, KULLANICININ
   HANGİSİNİN NEDEN OLMADIĞINI GÖRMESİ: "kumanda çalışmıyor" şikâyetinin
   yarısı, çalışmayan yolun sebebini hiçbir yerde yazmamaktan geliyor.

   Bu depoda ölçülmüş iki gerçek:
   · Ucuz kumandalar Ses Aç/Kıs tuşu gönderir; iOS ve Android bu tuşları
     tarayıcıya HİÇ vermez — uygulamanın yapabileceği bir şey yok.
   · Telefon bir yerel sunucu ÇALIŞTIRAMAZ (tarayıcı sekmesi dinleyemez),
     yani "ikinci cihazı kumanda yap" yolu yalnız masaüstünde var.

   Dönüş: her yol için {yol, durum:'var'|'yok'|'kapali', sebep} — sebep
   anahtarı arayüzde çevrilmiş metne dönüşür. `null` sebep yalnız durum
   'var' iken olur. */
function kumandaYollari(kabuk, durum){
  const d=durum||{};
  const mac = kabuk==='mac';
  const yollar=[];
  /* 1) Bluetooth / klavye: iki kabukta da var. Tuş gelmiyorsa sebebi
        panelin canlı tanısı söylüyor (ayrı mekanizma). */
  yollar.push({yol:'bt', durum:'var', sebep:null});
  /* 2) Yerel ağ (ikinci cihaz kumanda): sunucu gerektiriyor. */
  if(!mac) yollar.push({yol:'lan', durum:'yok', sebep:'telefonSunucuYok'});
  else if(d.sunucu) yollar.push({yol:'lan', durum:'var', sebep:null});
  else yollar.push({yol:'lan', durum:'kapali', sebep:'sunucuKapali'});
  /* 3) İnternet üzerinden: bizim sunucumuz yok ve olmayacak — veri
        cihazdan çıkmıyor sözü tam da bu. Bu bir eksik değil, bir KARAR. */
  yollar.push({yol:'internet', durum:'yok', sebep:'sunucuYok'});
  return yollar;
}
