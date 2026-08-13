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

/* Gerçek kaynaktan çıkarılıp node'da koşturuluyor */
const kur = new Function(`
  const TextEncoder = globalThis.TextEncoder;
  ${cikar(tel, /let crcTab=null;[\s\S]*?\n\}/, 'crc32')}
  ${cikar(tel, /function zipYap\(dosyalar\)\{[\s\S]*?\n\}/, 'zipYap')}
  return { crc32, zipYap };
`);
/* Blob yerine baytları toplayan sahte: node'da Blob var ama byte dizisine
   çevirmek için async gerekiyor; testte belirlenimci olsun diye kendimiz
   birleştiriyoruz. */
function zipBaytlari(dosyalar){
  const parcalar=[];
  const SahteBlob = function(list){ this._p=list; };
  const g = new Function('__Blob','__TE', `
    const Blob=__Blob, TextEncoder=__TE;
    ${cikar(tel, /let crcTab=null;[\s\S]*?\n\}/, 'crc32')}
    ${cikar(tel, /function zipYap\(dosyalar\)\{[\s\S]*?\n\}/, 'zipYap')}
    return zipYap;
  `)(SahteBlob, TextEncoder);
  const b = g(dosyalar);
  const buf = [];
  for (const p of b._p) buf.push(Buffer.from(p));
  return Buffer.concat(buf);
}

const {crc32} = kur();

/* ---------- CRC32 BİLİNEN DEĞERLERLE ----------
   Yanlış CRC üreten zip "açılmıyor" der; sebebi görünmez. */
const te = new TextEncoder();
ok('crc32("") = 0', crc32(te.encode('')) === 0);
ok('crc32("a") doğru', crc32(te.encode('a')) === 0xE8B7BE43);
ok('crc32("123456789") doğru', crc32(te.encode('123456789')) === 0xCBF43926);
ok('crc32 uzun veride de doğru', crc32(te.encode('The quick brown fox jumps over the lazy dog')) === 0x414FA339);

/* ---------- ZIP GERÇEKTEN AÇILIYOR MU (sistem unzip'i ile) ---------- */
const ORNEK = [
  { ad:'video.mp4',      veri: te.encode('SAHTE-VIDEO-VERISI') },
  { ad:'altyazi.srt',    veri: te.encode('1\n00:00:00,000 --> 00:00:01,000\nmerhaba\n') },
  { ad:'senaryo.txt',    veri: te.encode('# Başlık\nMerhaba dünya. İkinci cümle.') },
  { ad:'yayin-notu.txt', veri: te.encode('SUFLE YAYIN NOTU\nşğüöçİ') }
];
const zip = zipBaytlari(ORNEK);
ok('zip PK imzasıyla başlıyor', zip[0]===0x50 && zip[1]===0x4B && zip[2]===0x03 && zip[3]===0x04);
ok('zip merkezi dizin sonu kaydıyla bitiyor',
   zip.slice(-22,-18).equals(Buffer.from([0x50,0x4B,0x05,0x06])));

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
                  Buffer.from(fs.readFileSync(yol)).equals(Buffer.from(f.veri)));
  }
  /* Türkçe karakterli içerik UTF-8 bayrağıyla yazılıyor; bozulursa
     yayin-notu.txt açılınca anlamsız görünürdü. */
  ok('Türkçe karakterler bozulmadan geri geliyor',
     fs.readFileSync(path.join(d,'yayin-notu.txt'),'utf8').includes('şğüöçİ'));
  fs.rmSync(d,{recursive:true,force:true});
}

/* ---------- YAYIN NOTU METNİ ---------- */
const notKur = (metin, sure, dil) => new Function('__metin','__sure','__L', `
  const L=__L, lastDur=__sure;
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
const paket = cikar(tel, /async function paketPaylas\(\)\{[\s\S]*?\n\}/, 'paketPaylas');
ok('pakete video ekleniyor', /lastBlob\.arrayBuffer\(\)/.test(paket));
ok('pakete altyazı ekleniyor (varsa)', /altyazi\.srt/.test(paket) && /cues\.length/.test(paket));
ok('pakete senaryo metni ekleniyor', /senaryo\.txt/.test(paket));
ok('pakete yayın notu ekleniyor', /yayin-notu\.txt/.test(paket));
ok('çekim yokken uyarıyor', /if\(!lastBlob\)/.test(paket));
ok('paylaşım iptalinde sessiz kalmıyor', /AbortError/.test(paket) && /shareCancelled/.test(paket));
