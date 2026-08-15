const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku, macMetni, cikar}=require('./kaynak.js');

/* D.3 — SUNUM KUMANDASI / PEDAL TUŞLARI.

   ÖLÇÜLDÜ (Tur 44): iki kabuğun kapsamı FARKLI ve fark bilinçli:

     telefon : ÖĞRENMELİ eşleme — tuşa bas, eylemi seç, tablo, profil
               dışa/içe aktarma. Bilinmeyen bir pedal tuşu bile bağlanabiliyor.
     Mac     : SABİT eşleme — PageDown/PageUp/Home/oklar/Boşluk zaten karşılanıyor
               (piyasadaki sunum kumandalarının gönderdiği tuşlar bunlar), ama
               TANINMAYAN bir tuş öğretilemiyor.

   Yani Mac savunmasız değil; eksik olan yalnız "alışılmadık tuşu öğretmek".
   Bu dosya BUGÜNKÜ GARANTİYİ kilitliyor: sabit eşleme sessizce daralırsa
   masaüstünde pedal çalışmayı bırakır ve kimse fark etmez — bu deponun 2
   numaralı hata sınıfı.

   Kapsam farkı yol haritasında YAZILI. Test onu "eksik" diye kırmızıya
   çevirmiyor; yalnız var olanın kaybolmasını engelliyor. */

const tel = oku(telefonYolu());
const mac = macMetni();

/* ---------- MAC: SUNUM KUMANDASI TUŞLARI KARŞILANIYOR MU ---------- */
{
  const blok = cikar(mac, /document\.addEventListener\('keydown',e=>\{[\s\S]*?\n  \}\);/,
                     'Mac kısayol dağıtıcısı');
  ok('Mac kısayol dağıtıcısı çıkarılabildi (ölçmeyen kapı değil)', blok.length > 300);

  /* Piyasadaki sunum kumandaları ve sayfa çevirici pedallar bu tuşları
     gönderiyor. Biri düşerse o donanım sessizce ölür. */
  for (const [tus, ne] of [['PageDown', 'ileri / başlat-duraklat'],
                           ['PageUp', 'geri'],
                           ['ArrowLeft', 'önceki satır'],
                           ['ArrowRight', 'sonraki satır'],
                           ['Home', 'başa dön'],
                           [' ', 'başlat/duraklat'],
                           ['ArrowUp', 'hızlan'],
                           ['ArrowDown', 'yavaşla']])
    ok('Mac kumanda tuşu karşılanıyor: ' + tus + ' (' + ne + ')',
       new RegExp("case '" + (tus === ' ' ? ' ' : tus) + "':").test(blok));

  /* Yazı yazarken kısayol tetiklenmemeli: metin düzenleyicide "k" yazan
     kullanıcı kaydı başlatmamalı. */
  ok('yazı kutusundayken kısayol çalışmıyor',
     /tag==='TEXTAREA'\|\|tag==='INPUT'\) return;/.test(blok));

  /* Tarayıcının kendi kaydırmasını bastırmadan ok tuşları sayfayı kaydırır
     ve sufle iki kez hareket eder. */
  const onle = (blok.match(/e\.preventDefault\(\)/g) || []).length;
  ok('varsayılan davranış bastırılıyor (' + onle + ' yerde)', onle >= 6);
}

/* ---------- TELEFON: ÖĞRENMELİ EŞLEME AYAKTA MI ---------- */
{
  /* Öğrenme akışının dört parçası: tuşu yakala · eylemi seç · tabloyu göster ·
     sıfırla. Biri düşerse özellik yarım kalır. */
  for (const [ad, id] of [['tuş öğret düğmesi', 'learnBtn'],
                          ['gelen son tuş göstergesi', 'lastKey'],
                          ['eylem seçici', 'actSeg'],
                          ['eşleme tablosu', 'mapList'],
                          ['varsayılana dön', 'mapReset']])
    ok('telefon: ' + ad + ' var', new RegExp('id="' + id + '"').test(tel));

  /* Tek ve ÇİFT basış ayrı eylemlere bağlanabiliyor: pedalların çoğu tek
     tuşla iki iş yaptırmak için çift basışı kullanıyor. */
  ok('telefon: tek ve çift basış ayrılıyor',
     /data-tap="1"/.test(tel) && /data-tap="2"/.test(tel));

  /* Profil dosyaya yazılabiliyor: aynı kumandayı ikinci cihazda yeniden
     öğretmek zorunda kalmamak için. */
  ok('telefon: profil dışa aktarılabiliyor', /id="mapExport"/.test(tel));
  ok('telefon: profil içe aktarılabiliyor', /id="mapImport"/.test(tel));

  /* Kumandası olmayana ne yapacağı söyleniyor — yoksa sayfa boş bir vaat. */
  ok('telefon: kumandası olmayana yol gösteriliyor', /data-i18n="noRemoteHint"/.test(tel));
}

/* ---------- KAPSAM FARKI BİLİNÇLİ VE YAZILI ---------- */
{
  const fs = require('fs'), path = require('path');
  const yol = require('./kaynak.js').REPO;
  const harita = fs.readFileSync(path.join(yol, 'PAZAR_YOL_HARITASI.md'), 'utf8');
  /* Fark yalnız kodda kalırsa "unutulmuş iş" ile "verilmiş karar" ayırt
     edilemez. Yol haritası bunu söylemek zorunda. */
  ok('Mac ile telefon farkı yol haritasında yazılı',
     /Mac.{0,80}SABİT eşleme|SABİT eşleme.{0,120}Mac/s.test(harita) ||
     /öğrenmeli eşleme telefonda/i.test(harita));
}
