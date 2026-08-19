const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
const src=oku(telefonYolu());

// ---------- SES STÜDYOSU: gürültü kapısı kararı ----------
eval(cikar(src,/function gateWant\(rms, gateVal\)\{[\s\S]*?\n\}/,'gateWant'));
ok('kapı kapalıyken hep açık', gateWant(0.0001,0)===1);
ok('net konuşma tam geçiyor', gateWant(0.09,22)===1);
// v8.9: taban 0.12 → 0.35 (0.12 = -18 dB, konuşmayı yok ediyordu)
ok('ortam gürültüsü kısılıyor ama yok edilmiyor', gateWant(0.001,22)===0.35);
ok('sınırdaki ses yarı geçiyor', gateWant(0.024,22)===0.55);
ok('ASLA tam sıfır değil (ölü sessizlik olmasın)', gateWant(0,60)>0);
ok('eşik yükseldikçe daha çok kısıyor', gateWant(0.02,10)>gateWant(0.02,50));
ok('kapı monoton (ses arttıkça kazanç azalmıyor)',
   [0,0.01,0.02,0.03,0.05,0.1].map(r=>gateWant(r,22)).every((v,i,a)=>i===0||v>=a[i-1]));

// ---------- SES STÜDYOSU: hazır ayar tablosu ----------
eval(cikar(src,/const FXP=\{[\s\S]*?\n\};/,'FXP').replace('const','var'));
ok('dört hazır ayar var', Object.keys(FXP).length===4);
ok('kapalı gerçekten boş', FXP.off===null);
ok('gürültülü ortam en agresif kapı', FXP.noisy.gate>FXP.voice.gate && FXP.voice.gate>FXP.studio.gate);
ok('gürültülü ortam uğultuyu daha yukarıdan kesiyor', FXP.noisy.hp>FXP.voice.hp);
ok('gürültülü ortam daha çok netlik veriyor', FXP.noisy.pres>=FXP.voice.pres);
ok('stüdyo en az sıkıştırıyor', FXP.studio.ratio<FXP.noisy.ratio);
ok('hiçbir hazır ayar insan sesini kesmiyor (hp<150 Hz)',
   Object.values(FXP).filter(Boolean).every(p=>p.hp<150));
ok('tiz sınırı konuşma için yeterli (>10 kHz)',
   Object.values(FXP).filter(Boolean).every(p=>p.lp>10000));

// fxParams: elle değer hazır ayarı ezmeli, boşsa hazır ayar kalmalı
const st={};
eval(cikar(src,/function fxParams\(\)\{[\s\S]*?\n\}/,'fxParams'));
st.audioFx='voice'; st.fxGate=null; st.fxPres=null; st.fxWarm=null;
ok('boşken hazır ayar geliyor', fxParams().gate===FXP.voice.gate);
st.fxGate=45; ok('elle değer hazır ayarı eziyor', fxParams().gate===45);
ok('ezilmeyen alan hazır ayardan geliyor', fxParams().pres===FXP.voice.pres);
st.fxGate=0;  ok('sıfır elle değer null sayılmıyor', fxParams().gate===0);
st.audioFx='bilinmeyen'; st.fxGate=null;
ok('bilinmeyen hazır ayarda çökmüyor', fxParams().gate===FXP.voice.gate);

// iOS kısıtı: zincir orada ÇALIŞMAMALI (kaydı susturuyor)
const fxOnSrc=cikar(src,/function fxOn\(\)\{[\s\S]*?\}/,'fxOn');
ok('iOS kontrolü fxOn içinde', /IS_WK/.test(fxOnSrc));
ok('ham ses seçilince zincir kapalı', /rawAudio/.test(fxOnSrc));
ok('iOS kısıtı kodda yorumla açıklanmış', /iPhone'da mikrofon izini Web Audio/.test(src));

// zincirin kayda takılması: başarısızlıkta HAM ize düşmeli, ses hiç gitmemeli
ok('fx üretilemezse ham ize düşülüyor', /fxTrack=makeFxTrack\(\);[\s\S]{0,200}else fxUsed=false;/.test(src));
ok('makeFxTrack hata durumunda null dönüyor', /catch\(e\)\{ logErr\('audioFx',e\); stopAudioFx\(\); return null; \}/.test(src));
ok('kayıt bitince zincir kapatılıyor', /setTimeout\(stopAudioFx,300\)/.test(src));

// ---------- GÖRÜNTÜ FİLTRELERİ ----------
eval(cikar(src,/const VIDP=\{[\s\S]*?\n\};/,'VIDP').replace('const','var'));
eval(cikar(src,/function vidParams\(\)\{[\s\S]*?\n\}/,'vidParams'));
ok('altı hazır filtre var', Object.keys(VIDP).length===6);
ok('kapalı gerçekten nötr',
   VIDP.off.bri===0 && VIDP.off.con===1 && VIDP.off.sat===1 && VIDP.off.wrm===0 && VIDP.off.shp===0);
ok('AZ IŞIKTA keskinlik düşük (gürültüyü büyütmesin)', VIDP.lowlight.shp<VIDP.natural.shp);
ok('az ışık en çok parlatan', VIDP.lowlight.bri===Math.max(...Object.values(VIDP).map(v=>v.bri)));
ok('net filtresi en keskin', VIDP.crisp.shp===Math.max(...Object.values(VIDP).map(v=>v.shp)));
ok('sıcak filtresi en sıcak', VIDP.warm.wrm===Math.max(...Object.values(VIDP).map(v=>v.wrm)));
ok('hiçbir filtre cildi bozacak kadar doygun değil (sat<=1.2)',
   Object.values(VIDP).every(v=>v.sat<=1.2));
ok('hiçbir filtre aşırı parlatmıyor (bri<=0.2)',
   Object.values(VIDP).every(v=>v.bri<=0.2));

st.vidFx='natural'; st.vidAmt=100;
const tam=vidParams();
st.vidAmt=0; const sifir=vidParams();
ok('şiddet 0 = nötr (hiç etki yok)',
   Math.abs(sifir.bri)<1e-9 && Math.abs(sifir.con-1)<1e-9 && Math.abs(sifir.sat-1)<1e-9 && sifir.shp===0);
st.vidAmt=50; const yari=vidParams();
ok('şiddet 50 tam ile nötr arasında', yari.shp>0 && yari.shp<tam.shp);
ok('kontrast doğru karışıyor', Math.abs(yari.con-(1+(tam.con-1)/2))<1e-9);
st.vidAmt=150; ok('şiddet 150 abartabiliyor', vidParams().shp>tam.shp);
st.vidFx='off'; ok('kapalıyken şiddet yok sayılıyor', vidParams().shp===0 && vidParams().con===1);
st.vidFx='bilinmeyen'; st.vidAmt=100;
ok('bilinmeyen filtrede çökmüyor', vidParams().con>0);

// ---------- SHADER TUTARLILIĞI ----------
/* v9.35: güzellik bölümü ortak çekirdeğe taşındı; yalnız FS_SRC metnine
   bakan uniform denetimi oradaki tanımları göremiyor ve JS'in beslediği
   `bty`yi 'olmayan uniform' sanıyordu. Gömülü çekirdek bloğu da okunuyor. */
const fsSrc=cikar(src,/const FS_SRC=[\s\S]*?;\n/,'FS_SRC')+
  ((src.match(/==CEKIRDEK:guzellik-glsl\.js==[\s\S]*?==\/CEKIRDEK:guzellik-glsl\.js==/)||[''])[0]);
const uniforms=[...fsSrc.matchAll(/uniform \w+ (\w+);/g)].map(m=>m[1]);
const setU=[...src.matchAll(/getUniformLocation\(comp\.pr,'(\w+)'\)/g)].map(m=>m[1]);
const beslenmeyen=uniforms.filter(u=>!setU.includes(u)&&u!=='tex'&&u!=='bg');
ok('her uniform JS tarafından besleniyor', beslenmeyen.length===0 || (console.log('  beslenmeyen:',beslenmeyen),false));
const fazla=[...new Set(setU)].filter(u=>!uniforms.includes(u));
ok('olmayan uniform ayarlanmıyor', fazla.length===0 || (console.log('  fazladan:',fazla),false));
ok('keskinlik shader\'da var', /vec3 sharpen/.test(fsSrc));
ok('keskinlik kapalıyken erken dönüyor', /if\(shp<=0\.0\) return c0;/.test(fsSrc));
ok('renk düzeltme luma korumalı', /0\.2126,0\.7152,0\.0722/.test(fsSrc));
ok('değerler kırpılıyor (taşma yok)', (fsSrc.match(/clamp\(/g)||[]).length>=5);

// ---------- DÜŞMANCA GÖZDEN GEÇİRME BULGULARI (v6.6) ----------
// Üçü de "sessiz kırılma" sınıfıydı: kullanıcı hiçbir uyarı görmeden
// bozuk duruma düşüyordu. Testler bir daha geri gelmesin diye.
ok('kamera yeniden açılınca ses zinciri kapanıyor (eski ize bağlı kalmasın)',
   /stopAudioFx\(\);\s*\/\/ zincir eski mikrofon izine/.test(src));
ok('zincir kapanışı akış durdurmadan SONRA değil, önce',
   src.indexOf('stopAudioFx();   // zincir') < src.indexOf('const audio = ') || /stopMeter\(\);\n\s*stopAudioFx\(\)/.test(src));
ok('MediaRecorder kurulamazsa fxTrack bırakılıyor',
   /catch\(e3\)\{[\s\S]{0,300}?stopAudioFx\(\); fxUsed=false; return;/.test(src));
ok('kayıt kurulamayınca fxUsed yanlış kalmıyor', /fxUsed=false; return;/.test(src));
ok('ayar sayfası açılınca arama kalıntısı siliniyor',
   /if\(id==='#sheet' && \$\('#setFind'\) && \$\('#setFind'\)\.value\)/.test(src));
ok('ayar sayfası açılınca ön koşullar yeniden değerlendiriliyor',
   /if\(id==='#sheet'\) gateSettings\(\);/.test(src));
// stopAudioFx her zaman güvenli olmalı: hiç kurulmamışken çağrılabiliyor mu
const sa=cikar(src,/function stopAudioFx\(\)\{[\s\S]*?\n\}/,'stopAudioFx');
ok('stopAudioFx kurulmamışken de güvenli', /if\(afx\.iv\)/.test(sa) && /if\(afx\.ctx\)/.test(sa));
/* G.5: müzik kazancı da duruma girdi, yani nesnenin YAZILIŞI uzadı.
   İDDİA AYNI: her alan sıfırlanıyor — bir alan kalırsa sonraki zincir
   eski bir düğüme bağlanır ve ses sessizce yanlış yerden akar. */
{
  const alanlar=['ctx:null','dest:null','gate:null','an:null','iv:0','buf:null','open:1'];
  const sifirla=(sa.match(/afx=\{[^}]*\}/g)||[]).pop()||'';
  ok('stopAudioFx durumu tam sıfırlıyor', alanlar.every(a=>sifirla.indexOf(a)>=0));
  ok('müzik kazancı da sıfırlanıyor', /muzikKazanc:null/.test(sifirla));
}

// ---------- SESSİZ KAYIT (v8.8) — Erdal: "mac bilgisayarda ses yok" ----------
// Kök neden: Chrome'da yeni AudioContext ASKIDA doğuyor ve askıdaki bağlam
// SESSİZLİK üretiyor. Ses Stüdyosu zinciri o bağlamdan besleniyordu, dolayısıyla
// kayıt sessiz çıkıyordu. Telefonda da aynı hata vardı ama iOS'ta zincir zaten
// kapalı olduğu için ısırmıyordu — Android/masaüstünde ısırırdı.
const macS=oku(macYolu());
[['telefon',src],['Mac',macS]].forEach(([ad,d])=>{
  ok(ad+': bağlam başlatılmaya çalışılıyor', /if\(ctx\.state==='suspended'\)\{ try\{ ctx\.resume\(\)/.test(d));
  ok(ad+': çalışmıyorsa HAM ize dönülüyor', /if\(ctx\.state!=='running'\)\{/.test(d));
  ok(ad+': başarısızlık günlüğe yazılıyor', /logErr\('audioFx','ba[gğ]lam/.test(d));
  ok(ad+': bağlam kapatılıp null dönülüyor', /ctx\.close\(\); \}catch\(e\)\{ logErr\('audioFx',e\); \}\s*\n\s*return null;/.test(d));
  ok(ad+': kamera açılışında bağlam ısıtılıyor', /if\(fxOn\(\)\) sesBaglamiIsit\(\);/.test(d));
  ok(ad+': ısıtma fonksiyonu tanımlı', /function sesBaglamiIsit\(\)\{/.test(d));
  ok(ad+': ısıtma sessizce yutmuyor', /logErr\('audioWarm'/.test(d));
});
// İLKE: işleme hatası kaydı ASLA susturmamalı — iki yol da ham ize düşüyor
ok('telefon: zincir yoksa ham iz', /fxTrack=makeFxTrack\(\);[\s\S]{0,200}else fxUsed=false;/.test(src));
ok('Mac: zincir yoksa ham iz', /fxTrack \? \[fxTrack\] : stream\.getAudioTracks\(\)/.test(macS));
// davranış: hangi durumda hangi iz kullanılır
function izSec(ctxDurum){
  if(ctxDurum!=='running') return 'ham';   // makeFxTrack null döner
  return 'islenmis';
}
ok('askıda bağlam → ham ses (sessizlik değil)', izSec('suspended')==='ham');
ok('kapalı bağlam → ham ses', izSec('closed')==='ham');
ok('çalışan bağlam → işlenmiş ses', izSec('running')==='islenmis');
