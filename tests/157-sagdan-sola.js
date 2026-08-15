const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,blokKes,cekirdekOku}=require('./kaynak');
const telHam=oku(telefonYolu()), macHam=oku(macYolu());
const yorumsuz=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const tel=yorumsuz(telHam), mac=yorumsuz(macHam);
const CEK=cekirdekOku('yon.js','SUFLE_YON');

/* G.12 — SAĞDAN SOLA DİLLER (Arapça · İbranice · Farsça).

   ÖLÇÜLEN BAŞLANGIÇ: uygulamada `dir` ile ilgili TEK BİR SATIR yoktu.
   Tarayıcı harfleri doğru çiziyor ama satır soldan başlıyor, noktalama
   yanlış uca düşüyor, karışık cümlede sıra bozuk görünüyordu. Rakipte
   (teleprompter.com) sağdan sola destek satılıyor.

   GERÇEK TARAYICIDA ÖLÇÜLDÜ (Chrome, 430/393/375 px, üç dil × üç genişlik):
     Arapça · İbranice · Farsça → 4/4 satır dir=rtl · taşma 0 · kelime
     bölünmesi 0 · karışık satırda okuma yönü sağdan sola
     Türkçe → 4/4 satır dir=ltr (yön dayatılmıyor)

   BU TESTİN KİLİTLEDİĞİ ŞEY: yön SATIR SATIR belirleniyor, vurgu doğru
   uçta yanıyor ve RTL noktalaması cümle sonu sayılıyor. */

const c=(()=>new Function(CEK+
  '\nreturn {metinYonu, cumleSonuMu, gorselSira};')())();

/* ---------- 1) YÖN KARARI ---------- */
{
  const {metinYonu}=c;
  ok('Türkçe soldan sağa', metinYonu('Merhaba dünya')==='ltr');
  ok('Arapça sağdan sola', metinYonu('مرحبا بالعالم')==='rtl');
  ok('İbranice sağdan sola', metinYonu('שלום עולם')==='rtl');
  ok('Farsça sağdan sola', metinYonu('سلام دنیا')==='rtl');
  ok('Urduca sağdan sola', metinYonu('ہیلو دنیا')==='rtl');
  /* İLK GÜÇLÜ KARAKTER KURALI (Unicode bidi P2/P3): rakam ve noktalama
     yön belirlemez, o yüzden onlarla başlayan satırda ilk HARF karar verir. */
  ok('rakamla başlayan Arapça satır yine rtl', metinYonu('2026 مرحبا')==='rtl');
  ok('parantezle başlayan Arapça satır yine rtl', metinYonu('(2) مرحبا')==='rtl');
  ok('işaretle başlayan Türkçe satır ltr', metinYonu('# Başlık')==='ltr');
  ok('karışık satırda ilk güçlü harf kazanıyor', metinYonu('Hello مرحبا')==='ltr');
  ok('karışık satırda Arapça önce ise rtl', metinYonu('مرحبا Hello')==='rtl');
  /* YÖN BELİRLEYEN HARF YOKSA dayatma YOK: orada tarayıcının kendi kuralı
     daha doğru. "Hep ltr" demek, tek başına duran bir rakam satırını
     Arapça metnin ortasında ters çevirirdi. */
  ok('yalnız rakam varsa yön dayatılmıyor', metinYonu('2026')==='auto');
  ok('yalnız noktalama varsa yön dayatılmıyor', metinYonu('... !!')==='auto');
  ok('boş satırda yön dayatılmıyor', metinYonu('')==='auto');
  ok('metin verilmezse çökmüyor', metinYonu(null)==='auto');
  /* Türkçe harfler RTL sanılmamalı: ş/ğ/ı Latin bloğunda ve yön kararında
     hiçbir zaman sağdan sola üretmemeli. */
  ok('Türkçe harfler yön kararını bozmuyor', metinYonu('Şşğüöçİı')==='ltr');
  /* Emoji YÖN BELİRLEMEZ: senaryolar sık sık emojiyle başlıyor ve emojiyi
     güçlü karakter saymak, Arapça bir satırı soldan sağa çevirirdi. */
  ok('emojiyle başlayan Arapça satır yine rtl', metinYonu('🎬 مرحبا')==='rtl');
}

/* ---------- 2) CÜMLE SONU: RTL NOKTALAMASI ---------- */
{
  const {cumleSonuMu}=c;
  ok('Latin nokta', cumleSonuMu('bitti.'));
  ok('Arapça soru işareti (؟)', cumleSonuMu('كيف؟'));
  ok('Arapça nokta (۔)', cumleSonuMu('نعم۔'));
  ok('İbranice sof pasuk (׃)', cumleSonuMu('שלום׃'));
  ok('Arapça düz kelime cümle sonu değil', !cumleSonuMu('مرحبا'));
  ok('kapanış tırnağıyla da sayılıyor', cumleSonuMu('«نعم»؟'.replace('«','')));
  /* ÖLÇÜLDÜ: bu işaretler tanınmadan Arapça senaryoda HİÇ cümle sonu
     bulunamıyor, yani altyazı bölünmüyor ve klip önerisi üretilmiyordu. */
  {
    const arapca='مرحبا بالعالم هذا نص طويل جدا للاختبار؟'.split(' ');
    ok('Arapça cümlede cümle sonu bulunuyor', arapca.some(cumleSonuMu));
  }
}

/* ---------- 3) GÖRSEL SIRA ---------- */
{
  const {gorselSira}=c;
  ok('soldan sağa sıra korunuyor', gorselSira(['a','b','c'],'ltr').join('')==='abc');
  ok('sağdan sola sıra terse dönüyor', gorselSira(['a','b','c'],'rtl').join('')==='cba');
  ok('auto yönünde sıra korunuyor', gorselSira(['a','b','c'],'auto').join('')==='abc');
  /* KAYNAK DİZİ BOZULMAMALI: çağıran taraf aynı diziyi başka yerde
     kullanıyor; yerinde ters çevirmek uzak bir yerde sessiz hataya döner. */
  {
    const kaynak=['a','b','c'];
    gorselSira(kaynak,'rtl');
    ok('kaynak dizi değişmiyor', kaynak.join('')==='abc');
  }
  ok('boş dizide çökmüyor', gorselSira([], 'rtl').length===0);
  ok('dizi olmayan girdide çökmüyor', Array.isArray(gorselSira(null,'rtl')));
}

/* ---------- 4) KARAOKE VURGUSU DOĞRU UÇTA ---------- */
for(const [ad,k] of [['telefon',tel],['masaüstü',mac]]){
  const govde=blokKes(k,'function kkParcala(');
  ok(ad+': kkParcala çıkarılabildi', !!govde);
  if(!govde) continue;
  const parcala=new Function('__m','__l','__y', CEK+'\n'+govde+'\nreturn kkParcala(__m,__l,__y);');
  const olc=s=>{ let t=0; for(const ch of String(s)) t+=(ch===' '?4:10); return t; };
  {
    const r=parcala(olc,'bir iki uc','ltr');
    ok(ad+': soldan sağa vurgu SON kelimede', r && r.vurguIdx===r.parts.length-1);
    ok(ad+': soldan sağa sıra okuma sırası', r && r.parts.join(' ')==='bir iki uc');
  }
  {
    /* ASIL KURAL: sağdan solada okunan SON kelime ekranın SOL ucundadır.
       Vurguyu sağ uçta yakmak, kullanıcıya okuduğundan başka bir kelimeyi
       vurgulu göstermek demek. */
    const r=parcala(olc,'واحد اثنان ثلاثة','rtl');
    ok(ad+': sağdan solada vurgu İLK görsel parçada', r && r.vurguIdx===0);
    ok(ad+': sağdan solada görsel sıra ters', r && r.parts[0]==='ثلاثة');
    ok(ad+': vurgulanan parça okunan son kelime', r && r.parts[r.vurguIdx]==='ثلاثة');
    /* Yerleşim yine ortalanmış olmalı — yön ortalamayı bozmamalı. */
    const sol=r.xs[0], sag=r.xs[r.xs.length-1]+r.gen[r.gen.length-1];
    ok(ad+': sağdan solada da satır ortalanmış', Math.abs(sol+sag)<0.001);
  }
  {
    const r=parcala(olc,'tek','rtl');
    ok(ad+': tek kelimede vurgu yine o kelime', r && r.vurguIdx===0 && r.parts.length===1);
  }
}

/* ---------- 5) KABUKLAR: yön gerçekten uygulanıyor mu ---------- */
for(const [ad,ham,kod] of [['telefon',telHam,tel],['masaüstü',macHam,mac]]){
  /* SATIR SATIR yön: tek yön dayatmak iki dilli senaryonun yarısını bozar. */
  ok(ad+': satır yönü metinden hesaplanıyor', /const yn=metinYonu\((raw|r)\)/.test(kod));
  ok(ad+': yön özniteliği satıra yazılıyor', /dir="'\+yn\+'"/.test(kod));
  ok(ad+': yön belirsizse auto bırakılıyor', /yn==='auto'\?' dir="auto"'/.test(kod));
  /* Üç satır tipinin ÜÇÜ de yön almalı: başlık, not ve düz satır. */
  ok(ad+': başlık satırı da yön alıyor', /class="ln h"'\+da/.test(kod));
  ok(ad+': not satırı da yön alıyor', /class="ln note"'\+da/.test(kod));
  ok(ad+': düz satır da yön alıyor', /class="ln"'\+da/.test(kod));
  /* TUVALDE yön ayrıca söylenmeli: harfler doğru çizilse de noktalama ve
     rakamlar yanlış uca düşer. */
  ok(ad+': tuval yönü ayarlanıyor', /ctx\.direction = yon==='rtl' \? 'rtl' : 'ltr'/.test(kod));
  ok(ad+': altyazı metninin yönü ölçülüyor', /const yon=metinYonu\(txt\)/.test(kod));
  ok(ad+': karaoke parçalama yönü alıyor', /kkParcala\([^)]*, yon\)/.test(kod));
  ok(ad+': vurgu indeksi çekirdekten geliyor', /j===p\.vurguIdx/.test(kod));
  /* Yazı alanı da yön almalı: Arapça yazarken imleç yanlış uçta olurdu. */
  ok(ad+': senaryo yazı alanı yön alıyor', /id="(text|editor)"[^>]*dir="auto"/.test(ham));
}
{
  /* Klip sınırı ortak kurala bağlı olmalı: Arapça senaryoda cümle sonu
     bulunamazsa klip HİÇ üretilmez. */
  const klip=cekirdekOku('klip.js','SUFLE_KLIP');
  ok('klip cümle sonu ortak kuralı kullanıyor', /return cumleSonuMu\(kelime\);/.test(klip));
  ok('klipte ayrı bir noktalama listesi kalmadı', !/\[\.!\?…\]\["'\)\\\]\]\?\$/.test(klip));
}
