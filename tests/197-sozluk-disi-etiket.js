const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu,macYolu,oku,esnek}=require('./kaynak');

/* SÖZLÜĞÜ ATLAYAN KULLANICI METNİ — CIRCIR KAPISI (2026-08-19).

   ÖLÇÜLDÜ: telefon kabuğunda `L==='tr' ? 'Türkçe' : 'English'` biçiminde
   **172**, masaüstünde **17** kullanıcı metni vardı. Bunlar `I18N`in dışında
   yaşıyor ve bu, deponun ÜÇ kapısının birden kör noktası:
     · i18n kapsam denetimi (tests/122) sözlüğe bakar, bunları görmez;
     · çeviri kaçağı taraması sözlük değerlerini tarar, bunları görmez;
     · çizilmiş arayüz denetimi (`kontrast.py`) yalnız EKRANDA O AN duran
       metni ölçer — bu cümlelerin çoğu bir koşul gerçekleşmeden çizilmez.

   VE ASIL SONUÇ: **üçüncü arayüz dilinin önündeki engel çeviri değil, bu
   metinler.** Sözlüğe üçüncü bir dil bloğu eklemek kolaydır; 160 ikili dal
   ise her birinde ayrı ayrı düzeltilmek zorunda kalır ve biri unutulursa
   kullanıcı yarı çevrilmiş bir arayüz görür — yani en kötü sonuç.

   BU YÜZDEN SAYI DEĞİL, YÖN ÖLÇÜLÜYOR: taban yalnız AŞAĞI iniyor. Kapsam
   kapısı, bozma sayacı ve parite tabanı ile aynı desen — düzeltmeyi zorunlu
   kılmadan geri gitmeyi imkânsız kılıyor.

   BİLİNEN VE KASITLI SINIR: yerel ayar kodları (`'tr-TR'`/`'en-US'`) da bu
   desende yazılıyor ama onlar kullanıcı metni değil, API girdisi. Ayrı
   ayıklamak dedektörü kırılgan yapardı; taban onları da içeriyor ve sayı
   sıfıra inmeyecek — hedef sıfır değil, HER SÜRÜMDE DAHA AZ. */

const TABAN=path.join(__dirname,'sozluk-disi-taban.json');
const CIFT=/L==='tr'\s*\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/g;

function say(src){ return (src.match(CIFT)||[]).length; }

const tel=esnek(esnek(oku(telefonYolu()))), mac=esnek(esnek(oku(macYolu())));
const sayi={tel:say(tel), mac:say(mac)};

ok('telefon kabuğu okunabildi (ölçmeyen kapı olmasın)', tel.length>10000);
ok('Mac kabuğu okunabildi', mac.length>10000);
/* Dedektörün kendi ayırt ediciliği: deseni bulamayan bir sayaç her zaman
   sıfır der ve taban sonsuza kadar "iyileşmiş" görünür. */
ok('desen gerçekten eşleşiyor (sayaç ölü değil)',
   say("x=L==='tr'?'Merhaba':'Hello';")===1);
ok('tek dilli dize sayılmıyor', say("x='Merhaba';")===0);

let taban=null;
try{ taban=JSON.parse(fs.readFileSync(TABAN,'utf8')); }catch(_){}
if(!taban){
  console.log('   · sözlük dışı etiket tabanı ilk kez yazılıyor:', JSON.stringify(sayi));
  ok('taban yazılabildi', (fs.writeFileSync(TABAN, JSON.stringify(sayi,null,1)), true));
} else {
  const buyuyen=Object.keys(sayi).filter(k=>sayi[k] > (taban[k]??0));
  ok('sözlük dışı kullanıcı metni ARTMADI'+
     (buyuyen.length?' — artan: '+buyuyen.map(k=>k+' '+taban[k]+'→'+sayi[k]).join(', '):'')+
     ' (telefon '+sayi.tel+' · Mac '+sayi.mac+')',
     buyuyen.length===0);
  if(!buyuyen.length){
    const yeni={}; let dustu=false;
    for(const k of Object.keys(sayi)){
      yeni[k]=Math.min(sayi[k], taban[k]??sayi[k]);
      if(yeni[k] < (taban[k]??Infinity)) dustu=true;
    }
    if(dustu){
      fs.writeFileSync(TABAN, JSON.stringify(yeni,null,1));
      console.log('   · taban sıkıştı:', JSON.stringify(yeni));
    }
  }
}

/* IŞIK DENETÇİSİ İLK TAŞINAN GRUPTU — geri dönüş olmasın diye kilitli.
   Cümleleri iki kabukta da gömülüydü (`cekirdek/isik.js` üzerinden) ve
   masaüstündeki 17 metnin 12'si buydu; taşınınca Mac 17 → 5'e indi. */
for(const [ad,src] of [['telefon',tel],['Mac',mac]]){
  ok(ad+': ışık denetçisi cümleleri sözlükten okunuyor',
     /isikYaz\(tt,'isikKaranlik'\)/.test(src));
  /* Kapsam GÖMÜLÜ MODÜL BLOĞU — kabuğun geri kalanında hâlâ 160 ikili dal
     var ve onları burada suçlamak testi anlamsız kırardı; asıl iddia ışık
     modülünün geri DÖNMEMESİ. */
  const blokM=src.match(/==CEKIRDEK:isik\.js==[\s\S]*?==\/CEKIRDEK:isik\.js==/);
  ok(ad+': ışık modülü kabuğa gömülü', !!blokM);
  ok(ad+': ışık modülünde gömülü çift dilli cümle kalmadı',
     !!blokM && !/L==='tr'\s*\?/.test(blokM[0].replace(/\/\*[\s\S]*?\*\//g,'')));
}
/* Anahtarların ikisi de iki dilde tanımlı olmalı: yalnız TR yazılırsa
   İngilizce arayüzde `undefined` görünürdü. */
for(const k of ['isikSiyah','isikKaranlik','isikArka','isikPatlak','isikYassi',
                'isikEgik','isikIyi','isikKapaliT']){
  ok('"'+k+'" iki dilde tanımlı', (tel.match(new RegExp(k+":'",'g'))||[]).length===2);
}
/* Yer tutucular İKİ DİLDE de aynı olmalı: biri `{y}` diğeri `{face}` derse
   sayı yalnız bir dilde yerine oturur ve diğerinde süslü parantez görünür. */
{
  /* İki dil bloğunu sözlüğün kendisinden ayır: `en:{` ile başlayan ikinci
     blok. Karmaşık bir düzenli ifade yerine bölme — dedektörün kendi
     kırılganlığı, ölçtüğü kusurdan pahalıya patlar. */
  const soz=tel.slice(tel.indexOf('const I18N={'));
  /* Gömülü kabukta girinti bir boşluğa iniyor (derleyici sadeleştiriyor);
     sabit girinti aramak dedektörü kabuğun BİÇİMİNE bağlar. */
  const kes=soz.search(/\n\s*en:\{/);
  const blok=(dil)=> dil==='tr' ? soz.slice(0,kes) : soz.slice(kes);
  for(const k of ['isikKaranlikD','isikArkaD','isikPatlakD','isikEgikD','isikIyiD']){
    /* Kaçış sayısı ÖNEMLİ: fazladan bir çift ters eğik çizgi, deseni "İKİ
       ters eğik çizgi" arar hâle getiriyor ve kaçışlı kesme işareti taşıyan
       değer (isikPatlakD) sessizce bulunamıyor — dedektörün kendi kusuru. */
    const al=(b)=>{ const m=b.match(new RegExp(k+":'((?:[^'\\\\]|\\\\.)*)'"));
                    return m?[...new Set(m[1].match(/\{\w+\}/g)||[])].sort().join(''):null; };
    const tr=al(blok('tr')), en=al(blok('en'));
    ok('"'+k+'" yer tutucuları iki dilde aynı ('+tr+')', !!tr && tr===en);
  }
}

/* ---------- YER TUTUCU TAŞIYAN ANAHTAR, DOLDURULARAK OKUNMALI ----------
   Cümleler sözlüğe taşınınca yeni bir sessiz kusur sınıfı doğdu: değerde
   `{n}` var ama çağrı yeri onu doldurmuyor. Ekranda süslü parantez görünür,
   kaynakta hiçbir şey görünmez ve hiçbir kapı bunu ölçmüyordu — bir kasıtlı
   bozma "inmeyince" ortaya çıktı.

   KURAL: değeri yer tutucu içeren HER anahtar, dolduran bir yardımcıdan
   geçmeli (`srY(t('K'),…)` ya da çekirdeğin `isikYaz(tt,'K',…)`si).
   Kural biçim değil DAVRANIŞ kilitliyor: yardımcının adı değişirse burası
   da değişir, ama "yer tutucu doldurulmalı" iddiası ayakta kalır. */
{
  const soz=tel.slice(tel.indexOf('const I18N={'));
  const kes=soz.search(/\n\s*en:\{/);
  const trBlok=soz.slice(0,kes);
  const yerTutuculu=[...trBlok.matchAll(/(\w+):'((?:[^'\\]|\\.)*)'/g)]
    .filter(m=>/\{\w+\}/.test(m[2])).map(m=>m[1]);
  ok('yer tutucu taşıyan anahtar var (ölçüm ölü değil)', yerTutuculu.length>=10);
  const doldurulmayan=yerTutuculu.filter(k=>{
    /* İki meşru yol var: yer tutucu dolduran yardımcı, ya da deponun eski
       idiomu `t('K').replace('{x}', …)`. İkisi de kabul; ölçülen şey
       yer tutucunun DOLDURULMASI, yardımcının adı değil. */
    const kullanim=new RegExp("(srY|isikYaz)\\((tt,)?\\s*t?\\(?'"+k+"'"+
                              "|t\\('"+k+"'\\)\\.replace\\(");
    /* Kabuklardan HERHANGİ BİRİNDE dolduruluyorsa yeter: bazı anahtarlar
       yalnız tek kabukta kullanılıyor. Hiç kullanılmayan anahtarı zaten
       denetim.py "ölü anahtar" diye bildiriyor. */
    return !(kullanim.test(tel) || kullanim.test(mac));
  });
  ok('yer tutucu taşıyan her anahtar doldurularak okunuyor'+
     (doldurulmayan.length?' — doldurulmayan: '+doldurulmayan.join(', '):''),
     doldurulmayan.length===0);
}

