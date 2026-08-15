const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, macYolu, oku, cikar}=require('./kaynak.js');

/* C.2 — CİHAZ DIŞI YEDEK.

   RİSK NEYDİ: uygulama içi `autoBackup()` VARDI ama yedek de localStorage'da
   duruyordu. Kota dolması ele alınmıştı; ele alınMAYAN şey tarayıcı verisinin
   silinmesiydi — o durumda asıl kayıt ve yedek BİRLİKTE gidiyordu.

   ASIL BULGU: Mac'te dosyaya yedekleme vardı, TELEFONDA YOKTU. Üstelik Mac'in
   dışa aktarma mesajı "telefonda Senaryolar → İçe aktar ile açabilirsin"
   diyordu; telefonda öyle bir şey olmadığı için mesaj YALAN SÖYLÜYORDU.

   Tarayıcıda uçtan uca doğrulandı: Mac biçiminde üretilmiş bir yedek telefonda
   okundu, senaryo sayısı 1 → 2, eski senaryo yerinde kaldı, "1 senaryo eklendi"
   mesajı çıktı. */

const tel = oku(telefonYolu());
const mac = oku(macYolu());
const kodTel = (tel.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];
const kodMac = (mac.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];

/* ---------- TELEFONDA YÜZEY VAR MI ---------- */
{
  ok('telefonda dosyaya yedekleme düğmesi', /id="bkExport"/.test(tel));
  ok('telefonda dosyadan geri alma düğmesi', /id="bkImport"/.test(tel));
  ok('düğmeler sözlüğe bağlı (iki dilli)',
     /id="bkExport" data-i18n="bkExport"/.test(tel) && /id="bkImport" data-i18n="bkImport"/.test(tel));
  ok('gizli dosya girişi JSON kabul ediyor',
     /id="bkFile" accept="\.json,application\/json"/.test(tel));
  ok('üç bağ da kurulmuş',
     /\$\('#bkExport'\)\.onclick=yedekDosyaya;/.test(kodTel) &&
     /\$\('#bkImport'\)\.onclick=\(\)=>\$\('#bkFile'\)\.click\(\);/.test(kodTel) &&
     /\$\('#bkFile'\)\.onchange=/.test(kodTel));
}

/* ---------- BİÇİM İKİ PLATFORMDA AYNI MI ---------- */
{
  /* Biçim farklı olsaydı iki kabuk birbirinin yedeğini okuyamazdı ve Mac'in
     mesajı yalan olmaya devam ederdi. Anahtar üçlüsü birebir eşleşmeli. */
  const dis = cikar(kodTel, /function yedekDosyaya\(\)\{[\s\S]*?\n\}/, 'yedekDosyaya');
  ok('telefon yedeği {sufle:1, scripts, activeId} yazıyor',
     /JSON\.stringify\(\{sufle:1, scripts:st\.scripts, activeId:st\.activeId\}/.test(dis));
  ok('Mac yedeği aynı üçlüyü yazıyor',
     /JSON\.stringify\(\{sufle:1, scripts:state\.scripts, activeId:state\.current\}/.test(kodMac));
  ok('dosya adı iki platformda aynı (kullanıcı aynı dosyayı arıyor)',
     /a\.download='sufle-senaryolar\.json'/.test(dis) &&
     /a\.download='sufle-senaryolar\.json'/.test(kodMac));
  /* Nesne URL'si bırakılmazsa blob bellekte kalır; uzun oturumda birikir. */
  ok('nesne URL serbest bırakılıyor', /revokeObjectURL/.test(dis));
}

/* ---------- İÇE ALMA VERİ KAYBETTİRMİYOR MU ---------- */
{
  const al = cikar(kodTel, /function yedektenAl\(f\)\{[\s\S]*?\n\}/, 'yedektenAl');
  /* EN ÖNEMLİ KURAL: yanlış dosya seçmek her şeyi kaybettirmemeli.
     Mevcutlar SİLİNMEZ, gelenler üstüne EKLENİR. Mac'te de aynı karar. */
  ok('içe alma mevcut senaryoları SİLMİYOR (concat)',
     /st\.scripts=st\.scripts\.concat\(gelen\)/.test(al));
  ok('Mac tarafı da aynı kararı veriyor',
     /state\.scripts=state\.scripts\.concat\(gelen\)/.test(kodMac));
  /* ESKİ YEDEKLERDE yeni alanlar yok (deponun 6 numaralı sınıfı): her alan
     varsayılanıyla okunmalı, yoksa liste bozulur ya da boş başlık görünür. */
  ok('başlık boşsa varsayılanla dolduruluyor',
     /title:\(x\.title\|\|''\)\.trim\(\)\|\|t\('newScript'\)/.test(al));
  ok('metin alanı varsayılanlı okunuyor', /text:x\.text\|\|''/.test(al));
  ok('yeni alanlar (up, pos) ekleniyor', /up:Date\.now\(\), pos:0/.test(al));
  /* Boş/bozuk dosya SESSİZ kalmamalı: kullanıcı "yedeğim gitti" sanmasın. */
  ok('boş dosya açıkça bildiriliyor', /toast\(m\('bkEmpty'\)\)/.test(al));
  ok('okunamayan dosya açıkça bildiriliyor', /toast\(m\('bkBad'\)\)/.test(al));
  ok('okuma hatası da yakalanıyor (onerror)', /r\.onerror=\(\)=>toast\(m\('bkBad'\)\)/.test(al));
  ok('hata günlüğe yazılıyor', /logErr\('bkImport',e\)/.test(al));
  /* İçe aldıktan sonra ekran yenilenmezse kullanıcı "hiçbir şey olmadı"
     sanar — deponun en sevdiği sessiz kusur biçimi. */
  ok('içe almadan sonra ekran yenileniyor',
     /save\(\); fillEditor\(\); renderScripts\(\); buildContent\(\); reset\(\);/.test(al));
}
