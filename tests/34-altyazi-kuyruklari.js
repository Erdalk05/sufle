const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());
const mac=oku(macYolu());

/* ALTYAZI KUYRUKLARI — buildCues()
   Ürünün en yüksek sesle söylenen iddiası burada: ".srt okuma zamanlamasından
   üretiliyor, yazım %100 doğru." Kuyrukları BU fonksiyon kuruyor.

   Test kapsamı haritası çıkarınca buildCues'un İKİ PLATFORMDA DA hiçbir test
   dosyasında geçmediği ortaya çıktı — 235 telefon fonksiyonunun 122'si,
   136 Mac fonksiyonunun 71'i testlerde hiç anılmıyor ve bu, aralarında
   kullanıcıya doğrudan dosya olarak çıkan tek mantık.

   Kuyruk bölme kuralları beş tane; biri sessizce değişirse .srt hâlâ
   "çalışır" görünür ama altyazı ya çok uzun satırlar ya da bölük pörçük
   çıkar. Editörde fark edilir, o zaman da çekim bitmiştir. */

function kur(src, macMi){
  const onek = macMi ? 'state' : 'st';
  const re = macMi ? /function buildCues\(\)\{[\s\S]*?\n  \}/ : /function buildCues\(\)\{[\s\S]*?\n\}/;
  /* sentenceEnd artık tek satır değil: Türkçe kısaltmaları ve sıra sayılarını
     ayırt ediyor ve KISALTMA kümesine dayanıyor — ikisini de taşı. */
  const seRe = macMi ? /function sentenceEnd\(s\)\{[\s\S]*?\n  \}/ : /function sentenceEnd\(s\)\{[\s\S]*?\n\}/;
  const kisaltma = cikar(src, /const KISALTMA=new Set\(\[[\s\S]*?\]\);/, 'KISALTMA');
  const sabit = cikar(src, /const CAP_MAXW?[\s\S]{0,140}?CAP_GAP\s*=\s*[\d.]+;/, 'CAP sabitleri');
  const capMaxW = macMi ? '' : cikar(src, /function capMaxW\(\)\{[^\n]*\}/, 'capMaxW');
  return (kelimeler, zamanlar, satirlar, opt={}) => new Function('__k','__z','__s','__opt', `
    const ${onek} = { capOffset: __opt.off||0, capMaxW: __opt.maxW };
    const words = __k.map(s => ({textContent:s}));
    const capTimes = __z, wordLine = __s;
    ${sabit}
    ${capMaxW}
    ${kisaltma}
    ${cikar(src, seRe, 'sentenceEnd')}
    ${cikar(src, re, 'buildCues')}
    return buildCues();
  `)(kelimeler, zamanlar, satirlar, opt);
}
const telCues = kur(tel, false);
const macCues = kur(mac, true);

/* Kolay kurulum: kelimeler + her kelimenin zamanı (sn) + satır numarası */
const K = s => s.split(' ');
const Z = (n, adim=0.3, bas=0) => Array.from({length:n}, (_,i)=>+(bas+i*adim).toFixed(3));
const S = (n, ln=0) => Array.from({length:n}, ()=>ln);

/* ---------- TEMEL ---------- */
{
  const k=K('bir iki üç'), c=telCues(k, Z(3), S(3));
  ok('kuyruk üretiliyor', c.length >= 1);
  ok('metin kelimelerden kuruluyor', c[0].text === 'bir iki üç');
  ok('başlangıç ilk kelimenin zamanı', c[0].start === 0);
  ok('son kuyruk 1,4 sn sonra biter', Math.abs(c[c.length-1].end - (c[c.length-1].start+1.4)) < 1e-9);
}
ok('kelime yoksa boş dizi', telCues([], [], []).length === 0);
ok('zamanı olmayan kelimeler atlanıyor',
   telCues(K('a b c'), [null,0.5,null], S(3))[0].text === 'b');

/* ---------- BÖLME KURALI 1: KELİME SAYISI ---------- */
{
  const c=telCues(K('a b c d e f g h i j'), Z(10,0.1), S(10));
  ok('varsayılan 7 kelimede bölünüyor', c[0].words.length === 7);
  ok('kalanlar sonraki kuyruğa geçiyor', c[1].words.length === 3);
  const c2=telCues(K('a b c d e f g h i j'), Z(10,0.1), S(10), {maxW:4});
  ok('kullanıcı ayarı kelime sınırını değiştiriyor (telefon)', c2[0].words.length === 4);
}

/* ---------- BÖLME KURALI 2: KARAKTER SAYISI (42) ----------
   Uzun kelimelerle satır 42 karakteri aşmamalı; aşarsa altyazı taşar. */
{
  const uzun='kararlastirilamayanlardan';   // 25 karakter
  const c=telCues([uzun,uzun,uzun], Z(3,0.1), S(3));
  ok('42 karakteri aşmadan bölünüyor', c.every(x => x.text.length <= 42));
  ok('uzun kelimeler ayrı kuyruklara düşüyor', c.length >= 2);
}

/* ---------- BÖLME KURALI 3: SÜRE (3,6 sn) ---------- */
{
  const c=telCues(K('bir iki'), [0, 4], S(2));
  ok('3,6 sn üstü boşlukta yeni kuyruk açılıyor', c.length === 2);
  const c2=telCues(K('bir iki'), [0, 1], S(2));
  ok('kısa boşlukta aynı kuyrukta kalıyor', c2.length === 1);
}

/* ---------- BÖLME KURALI 4: SATIR DEĞİŞİMİ ----------
   Farklı satırdaki kelimeler aynı altyazıda birleşmemeli. */
{
  const c=telCues(K('bir iki'), Z(2,0.1), [0,1]);
  ok('satır değişince yeni kuyruk', c.length === 2);
}

/* ---------- BÖLME KURALI 5: CÜMLE SONU ---------- */
{
  const c=telCues(K('Merhaba. Nasılsın'), Z(2,0.1), S(2));
  ok('nokta sonrası yeni kuyruk', c.length === 2 && c[0].text === 'Merhaba.');
  const c2=telCues(K('Bitti! Yeni'), Z(2,0.1), S(2));
  ok('ünlem de cümle sonu sayılıyor', c2.length === 2);
  const c3=telCues(K('Dedi: şunu'), Z(2,0.1), S(2));
  ok('iki nokta da cümle sonu sayılıyor', c3.length === 2);
  /* BU SATIR ESKİDEN "bilinen sınır" diye KUSURU kilitliyordu: kısaltmadaki
     nokta kuyruğu bölüyordu ve ekranda tek kelimelik "Sn." kutucuğu çıkıyordu.
     Sınır kaldırıldı (bkz. tests/45) — artık doğru davranış kilitleniyor. */
  const c4=telCues(K('Sn. Ahmet'), Z(2,0.1), S(2));
  ok('kısaltmadaki nokta ARTIK bölmüyor', c4.length === 1 && c4[0].text === 'Sn. Ahmet');
  const c5=telCues(K('3. bölüm'), Z(2,0.1), S(2));
  ok('sıra sayısındaki nokta da bölmüyor', c5.length === 1);
}

/* ---------- BİTİŞ ZAMANLARI ----------
   Kuyruk bir sonrakine yapışırsa altyazı üst üste biner; çok uzun kalırsa
   ekranda asılı kalır. */
{
  const c=telCues(K('a b'), [0, 1.0], [0,1]);
  ok('bitiş bir sonrakinin başlangıcından önce', c[0].end <= c[1].start);
  ok('araya boşluk bırakılıyor', Math.abs(c[0].end - (c[1].start-0.08)) < 1e-9);
  ok('kuyruklar çakışmıyor', c.every((x,i)=> i===0 || x.start >= c[i-1].end));
}
{
  const c=telCues(K('a b'), [0, 0.2], [0,1]);
  ok('çok yakın kuyruklarda en az 0,4 sn görünür kalıyor', c[0].end - c[0].start >= 0.4);
}
{
  const c=telCues(K('a b'), [0, 30], [0,1]);
  ok('hiçbir kuyruk 6 sn\'den uzun durmuyor', c.every(x => x.end-x.start <= 6+1e-9));
}

/* ---------- KAYMA (offset) ---------- */
{
  const c=telCues(K('a b'), [1, 1.2], S(2), {off:0.5});
  ok('kayma başlangıçlara ekleniyor', Math.abs(c[0].start - 1.5) < 1e-9);
  const c2=telCues(K('a'), [0.2], S(1), {off:-5});
  ok('negatif kayma sıfırın altına inmiyor', c2[0].start === 0);
}

/* ---------- PLATFORM PARİTESİ ----------
   Aynı çekim Mac'te ve telefonda AYNI altyazıyı vermeli. Sabitler bugün
   birebir aynı (42 / 3,6 / 0,08 / 7); biri sessizce kayarsa aynı senaryodan
   iki farklı .srt çıkar ve bu ancak editörde fark edilir. */
const ORNEKLER = [
  [K('bir iki üç dört beş altı yedi sekiz dokuz'), Z(9,0.2), S(9)],
  [K('Merhaba. Bugün robotlardan söz edeceğiz'), Z(5,0.4), S(5)],
  [K('a b c'), [0, 5, 5.2], [0,0,1]],
  [K('kararlastirilamayanlardan kararlastirilamayanlardan'), Z(2,0.1), S(2)],
  [K('tek'), [0], S(1)]
];
let sapma=null;
for (const [k,z,s] of ORNEKLER){
  const a=telCues(k,z,s).map(c=>[c.text,+c.start.toFixed(3),+c.end.toFixed(3)]);
  const b=macCues(k,z,s).map(c=>[c.text,+c.start.toFixed(3),+c.end.toFixed(3)]);
  if (JSON.stringify(a)!==JSON.stringify(b)){ sapma=k.join(' ')+' → tel:'+JSON.stringify(a)+' mac:'+JSON.stringify(b); break; }
}
ok('telefon ve Mac aynı girdide birebir aynı kuyrukları üretiyor'+(sapma?' — SAPMA: '+sapma:''), !sapma);

/* Mac'te kelime sınırı kullanıcı ayarı YOK — bilerek, parite eksiği olarak
   kayıtlı. Sabit varsayılanla telefonla aynı sonucu verdiği yukarıda ölçüldü. */
ok('Mac kelime sınırı sabit (kullanıcı ayarı yok — bilinen fark)',
   /CAP_MAXW\s*=\s*7/.test(mac) && !/capMaxW/.test(mac));
ok('telefonda kelime sınırı ayarlanabilir', /function capMaxW\(\)\{/.test(tel));

/* ---------- SABİTLER İKİ PLATFORMDA AYNI ---------- */
for (const [ad,re] of [['satır uzunluğu',/CAP_MAXCH=(\d+)/],['kuyruk süresi',/CAP_MAXSEC=([\d.]+)/],['kuyruk arası',/CAP_GAP=([\d.]+)/]]){
  const a=(tel.match(re)||[])[1], b=(mac.match(re)||[])[1];
  ok('sabit aynı — '+ad+' ('+a+')', a!==undefined && a===b);
}
