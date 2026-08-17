const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const zlib=require('zlib');
const {telefonYolu,oku,macYolu,repoOku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* PDF OKUYUCU (2026-08-17) — "OKUYAMIYORSAM METİN VERMEM" KURALI.

   Depo bugüne dek PDF'i BİLEREK dışarıda tutuyordu ve gerekçesi doğruydu:
   genel bir PDF metin çıkarıcısı font kodlamaları ve CID eşlemeleri yüzünden
   çoğu dosyada YANLIŞ metin üretir. Bir suflede yanlış metin, metin
   olmamasından kötüdür — kullanıcı ancak okurken fark eder ve çekim gider.

   Bu okuyucu o gerekçeyi çürütmüyor, KABUL EDİYOR: her dosyada çalışmaya
   çalışmıyor, okuduğundan emin olamadığı anda REDDEDİYOR. Testin işi tam da
   bu sınırı kilitlemek — hem okuduğunu doğru okuduğunu, hem de okuyamadığında
   SESSİZCE çöp metin üretmediğini.

   PDF'ler burada ELDE üretiliyor: gerçek dosya yok, davranış var. */

/* KAYNAK ÇEKİRDEKTEN OKUNUYOR (env destekli): kasıtlı bozma turu
   `cekirdek/pdf.js`i geçici kopyada bozuyor; gömülü çıktıdan okuyan bir test
   o bozmayı HİÇ göremez ve kural ölçülmemiş kalır (tests/115'in kilitlediği
   kural). İlk yazımda tam bu hataya düştüm: beş bozma "yakalanmadı" dedi. */
const cekirdek=repoOku('cekirdek/pdf.js','SUFLE_PDF').replace(/\/\*[\s\S]*?\*\//g,'');
const mOku=cekirdek.match(/async function pdfMetni\(dosya\)\{[\s\S]*?\n\}/);
ok('pdfMetni çıkarılabildi', !!mOku);
const yardimcilar=['pdfSis','pdfDizeCoz','pdfCMap','pdfNesneler','pdfIcerikMetni'];
for(const f of yardimcilar)
  ok(f+' çıkarılabildi', new RegExp('function '+f+'\\(').test(cekirdek));
if(!mOku) return;

/* ---------- PDF ÜRETİCİ (test tezgâhı) ---------- */
function pdfKur({icerik, fontSozluk='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
                 toUnicode=null, sifreli=false, sikistir=true}){
  const parcalar=[]; const ofs=[]; let cikti='%PDF-1.4\n';
  const ekle=(no, govde)=>{ ofs[no]=cikti.length; cikti+=no+' 0 obj\n'+govde+'\nendobj\n'; };
  const akis=(veri)=>{
    const bayt=Buffer.from(veri,'latin1');
    const g=sikistir? zlib.deflateSync(bayt) : bayt;
    return '<< /Length '+g.length+(sikistir?' /Filter /FlateDecode':'')+' >>\nstream\n'
      + g.toString('latin1') + '\nendstream';
  };
  ekle(1, '<< /Type /Catalog /Pages 2 0 R'+(sifreli?' /Encrypt 9 0 R':'')+' >>');
  ekle(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  ekle(3, '<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>');
  ekle(4, akis(icerik));
  ekle(5, toUnicode ? fontSozluk.replace('>>', '/ToUnicode 6 0 R >>') : fontSozluk);
  if(toUnicode) ekle(6, akis(toUnicode));
  cikti+='trailer\n<< /Root 1 0 R >>\n%%EOF\n';
  return Buffer.from(cikti,'latin1');
}

/* Sahte File nesnesi: okuyucu yalnız arrayBuffer() kullanıyor. */
const dosyaYap=(buf)=>({ name:'deneme.pdf',
  arrayBuffer: async()=> buf.buffer.slice(buf.byteOffset, buf.byteOffset+buf.byteLength) });

/* Yardımcılar KAYNAKTAN çıkarılıp koşturuluyor — kopya mantık yok.
   Çıkarma şablon dizesinin DIŞINDA yapılıyor: içeride kaçış üstüne kaçış
   yazmak ilk denemede regex'i bozdu ("Unterminated group"). */
const govde = yardimcilar
  .map(ad => {
    const m = cekirdek.match(new RegExp('(?:async )?function ' + ad + '\\([\\s\\S]*?\\n\\}'));
    if (!m) throw new Error('kaynakta bulunamadı: ' + ad);
    return m[0];
  })
  .concat([cekirdek.match(/const PDF_WINANSI=\{[\s\S]*?\};/)[0], mOku[0]])
  .join('\n');

async function calistir(buf){
  const f=new Function('__dosya', govde + '\nreturn pdfMetni(__dosya);');
  return f(dosyaYap(buf));
}

(async () => {
  /* ---------- 1) BASİT METİN OKUNUYOR ---------- */
  {
    const icerik='BT /F1 12 Tf 72 720 Td (Merhaba dunya, bu bir sufle metnidir.) Tj ET';
    const metin=await calistir(pdfKur({icerik}));
    ok('düz metin PDF okunuyor: '+JSON.stringify(metin.slice(0,40)),
       /Merhaba dunya, bu bir sufle metnidir\./.test(metin));
  }

  /* ---------- 2) SATIRLAR KORUNUYOR ---------- */
  {
    const icerik='BT /F1 12 Tf 72 720 Td (Birinci satir) Tj 0 -14 Td (Ikinci satir) Tj ET';
    const metin=await calistir(pdfKur({icerik}));
    ok('ayrı satırlar ayrı kalıyor',
       /Birinci satir/.test(metin) && /Ikinci satir/.test(metin) &&
       metin.indexOf('Ikinci') > metin.indexOf('Birinci') &&
       /\n/.test(metin));
  }

  /* ---------- 3) TÜRKÇE HARFLER (WinAnsi dışı) ---------- */
  {
    /* WinAnsi'de ş/ğ/İ yok; doğru yol ToUnicode eşlemesidir. Eşleme VARSA
       okunmalı — Türkçe senaryoların çoğu böyle. */
    const tu=['/CIDInit /ProcSet findresource begin 12 dict begin begincmap',
      '1 begincodespacerange <00> <ff> endcodespacerange',
      '3 beginbfchar','<41> <0130>','<42> <015F>','<43> <011F>','endbfchar',
      'endcmap CMapName currentdict /CMap defineresource pop end end'].join('\n');
    const icerik='BT /F1 12 Tf 72 720 Td (ABC) Tj ET';
    const metin=await calistir(pdfKur({icerik, toUnicode:tu}));
    ok('ToUnicode eşlemesiyle Türkçe harfler doğru geliyor: '+JSON.stringify(metin),
       metin.includes('İşğ'.replace('ğ','ğ')) || metin.includes('İşğ'));
  }

  /* ---------- 4) TARANMIŞ PDF: METİN YOK → REDDET ---------- */
  {
    const icerik='q 612 0 0 792 0 0 cm /Im1 Do Q';   // yalnız görüntü çizimi
    let hata=null, metin=null;
    try{ metin=await calistir(pdfKur({icerik})); }catch(e){ hata=e.message; }
    ok('taranmış (metinsiz) PDF metin ÜRETMİYOR', metin===null);
    ok('sebebi "metin yok" diye bildiriliyor', /metin yok/.test(hata||''));
  }

  /* ---------- 5) CID YAZI TİPİ EŞLEMESİZ → REDDET (asıl kural) ---------- */
  {
    const icerik='BT /F1 12 Tf 72 720 Td <00480065006C006C006F> Tj ET';
    let hata=null, metin=null;
    try{ metin=await calistir(pdfKur({icerik,
      fontSozluk:'<< /Type /Font /Subtype /Type0 /BaseFont /Arial /Encoding /Identity-H >>'})); }
    catch(e){ hata=e.message; }
    ok('eşlemesiz CID yazı tipinde metin ÜRETİLMİYOR (çöp metin yerine ret)', metin===null);
    ok('sebebi eşleme yokluğu diye bildiriliyor', /cid esleme yok/.test(hata||''));
  }

  /* ---------- 6) ŞİFRELİ PDF → REDDET ---------- */
  {
    let hata=null, metin=null;
    try{ metin=await calistir(pdfKur({icerik:'BT /F1 12 Tf (x) Tj ET', sifreli:true})); }
    catch(e){ hata=e.message; }
    ok('şifreli PDF okunmaya kalkışılmıyor', metin===null && /sifreli/.test(hata||''));
  }

  /* ---------- 7) SIKIŞTIRILMAMIŞ AKIŞ DA OKUNUYOR ---------- */
  {
    const metin=await calistir(pdfKur({
      icerik:'BT /F1 12 Tf 72 720 Td (Sikistirilmamis akis) Tj ET', sikistir:false}));
    ok('sıkıştırılmamış içerik akışı da okunuyor', /Sikistirilmamis akis/.test(metin));
  }

  /* ---------- 8) PDF OLMAYAN DOSYA ---------- */
  {
    let hata=null;
    try{ await calistir(Buffer.from('bu bir pdf degil','latin1')); }catch(e){ hata=e.message; }
    ok('PDF olmayan dosya reddediliyor', /pdf degil/.test(hata||''));
  }

  /* ---------- 8b) YARISI EŞLENEMEYEN METİN → REDDET ----------
     Kasıtlı bozma turunda çıktı: kabul eşiğini (%8) sökünce testlerin hiçbiri
     kırılmıyordu, yani eşik ÖLÇÜLMÜYORDU. Buradaki PDF'in yazı tipi eşlemesi
     yalnız TEK karakteri tanıyor; kalanı okunamıyor. Böyle bir dosyada metin
     vermek, kullanıcıya çöp sufle vermektir. */
  {
    const tu=['begincmap','1 beginbfchar','<41> <0041>','endbfchar','endcmap'].join('\n');
    const icerik='BT /F1 12 Tf 72 720 Td (ABCDEFGHIJKLMNOP) Tj ET';
    let hata=null, metin=null;
    try{ metin=await calistir(pdfKur({icerik, toUnicode:tu})); }catch(e){ hata=e.message; }
    ok('karakterlerin çoğu eşlenemiyorsa metin ÜRETİLMİYOR', metin===null);
    ok('sebebi "belirsiz" diye bildiriliyor', /belirsiz/.test(hata||''));
  }

  /* ---------- 8b-2) EŞİĞİN KENDİSİ ÖLÇÜLÜYOR ----------
     Üstteki durumda karakterlerin %94'ü okunamıyor ve harf oranı da düşük;
     yani iki koruma birden devrede. Kasıtlı bozma turu bunu gösterdi: %8
     eşiğini söktüğümde test yine geçiyordu, çünkü onu HARF ORANI yakalıyordu.
     Eşiği ölçmek için aradaki bölge gerekiyor: %15 okunamayan, harf oranı
     yüksek bir metin. Orayı yalnız eşik reddedebilir. */
  {
    const harfler='ABCDEFGHIJKLMNOPQRST';                  // 20 karakter
    const eslenen=harfler.slice(0,17).split('');           // 17'si eşlenmiş → %15 eksik
    const tu=['begincmap', eslenen.length+' beginbfchar']
      .concat(eslenen.map(h=>'<'+h.charCodeAt(0).toString(16)+'> <00'+h.charCodeAt(0).toString(16)+'>'))
      .concat(['endbfchar','endcmap']).join('\n');
    const icerik='BT /F1 12 Tf 72 720 Td ('+harfler+') Tj ET';
    let hata=null, metin=null;
    try{ metin=await calistir(pdfKur({icerik, toUnicode:tu})); }catch(e){ hata=e.message; }
    ok('okunamayan oran %8i aşınca (harf oranı yüksek olsa da) metin ÜRETİLMİYOR',
       metin===null && /belirsiz/.test(hata||''));
  }

  /* ---------- 8c) AKIŞ SONU /Length İLE KESİLİYOR ----------
     Sıkıştırılmış verinin SON baytı 0x0A olabiliyor. Akışı "sondaki satır
     sonlarını at" diye keserek bulmak o dosyada gerçek bir baytı yer ve
     çözücü TÜM akışı reddeder — dosya "metin yok" sanılır. Doğrusu sözlükteki
     /Length. Bu testin PDF'i tam o durumu kuruyor. */
  {
    let icerik=null;
    /* Arama 400'de bitiyordu ve ilk uygun dolgu 1087'de; test kendi
       kurduğu durumu bulamayınca kural yine ölçülmüyordu. */
    for(let i=0;i<1500 && !icerik;i++){
      const deneme='BT /F1 12 Tf 72 720 Td (Uzunluk denemesi '+ 'x'.repeat(i) +') Tj ET';
      const g=zlib.deflateSync(Buffer.from(deneme,'latin1'));
      if(g[g.length-1]===0x0A) icerik=deneme;
    }
    ok('son baytı satır sonu olan bir akış kurulabildi', !!icerik);
    if(icerik){
      const metin=await calistir(pdfKur({icerik}));
      ok('son baytı 0x0A olan akış da eksiksiz okunuyor',
         /Uzunluk denemesi/.test(metin));
    }
  }

  /* ---------- 9) KULLANICIYA NE SÖYLENİYOR ---------- */
  {
    ok('içe aktarma PDF yolunu tanıyor', /if\(\/\\\.pdf\$\/i\.test\(f\.name\)\)\{/.test(kod));
    for(const k of ['pdfBelirsiz','pdfMetinYok','pdfSifreli'])
      ok('"'+k+'" iki dilde tanımlı', (tel.match(new RegExp(k+":'","g"))||[]).length===2);
    /* Reddin işe yarar olması, ÇALIŞAN yolu söylemesine bağlı. */
    ok('ret mesajı kopyala-yapıştır yolunu söylüyor',
       /pdfBelirsiz:'[^']*Yapıştır/.test(tel) && /pdfMetinYok:'[^']*Yapıştır/.test(tel));
    ok('dosya seçici PDF kabul ediyor', /accept="[^"]*\.pdf/.test(tel));
    ok('yardım metni artık PDF okunabildiğini söylüyor',
       /fromFileHint:'[^']*PDF/.test(tel));
  }

  /* ---------- 10) İKİ KABUKTA DA VAR ---------- */
  {
    const mac=oku(macYolu());
    ok('masaüstü kabuğunda da PDF okuyucu gömülü', /async function pdfMetni\(dosya\)/.test(mac));
  }
})();
