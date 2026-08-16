const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {macYolu, oku, cikar, REPO, repoOku, sunucuYolu}=require('./kaynak.js');

/* D.4 — UZAK ÖNİZLEME: telefon kumandasında kameranın gördüğü kare.

   NEDEN ÖNEMLİ: tek başına çekim yapanın en büyük acısı kadraja girip
   girmediğini görememek. Rakip analizinde "güçlü farklılaşma" diye geçen
   kalem buydu.

   NASIL: Mac kamera karesini 320 piksele küçültüp JPEG olarak KENDİ yerel
   sunucusuna gönderiyor; kumanda sayfası onu gösteriyor. Yeni bir altyapı
   kurulmadı — sunucu ve kumanda sayfası zaten vardı.

   Gerçek sunucudan uçtan uca doğrulandı:
     kare yokken /preview.jpg  -> 204 (telefon sessizce bekler)
     kare gönderilince        -> 200 ve içerik birebir
     yabancı Origin           -> 403
     400 KB üstü              -> 413 */

const mac = oku(macYolu());
const kod = (mac.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];
const srv = fs.readFileSync(require('./kaynak.js').sunucuYolu(),'utf8');

/* ---------- SUNUCU TARAFI ---------- */
{
  ok('sunucuda önizleme uç noktası var', /elif p\.path == "\/preview\.jpg":/.test(srv));
  ok('sunucuda kare alma uç noktası var', /elif p\.path == "\/preview":/.test(srv));
  /* Kare BELLEKTE: çekim görüntüsü diske yazılmamalı, uygulama kapanınca
     iz kalmamalı. Dosyaya yazsaydık kullanıcının makinesinde sessizce
     birikirdi. */
  ok('kare bellekte tutuluyor, diske yazılmıyor',
     /_onizleme = \{"jpg": None, "t": 0\}/.test(srv) && !/open\([^)]*preview/.test(srv));
  /* Kare yoksa 204: telefon "bozuk resim" ikonu göstermesin. 404 dönseydi
     tarayıcı konsolu hata basar, kullanıcı bir şeyin kırık olduğunu sanardı. */
  ok('kare yokken 204 dönüyor (bozuk resim değil)',
     /if not _onizleme\["jpg"\]:\s*\n\s*self\.send_response\(204\)/.test(srv));
  /* Aynı korumalar /cmd'de zaten vardı; önizleme onları devralmalı. */
  ok('yabancı kaynaktan gelen kare reddediliyor',
     /elif p\.path == "\/preview":\s*\n\s*if not self\._origin_tamam\(\):/.test(srv));
  ok('aşırı büyük kare reddediliyor (bellek şişmesin)', /if n > 400000:/.test(srv));
}

/* ---------- KUMANDA SAYFASI ---------- */
{
  const sayfa = cikar(srv, /REMOTE_PAGE = """[\s\S]*?"""/, 'REMOTE_PAGE');
  ok('kumanda sayfasında önizleme ögesi var', /id="prev"/.test(sayfa));
  /* GİZLİ başlıyor: kare gelmiyorsa boş kutu göstermek "bozuk" izlenimi
     verir. Ancak ilk kare ulaşınca görünür oluyor. */
  ok('önizleme gizli başlıyor', /id="prev"[^>]*display:none/.test(sayfa));
  ok('yalnız 200 gelince gösteriliyor', /if\(r\.status===200\)/.test(sayfa));
  /* SAYFA ARKA PLANDAYKEN DURMALI: kilitli telefonda saniyede bir istek
     atmak pili ve veriyi boşuna yakar. */
  ok('arka planda tazeleme duruyor', /if\(document\.hidden\|\|bekle\) return;/.test(sayfa));
  /* Üst üste binen istek olmasın: yavaş ağda kuyruk birikir. */
  ok('eşzamanlı istek engelli (bekle bayrağı)', /bekle=true;[\s\S]*?bekle=false;/.test(sayfa));
  /* Blob URL bırakılmazsa uzun oturumda bellek birikir. */
  ok('eski blob adresi serbest bırakılıyor', /revokeObjectURL\(im\.src\)/.test(sayfa));
}

/* ---------- MAC UYGULAMASI: GÖNDERİM ---------- */
{
  const f = cikar(kod, /function onizlemeBaslat\(\)\{[\s\S]*?\n  \}/, 'onizlemeBaslat');
  /* ÜÇ KOŞUL BİRDEN: ayar açık, kamera açık, sayfa sunucudan açılmış.
     file:// altında gönderilecek yer yok; kamera kapalıyken gönderilecek
     şey yok. Koşulsuz göndermek pil ve CPU yakardı. */
  ok('ayar kapalıysa hiç başlamıyor', /if\(!state\.uzakOnizleme \|\| !location\.protocol\.startsWith\('http'\)\) return;/.test(f));
  ok('kamera kapalıyken kare gönderilmiyor', /if\(!stream \|\| document\.hidden\) return;/.test(f));
  ok('kamera açılınca gönderim başlıyor', /onizlemeBaslat\(\);   \/\/ kamera açıldı/.test(kod));
  ok('anahtar gönderimi açıp kapatıyor',
     /if\(k==='uzakOnizleme'\)\{ state\.uzakOnizleme\?onizlemeBaslat\(\):onizlemeDurdur\(\); \}/.test(kod));
  /* 320 piksel kadraj kontrolü için yeter; büyük kare LAN'ı ve pili yorar. */
  ok('kare 320 piksele küçültülüyor', /onizlemeTuval\.width=320/.test(f));
  ok('JPEG ve düşük kalite kullanılıyor', /toBlob\(r,'image\/jpeg',0\.5\)/.test(f));
}

/* ---------- GİZLİLİK: KULLANICI KARAR VERİYOR ---------- */
{
  /* Çekim görüntüsü söz konusu: sessiz varsayılan olmaz. */
  ok('varsayılan KAPALI', /uzakOnizleme:false/.test(mac));
  ok('anahtar arayüzde ve sözlüğe bağlı',
     /data-i18n="mPrevOn"[\s\S]{0,120}data-t="uzakOnizleme"/.test(mac));
  /* Kullanıcı ne olduğunu bilmeli: nereye gittiği ve diske yazılmadığı
     açıkça yazılı — jargon değil, düz cümle. */
  ok('nereye gittiği açıkça yazılı', /data-i18n="mPrevHint"/.test(mac));
  const soz = repoOku('cekirdek/sozluk.js','SUFLE_SOZLUK');
  ok('açıklama gizlilik sözü veriyor (kendi ağın, diske yazılmaz)',
     /kendi makinenden ve ağından çıkmaz, diske hiç yazılmaz/.test(soz));
}
