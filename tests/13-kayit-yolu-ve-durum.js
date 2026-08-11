const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const src=oku(telefonYolu());
const js=src.match(/<script>([\s\S]*)<\/script>/)[1];

/* SIRA testleri kodu ölçmeli, YORUMU değil: ilk denememde 'reset()' ifadesi
   bir açıklama satırında geçtiği için test yanlış yerde kırıldı. Yorumları at. */
const kod = t => t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(?<!:)\/\/[^\n]*/g,'');

/* Bu dosya kayıt yolunun SIRA ve DURUM kurallarını kilitliyor.
   Bu projede en pahalı hatalar hep sıra hatası oldu: konum okunmadan
   sıfırlanması, süre ölçülmeden recT'nin silinmesi, ödünç izin durdurulması. */

// ---------- BAYAT MİKROFON SEÇİMİ (bu turda bulundu) ----------
ok('seçili mikrofon yoksa seçim temizleniyor', /if\(st\.micId\)\{\s*\n\s*st\.micId=null; save\(\);/.test(js));
ok('temizlik sonrası ham ses ayarı KORUNUYOR',
   /const audio2 = st\.rawAudio[\s\S]{0,120}?echoCancellation:false/.test(js));
ok('kullanıcıya sebebi söyleniyor', /toast\(m\('micGone'\)\)/.test(js));
ok('mikrofon listesi yenileniyor', /setTimeout\(setupMics,300\)/.test(js));
ok('son çare sade istek hâlâ duruyor (iOS yolu)', /audio:true\}\);\s*\n\s*toast\(m\('audioFallback'\)\)/.test(js));
ok('ikinci aşama yalnız akış yoksa koşuyor', /if\(!stream\)\{\s*\n\s*stream=await navigator\.mediaDevices\.getUserMedia\(\{video:vSade/.test(js));

// ---------- SIRA KURALLARI (geçmişte üç kez kırıldı) ----------
const stopRec=kod(cikar(js,/function stopRec\(\)\{[\s\S]*?\n\}/,'stopRec'));
ok('süre recT sıfırlanmadan ÖNCE ölçülüyor',
   stopRec.indexOf('pendingDur=recElapsed()') < stopRec.indexOf('recT=0'));
ok('kayıt durunca ışık gözcüsü kapanıyor', /clearInterval\(lightWatch\)/.test(stopRec));
ok('kayıt durunca ses zinciri bırakılıyor', /fxTrack\.stop\(\)/.test(stopRec));

const selectScript=kod(cikar(js,/function selectScript\(id\)\{[\s\S]*?\n\}/,'selectScript'));
ok('kayıtlı konum reset()ten ÖNCE okunuyor',
   selectScript.indexOf('active().pos') < selectScript.indexOf('reset()'));
ok('senaryo değişince eski konum yazılıyor',
   selectScript.indexOf('rememberPos()') < selectScript.indexOf('st.activeId=id'));

const stopComp=kod(cikar(js,/function stopComp\(\)\{[\s\S]*?\n\}/,'stopComp'));
ok('ÖDÜNÇ ALINAN ses izi durdurulmuyor', /cam0\.indexOf\(t\)<0/.test(stopComp));
ok('GPU kaynakları bırakılıyor', /deleteTexture/.test(stopComp) && /deleteProgram/.test(stopComp));
ok('kompozit kapanınca durum tam sıfırlanıyor', /comp\.gl=null; comp\.bgReady=false;/.test(stopComp));

// ---------- KAYIT KAYNAĞI ZİNCİRİ ----------
const doStart=kod(cikar(js,/function doStartRec\(\)\{[\s\S]*?\n\}/,'doStartRec'));
ok('kompozit ses izini kameradan ödünç alıyor', /compRecStream\(\)/.test(doStart));
ok('ses işleme kompozitten SONRA takılıyor',
   doStart.indexOf('compRecStream()') < doStart.indexOf('makeFxTrack()'));
ok('işlenmiş iz video izleriyle birleştiriliyor', /new MediaStream\(\[\.\.\.v, fxTrack\]\)/.test(doStart));
ok('kayıt başlangıcı gözcüsü var', /recNoStart/.test(doStart));
ok('iOS timeslice ALMIYOR (parçalı MP4 tuzağı)', /if\(IS_WK\) rec\.start\(\); else rec\.start\(1000\)/.test(doStart));
ok('altyazı damgaları her kayıtta sıfırlanıyor', /capTimes=new Array\(words\.length\)\.fill\(null\)/.test(doStart));

// ---------- DURUM SIFIRLAMA BÜTÜNLÜĞÜ ----------
const DEF=cikar(js,/const DEF=\{[\s\S]*?\n\};/,'DEF');
const defAnahtar=[...DEF.matchAll(/(?:^|[,{\s])([a-zA-Z][a-zA-Z0-9]*)\s*:/g)].map(m=>m[1]);
const kullanilan=[...new Set([...js.matchAll(/\bst\.([a-zA-Z][a-zA-Z0-9]*)\b/g)].map(m=>m[1]))];
const eksik=kullanilan.filter(k=>!defAnahtar.includes(k));
ok('okunan her st.x varsayılanda tanımlı', eksik.length===0 || (console.log('  varsayılansız:',eksik),false));

// ---------- ÖN KOŞUL KAPISI KAPSAMI ----------
const gate=cikar(js,/function gateSettings\(\)\{[\s\S]*?\n\}/,'gateSettings');
const kapiliAyar=[...gate.matchAll(/\['(\w+)',/g)].map(m=>m[1]);
['burnCaps','chroma','maskPrev','voiceCmd'].forEach(k=>
  ok('ön koşulu olan "'+k+'" kapıda listeli', kapiliAyar.includes(k)));
ok('kapı sebebi olmayan ayara etiket basmıyor', /if\(!uygun && sebep\)/.test(gate));
ok('koşul sağlanınca etiket siliniyor', /else if\(et\) et\.remove\(\)/.test(gate));

// ---------- HATA GÜNLÜĞÜ HER KRİTİK YOLDA ----------
['audioFx','dbPut','dbDel','rec','cam','gl','voice','persist'].forEach(k=>
  ok("logErr('"+k+"') bağlı", js.includes("logErr('"+k+"'")));
