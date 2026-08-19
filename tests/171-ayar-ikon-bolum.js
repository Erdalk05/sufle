const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,repoOku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/<!--[\s\S]*?-->/g,'');

/* AYAR LİSTESİ: İKON VE BÖLÜM (2026-08-17)

   Erdal, kart düzeni yayına hazırken "UI hâlâ rakiplerin çok gerisinde" dedi.
   390x844'te çizdirilip bakılınca teşhis somutlaştı: 26 ayar kartı BİRBİRİNİN
   AYNI gri metin çubuğuydu. İkonsuz liste taranmaz, satır satır OKUNUR — bu
   bir belgenin davranışıdır, uygulamanın değil; iOS ve Android ayarları
   istisnasız ikon + gruplanmış liste kullanır. Ayrıca Kamera sekmesinde ses
   ve görüntü kartları DOM'da iç içeydi, yani "konuya göre kart" vaadi o
   sekmede yarım kalmıştı.

   ÖLÇÜLEREK BULUNAN ÜÇ GERÇEK KUSUR (üçü de kaynağa bakarak görülemezdi):

   1. Ayarlar AÇILDIĞINDA hiçbir özet çizilmiyordu. `ozetCiz` yalnız `apply()`
      yolundan tetikleniyor ve görünmeyen sekmeleri atlıyor; sayfa açıldığı an
      onu çağıran kimse yoktu. Sonuç: kullanıcının GÖRDÜĞÜ İLK EKRANDA Okuma
      sekmesinin beş kartı da boştu. Sekme değiştirip dönünce doluyordu, yani
      "kapalı kart değerini söyler" kuralı tam da ilk izlenimde ölüydü.
   2. İkon kutucuğu eklenince `querySelector('summary span')` başlık yerine
      İKONU buldu; `baslik` boş dizeye düştü ve `n.includes('')` her zaman
      doğru olduğu için bütün kısa etiketler atıldı. Özetler "Okuma çizgisi 18"
      yerine çıplak "18" yazmaya başladı — çıplak sayıyı yasaklayan kural,
      ikon eklendiği anda kendini kapatmıştı.
   3. İkon satırdan 42 px alınca "Göz teması ve çizgi" başlığı İKİ SATIRA
      düştü: artifact'te kilitlenen "kart başlığı tek satıra sığar" kuralının
      kendisi. Özet bütçesi 20'den 16'ya indirildi ve esneklikte başlığın hiç
      küçülmemesi CSS'e yazıldı.

   Bu dosya üçünü de kilitliyor. */

/* ---------- 1. HER KARTIN İKONU VAR ---------- */
{
  const kartlar=[...tel.matchAll(/<details class="grup"[^>]*><summary><span data-i18n="(\w+)"/g)]
                  .map(m=>m[1]);
  ok('ayar/senaryo kartları bulundu ('+kartlar.length+')', kartlar.length>=26);

  const mHarita=kod.match(/const KART_IKON=\{[\s\S]*?\};/);
  ok('KART_IKON haritası çıkarılabildi', !!mHarita);
  const harita = mHarita ? eval('('+mHarita[0].replace(/^const KART_IKON=/,'').replace(/;$/,'')+')') : {};

  /* İKONSUZ KART = YARIM KALMIŞ DÜZELTME. Bu deponun 1 numaralı hata sınıfı:
     "yapıldı" işaretli ama bir yeri eksik kalmış iş. Yeni bir kart eklenip
     haritaya yazılmazsa kutuların dışında, ikonsuz, eski görünümüyle kalır —
     ve tam da fark edilmeyen türden bir tutarsızlık olur. */
  const ikonsuz=kartlar.filter(k=>!harita[k]);
  ok('her kartın ikonu haritada'+(ikonsuz.length?' — ikonsuz: '+ikonsuz.join(', '):''),
     ikonsuz.length===0);

  /* Haritada ADI OLAN ama SVG'si olmayan ikon, ekranda boş kutucuk çizer:
     `<use href="#i-yok">` sessizce hiçbir şey göstermez. */
  const semboller=new Set([...tel.matchAll(/<symbol id="i-([\w-]+)"/g)].map(m=>m[1]));
  const sembolsuz=[...new Set(Object.values(harita))].filter(a=>!semboller.has(a));
  ok('her ikon adının SVG sembolü var'+(sembolsuz.length?' — eksik: '+sembolsuz.join(', '):''),
     sembolsuz.length===0);

  /* Haritada olup HİÇBİR kartın kullanmadığı ikon = ölü tanım. */
  const kullanilan=new Set(kartlar.map(k=>harita[k]).filter(Boolean));
  const oluHarita=Object.keys(harita).filter(k=>!kartlar.includes(k));
  ok('haritada karşılığı olmayan kart anahtarı yok'+(oluHarita.length?' — ölü: '+oluHarita.join(', '):''),
     oluHarita.length===0);
  ok('ikonların çoğu ayrı ('+kullanilan.size+' ayrı ikon)', kullanilan.size>=20);

  /* İkon SÜS: ekran okuyucu kartın adını zaten summary metninden okuyor.
     `aria-hidden` düşerse aynı ad iki kez seslendirilir. */
  ok('ikon kutucuğu ekran okuyucudan gizli',
     /kut\.setAttribute\('aria-hidden','true'\)/.test(kod));
}

/* ---------- 2. BÖLÜMLER: SES VE GÖRÜNTÜ AYRIŞTI ---------- */
{
  const mBolum=kod.match(/const KART_BOLUM=\{[\s\S]*?\n\};/);
  ok('KART_BOLUM haritası çıkarılabildi', !!mBolum);
  const bolum = mBolum ? eval('('+mBolum[0].replace(/^const KART_BOLUM=/,'').replace(/;$/,'')+')') : {};

  ok('dört ayar sekmesinin dördü de bölümlenmiş',
     ['tab-read','tab-look','tab-cam','tab-more'].every(t=>Array.isArray(bolum[t]) && bolum[t].length));

  /* ASIL DÜZELTME BURADA: Kamera sekmesinde ses ve görüntü ayrı bloklar.
     Eskiden DOM sırası "ses onarımı → kalite → filtre → dosya → mikrofon →
     çerçeve → kamera → ışık → kompozit → mikrofon seviyesi → müzik → stüdyo"
     idi; iki konu birbirinin içinden geçiyordu. */
  const cam=bolum['tab-cam']||[];
  const goruntu=(cam.find(x=>x[0]==='bGoruntu')||[])[1]||[];
  const ses=(cam.find(x=>x[0]==='bSes')||[])[1]||[];
  ok('Kamera sekmesinde GÖRÜNTÜ bölümü var ('+goruntu.length+' kart)', goruntu.length>=6);
  ok('Kamera sekmesinde SES bölümü var ('+ses.length+' kart)', ses.length>=4);
  const karisma=goruntu.filter(k=>ses.includes(k));
  ok('bir kart iki bölümde birden değil'+(karisma.length?' — '+karisma:''), karisma.length===0);
  ok('ses kartları GÖRÜNTÜ bölümünde değil',
     !goruntu.some(k=>['gSesTest','gMikSec','micLevel','muzikTitle','fxTitle'].includes(k)));

  /* Bölüm başlıkları TR ve EN sözlükte olmalı; olmazsa ekranda anahtar adı
     ("bSes") kalır. Türkçede fark edilmesi zor, İngilizceye geçince bariz. */
  const soz=repoOku('cekirdek/sozluk.js','SUFLE_SOZLUK');
  const trBlok=soz.slice(soz.indexOf(' tr:{'), soz.indexOf(' en:{'));
  const enBlok=soz.slice(soz.indexOf(' en:{'));
  const var_=(blok,a)=>new RegExp("\\b"+a+":'").test(blok);
  const etiketler=[...new Set(Object.values(bolum).flat().map(x=>x[0]))];
  const eksik=etiketler.filter(a=>!var_(trBlok,a)||!var_(enBlok,a));
  ok('her bölüm başlığı TR ve EN sözlükte'+(eksik.length?' — eksik: '+eksik.join(', '):''),
     eksik.length===0);

  /* Kutular DİLDEN ÖNCE kurulmalı: başlıklar `data-i18n` ile yazılıyor,
     applyLang'den sonra kurulsalardı ekranda anahtar adı kalırdı. */
  ok('kartlariDuzenle applyLang öncesinde koşuyor',
     /kartlariDuzenle\(\);\nfromShare\(\); applyLang\(\);/.test(kod));

  /* İçi boşalan bölüm BAŞLIĞIYLA BİRLİKTE kalkar. Başlığı duran ama altı boş
     bir bölüm, bu deponun "aç, içi boş" kusurunun bölüm ölçeğindeki hâli. */
  ok('boş bölüm gizleniyor', /kutu\.style\.display = ilk \? '' : 'none';/.test(kod));
  ok('arama sonrası bölümler tazeleniyor',
     /pane\.style\.display=hit\?'block':'none';\s*\n\s*\}\);\s*\n\s*bolumleriTazele\(\);/.test(kod));
  ok('özet çizildikten sonra bölümler tazeleniyor',
     /ozetSigdir\(o,parca,cekirdek\);\s*\n\s*\}\);\s*\n\s*bolumleriTazele\(\);/.test(kod));
}

/* ---------- 2b. SENARYOLAR PANELİ DE BÖLÜMLENDİ (2026-08-17) ----------
   Ölçülen kusur: kullanıcı buraya senaryo YAZMAYA gelir ama metin alanına
   ulaşmadan önce üç denetim satırı, liste ve İKİ kart geçiyordu — "Yeni
   senaryo ekle" ile "Yedek ve geri alma" başlığın ve metnin ÜSTÜNDEYDİ.
   Sıra artık liste → başlık → metin → araçlar. */
{
  const mBolum=kod.match(/const KART_BOLUM=\{[\s\S]*?\n\};/);
  const bolum = mBolum ? eval('('+mBolum[0].replace(/^const KART_BOLUM=/,'').replace(/;$/,'')+')') : {};
  const sc=bolum['scriptsSheet']||[];
  ok('senaryolar paneli de bölümlenmiş ('+sc.length+' kutu)', sc.length===2);
  const kitap=(sc.find(x=>x[0]==='bKitaplik')||[])[1]||[];
  const metin=(sc.find(x=>x[0]==='bBuMetin')||[])[1]||[];
  /* İKİ AYRI İŞ: kitaplığını yönetmek ile elindeki metin üzerinde çalışmak
     aynı şey değil; tek kutuya doldurmak eski "yönetim paneli" hissini
     geri getirirdi. */
  ok('kitaplık kutusunda yeni ve yedek var', kitap.includes('gYeni') && kitap.includes('gYedek'));
  ok('bu metin kutusunda araçlar ve denetim var', metin.includes('gAraclar') && metin.includes('gDenetim'));

  /* KUTU SİL/UYGULA SATIRININ ÜSTÜNE GİRER. Panelin sonuna eklemek kutuyu
     kaydetme satırının ALTINA düşürürdü; kaydet/sil her zaman en altta. */
  ok('kutunun yeri işaret ögesiyle belirtilmiş',
     /const KART_KUTU_YERI=\{ 'scriptsSheet':'#scKutuYeri' \};/.test(kod) &&
     /<div id="scKutuYeri"><\/div>/.test(tel));
  ok('işaret ögesi Sil\\/Uygula satırından ÖNCE',
     tel.indexOf('id="scKutuYeri"') < tel.indexOf('id="delScript"'));
  ok('kutu işaret ögesinin yerine ekleniyor (sona değil)',
     /if\(yer\) yer\.parentNode\.insertBefore\(kutu,yer\); else pane\.appendChild\(kutu\);/.test(kod));

  /* Bölüm tazeleme iki paneli birden görmeli: `#sheet` ile sınırlı kalsaydı
     senaryolar panelinde boş kutu gizlenmez, ilk kartın ayracı kalkmazdı. */
  ok('bölüm tazelemesi iki paneli de kapsıyor', /\$\$\('\.sheet \.kutu'\)\.forEach/.test(kod));

  /* HİÇBİR ŞEY YAPMAYAN DENETİM GÖSTERİLMEZ. Tek senaryosu olan biri için
     "Ada göre sırala" hiçbir şey yapmaz. Eşik 3. */
  ok('arama ve sıralama az senaryoda gizleniyor',
     /const cok=\(st\.scripts\|\|\[\]\)\.length>=3;/.test(kod) &&
     /srt\.classList\.toggle\('hidden', !cok\)/.test(kod));
  /* ⚠️ Kullanıcı YAZDIYSA arama kutusu kaybolmaz: sonuç listeyi 3'ün altına
     indirince kutu gizlenir ve yazdığı da kaybolurdu. */
  ok('arama kutusu yazı varken gizlenmiyor',
     /fnd\.classList\.toggle\('hidden', !cok && !fnd\.value\)/.test(kod));

  /* Alan etiketleri kutu başlıklarıyla AYNI dilde: iki ayrı tipografi dili
     aynı ekranda "web formu" hissi veriyordu. */
  ok('başlık ve metin alanları ALL-CAPS etiketli',
     /<label class="alanEt" data-i18n="title">/.test(tel) &&
     /<label class="alanEt" data-i18n="text">/.test(tel));
  ok('alan etiketi bölüm başlığıyla aynı ölçekte',
     /\.alanEt\{font-size:var\(--tx-xs\)!important;[\s\S]{0,90}?text-transform:uppercase/.test(tel));
}

/* ---------- 2c. ÇEKİM SONRASI EKRANI (2026-08-17) ----------
   Üç tanı satırı ekranın altında ORTALANMIŞ, farklı renklerde ve yapısız
   duruyordu: ses değerlendirmesi, paylaşım desteği, altyazı sayısı. Üçü de
   bir şey ters gittiğinde okunması gereken tek yer — ama ortalanmış üç ayrı
   paragrafın gözün tarayabileceği bir hizası yoktu. */
{
  ok('tanı satırları tek kutuda toplanmış',
     /<div id="cekimRapor">[\s\S]{0,400}?id="audInfo"[\s\S]{0,200}?id="shareDiag"[\s\S]{0,200}?id="capInfo"/.test(tel));
  /* Satırların KENDİ renkleri korunuyor (uyarı sarısı, onay yeşili);
     kaldırılan tek şey ortalama. */
  ok('kutu içinde satırlar sola hizalı',
     /#cekimRapor > \.hint\{[^}]*text-align:left/.test(tel));
  /* Boş satır gizlenir, ayraç yalnız GÖRÜNÜR satırların arasına girer:
     `:empty` ile gizlenen satır CSS için hâlâ kardeş, `+` seçicisi ayracı
     yanlış yere çizerdi (ayar kutularındaki `ilkGorunur` ile aynı gerekçe). */
  ok('boş tanı satırı gizleniyor', /#cekimRapor > \.hint:empty\{display:none\}/.test(tel));
  ok('ayracı görünürlüğü bilen taraf koyuyor',
     /sat\.classList\.toggle\('ustCizgi', dolu && !ilk\)/.test(kod));
  /* Üçü de boşken kutu hiç görünmez — boş bir çerçeve bu deponun
     "aç, içi boş" kusuru olurdu. */
  ok('üçü de boşken kutu gizleniyor',
     /kutu\.classList\.toggle\('bos', ilk\)/.test(kod) &&
     /#cekimRapor\.bos\{display:none\}/.test(tel));
  ok('rapor çekim sonrası tazeleniyor', /cekimRaporuTazele\(\);/.test(kod) &&
     /function cekimRaporuTazele\(\)\{/.test(kod));

  /* YANLIŞ İKON, İKONSUZLUKTAN KÖTÜDÜR: "Daha fazla" kartı ayar sürgüsü
     ikonu taşıyordu ve içinde tek bir ayar yok (altyazı dosyası, yayın
     paketi, dosyaya kaydetme, silme). */
  const mHarita=kod.match(/const KART_IKON=\{[\s\S]*?\};/);
  const harita = mHarita ? eval('('+mHarita[0].replace(/^const KART_IKON=/,'').replace(/;$/,'')+')') : {};
  ok('"Daha fazla" kartı ayar ikonu taşımıyor', harita.gDahaFazla==='dahafazla');
  ok('dahafazla sembolü tanımlı', /<symbol id="i-dahafazla"/.test(tel));
}

/* ---------- 3. SAYFA AÇILINCA ÖZET ÇİZİLİR ---------- */
{
  const mAc=kod.match(/function openSheet\(id\)\{[\s\S]*?\n\}/);
  ok('openSheet çıkarılabildi', !!mAc);
  /* ⚠️ ASIL KUSUR BUYDU: ayarlar ilk açıldığında beş kart da özetsizdi.
     Bu satır düşerse kullanıcının gördüğü İLK ekran yine boş çubuklara döner
     ve hiçbir test bunu kaynağa bakarak fark etmez. */
  ok('ayarlar açılınca özet ZORLA tazeleniyor',
     !!mAc && /if\(id==='#sheet'\) ozetTazele\(true\);/.test(mAc[0]));
  /* Aynı fonksiyondaki kardeşi: kart tuvalleri de açılışta çiziliyordu.
     İkisi aynı sınıf kusurun iki vakası; birlikte dursunlar ki bir daha
     "biri var, öteki yok" olmasın. */
  ok('kart tuvalleri de açılışta çiziliyor',
     !!mAc && /if\(id==='#sheet'\) temaKartlariCiz\(true\);/.test(mAc[0]));
}

/* ---------- 4. BAŞLIK KIRILMAZ, ÖZET KISALIR ---------- */
{
  /* Başlık span'i ADIYLA seçilir. `summary span` yazmak ikon eklendiği anda
     başlığı sessizce boş dizeye düşürüyordu (yukarıdaki 2 numaralı kusur). */
  ok('başlık span[data-i18n] ile seçiliyor (sırayla değil)',
     /g\.querySelector\(':scope > summary > span\[data-i18n\]'\)/.test(kod));
  ok('eski kırılgan seçici geri gelmedi',
     !/querySelector\('summary span'\)/.test(kod));

  /* Esneklikte kim pes edecek: başlık hiç küçülmez, özet tek küçülen taraf. */
  ok('başlık esnemede küçülmüyor',
     /\.grup>summary>span\[data-i18n\]\{flex:0 0 auto;white-space:nowrap\}/.test(tel));
  ok('özet küçülebiliyor (min-width:0)', /\.ozet\{[\s\S]{0,220}?flex:0 1 auto;min-width:0/.test(tel));

  /* BÜTÇE ARTIK KARAKTER DEĞİL PİKSEL (2026-08-17 akşamı).
     Bir önceki tur bütçeyi 26 → 20 → 16 KARAKTERE indirdi ve ölçütü
     "kart başlığı iki satıra düşmesin" idi. O ölçüt tutuyordu; bedeli ÖZET
     ödüyordu ve hiçbir kapı ona bakmıyordu. Çizilmiş ekranda ölçülen iki
     kurban: "Göz teması ve çizgi" kartında "Okuma çizgisi 18" 96 px yer
     bulup 107 px istiyordu (360 pxte yalnız 66 px), "Altyazı zamanlaması"
     kartında ise 16 karakter sınırı DEĞERİ tümden kesip geriye yalnız
     etiketi bırakıyordu. Yani sabit sayı, özetin var oluş sebebini yok
     ediyordu. Merdivenin kendisi tests/166da koşturuluyor; buradaki iddia
     KARAKTER SINIRININ GERİ GELMEMESİ. */
  ok('sabit karakter bütçesi geri gelmedi (iki parça)',
     !/parca\.join\(' · '\)\.length>\d+\) parca\.length=1;/.test(kod));
  ok('sabit karakter bütçesi geri gelmedi (tek parça)',
     !/parca\[0\]\.length>\d+\) parca\[0\]=parca\[0\]\.slice/.test(kod));
  ok('sığdırma gerçek genişlikle ölçülüyor', /o\.scrollWidth<=o\.clientWidth\+1/.test(kod));
  /* Etiket atılmadan ÖNCE kısaltılıyor: ilk düzeltme denemesi bu adımı
     atlayınca özetler "18 · Tümü" oldu, yani bu dosyanın kendi ÇIPLAK SAYI
     yasağını düzeltmenin kendisi çiğnedi. */
  ok('değere düşmeden önce etiket kısaltılıyor',
     /kelime\.slice\(0,n\)\.join\(' '\)\+' '\+deg/.test(kod));
  /* Ölçemiyorsan kırpma: panel çizilmemişken clientWidth 0 gelir. */
  ok('ölçülemeyen panelde kırpma yapılmıyor', /!o\.clientWidth \|\|/.test(kod));
}

/* ---------- 5. KUTU GÖRSEL KURALLARI ---------- */
{
  /* Kart kutunun içindeyken kendi kâğıdı değildir: çerçeve ve gölge kutuya
     ait. Bu kalkarsa eski "her kart ayrı yüzen kutu" gürültüsü geri gelir. */
  ok('kutu içindeki kartın kendi çerçevesi yok',
     /\.kutuIc \.grup\{background:none;border:none;border-radius:0;margin:0;box-shadow:none\}/.test(tel));
  /* Ayraç yalnız ilk GÖRÜNÜR kartın üstünde çıkmaz. `:first-child` yetmez:
     gizli kartları CSS hâlâ "birinci çocuk" saymaz ve kutunun kenarının
     altına ikinci bir çizgi düşerdi. */
  ok('ilk görünür kartın üst ayracı kalkıyor',
     /\.kutuIc \.grup\.ilkGorunur>summary\{border-top:none\}/.test(tel));
  ok('ilkGorunur sınıfını görünürlüğü bilen taraf koyuyor',
     /g\.classList\.toggle\('ilkGorunur', gorunur && !ilk\)/.test(kod));
  /* Bölüm başlığı okunabilir ama ikincil: ALL CAPS, en küçük ölçek. */
  ok('bölüm başlığı ALL CAPS ve en küçük ölçekte',
     /\.bolum\{font-size:var\(--tx-xs\);[\s\S]{0,120}?text-transform:uppercase/.test(tel));
}
