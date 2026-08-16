const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu, macYolu, oku, cikar, REPO, repoOku}=require('./kaynak.js');

/* D.1 — .docx İÇE AKTARMA, SIFIR BAĞIMLILIKLA.

   KARAR ÖLÇÜMLE VERİLDİ: mammoth.js ~150 KB ve "tek dosya, sıfır bağımlılık"
   sözünü bozardı (disleksi fontunda ve ffmpeg.wasm'de verilen aynı karar).
   Gerek de yokmuş: .docx bir ZIP, içindeki word/document.xml düz XML ve
   açma işini tarayıcının YERLEŞİK DecompressionStream'i yapıyor.

   Gerçek uygulamada uçtan uca doğrulandı (Chrome): 719 baytlık bir .docx
   içe alındı, senaryo 1 → 2, başlık dosya adından geldi, Türkçe karakterler
   (ğüşıöç ĞÜŞİÖÇ) bozulmadı, satır sonu korundu, kalın parça metne kaynadı.

   PDF BİLEREK YOK: doğru bir PDF metin çıkarıcısı font kodlamaları, CID
   eşlemeleri ve sıkıştırılmış akışlar yüzünden binlerce satır ve yine de
   çoğu dosyada yanlış sonuç verir. Kullanıcıya dürüst yol SÖYLENİYOR. */

const tel = oku(telefonYolu());
const mac = oku(macYolu());
const kodTel = (tel.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];
const kodMac = (mac.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];
/* Bozma turu çekirdeği geçici kopyada bozup yolu SUFLE_DOCX ile veriyor.
   Bu satır olmadan test HER ZAMAN depodaki sağlam dosyayı okur ve bozma
   ölçülmez — SUFLE_JETON ve SUFLE_SOZLUK'ta aynı hatayı iki kez yaptım. */
const cekYolu = (() => {
  const v = process.env.SUFLE_DOCX;
  if (v && !fs.existsSync(v))
    throw new Error('Verilen yol yok: ' + v + ' (SUFLE_DOCX) — bozma hiçbir şey ölçmez.');
  return v || path.join(REPO,'cekirdek','docx.js');
})();
const cek = fs.readFileSync(cekYolu,'utf8');

/* ---------- ÇEKİRDEK TEK KAYNAK MI ---------- */
{
  ok('docx okuyucu çekirdekte', /async function docxMetni\(dosya\)\{/.test(cek));
  ok('iki kabuğa da gömülü',
     /async function docxMetni\(dosya\)\{/.test(kodTel) && /async function docxMetni\(dosya\)\{/.test(kodMac));
  /* Dış kütüphane YOK: bu iddia kararın kendisini kilitliyor. */
  /* Kütüphane ARANIRKEN yorumlar ayıklanmalı: ilk yazımda desen kendi
     açıklama yorumumdaki "mammoth" kelimesine takıldı ve kod temizken
     kırmızı verdi. Aranan şey YÜKLENEN kütüphane, geçen kelime değil. */
  const kutuphaneVar = (x) => {
    const temiz = x.replace(/\/\*[\s\S]*?\*\//g,'').replace(/<!--[\s\S]*?-->/g,'');
    return /<script[^>]+src=|\brequire\(|\bimport\s+.*\bfrom\b/.test(temiz);
  };
  ok('dışarıdan yüklenen kütüphane yok', !kutuphaneVar(tel) && !kutuphaneVar(mac));
  ok('açma işi tarayıcının yerleşik API\'siyle', /new DecompressionStream\('deflate-raw'\)/.test(cek));
}

/* ---------- ZIP OKUYUCU DOĞRU MU ---------- */
{
  /* Bu dört ayrıntının her biri, yanlış yapılırsa dosyayı sessizce bozar. */
  ok('ZIP sonu kaydı SONDAN aranıyor (dosya yorumu olabilir)',
     /for\(let i=bin\.length-22;i>=0 && i>bin\.length-65558;i--\)/.test(cek));
  ok('merkezi dizin imzası doğrulanıyor', /0x02014b50/.test(cek));
  /* Veri konumu YEREL başlıktan okunmalı: merkezi dizindeki ek alan
     uzunluğu yerel başlıkla aynı olmak ZORUNDA DEĞİL. Karıştırmak dosyayı
     birkaç bayt kaydırır ve açma patlar. */
  ok('veri konumu YEREL başlıktan okunuyor',
     /const ln=dv\.getUint16\(hedef\.yerel\+26,true\), le=dv\.getUint16\(hedef\.yerel\+28,true\)/.test(cek));
  ok('sıkıştırmasız (yöntem 0) dosya da okunuyor', /if\(hedef\.yontem===0\)/.test(cek));
  ok('bilinmeyen sıkıştırma sessizce geçilmiyor', /throw new Error\('bilinmeyen sikistirma'\)/.test(cek));
  /* document.xml yoksa SESSİZCE devam etmek en kötüsü: kullanıcı boş bir
     senaryo alır ve dosyasının bozuk olduğunu sanır. Zip geçerli olabilir
     ama içinde Word belgesi olmayabilir (ör. .xlsx uzantısı değiştirilmiş). */
  ok('Word belgesi yoksa açıkça hata veriliyor', /throw new Error\('document.xml yok'\)/.test(cek));
  ok('zip değilse açıkça hata veriliyor', /throw new Error\('zip degil'\)/.test(cek));
}

/* ---------- METİN DOĞRU ÇIKARILIYOR MU ---------- */
{
  /* İlk ölçümde yalnız w:t toplanmıştı ve "Satır" + "sonrası" birleşip
     "Satırsonrası" çıkmıştı. Sıra korunarak gezilmesi bu yüzden şart. */
  ok('w:br satır sonuna çevriliyor', cek.includes("ad==='br') s+='\\n'"));
  ok('w:tab boşluğa çevriliyor', /ad==='tab'\) s\+=' '/.test(cek));
  ok('iç içe ögeler de geziliyor (sıra korunuyor)', /else gez\(c\)/.test(cek));
  ok('bozuk XML yakalanıyor', /parsererror/.test(cek));
  ok('aşırı boş satır sadeleştiriliyor', cek.includes('\\n{3,}'));
}

/* ---------- KULLANICIYA DOĞRU ŞEY SÖYLENİYOR MU ---------- */
{
  /* .docx AYRI YOL: readAsText bir zip'i metin sanıp ikili çöp üretir ve
     kullanıcı "içe aktardım ama saçma çıktı" der. */
  ok('telefon: .docx ayrı yolda işleniyor', /if\(\/\\\.docx\$\/i\.test\(f\.name\)\)\{/.test(kodTel));
  ok('Mac: .docx ayrı yolda işleniyor', /if\(\/\\\.docx\$\/i\.test\(f\.name\)\)\{/.test(kodMac));
  ok('telefon: okunamayan dosya açıkça bildiriliyor', /toast\(m\('docxBad'\)\)/.test(kodTel));
  ok('telefon: hata günlüğe yazılıyor', /logErr\('docx',err\)/.test(kodTel));
  ok('Mac: hata günlüğe yazılıyor', /logErr\('docx',err\)/.test(kodMac));
  ok('dosya seçicide .docx kabul ediliyor',
     /accept="[^"]*\.docx/.test(tel) && /accept="[^"]*\.docx/.test(mac));
  /* PDF için dürüst yol SÖYLENİYOR — sessizce desteklememek, kullanıcıyı
     "neden olmuyor" diye aratır. */
  ok('PDF için dürüst yol yazılı (kopyala-yapıştır)',
     /PDF için: dosyayı aç, metni kopyala, Yapıştır ile getir/.test(tel));
  /* İçe aktarma mesajı EYLEMİ anlatmalı. Eskiden 'Geri yüklendi' diyordu:
     kullanıcı dosya aldı, hiçbir şey geri yüklemedi — iki dilde de yanlıştı. */
  ok('içe aktarma mesajı doğru eylemi söylüyor',
     /imported:'📄 Dosyadan alındı'/.test(repoOku('cekirdek/mesajlar.js','SUFLE_MESAJ')));
}
