const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
/* v9.36: bu fonksiyonların metinleri sözlüğe taşındı; tezgâh GERÇEK
   sözlüğü yükleyip t() sağlıyor. Sahte metin uydursaydık sözlükten
   silinen bir anahtar burada sessizce geçerdi.
   (Yorumda ters tırnak yok: şablon dizelerinin içine giriyor.) */
const {cekirdekOku:_co2}=require('./kaynak.js');
const SOZ_T=_co2('sozluk.js','SUFLE_SOZLUK').replace(/\/\*[\s\S]*?\*\//g,'')+
  "\nglobalThis.I18N=I18N; globalThis.t=(k)=>I18N[globalThis.L||'tr'][k];";
const tel=oku(telefonYolu());
const mac=oku(macYolu());

/* NEDEN BU DOSYA VAR
   12 Ağustos'ta "ses çok kısık" yanlış alarmı düzeltildi: ölçüt ORTALAMA
   iken SON SANİYELERİN TEPESİ oldu. Düzeltmeden önce de sonra da kapı
   732/0 veriyordu — yani 20 test dosyasının hiçbiri bu mantığa dokunmuyordu.
   Düzeltme yarın sessizce geri gelse kimse fark etmezdi.

   Bu dosyanın kabul ölçütü kendini kanıtlar: eski `sum/n<0.04` mantığına
   geri dönülürse aşağıdaki testlerin EN AZ DÖRDÜ kırılmalı. Kırılmıyorsa
   test yalan söylüyor demektir.

   Mantık kopyalanmıyor: gerçek kaynaktan çıkarılıp sentetik ses kareleriyle
   koşuluyor (deponun kural haline gelmiş test deseni). */

/* ---------- Sentetik ses karesi ----------
   lvl = max|buf[i]-128| / 128. Bir baytı kaydırarak istediğimiz seviyeyi
   birebir üretiyoruz — yuvarlama belirsizliği kalmasın diye 128'lik
   kesirler kullanıyoruz (8/128 = 0.0625 gibi). */
const SESSIZ = 0;     // lvl 0
const COK_KISIK = 8;  // lvl 0.0625  → 0.02 ile 0.12 arasında: "gerçekten kısık"
const FISILTI = 1;    // lvl 0.0078  → 0.02 altında: "henüz ses yok"
const IYI = 64;       // lvl 0.5
const KIRPAN = 127;   // lvl 0.9921  → 0.96 üstü

/* Çıkarılan startAudioMonitor'ü gerçekten koşturan tezgâh. Tarayıcı
   nesnelerinin yerine ölçülebilir sahteleri konuyor; ölçtüğümüz şey
   yalnızca rozet kararı. */
function tezgah(fnSrc, macMi){
  const rozetler = [];
  let cb = null, ofset = 0;

  const AC = function(){
    this.state = 'running';
    this.resume = () => Promise.resolve();
    this.close = () => {};
    this.createMediaStreamSource = () => ({ connect(){} });
    this.createAnalyser = () => ({
      fftSize: 512,
      frequencyBinCount: 256,
      connect(){},
      getByteTimeDomainData(buf){ buf.fill(128); buf[0] = 128 + ofset; }
    });
  };

  const kur = new Function('__AC','__rozet','__setCb','__Uint8Array', `
    let audMon=null, audStats=null, audWarned=false, sonTepeler=[];
    let aTrack=1;
    const stream={ getAudioTracks:()=>[1] };
    const window={ AudioContext:__AC };
    const MediaStream=function(){};
    const Uint8Array=__Uint8Array;
    const setAudBadge = mode => __rozet(mode);
    const stopAudioMonitor = () => {};
    const clearInterval = () => {};
    const setInterval = (f,ms) => { __setCb(f,ms); return 1; };
    const toast=()=>{}, buzz=()=>{}, m=()=>'', logErr=()=>{}, $=()=>null;
    ${fnSrc}
    startAudioMonitor();
    return { durum:()=>audStats, tepeler:()=>sonTepeler };
  `);

  const h = kur(AC, m => rozetler.push(m), (f,ms) => { cb = f; tezgah.ms = ms; }, Uint8Array);
  return {
    /* n kare boyunca verilen seviyeyi besler, son rozeti döndürür */
    besle(seviye, n){ ofset = seviye; for(let i=0;i<n;i++) cb(); return rozetler[rozetler.length-1]; },
    rozetler, durum: h.durum, tepeler: h.tepeler, macMi
  };
}

const telFn = cikar(tel, /function startAudioMonitor\(\)\{[\s\S]*?\n\}/, 'telefon startAudioMonitor');
const macFn = cikar(mac, /function startAudioMonitor\(\)\{[\s\S]*?\n  \}/, 'Mac startAudioMonitor');

for (const [ad, fnSrc, macMi] of [['telefon', telFn, false], ['Mac', macFn, true]]) {

  // 1. SESSİZLİK YARGILANMAZ — düzeltmenin ta kendisi.
  //    Eski mantık: n>12 && avg(0)<0.04 → 'low'. Kullanıcı daha konuşmadan
  //    "mikrofona yaklaş" diyordu. AYIRT EDİCİ.
  ok(ad+': kayıt başında sessizlik "kısık" saymıyor',
     tezgah(fnSrc, macMi).besle(SESSIZ, 40) === 'ok');

  ok(ad+': 0.02 altındaki fısıltı da yargılanmıyor',
     tezgah(fnSrc, macMi).besle(FISILTI, 40) === 'ok');

  // 2. GERÇEKTEN KISIK SES YAKALANIYOR — ters yönde ayırt edici.
  //    Eski mantık avg 0.0625 > 0.04 olduğu için 'ok' derdi; kısık sesi KAÇIRIYORDU.
  ok(ad+': ses var ama kısıksa uyarıyor',
     tezgah(fnSrc, macMi).besle(COK_KISIK, 40) === 'low');

  ok(ad+': normal seviyede uyarmıyor',
     tezgah(fnSrc, macMi).besle(IYI, 40) === 'ok');

  // 3. KIRPMA HER ŞEYDEN ÖNCELİKLİ
  ok(ad+': kırpan ses "clip" rozeti veriyor',
     tezgah(fnSrc, macMi).besle(KIRPAN, 3) === 'clip');

  // 4. ÖLÇÜT ORTALAMA DEĞİL, KAYAN PENCERENİN TEPESİ
  //    Uzun sessizlikten sonra tek bir yüksek kare rozeti hemen düzeltmeli;
  //    ortalama tabanlı mantıkta bu mümkün değildi.
  const t1 = tezgah(fnSrc, macMi);
  t1.besle(SESSIZ, 60);
  ok(ad+': uzun sessizlikten sonra tek konuşma karesi anında toparlıyor',
     t1.besle(IYI, 1) === 'ok');

  //    Ve tersi: yüksek sesten sonra pencere dolunca eski tepe UNUTULMALI,
  //    yoksa "tepe" ölçütü kayıt boyu takılı kalırdı.
  const t2 = tezgah(fnSrc, macMi);
  t2.besle(IYI, 30);
  t2.besle(SESSIZ, 30);
  ok(ad+': tepe penceresi kayıyor (eski yüksek tepe takılı kalmıyor)',
     Math.max.apply(null, t2.tepeler()) === 0);

  ok(ad+': pencere sınırlı (en fazla 30 örnek ~3 sn)',
     t2.tepeler().length === 30);

  // 5. KAYIT BOYU TEPE (maxTepe) ÖZET İÇİN AYRICA TUTULUYOR — pencereden farklı.
  const t3 = tezgah(fnSrc, macMi);
  t3.besle(IYI, 5);
  t3.besle(SESSIZ, 50);
  ok(ad+': maxTepe kayıt boyunca korunuyor (özet bunu kullanıyor)',
     t3.durum().maxTepe >= 0.49);
}

/* ---------- ÇEKİM SONU ÖZETİ ----------
   Rozetle aynı hatayı özet satırı da yapıyordu: ortalamaya bakıp
   "🔈 Ses çok kısık" yazıyordu. */
function ozet(src, macMi, audStats){
  const re = macMi ? /function audSummary\(\)\{[\s\S]*?\n  \}/ : /function audSummary\(\)\{[\s\S]*?\n\}/;
  const fnSrc = cikar(src, re, 'audSummary');
  /* Telefonda eşikler 2026-08-13'te sesKodu()'ya çıkarıldı (arşive de yazılan
     değerlendirme aynı kaynaktan gelsin diye). audSummary artık onu çağırıyor,
     dolayısıyla tezgâhta da bulunmalı — yoksa bu dosya sessizce çöker.
     Mac'te böyle bir ayrım yok. */
  const kodSrc = macMi ? '' : cikar(src, /function sesKodu\(\)\{[\s\S]*?\n\}/, 'sesKodu');
  const kur = new Function('__stats', `
    ${SOZ_T}
    /* Yer tutucu dolduran yardımcı üst seviyede yaşıyor; tezgâh aynısını
       sağlıyor ki çıkarılan fonksiyon çalışsın. */
    const srY=(m,d)=>{ for(const x in (d||{})) m=m.split('{'+x+'}').join(d[x]); return m; };
    const audStats=__stats;
    let aTrack=1;
    const stream={ getAudioTracks:()=>[1] };
    const L='tr';
    ${kodSrc}
    ${fnSrc}
    return audSummary();
  `);
  return kur(audStats);
}

for (const [ad, src, macMi] of [['telefon', tel, false], ['Mac', mac, true]]) {
  // Uzun sessizlik + kısa konuşma: ortalama 0.005, tepe 0.5.
  // Eski mantık (avg<0.05) "çok kısık" derdi — YANLIŞ. AYIRT EDİCİ.
  ok(ad+' özeti: çoğu sessiz ama sesi iyi olan çekime "kısık" demiyor',
     /iyi|good/i.test(ozet(src, macMi, {n:100, sum:0.5, clip:0, maxTepe:0.5})));

  // Tersi: ortalama 0.05 ama hiç tepe yapmamış — gerçekten kısık.
  // Eski mantık (0.05 < 0.05 değil) "iyi" derdi — KAÇIRIYORDU. AYIRT EDİCİ.
  ok(ad+' özeti: baştan sona kısık çekimi yakalıyor',
     /k[ıi]s[ıi]k|quiet/i.test(ozet(src, macMi, {n:100, sum:5, clip:0, maxTepe:0.05})));

  ok(ad+' özeti: kırpma her şeyden önce raporlanıyor',
     /k[ıi]rp|clip/i.test(ozet(src, macMi, {n:100, sum:50, clip:5, maxTepe:0.99})));

  ok(ad+' özeti: hiç kare ölçülmediyse sessiz kalıyor',
     ozet(src, macMi, {n:0, sum:0, clip:0, maxTepe:0}) === '');
}

/* ---------- EŞİK SABİTLERİ VE PLATFORM PARİTESİ ----------
   Sabitler sessizce kayarsa yukarıdaki testler hâlâ geçebilir
   (örn. 0.12 → 0.5 yapılsa "kısık" tanımı ürünü kullanılmaz kılar). */
const esik = s => {
  const m = s.match(/if\(tepe<([\d.]+)\) setAudBadge\('ok'\);[\s\S]{0,80}?else if\(tepe<([\d.]+)\) setAudBadge\('low'\)/);
  if(!m) throw new Error('rozet eşikleri kaynakta bulunamadı');
  return { sessiz: parseFloat(m[1]), kisik: parseFloat(m[2]) };
};
const eT = esik(tel), eM = esik(mac);
ok('sessizlik eşiği makul (0.005-0.05)', eT.sessiz>=0.005 && eT.sessiz<=0.05);
ok('kısıklık eşiği makul (0.05-0.25)', eT.kisik>=0.05 && eT.kisik<=0.25);
ok('sessizlik eşiği kısıklık eşiğinin altında', eT.sessiz < eT.kisik);
ok('telefon ve Mac aynı eşiklerde (parite)',
   eT.sessiz===eM.sessiz && eT.kisik===eM.kisik);

/* Boşluğa toleranslı olmalı: eşik 2026-08-13'te sesKodu()'ya taşınırken
   `) < 0.12` diye boşluklu yazıldı ve katı desen eşleşmeyince bu dosya
   ISTISNA ATIP ÖLDÜ — hiç "HATA" satırı basmadan. Testin çökmesiyle
   testin geçmesi dışarıdan aynı görünebiliyor; çıkış kodu bakılmazsa fark
   edilmez. Desenler koda değil, koda dair İDDİAYA bağlı olmalı. */
const ozetEsik = s => parseFloat(s.match(/audStats\.maxTepe\s*\|\|\s*0\)\s*<\s*([\d.]+)\)/)[1]);
ok('özet eşiği rozet eşiğiyle aynı (telefon)', ozetEsik(tel) === eT.kisik);
ok('özet eşiği rozet eşiğiyle aynı (Mac)', ozetEsik(mac) === eM.kisik);

/* Ortalamaya geri dönüşün doğrudan kilidi: rozet kararında sum/n görünmemeli. */
const rozetKarari = s => s.match(/sonTepeler\.push[\s\S]*?setAudBadge\('ok'\);\s*\n?\s*\}/)[0];
ok('rozet kararı ortalamaya (sum/n) dayanmıyor — telefon',
   !/audStats\.sum\s*\/\s*audStats\.n/.test(rozetKarari(tel)));
ok('rozet kararı ortalamaya (sum/n) dayanmıyor — Mac',
   !/audStats\.sum\s*\/\s*audStats\.n/.test(rozetKarari(mac)));
