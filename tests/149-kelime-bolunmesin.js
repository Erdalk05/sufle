const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu, oku, macMetni, REPO}=require('./kaynak.js');

/* KELİME ORTADAN BÖLÜNMESİN (Erdal bildirdi, ekran görüntüsüyle).

   Bildirim: "yazı boyutu ne olursa olsun bir kelimeyi parçalamadan
   göstersin; kelimenin bir kısmını aşağıdaki satıra atmasın."
   Ekranda "AKRANLARI / NDAN DAHA" görünüyordu.

   SEBEP: `#scroller` üstünde `word-wrap:break-word` vardı. Bu kural kelimeyi
   keyfî bölmez — YALNIZ satıra sığmadığında böler; yani kusur "yanlış CSS"
   değil, "sığmayan kelime için plan yok"tu. Sufle okunurken en kötü şey
   budur: göz kelimenin devamını arar ve okuma akışı kırılır.

   ÖLÇÜLDÜ (gerçek tarayıcı, 430 px cihaz, satır içi 370 px):
     yazı boyutu 46 → 3 kelime bölünüyor · 60 → 5 · 110 → 10
   Bölünenler arasında "akranlarından", "Cumhurbaşkanlığı", "düşünme" gibi
   sıradan Türkçe kelimeler vardı.

   ÇÖZÜM İKİ PARÇALI, çünkü tek başına hiçbiri yetmiyor:
     ① CSS: `word-break:keep-all` + `.w{white-space:nowrap}` — kelime kendi
        içinde satır atlayamaz.
     ② JS `kelimeSigdir()`: sığmayan kelimeyi ÖLÇÜP küçültür. ① olmadan
        kelime bölünür, ② olmadan kelime kenardan kesilir ve okunmaz kalır —
        kesilmiş kelime bölünmüşten kötüdür.

   İki ölçüm daha yön değiştirtti:
     · Tek geçişlik oran %1 şaşıyor (glif ölçüleri boyutla tam orantılı
       değil): "akranlarından" 373/370 px ile hâlâ taşıyordu → ölç-daralt
       döngüsü (en çok 3 tur).
     · Taban ORAN olamaz. "%45 taban" ilk hâliydi ve 110 px seçen kullanıcıda
       "Cumhurbaşkanlığı" hâlâ taşıyordu; oysa oradaki %40 = 44 px, gayet
       okunur. Taban artık MUTLAK 22 px (uygulamanın kendi en küçük boyutu).

   SONUÇ (aynı tezgâhta yeniden ölçüldü): 22-110 px arasında bölünen kelime
   YOK, taşan kelime YOK. Tek istisna 70 harflik uydurma bir kelime: 22 px'te
   bile 370 px'e fiziken sığmıyor ve o zaman bölünmesine izin veriliyor —
   kenardan kesip kaybetmektense bölmek dürüst olan. */

const tel = oku(telefonYolu());
/* YORUMLARI AT: kural metnini anlatan yorumum `word-wrap:break-word` ifadesini
   içeriyor ve "eski kural kalktı" iddiası kendi açıklamama takılıyordu —
   ölçtüğü şey kuralın kendisi olmalı, kuralı anlatan cümle değil. */
const css = ((tel.match(/<style[^>]*>([\s\S]*?)<\/style>/) || [])[1] || '')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/* İKİ KABUKTA DA BİRDEN FAZLA `#scroller{...}` kuralı var (sonrakiler gölge,
   renk gibi ayrıntıları eziyor). İlk eşleşmeyi almak Mac'te yanlış bloğu
   seçti ve doğru kod dururken test kırmızı verdi. Aranan şey TEMEL kural:
   satır sarma davranışını bildiren blok. */
function temelScroller(cssMetni){
  const bloklar = cssMetni.match(/#scroller\{[\s\S]*?\}/g) || [];
  return bloklar.find(b => /white-space/.test(b)) || '';
}
const js  = (tel.match(/<script[^>]*>([\s\S]*?)<\/script>\s*<\/body>/) || [])[1] || tel;

/* ---------- ① KELİME KENDİ İÇİNDE BÖLÜNEMEZ ---------- */
{
  const sc = temelScroller(css);
  ok('#scroller kuralı bulundu', sc.length > 50);
  ok('eski kırma kuralı kalktı (word-wrap:break-word)', !/word-wrap:break-word/.test(sc));
  ok('kelime bütünlüğü kuralı var (word-break:keep-all)', /word-break:keep-all/.test(sc));
  ok('taşma sarması kapalı (overflow-wrap:normal)', /overflow-wrap:normal/.test(sc));
  ok('kelime ögesi kendi içinde satır atlamıyor (.w nowrap)',
     /#scroller \.w\{white-space:nowrap\}/.test(css));
}

/* ---------- ② SIĞMAYAN KELİME KÜÇÜLTÜLÜYOR ---------- */
{
  const fn = (tel.match(/function kelimeSigdir\(\)\{[\s\S]*?\n\}/) || [])[0];
  ok('kelimeSigdir çıkarılabildi', !!fn);
  if (fn) {
    ok('ölçüm gerçek genişlikten alınıyor', /getBoundingClientRect\(\)\.width/.test(fn));
    ok('yalnız sığmayan kelimeye dokunuluyor (seçilen boyut korunuyor)',
       /if\(genis\[i\]<=ic-0\.5\) continue;/.test(fn));
    ok('ölç-daralt döngüsü var (tek geçiş %1 şaşıyor)', /for\(let tur=0; tur<3/.test(fn));
    ok('taban MUTLAK piksel (oran değil)', /SIG_TABAN_PX\/tabanFs\*100/.test(fn));
    ok('taban değeri uygulamanın en küçük yazı boyutu', /const SIG_TABAN_PX=22;/.test(tel));
    ok('taban yetmezse bölünmeye izin veriliyor (kesip kaybetme yok)',
       /w\.style\.wordBreak='break-word'; w\.style\.overflowWrap='anywhere'/.test(fn));
    /* Ayar değişince eski küçültme SİLİNMELİ, yoksa küçülme birikir ve
       kullanıcı yazıyı büyüttükçe kelime küçülür. */
    ok('yeniden ölçümde eski küçültme temizleniyor',
       /kucultulmus\.forEach\(w=>\{ w\.style\.fontSize=''/.test(fn));
    ok('temizlikte bölünme izni de geri alınıyor',
       /w\.style\.wordBreak=''; w\.style\.overflowWrap=''/.test(fn));
    /* Okuma ve yazma ayrılmalı: karıştırmak her kelimede yeniden düzen
       hesaplatır ve uzun senaryoda takılma olur. */
    ok('önce okunup sonra yazılıyor (düzen çırpınması yok)',
       /const genis=aday\.map\(w=>w\.getBoundingClientRect\(\)\.width\);[\s\S]{0,400}w\.style\.fontSize=/.test(fn));
  }
  ok('ölçüm her yeniden ölçümde koşuyor', /function measure\(\)\{[\s\S]{0,120}kelimeSigdir\(\);/.test(tel));
}

/* ---------- KILAVUZ ETİKETLERİ BİRBİRİYLE YARIŞMASIN ----------
   Erdal ikisini aynı anda görüp "hangisi doğru" diye sordu: kameranın
   altında "buraya bak", okuma çizgisinin altında "gözler burada". İkisi
   DOĞRUYDU ama farklı şeyler söylüyordu ve adları ayırt ettirmiyordu:
   biri BAKILACAK YERİ (kamera), diğeri KADRAJDA GÖZÜN DURACAĞI HİZAYI
   (üçte bir kuralı) gösteriyor. Bu deponun "jargon = görünmezlik" sınıfı:
   etiketin adı, işaret ettiği şeyin adı olmalı. */
{
  ok('kamera işareti nereye bakılacağını söylüyor',
     /lookHere:'kameraya bak'/.test(tel) && /lookHere:'look at the camera'/.test(tel));
  ok('eski belirsiz etiket kalmadı', !/lookHere:'buraya bak'/.test(tel));
  ok('göz hattı KADRAJ kılavuzu olduğunu söylüyor',
     /kadraj: gözler bu hizada/.test(tel) && /framing: eyes on this line/.test(tel));
  ok('eski belirsiz göz hattı etiketi kalmadı', !/\?'gözler burada'/.test(tel));
  /* Etiket iki dilde de değişmeli; Mac de aynı sözlükten besleniyor. */
  const mac = macMetni();
  ok('Mac de aynı kamera etiketini kullanıyor', /kameraya bak/.test(mac));
  /* TEK KAYNAĞI DA KİLİTLE. İlk hâli yalnız kabuklara GÖMÜLMÜŞ kopyaya
     bakıyordu; bozma turu `cekirdek/sozluk.js`i değiştirince test susuyordu.
     İnsanın düzenlediği yer kaynak dosyadır — asıl kilit orada olmalı. */
  const soz = fs.readFileSync(process.env.SUFLE_SOZLUK ||
                              path.join(REPO,'cekirdek','sozluk.js'), 'utf8');
  ok('tek kaynak sözlükte de netleşti (TR+EN)',
     /lookHere:'kameraya bak'/.test(soz) && /lookHere:'look at the camera'/.test(soz));
}

/* ---------- MAC PARİTESİ ----------
   Aynı `word-wrap:break-word` masaüstünde de vardı. Telefonu düzeltip Mac'i
   bırakmak "yarım özellik" olurdu — bu deponun 1 numaralı hata sınıfı. */
{
  const mac = macMetni();
  const mcss = ((mac.match(/<style[^>]*>([\s\S]*?)<\/style>/) || [])[1] || '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const msc = temelScroller(mcss);
  ok('Mac #scroller kuralı bulundu', msc.length > 50);
  ok('Mac: eski kırma kuralı kalktı', !/word-wrap:break-word/.test(msc));
  ok('Mac: kelime bütünlüğü kuralı var', /word-break:keep-all/.test(msc));
  ok('Mac: satır sonlarını koruyan yazım korundu (pre-wrap)', /white-space:pre-wrap/.test(msc));
  ok('Mac: kelime ögesi kendi içinde satır atlamıyor',
     /#scroller \.w\{white-space:nowrap\}/.test(mcss));
  ok('Mac: sığdırma işlevi var', /function kelimeSigdir\(\)\{/.test(mac));
  ok('Mac: ölçümde koşuyor', /function measure\(\)\{\s*\n\s*kelimeSigdir\(\);/.test(mac));
  ok('Mac: taban da mutlak piksel', /const SIG_TABAN_PX=22;/.test(mac));
}
