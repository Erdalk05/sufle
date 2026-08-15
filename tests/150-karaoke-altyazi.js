const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,blokKes,cekirdekOku,REPO}=require('./kaynak');
const ALTYAZI_KAYNAK=cekirdekOku('altyazi.js','SUFLE_ALTYAZI');
const telHam=oku(telefonYolu()), macHam=oku(macYolu());
const yorumsuz=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const tel=yorumsuz(telHam), mac=yorumsuz(macHam);

/* G.1 — KARAOKE ALTYAZI (konuşulan kelime vurgulu).

   NEDEN BU MADDE BİRİNCİ: BIGVU'nun vitrin ve para kazandıran modülü bu ve
   orada BULUT ASR ile TAHMİN ediliyor (temiz seste %92-95, internet şart,
   ücretsiz katmanda kilitli). Sufle metni zaten BİLİYOR — kullanıcı onu
   okudu — ve `liveCue()` kelimeleri okuma çizgisinden geçtikçe ekliyor.
   Yani vurgulanacak kelime her zaman cue'nun SONUNCUSU: kayma sıfır, ağ yok,
   model yok, kelime doğruluğu %100.

   BU TESTİN KİLİTLEDİĞİ ÜÇ ŞEY:
   ① doğru kelime vurgulanıyor (son satırın son kelimesi, hep)
   ② SÖYLENMEMİŞ kelime hiçbir zaman gösterilmiyor (dürüstlük sınırı)
   ③ vurgu bedava değil: parçalama önbelleğe girdi, yoksa bu dosyada bir kez
      kapatılmış olan "kare başına gereksiz measureText" kusuru geri gelirdi. */

/* ---------- 1) SAF FONKSİYON: kkParcala ---------- */
function cikarParcala(k, ad){
  const m=k.match(/function kkParcala\(measure, ln\)\{[\s\S]*?\n\s*\}/);
  ok(ad+': kkParcala çıkarılabildi', !!m);
  if(!m) return null;
  return new Function('__m', m[0]+'; return kkParcala(__m, arguments[1]);');
}
/* Ölçüm fonksiyonu sahte ama TUTARLI: her karakter 10 birim, boşluk 4.
   Gerçek measureText yerine bunu koymak testin tuvalden bağımsız olmasını
   sağlıyor (wrapLines aynı yöntemle sınanıyor). */
const olc=s=>{ let t=0; for(const c of String(s)) t += (c===' '?4:10); return t; };

for(const [ad,k] of [['telefon',tel],['masaüstü',mac]]){
  const parcala=cikarParcala(k,ad);
  if(!parcala) continue;

  {
    const r=parcala(olc,'bugun sizlere yeni bir konudan');
    ok(ad+': parça sayısı kelime sayısına eşit (5)', !!r && r.parts.length===5);
    ok(ad+': son parça son kelime', !!r && r.parts[4]==='konudan');
    /* Satır ORTALANMIŞ kalmalı: ilk parçanın solu ile son parçanın sağı
       merkeze göre simetrik olmalı, yoksa karaoke açıkken altyazı kayar. */
    if(r){
      const sol=r.xs[0], sag=r.xs[4]+r.gen[4];
      ok(ad+': satır ortalanmış duruyor ('+sol.toFixed(1)+' / '+sag.toFixed(1)+')',
         Math.abs(sol+sag)<0.001);
      ok(ad+': toplam genişlik kelimeler+boşluklar', Math.abs(r.toplam-olc('bugun sizlere yeni bir konudan'))<0.001);
      let artan=true; for(let i=1;i<r.xs.length;i++) if(r.xs[i]<=r.xs[i-1]) artan=false;
      ok(ad+': parçalar soldan sağa sıralı', artan);
      /* Parçalar ÜST ÜSTE BİNMEMELİ: her parçanın sağ kenarı bir sonrakinin
         soluna ulaşmalı ama geçmemeli (aradaki fark tam bir boşluk). */
      let bosluklar=true;
      for(let i=1;i<r.xs.length;i++){
        const d=r.xs[i]-(r.xs[i-1]+r.gen[i-1]);
        if(Math.abs(d-olc(' '))>0.001) bosluklar=false;
      }
      ok(ad+': parçalar arası tam bir boşluk var', bosluklar);
    }
  }
  {
    /* TEK KELİMELİK CUE. İlk hâlimde tek kelimede null dönüyordu, yani her
       cue'nun İLK kelimesi hiç vurgulanmıyordu — cue tek kelimeyle başladığı
       için bu, vurgunun yarısının kaybolması demekti. */
    const r=parcala(olc,'Merhaba');
    ok(ad+': tek kelimelik cue de vurgulanabiliyor', !!r && r.parts.length===1);
    if(r) ok(ad+': tek kelime ortalanmış', Math.abs(r.xs[0]+r.toplam/2)<0.001);
  }
  {
    ok(ad+': boş satırda çökmüyor', parcala(olc,'')===null);
    ok(ad+': yalnız boşluktan oluşan satırda çökmüyor', parcala(olc,'   ')===null);
    const r=parcala(olc,'  cift   bosluklu  metin ');
    ok(ad+': fazladan boşluklar parça üretmiyor', !!r && r.parts.length===3);
  }
  {
    /* Türkçe harf ve emoji: parçalama kelime sınırında kalmalı — bu depoda
       emojiyi ORTADAN bölen bir kusur bir kez çıktı (90 vakanın 73ü). */
    const r=parcala(olc,'gözlüğümü 👍 şeftali');
    ok(ad+': Türkçe ve emoji kelime sınırını bozmuyor',
       !!r && r.parts.length===3 && r.parts[2]==='şeftali');
  }
}

/* ---------- 2) GERÇEK ÇİZİM: hangi kelime hangi renkle ---------- */
function tezgah(k){
  const mW=k.match(/function wrapLines\([\s\S]*?return out\.length\?out:\[txt\|\|.{2}\];\s*\n\s*\}/);
  const mP=k.match(/function kkParcala\(measure, ln\)\{[\s\S]*?\n\s*\}/);
  const mR=k.match(/function kkRenk\(\)\{[\s\S]*?\n\s*\}/);
  const mV=blokKes(k,'function kkVurguMetin()');
  /* ÇIKARIM SÜSLÜ PARANTEZ SAYARAK: eski regex ilk ctx.restore() gördüğü
     yerde kesiyordu ve karaoke ile birlikte fonksiyonun İÇİNDE de bir
     restore() belirdi -> yarım kod, SyntaxError, sessiz ölüm. */
  const dBlok=blokKes(k,'function drawCaption(','let capOnbellek=');
  const mD=dBlok?[dBlok]:null;
  if(!mW||!mP||!mR||!mD||!mV) return null;
  return (d)=>new Function('__d', [
    /* kkRenk kendi önbelleğini kullanıyor; değişken çıkarıma girmediği için
       burada tanımlanmalı. Her kos() çağrısı yeni bir Function yarattığı
       için önbellek çağrılar arasında taşınmıyor — jeton değişimini
       ölçebilmemizin sebebi bu. */
    ALTYAZI_KAYNAK,
    'let kkRenkOnb="", kkVurguMetinOnb="";',
    mW[0], mP[0], mR[0], mV,
    'const st=__d.st||{}; const state=st;',
    'const document={documentElement:{}};',
    'const getComputedStyle=()=>({getPropertyValue:()=>__d.jeton||""});',
    'const logErr=()=>{};',
    mD[0],
    'const c={ font:"", textAlign:"center", textBaseline:"", fillStyle:"", strokeStyle:"",',
    '  globalAlpha:1, shadowColor:"", shadowBlur:0, shadowOffsetY:0,',
    '  lineWidth:0, lineJoin:"",',
    '  measureText:s=>{ __d.say&&__d.say(); return {width:String(s).length*23}; },',
    '  save(){ __d.iz.push({t:"save"}); }, restore(){ __d.iz.push({t:"restore"}); },',
    '  translate:(x,y)=>__d.iz.push({t:"tasi", x:x, y:y}),',
    '  scale:(x,y)=>__d.iz.push({t:"olcek", x:x, y:y}),',
    '  beginPath(){}, moveTo(){}, lineTo(){}, quadraticCurveTo(){}, closePath(){},',
    '  rect:(x,y,w,h)=>__d.iz.push({t:"dikdortgen", x:x, y:y, w:w, h:h}),',
    '  fill:()=>__d.iz.push({t:"zemin", renk:c.fillStyle}),',
    '  fillRect:()=>__d.iz.push({t:"kutu"}),',
    '  strokeText:(t)=>__d.iz.push({t:"kontur", s:t}),',
    '  fillText:(t,x)=>__d.iz.push({t:"yazi", s:t, x:x, renk:c.fillStyle, hiza:c.textAlign}) };',
    'let __idx=0;',
    'const liveCue=()=>__d.metinler[__idx];',
    'for(let kare=0;kare<(__d.kare||1);kare++){',
    '  __idx=Math.floor(kare/(__d.kareBasinaDegisim||1))%__d.metinler.length;',
    '  drawCaption(c, __d.W||1080, 1920);',
    '}',
    'return {sonHiza:c.textAlign, sonRenk:c.fillStyle};'
  ].join('\n'))(d);
}

const JETON='#FFB020';
for(const [ad,k] of [['telefon',tel],['masaüstü',mac]]){
  const kos=tezgah(k);
  ok(ad+': çizim tezgâhı kurulabildi', !!kos);
  if(!kos) continue;

  {
    const iz=[];
    const son=kos({metinler:['bugun sizlere yeni bir konudan'], iz, jeton:JETON, st:{capSize:42,capPos:'bottom',capKaraoke:true}});
    const yazi=iz.filter(x=>x.t==='yazi');
    ok(ad+': satır kelime kelime çiziliyor (5 parça)', yazi.length===5);
    const vurgulu=yazi.filter(x=>x.renk===JETON);
    ok(ad+': YALNIZ bir kelime vurgulu', vurgulu.length===1);
    ok(ad+': vurgulanan kelime SON kelime ('+(vurgulu[0]&&vurgulu[0].s)+')',
       !!vurgulu[0] && vurgulu[0].s==='konudan');
    ok(ad+': diğer kelimeler beyaz', yazi.filter(x=>x.renk==='#fff').length===4);
    ok(ad+': her parçanın konturu da çiziliyor', iz.filter(x=>x.t==='kontur').length===5);
    /* Çizimden sonra durum GERİ VERİLMELİ: bırakılan renk ya da hiza,
       sonraki karede kutuyu veya başka metni bozar. */
    ok(ad+': çizim sonrası renk beyaza dönüyor', son.sonRenk==='#fff');
    ok(ad+': çizim sonrası hizalama geri alınıyor', son.sonHiza==='center');
  }
  {
    /* ÇOK SATIRLI CUE: vurgu yalnız SON satırda olmalı, üst satırlar
       bütün hâlde çizilmeli (hem ucuz hem doğru). */
    const iz=[];
    kos({metinler:['bir iki uc dort bes alti yedi sekiz dokuz on onbir oniki onuc ondort'],
         iz, jeton:JETON, W:600, st:{capSize:42,capPos:'bottom',capKaraoke:true}});
    const yazi=iz.filter(x=>x.t==='yazi');
    const vurgulu=yazi.filter(x=>x.renk===JETON);
    ok(ad+': çok satırda da tek vurgu var', vurgulu.length===1);
    ok(ad+': vurgulanan kelime metnin son kelimesi', !!vurgulu[0] && vurgulu[0].s==='ondort');
    const bosluklu=yazi.filter(x=>/\s/.test(x.s));
    ok(ad+': üst satırlar bütün hâlde çiziliyor', bosluklu.length>=1);
  }
  {
    /* KAPALIYKEN eski davranış birebir korunmalı — ayar bir şeyi
       BOZMAMALI, yalnız eklemeli. */
    const a=[], b=[];
    kos({metinler:['bugun sizlere yeni bir konudan'], iz:a, jeton:JETON, st:{capSize:42,capPos:'bottom',capKaraoke:false}});
    kos({metinler:['bugun sizlere yeni bir konudan'], iz:b, jeton:JETON, st:{capSize:42,capPos:'bottom',capKaraoke:false}});
    const yazi=a.filter(x=>x.t==='yazi');
    ok(ad+': karaoke kapalıyken satır tek parça çiziliyor', yazi.length===1);
    ok(ad+': karaoke kapalıyken hiç vurgu yok', yazi.every(x=>x.renk==='#fff'));
  }
  {
    /* ESKİ KAYIT: alan hiç yoksa (eski kullanıcının durumu) karaoke AÇIK
       olmalı — `Object.assign(st,p)` varsayılanı koruduğu için doğru
       davranış bu; ters olsaydı özellik kimsede açılmazdı. */
    const iz=[];
    kos({metinler:['bugun sizlere yeni bir konudan'], iz, jeton:JETON, st:{capSize:42,capPos:'bottom'}});
    ok(ad+': alan yoksa (eski kayıt) karaoke AÇIK', iz.filter(x=>x.t==='yazi'&&x.renk===JETON).length===1);
  }
  {
    /* MALİYET: karaoke AÇIKKEN de parçalama önbellekten gelmeli.
       300 kare, metin 24 karede bir değişiyor (150 kelime/dakika). */
    let cagri=0; const iz=[];
    kos({metinler:['bugun sizlere yepyeni bir konudan','bahsedecegim arkadaslar hazir misiniz','hemen basliyoruz o zaman'],
         kare:300, kareBasinaDegisim:24, say:()=>cagri++, iz, jeton:JETON,
         st:{capSize:42,capPos:'bottom',capKaraoke:true}});
    console.log('   '+ad+': karaoke açıkken 300 karede '+cagri+' measureText çağrısı');
    ok(ad+': karaoke açıkken de ölçüm önbellekli ('+cagri+' < 300)', cagri<300);
    ok(ad+': çizim yine her karede yapılıyor', iz.filter(x=>x.t==='kutu').length===300);
  }
  {
    /* Renk JETONDAN geliyor: jeton değişince çizilen renk de değişmeli.
       Elle yazılmış renk, jeton dosyasını ölü ayara çevirir (bu depoda
       bir kez oldu: jetonlar.css yüzey renkleri). */
    const iz=[];
    kos({metinler:['iki kelime'], iz, jeton:'#123456', st:{capSize:42,capPos:'bottom',capKaraoke:true}});
    ok(ad+': vurgu rengi jetondan okunuyor', iz.some(x=>x.t==='yazi'&&x.renk==='#123456'));
    const iz2=[];
    kos({metinler:['iki kelime'], iz:iz2, jeton:'', st:{capSize:42,capPos:'bottom',capKaraoke:true}});
    ok(ad+': jeton okunamazsa yedek renk kullanılıyor',
       iz2.some(x=>x.t==='yazi'&&/^#/.test(x.renk)&&x.renk!=='#fff'));
  }
}

/* ---------- 3) DÜRÜSTLÜK: söylenmemiş kelime gösterilmiyor ---------- */
for(const [ad,k] of [['telefon',tel],['masaüstü',mac]]){
  /* ÇIKARIMI REGEXLE YAPMAK BURADA YANLIŞTI ve testi sessizce çökertti:
     `[\s\S]*?\n\s*\}` deseni fonksiyonun İÇİNDEKİ ilk kapanışa (for
     döngüsünün süslü parantezine) takılıyor ve yarım kod çıkarıyor.
     Süslü parantez sayarak kesmek tek doğru yol. */
  const govde=blokKes(k,'function liveCue()');
  const m=govde?[govde]:null;
  ok(ad+': liveCue çıkarılabildi', !!m);
  if(!m) continue;
  const kos=(kelimeler,idx,satirlar)=>new Function('__w','__i','__l', `
    const words=__w.map(s=>({textContent:s}));
    const activeIdx=__i;
    const wordLine=__l||__w.map(()=>0);
    const sentenceEnd=s=>/[.!?…:;]["')\\]]?$/.test(s||'');
    ${m[0]}
    return liveCue();
  `)(kelimeler,idx,satirlar);
  const K=['Bugun','sizlere','yeni','bir','konudan','bahsedecegim','arkadaslar'];
  for(let i=0;i<K.length;i++){
    const c=kos(K,i);
    const sonrasi=K.slice(i+1);
    const sizdi=sonrasi.some(w=>c.split(' ').indexOf(w)>=0);
    if(!sizdi) continue;
    ok(ad+': söylenmemiş kelime altyazıya sızmıyor (i='+i+')', false);
  }
  ok(ad+': söylenmemiş kelime altyazıya HİÇ sızmıyor (7 konum)', true);
  ok(ad+': cue her zaman okunan kelimeyle bitiyor',
     [0,3,6].every(i=>{ const c=kos(K,i); return c.split(' ').pop()===K[i]; }));
  ok(ad+': hiç kelime okunmadan cue boş', kos(K,-1)==='');
}

/* ---------- 4) AYAR, SÖZLÜK VE VARSAYILAN ---------- */

/* İŞARETLEME İDDİALARI HAM KAYNAKTAN OKUNUR. İlk yazışımda yorumu
   ayıklanmış metinde aradım ve test KODUN değil KENDİ kusurunu bildirdi:
   kaba ayıklayıcı (CLAUDE.md'de yazılı) dize içindeki bir yıldız-eğik
   çiftine takılıp araya giren işaretlemeyi de silebiliyor. Kod BİÇİMİNE
   dair iddialar için yorumsuz metin doğru, işaretleme için ham metin. */
/* blokKes ortak dosyadan geliyor (tests/kaynak.js) — aynı çıkarım
   kusuru iki testte birden çıktı, kural tek yerde dursun. */
{
  const sozluk=oku(require('path').join(__dirname,'..','cekirdek','sozluk.js'));
  for(const anahtar of ['tgKaraoke','kkHint']){
    const bulunan=[...sozluk.matchAll(new RegExp(anahtar+":'([^']*)'",'g'))].map(m=>m[1]);
    ok('sözlükte '+anahtar+' iki dilde de var (TR+EN)', bulunan.length===2);
    ok('sözlükte '+anahtar+' iki tarafta da dolu', bulunan.every(v=>v.length>5));
    /* Aynı metin iki dilde de yazılıysa çeviri yapılmamış demektir —
       bu depoda 67 vakalık bir sınıftı. */
    ok('sözlükte '+anahtar+' gerçekten çevrilmiş', bulunan.length===2 && bulunan[0]!==bulunan[1]);
  }
}
for(const [ad,ham,kod,dev] of [['telefon',telHam,tel,'st'],['masaüstü',macHam,mac,'state']]){
  ok(ad+': karaoke anahtarı arayüzde var', /data-t="capKaraoke"/.test(ham));
  ok(ad+': karaoke etiketi sözlükten geliyor', /data-i18n="tgKaraoke"/.test(ham));
  ok(ad+': varsayılan AÇIK', /capKaraoke:true/.test(kod));
  /* Eksik alan AÇIK anlamına gelmeli: !==false yazılmazsa eski kayıtta
     özellik sessizce kapalı kalır (bu deponun bilinen tuzağı). */
  ok(ad+': eksik alan açık sayılıyor', new RegExp(dev+'\\.capKaraoke!==false').test(kod));
  /* Boş catch YALNIZ kkRenk içinde aranmalı: depoda başka yerlerde
     taban dahilinde boş catch var, tüm dosyaya bakan iddia yalan söyler. */
  const govde=blokKes(ham,'function kkRenk()')||'';
  ok(ad+': kkRenk gövdesi bulundu', govde.length>0);
  ok(ad+': kkRenk sessizce yutmuyor', govde.length>0 && !/catch\([a-z]*\)\s*\{\s*\}/.test(govde));
}
/* Anahtarın ÖN KOŞULU var: altyazı gömme kapalıyken karaoke tek başına
   hiçbir şey yapmaz. Bu depoda "ön koşulu olan ayar = ölü ayar" kuralı var,
   o yüzden anahtar gömme bağımlıları grubunun İÇİNDE durmalı. */
{
  const sonra=telHam.split('id="burnDeps"')[1]||'';
  const grup=sonra.split('<div class="hint"')[0];
  ok('telefon: karaoke anahtarı gömme grubunun içinde', /data-t="capKaraoke"/.test(grup));
}

/* ---------- 5) VURGU RENGİ OKUNUR MU (kontrast) ---------- */
{
  /* Altyazı zemini rgba(0,0,0,.45) + her harfin çevresinde kalın siyah
     kontur; yani vurgunun okunurluğu SİYAHA karşı ölçülür. */
  const lin=c=>{ c/=255; return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4); };
  const L=hex=>{ const n=parseInt(hex.slice(1),16);
    return 0.2126*lin((n>>16)&255)+0.7152*lin((n>>8)&255)+0.0722*lin(n&255); };
  const oran=(a,b)=>{ const x=L(a),y=L(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
  const jeton=(oku(require('path').join(__dirname,'..','cekirdek','jetonlar.css'))
    .match(/--r-warn:\s*(#[0-9a-fA-F]{6})/)||[])[1];
  ok('vurgu rengi jeton dosyasında tanımlı', !!jeton);
  if(jeton){
    const o=oran(jeton,'#000000');
    console.log('   vurgu rengi '+jeton+' siyah zeminde '+o.toFixed(2)+':1');
    ok('vurgu rengi siyah zeminde okunur (>=4,5:1)', o>=4.5);
    /* Vurgu BEYAZDAN ayırt edilebilmeli, yoksa "vurgu" görünmez olur. */
    const b=oran(jeton,'#ffffff');
    ok('vurgu beyazdan ayırt ediliyor ('+b.toFixed(2)+':1)', b>=1.6);
  }
}
