const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,esnek}=require('./kaynak');
/* v9.34: ön koşul sebepleri sözlüğe taşındı; tezgâh GERÇEK sözlüğü
   yüklüyor. Yorumda ters tırnak yok — aşağıdaki şablon dizesine giriyor. */
const {cekirdekOku}=require('./kaynak');
const SOZ=cekirdekOku('sozluk.js','SUFLE_SOZLUK').replace(/\/\*[\s\S]*?\*\//g,'');
const tel=esnek(esnek(oku(telefonYolu())));
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* K2 — ÖN KOŞULU OLAN AYARLAR: HEPSİ KAPSANIYOR MU?
   KAPSANMIYORDU — sistematik tarama ÜÇ ayar daha buldu.

   Bu gece bu sınıfı üç kez ayrı ayrı yakaladım (G3 yeşil ekran blokları,
   K4 yüksek kontrast, D9 tetik kelimesi). Bu tur SORUNUN KENDİSİNİ değil,
   TARAMAYI yapıyor: her ayarın bir ön koşulu var mı, varsa kapıda mı?

   BULUNAN ÜÇÜ:
     · 🎬 Bölüm sonunda dur — senaryoda `#` başlığı yoksa hiçbir şey yapmıyor.
       Uygulama bunu ZATEN BİLİYOR (bölüm listesini gizliyor) ama anahtarı
       canlı bırakıyordu.
     · Konuşmayı kesince dur (nefesle akış) — kamera yoksa ses izi de yok.
       Kendini kapatıyordu ama ancak DOKUNDUKTAN sonra.
     · Kendi tetik kelimen — komut eşleştirmesi `if(st.voiceCmd)` kapısının
       arkasında; sesli komut kapalıyken alan tamamen ölü.

   Üçü de artık soluk görünüyor ve neyin gerektiği yanlarında yazıyor. */

const mGate=kod.match(/function gateSettings\(\)\{[\s\S]*?\n\}/);
ok('gateSettings çıkarılabildi', !!mGate);
if(!mGate) return;

/* ---------- KAPI GERÇEKTEN NE YAPIYOR ---------- */
function kapiKos(durum){
  return new Function('__d', `
    const st=__d.st; const L='tr';
    ${SOZ}
    const t=(k)=>I18N[L][k];
    const stream=__d.stream; const sections=__d.sections;
    const window={};
    ${__dSpeech()}
    const kutular={};
    const yapAlan=()=>({ style:{}, cocuklar:[],
      querySelector(){ return this.cocuklar.find(x=>x.sinif==='gateWhy')||null; },
      insertBefore(e){ this.cocuklar.unshift(e); },
      get firstChild(){ return this.cocuklar[0]||null; },
      closest(){ return this; } });
    for(const k of ['#chromaDeps','#burnDeps','#wakeDeps']) kutular[k]=yapAlan();
    const anahtarlar={};
    for(const k of __d.anahtarlar){ anahtarlar[k]={ dataset:{t:k}, parent:yapAlan() }; }
    const sheetSorgu=(sel)=>{ const m=sel.match(/data-t="(\\w+)"/); if(!m) return null;
      const a=anahtarlar[m[1]]; if(!a) return null;
      return { closest:()=>a.parent, parentNode:a.parent }; };
    const $=(s)=>{ if(kutular[s]) return kutular[s];
      if(s==='#sheet') return { querySelector:sheetSorgu };
      return null; };
    const document={ createElement:()=>({ sinif:'', style:{cssText:''}, textContent:'',
      set className(v){ this.sinif=v; }, get className(){ return this.sinif; }, remove(){} }) };
    ${mGate[0]}
    gateSettings();
    const sonuc={};
    for(const k of __d.anahtarlar){ const p=anahtarlar[k].parent;
      sonuc[k]={ solgun:p.style.opacity, sebep:(p.cocuklar[0]||{}).textContent||'' }; }
    for(const k of ['#chromaDeps','#burnDeps','#wakeDeps']){
      sonuc[k]={ solgun:kutular[k].style.opacity, sebep:(kutular[k].cocuklar[0]||{}).textContent||'' }; }
    return sonuc;
  `)(durum);
}
function __dSpeech(){ return 'const SpeechRecognition=1;'; }

const ANAHTARLAR=['burnCaps','chroma','maskPrev','torch','voiceCmd','stopAtSection','vad','rawAudio'];
const temel={ anahtarlar:ANAHTARLAR, stream:null, sections:[],
  st:{chroma:false, burnCaps:false, voiceCmd:false} };

/* ---------- ASIL BULGU: ÜÇ YENİ KAPI ---------- */
{
  const r=kapiKos({...temel, sections:[], stream:null});
  ok('bölüm yoksa bölüm-durdurma soluk', r.stopAtSection.solgun==='0.45');
  ok('bölüm yoksa sebebi yazıyor', /bölüm başlığı yok/.test(r.stopAtSection.sebep));
  ok('kamera yoksa nefesle akış soluk', r.vad.solgun==='0.45');
  ok('kamera yoksa sebebi yazıyor', /kamera gerekli/.test(r.vad.sebep));
  ok('sesli komut kapalıyken tetik alanı soluk', r['#wakeDeps'].solgun==='0.45');
  ok('tetik alanının sebebi yazıyor', /sesli komut açık olmalı/.test(r['#wakeDeps'].sebep));
}
{
  /* Ön koşullar sağlanınca hiçbiri soluk kalmamalı — yoksa çalışan ayar
     kapalı görünür ve kullanıcı boşuna uğraşır. */
  const r=kapiKos({...temel, sections:[{i:0}], stream:{},
    st:{chroma:true, burnCaps:true, voiceCmd:true}});
  ok('bölüm varken bölüm-durdurma normal', r.stopAtSection.solgun==='');
  ok('kamera varken nefesle akış normal', r.vad.solgun==='');
  ok('sesli komut açıkken tetik alanı normal', r['#wakeDeps'].solgun==='');
  ok('yeşil ekran açıkken bağlı ayarlar normal', r['#chromaDeps'].solgun==='');
  ok('altyazı gömme açıkken bağlı ayarlar normal', r['#burnDeps'].solgun==='');
  ok('koşul sağlanınca gereksiz açıklama yok',
     !r.stopAtSection.sebep && !r.vad.sebep && !r['#wakeDeps'].sebep);
}
{
  /* Her ön koşul BAĞIMSIZ olmalı: biri sağlanınca diğerleri açılmamalı. */
  const r=kapiKos({...temel, sections:[{i:0}], stream:null, st:{chroma:false,burnCaps:false,voiceCmd:false}});
  ok('yalnız bölüm koşulu sağlanınca yalnız o açılıyor',
     r.stopAtSection.solgun==='' && r.vad.solgun==='0.45' && r['#wakeDeps'].solgun==='0.45');
}

/* ---------- ESKİ KAPSAM BOZULMADI ---------- */
{
  const r=kapiKos({...temel, stream:null, st:{chroma:false,burnCaps:false,voiceCmd:false}});
  for(const k of ['burnCaps','chroma','torch'])
    ok('kamera yoksa soluk: '+k, r[k].solgun==='0.45' && /kamera gerekli/.test(r[k].sebep));
  ok('yeşil ekran kapalıyken maske önizlemesi soluk',
     r.maskPrev.solgun==='0.45' && /yeşil ekran/.test(r.maskPrev.sebep));
  ok('yeşil ekran blokları soluk', r['#chromaDeps'].solgun==='0.45');
  ok('altyazı blokları soluk', r['#burnDeps'].solgun==='0.45');
  ok('koşulsuz ayar soluklaşmıyor', r.rawAudio.solgun==='');
}

/* ---------- KAYNAK DÜZEYİ: KAPI LİSTESİ TAM MI ---------- */
{
  const kural=(mGate[0].match(/\['(\w+)',/g)||[]).map(x=>x.slice(2,-2));
  for(const k of ['burnCaps','chroma','maskPrev','torch','voiceCmd','stopAtSection','vad'])
    ok('kapı listesinde: '+k, kural.includes(k));
  const blok=(mGate[0].match(/'#(\w+)'/g)||[]).map(x=>x.slice(2,-1));
  for(const b of ['chromaDeps','burnDeps','wakeDeps'])
    ok('blok kapısında: '+b, blok.includes(b));
}
{
  /* Ön koşulların KOD KARŞILIĞI duruyor mu — biri kalkarsa kapı yalan söyler. */
  ok('bölüm-durdurma gerçekten bölümlere bakıyor', /if\(st\.stopAtSection\)\{\s*for\(const sc of sections\)/.test(kod));
  ok('nefesle akış gerçekten ses izine bakıyor', /const at=stream && stream\.getAudioTracks\(\)\[0\];/.test(kod));
  ok('komut eşleştirmesi gerçekten sesli komuta bağlı', /if\(st\.voiceCmd\) toks=takeCommands\(toks\)/.test(kod));
  ok('komut kalıbı taraması da öyle', /function komutKaliplari\(\)\{\s*if\(!st\.voiceCmd\) return \[\];/.test(kod));
  ok('tetik alanı bloğa alınmış', /<div id="wakeDeps">/.test(tel));
  ok('bölüm listesi zaten gizleniyordu (kapının dayanağı)',
     /wrap\.classList\.toggle\('hidden',!sections\.length\)/.test(kod));
}
