const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const {execFileSync}=require('child_process');
const fs=require('fs'), os=require('os'), path=require('path');
const tel=oku(telefonYolu());

/* YAYIN PAKETİ
   Çekimden sonra iş bitmiyordu: video bir yere, altyazı başka yere, senaryo
   metni ve başlık/açıklama taslağı elle hazırlanıyordu — her video için
   tekrarlanan iş. Artık hepsi tek zip.

   Kendi zip yazıcımızı yazdık (sıfır bağımlılık ilkesi). Kendi yazdığın bir
   dosya biçiminde "çalışıyor gibi görünmek" kolaydır: baytlar üretilir, blob
   iner, kullanıcı açamaz. O yüzden burada üretilen zip GERÇEK BİR AÇICIYLA
   (sistemin unzip'i) açılıp içeriği karşılaştırılıyor. */

/* Gerçek kaynaktan çıkarılıp node'da koşturuluyor.
   Node'un kendi Blob'u kullanılıyor: zipYap artık Blob parçalarını KOPYALAMADAN
   geçiriyor ve CRC'yi akıştan hesaplıyor — o yolun da gerçekten sınanması gerek. */
function zipFn(){
  return new Function('__TE', `
    const TextEncoder=__TE;
    ${cikar(tel, /let crcTab=null;[\s\S]*?\nfunction crc32\(buf\)\{[\s\S]*?\n\}/, 'crc tablosu')}
    ${cikar(tel, /async function crc32Akis\(blob\)\{[\s\S]*?\n\}/, 'crc32Akis')}
    ${cikar(tel, /async function zipYap\(dosyalar\)\{[\s\S]*?\n\}/, 'zipYap')}
    return { crc32, zipYap };
  `)(TextEncoder);
}
const {crc32, zipYap} = zipFn();
const paketKaynak = cikar(tel, /async function paketPaylas\(\)\{[\s\S]*?\n\}/, 'paketPaylas');
const zipBaytlari = async dosyalar => Buffer.from(await (await zipYap(dosyalar)).arrayBuffer());

/* ---------- CRC32 BİLİNEN DEĞERLERLE ----------
   Yanlış CRC üreten zip "açılmıyor" der; sebebi görünmez. */
const te = new TextEncoder();
ok('crc32("") = 0', crc32(te.encode('')) === 0);
ok('crc32("a") doğru', crc32(te.encode('a')) === 0xE8B7BE43);
ok('crc32("123456789") doğru', crc32(te.encode('123456789')) === 0xCBF43926);
ok('crc32 uzun veride de doğru', crc32(te.encode('The quick brown fox jumps over the lazy dog')) === 0x414FA339);

/* ---------- ZIP GERÇEKTEN AÇILIYOR MU (sistem unzip'i ile) ----------
   VİDEO BLOB OLARAK VERİLİYOR — gerçek uygulamadaki yol bu. Eskiden
   arrayBuffer() ile belleğe alınıyordu; 10 dakikalık 1080p çekimde tepe
   bellek ~1,3 GB oluyordu ve iPhone sekmeyi öldürüyordu. Artık Blob
   kopyalanmadan zip'in parçası oluyor, CRC akıştan hesaplanıyor. */
const VIDEO_ICERIK = 'SAHTE-VIDEO-VERISI';
const ORNEK = [
  { ad:'video.mp4',      veri: new Blob([te.encode(VIDEO_ICERIK)]) },   // ← Blob yolu
  { ad:'altyazi.srt',    veri: te.encode('1\n00:00:00,000 --> 00:00:01,000\nmerhaba\n') },
  { ad:'senaryo.txt',    veri: te.encode('# Başlık\nMerhaba dünya. İkinci cümle.') },
  { ad:'yayin-notu.txt', veri: te.encode('SUFLE YAYIN NOTU\nşğüöçİ') }
];
const BEKLENEN = { 'video.mp4': Buffer.from(VIDEO_ICERIK) };
for (const f of ORNEK) if (!BEKLENEN[f.ad]) BEKLENEN[f.ad] = Buffer.from(f.veri);

(async () => {
const zip = await zipBaytlari(ORNEK);
ok('zip PK imzasıyla başlıyor', zip[0]===0x50 && zip[1]===0x4B && zip[2]===0x03 && zip[3]===0x04);
ok('zip merkezi dizin sonu kaydıyla bitiyor',
   zip.slice(-22,-18).equals(Buffer.from([0x50,0x4B,0x05,0x06])));

/* Blob yolu ile bayt dizisi yolu AYNI zip'i üretmeli — biri bozuksa
   arşiv açılmaz ama fark ancak karşılaştırınca görünür. */
const zipBayt = await zipBaytlari(ORNEK.map(f =>
  f.ad==='video.mp4' ? {ad:f.ad, veri:te.encode(VIDEO_ICERIK)} : f));
ok('Blob yolu ile bayt dizisi yolu birebir aynı zip üretiyor', zip.equals(zipBayt));

let unzipVar=true;
try { execFileSync('unzip',['-v'],{stdio:'ignore'}); } catch(_) { unzipVar=false; }
if (!unzipVar) {
  console.log('✓ (atlandı: sistemde unzip yok — gerçek açıcı sınaması yapılamadı)');
} else {
  const d = fs.mkdtempSync(path.join(os.tmpdir(),'sufle-zip-'));
  const zp = path.join(d,'paket.zip');
  fs.writeFileSync(zp, zip);
  let bozuk=false, cikti='';
  try { cikti = execFileSync('unzip',['-t',zp],{encoding:'utf8'}); }
  catch(e){ bozuk=true; cikti=(e.stdout||'')+(e.stderr||''); }
  ok('GERÇEK unzip arşivi bozuk bulmuyor'+(bozuk?' — '+cikti.slice(0,160):''), !bozuk);

  execFileSync('unzip',['-o','-q',zp,'-d',d]);
  for (const f of ORNEK) {
    const yol = path.join(d, f.ad);
    const varMi = fs.existsSync(yol);
    ok('"'+f.ad+'" arşivden çıkıyor', varMi);
    if (varMi) ok('"'+f.ad+'" içeriği bozulmamış',
                  Buffer.from(fs.readFileSync(yol)).equals(BEKLENEN[f.ad]));
  }
  /* Türkçe karakterli içerik UTF-8 bayrağıyla yazılıyor; bozulursa
     yayin-notu.txt açılınca anlamsız görünürdü. */
  ok('Türkçe karakterler bozulmadan geri geliyor',
     fs.readFileSync(path.join(d,'yayin-notu.txt'),'utf8').includes('şğüöçİ'));
  fs.rmSync(d,{recursive:true,force:true});
}

/* ---------- ASIL DÜZELTME: BÜYÜK ÇEKİM BELLEĞİ ŞİŞİRMEMELİ ----------
   v9.2'de yayınlanan ilk hâl videoyu arrayBuffer() ile tümüyle belleğe
   alıyordu. Uygulamanın kendi bit hızı tablosundan ölçüldü: 1080p/mid
   65 MB/dk → 10 dakikalık çekim 653 MB → paketleme anında tepe ~1,3 GB.
   iPhone Safari sekmeyi öldürür ve özellik tam da UZUN çekimlerde gerekli.

   Ölçüm: 64 MB'lık bir blob paketlenirken JS yığınındaki artışa bakıyoruz.
   Video belleğe alınsaydı artış blob boyutuyla ORANTILI olurdu. */
{
  /* DOĞRU ÖLÇÜT `arrayBuffers`, `heapUsed` DEĞİL. İlk yazımda heapUsed'e
     bakıyordum ve iddia her koşulda geçiyordu: tipli dizi verisi V8 yığınında
     değil HARİCİ bellekte tutulur, yani heapUsed videoyu belleğe alsan da
     kıpırdamıyor. Hareket edemeyen bir sayıya bakan test, doğru sebepten
     değil şans eseri geçer — kasıtlı bozma turunda yakalandı. */
  const MB = 64;
  const buyuk = new Blob([Buffer.alloc(MB*1024*1024, 7)]);
  global.gc && global.gc();
  const once = process.memoryUsage().arrayBuffers;
  const z = await zipYap([{ad:'buyuk.mp4', veri:buyuk}, {ad:'not.txt', veri:te.encode('x')}]);
  const artisMB = (process.memoryUsage().arrayBuffers-once)/1048576;
  /* NEYİ KANITLADIĞIMIZ KONUSUNDA DÜRÜST OLALIM: node'un Blob'u parçaları
     KOPYALAR, tarayıcınınki diskte tutar. Buradaki ölçümle kanıtlanabilen şey
     videonun İKİ KEZ değil bir kez tampona alınması — arrayBuffer() adımının
     kalkması. Ölçüldü: düzeltilmiş 64 MB, eski hâl 128 MB (64 MB'lık video).
     Tarayıcıdaki asıl kazanç daha büyük (kalan parça da disk destekli) ama
     onu burada ölçemiyoruz; kaynak düzeyi kilitler o yüzden ayrıca var. */
  ok('zip boyutu videoyu içeriyor ('+(z.size/1048576).toFixed(0)+' MB)', z.size > MB*1024*1024);
  ok('video İKİ KEZ tampona alınmıyor (artış '+artisMB.toFixed(1)+' MB, video '+MB+' MB)',
     artisMB < MB*1.5);
  /* CRC akıştan hesaplanıyor mu — kaynak düzeyi kilit */
  ok('video CRC\'si akıştan hesaplanıyor (belleğe alınmıyor)',
     /crc32Akis\(d\.veri\)/.test(cikar(tel, /async function zipYap\(dosyalar\)\{[\s\S]*?\n\}/, 'zipYap')));
  ok('paket videoyu Blob olarak geçiriyor (arrayBuffer yok)',
     /veri:lastBlob/.test(paketKaynak) && !/lastBlob\.arrayBuffer/.test(paketKaynak));
}

/* ---------- YAYIN NOTU METNİ ---------- */
const notKur = (metin, sure, dil) => new Function('__metin','__sure','__L', `
  const L=__L, lastDur=__sure;
  /* Yayın notu artık ÇEKİM BAŞINDA damgalanan senaryoyu tercih ediyor
     (bkz. tests/61): çekimden sonra sürüm değiştirmek notu başka bir metinden
     üretiyordu. Burada damga yok, yani "hiç çekim yapılmamış" hâli sınanıyor
     ve active() yedeğine düşülüyor. */
  const cekimSenaryo=null;
  const active=()=>({text:__metin});
  const clock=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
  ${cikar(tel, /function duzMetin\(t\)\{[\s\S]*?\n\}/, 'duzMetin')}
  ${cikar(tel, /function yayinNotu\(\)\{[\s\S]*?\n\}/, 'yayinNotu')}
  return yayinNotu();
`)(metin, sure, dil);

const SENARYO = '# Robotik Nedir\nMerhaba arkadaşlar. *Bugün* robotlardan / konuşacağız. (2)\n[kameraya bak]\nİkinci bölüm burada.\n## Kapanış Sözü\nGörüşmek üzere.';
const not = notKur(SENARYO, 60, 'tr');

ok('yayın notu başlık adaylarını senaryodan çıkarıyor',
   not.includes('1) Robotik Nedir') && not.includes('2) Kapanış Sözü'));
ok('açıklama taslağı ilk cümlelerden üretiliyor', /Merhaba arkadaşlar\./.test(not));
ok('etiket adayları başlıklardan üretiliyor', /#robotik/.test(not) && /#kapanış/.test(not));
/* "Nasıl Başlarız" gibi başlıklar #nasıl üretiyordu — etiket olarak gürültü. */
const durakNot = notKur('# Nasıl Robotik Kurulum Yaparız\nMetin.', 30, 'tr');
ok('soru/bağlaç sözcükleri etiket olmuyor', !/#nasıl/.test(durakNot));
ok('anlamlı sözcükler etiket oluyor', /#robotik/.test(durakNot) && /#kurulum/.test(durakNot));
const enDurak = notKur('# How To Build Your Robot\nText.', 30, 'en');
ok('İngilizcede de durak sözcükleri eleniyor', !/#your/.test(enDurak) && /#robot/.test(enDurak));
ok('süre ve kelime sayısı yazıyor', /Süre: 01:00/.test(not) && /Kelime: \d+/.test(not));
ok('tempo hesaplanıyor', /Tempo: \d+ wpm/.test(not));

/* İŞARETLEME DİLİ AÇIKLAMAYA SIZMAMALI — sızarsa kullanıcı yayın
   açıklamasına "*Bugün* robotlardan / konuşacağız (2)" yapıştırır. */
ok('vurgu yıldızları açıklamaya sızmıyor', !/\*/.test(not.split('AÇIKLAMA')[1]||''));
ok('duraklama işaretleri sızmıyor', !/ \/ /.test(not.split('AÇIKLAMA')[1]||''));
ok('bekleme süresi (2) sızmıyor', !/\(2\)/.test(not));
ok('[yönerge] notu sızmıyor', !/kameraya bak/.test(not));
ok('# başlık işareti açıklamada yok', !/^#\s/m.test(not.split('AÇIKLAMA')[1]||''));

/* ---------- SINIR DURUMLARI ---------- */
const bosNot = notKur('', 0, 'tr');
ok('boş senaryoda çökmüyor', typeof bosNot === 'string' && bosNot.length > 0);
ok('boş senaryoda başlık yokluğu açıkça yazıyor', /başlık yok/.test(bosNot));
const bassiz = notKur('Sadece düz metin var burada.', 30, 'tr');
ok('başlıksız senaryoda açıklama yine üretiliyor', /Sadece düz metin/.test(bassiz));
const en = notKur(SENARYO, 60, 'en');
ok('İngilizce arayüzde not İngilizce', /TITLE OPTIONS/.test(en) && /DESCRIPTION/.test(en));

/* ---------- ARAYÜZE BAĞLI MI ---------- */
ok('sonuç ekranında yayın paketi düğmesi var', /id="pkgBtn"/.test(tel));
ok('düğme paketPaylas\'a bağlı', /\$\('#pkgBtn'\)\.onclick=paketPaylas/.test(tel));
ok('düğme metni iki dilde tanımlı', (tel.match(/pkgBtnL:'/g)||[]).length >= 2);
const paket = paketKaynak;
/* Video artık arrayBuffer() ile belleğe ALINMADAN, Blob olarak ekleniyor. */
ok('pakete video ekleniyor', /veri:lastBlob/.test(paket));
ok('pakete altyazı ekleniyor (varsa)', /altyazi\.srt/.test(paket) && /cues\.length/.test(paket));
ok('pakete senaryo metni ekleniyor', /senaryo\.txt/.test(paket));
ok('pakete yayın notu ekleniyor', /yayin-notu\.txt/.test(paket));
ok('çekim yokken uyarıyor', /if\(!lastBlob\)/.test(paket));
ok('paylaşım iptalinde sessiz kalmıyor', /AbortError/.test(paket) && /shareCancelled/.test(paket));

})();
