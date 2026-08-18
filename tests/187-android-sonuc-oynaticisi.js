const ok=(ad,k)=>{ console.log((k?'✓ ':'✗ HATA ')+ad); if(!k) process.exitCode=1; };
const {oku,telefonYolu}=require('./kaynak.js');
const src=oku(telefonYolu());
const kontrast=require('fs').readFileSync(process.env.SUFLE_KONTRAST||require('path').join(__dirname,'..','kontrast.py'),'utf8');

/* Android gerçek cihaz vakası (2026-08-18): 39,5 MB MP4 ve iki ses izi
   üretilmişti; uzun prova raporu + klip önerileri yüzünden `flex:1` video
   `min-height:0` ile sıfır piksele ezildi. Dosya kayıp değildi, oynatıcı
   görünmezdi. Bu kapı sonucu yalnız kaynak varlığıyla değil, yerleşim
   sözleşmesiyle korur. */
const css=(src.match(/\/\* ===== SONUÇ ===== \*\/[\s\S]*?\.toast\{/)||[])[0]||'';
const show=src.slice(src.indexOf('function showResult(blob){'),src.indexOf('function closeResult(){'));

ok('sonuç sayfası uzun içerikte dikey kayar',/#result\{[\s\S]*?overflow-y:auto/.test(css));
ok('Android momentum kaydırması korunur',/-webkit-overflow-scrolling:touch/.test(css));
ok('oynatıcı artık küçülebilen flex alanı değil',/#resultVid\{[^}]*flex:0 0/.test(css));
ok('oynatıcının görünür asgari yüksekliği var',/#resultVid\{[^}]*min-height:260px/.test(css));
ok('oynatıcı telefon boyuna göre alan ayırır',/#resultVid\{[^}]*56dvh/.test(css));
ok('oynatıcı aşırı uzun ekranda sınırsız büyümez',/#resultVid\{[^}]*620px/.test(css));
ok('video kadraja kırpılmadan sığar',/#resultVid\{[^}]*object-fit:contain/.test(css));
ok('oynatıcı alanı siyah yüzeyle ayırt edilir',/#resultVid\{[^}]*background:#111/.test(css));
ok('kısa yatay ekranda ayrı güvenli yükseklik var',/@media \(max-height:430px\)\{#resultVid\{[^}]*min-height:180px/.test(css));
ok('sonuç her açılışta en üste döner',/\$\('#result'\)\.scrollTop=0;/.test(show));
ok('çizilmiş sonuç kapısı oynatıcının gerçek yüksekliğini ölçer',/getBoundingClientRect\(\)\.height>=260/.test(kontrast));
ok('çizilmiş sonuç kapısı başlangıç kaydırmasını ölçer',/r\.scrollTop===0/.test(kontrast));
ok('video kaynağı sonuç açılmadan önce bağlanır',show.indexOf('v.src=resultUrl')<show.indexOf("$('#result').classList.add('open')"));
ok('oynatıcı kontrolleri HTML üzerinde duruyor',/<video id="resultVid" controls playsinline><\/video>/.test(src));
ok('Android düzeltmesi sürüm notunda Türkçe anlatılır',/'9\.30':\{tr:'<b>Android sonuç ekranındaki görünmez video oynatıcı düzeltildi/.test(src));
ok('Android düzeltmesi sürüm notunda İngilizce anlatılır',/The invisible video player on the Android result screen is fixed/.test(src));
/* SÜRÜM SABİT YAZILMAMALI (deponun bilinen tuzağı: `tests/28` önbellek adını
   sabit yazdığı için sürüm artınca ÜRÜN DOĞRUYKEN kırılmıştı). Burada anlamlı
   iddia "sürüm tam 9.30" değil, "düzeltme yayınlanmış bir sürümde ve geri
   alınmamış": sürüm notu anahtarı 9.30'da duruyor ve VER ondan geri gitmiyor. */
const ver=(src.match(/VER='([0-9]+)\.([0-9]+)'/)||[]);
ok('sürüm okunabiliyor', ver.length===3);
ok('sürüm 9.30 ya da üstü', (+ver[1]>9) || (+ver[1]===9 && +ver[2]>=30));
