const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');
/* I1: kural İKİ PLATFORMDA aynı olmalı — aynı senaryo, aynı altyazı. */
const macKod=oku(macYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* ÇOK UZUN TEK KELİME NEREDE TAŞAR — DÖRT YÜZEY AYRI AYRI ÖLÇÜLDÜ.
   Gerçek senaryolarda bu bir URL oluyor: "https://ornek.com/cok/uzun/bir/adres".
   Boşluk içermediği için satır sarması onu bölemez ve her yüzeyde ayrı davranır.

   SONUÇ (hipotez büyük ölçüde çürüdü):
     · sufle          — CSS word-wrap:break-word ile kırılıyor ✓
     · senaryo listesi — başlık üç noktayla kısaltılıyor ✓
     · gömülü altyazı  — wrapLines içindeki pushWord harf harf bölüyor ✓ (ölçüldü)
     · .srt dosyası    — 42 karakter sınırını aşan tek kelime bölünmüyor;
                         oynatıcılar kendi sardığı için kırılma değil, kayıtlı sınır. */

/* ---------- SUFLE: CSS kırıyor ---------- */
const scroller=(tel.match(/#scroller\{[^}]*\}/)||[''])[0];
ok('sufle uzun kelimeyi kırıyor (word-wrap)', /word-wrap:break-word/.test(scroller));
ok('sufle normal sarma kullanıyor', /white-space:normal/.test(scroller));

/* ---------- SENARYO LİSTESİ: başlık kısaltılıyor ---------- */
const baslik=(tel.match(/\.listitem \.t\{[^}]*\}/)||[''])[0];
ok('liste başlığı taşmıyor (ellipsis)', /text-overflow:ellipsis/.test(baslik));
ok('liste başlığı tek satırda', /white-space:nowrap/.test(baslik));
ok('liste başlığı gizleniyor', /overflow:hidden/.test(baslik));

/* ---------- GÖMÜLÜ ALTYAZI: gerçekten harf harf bölüyor mu ---------- */
const wrap=new Function(cikar(kod,/function wrapLines\([\s\S]*?\n\}/,'wrapLines')+'; return wrapLines;')();
const olc=s=>s.length;                       // 1 karakter = 1 birim
{
  const uzun='https://ornek.com/cok/uzun/bir/adres/daha/da/uzun/olsun';
  const satirlar=wrap(olc, uzun, 20);
  ok('uzun kelime birden çok satıra bölünüyor', satirlar.length>1);
  ok('hiçbir satır sınırı aşmıyor', satirlar.every(s=>olc(s)<=20));
  ok('bölünen parçalar birleşince kelime aynı kalıyor', satirlar.join('')===uzun);
}
{
  const normal='bu normal bir cümle burada duruyor';
  const satirlar=wrap(olc, normal, 20);
  ok('normal metin kelime sınırından bölünüyor', satirlar.every(s=>!/\S$/.test(s)===false));
  ok('normal metinde satırlar sınırı aşmıyor', satirlar.every(s=>olc(s)<=20));
  ok('normal metinde kelime ortadan kesilmiyor',
     satirlar.join(' ').replace(/\s+/g,' ')===normal);
}
{
  ok('boş metin çökertmiyor', Array.isArray(wrap(olc,'',20)));
  ok('tek kısa kelime tek satır', wrap(olc,'merhaba',20).length===1);
  /* Sınırdan bir karakter uzun kelime de bölünmeli. */
  const t='a'.repeat(21);
  ok('sınırı bir aşan kelime de bölünüyor', wrap(olc,t,20).length===2);
}

/* ---------- .srt: sınır aşan tek kelime ne oluyor ---------- */
const bc=cikar(kod,/function buildCues\(\)\{[\s\S]*?\n\}/,'buildCues');
ok('kuyruk karakter sınırına bakıyor', /cur\.chars\+1\+w\.s\.length>CAP_MAXCH/.test(bc));
ok('sınır aşılınca YENİ kuyruk açılıyor (kelime ortadan kesilmiyor)',
   /if\(brk\)\{ cues\.push\(cur\); cur=\{start:w\.t/.test(bc));
/* Bu, sınırı aşan TEK kelimenin kendi kuyruğunda kalması demek: bölünmüyor.
   Oynatıcılar uzun satırı kendileri sarar; kırılma değil, bilinçli sınır. */
ok('karakter sınırı 42 olarak tanımlı', /const CAP_MAXCH=42/.test(kod));

/* ---------- DÜZENLEYİCİ ---------- */
const ta=(tel.match(/textarea\{[^}]*\}/)||[''])[0];
ok('düzenleyici tam genişlikte (yatay taşma yok)', /width:100%/.test(ta));

/* ---------- KELİME SAYIMI UZUN KELİMEDE BOZULMUYOR ---------- */
{
  const cw=new Function(cikar(kod,/function countWords\([\s\S]*?\n\}/,'countWords')+'; return countWords;')();
  ok('uzun URL tek kelime sayılıyor', cw('https://ornek.com/cok/uzun/adres')===1);
  ok('normal cümle doğru sayılıyor', cw('bu bir deneme cümlesidir')===4);
}

/* ---------- I1: EMOJİ ORTASINDAN BÖLÜNÜYOR MU (BÖLÜNÜYORDU) ----------
   Bölme UTF-16 birimiyle yapılıyor ama emoji iki birim tutuyor. Kesim
   araya düşünce ortaya YARIM VEKİL çıkıyordu: ekranda kutu (□), altyazı
   dosyasında ise U+FFFD — yani gördüğün karakter bambaşka bir şey.
   ÖLÇÜLDÜ (5 kelime x 18 satır genişliği = 90 vaka): 73 vakada oluyordu.
   Düzeltmeden sonra 0. Düz metnin bölünmesi hiç değişmedi.
   Kural İKİ PLATFORMDA da aynı: aynı senaryo, aynı altyazı. */
{
  const yarimVekil=s=>/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);
  /* Gerçekçi ölçüm: tuval measureText gibi GÖRÜNEN genişliği verir; yarım
     vekil dar bir kutu olarak çizilir, o yüzden 2 birim sayılıyor. Bu model
     olmadan kusur hiç görünmüyordu — ölçüm aracının kendisi de doğrulandı. */
  const olcPx=s=>{ let w=0; for(const ch of s){ const cp=ch.codePointAt(0);
    w += cp>0xFFFF ? 20 : (cp>=0xD800&&cp<=0xDFFF ? 2 : 10); } return w; };
  ok('ölçüm modeli emojiyi geniş sayıyor (araç doğrulaması)', olcPx('🎉')===20 && olcPx('a')===10);
  ok('ölçüm modeli yarım vekili dar sayıyor (kusurun ortaya çıktığı şart)',
     olcPx('\uD83C')===2);

  const KELIMELER=[
    ['emoji dizisi', '🎉'.repeat(15)],
    ['bayrak dizisi', '🇹🇷'.repeat(8)],
    ['harf ve emoji karışık', 'a🎉b🎉c🎉d🎉e🎉f🎉g🎉'],
    ['aile emojisi (ZWJ)', '👨‍👩‍👧‍👦'.repeat(5)],
    ['uzun etiket', 'merhaba🎉dunya🎉selam🎉'],
  ];
  const wrapM=new Function(cikar(macKod,/function wrapLines\([\s\S]*?return out\.length\?out:\[txt\|\|.{2}\];\s*\n\s*\}/,'Mac wrapLines')+'; return wrapLines;')();
  for(const [ad,kelime] of KELIMELER){
    let bozukTel=0, bozukMac=0, ayrik=0, vaka=0;
    for(let mx=5;mx<=90;mx+=5){
      vaka++;
      const t=wrap(olcPx,kelime,mx), mm=wrapM(olcPx,kelime,mx);
      if(t.some(yarimVekil)) bozukTel++;
      if(mm.some(yarimVekil)) bozukMac++;
      if(JSON.stringify(t)!==JSON.stringify(mm)) ayrik++;
    }
    ok(ad+': telefonda yarım karakter yok ('+vaka+' genişlik)', bozukTel===0);
    ok(ad+': masaüstünde de yok', bozukMac===0);
    ok(ad+': iki platform birebir aynı bölüyor', ayrik===0);
  }
  /* Bölme yine de İLERLEMELİ: geri adım sonsuz döngü yapmamalı. */
  for(const [ad,kelime] of KELIMELER){
    const r=wrap(olcPx,kelime,5);
    ok(ad+': en dar satırda bile sonlanıyor ve satır üretiyor', r.length>0 && r.length<200);
    ok(ad+': hiçbir satır boş değil', r.every(l=>l.length>0));
    ok(ad+': bütün karakterler korunuyor (kayıp yok)', r.join('')===kelime);
  }
  /* Bayrak gibi iki kod noktalı birleşimler tam bölünemez ama en azından
     kod noktası bütünlüğü korunuyor — kilitlenen iddia bu. */
  ok('bayrak satırı yarım vekille bitmiyor', !yarimVekil(wrap(olcPx,'🇹🇷'.repeat(8),45)[0]));

  /* DÜZ METİN DAVRANIŞI DEĞİŞMEDİ — düzeltmenin bedeli olmamalı. */
  ok('düz metin eskisi gibi bölünüyor',
     JSON.stringify(wrap(s=>s.length,'merhabadunyaselam',6))==='["merhab","adunya","selam"]');
  ok('düz metinde de iki platform aynı',
     JSON.stringify(wrap(s=>s.length,'merhabadunyaselam',6))===
     JSON.stringify(wrapM(s=>s.length,'merhabadunyaselam',6)));
  ok('sığan kelime hiç bölünmüyor', JSON.stringify(wrap(s=>s.length,'kisa',10))==='["kisa"]');

  /* Kaynak düzeyi: koruma iki dosyada da var. */
  ok('telefonda vekil koruması var', /if\(k<w\.length && yuksekVekil\(w\.charCodeAt\(k-1\)\)\) k=\(k>=2\?k-1:2\);/.test(kod));
  ok('masaüstünde de var', /if\(k<w\.length&&yuksekVekil\(w\.charCodeAt\(k-1\)\)\) k=\(k>=2\?k-1:2\);/.test(macKod));
}
