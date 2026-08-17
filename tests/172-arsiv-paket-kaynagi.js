const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku} = require('./kaynak.js');

/* ARŞİVDEN AÇILAN ÇEKİMİN PAKETİ (2026-08-17, uygulamayı kullanırken bulundu)

   Sürüm notunda "yayın paketi artık her zaman ÇEKTİĞİN senaryoyu içerir"
   yazıyordu. Yarım kalmış bir düzeltmeydi (deponun 1 numaralı hata sınıfı):
   aynı oturumda doğru, ARŞİVDEN AÇINCA yanlış.

     çekim yapılır          → cekimSenaryo dolar, paket doğru
     uygulama kapanır       → cekimSenaryo BOŞ
     arşivden çekim açılır  → paket `active()`e düşer = O ANDA AÇIK SENARYO
                              yani BAŞKA BİR VİDEONUN metni, sessizce

   Altyazı tarafı daha da kötüydü: `buildCues()` ekrandaki kelimelerin
   ZAMANLARINI kullanıyor; arşivden açılan çekim için bu, başka bir videonun
   zamanlaması demek — dosya "çalışıyor" görünür, altyazılar tutmaz.

   Çözüm: çekim arşivlenirken senaryosunun anlık görüntüsü de yazılıyor;
   arşivden açılan çekimde kaynak O KAYIT. Eski kayıtlarda senaryo yok —
   o zaman paket senaryosuz çıkıyor ve yayın notu SEBEBİNİ yazıyor
   (uydurulmuş metin, metin olmamasından kötüdür).

   Ayrıca ölçüldü: süre bilinmeyen eski kayıtta `sn` 1e yuvarlanıyordu ve
   100 kelimelik metin için not "6000 wpm" yazıyordu. Tempo artık yalnız
   süre gerçekten ölçülmüşse yazılıyor. */

const src = oku(telefonYolu());

/* ---------- kaynak düzeyi ---------- */
ok('çekim arşivlenirken senaryo da saklanıyor', /senaryo:cekimSenaryo\|\|null/.test(src));
ok('arşivden açılan çekimde kaynak kurulUyor', /arsivdenAc\(tam\)/.test(src));
ok('yeni çekim başlarken arşiv kaynağı düşüyor',
   /arsivKaynakSil\(\);\n  \{ const _s=active\(\)/.test(src));
ok('sonuç ekranı kapanınca da düşüyor',
   /function closeResult\(\)\{[\s\S]{0,600}?arsivKaynakSil\(\)/.test(src));
ok('eski kayıtlar için isteğe bağlı okuma (alan yoksa çökmesin)',
   /srt:\(kayit&&kayit\.srt\)\|\|''/.test(src) && /senaryo:\(kayit&&kayit\.senaryo\)\|\|null/.test(src));
ok('paket active()e DÜŞMÜYOR (arşivde başka senaryo alınmaz)',
   /const s=arsivKaynak \? arsivKaynak\.senaryo : \(cekimSenaryo\|\|active\(\)\)/.test(src));
ok('altyazı arşiv kaydından üretiliyor', /if\(arsivKaynak\) return arsivKaynak\.srt;/.test(src));
ok('altyazısı olmayan eski kayıtta sebep söyleniyor', /capArsivYok/.test(src));
ok('sebep iki dilde de var',
   /capArsivYok:'Bu çekimde altyazı saklanmamış/.test(src) &&
   /capArsivYok:'No captions were stored with this take/.test(src));

/* ---------- yayın notu KOŞARAK ---------- */
const blok=(src.match(/function yayinNotu\(\)\{[\s\S]*?\n\}/)||[])[0];
ok('yayın notu çıkarılabildi', !!blok);
if (blok) {
  const kur=(durum)=>{
    const f=new Function('d', `
      const {arsivKaynak, cekimSenaryo, lastDur, L} = d;
      const lastPath=d.lastPath||null;
      const active=()=>d.acikSenaryo;
      const duzMetin=x=>x.replace(/^#{1,3}\\s*/gm,'');
      const clock=s=>String(s);
      const dilAdi=x=>x;
      ${blok}
      return yayinNotu();
    `);
    return f(durum);
  };
  const metin='# Nasıl Başlarız\nBir iki üç dört beş. Altı yedi sekiz dokuz on.';
  /* 1) Taze çekim: çekim anındaki senaryo kullanılır. */
  let n=kur({arsivKaynak:null, cekimSenaryo:{text:metin}, lastDur:30, L:'tr',
             acikSenaryo:{text:'BAŞKA SENARYO — pakete girmemeli'}});
  ok('taze çekimde çekim anındaki metin kullanılıyor',
     n.includes('Bir iki üç') && !n.includes('BAŞKA SENARYO'));
  ok('süre ölçülmüşse tempo yazılıyor', /wpm/.test(n));
  /* 2) Arşivden açılan çekim: KAYDIN senaryosu, açık senaryo değil. */
  n=kur({arsivKaynak:{srt:'', senaryo:{text:metin}}, cekimSenaryo:{text:'ÖNCEKİ ÇEKİM'},
         lastDur:30, L:'tr', acikSenaryo:{text:'BAŞKA SENARYO'}});
  ok('arşiv çekiminde kaydın senaryosu kullanılıyor',
     n.includes('Bir iki üç') && !n.includes('BAŞKA SENARYO') && !n.includes('ÖNCEKİ ÇEKİM'));
  /* 3) Eski kayıt: senaryo yok → uydurma değil, açıklama. */
  n=kur({arsivKaynak:{srt:'', senaryo:null}, cekimSenaryo:{text:'ÖNCEKİ ÇEKİM'},
         lastDur:30, L:'tr', acikSenaryo:{text:'BAŞKA SENARYO'}});
  ok('senaryosu saklanmamış çekimde başka metin YAZILMIYOR',
     !n.includes('BAŞKA SENARYO') && !n.includes('ÖNCEKİ ÇEKİM'));
  ok('sebebi yazılıyor', n.includes('senaryosu saklanmadan önce'));
  /* 4) Süresi bilinmeyen eski kayıt: uydurma tempo yok. */
  n=kur({arsivKaynak:{srt:'', senaryo:{text:metin}}, cekimSenaryo:null,
         lastDur:0, L:'tr', acikSenaryo:{text:''}});
  ok('süre yoksa tempo YAZILMIYOR (6000 wpm saçmalığı)', !/wpm/.test(n));
  ok('süre yokken de kelime sayısı veriliyor', /Kelime: \d+/.test(n));
}
