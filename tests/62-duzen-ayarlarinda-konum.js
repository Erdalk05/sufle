const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar,esnek}=require('./kaynak');
const kod=esnek(esnek(oku(telefonYolu()))).replace(/\/\*[\s\S]*?\*\//g,'');

/* YAZI BOYUTU / SATIR ARALIĞI / KENAR BOŞLUĞU DEĞİŞİNCE KONUM KAYIYORDU
   Planın sorusu "maxPos güncelleniyor mu" idi. **Güncelleniyordu** — üç
   kaydırıcı da measure() çağırıyor, hipotez çürüdü.

   Ama asıl sorun bir alt katmandaydı: `pos` bir PİKSEL uzaklığı ve bu ayarlar
   satır sarmasını baştan hesaplatıyor, yani aynı piksel BAŞKA bir kelimeye
   denk geliyor. Ekran döndürmede (A5) düzeltilen şeyin aynısı; A5'in düzeltmesi
   yalnız resize/orientationchange olaylarını kapsıyordu.

   ÖLÇÜLDÜ (300 kelime, yazı 46→64: satırda 8→6 kelime, satır yüksekliği 60→84):
     50. kelimede  → 21 kelime geri
     150. kelimede → 72 kelime geri
     250. kelimede → 113 kelime geri
   Döndürmeden BÜYÜK, çünkü hem satır yüksekliği hem satırdaki kelime sayısı
   birlikte değişiyor. Bu ayarlar prova sırasında sürekli oynatılıyor. */

/* YENİDEN ÖLÇÜM İSTEĞİ — BİÇİME DEĞİL İDDİAYA BAK.
   Korunan şey "bu ayar yeniden ölçüm tetikliyor". İsteğin doğrudan rAF ile mi
   yoksa kare başına tek ölçüme indiren planlayıcıyla mı kurulduğu uygulama
   ayrıntısı; A1'de planlayıcı eklenince bu testler davranış hiç bozulmadığı
   hâlde kırmızıya döndü (bkz. CLAUDE.md test kilidi tablosu). */
const OLC='(?:olcPlanla\\(\\)|requestAnimationFrame\\(yenidenOlc\\))';
/* ---------- DÜZENİ DEĞİŞTİREN YOLLAR KELİMEYİ KORUYOR ---------- */
const KORUMALI=[
  ['yazı boyutu',      new RegExp("bind\\('#fs','fs',\\(\\)=>"+OLC+"\\)")],
  ['satır aralığı',    new RegExp("bind\\('#lh','lh',\\(\\)=>"+OLC+"\\)")],
  ['kenar boşluğu',    new RegExp("bind\\('#mg','mg',\\(\\)=>"+OLC+"\\)")],
  ['yazı tipi',        new RegExp("#fontSeg button[\\s\\S]{0,120}?"+OLC)],
  ['okuma çizgisi',    new RegExp("bind\\('#eye','eyePos',\\(\\)=>"+OLC+"\\)")],
];
for(const [ad,re] of KORUMALI) ok(ad+' değişince kelime korunuyor', re.test(kod));
/* Bu iddiayı FONKSİYONLA SINIRLA. İlk yazışımda deseni bütün dosyada aradım;
   `[\s\S]*?` fonksiyonun sonunda durmuyor, ilerideki bir eşleşmeyi buluyor ve
   bozma yakalanmıyordu. Önce bloğu çıkar, sonra içinde ara. */
ok('göz hattı reçetesinde kelime korunuyor',
   new RegExp(OLC).test(
     cikar(kod,/function applyEyeRecipe\(\)\{[\s\S]*?\n\}/,'applyEyeRecipe')));

/* ---------- DÜZENİ DEĞİŞTİRMEYEN YOL BOŞUNA DOKUNMUYOR ----------
   Okuma bandı yalnız bir CSS maskesi (--bandIn/--bandOut): ne satır sarmasını
   ne okuma çizgisini değiştiriyor. Orada measure yeterli; her şeyi yenidenOlc
   yapmak "her yere aynı çekici vurmak" olurdu. */
ok('okuma bandı hâlâ yalnız ölçüyor',
   /#bandSeg button[\s\S]{0,120}?requestAnimationFrame\(measure\)/.test(kod));
ok('bandın yalnız görsel olduğu doğrulanıyor (maske değişkenleri)',
   /--bandIn/.test(esnek(esnek(oku(telefonYolu())))) && /mask-image/.test(esnek(esnek(oku(telefonYolu())))));

/* ---------- MAXPOS ZATEN GÜNCELLENİYORDU (çürüyen hipotez, kilitlendi) ---------- */
const ms=cikar(kod,/function measure\(\)\{[\s\S]*?\n\}/,'measure');
ok('measure kelime konumlarını yeniden ölçüyor', /wordTops=words\.map\(/.test(ms));
ok('measure maxPos yeniden hesaplıyor', /maxPos = wordTops\.length \?/.test(ms));
ok('yenidenOlc measure çağırıyor (maxPos yine güncelleniyor)',
   /measure\(\);/.test(cikar(kod,/function yenidenOlc\(\)\{[\s\S]*?\n\}/,'yenidenOlc')));

/* ---------- KAYMA GERÇEKTEN OLUYOR MU: SAYIYLA ----------
   Gerçek yakinIdx ile ölç; düzeltmenin gerekçesi bu sayılar. */
{
  const yakinIdx=cikar(kod,/function yakinIdx\(y\)\{[\s\S]*?\n\}/,'yakinIdx');
  const bul=(tops,y)=>new Function('wordTops','y',yakinIdx+'; return yakinIdx(y);')(tops,y);
  const EYE=200, N=300;
  const duzen=(kelimePerSatir,lh)=>({
    tops:Array.from({length:N},(_,i)=>EYE+Math.floor(i/kelimePerSatir)*lh+lh/2),
    satir:i=>Math.floor(i/kelimePerSatir)
  });
  const KUCUK=duzen(8,60), BUYUK=duzen(6,84);   // yazı 46 → 64
  for(const K of [50,150,250]){
    const pos=KUCUK.tops[K]-EYE;
    const eski=bul(BUYUK.tops,pos+EYE);                       // pikseli koru
    const yeni=bul(BUYUK.tops,(BUYUK.tops[K]-EYE)+EYE);       // kelimeyi koru
    ok(K+'. kelimede eski davranış gerçekten sapıyordu (>15 kelime)',
       Math.abs(eski-K) > 15);
    ok(K+'. kelimede yeni davranış aynı satırda kalıyor',
       BUYUK.satir(yeni) === BUYUK.satir(K));
  }
}

/* ---------- OKUMA ÇİZGİSİ: FARKLI SEBEP, AYNI SONUÇ ----------
   eyePos satır sarmasını DEĞİŞTİRMİYOR ama konumun referansını değiştiriyor:
   vurgulanan kelime y = pos + eyeOff() ile bulunuyor. eyeOff değişip pos aynı
   kalırsa çizgide başka bir kelime belirir. */
{
  const yakinIdx=cikar(kod,/function yakinIdx\(y\)\{[\s\S]*?\n\}/,'yakinIdx');
  const bul=(tops,y)=>new Function('wordTops','y',yakinIdx+'; return yakinIdx(y);')(tops,y);
  const N=300, LH=60, EYE1=200, EYE2=400;      // çizgi ekranın ortasına indi
  const tops=Array.from({length:N},(_,i)=>EYE1+Math.floor(i/8)*LH+LH/2);
  const K=150, pos=tops[K]-EYE1;
  ok('okuma çizgisi taşınınca pikseli korumak başka kelime gösterir',
     bul(tops,pos+EYE2) !== K);
  ok('kelimeyi korumak doğru kelimeyi çizgide tutar',
     Math.floor(bul(tops,(tops[K]-EYE2)+EYE2)/8) === Math.floor(K/8));
}

/* ---------- A5 DÜZELTMESİ HÂLÂ YERİNDE ---------- */
ok('döndürme hâlâ yenidenOlc kullanıyor',
   /orientationchange',\(\)=>setTimeout\(yenidenOlc,320\)/.test(kod));
ok('yeniden boyutlandırma hâlâ yenidenOlc kullanıyor',
   new RegExp("'resize',\\(\\)=>"+OLC).test(kod));
ok('yenidenOlc kelime indeksini ölçümden ÖNCE alıyor',
   cikar(kod,/function yenidenOlc\(\)\{[\s\S]*?\n\}/,'yenidenOlc').indexOf('yakinIdx(pos+eyeOff())') <
   cikar(kod,/function yenidenOlc\(\)\{[\s\S]*?\n\}/,'yenidenOlc').indexOf('measure()'));
