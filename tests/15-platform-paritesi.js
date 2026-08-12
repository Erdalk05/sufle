const {telefonYolu,macYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const mac=oku(macYolu());

/* PLATFORM PARİTE KAPISI
   v7.2'de dört hata bulundu ve dördü de aynı sebepten vardı: telefonda
   çözülen bir koruma Mac'e taşınmamıştı. Tek tek hata aramak bu örüntüyü
   yakalayamaz — kalıcı bir liste gerekiyor.

   Her satır bir KORUMA. Bir platformda varsa diğerinde de olmalı; olmayacaksa
   sebebi burada yazılı olmalı ("uygulanmaz"). Yeni koruma eklerken buraya da
   satır eklemek zorunludur; unutulursa bu kapı sessiz kalır ama en azından
   liste, hangi korumaların bilerek eşitlendiğini gösterir. */

const KORUMALAR = [
  // [ad, telefon deseni, mac deseni | 'uygulanmaz: sebep']
  ['Global hata yakalayıcı',        /addEventListener\('error'/,              /addEventListener\('error'/],
  ['İşlenmeyen promise reddi',      /unhandledrejection/,                     /unhandledrejection/],
  ['Hata günlüğü kullanıcıya görünür', /ERRLOG/,                              /ERRLOG/],
  ['MediaRecorder.onerror',         /rec\.onerror=/,                          /recorder\.onerror=/],
  ['Blob sonrası chunks bırakılır', /lastBlob=new Blob\(chunks[\s\S]{0,140}?chunks=\[\]/,
                                    /lastBlob=new Blob\(chunks[\s\S]{0,140}?chunks=\[\]/],
  ['Senaryo silme onayı',           /delConfirm/,                             /silBekle!==id/],
  ['Silinen senaryo geri getirilir',/restoreTrash|st\.trash/,                 /copGeriAl/],
  ['Kayıtta senaryo değiştirilemez',/recBusy/,                                /Kayıt sürerken senaryo değiştirilemez/],
  ['Ödünç ses izi durdurulmaz',     /cam0\.indexOf\(t\)<0/,                   /camTracks\.indexOf\(t\)<0/],
  ['Açık ses kısıtları',            /noiseSuppression/,                       /noiseSuppression/],
  ['Kaldığın yer hatırlanır',       /function rememberPos/,                   /function rememberPos/],
  ['Çekim arşivi',                  /indexedDB\.open\('sufle'/,               /indexedDB\.open\('teleprompter_pro'/],
  ['Arşiv yazımı doğrulanır',       /tx\.oncomplete=\(\)=>res\(true\)/,       /tx\.oncomplete=\(\)=>res\(true\)/],
  ['Çekime hazırlık kontrolü',      /function readyChecks/,                   /function readyChecks/],
  ['Altyazı videoya gömme',         /function drawCaption/,                   /function drawCaption/],
  ['Uzun kelime satıra sığdırılır', /function wrapLines/,                     /function wrapLines/],
  ['Sürüm numarası görünür',        /VER='[\d.]+'/,                           /VER='[\d.]+'/],

  // Bilerek tek platformda olanlar — sebebi yazılı
  ['Kalıcı depo isteği',            /navigator\.storage\.persist/,
     'uygulanmaz: Mac arşivi masaüstünde, tarayıcı tahliyesi telefondaki kadar agresif değil'],
  ['iOS tarayıcı uyarısı',          /IS_IOS_ALT/,
     'uygulanmaz: Mac"te iOS tarayıcı sorunu yok'],
  // BOŞLUK: "uygulanmaz" değil. Mac Web Audio için EN İYİ platform (iOS kısıtı yok).
  // Bunları muafiyet gibi etiketlemek boşluğu görünmez kılardı; ayrı kategori.
  ['Ses Stüdyosu zinciri',          /function makeFxTrack/,                   /function makeFxTrack/],
  ['Nefesle akış (VAD)',            /function vadKarar/,                      /function vadKarar/],
  ['Yüzen sufle (PiP)',             'uygulanmaz: Document PiP yalnız masaüstü tarayıcılarında',
                                    /documentPictureInPicture/],
  ['Kamera akışı yeniden bağlanır', /track ended/,
     'uygulanmaz: masaüstünde uygulama arka plana alınıp kamera düşmüyor'],
];

let hata=0, atlanan=0;
console.log('Koruma'.padEnd(38)+'Telefon  Mac');
console.log('─'.repeat(56));
for(const [ad, t, m] of KORUMALAR){
  const tVar = typeof t === 'string' ? null : t.test(tel);
  const mVar = typeof m === 'string' ? null : m.test(mac);
  const g = v => v===null ? ' —  ' : (v ? ' ✓  ' : ' ✗  ');
  let durum='';
  if(tVar===null || mVar===null){
    atlanan++;
    const eksikTaraf = tVar===null ? mVar : tVar;
    if(eksikTaraf===false){ hata++; durum='  ← BEKLENEN PLATFORMDA DA YOK'; }
  } else if(tVar!==mVar){
    hata++; durum='  ← PARİTE KIRIK';
  }
  console.log(ad.padEnd(38)+g(tVar)+'   '+g(mVar)+durum);
}
console.log('─'.repeat(56));
if(hata){
  console.log('✗ HATA '+hata+' korumada parite kırık');
  process.exitCode=1;
}else{
  console.log('✓ '+(KORUMALAR.length-atlanan)+' koruma iki platformda da var, '+atlanan+' tanesi gerekçeli tek platformda');
}

/* Mac'e taşınan ses zinciri telefonla AYNI sabitleri kullanmalı.
   Ayrışırlarsa iki platformda farklı ses çıkar ve kimse fark etmez. */
const say = (n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
console.log('');
const sabit = (src,ad) => (src.match(new RegExp(ad+':\\s*\\{[^}]*\\}'))||[''])[0].replace(/\s+/g,'');
['voice','noisy','studio'].forEach(k=>{
  say('FXP.'+k+' iki platformda birebir aynı', sabit(tel,k) && sabit(tel,k)===sabit(mac,k));
});
say('gürültü kapısı eşikleri aynı',
  /rms>=th\*1\.6\) return 1;/.test(tel) && /rms>=th\*1\.6\) return 1;/.test(mac));
// v8.9: taban 0.12'den 0.35'e cikarildi (0.12 = -18 dB, sesi yok ediyordu)
say('kapı asla tam sıfıra inmiyor (iki platformda)',
  /return 0\.35;/.test(tel) && /return 0\.35;/.test(mac));
say('VAD histerezisi aynı',
  /rms >= esik\*1\.5/.test(tel) && /rms >= esik\*1\.5/.test(mac));
say('VAD 500 ms bekleme eşiği aynı',
  /bosluk>=5/.test(tel) && /bosluk>=5/.test(mac));
say('Mac: zincir üretilemezse ham ize düşüyor', /fxTrack \? \[fxTrack\] : stream\.getAudioTracks\(\)/.test(mac));
say('Mac: kayıt bitince zincir bırakılıyor', /function stopFx\(\)/.test(mac) && /stopCrop\(\)\{\s*\n\s*stopFx\(\);/.test(mac));
say('Mac: kamera yenilenince ikisi de kapanıyor', /stopAudioFx\(\); vadDurdur\(\);/.test(mac));
say('Mac: kamera sonrası VAD yeniden kuruluyor', /if\(state\.vad\) setTimeout\(vadBaslat,300\)/.test(mac));
say('Mac: uğultu 120 Hz altından kesiliyor (telefonla aynı)',
  /hp\.frequency\.value=120/.test(tel) && /hp\.frequency\.value=120/.test(mac));

/* ── OTOMATİK ASİMETRİ TESPİTİ ──────────────────────────────────────────
   Yukarıdaki liste ELLE yazılıyor: listede olmayan bir koruma tek platformda
   kalırsa kapı sessiz kalır. Nitekim öyle oldu — WebGL kaynak bırakma ve
   kamera hata ayrımı listede yoktu, Mac'te de yoktu, kapı yeşil görünüyordu.

   Bu bölüm listeye bakmıyor: iki dosyanın KORUMA İZLERİNİ karşılaştırıyor.
   Her logErr etiketi korunmuş bir hata yolunu işaretler. Bir kavram bir
   tarafta korunuyor da diğerinde korunmuyorsa burada görünür. */
const jsT = tel.match(/<script>([\s\S]*)<\/script>/)[1];
const jsM = mac.match(/<script>([\s\S]*)<\/script>/)[1];
const etiketler = s => new Set([...s.matchAll(/logErr\('([A-Za-z0-9_]+)'/g)].map(m=>m[1]));

/* Aynı kavramın iki dosyadaki farklı adları. Buraya yazmak "eşdeğer sayıldı"
   demektir — muafiyet değil, isim eşlemesi. */
const ESDEGER = { dbPut:'idbPut', dbDel:'idbDel', restore:'import' };
const norm = (set) => new Set([...set].map(x => ESDEGER[x] || x));

const tE = norm(etiketler(jsT)), mE = norm(etiketler(jsM));
/* Platforma özgü olduğu kanıtlanmış etiketler — her biri gerekçeli. */
const SADECE_TELEFON = new Set(['persist','quota','mics','pickKey','softBg','voiceTest','measure','audmon','meter','bg']);
const SADECE_MAC     = new Set(['pip','remote','pos','burn','idb']);

const telFazla = [...tE].filter(x => !mE.has(x) && !SADECE_TELEFON.has(x));
const macFazla = [...mE].filter(x => !tE.has(x) && !SADECE_MAC.has(x));
say('telefonda korunup Mac\'te korunmayan hata yolu yok',
    telFazla.length===0 || (console.log('   → Mac\'te eksik:', telFazla), false));
say('Mac\'te korunup telefonda korunmayan hata yolu yok',
    macFazla.length===0 || (console.log('   → telefonda eksik:', macFazla), false));

/* Bu turda bulunan üç somut eksik — bir daha geri gelmesin */
say('Mac: GPU kaynakları gerçekten bırakılıyor',
    /deleteTexture/.test(jsM) && /deleteProgram/.test(jsM));
say('Mac: WebGL bağlam kaybı yakalanıyor', /webglcontextlost/.test(jsM));
say('Mac: bağlam kaybı kullanıcıya söyleniyor', /Kırpma koptu/.test(jsM));
say('Mac: kamera izni hatası ayrı', /NotAllowedError/.test(jsM));
say('Mac: kamera meşgul hatası ayrı', /NotReadableError/.test(jsM));
say('Mac: kamera yok hatası ayrı', /NotFoundError/.test(jsM));
say('iki platformda da GPU bırakma var',
    /deleteTexture/.test(jsT) && /deleteTexture/.test(jsM));

/* ── v8.9: MANTIK PARİTESİ (logErr etiketleriyle yakalanamayan sınıf) ──
   Otomatik tespit logErr izlerine bakıyor; ama "bir satır yukarısını vurgulama"
   gibi MANTIK hataları iz bırakmıyor. Telefonda v8.3'te düzeltilmişti, Mac'te
   iki tur daha yaşadı. Bu bölüm mantık paritesini de kilitliyor. */
console.log('');
say('en yakın satır seçimi iki platformda da var',
    /function yakinIdx\(y\)\{/.test(tel) && /function yakinIdx\(y\)\{/.test(mac));
say('Mac eski "son kelime" mantığını bırakmış',
    !/function highlightAt\(eyeY\)\{\s*\n\s*if\(!\(state\.hl && wordTops\.length\)\) return;\s*\n\s*let lo=0/.test(mac));
say('okuma çizgisi iki platformda aynı (%18)',
    /eyePos:18,/.test(tel) && /eyePos:18,/.test(mac));
say('Mac eski %42 değerinden taşınıyor', /state\.eyePos===42 && !state\.eyeTasindi/.test(mac));

/* Gürültü kapısı eşikleri ÖLÇÜLEREK kalibre edildi — iki platformda birebir aynı
   olmalı, yoksa aynı ortamda farklı ses çıkar. */
const kapiEsik = d => {
  const m=d.match(/voice:\s*\{hp:\d+,\s*gate:(\d+)/);
  return m ? +m[1] : null;
};
say('konuşma eşiği iki platformda aynı', kapiEsik(tel)!==null && kapiEsik(tel)===kapiEsik(mac));
say('eşik ölçülen konuşma aralığının ALTINDA (<3)', kapiEsik(tel)<3);
say('eşik oda gürültüsünün ÜSTÜNDE (>0.8)', kapiEsik(tel)>0.8);
const taban = d => { const m=d.match(/return (0\.\d+);\s*\n\s*\/\/ ortam gürültüsü|return (0\.\d+);\s*\/\/ %12/);
  return m ? parseFloat(m[1]||m[2]) : null; };
say('kapı tabanı iki platformda da yumuşak (>=0.3)',
    /return 0\.35;/.test(tel) && /return 0\.35;/.test(mac));
say('yıkıcı 0.12 tabanı kalmadı', !/return 0\.12;/.test(tel) && !/return 0\.12;/.test(mac));
