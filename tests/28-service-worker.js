const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {REPO, repoOku}=require('./kaynak');
const src=repoOku('sw.js','SUFLE_SW');

/* SERVICE WORKER — PWA'NIN GÜNCELLEME YOLU
   Bugüne kadar tek denetimi kapının "CACHE sayısı arttı mı" kontrolüydü;
   yani sürüm numarası ilerliyor mu bakılıyordu, DAVRANIŞ hiç ölçülmüyordu.

   En kritik özellik: gezinme isteği ÖNCE AĞ. Uygulamanın tamamı tek
   index.html dosyası olduğu için gezinme önbellekten servis edilirse
   kullanıcı yayınlanan her yeni sürümü kaçırır — ne hata çıkar ne uyarı,
   sonsuza kadar eski sürümü kullanır. Bu deponun imza hata sınıfı, üstelik
   en pahalı hâli: düzeltmeler yayınlanır ama kimseye ulaşmaz.

   Burada sw.js gerçekten koşturuluyor: sahte self/caches/fetch verilip
   olay işleyicileri çağrılıyor. */

/* Güncel önbellek adı kaynaktan okunuyor; sahte eski sürümler ondan türetiliyor. */
const GUNCEL = (src.match(/const CACHE\s*=\s*'([^']+)'/) || [])[1];
const N = parseInt((GUNCEL||'').replace(/\D+/g,''), 10);
const ESKILER = [N-2, N-1].map(n => 'sufle-v'+n);

function kurSW({ agCalisiyor = true, onbellekte = null } = {}){
  const iz = [];
  const olay = {};
  const onbellek = {
    put: (req, res) => { iz.push('put:'+(req.url||req)); return Promise.resolve(); },
    addAll: liste => { iz.push('addAll:'+liste.join(',')); return Promise.resolve(); }
  };
  const caches = {
    open: ad => { iz.push('open:'+ad); return Promise.resolve(onbellek); },
    /* SÜRÜM ADINI KAYNAKTAN AL, SABİT YAZMA. İlk yazımda 'sufle-v73' gömülüydü
       ve v9.2 sürüm artışında test kendi kendini kırdı: kod doğru davranıp
       v73'ü siliyordu ama test onu "güncel" sanıyordu. Sabit yazılmış sürüm,
       her yayında patlayan bir test demek. */
    keys: () => Promise.resolve([...ESKILER, GUNCEL]),
    delete: ad => { iz.push('sildi:'+ad); return Promise.resolve(true); },
    match: istek => { iz.push('match:'+(istek.url||istek));
                      return Promise.resolve(onbellekte); }
  };
  const fetch = req => { iz.push('fetch:'+(req.url||req));
    return agCalisiyor ? Promise.resolve({ kaynak:'ag', clone:()=>({kaynak:'kopya'}) })
                       : Promise.reject(new Error('cevrimdisi')); };
  const self = {
    addEventListener: (t,f) => { olay[t]=f; },
    skipWaiting: () => iz.push('skipWaiting'),
    clients: { claim: () => iz.push('claim') }
  };
  const location = { origin:'https://erdalk05.github.io' };
  const Response = function(gövde, opt){ this.kaynak='Response'; Object.assign(this, opt||{}); };
  new Function('self','caches','fetch','location','Response','URL', src)
    (self, caches, fetch, location, Response, URL);
  return { olay, iz };
}

/* Tek bir fetch olayını koşturup yanıtı döndürür */
async function istekKos(sw, { url, mode='no-cors', method='GET' }){
  let yanit = 'RESPONDWITH-CAGRILMADI';
  const e = { request:{ url, mode, method }, respondWith: p => { yanit = p; } };
  sw.olay.fetch(e);
  return yanit === 'RESPONDWITH-CAGRILMADI' ? yanit : await yanit;
}

(async () => {

/* ---------- 1. GEZİNME ÖNCE AĞ (en kritik) ---------- */
{
  const sw = kurSW({ agCalisiyor:true, onbellekte:{kaynak:'ESKI-ONBELLEK'} });
  const y = await istekKos(sw, { url:'https://erdalk05.github.io/sufle/', mode:'navigate' });
  ok('gezinme AĞDAN geliyor (önbellekte eski kopya olsa bile)', y && y.kaynak === 'ag');
  ok('gezinmede önce ağ deneniyor', sw.iz[0].startsWith('fetch:'));
}

/* ---------- 2. ÇEVRİMDIŞI GEZİNME ÖNBELLEĞE DÜŞÜYOR ---------- */
{
  const sw = kurSW({ agCalisiyor:false, onbellekte:{kaynak:'onbellek-index'} });
  const y = await istekKos(sw, { url:'https://erdalk05.github.io/sufle/', mode:'navigate' });
  ok('çevrimdışında gezinme önbellekteki index\'e düşüyor', y && y.kaynak === 'onbellek-index');
  ok('yedek olarak index.html aranıyor', sw.iz.some(x => x === 'match:./index.html'));
}

/* ---------- 3. VARLIKLAR ÖNCE ÖNBELLEK ---------- */
{
  const sw = kurSW({ agCalisiyor:true, onbellekte:{kaynak:'onbellek-simge'} });
  const y = await istekKos(sw, { url:'https://erdalk05.github.io/sufle/icon-192.png' });
  ok('önbellekteki simge ağa gidilmeden veriliyor', y && y.kaynak === 'onbellek-simge');
  ok('önbellek varken ağ isteği yapılmıyor', !sw.iz.some(x => x.startsWith('fetch:')));
}

/* ---------- 4. ÖNBELLEKTE YOKSA AĞDAN AL VE SAKLA ---------- */
{
  const sw = kurSW({ agCalisiyor:true, onbellekte:null });
  const y = await istekKos(sw, { url:'https://erdalk05.github.io/sufle/icon-512.png' });
  ok('önbellekte olmayan varlık ağdan geliyor', y && y.kaynak === 'ag');
  await new Promise(r => setImmediate(r));
  ok('ağdan gelen varlık önbelleğe yazılıyor', sw.iz.some(x => x.startsWith('put:')));
}

/* ---------- 5. ÇEVRİMDIŞI + ÖNBELLEKTE YOK: SESSİZ BOZULMA OLMAMALI ----------
   Eskiden burada `.catch(() => hit)` vardı; hit o noktada her zaman falsy
   olduğu için respondWith undefined ile çözülüyordu — sözde çevrimdışı
   yedeği hiçbir şey yapmıyordu. */
{
  const sw = kurSW({ agCalisiyor:false, onbellekte:null });
  const y = await istekKos(sw, { url:'https://erdalk05.github.io/sufle/icon-512.png' });
  ok('çevrimdışı + önbelleksiz istek undefined değil, gerçek yanıt dönüyor',
     y && y.kaynak === 'Response');
  ok('bu yanıt açıkça hata durumu bildiriyor (504)', y && y.status === 504);
}

/* ---------- 6. MÜDAHALE SINIRLARI ---------- */
{
  const sw = kurSW();
  const y = await istekKos(sw, { url:'https://erdalk05.github.io/sufle/', method:'POST', mode:'navigate' });
  ok('GET olmayan isteğe karışılmıyor', y === 'RESPONDWITH-CAGRILMADI');
}
{
  const sw = kurSW();
  const y = await istekKos(sw, { url:'https://baska-site.example/x.png' });
  ok('başka kaynaklı isteğe karışılmıyor', y === 'RESPONDWITH-CAGRILMADI');
}

/* ---------- 7. KURULUM: TEMEL DOSYALAR ÖNBELLEĞE ---------- */
{
  const sw = kurSW();
  let bekle; sw.olay.install({ waitUntil: p => { bekle = p; } });
  await bekle;
  const addAll = sw.iz.find(x => x.startsWith('addAll:')) || '';
  ok('kurulumda index.html önbelleğe alınıyor', addAll.includes('./index.html'));
  ok('kurulumda manifest önbelleğe alınıyor', addAll.includes('./manifest.json'));
  ok('kurulumda kök yol önbelleğe alınıyor', addAll.includes('./,') || addAll.includes(':./,'));
  ok('kurulum sonunda skipWaiting çağrılıyor', sw.iz.includes('skipWaiting'));
}

/* ---------- 8. ETKİNLEŞME: ESKİ ÖNBELLEKLER SİLİNİYOR ----------
   Silinmezse eski sürümlerin dosyaları diskte birikir ve kota dolarsa
   yeni sürüm önbelleğe alınamaz. */
{
  const sw = kurSW();
  let bekle; sw.olay.activate({ waitUntil: p => { bekle = p; } });
  await bekle;
  const silinen = sw.iz.filter(x => x.startsWith('sildi:')).map(x => x.slice(6));
  ok('eski sürüm önbellekleri siliniyor ('+ESKILER.join(', ')+')',
     ESKILER.every(e => silinen.includes(e)));
  ok('GÜNCEL önbellek ('+GUNCEL+') silinmiyor', !silinen.includes(GUNCEL));
  ok('etkinleşince açık sayfalar devralınıyor', sw.iz.includes('claim'));
}

/* ---------- 9. SÜRÜM ADI TUTARLI ---------- */
{
  const kod = src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(?<!:)\/\/[^\n]*/g,'');
  ok('CACHE adı sufle-vN biçiminde', /const CACHE\s*=\s*'sufle-v\d+'/.test(kod));
  ok('önbellek açılışlarında sabit CACHE kullanılıyor (elle yazılmış ad yok)',
     !/caches\.open\(\s*['"]/.test(kod));
  ok('ölü mesaj dinleyicisi kaldırıldı', !/addEventListener\('message'/.test(kod));
}

})();
