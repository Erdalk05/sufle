const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu()), mac=oku(macYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');
const macKod=mac.replace(/\/\*[\s\S]*?\*\//g,'');

/* I4 — .srt ZAMAN BİÇİMİ 1 SAATİ AŞAN ÇEKİMDE DOĞRU MU: DOĞRUYDU (çürüdü).
   Ölçülen eski çıktılar: 3600 → 01:00:00,000 · 7200 → 02:00:00,000 ·
   86399,999 → 23:59:59,999. Saat alanı sorunsuz.

   AMA AYNI FONKSİYONDA GERÇEK BİR KUSUR VARDI — DÖRT HANELİ MİLİSANİYE.
   Saniye ve milisaniye AYRI hesaplanıyordu:
       ms = Math.round((s - Math.floor(s)) * 1000)
   Ondalık kısım 0,9995i aşınca bu 1000 veriyor ve saniyeye DEVRETMİYOR:
       5,9996    → "00:00:05,1000"
       12,99951  → "00:00:12,1000"
       59,9999   → "00:00:59,1000"
       3599,9999 → "00:59:59,1000"
   Dört haneli milisaniye alanı geçerli .srt değil; katı ayrıştırıcılar o
   kuyruğu ya da dosyanın tamamını reddeder. Damgalar `recElapsed()`ten gelen
   serbest ondalıklar olduğu için ihtimal binde bir civarında ve HER ÇEKİMDE
   yeniden atılıyor: 100 damgalık bir videoda yaklaşık %5 (aşağıda sayıldı).

   Çözüm: damga tek kaynaktan, tam milisaniyeden türetiliyor. */

const kur=(src,re,ad,imza)=>{
  const m=src.match(re);
  ok('çıkarılabildi: '+ad, !!m);
  return m ? new Function(m[0]+'; return tc;')() : null;
};
const tc=kur(kod,/function tc\(s,sep\)\{[\s\S]*?\n\}/,'telefon tc');
const mtc=kur(macKod,/function tc\(s\)\{[\s\S]*?p\(ms,3\); \}/,'Mac tc');
if(!tc || !mtc) return;
const T=s=>tc(s,',');

/* ---------- BİÇİM HER ZAMAN GEÇERLİ Mİ ---------- */
const GECERLI=/^\d{2,}:[0-5]\d:[0-5]\d,\d{3}$/;
{
  /* Eskiden kırılan tam değerler. */
  const kirilanlar=[
    [5.9996,     '00:00:06,000'],
    [12.99951,   '00:00:13,000'],
    [59.9999,    '00:01:00,000'],
    [3599.9999,  '01:00:00,000'],
    [0.9999,     '00:00:01,000'],
    [59.99999,   '00:01:00,000'],
    [3659.9996,  '01:01:00,000'],
  ];
  for(const [s,beklenen] of kirilanlar){
    ok('devretme doğru: '+s+' → '+beklenen, T(s)===beklenen);
    ok('biçim geçerli: '+s, GECERLI.test(T(s)));
  }
}
{
  /* Sıradan değerler bozulmamalı. */
  const normal=[
    [0,          '00:00:00,000'],
    [0.5,        '00:00:00,500'],
    [59.999,     '00:00:59,999'],
    [60,         '00:01:00,000'],
    [3599.999,   '00:59:59,999'],
    [3600,       '01:00:00,000'],
    [3661.5,     '01:01:01,500'],
    [7200,       '02:00:00,000'],
    [86399.999,  '23:59:59,999'],
  ];
  for(const [s,beklenen] of normal) ok('değişmedi: '+s+' → '+beklenen, T(s)===beklenen);
}
{
  /* Negatif ve saçma girdi çökertmemeli: buildCues kayması (±2 sn) damgayı
     eksiye düşürebiliyor, o yüzden kırpma duruyor. */
  ok('negatif damga sıfıra kırpılıyor', T(-5)==='00:00:00,000');
  ok('çok küçük negatif de sıfır', T(-0.0004)==='00:00:00,000');
  ok('negatif biçimi de geçerli', GECERLI.test(T(-5)));
}

/* ---------- KAPSAMLI TARAMA: HİÇBİR DEĞER GEÇERSİZ BİÇİM ÜRETMEMELİ ----------
   Rastgele değil, kırılmanın olduğu bölgeyi de kapsayan yoğun tarama. */
{
  let bozuk=0, ornek=null, sayilan=0;
  for(let ms=0; ms<=3700000; ms+=997){            // ~1 saat 2 dk, asal adım
    const s=ms/1000, c=T(s); sayilan++;
    if(!GECERLI.test(c)){ bozuk++; if(!ornek) ornek=s+' → '+c; }
  }
  ok(sayilan+' damganın hepsi geçerli biçimde'+(ornek?' (ilk bozuk: '+ornek+')':''), bozuk===0);
}
{
  /* KUSURUN SIKLIĞI ÖLÇÜLDÜ: eski kural 0,9995 üstü ondalıkta kırılıyordu.
     Bu, tekdüze dağılmış damgaların binde 5inde demek; 100 damgalık bir
     videoda en az bir bozuk kuyruk ihtimali ~%4,9. Yani nadir değil, düzenli. */
  const eski=(s)=>{ s=Math.max(0,s);
    const h=Math.floor(s/3600), m=Math.floor(s%3600/60), sec=Math.floor(s%60);
    const ms=Math.round((s-Math.floor(s))*1000);
    const p=(n,l)=>String(n).padStart(l,'0');
    return p(h,2)+':'+p(m,2)+':'+p(sec,2)+','+p(ms,3); };
  /* İLK SONDAM YANLIŞTI: ürettiğim ondalıklar kırılma bölgesine (0,9995 üstü)
     hiç düşmüyordu ve "0 vaka" çıktı. Ondalığı DOĞRUDAN tekdüze taramak
     gerekiyor; oran ancak böyle dürüstçe ölçülür. */
  let eskiBozuk=0, yeniBozuk=0;
  const ADET=100000;
  for(let i=0;i<ADET;i++){
    const s=12 + i/ADET;                       // ondalık 0 ile 1 arasında tekdüze
    if(!GECERLI.test(eski(s))) eskiBozuk++;
    if(!GECERLI.test(T(s)))    yeniBozuk++;
  }
  const oran=eskiBozuk/ADET;
  ok('eski kural bozuk damga üretiyordu ('+eskiBozuk+'/'+ADET+' = binde '+(oran*1000).toFixed(1)+')',
     eskiBozuk>0);
  /* 100 damgalık bir videoda en az bir bozuk kuyruk ihtimali. */
  const videoRiski=1-Math.pow(1-oran,100);
  ok('100 damgalık videoda risk kayda değerdi (%'+(videoRiski*100).toFixed(1)+')', videoRiski>0.02);
  ok('yeni kural hiç bozuk damga üretmiyor', yeniBozuk===0);
}

/* ---------- İKİ PLATFORM AYNI ---------- */
{
  const dene=[0,0.5,5.9996,12.99951,59.9999,60,3599.9999,3600,3661.5,7200,86399.999,-5];
  let fark=0;
  for(const s of dene) if(T(s)!==mtc(s)) fark++;
  ok('telefon ve Mac damgaları birebir aynı ('+dene.length+' değer)', fark===0);
}

/* ---------- SRT DOSYASI BÜTÜN OLARAK GEÇERLİ Mİ ---------- */
{
  const mSrt=kod.match(/function srtText\(\)\{[\s\S]*?\n\}/);
  ok('srtText çıkarılabildi', !!mSrt);
  if(mSrt){
    const srt=new Function('buildCues','tc', mSrt[0]+'; return srtText;')(
      ()=>[{start:5.9996,end:8.4,text:'birinci'},{start:8.4,end:12.99951,text:'ikinci'}],
      tc);
    const cikti=srt();
    ok('kuyruklar 1den başlayarak numaralanıyor', /^1\n/.test(cikti));
    ok('okla ayrılıyor', /-->/.test(cikti));
    /* Asıl sınav: dosyadaki HİÇBİR zaman satırı dört haneli milisaniye
       içermemeli — bir tanesi bile ayrıştırıcıyı bozar. */
    const zamanlar=cikti.match(/^\d{2,}:\d{2}:\d{2},\d+ --> \d{2,}:\d{2}:\d{2},\d+$/gm)||[];
    ok('iki zaman satırı da üretildi', zamanlar.length===2);
    ok('hiçbir zaman satırında dört haneli milisaniye yok', !/,\d{4}/.test(cikti));
    ok('metinler yerinde', /birinci/.test(cikti) && /ikinci/.test(cikti));
  }
}

/* ---------- KAYNAK DÜZEYİ ---------- */
ok('damga tam milisaniyeden türetiliyor (telefon)', /Math\.round\(s\*1000\)/.test(kod));
ok('damga tam milisaniyeden türetiliyor (Mac)', /Math\.round\(s\*1000\)/.test(macKod));
ok('eski ayrı-hesap kuralı kalmadı (telefon)',
   !/Math\.round\(\(s-Math\.floor\(s\)\)\*1000\)/.test(kod));
ok('eski ayrı-hesap kuralı kalmadı (Mac)',
   !/Math\.round\(\(s-Math\.floor\(s\)\)\*1000\)/.test(macKod));
ok('negatif kırpma duruyor (telefon)', /Math\.max\(0,Math\.round\(s\*1000\)\)/.test(kod));
ok('negatif kırpma duruyor (Mac)', /Math\.max\(0,Math\.round\(s\*1000\)\)/.test(macKod));
