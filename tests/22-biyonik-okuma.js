const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());
const mac=oku(macYolu());

/* BİYONİK OKUMA — telefonda vardı, Mac'te yoktu; parite listesinde satırı
   olmadığı için kapı boşluğu görmüyordu. 2026-08-13'te Mac'e taşındı.

   Parite listesi yalnız "bu fonksiyon VAR mı" diye bakar. 17-kritik-degerler
   dosyasının acı dersi tam buydu: varlık testi geçerken koruma ölü olabilir.
   Bu dosya iki platformda da fonksiyonu KOŞTURUYOR ve çıktıların birebir
   aynı olduğunu sınıyor. */

function kur(src, macMi){
  const fnAd = macMi ? 'biyonik' : 'bionic';
  const escAd = macMi ? 'escapeHtml' : 'esc';
  const durum = macMi ? 'state' : 'st';
  const escSrc = cikar(src, new RegExp('function '+escAd+'\\(s\\)\\{[^\\n]*\\}'), escAd);
  const fnSrc = cikar(src, new RegExp('function '+fnAd+'\\(w\\)\\{[\\s\\S]*?\\n(  )?\\}'), fnAd);
  return new Function('__acik', `
    const ${durum} = { bionic: __acik };
    ${escSrc}
    ${fnSrc}
    return ${fnAd};
  `);
}

const telKur = kur(tel, false), macKur = kur(mac, true);
const calistir = (acik, w) => ({ telefon: telKur(acik)(w), mac: macKur(acik)(w) });

/* ---------- KAPALIYKEN HİÇBİR ŞEY YAPMAMALI ---------- */
for (const w of ['merhaba', '<script>', 'A&B', 'İstanbul']) {
  const r = calistir(false, w);
  const beklenen = w.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  ok('kapalıyken "'+w+'" dokunulmadan kaçırılıyor (telefon)', r.telefon === beklenen);
  ok('kapalıyken "'+w+'" dokunulmadan kaçırılıyor (Mac)', r.mac === beklenen);
}

/* ---------- AÇIKKEN KELİME BAŞI KALINLAŞMALI ---------- */
// 7 harf × 0.42 = 2.94 → 3
ok('7 harfli kelimede ilk 3 harf kalın', calistir(true,'merhaba').telefon === '<b>mer</b>haba');
// 1 harf → taban 1 (hiç kalınlaşmaması özelliği ölü yapardı)
ok('tek harflik kelime de kalınlaşıyor (taban 1)', calistir(true,'a').telefon === '<b>a</b>');
// tavan 4: uzun kelimede yarısı kalın olmamalı, okuma zorlaşır
const uzun = calistir(true,'kararlaştırılamayanlardan').telefon;
ok('uzun kelimede kalın kısım 4 harfle sınırlı', /^<b>.{4}<\/b>/.test(uzun));

/* ---------- BAŞTAKİ NOKTALAMA KALINLIĞA SAYILMAMALI ----------
   Tırnakla başlayan replikte tırnağı kalınlaştırmak gözü yanlış yere çeker. */
const tirnakli = calistir(true,'"selam').telefon;
ok('baştaki tırnak kalınlaşmıyor, harften başlıyor', tirnakli === '"<b>se</b>lam');

/* ---------- TÜRKÇE HARFLER ----------
   \p{L} kullanılmazsa İ/ş/ğ harf sayılmaz ve kalınlık yanlış hesaplanır. */
ok('Türkçe büyük İ harf sayılıyor', calistir(true,'İstanbul').telefon === '<b>İst</b>anbul');
ok('ş/ğ/ü harf sayılıyor', calistir(true,'şeftali').telefon === '<b>şef</b>tali');
/* AYIRT EDİCİ ÖRNEK — bu satır olmadan Türkçe iddiası boştu.
   "İstanbul" ve "şeftali" \p{L} kaldırılsa da AYNI sonucu veriyor
   (8→7 ve 7→6 harf, ikisi de 3 harf kalın çıkıyor); yani o iki test
   Türkçe desteğini hiç ölçmüyordu. "gözlüğümü"de 9 harften 5'i ASCII
   dışı: \p{L} varken 4, yokken 2 harf kalınlaşır. */
ok('Türkçe harf ağırlıklı kelimede kalınlık doğru (gözlüğümü)',
   calistir(true,'gözlüğümü').telefon === '<b>gözl</b>üğümü');

/* ---------- HTML ENJEKSİYONU ----------
   Senaryo kullanıcı metni. Dilimleme kaçıştan SONRA yapılırsa '&amp;'
   ortadan bölünür ve bozuk çıktı üretir; kaçış hiç yapılmazsa etiket
   sufle ekranına gerçek HTML olarak girer. */
for (const [ad, kaynak] of [['telefon', 'telefon'], ['Mac', 'mac']]) {
  const r1 = calistir(true, '<script>')[kaynak];
  ok(ad+': etiket ham HTML olarak geçmiyor', !/<script/i.test(r1) && r1.includes('&lt;'));
  const r2 = calistir(true, 'A&B')[kaynak];
  ok(ad+': & kaçışı ortadan bölünmüyor', !/&(?!amp;|lt;|gt;)/.test(r2));
  const r3 = calistir(true, '&')[kaynak];
  ok(ad+': tek "&" kelimesi bozulmuyor', !/&(?!amp;|lt;|gt;)/.test(r3));
}

/* ---------- PLATFORM PARİTESİ: AYNI GİRDİ → AYNI ÇIKTI ----------
   "Mac'e de eklendi" demek yetmez; farklı davranan bir kopya paritenin
   kendisini yalanlar. */
const ORNEKLER = ['merhaba','a','İstanbul','şeftali','"selam','<script>','A&B','&','...','2026',
                  'kararlaştırılamayanlardan','x1','(parantez)','—tire',
                  'gözlüğümü','çğışöü','ÇİĞDEM'];
let sapma = null;
for (const w of ORNEKLER) {
  for (const acik of [true,false]) {
    const r = calistir(acik, w);
    if (r.telefon !== r.mac) { sapma = w+' (açık='+acik+'): telefon="'+r.telefon+'" mac="'+r.mac+'"'; break; }
  }
  if (sapma) break;
}
ok('telefon ve Mac '+ORNEKLER.length+' örnekte birebir aynı çıktıyı veriyor'+(sapma?' — SAPMA: '+sapma:''), !sapma);

/* ---------- AYAR GERÇEKTEN BAĞLI MI (ölü ayar kilidi) ----------
   Anahtar açılıp hiçbir şey olmaması bu deponun en sık hatası. */
ok('Mac: anahtar arayüzde var', /data-t="bionic"/.test(mac));
ok('Mac: durum varsayılanı tanımlı', /bionic:false/.test(mac));
ok('Mac: anahtar değişince yeniden çiziliyor', /k==='bionic'\)\{\s*buildWords\(\)/.test(mac));
ok('Mac: kelime inşası biyonik() üzerinden geçiyor', /class="w">'\+biyonik\(m\)/.test(mac));
/* Desen KODUN METNİNE değil İDDİAYA bağlı olmalı: kelime span'ının içeriğine
   sonradan noktalama eklendi (bkz. tests/47) ve ">'+bionic(clean)" birebir
   deseni, davranış bozulmadığı hâlde kapıyı kırmızıya çevirdi.
   Korunan iddia: okunan kelime bionic()'ten geçiyor. */
ok('telefon: kelime inşası bionic() üzerinden geçiyor', /bionic\(clean\)/.test(tel));
ok('telefon: bionic çıktısı kelime span\'ının içinde',
   /class="w[^']*'[^;]*bionic\(clean\)[\s\S]{0,40}<\/span>/.test(tel));
