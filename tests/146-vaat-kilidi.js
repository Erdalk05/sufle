const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu, macYolu, oku, REPO}=require('./kaynak.js');

/* VAAT KİLİDİ — "veriniz cihazınızdan çıkmaz" hiçbir koşulda bozulmasın.

   Erdal'ın talimatı: bu vaat ASLA bozulmayacak. Vaat bugün doğru; asıl soru
   yarın da doğru kalmasını NEYİN garanti ettiği. Üç katman birden tutuluyor,
   çünkü her katmanın tek başına bir kör noktası var:

     ① İLKE (CSP) — tarayıcı seviyesinde ağ çıkışı yasak. Kör noktası:
        CSP her yolu kapatmaz. `RTCPeerConnection` bir veri kanalı açar ve
        `connect-src` onu ENGELLEMEZ (WebRTC CSP kapsamı dışındadır).
     ② KOD (bu dosya) — sızdırabilecek API'ler kaynakta hiç bulunmasın.
        Kör noktası: kod doğruyken ilke yanlış yazılırsa özellik sessizce
        ölür ve kimse fark etmez.
     ③ BELGE (GIZLILIK.md + tests/131) — kullanıcıya verilen söz. Kör
        noktası: belge kodu bilmez; biri fetch eklerse belge yalan söyler.

   Bu dosya üçünün BİRBİRİNE bağlı kalmasını sınıyor. Biri gevşerse kapı
   kırmızıya döner — ve bu, bir kod incelemesinin kaçırabileceği tek şeyin
   yayına gitmesini engelleyen son halkadır.

   MAC'İN FARKI ÖLÇÜLDÜ, İSTİSNA GİZLENMEDİ: masaüstü sürümünde QR uzaktan
   kumandası KENDİ BİLGİSAYARINDA çalışan yerel sunucuyla konuşur (/events,
   /info, /preview, /qr). Bu yüzden Mac'te `fetch` ve `EventSource` VAR ve
   olmalı. Kural oradan şuna dönüşüyor: adres YALNIZ GÖRELİ olabilir —
   mutlak bir http(s) adresi belirirse veri makinenin dışına çıkabilir. */

const tel = oku(telefonYolu());
const mac = fs.readFileSync(macYolu(), 'utf8');
/* Bozma turu geçici kopyayı yazar — testi ORAYA baktır, yoksa bozma inse
   bile test depo dosyasını okur ve "ayırt ediyor" yalanını üretir. */
const sw  = fs.readFileSync(process.env.SUFLE_SW || path.join(REPO, 'sw.js'), 'utf8');
const giz = fs.readFileSync(process.env.SUFLE_GIZLILIK ||
                            path.join(REPO, 'GIZLILIK.md'), 'utf8');

/* Blok yorumları atılır; satır yorumu ayıklaması BİLEREK yapılmıyor —
   `location.protocol+'//'` gibi dizeleri kesip kaynağı bozuyor (CLAUDE.md). */
const kod = s => (s.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [])
  .join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
const telJs = kod(tel), macJs = kod(mac);

/* ---------- ① KOD: SIZDIRABİLECEK API'LER HİÇ BULUNMASIN ---------- */
{
  /* CSP'nin KAPSAMADIĞI ya da kapsasa bile niyeti belli eden yollar.
     Liste "şüpheli" değil "bu üründe işi olmayan" API'lerden oluşuyor:
     hiçbiri bir sufle uygulamasının işlevi için gerekli değil. */
  const YASAK = [
    ['RTCPeerConnection', 'WebRTC — CSP bunu engellemez, veri kanalı açar'],
    ['createDataChannel', 'WebRTC veri kanalı'],
    ['sendBeacon', 'sayfa kapanırken sessiz gönderim'],
    ['WebTransport', 'HTTP/3 çift yönlü aktarım'],
    ['navigator.geolocation', 'konum'],
    ['pushManager', 'sunucu tarafı bildirim aboneliği'],
    ['document.cookie', 'çerez — cihazlar arası izleme yüzeyi'],
    ['importScripts', 'çalışma zamanında dış kod yükleme'],
    ['new SharedWorker', 'paylaşılan işçi'],
    ['navigator.credentials', 'kimlik bilgisi'],
    ['gtag(', 'analitik'],
    ['analytics', 'analitik'],
  ];
  for (const [ad, neden] of YASAK) {
    ok('telefonda yok: ' + ad + ' (' + neden + ')', !telJs.includes(ad));
    ok('Mac\'te yok: ' + ad + ' (' + neden + ')', !macJs.includes(ad));
  }

  /* TELEFON: hiçbir ağ API'si olmayacak. Ürünün tamamı çevrimdışı çalışır;
     tek dış temas service worker'ın KENDİ önbelleğidir. */
  for (const ad of ['fetch(', 'XMLHttpRequest', 'new WebSocket', 'new EventSource']) {
    ok('telefonda ağ API\'si yok: ' + ad, !telJs.includes(ad));
  }
}

/* ---------- MAC: AĞ VAR AMA YALNIZ KENDİ BİLGİSAYARINDA ---------- */
{
  const cagrilar = [
    ...macJs.matchAll(/\bfetch\(\s*([^,)]+)/g),
    ...macJs.matchAll(/new EventSource\(\s*([^,)]+)/g),
  ].map(m => m[1].trim());
  ok('Mac\'te ağ çağrısı bulundu (ölçüm bir şey ölçüyor)', cagrilar.length > 0);
  const disari = cagrilar.filter(a => !/^['"]\//.test(a));
  ok('Mac\'in her ağ çağrısı GÖRELİ adrese gidiyor (kendi bilgisayarı)' +
     (disari.length ? ' — dışarı çıkan: ' + disari.join(', ') : ''),
     disari.length === 0);
  ok('Mac\'te mutlak http adresi yok',
     !/(fetch|EventSource)\(\s*['"`]https?:\/\//.test(macJs));
  /* Uzak önizleme İSTEĞE BAĞLI ve varsayılan kapalı olmalı — belge bunu
     söylüyor, kod da söylemeli. */
  ok('uzak önizlemenin varsayılan kapalı olduğu belgede yazılı',
     /varsayılan olarak kapalıdır/.test(giz));
}

/* ---------- SERVICE WORKER DA YEREL ---------- */
{
  ok('sw.js yalnız göreli varlıkları önbelleğe alıyor',
     !/https?:\/\//.test(sw.replace(/\/\*[\s\S]*?\*\//g, '')));
  ok('sw.js dışarıya istek kurmuyor (yalnız isteği geçirir)',
     !/fetch\(\s*['"`]https?:/.test(sw));
}

/* ---------- ② İLKE: CSP DURUYOR VE AĞ ÇIKIŞINI KAPATIYOR ---------- */
{
  const csp = s => (s.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1];
  const t = csp(tel), k = csp(mac);
  ok('telefonun ilkesi ağ çıkışını kapatıyor', !!t && /connect-src 'none'/.test(t));
  ok('Mac\'in ilkesi yalnız kendi kökenine izin veriyor',
     !!k && /connect-src 'self'/.test(k));
  ok('hiçbir kabukta ilkeye dış köken yazılmamış',
     !/connect-src[^;"]*https?:\/\//.test(t + ' ' + k));

  /* ③'ün kilidi: ilke ENGELLERSE sessiz kalmasın. Yanlış yazılmış bir ilke
     özelliği öldürür ve hata çıkmaz — bu deponun 2 numaralı hata sınıfı. */
  for (const [ad, s] of [['telefon', telJs], ['Mac', macJs]]) {
    ok(ad + ': CSP ihlali hata günlüğüne yazılıyor (sessiz ölüm yok)',
       /securitypolicyviolation/.test(s) &&
       /securitypolicyviolation[\s\S]{0,200}logErr\('csp'/.test(s));
  }
}

/* ---------- ③ BELGE: SÖZ İLE KOD AYNI ŞEYİ SÖYLÜYOR ---------- */
{
  ok('belge "bize ait sunucuya giden ağ çağrısı 0" diyor',
     /ağ çağrısı \| \*\*0\*\*/.test(giz) || /ağ çağrısı.*0/.test(giz));
  /* İSTİSNA AÇILIŞTA DURMALI, DİPTE DEĞİL. İlk hâli belgenin herhangi bir
     yerinde "tek istisna" arıyordu; bozma turu bunun yetmediğini gösterdi:
     açılış paragrafından silinse bile aşağıdaki başlık iddiayı ayakta
     tutuyordu. Dibe gömülmüş bir açıklama, mağaza beyanında açıklama
     sayılmaz — kullanıcı "hiçbir veri toplamıyoruz" cümlesinin hemen
     yanında görmeli. Ölçüt: belgenin ilk bölümü. */
  const acilis = giz.slice(0, 1200);
  ok('istisna AÇILIŞ bölümünde bildiriliyor (dibe gömülmemiş)',
     /[Tt]ek istisna/.test(acilis) && /sesle takip/i.test(acilis));
  ok('istisnanın ayrıntısı ayrı bir bölümde de anlatılıyor',
     /##[^\n]*istisna/i.test(giz));
  /* İSTİSNA GERÇEKTEN İSTİSNA MI: sesle takip tarayıcının kendi tanıma
     servisini kullanır ve o servis CSP'ye takılmaz (fetch değildir).
     Yani belge doğru, ilke de doğru — ikisi çelişmiyor. Kod tarafında
     karşılığı SpeechRecognition'dır; adı değişirse belge yalan söyler. */
  ok('istisnanın kod karşılığı hâlâ SpeechRecognition',
     /SpeechRecognition/.test(telJs));
  ok('sesle takip varsayılan kapalı (kodda da)',
     /voice:\s*false|voiceOn\s*=\s*false/.test(telJs));
}

/* ---------- KİLİDİN KENDİSİ SÖKÜLMESİN ---------- */
{
  const k131 = fs.readFileSync(path.join(REPO, 'tests', '131-magaza-hazirlik.js'), 'utf8');
  ok('gizlilik belgesi denetimi hâlâ duruyor (tests/131)',
     /analitik\/izleme aracı hâlâ yok/.test(k131));
}
