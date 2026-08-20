const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cozJeton,esnek}=require('./kaynak');
const tel=esnek(esnek(oku(telefonYolu())));

/* K4 — YÜKSEK KONTRAST TEMASINDA KONTRAST ORANI WCAG AA MI: ÖLÇÜLDÜ.

   METİN KONTRASTI (WCAG 1.4.3, eşik 4,5:1) — İKİ TEMA DA GEÇİYOR:
     yüksek kontrast: sufle metni 21,00 · ipucu 17,21 · vurgu 15,61
     normal tema:     ana metin 18,37 · soluk metin 6,96 · vurgu 8,21
   Yani sorulan soru için cevap TEMİZ; hipotez bu yönüyle çürüdü.

   AMA METİN DIŞI KONTRAST (WCAG 1.4.11, eşik 3:1) BİR AÇIK BULDU.
   Yazı kutularının zemini sayfadan yalnız 1,06:1 ayrılıyor (#0d0d11 / #141418),
   yani kutuyu görünür kılan TEK şey kenarlık. O kenarlık ise:
     normal temada        #2a2a32 / #141418 = 1,29:1
     YÜKSEK KONTRASTTA da #2a2a32 / #000    = 1,48:1
   Yüksek kontrast kuralları senaryo düzenleyicisini, tetik kelimesi kutusunu,
   sekme düğmelerini ve iki ayracı hiç kapsamıyordu. Kullanıcı bu ayarı tam da
   bunun için açıyor — "ön koşulu sağlanmış ama uygulanmamış" sınıfı.
   Kapsam genişletildi; ölçüm aşağıda kapıya bağlı.

   NOT: normal temanın kenarlık rengini değiştirmedim. Onu 3:1e çıkarmak
   uygulamanın GÖRÜNÜMÜNÜ baştan aşağı değiştirirdi; bu bir tasarım kararı ve
   Erdal'a bırakıldı (plana yazıldı). Yüksek kontrast zaten bunun için var. */

/* WCAG 2.x bağıl parlaklık ve kontrast oranı. */
function lum(h){
  let c=String(h).replace('#','');
  if(c.length===3) c=c.split('').map(x=>x+x).join('');
  const v=[0,2,4].map(i=>parseInt(c.substr(i,2),16)/255)
                 .map(x=>x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4));
  return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];
}
const oran=(a,b)=>{ const l1=lum(a), l2=lum(b);
  return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };

/* Hesabın kendisi doğru mu — bilinen değerlerle sına. Yoksa bütün ölçüm
   sessizce yanlış olur ve kapı yanlış şeyi onaylar. */
ok('hesap doğru: beyaz/siyah 21:1', Math.abs(oran('#fff','#000')-21)<0.01);
ok('hesap doğru: aynı renk 1:1', Math.abs(oran('#123456','#123456')-1)<0.001);
ok('hesap kısa hex biçimini de anlıyor', Math.abs(oran('#000','#000000')-1)<0.001);

/* ---------- RENKLER KAYNAKTAN OKUNUYOR ---------- */
/* T55: yüzey renkleri artık telefonda ELLE YAZILI DEĞİL, çekirdek jetonlarına
   bağlı (`--card:var(--s-raised)`). Test hex biçimine kilitliyse, tek kaynağa
   geçiş "renk kayboldu" gibi görünür — oysa renk duruyor, adresi değişti.
   Ölçülmesi gereken şey ETKİN RENK; `cozJeton` var() zincirini çözüyor. */
/* Yorumlar ÖNCE atılıyor: `jetonlar.css` içindeki bir açıklama satırı
   "--accent:#00C853 her işi görüyor…" diye yazıyordu ve `match` ilk eşleşmeyi
   aldığı için testi YORUMDAN besliyordu. Bu deponun "gevşek desen" sınıfı. */
const telCss=tel.replace(/\/\*[\s\S]*?\*\//g,'');
const dv=(ad)=>{ const m=telCss.match(new RegExp('--'+ad+':\\s*([^;}]+?)\\s*;'));
                 const c=m ? cozJeton(m[1].trim()) : null;
                 const hex=c && /^#[0-9a-fA-F]{3,6}$/.test(c) ? c : null;
                 ok('değişken çözüldü: --'+ad+' → '+(hex||c), !!hex); return hex; };
const P={ txt:dv('txt'), muted:dv('muted'), accent:dv('accent'),
          sheetbg:dv('sheetbg'), card:dv('card'), line:dv('line') };
if(Object.values(P).some(x=>!x)) return;

/* ---------- METİN KONTRASTI: NORMAL TEMA ---------- */
{
  const olcumler=[
    ['ana metin / sayfa',   P.txt,   P.sheetbg],
    ['ana metin / siyah',   P.txt,   '#000'],
    ['soluk metin / sayfa', P.muted, P.sheetbg],
    ['soluk metin / kart',  P.muted, P.card],
    ['vurgu / sayfa',       P.accent,P.sheetbg],
    ['vurgu / siyah',       P.accent,'#000'],
  ];
  for(const [ad,on,arka] of olcumler){
    const r=oran(on,arka);
    ok('AA geçiyor — '+ad+' ('+r.toFixed(2)+':1)', r>=4.5);
  }
}

/* ---------- METİN KONTRASTI: YÜKSEK KONTRAST TEMASI ---------- */
{
  /* Renkleri kuralın kendisinden oku; elle yazarsam tema değişince test yalan söyler. */
  const hicon=(re,ad)=>{ const m=tel.match(re); ok('yüksek kontrast kuralı: '+ad, !!m); return m&&m[1]; };
  const ipucu = hicon(/body\.hicon \.hint,body\.hicon \.row label,body\.hicon \.s\{color:(#[0-9a-fA-F]{3,6})/,'ipucu rengi');
  const sufle = hicon(/body\.hicon #scroller\{color:(#[0-9a-fA-F]{3,6})/,'sufle rengi');
  const vurgu = hicon(/body\.hicon\{--accent:(#[0-9a-fA-F]{3,6})\}/,'vurgu rengi');
  if(ipucu && sufle && vurgu){
    ok('AA geçiyor — yüksek kontrast ipucu metni ('+oran(ipucu,'#000').toFixed(2)+':1)', oran(ipucu,'#000')>=4.5);
    ok('AA geçiyor — yüksek kontrast sufle metni ('+oran(sufle,'#000').toFixed(2)+':1)', oran(sufle,'#000')>=4.5);
    ok('AA geçiyor — yüksek kontrast vurgu rengi ('+oran(vurgu,'#000').toFixed(2)+':1)', oran(vurgu,'#000')>=4.5);
    /* Seçili segmentte yazı SİYAH oluyor; oran ters yönde de tutmalı. */
    ok('AA geçiyor — seçili segment yazısı ('+oran('#000',vurgu).toFixed(2)+':1)', oran('#000',vurgu)>=4.5);
    ok('yüksek kontrast normal temadan GERÇEKTEN daha kontrastlı',
       oran(sufle,'#000') > oran(P.txt,P.sheetbg));
  }
}

/* ---------- ASIL BULGU: METİN DIŞI KONTRAST VE KAPSAM ---------- */
{
  /* Kusurun dayanağı: kutunun zemini sayfadan neredeyse ayrılmıyor. */
  /* Kutu zemini de jetona bağlandı (T55): elle yazılı #0d0d11 yerine
     `var(--s-bg)`. Ölçülen şey yine ETKİN renk. */
  const ham=(telCss.match(/textarea\{[^}]*background:([^;]+);/)||[])[1];
  const cz=ham?cozJeton(ham.trim()):null;
  const kutuIci=cz&&/^#[0-9a-fA-F]{3,6}$/.test(cz)?cz:null;
  ok('yazı kutusu zemini okunabildi', !!kutuIci);
  if(kutuIci){
    const r=oran(kutuIci,P.sheetbg);
    ok('kutu zemini sayfadan neredeyse ayrılmıyor — kenarlık tek ayırt edici ('+r.toFixed(2)+':1)', r<1.2);
  }
  const kenar=oran(P.line,P.sheetbg);
  ok('normal tema kenarlığı 3:1 eşiğini geçiyor ('+kenar.toFixed(2)+':1)', kenar>=3);
}
{
  /* DÜZELTME: yüksek kontrast artık yazı kutularını ve ayraçları da kapsıyor. */
  const kural=(re,ad)=>{ const v=(tel.match(re)||[])[1]; ok('kapsanıyor: '+ad, !!v); return v; };
  const ta   = kural(/body\.hicon textarea,body\.hicon input\[type=text\]\{border-color:(#[0-9a-fA-F]{3,6})/,'yazı kutuları');
  const tabs = kural(/body\.hicon \.tabs button\{border-color:(#[0-9a-fA-F]{3,6})/,'sekme düğmeleri');
  const tog  = kural(/body\.hicon \.tog\{border-top-color:(#[0-9a-fA-F]{3,6})/,'anahtar ayracı');
  const kv   = kural(/body\.hicon \.kv\{border-bottom-color:(#[0-9a-fA-F]{3,6})/,'bilgi satırı ayracı');
  for(const [ad,renk] of [['yazı kutusu',ta],['sekme',tabs],['anahtar ayracı',tog],['bilgi ayracı',kv]]){
    if(!renk) continue;
    const r=oran(renk,'#000');
    ok('metin dışı 3:1 sağlanıyor — '+ad+' ('+r.toFixed(2)+':1)', r>=3);
  }
  /* Kutunun içi de siyaha çekilmeli: beyaz kenarlık + koyu gri zemin,
     kenarlığı görünür kılar ama kutunun İÇİ hâlâ sayfadan ayrılmaz. */
  const zemin=(tel.match(/body\.hicon textarea,body\.hicon input\[type=text\]\{[^}]*background:(#[0-9a-fA-F]{3,6})/)||[])[1];
  ok('yüksek kontrastta kutu zemini de tanımlı', !!zemin);
  if(zemin && ta) ok('kutu içi ile kenarlığı ayrışıyor ('+oran(ta,zemin).toFixed(2)+':1)', oran(ta,zemin)>=3);
}
{
  /* Eski kapsam bozulmamalı. */
  for(const [ad,re] of [
    ['segment düğmeleri', /body\.hicon \.seg button\{border-color:#fff!important;color:#fff!important\}/],
    ['seçili segment',    /body\.hicon \.seg button\.on\{background:#00ff7f!important;color:#000!important\}/],
    ['liste kartları',    /body\.hicon \.listitem\{border-color:#fff!important\}/],
    ['sayfa zemini',      /body\.hicon \.sheet\{background:#000!important\}/],
  ]) ok('eski kapsam duruyor: '+ad, re.test(tel));
}

/* ---------- AYAR GERÇEKTEN BAĞLI MI ---------- */
ok('yüksek kontrast anahtarı var', /data-t="hicon"/.test(tel));
ok('anahtar gövdeye sınıf ekliyor', /body\.classList\.toggle\('hicon',!!st\.hicon\)/.test(tel));
ok('ayar kayıtlı durumda tanımlı', /hicon:false/.test(tel));
