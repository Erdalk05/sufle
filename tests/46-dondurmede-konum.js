const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* EKRAN DÖNDÜRÜLÜNCE SUFLE METNİN BAŞKA YERİNE ATLIYORDU
   `pos` bir PİKSEL uzaklığı. Ekran dönünce satır sarması baştan hesaplanıyor:
   satırlar genişleyince metin kısalıyor, daralınca uzuyor. Yani aynı piksel
   uzaklığı döndükten sonra BAŞKA bir kelimeye denk geliyor.

   Eski kod ölçümden sonra setPos(pos) çağırıyordu — pikseli koruyordu.
   Ölçüm (300 kelime, dikeyde satırda 6 / yatayda 12 kelime):
     50. kelimede döndür  → 107. kelimeye atlıyor   (57 kelime sapma)
     150. kelimede döndür → 299. kelimeye atlıyor  (149 kelime sapma)
     250. kelimede döndür → 299. kelimeye atlıyor   (49 kelime sapma)

   Telefonda çekim ortasında dönmek gerçek bir senaryo ve kayıt sürüyor:
   kullanıcı hangi cümleyi kaçırdığını ancak çekimi izlerken anlıyor.

   Doğru davranış: ölçümden ÖNCE hangi kelimedeysen, ölçümden SONRA o kelimeyi
   okuma çizgisine getir. Hedef SATIR düzeyinde kesinlik — bir satırdaki bütün
   kelimeler aynı üst koordinatı paylaştığı için ulaşılabilir en iyi kesinlik
   budur ve suflede zaten satır okunuyor. */

const yakinIdxSrc = cikar(kod, /function yakinIdx\(y\)\{[\s\S]*?\n\}/, 'yakinIdx');
/* Çıkarım çökerse ADI OLAN iddia görülsün: aşağıdaki bütün döndürme
   ölçümlerinin tek bir yığın iziyle kaybolmasını istemiyoruz. */
const yoMatch = kod.match(/function yenidenOlc\(\)\{[\s\S]*?\n\}/);
ok('yenidenOlc kaynakta var ve kelime indeksini kullanıyor',
   !!yoMatch && yoMatch[0].includes('wordTops[i]'));
const yenidenOlcSrc = (yoMatch && yoMatch[0].includes('wordTops[i]'))
  ? yoMatch[0]
  : 'function yenidenOlc(){ measure(); drawAspect(); drawSafe(); setPos(pos); }';

/* Gerçek measure() üstteki dolguyu eyeOff() kadar yapıyor: ilk kelime pos=0
   iken okuma çizgisinde duruyor. Simülasyon bunu yansıtmazsa metnin başındaki
   sınır durumu yanlış ölçülür. */
const EYE=200, N=300, LH=60;
const duzen=(kelimePerSatir)=>({
  tops: Array.from({length:N},(_,i)=>EYE+Math.floor(i/kelimePerSatir)*LH+LH/2),
  satir: i=>Math.floor(i/kelimePerSatir)
});
const DIKEY=duzen(6), YATAY=duzen(12);

/* yenidenOlc'u gerçek kaynaktan koştur: measure() yerine yeni düzeni yerleştir. */
function dondur({baslangicKelime, aktifBiliniyor, eski=false, kelimeVar=true}){
  const oncekiPos = DIKEY.tops[baslangicKelime]-EYE;
  return new Function('__once','__aktif','__yeni','__eski','__var', `
    let wordTops = ${JSON.stringify(DIKEY.tops)};
    let pos = __once, maxPos = wordTops[wordTops.length-1]-${EYE};
    let activeIdx = __aktif;
    const eyeOff=()=>${EYE};
    const drawAspect=()=>{}, drawSafe=()=>{};
    /* Sesli takip kapalı: yeniden ölçüm artık takibin PİKSEL hedefini de
       tazeliyor (bkz. tests/64), burada o yol sınanmıyor. */
    const voiceOn=false, syncVoicePtr=()=>{};
    const setPos=p=>{ pos=Math.max(0,Math.min(maxPos,p)); };
    // Döndürme: yeni satır sarması ölçülür.
    const measure=()=>{ wordTops = __var ? __yeni : []; maxPos = wordTops.length ? wordTops[wordTops.length-1]-${EYE} : 1; };
    ${yakinIdxSrc}
    ${ eski
      ? 'function yenidenOlc(){ measure(); drawAspect(); drawSafe(); setPos(pos); }'
      : yenidenOlcSrc }
    yenidenOlc();
    return { pos, kelime: wordTops.length ? yakinIdx(pos+${EYE}) : -1 };
  `)(oncekiPos, aktifBiliniyor, YATAY.tops, eski, kelimeVar);
}

/* ---------- ASIL DÜZELTME ---------- */
for(const K of [50,150,250]){
  const yeni = dondur({baslangicKelime:K, aktifBiliniyor:K});
  const eski = dondur({baslangicKelime:K, aktifBiliniyor:K, eski:true});
  ok(K+'. kelimede döndürünce AYNI SATIRDA kalıyor',
     YATAY.satir(yeni.kelime) === YATAY.satir(K));
  ok(K+'. kelimede eski davranış gerçekten sapıyordu (test ayırt ediyor)',
     YATAY.satir(eski.kelime) !== YATAY.satir(K));
}

/* Aktif kelime henüz bilinmiyorsa (kullanıcı hiç akıtmadı, activeIdx=-1)
   konum PİKSELDEN çözülmeli — yine de doğru satıra düşmeli. */
{
  const K=150;
  const r = dondur({baslangicKelime:K, aktifBiliniyor:-1});
  ok('aktif kelime bilinmiyorsa konumdan çözülüyor ve yine aynı satırda',
     YATAY.satir(r.kelime) === YATAY.satir(K));
}

/* ---------- SINIR DURUMLARI ---------- */
{
  const r = dondur({baslangicKelime:0, aktifBiliniyor:0});
  ok('metnin başındayken başta kalıyor (negatif konuma kaçmıyor)', r.pos >= 0 && YATAY.satir(r.kelime) === 0);
}
{
  const r = dondur({baslangicKelime:N-1, aktifBiliniyor:N-1});
  ok('metnin sonundayken sonda kalıyor', YATAY.satir(r.kelime) === YATAY.satir(N-1));
  ok('konum maxPos üstüne çıkmıyor', r.pos <= YATAY.tops[N-1]-EYE);
}
{
  /* Boş senaryo: hiç kelime yok. Çökmemeli, eski davranışa düşmeli. */
  const r = dondur({baslangicKelime:10, aktifBiliniyor:-1, kelimeVar:false});
  ok('boş senaryoda çökmüyor', r.kelime === -1);
}

/* ---------- KAYNAK DÜZEYİ ---------- */
ok('kelime indeksi ölçümden ÖNCE alınıyor',
   yenidenOlcSrc.indexOf('yakinIdx(pos+eyeOff())') < yenidenOlcSrc.indexOf('measure()'));
ok('ölçümden sonra kelime okuma çizgisine getiriliyor',
   /setPos\(Math\.max\(0, Math\.min\(maxPos, wordTops\[i\]-eyeOff\(\)\)\)\)/.test(yenidenOlcSrc));
ok('bilinen aktif kelime varsa o kullanılıyor (yeniden aramaya gerek yok)',
   /activeIdx>=0 \? activeIdx :/.test(yenidenOlcSrc));

/* ---------- HER İKİ OLAY DA BU YOLU KULLANIYOR ----------
   Biri eski yolda kalırsa hata yalnız o durumda geri gelir ve bulunması zor olur. */
/* İstek doğrudan rAF ile de, kare başına tek ölçüme indiren planlayıcıyla da
   kurulabilir; korunan iddia yalnız "yeniden boyutlanınca yeniden ölçülüyor". */
ok('pencere yeniden boyutlanınca yeniden ölçülüyor',
   /window\.addEventListener\('resize',\(\)=>(?:olcPlanla\(\)|requestAnimationFrame\(yenidenOlc\))\)/.test(kod));
ok('ekran döndürülünce yeniden ölçülüyor',
   /window\.addEventListener\('orientationchange',\(\)=>setTimeout\(yenidenOlc,320\)\)/.test(kod));
ok('eski "pikseli koru" yolu kodda kalmadı',
   !/measure\(\); drawAspect\(\); drawSafe\(\); setPos\(pos\); \}/.test(kod));

/* ---------- KONUM ZATEN KAYDEDİLİYOR MU ----------
   Döndürme uygulamayı yeniden yüklemez ama kaldığın yer ayrıca saklanıyor;
   bu düzeltme onun yerine geçmiyor. */
ok('konum senaryoya kaydedilmeye devam ediyor',
   /function rememberPos\(\)\{ const s=active\(\); if\(s\)\{ s\.pos=Math\.round\(pos\); save\(\); \} \}/.test(kod));

/* ---------- MAC PARİTESİ ----------
   Mac'te aynı hata vardı ve orada tetikleyici daha sık: pencere boyutu
   değiştirmek ve TAM EKRANA girip çıkmak. */
const mac=oku(require('./kaynak').macYolu()).replace(/\/\*[\s\S]*?\*\//g,'');
const rl=cikar(mac, /function relayout\(\)\{[\s\S]*?\n  \}/, 'Mac relayout');
ok('Mac de kelime indeksini kullanıyor', /wordTops\[i\]-eyeOff\(\)/.test(rl));
ok('Mac de indeksi ölçümden ÖNCE alıyor',
   rl.indexOf('yakinIdx(pos+eyeOff())') < rl.indexOf('measure();'));
ok('Mac de bilinen aktif kelimeyi tercih ediyor', /activeIdx>=0 \? activeIdx :/.test(rl));
ok('Mac de eski "pikseli koru" yolu kalmadı',
   !/requestAnimationFrame\(\(\)=>\{ measure\(\); setPos\(pos\); \}\)/.test(mac));
ok('Mac tam ekran değişimi de bu yolu kullanıyor',
   /fullscreenchange',\(\)=>setTimeout\(relayout,120\)/.test(mac));
