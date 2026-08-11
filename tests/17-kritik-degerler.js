const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
const src=oku(telefonYolu());
const mac=oku(macYolu());
/* DİKKAT: yorum ayıklayıcı '//' STRING'ini de yorum sanıp siliyor
   (işaretleme dilindeki `if(tok==='//')` bundan bozuldu). O yüzden ayıklanmış
   sürüm yalnız SAYI/SIRA aramalarında kullanılıyor; eval edilecek kod HAM. */
const kod = t => t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(?<!:)\/\/[^\n]*/g,'');
const jsHam = src.match(/<script>([\s\S]*)<\/script>/)[1];
const js = kod(jsHam);

/* NEDEN BU DOSYA VAR
   Kapıya kasten hata enjekte edip neyi kaçırdığını ölçtüm. Dört bozulma
   sızdı ve hepsinin sebebi aynıydı: testlerim desenin VAR OLDUĞUNU kontrol
   ediyordu, DEĞERİN DOĞRU olduğunu değil.

   En sinsi örnek: `await navigator.storage.persist()` çağrısını `false` ile
   değiştirdim. Bir satır yukarıda `navigator.storage.persist` yazısı hâlâ
   duruyordu, varlık testi geçti — koruma ise tümüyle ölmüştü.

   Bu dosya SAYILARA bakıyor. Bir sabit sessizce değişirse burada patlar. */

const sayi = (re, ad) => {
  const m = js.match(re);
  if(!m) throw new Error('sabit bulunamadı: ' + ad);
  return parseFloat(m[1]);
};

// ---------- HIZ SINIRLARI ----------
// 900 wpm'lik bir sufle okunamaz; sınırın sessizce açılması ürünü kullanılmaz yapar.
const wpmUst = sayi(/Math\.min\((\d+),Math\.max\(40,st\.wpm\+d\)\)/, 'wpm üst sınırı');
const wpmAlt = sayi(/Math\.min\(\d+,Math\.max\((\d+),st\.wpm\+d\)\)/, 'wpm alt sınırı');
ok('WPM üst sınırı insan hızında (250-360)', wpmUst>=250 && wpmUst<=360);
ok('WPM alt sınırı makul (20-60)', wpmAlt>=20 && wpmAlt<=60);
ok('alt sınır üstten küçük', wpmAlt < wpmUst);
ok('kaydırıcı da aynı sınırlarda',
   new RegExp('id="wpm" min="'+wpmAlt+'" max="'+wpmUst+'"').test(src));

// ---------- KAYIT GÖZCÜSÜ ----------
// 2,5 sn yerine 300 sn yazılsa gözcü hiç ateşlenmez ama "var" görünür.
const gozcu = sayi(/if\(!IS_WK && !chunks\.length\) toast\(m\('recNoData'\)\);\s*\n\s*\},(\d+)\)/, 'kayıt gözcüsü');
ok('kayıt gözcüsü 1-10 sn arasında', gozcu>=1000 && gozcu<=10000);

// ---------- SES İŞLEME EŞİKLERİ ----------
// Kesin çapa: gateWant'in SON dönüşü taban değeridir. Genel `return 0.x`
// deseni yarı-açık eşiği (0.55) yakalıyordu — yanlış sabiti ölçüyordum.
const gateWantSrc = cikar(js, /function gateWant\([\s\S]*?\n\}/, 'gateWant');
const kapiTaban = parseFloat(gateWantSrc.match(/return (0\.\d+);\s*\n\}/)[1]);
ok('gürültü kapısı tabanı 0 ile 0.3 arasında (ölü sessizlik yok)', kapiTaban>0 && kapiTaban<=0.3);
const vadBekle = sayi(/vad\.bosluk>=(\d+)/, 'VAD bekleme');
ok('VAD bekleme 3-15 kare arası (0.3-1.5 sn)', vadBekle>=3 && vadBekle<=15);
const vadHp = sayi(/hp\.frequency\.value=(\d+);\s*$/m, 'VAD uğultu kesme');
ok('VAD uğultu kesme 80-200 Hz (insan sesini kesmiyor)', vadHp>=80 && vadHp<=200);

// ---------- ALTYAZI ----------
const capCh = sayi(/CAP_MAXCH=(\d+)/, 'altyazı satır uzunluğu');
const capSec = sayi(/CAP_MAXSEC=([\d.]+)/, 'altyazı süresi');
ok('altyazı satırı okunabilir uzunlukta (25-50 karakter)', capCh>=25 && capCh<=50);
ok('altyazı süresi 1.5-5 sn arası', capSec>=1.5 && capSec<=5);

// ---------- YUMUŞAK DURUŞ / RAMPA ----------
const fren = sayi(/near<60 \? Math\.max\((0\.\d+), near\/60\) : 1/, 'duruş freni');
ok('duruş freni asla sıfır değil (kilitlenme yok)', fren>0 && fren<0.5);

// ---------- ÇAĞRI GERÇEKTEN YAPILIYOR MU (varlık değil, ÇAĞRI) ----------
// 'navigator.storage.persist' yazısının bulunması yetmez; ÇAĞRILMASI gerekir.
ok('kalıcı depo GERÇEKTEN isteniyor', /await navigator\.storage\.persist\(\)/.test(js));
ok('kalıcı depo durumu GERÇEKTEN okunuyor', /await navigator\.storage\.persisted\(\)/.test(js));
ok('MediaRecorder GERÇEKTEN başlatılıyor', /rec\.start\(\); else rec\.start\(1000\)/.test(js));
ok('ses zinciri GERÇEKTEN kurulup takılıyor', /fxTrack=makeFxTrack\(\);/.test(js));

// ---------- VURGU AYRIŞTIRMA: davranış, desen değil ----------
const st={bionic:false};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
eval(cikar(jsHam,/function bionic\(w\)\{[\s\S]*?\n\}/,'bionic'));
eval(cikar(jsHam,/function markup\(raw\)\{[\s\S]*?\n\}/,'markup'));
const em = t => /class="w em"/.test(markup(t));
ok('*x* vurgulu', em('*x*'));
ok('**x** vurgulu', em('**x**'));
ok('***x** vurgulu DEĞİL (dengesiz yıldız)', !em('***x**'));
ok('**x*** vurgulu DEĞİL', !em('**x***'));
ok('***x*** vurgulu DEĞİL', !em('***x***'));
ok('*x vurgulu değil', !em('*x'));
ok('x* vurgulu değil', !em('x*'));
ok('düz kelime vurgulu değil', !em('x'));

// ---------- MAC SABİTLERİ TELEFONLA AYNI ----------
const macJs = kod(mac.match(/<script>([\s\S]*)<\/script>/)[1]);
const macSayi = (re,ad) => { const m=macJs.match(re); if(!m) throw new Error('Mac: '+ad); return parseFloat(m[1]); };
const macGate = cikar(macJs, /function gateWant\([\s\S]*?\n  \}/, 'Mac gateWant');
ok('Mac gürültü kapısı tabanı telefonla aynı',
   parseFloat(macGate.match(/return (0\.\d+);\s*\n  \}/)[1])===kapiTaban);
ok('Mac VAD beklemesi telefonla aynı', macSayi(/vad\.bosluk>=(\d+)/,'bekleme')===vadBekle);
ok('Mac VAD uğultu kesmesi telefonla aynı', macSayi(/hp\.frequency\.value=(\d+);\s*$/m,'hp')===vadHp);
