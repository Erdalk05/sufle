const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, macYolu, oku}=require('./kaynak.js');

/* A.0 — İKİ KABUK DA file:// ALTINDA AÇILABİLİR KALSIN.
   ("Tek çekirdek" işine başlamadan önce konan sınır.)

   ÖLÇÜLDÜ, varsayılmadı (2026-08-14, Chrome headless, aynı çekirdek iki
   biçimde, file:// üzerinden):

     <script type="module"> + import  ->  metin BASLANGIC'ta kaldı: YÜKLENMEDİ
     <script src> klasik              ->  CEKIRDEK-YUKLENDI: çalıştı

   Modül file:// altında CORS yüzünden reddediliyor ve bunu SESSİZCE yapıyor:
   konsolda kullanıcının görmediği bir satır, ekranda ise boş uygulama. Bu
   deponun 2 numaralı tekrarlayan hata sınıfı — "tam da gerektiği anda
   sessizce çalışmayan özellik".

   NEDEN ÖNEMLİ: Mac kullanıcısı HTML'e ÇİFT TIKLADIĞINDA adres file:// olur.
   Hafızadaki "kumanda yok sanıldı" vakası da tam buydu. Bugün iki kabuk da
   klasik betik kullanıyor (ölçüldü: type=module sayısı 0/0) ve öyle kalmalı.
   Çekirdek ayrımı GÖMEREK yapılacak, modül bağlayarak değil.

   Bu test ayrıca "sıfır bağımlılık" sözünü koruyor: dış kaynak (CDN font,
   betik, stil) file:// ve çevrimdışı altında da ölür, üstelik gizlilik
   iddiasını da bozar. Bugün 0 dış kaynak var. */

for (const [ad, yol] of [['telefon', telefonYolu()], ['Mac', macYolu()]]) {
  const s = oku(yol);

  /* İddia BİÇİME değil DAVRANIŞA bağlı: "modül betiği yok". Nasıl yazıldığı
     (tek/çift tırnak, boşluk) önemli değil, olmaması önemli. */
  const modul = [...s.matchAll(/<script\b[^>]*\btype\s*=\s*["']?module["']?/gi)];
  ok(ad+': modül betiği yok (file:// altında sessizce ölür) — bulunan: '+modul.length,
     modul.length === 0);

  /* import/export yalnız modülde geçerli; klasik betikte SyntaxError verip
     O BLOĞUN TAMAMINI öldürür. Dize içindeki "import" kelimesi eşleşmesin
     diye satır başına demirlendi. */
  const ie = [...s.matchAll(/^\s*(?:import|export)\s+[\w{*]/gm)];
  ok(ad+': satır başında import/export yok — bulunan: '+ie.length, ie.length === 0);

  /* Dış kaynak: ağ yoksa, çevrimdışıysa ya da file:// ise gelmez.
     ÖLÇÜT YÜKLENEN KAYNAK, geçen adres değil. F.6'da SEO için eklenen
     `<link rel="canonical" href="https://...">` bu deseni tetikledi; oysa
     canonical bir ÜSTVERİ İŞARETÇİSİ, tarayıcı onu indirmez, çevrimdışını
     da file:// altında açılmayı da bozmaz. Aynısı og:image ve twitter:image
     için de geçerli — onlar `content=` taşıyor ve yalnız paylaşım
     önizlemesinde, paylaşan platform tarafından okunuyor.
     Gerçekten yüklenen şeyler kilitli kalıyor: her `src=`, ve `<link>`
     etiketlerinde YÜKLEYEN rel değerleri (stylesheet/preload/prefetch/icon). */
  const disSrc = [...s.matchAll(/\bsrc\s*=\s*["']https?:\/\/[^"']+/gi)];
  const disLink = [...s.matchAll(/<link\b[^>]*>/gi)]
    .filter(m => /href\s*=\s*["']https?:\/\//i.test(m[0])
              && /rel\s*=\s*["'](?:stylesheet|preload|prefetch|icon|apple-touch-icon|manifest)/i.test(m[0]));
  const dis = [...disSrc, ...disLink];
  ok(ad+': dışarıdan YÜKLENEN kaynak yok — bulunan: '+dis.length, dis.length === 0);

  /* Sözün kanıtı: kabukta gerçekten çalışan bir betik VAR. Yukarıdaki üç
     iddia boş bir dosyada da geçerdi; bu dördüncüsü onu ayırt ediyor. */
  ok(ad+': kabukta klasik betik bloğu var', /<script(?![^>]*\btype\s*=)/i.test(s));
}
