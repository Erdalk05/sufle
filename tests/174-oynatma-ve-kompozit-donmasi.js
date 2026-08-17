const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, macYolu, oku, repoOku} = require('./kaynak.js');

/* DONMANIN ÜÇÜNCÜ YÜZÜ: DOSYANIN İÇİ (2026-08-17, Erdal iPhone'da bildirdi)

   "Videoyu İZLERKEN belirli bir süre sonra görüntü donuyor, ses devam
   ediyor." Bu ne önizleme ne de kayıt anındaki iz susması: çekim bitmiş,
   dosya oynatılıyor.

   ÖLÇÜLEN KÖK NEDEN: kompozit tuvali (kırpma/9:16, yeşil ekran, gömülü
   altyazı, marka) `requestAnimationFrame` ile çiziliyor; kayıt o tuvalden
   `captureStream(30)` ile alınıyor. rAF kısılır ya da bir an dururken
   captureStream SON KAREYİ TEKRARLAMAYA DEVAM EDER — dosyaya donmuş görüntü,
   sağlam ses yazılır. Kayıt "çalışıyor" görünür; kullanıcı ancak izlerken
   anlar. Deponun 2 numaralı hata sınıfının en pahalı örneği: çekim geri
   alınamaz.

   TARAYICIDA ÖLÇÜLDÜ (kompozit açık, sahte kamera):
     rAF sağlıklı ............. 77 fps
     rAF öldürüldü ............  5 fps   <- yedek yol devrede, kareler AKIYOR
     rAF geri geldi ...........  38 fps
   Düzeltme öncesi ortadaki satır 0 fps olurdu (donmuş kare).

   İkinci kısım: oynatmada donma OYNATICIDAN da kaynaklanabilir. İkisini
   ayırt etmeden kullanıcıya "dosyan bozuk" demek yanlış olurdu; nöbetçi
   önce dürtüyor, sonra yeniden yüklüyor, ancak kareler hâlâ gelmiyorsa
   donmanın DOSYADA olduğunu söylüyor. */

const src = oku(telefonYolu());
const msrc = oku(macYolu());

/* ---------- 1) KOMPOZİT CANLI TUTUCU ---------- */
ok('canlı tutucu var', /function compCanliTut\(\)\{/.test(src));
ok('kompozit açılınca kuruluyor', /drawComp\(\);\n  compCanliTut\(\);/.test(src));
ok('kompozit kapanınca durduruluyor',
   /function stopComp\(\)\{[\s\S]{0,200}?clearInterval\(comp\.canli\)/.test(src));
ok('yedek yol yeterince sık (<=200 ms)',
   (()=>{ const m=src.match(/\},(\d+)\);\s*\/\* ÖLÇÜLDÜ/); return !!m && +m[1]<=200; })());
ok('çizim durmadıysa hiçbir şey yapmıyor (rAF sağlıklıyken maliyet yok)',
   /if\(gecen<\d+\) return;/.test(src));
ok('arka planda yanlış alarm yok', /if\(document\.visibilityState!=='visible'\) return;/.test(src));
/* İKİ rAF ZİNCİRİ = ÇİFT ÇİZİM VE ISI. Canlı tutucu drawComp'u çağırdığı
   için zincir tekilliği ARTIK ŞART. */
ok('tek rAF zinciri korunuyor',
   /cancelAnimationFrame\(comp\.raf\);\n  comp\.raf=requestAnimationFrame\(drawComp\);/.test(src));
ok('çizim damgası tutuluyor', /comp\.sonCizim=nowF;/.test(src));
/* Kayıt sürerken uzun takılma SÖYLENİYOR: sessizce toparlanmak, çekimin
   kalitesi hakkında yanlış güven verirdi. */
ok('kayıtta uzun takılma bildiriliyor',
   /gecen>1000 && rec && rec\.state==='recording' && !compDurduSoylendi/.test(src));
ok('uyarı çekim başına bir kez', /compDurduSoylendi=true;/.test(src) &&
   /compDurduSoylendi=false;/.test(src));
ok('takılma mesajı iki dilde',
   /compTakildi:'⚠️ Görüntü işleme bir an takıldı/.test(src) &&
   /compTakildi:'⚠️ The image pipeline stalled/.test(src));

/* ---------- 2) OYNATMA NÖBETÇİSİ ---------- */
for (const [ad, kaynak, oge] of [['telefon',src,'#resultVid'], ['masaüstü',msrc,'#rrVideo']]) {
  ok(ad+': oynatma nöbetçisi var', /async function oynatNabiz\(\)\{/.test(kaynak));
  ok(ad+': oynatınca başlıyor, durunca duruyor',
     new RegExp("v\\.onplay=\\(\\)=>oynatIzleBaslat\\(\\);[\\s\\S]{0,120}?v\\.onpause=\\(\\)=>oynatIzleDurdur\\(\\)").test(kaynak));
  ok(ad+': doğru ögeyi izliyor ('+oge+')',
     new RegExp("const v=\\$\\('"+oge+"'\\); if\\(!v \\|\\| !kareSayaciVar\\(v\\)\\) return;").test(kaynak)
     || new RegExp("const v=\\$\\('"+oge+"'\\); if\\(!v\\) return;[\\s\\S]{0,120}kareSayaciVar\\(v\\)").test(kaynak));
  /* ÖLÇEMEDİĞİNİ ÖLÇMÜŞ GİBİ SUNMA: kare sayacı olmayan tarayıcıda nöbetçi
     hiç kurulmuyor (yoksa `currentTime` ilerlemesini kare sanardı ve
     donmayı HİÇ göremezdi — ses akarken zaman da akar). */
  ok(ad+': sayaç yoksa ölçüm yapılmıyor', /kareSayaciVar\(v\)/.test(kaynak));
  ok(ad+': ölçüt ses ilerlerken karenin durması',
     /const sesIlerledi = t - oynatSaniye > 0\.7;/.test(kaynak) &&
     /const kareDurdu   = k === oynatKare;/.test(kaynak));
  ok(ad+': önce çözücü dürtülüyor', /v\.currentTime = t \+ 0\.05;/.test(kaynak));
  ok(ad+': sonra aynı saniyeden yeniden yükleniyor',
     /v\.load\(\); v\.currentTime=t; await v\.play\(\);/.test(kaynak));
  ok(ad+': kurtaramazsa DOSYA denildiği söyleniyor', /toast\(m\('oynatDosya'\)\)/.test(kaynak));
  ok(ad+': nerede donduğu günlüğe yazılıyor', /oynatmada görüntü dondu @/.test(kaynak));
  ok(ad+': mesajlar iki dilde',
     /oynatDosya:'⛔ Bu çekimin görüntüsü/.test(kaynak) &&
     /oynatDosya:'⛔ From this second on the picture/.test(kaynak));
}

/* ---------- 3) ORTAK KARE ÖLÇER TEK KAYNAKTA ---------- */
{
  const cek = repoOku('cekirdek/oniz.js','SUFLE_ONIZ');
  ok('genel kare ölçer çekirdekte', /function kareSayisi\(el\)\{/.test(cek));
  ok('sayaç varlığı ayrıca sorulabiliyor', /function kareSayaciVar\(el\)\{/.test(cek));
  ok('önizleme ölçümü de aynı kaynaktan', /function onizKareSayisi\(\)\{ return kareSayisi\(cam\); \}/.test(cek));
  ok('iki kabuk da bu kaynaktan besleniyor',
     /==CEKIRDEK:oniz\.js==/.test(src) && /==CEKIRDEK:oniz\.js==/.test(msrc));
}

/* ---------- 4) MASAÜSTÜNDE DE AYNI YEDEK YOL (parite kapısı gösterdi) ----------
   Telefonu onarınca tests/15 ve tests/110 "telefonda korunan yol Macte
   korunmuyor" diye bağırdı: masaüstünde de kırpma/kompozit tuvali rAF ile
   çiziliyor ve kayıt aynı tuvalden captureStream(30) ile alınıyor. Aynı
   kusur, aynı sonuç: dosyada donmuş görüntü. */
{
  ok('masaüstünde canlı tutucu var', /function cropCanliTut\(\)\{/.test(msrc));
  ok('kırpma başlayınca kuruluyor', /loop\(\);\n    cropCanliTut\(\);/.test(msrc));
  ok('kırpma durunca temizleniyor', /clearInterval\(cropCanli\); cropCanli=0;/.test(msrc));
  ok('tek zincir korunuyor', /cancelAnimationFrame\(cropRaf\);\s*\/\/ tek zincir/.test(msrc));
  ok('kayıtta uzun takılma bildiriliyor',
     /gecen>1000 && recorder && recorder\.state==='recording' && !cropDurduSoylendi/.test(msrc));
  ok('mesaj masaüstü sözlüğünde iki dilde',
     /compTakildi:'⚠️ Görüntü işleme bir an takıldı/.test(msrc) &&
     /compTakildi:'⚠️ The image pipeline stalled/.test(msrc));
}
