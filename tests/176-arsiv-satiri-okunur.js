const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku} = require('./kaynak.js');

/* ARŞİV SATIRINDA BAŞLIK OKUNABİLİR OLMALI (2026-08-17, 25 kayıtla ölçüldü)

   Depoyu 25 çekimle doldurup listeyi gerçek tarayıcıda açtım. Liste hızlı
   (0,21 sn) ve videolar belleğe alınmıyor (10 MB) — o iki iddia zaten
   sağlamdı. Ama satırın METİN sütunu ölçülünce:

     ekran 390 px → başlık sütunu  98 px   (metin 239 px istiyor)
     ekran 430 px → başlık sütunu 138 px
     ekran 320 px → başlık sütunu  28 px   <- pratikte HİÇBİR ŞEY okunmuyor

   Sebep: satırdaki beş simge düğmesi 179 px tutuyor ve metinle AYNI satırda
   duruyor. Sonuç: kullanıcı çekimlerini birbirinden ayıramıyor — üstelik
   yeniden adlandırma ve not özellikleri tam da bunun için eklenmişti.
   Deponun ölü-özellik sınıfı: özellik çalışıyor ama sonucu görünmüyor.

   Düzeltmeden sonra ölçüldü: başlık 390 px'te 326 px, 430'da 366, 320'de 256
   — üçünde de taşma YOK; düğmeler alt satırda ve sağa yaslı. */

const src = oku(telefonYolu());

ok('çekim satırı sarıyor', /#takeList \.listitem\{flex-wrap:wrap\}/.test(src));
ok('metin tam genişlik alıyor', /#takeList \.listitem \.meta\{flex:1 1 100%\}/.test(src));
ok('düğmeler sağa yaslanıyor', /#takeList \.listitem>button:first-of-type\{margin-left:auto\}/.test(src));
/* KAPSAM DAR: senaryo listesi aynı sınıfı kullanıyor ama orada düğme az,
   sarma gereksiz yer harcardı. Kural yalnız çekim listesine bağlı. */
ok('kural yalnız çekim listesine bağlı (senaryo listesi etkilenmiyor)',
   !/\n  \.listitem\{[^}]*flex-wrap:wrap/.test(src));
/* Metin kırpma kuralı DURUYOR: sarma, uzun başlığın satırı taşırmasını
   engellemez — üç nokta hâlâ gerekli. */
ok('uzun başlık hâlâ üç noktayla kırpılıyor',
   /\.listitem \.t\{[^}]*text-overflow:ellipsis\}/.test(src));
ok('metin sütununun min-width:0 kuralı duruyor (flex kırpması için şart)',
   /\.listitem \.meta\{flex:1;min-width:0\}/.test(src));
/* Ölçümün kendisi kaynakta yazılı: sayı olmadan "düzeltildi" iddiası
   denetlenemez. */
ok('ölçülen sayılar kaynakta yazılı', /98 px, 320 px'te 28 px/.test(src));

/* ---------- PAYLAŞILAN DOSYANIN ADI (2026-08-17, paylaşım yolu) ----------
   Ad her zaman "şu an"dan üretiliyordu. Taze çekimde doğru; ARŞİVDEN açılan
   bir çekimi paylaşırken yanlış: dün çekilmiş video bugünün damgasıyla
   iniyor. Aynı ad yayın paketinde ve altyazı dosyasında da kullanılıyor,
   yani üçü birden kayıyor. Veri yanlış BAĞLAMDAN alınıyor — bu turun
   tekrar eden sınıfı. */
{
  const kaynak = oku(telefonYolu());
  const fn=(kaynak.match(/function fileName\(\)\{[\s\S]*?\n\}/)||[])[0];
  ok('fileName çıkarılabildi', !!fn);
  ok('arşiv çekiminde çekimin tarihi kullanılıyor',
     !!fn && /arsivKaynak && arsivKaynak\.created\) \? arsivKaynak\.created : Date\.now\(\)/.test(fn));
  ok('taze çekimde yine şu an kullanılıyor', !!fn && /Date\.now\(\)/.test(fn));
  ok('çekim tarihi arşivden okunuyor', /created:\(kayit&&kayit\.created\)\|\|0/.test(kaynak));
  /* KOŞARAK: aynı işlev iki bağlamda iki farklı ad üretmeli. */
  if (fn) {
    const kur=(ak)=>new Function('arsivKaynak', fn+'; return fileName();')(ak);
    const eski=kur({created:new Date(2020,0,2,3,4,5).getTime()});
    const taze=kur(null);
    ok('arşiv çekimi kendi tarihiyle adlandırılıyor', eski==='sufle_20200102_030405');
    ok('taze çekim bugünün damgasını alıyor', taze!==eski && /^sufle_\d{8}_\d{6}$/.test(taze));
  }
}
