const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());

/* ÇEKİM NOTU + SES DEĞERLENDİRMESİ (arşiv)
   Aynı senaryodan beş çekim yapınca hangisinin NEDEN iyi olduğu unutuluyordu.
   ⭐ "en iyi"yi işaretliyor ama sebebini tutmuyor.

   Elle 1-5 puan yerine iki şey eklendi:
     · not  — kullanıcının kendi cümlesi ("ses iyiydi, ışık kötüydü")
     · ses  — UYGULAMANIN ZATEN ÖLÇTÜĞÜ değerlendirme; sonuç ekranında
              gösterilip atılıyordu, artık arşive de yazılıyor
   Ölçülmemiş bir "tempo" sayısı bilerek EKLENMEDİ: gösterilen her sayının
   doğrulanabilir olması gerekiyor. */

/* ---------- SES DEĞERLENDİRMESİ TEK KAYNAKTAN ----------
   Eşikler hem rozet/özet hem arşiv için aynı yerden gelmeli; iki yere
   yazılırsa biri değişir, arşiv sonuç ekranıyla çelişir. */
const sesKoduSrc = cikar(tel, /function sesKodu\(\)\{[\s\S]*?\n\}/, 'sesKodu');
const kod = (audStats, aTrackVar=1) => new Function('__s','__a', `
  const audStats=__s; const aTrack=__a;
  ${sesKoduSrc}
  return sesKodu();
`)(audStats, aTrackVar);

ok('hiç ölçüm yoksa kod boş (arşive yazılmaz)', kod({n:0}) === '');
ok('mikrofon yoksa "none"', kod({n:10,clip:0,maxTepe:0.5}, null) === 'none');
ok('kırpan kayıt "clip"', kod({n:100,clip:5,maxTepe:0.99}) === 'clip');
ok('kısık kayıt "low"', kod({n:100,clip:0,maxTepe:0.05}) === 'low');
ok('iyi kayıt "ok"', kod({n:100,clip:0,maxTepe:0.5}) === 'ok');
ok('kırpma kısıklıktan önce gelir', kod({n:100,clip:5,maxTepe:0.01}) === 'clip');

const audSum = cikar(tel, /function audSummary\(\)\{[\s\S]*?\n\}/, 'audSummary');
ok('özet eşikleri kendi içinde tekrarlamıyor (tek kaynak)',
   !/0\.12/.test(audSum) && /sesKodu\(\)/.test(audSum));

/* ---------- ARŞİVE YAZILIYOR MU ---------- */
const autoSave = cikar(tel, /async function autoSaveTake\(\)\{[\s\S]*?\n\}/, 'autoSaveTake');
ok('çekim arşivlenirken ses değerlendirmesi de yazılıyor', /ses:sesKodu\(\)/.test(autoSave));

/* ---------- LİSTEDE GÖSTERİLİYOR MU ---------- */
const render = cikar(tel, /async function renderTakes\(\)\{[\s\S]*?\n\}/, 'renderTakes');
ok('liste ses rozetini gösteriyor', /sesRozeti\(it\.ses\)/.test(render));
ok('liste notu gösteriyor', /it\.not/.test(render));
ok('not düğmesi var', /data-a="note"/.test(render));
ok('not düğmesi adlandırılmış (ekran okuyucu)',
   /data-a="note" aria-label="'\+m\('takeNote'\)/.test(render));
ok('not kayıt sürerken açılmıyor (donma kapısı)',
   /data-a="note"[\s\S]{0,400}?rec\.state==='recording'/.test(render));
ok('not diske yazılıyor', /it\.not=[\s\S]{0,60}?dbPut\(it\)/.test(render));
ok('not uzunluğu sınırlı (liste taşmasın)', /it\.not=n\.trim\(\)\.slice\(0,\d+\)/.test(render));

/* ---------- ROZET EŞLEMESİ ---------- */
const rozet = k => new Function('__k', `
  ${cikar(tel, /function sesRozeti\(k\)\{[\s\S]*?\n\}/, 'sesRozeti')}
  return sesRozeti(__k);
`)(k);
ok('"ok" rozeti 🔊', rozet('ok') === '🔊');
ok('"low" rozeti 🔈', rozet('low') === '🔈');
ok('"clip" rozeti ⚠️', rozet('clip') === '⚠️');
ok('"none" rozeti 🔇', rozet('none') === '🔇');

/* ---------- GERİYE DÖNÜK UYUMLULUK (asıl risk) ----------
   ses/not alanları 2026-08-13'te eklendi. ONDAN ÖNCEKİ çekimlerde bu alanlar
   YOK. Arşiv açılırken undefined'a dokunmak listeyi tümden boş bırakırdı —
   kullanıcı bütün çekimlerini kaybettiğini sanardı. */
ok('bilinmeyen/eksik kod rozet üretmiyor', rozet(undefined) === '' && rozet('') === '');
ok('eski kayıtta rozet satırı hiç eklenmiyor', /\(sesR\?' · '\+sesR:''\)/.test(render));
ok('eski kayıtta not satırı hiç eklenmiyor', /\(notu\?'<div class="s"/.test(render));
ok('not okunurken undefined korunuyor', /\(it\.not\|\|''\)\.trim\(\)/.test(render));

/* Eski kayıt nesnesiyle satır kurma mantığını gerçekten koşturuyoruz. */
function satir(it){
  return new Function('__it', `
    const it=__it;
    const esc=s=>String(s);
    ${cikar(tel, /function sesRozeti\(k\)\{[\s\S]*?\n\}/, 'sesRozeti')}
    const sesR=sesRozeti(it.ses), notu=(it.not||'').trim();
    return (sesR?' · '+sesR:'') + (notu?'|NOT:'+notu:'');
  `)(it);
}
ok('ESKİ kayıt (ses/not alanı yok) satırı sorunsuz kuruyor',
   satir({id:'a',title:'Eski çekim',dur:12}) === '');
ok('YENİ kayıt rozet ve notu birlikte gösteriyor',
   satir({ses:'ok',not:'ışık iyiydi'}) === ' · 🔊|NOT:ışık iyiydi');
ok('yalnız ses varken not satırı çıkmıyor', satir({ses:'low'}) === ' · 🔈');
ok('yalnız not varken rozet çıkmıyor', satir({not:'tekrar çek'}) === '|NOT:tekrar çek');
ok('boş not satır açmıyor', satir({not:'   '}) === '');

/* ---------- İKİ DİLLİ ---------- */
ok('not metinleri iki dilde tanımlı',
   (tel.match(/takeNote:'/g)||[]).length >= 2 && (tel.match(/takeNotePrompt:'/g)||[]).length >= 2);
