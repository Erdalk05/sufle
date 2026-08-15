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
