const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu,macYolu,oku}=require('./kaynak');
const REPO=path.join(__dirname,'..');
/* Bozulabilir kaynak ORTAM DEĞİŞKENİYLE okunur: doğrudan depodan okusaydık
   kasıtlı bozma bu teste hiç ulaşmaz ve nöbetçi kanıtsız kalırdı
   (tests/115 tam bunu kilitliyor). */
const MATRIS=process.env.SUFLE_MATRIS || path.join(REPO,'GUVENILIRLIK_MATRISI.md');

/* ÇEKİM GÜVENİLİRLİĞİ MATRİSİNİN KENDİ DENETİMİ (2026-08-20).

   Rakip yol haritasının P0 maddesi "senaryolar KAYITLI" diyor. Kayıt tutmak
   kolay; kaydın DOĞRU KALMASI zor — bu depoda bir belgenin bayatlaması
   defalarca yaşandı (EKSIKLER_20260816 üç günde geçersiz oldu, MAGAZA.md
   sürüm notu aylarca v9.9'da kaldı).

   Bu yüzden matris bir BELGE değil, denetlenen bir kayıt:
     · adı geçen her test dosyası gerçekten var mı,
     · adı geçen her mesaj/etiket anahtarı sözlükte ya da mesajlarda var mı,
     · "AÇIK" bölümü boş DEĞİL — gerçek cihaz gerektiren satırlar kayıtlı
       kalmalı; birileri onları sessizce silip matrisi "tamam" gösteremesin.

   Son madde bilerek böyle: bir güvenilirlik matrisinin en tehlikeli hâli,
   ölçülmemiş satırların silinip hepsi yeşilmiş gibi görünmesidir. */

const md=fs.readFileSync(MATRIS,'utf8');
const tel=oku(telefonYolu()), mac=oku(macYolu());

ok('matris dosyası dolu', md.length>1500);

/* ---------- 1) ADI GEÇEN HER TEST DOSYASI VAR MI ---------- */
{
  const adlar=[...new Set((md.match(/`(\d{2,3}-[a-z0-9-]+\.js)`/g)||[])
    .map(x=>x.replace(/`/g,'')))];
  ok('matris test dosyası adı içeriyor ('+adlar.length+')', adlar.length>=12);
  const yok=adlar.filter(a=>!fs.existsSync(path.join(__dirname,a)));
  ok('adı geçen her test dosyası var'+(yok.length?' — eksik: '+yok.join(', '):''),
     yok.length===0);
}

/* ---------- 2) ADI GEÇEN HER ANAHTAR GERÇEKTEN VAR MI ----------
   Matris "kullanıcı şunu görür" diyorsa o metnin var olduğunu ölçmek
   zorundayız; yoksa belge var olmayan bir davranışı anlatır — bu deponun
   en pahalı sınıfı. */
{
  /* Anahtarlar belgede `msg:` önekiyle işaretli. Önek olmadan ilk yazışta
     API adlarını (getUserMedia, NotAllowedError…) da "mesaj anahtarı" sanıp
     yalancı kırmızı verdim — aracın kendi kusuru. Önek hem testi kesin
     yapıyor hem belgeyi okuyan için neyin kullanıcı metni olduğunu ayırıyor. */
  const anahtarlar=[...new Set((md.match(/`msg:([a-zA-Z][a-zA-Z0-9]*)`/g)||[])
    .map(x=>x.replace(/`|msg:/g,'')))];
  const kaynak=tel+mac;
  const bilinmeyen=anahtarlar.filter(a=>!new RegExp("\\b"+a+":'").test(kaynak));
  ok('matriste anahtar sayılabildi ('+anahtarlar.length+')', anahtarlar.length>=15);
  ok('adı geçen her mesaj/etiket anahtarı gerçekten tanımlı'+
     (bilinmeyen.length?' — bulunamayan: '+bilinmeyen.join(', '):''),
     bilinmeyen.length===0);
}

/* ---------- 3) AÇIK BÖLÜM KORUNUYOR ---------- */
{
  const i=md.indexOf('AÇIK — kanıtı olmayan satırlar');
  ok('açık satırlar bölümü duruyor', i>0);
  const acik=md.slice(i);
  const satir=(acik.match(/\n\| B\d /g)||[]).length;
  ok('gerçek cihaz gerektiren satırlar kayıtlı ('+satir+')', satir>=5);
  /* B1 ADIYLA aranıyor: yol haritasının P0 kabul ölçütü tam olarak bu satır
     (5 ve 15 dakikalık gerçek cihaz çekimi). Yalnız SAYIYA bakan bir iddia,
     o satır silinip yerine başka bir şey yazılınca sessizce geçerdi —
     kasıtlı bozma turunda tam böyle oldu. */
  ok('P0 kabul ölçütü (5/15 dk gerçek cihaz çekimi) matriste duruyor',
     /\| B1 \| 5 ve 15 dakikalık gerçek iPhone çekimi/.test(acik));
  /* Her açık satır SEBEBİNİ yazmalı: "açık" demek yetmez, neden ölçülemediği
     yazılmazsa bir sonraki tur onu ölçmeye çalışıp aynı duvara çarpar. */
  ok('her açık satır neden ölçülemediğini söylüyor',
     /Başsız tarayıcıda/.test(acik) && /cihazda/.test(acik));
}

/* ---------- 4) MATRİS ÜRÜNLE AYNI SÜRÜMÜ SÖYLÜYOR ---------- */
{
  const ver=(tel.match(/VER='([0-9.]+)'/)||[])[1];
  ok('sürüm okunabildi', !!ver);
  ok('matris güncel sürümü yazıyor ('+ver+')',
     new RegExp('sürüm '+ver.replace(/\./g,'\\.')).test(md));
}
