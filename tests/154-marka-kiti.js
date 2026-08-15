const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,blokKes,cekirdekOku}=require('./kaynak');
const telHam=oku(telefonYolu()), macHam=oku(macYolu());
const yorumsuz=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const tel=yorumsuz(telHam), mac=yorumsuz(macHam);
const CEK=cekirdekOku('marka.js','SUFLE_MARKA');

/* G.4 — MARKA KİTİ (logo · marka rengi · alt bant).

   NEDEN: BIGVU marka kitini EN PAHALI katmana kilitlemiş, teleprompter.com
   hiç sunmuyor. Bizde ücretsiz olması doğrudan rekabet silahı.

   BU TESTİN KİLİTLEDİĞİ ÜÇ ŞEY:
   ① Logo ORANI korunuyor ve kadraj dışına taşmıyor (dört konumda da)
   ② Marka rengi OKUNURLUĞU bozamıyor: koyu bir renk koyu bandın üstünde
      neredeyse görünmez olur, o yüzden kontrast ÖLÇÜLÜP okunur renge
      düşülüyor — kullanıcının rengi yine şeritte duruyor
   ③ Logo dosyası belleğe KOPYALANMIYOR ve iki sınır kullanıcıya söyleniyor
      (bu depoda ölçülmüş ders: 12 MP fotoğrafta tepe 51 MB) */

const c=(()=>new Function(CEK+
  '\nreturn {logoKutusu, bagilParlaklik, kontrastOrani, okunurMetin, altBantKutusu, markaDosyaKabul, markaAktif, MARKA_KONUMLAR, MARKA_LOGO_MAX};')())();

/* ---------- 1) LOGO YERLEŞİMİ ---------- */
{
  const {logoKutusu, MARKA_KONUMLAR}=c;
  const W=1080, H=1920;
  ok('dört konum tanımlı', MARKA_KONUMLAR.length===4);
  for(const k of MARKA_KONUMLAR){
    const r=logoKutusu(W,H,k,12,400,200);
    ok('konum '+k+': kutu üretildi', !!r);
    if(!r) continue;
    /* KADRAJ DIŞINA TAŞMA YOK: logosu yarısı kesilmiş bir video, marka
       kitinin var olma sebebini yok eder. */
    ok('konum '+k+': kadrajın içinde',
       r.x>=0 && r.y>=0 && r.x+r.w<=W && r.y+r.h<=H);
    /* ORAN KORUNUYOR: sıkıştırılmış logo markayı bozar.
       VERİ AYIRT EDİCİ OLMALI: ilk yazışımda 400x200 (tam 2:1) seçmiştim ve
       "yüksekliği genişliğin yarısı yap" diyen bozuk bir formül de aynı
       sonucu veriyordu — bozma turu yakaladı. Artık üç farklı oran
       sınanıyor ve hiçbiri 2:1 değil. */
    for(const [gw,gh] of [[400,300],[120,480],[1000,110]]){
      const o=logoKutusu(W,H,k,12,gw,gh);
      ok('konum '+k+': oran korunuyor ('+gw+'x'+gh+')',
         !!o && Math.abs((o.w/o.h)-(gw/gh))<1e-9);
    }
  }
  {
    const sagUst=logoKutusu(W,H,'sagUst',12,400,200);
    const solUst=logoKutusu(W,H,'solUst',12,400,200);
    const sagAlt=logoKutusu(W,H,'sagAlt',12,400,200);
    ok('sağ konum solun sağında', sagUst.x>solUst.x);
    ok('alt konum üstün altında', sagAlt.y>sagUst.y);
    ok('üst ve alt kenar boşluğu simetrik',
       Math.abs(sagUst.y-(H-(sagAlt.y+sagAlt.h)))<1e-9);
  }
  {
    /* Boyut yüzdesi KISA kenara göre: aynı yüzde dikey ve yatay videoda
       aynı büyüklükte görünmeli. */
    const dikey=logoKutusu(1080,1920,'sagUst',12,400,200);
    const yatay=logoKutusu(1920,1080,'sagUst',12,400,200);
    ok('aynı yüzde iki oranda da aynı genişlik', Math.abs(dikey.w-yatay.w)<1e-9);
  }
  {
    ok('yüzde alt sınırla kırpılıyor', logoKutusu(1080,1920,'sagUst',0,400,200).w>0);
    const buyuk=logoKutusu(1080,1920,'sagUst',999,400,200);
    ok('yüzde üst sınırla kırpılıyor (kadrajı yutmuyor)', buyuk.w<=1080*0.35);
    ok('bilinmeyen konum sağ üste düşüyor',
       JSON.stringify(logoKutusu(1080,1920,'yokboyle',12,400,200))===
       JSON.stringify(logoKutusu(1080,1920,'sagUst',12,400,200)));
    ok('görsel boyutu yoksa null', logoKutusu(1080,1920,'sagUst',12,0,0)===null);
    ok('kadraj boyutu yoksa null', logoKutusu(0,0,'sagUst',12,400,200)===null);
    /* Çok uzun (yatay) logo da kadrajı aşmamalı. */
    const genis=logoKutusu(1080,1920,'solAlt',35,4000,100);
    ok('aşırı yatay logo bile kadrajda', genis.x+genis.w<=1080);
  }
}

/* ---------- 2) OKUNURLUK ---------- */
{
  const {bagilParlaklik, kontrastOrani, okunurMetin}=c;
  ok('beyazın parlaklığı 1', Math.abs(bagilParlaklik('#ffffff')-1)<1e-9);
  ok('siyahın parlaklığı 0', Math.abs(bagilParlaklik('#000000'))<1e-9);
  ok('kısa yazım (3 hane) okunuyor',
     Math.abs(bagilParlaklik('#fff')-bagilParlaklik('#ffffff'))<1e-9);
  ok('geçersiz renk null', bagilParlaklik('mavi')===null);
  ok('boş renk null', bagilParlaklik('')===null);
  ok('siyah-beyaz kontrastı 21', Math.abs(kontrastOrani('#000000','#ffffff')-21)<1e-6);
  ok('aynı renk kontrastı 1', Math.abs(kontrastOrani('#123456','#123456')-1)<1e-9);
  ok('geçersiz renkte kontrast null', kontrastOrani('yok','#fff')===null);
  /* ASIL KURAL: hangi metin rengi seçilirse seçilsin, seçilen zemin üstünde
     daha yüksek kontrastlı olan kazanmalı. */
  ok('açık zeminde koyu yazı', okunurMetin('#FFB020')==='#111111');
  ok('koyu zeminde beyaz yazı', okunurMetin('#101820')==='#ffffff');
  ok('geçersiz renkte güvenli varsayılan', okunurMetin('yok')==='#ffffff');
  for(const renk of ['#00D47E','#2563EB','#D93036','#FFB020','#101820','#f2efe6']){
    const secilen=okunurMetin(renk);
    const o=kontrastOrani(renk, secilen);
    ok('seçilen yazı rengi okunur: '+renk+' → '+secilen+' ('+o.toFixed(2)+':1)', o>=4.5);
  }
}

/* ---------- 3) ALT BANT GEOMETRİSİ ---------- */
{
  const {altBantKutusu}=c;
  const W=1080,H=1920;
  const iki=altBantKutusu(W,H,48,2), bir=altBantKutusu(W,H,48,1);
  ok('iki satır tek satırdan yüksek', iki.h>bir.h);
  ok('bant kadrajın içinde', iki.x>=0 && iki.y>=0 && iki.x+iki.w<=W && iki.y+iki.h<=H);
  ok('bant altta duruyor', iki.y>H*0.6);
  ok('şerit görünür kalınlıkta', iki.seritW>=3);
  ok('punto tabanı var (aşırı küçük punto reddediliyor)', altBantKutusu(W,H,1,2).punto>=8);
  ok('satır sayısı ikiyle sınırlı', altBantKutusu(W,H,48,9).h===iki.h);
  ok('kadraj yoksa null', altBantKutusu(0,0,48,2)===null);
  {
    /* Dar kadrajda bant taşmamalı: 9:16 telefon kadrajı en dar durum. */
    const dar=altBantKutusu(720,1280,32,2);
    ok('dar kadrajda da içeride', dar.x+dar.w<=720);
  }
}

/* ---------- 4) DOSYA KABULÜ ---------- */
{
  const {markaDosyaKabul, MARKA_LOGO_MAX}=c;
  ok('png kabul', markaDosyaKabul('image/png', 1000).ok===true);
  ok('jpeg kabul', markaDosyaKabul('image/jpeg', 1000).ok===true);
  ok('pdf reddediliyor', markaDosyaKabul('application/pdf', 1000).sebep==='tur');
  ok('tür yoksa reddediliyor', markaDosyaKabul('', 1000).sebep==='tur');
  ok('çok büyük dosya reddediliyor', markaDosyaKabul('image/png', MARKA_LOGO_MAX+1).sebep==='boyut');
  ok('sınırdaki dosya kabul', markaDosyaKabul('image/png', MARKA_LOGO_MAX).ok===true);
  /* Sınır anlamlı olmalı: 12 MP fotoğrafta çözülmüş tepe 51 MB ölçülmüştü,
     logo için 8 MB fazlasıyla yeter. */
  ok('sınır makul (8 MB)', MARKA_LOGO_MAX===8*1024*1024);
}

/* ---------- 5) "AÇIK AMA HİÇBİR ŞEY OLMUYOR" OLMASIN ---------- */
{
  const {markaAktif}=c;
  ok('boş marka etkin değil', markaAktif({})===false);
  ok('nesne yoksa etkin değil', markaAktif(null)===false);
  ok('logo varsa etkin', markaAktif({logo:'data:image/png;base64,x'})===true);
  ok('bant açık ama metin boşsa etkin DEĞİL', markaAktif({bant:true, ad:'', unvan:'  '})===false);
  ok('bant açık ve ad varsa etkin', markaAktif({bant:true, ad:'Erdal'})===true);
  ok('bant KAPALIYKEN ad yazılı olsa da etkin değil', markaAktif({bant:false, ad:'Erdal'})===false);
}

/* ---------- 6) ÇİZİM: iki kabuk aynı katmanı üretiyor mu ---------- */
function tezgah(k, dev){
  const govde=blokKes(k,'function drawMarka(');
  if(!govde) return null;
  return (d)=>new Function('__d', [
    CEK,
    'const '+dev+'=__d.durum||{};',
    'const logErr=()=>{};',
    govde,
    'const ctx={ fillStyle:"", font:"", textAlign:"", textBaseline:"",',
    '  save(){}, restore(){},',
    '  fillRect:(x,y,w,h)=>__d.iz.push({t:"kutu", x:Math.round(x), y:Math.round(y), w:Math.round(w), h:Math.round(h), renk:ctx.fillStyle}),',
    '  fillText:(s,x,y)=>__d.iz.push({t:"yazi", s:s, x:Math.round(x), renk:ctx.fillStyle}),',
    '  drawImage:(g,x,y,w,h)=>__d.iz.push({t:"logo", x:Math.round(x), y:Math.round(y), w:Math.round(w), h:Math.round(h)}) };',
    'drawMarka(ctx, __d.W||1080, __d.H||1920, __d.ops);',
  ].join('\n'))(d);
}
const SAHTE_LOGO={naturalWidth:400, naturalHeight:200};
for(const [ad,k,dev] of [['telefon',tel,'st'],['masaüstü',mac,'state']]){
  const kos=tezgah(k,dev);
  ok(ad+': drawMarka çıkarılabildi', !!kos);
  if(!kos) continue;
  {
    const iz=[];
    kos({durum:{marka:{logo:'x', konum:'sagUst', boyut:12}}, iz,
         ops:{marka:{logo:'x', konum:'sagUst', boyut:12}, gorsel:SAHTE_LOGO, bantGoster:false}});
    ok(ad+': logo çiziliyor', iz.filter(x=>x.t==='logo').length===1);
    ok(ad+': logo kadrajın içinde', iz[0].x+iz[0].w<=1080 && iz[0].y>=0);
  }
  {
    /* Marka etkin değilse HİÇ çizim olmamalı: boş bir katman kare başına
       gereksiz iş demek. */
    const iz=[];
    kos({durum:{marka:{}}, iz, ops:{marka:{}, gorsel:SAHTE_LOGO, bantGoster:true}});
    ok(ad+': etkin değilken hiç çizilmiyor', iz.length===0);
  }
  {
    const mk={bant:true, ad:'Erdal', unvan:'Kurucu', renk:'#00D47E'};
    const iz=[];
    kos({durum:{marka:mk}, iz, ops:{marka:mk, gorsel:null, bantGoster:true}});
    ok(ad+': bant zemini ve şeridi çiziliyor', iz.filter(x=>x.t==='kutu').length===2);
    ok(ad+': şerit marka renginde', iz.filter(x=>x.t==='kutu')[1].renk==='#00D47E');
    const yazi=iz.filter(x=>x.t==='yazi');
    ok(ad+': ad ve unvan yazılıyor', yazi.length===2 && yazi[0].s==='Erdal' && yazi[1].s==='Kurucu');
    ok(ad+': ad beyaz', yazi[0].renk==='#fff');
  }
  {
    /* ASIL KURAL: koyu marka rengi koyu bandın üstünde OKUNMAZ; kontrast
       ölçülüp okunur renge düşülmeli, ama şerit yine markanın rengi kalmalı. */
    const koyu={bant:true, ad:'Erdal', unvan:'Kurucu', renk:'#101820'};
    const iz=[];
    kos({durum:{marka:koyu}, iz, ops:{marka:koyu, gorsel:null, bantGoster:true}});
    const yazi=iz.filter(x=>x.t==='yazi');
    ok(ad+': koyu marka renginde unvan okunur renge düşüyor', yazi[1].renk!=='#101820');
    ok(ad+': şerit yine marka renginde (marka kaybolmuyor)',
       iz.filter(x=>x.t==='kutu')[1].renk==='#101820');
    const acik={bant:true, ad:'E', unvan:'K', renk:'#FFB020'};
    const iz2=[];
    kos({durum:{marka:acik}, iz:iz2, ops:{marka:acik, gorsel:null, bantGoster:true}});
    ok(ad+': okunur marka rengi olduğu gibi kullanılıyor',
       iz2.filter(x=>x.t==='yazi')[1].renk==='#FFB020');
  }
  {
    /* Bant SÜREKLİ durmaz: kayıt başladıktan sonra birkaç saniye görünür. */
    const mk={bant:true, ad:'Erdal', renk:'#00D47E'};
    const iz=[];
    kos({durum:{marka:mk}, iz, ops:{marka:mk, gorsel:null, bantGoster:false}});
    ok(ad+': bant süresi dolunca çizilmiyor', iz.filter(x=>x.t==='kutu').length===0);
  }
  {
    /* Tek satır: yalnız ad varsa unvan satırı çizilmemeli. */
    const mk={bant:true, ad:'Erdal', unvan:'', renk:'#00D47E'};
    const iz=[];
    kos({durum:{marka:mk}, iz, ops:{marka:mk, gorsel:null, bantGoster:true}});
    ok(ad+': tek satırda yalnız ad', iz.filter(x=>x.t==='yazi').length===1);
  }
}
{
  /* PARİTE: iki kabuk aynı girdide aynı katmanı çizmeli. */
  const t=tezgah(tel,'st'), m=tezgah(mac,'state');
  if(t&&m){
    const mk={logo:'x', konum:'solAlt', boyut:18, bant:true, ad:'Erdal', unvan:'Kurucu', renk:'#2563EB'};
    const a=[], b=[];
    t({durum:{marka:mk}, iz:a, ops:{marka:mk, gorsel:SAHTE_LOGO, bantGoster:true}});
    m({durum:{marka:mk}, iz:b, ops:{marka:mk, gorsel:SAHTE_LOGO, bantGoster:true}});
    ok('iki kabuk aynı marka katmanını çiziyor', JSON.stringify(a)===JSON.stringify(b));
  }
}

/* ---------- 7) KABUKLAR: bağlanmış mı ---------- */
for(const [ad,ham,kod,dev] of [['telefon',telHam,tel,'st'],['masaüstü',macHam,mac,'state']]){
  ok(ad+': logo seçici arayüzde', /id="logoFile"/.test(ham));
  ok(ad+': logo konumu seçilebiliyor', /id="logoPosSeg"/.test(ham));
  ok(ad+': marka rengi seçilebiliyor', /id="markaRenk"/.test(ham));
  ok(ad+': ad ve unvan alanları var', /id="markaAd"/.test(ham) && /id="markaUnvan"/.test(ham));
  ok(ad+': dosya kabulü çekirdekten', /markaDosyaKabul\(f\.type, f\.size\)/.test(kod));
  /* BELLEK DERSİ: dosya base64 olarak OKUNMAMALI, nesne adresi kullanılmalı
     ve adres bırakılmalı. */
  ok(ad+': logo dosyası belleğe kopyalanmıyor', /createObjectURL\(f\)/.test(kod));
  ok(ad+': nesne adresi bırakılıyor', /revokeObjectURL\(adres\)/.test(kod));
  ok(ad+': readAsDataURL kullanılmıyor', !/readAsDataURL/.test(kod.split('logoFile')[1]||''));
  ok(ad+': logo küçültülüyor', /const mx=256/.test(kod));
  ok(ad+': saydamlık için PNG', /toDataURL\('image\/png'\)/.test(kod));
  ok(ad+': depo tavanı için ikinci kapı', /url\.length>700000/.test(kod));
  ok(ad+': marka katmanı kayda giriyor', /drawMarka\(o,/.test(kod));
  ok(ad+': altyazı kapalıyken de marka çiziliyor', /markaAktif\((st|state)\.marka\)/.test(kod));
  ok(ad+': bant süresi kayıt başlangıcından ölçülüyor',
     new RegExp('performance\\.now\\(\\)-(recT|recStart)').test(kod));
}
/* ---------- 8) YARDIMCI FONKSİYONLAR ADIYLA SINANIYOR ---------- */
for(const [ad,kod] of [['telefon',tel],['masaüstü',mac]]){
  /* markaHazir görseli BİR KEZ yükleyip önbelleklemeli: her karede yeni
     Image kurmak kayıt sırasında çöp üretir ve logo titrer. */
  const hazir=blokKes(kod,'function markaHazir()')||'';
  ok(ad+': markaHazir çıkarılabildi', hazir.length>0);
  ok(ad+': logo adresi değişmedikçe yeniden yüklenmiyor', /markaGorselUrl!==mk\.logo/.test(hazir));
  ok(ad+': yarım yüklenmiş görsel çizilmiyor', /complete && markaGorsel\.naturalWidth>0/.test(hazir));
  ok(ad+': logo yüklenemezse sessiz kalmıyor', /logErr\('markaLogo'/.test(hazir));
  /* markaBantGorunur: bant SÜREKLİ durmamalı, kayıt başlangıcına bağlı. */
  const bant=blokKes(kod,'function markaBantGorunur()')||'';
  ok(ad+': markaBantGorunur çıkarılabildi', bant.length>0);
  ok(ad+': kayıt yokken bant görünmüyor', /if\(!(recT|recStart)\) return false;/.test(bant));
  ok(ad+': bant süresinin tabanı var (sıfır saniye olamaz)', /Math\.max\(1,/.test(bant));
  /* Anahtar iç içe durumda yaşıyor; köprü fonksiyonu hem yansıtmalı hem
     ekran okuyucuya bildirmeli. */
  const anahtar=blokKes(kod,'function markaBantAnahtari()')||'';
  ok(ad+': markaBantAnahtari çıkarılabildi', anahtar.length>0);
  ok(ad+': anahtar durumu ekran okuyucuya bildiriyor', /aria-checked/.test(anahtar));
  /* GERÇEK TARAYICIDA YAKALANDI: genel anahtar yenileyicisi `data-t`
     taşımayan anahtarı da işliyordu ve st[undefined] hep falsy olduğu için
     marka bandı HER apply() çağrısında sessizce kapanıyordu. */
  if(ad==='telefon')
    ok(ad+': genel yenileyici data-t taşımayan anahtara dokunmuyor',
       /\$\$\('\.sw'\)\.forEach\(s=>\{ if\(!s\.dataset\.t\) return;/.test(kod));
}

{
  const sozluk=cekirdekOku('sozluk.js','SUFLE_SOZLUK');
  for(const k of ['markaTitle','logoPick','logoPos','logoSize','markaRenk','tgBant','markaAd','markaUnvan','markaHint']){
    const bul=[...sozluk.matchAll(new RegExp(k+":'([^']*)'",'g'))].map(m=>m[1]);
    ok('sözlükte '+k+' iki dilde', bul.length===2);
    ok('sözlükte '+k+' çevrilmiş', bul.length===2 && bul[0]!==bul[1]);
  }
  for(const [ad,dosya] of [['telefon','mesajlar.js'],['masaüstü','mac-mesajlar.js']]){
    const msg=cekirdekOku(dosya, ad==='telefon'?'SUFLE_MESAJLAR':'SUFLE_MAC_MESAJLAR');
    for(const k of ['logoTur','logoBuyuk','logoSet','logoCleared']){
      const bul=[...msg.matchAll(new RegExp(k+":'([^']*)'",'g'))].map(m=>m[1]);
      ok(ad+' mesajı '+k+' iki dilde', bul.length===2);
    }
  }
}
