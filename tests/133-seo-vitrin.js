const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku}=require('./kaynak.js');

/* F.6 — TÜRKÇE SEO.

   ÖLÇÜLEN FIRSAT: analizde 10 rakibin HİÇBİRİNDE Türkçe arayüz yok, yani
   "sufle uygulaması" ve "teleprompter programı" aramalarında Türkçe rakip
   yok. Kod gerektirmeyen en yüksek getirili kalem.

   ÖLÇÜLEN BAŞLANGIÇ: <title> tek kelimeydi ("Sufle"), og/twitter/JSON-LD/
   canonical HİÇ YOKTU.

   ⚠️ BU DOSYANIN ASIL İŞİ ABARTMAYI ENGELLEMEK. Meta etiketler kullanıcının
   uygulamayı açmadan ÖNCE okuduğu sözlerdir; tutulmayan söz, indirip ilk
   dakikada kapatan kullanıcı demektir. */

const tel = oku(telefonYolu());
const al = (re) => (tel.match(re) || [])[1] || '';

/* ---------- TEMEL ETİKETLER ---------- */
{
  const baslik = al(/<title>([^<]*)<\/title>/);
  ok('başlık anahtar kelime taşıyor', /[Tt]eleprompter/.test(baslik) && /Sufle/.test(baslik));
  /* Arama sonucunda ~60 karakterden sonrası kesilir; başlık aynı zamanda
     tarayıcı sekmesinde de görünüyor, uzun olması orada da kötü. */
  ok('başlık 60 karaktere sığıyor (' + baslik.length + ')', baslik.length > 0 && baslik.length <= 60);

  const acik = al(/name="description" content="([^"]*)"/);
  ok('açıklama Türkçe anahtar kelimeleri taşıyor',
     /sufle/i.test(acik) && /teleprompter/i.test(acik));
  /* ~160 karakterden sonrası kesilir ve cümle yarım görünür. */
  ok('açıklama 160 karaktere sığıyor (' + acik.length + ')', acik.length > 0 && acik.length <= 160);

  ok('canonical adres var', /<link rel="canonical" href="https:\/\/erdalk05\.github\.io\/sufle\/">/.test(tel));
}

/* ---------- PAYLAŞIM ÖNİZLEMESİ ---------- */
{
  for (const p of ['og:type','og:title','og:description','og:url','og:image','og:locale'])
    ok('etiket var: ' + p, new RegExp('property="' + p + '"').test(tel));
  for (const p of ['twitter:card','twitter:title','twitter:description','twitter:image'])
    ok('etiket var: ' + p, new RegExp('name="' + p + '"').test(tel));
  /* Görsel adresi GERÇEK bir dosyaya işaret etmeli: olmayan görsel,
     paylaşımda boş kutu demektir. icon-512.png depoda var (tests/131). */
  ok('paylaşım görseli depodaki ikona işaret ediyor',
     /og:image" content="https:\/\/erdalk05\.github\.io\/sufle\/icon-512\.png"/.test(tel));
  ok('dil tr_TR olarak bildirilmiş', /og:locale" content="tr_TR"/.test(tel));
}

/* ---------- YAPISAL VERİ (JSON-LD) ---------- */
{
  const m = tel.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  ok('JSON-LD bloğu var', !!m);
  let j = null;
  try { j = JSON.parse(m[1]); } catch (e) {}
  ok('JSON-LD geçerli JSON', !!j);
  if (j) {
    ok('tür SoftwareApplication', j['@type'] === 'SoftwareApplication');
    ok('dört platform da bildirilmiş',
       /iOS/.test(j.operatingSystem) && /Android/.test(j.operatingSystem) &&
       /macOS/.test(j.operatingSystem) && /Windows/.test(j.operatingSystem));
    ok('iki dil bildirilmiş', Array.isArray(j.inLanguage) && j.inLanguage.includes('tr') && j.inLanguage.includes('en'));
    /* featureList mağaza metniyle aynı disipline tabi: her madde koddaki bir
       özelliğe karşılık gelmeli. */
    const KANIT = {
      'Sesle takip': /SpeechRecognition/, 'WPM hız denetimi': /wpm/i,
      'Kamerayla kayıt': /MediaRecorder/, 'Göz teması araçları': /eyeLine|eyePos/,
      'Reels ve Shorts oranları': /reels|shorts/i, 'Altyazı (.srt) üretimi': /srt/i,
      'Word dosyası içe aktarma': /docxMetni/, 'Çevrimdışı çalışma': /serviceWorker/,
      /* G.10/G.17 — gecenin özellikleri de aynı disipline tabi: her madde
         koddaki BİR ÖZELLİĞE karşılık gelmeli, yoksa vitrin abartmış olur. */
      'Karaoke altyazı vurgusu': /function kkParcala\(/,
      'Marka kiti (logo, renk, alt bant)': /function drawMarka\(/,
      'Süreye sığdırma': /gerekenWpm\(/,
      'Klip önerileri': /klipOnerileri\(/,
      'Müzik yatağı': /muzikKisilmaKazanci\(/,
      'Sağdan sola diller': /metinYonu\(/,
    };
    for (const f of j.featureList)
      ok('JSON-LD özelliği kodda karşılanıyor: ' + f, !!KANIT[f] && KANIT[f].test(tel));
  }
}

/* ---------- "ÜCRETSİZ" SÖZÜ HÂLÂ DOĞRU MU ---------- */
{
  /* Başlıkta, açıklamada ve JSON-LD fiyatında "ücretsiz/0" yazıyor. Bir gün
     ödeme duvarı eklenirse bu ÜÇ YER birden yalan söylemeye başlar — kapı
     önce kırılsın diye kilitleniyor. */
  const odeme = /paywall|abonelik|subscription|satın al|in-app purchase/i.test(
    tel.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, ''));
  ok('kodda ödeme duvarı yok (ücretsiz sözü doğru)', !odeme);
  ok('JSON-LD fiyatı 0', /"price":"0"/.test(tel));
  ok('başlık ve açıklama ücretsiz diyor',
     /Ücretsiz/.test(al(/<title>([^<]*)<\/title>/)) &&
     /Ücretsiz/.test(al(/name="description" content="([^"]*)"/)));
}
