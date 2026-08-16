const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu, oku, REPO, repoOku}=require('./kaynak.js');

/* F.5 — FİYATLANDIRMA ZEMİNİ.

   Yol haritası "bedava = 1080p + filigran · ücretli = 4K + filigransız +
   altyazı + bulut" diyordu ve bu ÖLÇÜLMEDEN yazılmıştı. Ölçünce üç sorunu
   çıktı (`FIYATLANDIRMA.md`):

     ① 4K, altyazı ve filigransızlık ZATEN ÜCRETSİZ ve yayında — öneri onları
        kullanıcıdan GERİ ALIYOR.
     ② İstemci tarafı ödeme duvarı UYGULANAMAZ: hesap yok, sunucu yok, dosya
        herkese açık. Bayrağı çevirmekle aşılır.
     ③ "Ücretsiz" bugün on yerde yazılı bir PAZARLAMA VARLIĞI.

   Bu dosya belgenin iddialarını KODA bağlıyor. Bir gün 4K ya da altyazı
   paraya bağlanırsa belge yalan söylemeye başlar — kapı önce kırılır. */

const tel = oku(telefonYolu());
const belgeYol = (() => {
  const v = process.env.SUFLE_FIYAT;
  if (v && !fs.existsSync(v)) throw new Error('Verilen yol yok: ' + v);
  return v || path.join(REPO, 'FIYATLANDIRMA.md');
})();
ok('fiyatlandırma ölçümü depoda', fs.existsSync(belgeYol));
const bel = fs.readFileSync(belgeYol, 'utf8').replace(/\s+/g, ' ');

/* ---------- ① BELGENİN "ZATEN ÜCRETSİZ" LİSTESİ DOĞRU MU ---------- */
{
  /* Belge bunları "bugün ücretsiz" diye sayıyor. Biri koddan kalkarsa ya da
     paraya bağlanırsa belge yalan söyler. */
  const UCRETSIZ = {
    '4K kayıt': /data-q="4k"/,
    'altyazı üretimi': /function srtText\(\)/,
    'yayın paketi': /id="pkgBtn"/,
    'video budama': /function openTrim\(\)/,
    'dosyaya yedekleme': /id="bkExport"/,
    'sesle takip': /SpeechRecognition/,
    'uzaktan kumanda': /id="remoteBtn"/,
    'docx içe aktarma': /docxMetni/,
    'prova raporu': /provaRapor\(/,
    'zorlanma haritası': /id="diffBtn"/,
  };
  for (const ad in UCRETSIZ)
    ok('belgenin "ücretsiz" dediği özellik kodda var: ' + ad, UCRETSIZ[ad].test(tel));

  /* Hiçbiri bir ödeme/plan koşuluna bağlı OLMAMALI — belgenin ana iddiası bu. */
  const temiz = tel.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  ok('kodda ödeme duvarı yok', !/paywall|isPremium|isPro\b|planKontrol/i.test(temiz));
  ok('kodda abonelik/satın alma yok', !/subscription|in-app purchase|satınAl/i.test(temiz));
}

/* ---------- ② FİLİGRAN EKLENMEDİ ---------- */
{
  /* Belge "filigran EKLENMESİN" diyor çünkü bugün yok; eklemek var olan
     çıktıyı KÖTÜLEŞTİRMEK olur. */
  const temiz = tel.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  ok('videoya filigran basan kod yok', !/filigran|watermark/i.test(temiz));
  ok('belge filigran eklenmemesini gerekçesiyle yazıyor',
     /Filigran EKLENMESİN/.test(bel) && /bugün yok/i.test(bel));
}

/* ---------- ③ UYGULANAMAZLIK GEREKÇESİ HÂLÂ DOĞRU MU ---------- */
{
  /* Belgenin en önemli çıkarımı: istemci tarafı ödeme duvarı uygulanamaz,
     çünkü hesap yok + sunucu yok + kaynak herkese açık. Bu üçü değişirse
     çıkarım da değişir; o yüzden kilitleniyor. */
  const temiz = tel.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  ok('hesap/giriş yok', !/signIn|signin|createAccount|oturum aç/i.test(temiz));
  ok('bize ait sunucuya çağrı yok', !/fetch\(['"]https?:\/\//.test(temiz));
  ok('belge uygulanamazlık gerekçesini yazıyor',
     /UYGULANAMAZ/.test(bel) && /herkese açık/.test(bel));
  ok('belge mimarinin fiyatı belirlediğini söylüyor',
     /fiyat modelini pazarlama değil \*\*mimari\*\* belirliyor|mimari.{0,30}belirliyor/i.test(bel));
}

/* ---------- ④ "ÜCRETSİZ" SÖZÜ HÂLÂ TUTULUYOR ---------- */
{
  /* Belge "on yerde ücretsiz yazıyor ve kapı kilitliyor" diyor. Sayı burada
     ölçülüyor ki belge kendi kendine bayatlamasın. */
  const vitrin = repoOku('tanitim.html','SUFLE_VITRIN');
  const magaza = repoOku('MAGAZA.md','SUFLE_MAGAZA');
  const kac = (tel.match(/Ücretsiz|"price":"0"/g) || []).length
            + (vitrin.match(/[Üü]cretsiz|free|"price":"0"/g) || []).length
            + (magaza.match(/ücretsiz|free/gi) || []).length;
  ok('"ücretsiz" sözü hâlâ çok yerde yazılı — ' + kac, kac >= 8);
  ok('JSON-LD fiyatı 0 (uygulama)', /"price":"0"/.test(tel));
  ok('JSON-LD fiyatı 0 (vitrin)', /"price":"0"/.test(vitrin));
}

/* ---------- ⑤ BELGE KARAR VERMİYOR, ZEMİN ÖLÇÜYOR ---------- */
{
  /* Fiyat kararı Erdal'ın; belge onun yerine karar verirse "ölçtüm" ile
     "seçtim" karışır. Belge bunu açıkça söylemeli. */
  ok('belge kararın Erdalda olduğunu söylüyor', /karar Erdal'ın/i.test(bel));
  ok('belge kendi sınırını yazıyor (karar vermiyor)',
     /karar \*\*vermiyor\*\*|kararın zeminini ölçüyor/i.test(bel));
  /* Kararın tek soruya indiği yazılı olmalı — asıl katkı bu. */
  ok('karar tek soruya indirgenmiş (sunucu işletmek mi?)',
     /sunucu işletmek istiyor muyuz/i.test(bel));
}
