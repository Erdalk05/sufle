const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());

/* SÜRÜM SIRALAMASI
   showNews() en yeni sürüm notunu Object.keys(NEWS).sort().pop() ile
   seçiyordu. Alfabetik sıralamada '10.0' < '9.1' — çünkü '1' karakteri
   '9'dan küçük. Bugün elimizde yalnız 6.4 ve 9.1 olduğu için hata GİZLİ:
   iki sürümde de doğru sonuç çıkıyor.

   Sürüm 10'a çıktığı gün kullanıcı yeni sürüm notu yerine eskisini görmeye
   başlardı; hata mesajı yok, çökme yok, kimse sebebini bulamazdı. Bu dosya
   o günü beklemeden kilitliyor — testler gelecekteki sürüm numaralarını
   BUGÜN deneyebilir. */

const verCmpSrc = cikar(tel, /function verCmp\(a,b\)\{[\s\S]*?\n\}/, 'verCmp');
const verCmp = new Function(verCmpSrc + '; return verCmp;')();
const enYeni = liste => liste.slice().sort(verCmp).pop();

// 1. BUGÜNKÜ DURUM bozulmamalı
ok('bugünkü sürümlerde en yenisi doğru', enYeni(['6.4','9.1']) === '9.1');

// 2. ASIL HATA — eski mantık burada '9.1' derdi
ok('10.0 gelince en yeni 10.0 (eski mantık 9.1 derdi)',
   enYeni(['6.4','9.1','10.0']) === '10.0');
ok('11.2 gelince en yeni 11.2', enYeni(['9.1','10.0','11.2']) === '11.2');

// 3. parseFloat TUZAĞI — parseFloat('9.10')=9.1 olur, 9.9'dan küçük sayılır.
//    Bu yüzden çözüm parseFloat değil, parça parça karşılaştırma.
ok('9.10 sürümü 9.9\'dan yeni sayılıyor (parseFloat olsaydı ters çıkardı)',
   enYeni(['9.9','9.10']) === '9.10');
ok('9.2 ile 9.10 doğru sıralanıyor', verCmp('9.2','9.10') < 0);

// 4. Üç parçalı ve farklı uzunluktaki numaralar
ok('üç parçalı sürüm sıralanıyor', enYeni(['9.1.0','9.1.3','9.1.10']) === '9.1.10');
ok('eksik parça sıfır sayılıyor (9.1 = 9.1.0)', verCmp('9.1','9.1.0') === 0);
ok('9.1.1 > 9.1', verCmp('9.1.1','9.1') > 0);

// 5. Karşılaştırıcı sözleşmesi — Array.sort doğru davranması buna bağlı
ok('aynı sürüm için 0 dönüyor', verCmp('9.1','9.1') === 0);
ok('simetrik (a<b ise b>a)', verCmp('9.1','10.0') < 0 && verCmp('10.0','9.1') > 0);

// 6. GERÇEKTEN BAĞLI MI — verCmp tanımlı olup showNews'te kullanılmazsa
//    yukarıdaki testler geçer ama kullanıcı yine eski notu görür.
ok('showNews karşılaştırıcıyı kullanıyor',
   /Object\.keys\(NEWS\)\.sort\(verCmp\)\.pop\(\)/.test(tel));
/* Yorumları ayıklamadan aramak yanıltır: kaynaktaki açıklama yorumu eski
   çağrıyı örnek olarak yazıyor ve düz arama onu gerçek kod sanıyor.
   (Bu testi yazarken tam olarak bu oldu.) */
const kodsuzYorum = tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(?<!:)\/\/[^\n]*/g,'');
ok('çıplak .sort() ile sürüm seçimi kalmamış',
   !/Object\.keys\(NEWS\)\.sort\(\)/.test(kodsuzYorum));

// 7. NEWS içindeki her anahtar ayrıştırılabilir olmalı; biri "v9.1" ya da
//    "9.1-beta" diye yazılırsa Number() NaN üretir ve sıralama sessizce bozulur.
const newsBlok = cikar(tel, /const NEWS=\{[\s\S]*?\n\};/, 'NEWS');
const anahtarlar = [...newsBlok.matchAll(/^\s*'([^']+)':\{/gm)].map(m => m[1]);
ok('NEWS en az bir sürüm içeriyor ('+anahtarlar.join(', ')+')', anahtarlar.length > 0);
ok('NEWS anahtarlarının hepsi sayısal sürüm biçiminde',
   anahtarlar.every(k => /^\d+(\.\d+)*$/.test(k)));

// 8. Yayındaki sürümün notu var mı — 9.1 notu eklenmeseydi kullanıcı
//    "ne değişti" ekranında hâlâ 6.4'ü görürdü.
const ver = tel.match(/VER='([\d.]+)'/)[1];
ok('yayına giden sürümün ('+ver+') sürüm notu yazılmış', anahtarlar.includes(ver));
