const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu,macYolu,oku,cekirdekOku,repoOku,REPO}=require('./kaynak');
const tel=oku(telefonYolu()), mac=oku(macYolu());

/* DENEME KILAVUZU — MAĞAZADAN ÖNCEKİ ELDEN DAĞITIM.

   Erdal önce kendinde ve yakınlarında denemek istiyor: iPhone, Android, Mac ve
   Windows. `DENEME.md` her platform için TEK doğru yolu yazıyor. Bir kılavuzun
   en pahalı hâli, ürün değişince sessizce yalan söylemeye başlamasıdır — bu
   depoda mağaza metni ve vitrin aynı sebeple koda bağlanmıştı.

   Burada kılavuzun HER İDDİASI kaynakta aranıyor. Kılavuz "iPhone'da müzik
   kapalı" diyorsa kodda gerçekten kapalı olmalı; "↩ Tam çekim ile dön"
   diyorsa o düğme gerçekten olmalı. Ters yönü de geçerli: kılavuzda
   OLMAYAN bir söz verilmemeli (ücret, hesap, bulut, yapay zekâ). */

const KILAVUZ=repoOku('DENEME.md','SUFLE_DENEME');
const D=KILAVUZ.replace(/\s+/g,' ');

/* ---------- 1) BAĞLANTI VE SÜRÜM ---------- */
{
  const ver=(tel.match(/VER='([\d.]+)'/)||[])[1];
  ok('kılavuz sürümü koddaki sürümle aynı ('+ver+')',
     new RegExp('Sürüm '+String(ver).replace(/\./g,'\\.')).test(KILAVUZ));
  /* Adres manifestin başlangıç adresiyle uyumlu olmalı: yanlış adres,
     yakınlarına gönderilen bağlantının boş sayfa açması demek. */
  ok('kılavuz canlı adresi veriyor', /https:\/\/erdalk05\.github\.io\/sufle\//.test(KILAVUZ));
  const man=JSON.parse(repoOku('manifest.json','SUFLE_MANIFEST'));
  ok('manifest bağımsız pencerede açılıyor (Ana Ekrana Ekle anlamlı)', man.display==='standalone');
  ok('manifest başlangıç adresi göreli (alan adı değişse de çalışır)', man.start_url==='./');
  ok('kılavuzun söylediği simge boyutları manifestte var',
     man.icons.some(i=>i.sizes==='192x192') && man.icons.some(i=>i.sizes==='512x512'));
  /* iOS ana ekran simgesi AYRI bir etiket: yoksa ana ekranda boş kare çıkar. */
  ok('iOS ana ekran simgesi bağlı', /<link rel="apple-touch-icon" href="icon-180\.png">/.test(tel));
  ok('o simge depoda duruyor', fs.existsSync(path.join(REPO,'icon-180.png')));
}

/* ---------- 2) iPHONE İDDİALARI ---------- */
{
  ok('kılavuz iOS için Safari diyor', /Safari.*ile aç|yalnız Safari/i.test(D));
  /* İDDİA: iOSta müzik yatağı ve ses stüdyosu kapalı ve SEBEBİ yazılı. */
  const muzik=cekirdekOku('muzik.js','SUFLE_MUZIK');
  ok('kodda müzik iOSta kapalı', /if\(iosMu\) return \{calisir:false, sebep:'ios'\}/.test(muzik));
  ok('kılavuz bunu söylüyor', /Ses Stüdyosu ve müzik yatağı/.test(D) && /SESSİZ/.test(D));
  /* İDDİA: iOSta uygulama içi kesme yok, yerine Fotoğraflar yolu gösteriliyor. */
  ok('kodda kesme yeteneğe bağlı', /function canTrim\(\)\{ const v=\$\('#resultVid'\); return !!\(v && \(v\.captureStream/.test(tel));
  ok('kodda Fotoğraflar yolu yazılı', /trimSteps:'[^']*Fotoğraflara Kaydet/.test(tel));
  ok('kılavuz Fotoğraflar yolunu söylüyor', /Fotoğraflar.*kırp/i.test(D));
  /* Kılavuz "kalite kaybettirmez" diyor; uygulama da aynı sözü veriyor. */
  ok('iki metin de kayıpsız diyor', /kayıpsız|kalite de kaybettirmez/.test(D) && /kayıpsız/.test(tel));
}

/* ---------- 3) ANDROID VE MASAÜSTÜ İDDİALARI ---------- */
{
  ok('kılavuz Android için Chrome diyor', /Android.*Chrome/i.test(D));
  /* MAC: file:// açılışında kumandanın çalışmadığı UYGULAMADA da yazılı. */
  ok('kodda file:// uyarısı var', /file:\/\/ modunda sunucuya bağlanamaz/.test(mac));
  ok('kılavuz çift tıklamayı uyarıyor', /ÇİFT TIKLAMA/.test(KILAVUZ) && /file:\/\//.test(D));
  /* 🔴 MUTLAK YOL YAZILIYDI (2026-08-19'da düzeltildi). Kullanıcı adı ve
     `Desktop` elle gömülüydü; başka bir makinede — ya da klasör taşınınca —
     iddia SESSİZCE yalan söylerdi. Aynı gün `kayit.py` tam bu yüzden dört
     saat boyunca ESKİ dosyayı ölçtü ve kapı yeşil kaldı. Yol artık ev
     dizininden türetiliyor; ayna klasörü yoksa iddia ATLANIYOR ve bunu
     SÖYLÜYOR — sessizce geçmek, ölçmeyen kapı olurdu. */
  const ayna=(alt,dosya)=>path.join(process.env.HOME||'', 'Desktop', alt, dosya);
  const macBaslatici=ayna('Teleprompter','Teleprompter Sunucu.command');
  const winBaslatici=ayna('Teleprompter-Windows','Teleprompter Baslat.bat');
  ok('kılavuz sunucu dosyasının adını doğru veriyor', /Teleprompter Sunucu\.command/.test(D));
  ok('kılavuz Windows başlatıcısının adını doğru veriyor', /Teleprompter Baslat\.bat/.test(D));
  if(fs.existsSync(path.dirname(macBaslatici)))
    ok('Mac başlatıcısı aynada duruyor', fs.existsSync(macBaslatici));
  else console.log('ATLANDI: Mac ayna klasörü bu makinede yok — '+path.dirname(macBaslatici));
  if(fs.existsSync(path.dirname(winBaslatici)))
    ok('Windows başlatıcısı aynada duruyor', fs.existsSync(winBaslatici));
  else console.log('ATLANDI: Windows ayna klasörü bu makinede yok — '+path.dirname(winBaslatici));
  /* Kılavuz localhost:8080 diyorsa sunucunun varsayılan portu da o olmalı. */
  const sunucu=fs.readFileSync(require('./kaynak.js').sunucuYolu(),'utf8');
  /* Başlangıç portu artık ortamdan da verilebiliyor (testler makine
     durumundan bağımsız olsun diye); KULLANICI için varsayılan değişmedi ve
     kılavuz onu yazıyor. İddia o varsayılana bakıyor. */
  ok('sunucunun varsayılan portu kılavuzdakiyle aynı',
     /os\.environ\.get\("SUFLE_PORT"\) or 8080/.test(sunucu) && /localhost:8080/.test(D));
}

/* ---------- 4) İLK 5 DAKİKA LİSTESİNDEKİ HER ADIM GERÇEK ---------- */
{
  const ADIM=[
    ['sesle takip',      /id="voiceBtn"/],
    ['kamera',           /id="startCam"/],
    ['kayıt',            /id="recBtn"/],
    ['altyazı dosyası',  /id="capBtn"/],
    ['klip önerileri',   /function klipleriGoster\(\)/],
    ['tam çekime dönüş', /id="kaynakBtn"/],
    ['senaryo listesi',  /senaryoBilgi\(s, cekimSayaci\)/],
    ['hata listesi',     /id="errList"|Son hatalar/i],
    ['dışa aktarma',     /id="expBtn"/],
  ];
  for(const [ad,re] of ADIM) ok('kılavuzun andığı yüzey kodda var: '+ad, re.test(tel));
  ok('kılavuz hata listesinin yerini söylüyor', /Son hatalar/.test(D));
  ok('kılavuz dışa aktarmayı söylüyor', /Dışa aktar/.test(D));
  ok('kılavuz tam çekime dönüşü anlatıyor', /Tam çekim/.test(D));
}

/* ---------- 5) VERİLMEYEN SÖZLER (kılavuz abartmamalı) ---------- */
{
  const temiz=(tel+mac).replace(/\/\*[\s\S]*?\*\//g,'').replace(/<!--[\s\S]*?-->/g,'');
  /* Kılavuz "hesap yok, bulut yok, AI yok, ücret yok" diyor. Bunlar KODDA da
     yok olmalı; biri eklendiği gün kılavuz yalan söylemeye başlar. */
  ok('kodda hesap yok', !/signIn|createAccount|oturum aç/i.test(temiz));
  ok('kodda bize ait sunucuya çağrı yok', !/fetch\(['"]https?:\/\//.test(temiz));
  ok('kodda AI sağlayıcı yok', !/openai|anthropic\.com|generativelanguage/i.test(temiz));
  /* İDDİA DARALTILDI: "abonelik" ve "stripe" kelimeleri düz metinde de
     geçebiliyor (sürüm notunda ve yorumda geçti, ikisi de ödeme değil).
     Aranan şey ÖDEME ENTEGRASYONU: sağlayıcı adresi ya da satın alma API'si. */
  ok('kodda ödeme entegrasyonu yok',
     !/stripe\.com|js\.stripe|paddle\.com|lemonsqueezy|StoreKit|purchases\.|createCheckout/i.test(temiz));
  for(const soz of ['Hesap ve bulut yok','Yapay zekâ yok','Filigran yok'])
    ok('kılavuz sözü yazılı: '+soz, D.includes(soz));
  /* Kılavuz kurulum ve izin dışında veri çıkışı olmadığını söylüyor;
     gizlilik belgesi de aynı sözü veriyor (iki metin ayrışmasın). */
  const giz=repoOku('GIZLILIK.md','SUFLE_GIZLILIK');
  ok('gizlilik belgesi aynı sözü veriyor', /cihaz/i.test(giz) && /çıkmaz|çıkmıyor/.test(giz));
  ok('kılavuz da aynı sözü veriyor', /cihazından çıkmıyor/.test(D));
}

/* ---------- 6) CANLI DUMAN BETİĞİ DURUYOR MU ---------- */
{
  /* Kılavuz dağıtılmadan önce canlı sürümün açıldığı ÖLÇÜLÜYOR. Betik
     silinirse bu güvence sessizce kaybolur. */
  const c=repoOku('canli.py','SUFLE_CANLI');
  ok('canlı duman betiği depoda', c.length>500);
  ok('betik canlı adresi ölçüyor', /erdalk05\.github\.io\/sufle/.test(c));
  ok('betik üç genişlikte ölçüyor', (c.match(/\('(telefon|küçük telefon|masaüstü)'/g)||[]).length===3);
  /* Panoları GERÇEKTEN tıklıyor mu — yalnız varlık kontrolü yeterli değil. */
  ok('betik panoları tıklayarak ölçüyor', /b\.click\(\)/.test(c));
  ok('betik kırıkta sıfırdan farklı çıkış veriyor', /return 1 if kirik else 0/.test(c));
}
