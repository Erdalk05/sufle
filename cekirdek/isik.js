/* IŞIK VE ÇERÇEVE DENETÇİSİNİN ORTAK HESABI — iki kabukta da aynı.

   NEDEN ÇEKİRDEKTE: denetçi yalnız telefonda vardı. Masaüstünde `lightBtn`
   ve `lightHint` sözlükte DURUYORDU ama karşılığında hiçbir şey yoktu —
   yani ortak sözlükte ölü anahtar. Masaüstü kullanıcısı da bir kamera
   karşısında oturuyor ve aynı üç hatayı yapıyor: arkadan ışık, patlayan
   ışık, yassı görüntü. Kodu kopyalamak yerine hesabı buraya aldım; kopya
   sürüm, biri düzeltilip diğeri unutulunca sessizce ayrışır (bu depoda
   ölçülmüş hata sınıfı).

   BURADA OLAN: piksellerden istatistik + istatistikten öğüt. İkisi de saf —
   ne DOM ne kamera bilir, bu yüzden node'da sentetik kareyle sınanabiliyor
   (tests/51 tam olarak bunu yapıyor).

   BURADA OLMAYAN (kabuğa özgü, kasıtlı): kareyi kameradan alan tuval,
   panelin çizimi ve EĞİM. Eğim telefonda `deviceorientation` ile ölçülüyor;
   masaüstü dizüstünde o olay yok, olsa da ekran eğimi kamerayı eğmiyor.
   Bu yüzden eğim bir PARAMETRE: veren kabuk verir, vermeyen `null` geçer ve
   satır hiç çıkmaz. (Ölü ayar tuzağının tersi: koşulu olmayan platformda
   özelliği hiç göstermemek.) */

/* Örnekleme ızgarası SABİT. Merkez kutusu (yüzün olması beklenen bölge) da
   sabit sayılardan türüyor; bölenlerin hiçbiri sıfır olamıyor, yani boş/siyah
   karede bile NaN çıkmıyor — tests/51 bu durumu kilitliyor. */
const ISIK_W = 32, ISIK_H = 48;
const ISIK_MERKEZ = { x0: 8, x1: 24, y0: 8, y1: 34 };

/* RGBA dizisinden istatistik. Parlaklık ITU-R BT.709 ağırlıkları (gözün
   yeşile duyarlılığı) — basit ortalama alsaydık yeşil perde ölçümü de
   yanılırdı. */
function isikIstatistik(d){
  let all=0,n=0, ctr=0,cn=0, edge=0,en=0, hot=0, dark=0, sum2=0;
  for(let y=0;y<ISIK_H;y++) for(let x=0;x<ISIK_W;x++){
    const i=(y*ISIK_W+x)*4;
    const l=0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2];
    all+=l; n++; sum2+=l*l;
    if(l>250) hot++; if(l<8) dark++;
    const inCenter = x>=ISIK_MERKEZ.x0&&x<ISIK_MERKEZ.x1 && y>=ISIK_MERKEZ.y0&&y<ISIK_MERKEZ.y1;
    if(inCenter){ ctr+=l; cn++; } else { edge+=l; en++; }
  }
  const mean=all/n, sd=Math.sqrt(Math.max(0,sum2/n-mean*mean));
  return {mean, sd, center:ctr/cn, edge:edge/en, hotPct:hot/n*100, darkPct:dark/n*100};
}

/* İstatistikten kullanıcının okuyacağı öğütler.
   `tiltDeg` null ise eğim satırı hiç üretilmez (masaüstü).

   ⚠️ METİNLER ARTIK SÖZLÜKTE (2026-08-19). Önce burada `L==='tr'?…:…` ile
   yazılıyorlardı ve sözlüğün dışında kalan kullanıcı metni ÜÇ kapının birden
   kör noktası: i18n kapsamı, çeviri kaçağı taraması ve çizilmiş arayüz
   denetimi hiçbiri oraya bakmıyor. Üçüncü arayüz dilinin önündeki asıl engel
   de bu — çeviri değil, sözlüğü atlayan metinler.

   `tt` bir ARAMA FONKSİYONU (kabuğun `t`si). Modül saf kalıyor: dile değil,
   verilen aramaya bağlı; test de kendi sözlüğüyle koşturabiliyor. */
function isikYaz(tt, anahtar, degerler){
  let m=String(tt(anahtar)||'');
  for(const k in (degerler||{})) m=m.split('{'+k+'}').join(degerler[k]);
  return m;
}

function isikBulgular(s, tt, tiltDeg){
  /* SİYAH KARE — IŞIK SORUNU DEĞİL, GÖRÜNTÜ YOK.
     Kamera açık görünüyor ama kare bomboş: mercek kapağı/parmak, ya da iOS
     arka plandan dönerken bir süre boş kare veriyor. Eskiden bu duruma
     "Yüzün karanlık — ışığı yüzünün önüne al" ve "Görüntü yassı — ışık ekle"
     deniyordu. Kullanıcı ışık ekliyor, hiçbir şey değişmiyor; asıl sebep
     hiçbir yerde yazmıyor.
     Erken dönüyoruz: yanıltıcı ışık öğüdünü üstüne yığmanın anlamı yok. */
  if(s.darkPct>90) return [{lv:'bad', t:isikYaz(tt,'isikSiyah'), d:isikYaz(tt,'isikSiyahD')}];
  const out=[];
  const y=Math.round(s.center), a=Math.round(s.edge), k=Math.round(s.sd);
  if(s.center<55) out.push({lv:'bad', t:isikYaz(tt,'isikKaranlik'),
    d:isikYaz(tt,'isikKaranlikD',{y})});
  else if(s.center<85) out.push({lv:'warn', t:isikYaz(tt,'isikAzKaranlik'),
    d:isikYaz(tt,'isikAzKaranlikD',{y})});
  if(s.edge>s.center*1.55) out.push({lv:'bad', t:isikYaz(tt,'isikArka'),
    d:isikYaz(tt,'isikArkaD',{a,y})});
  if(s.hotPct>8) out.push({lv:'warn', t:isikYaz(tt,'isikPatlak'),
    d:isikYaz(tt,'isikPatlakD',{p:Math.round(s.hotPct)})});
  if(s.sd<16) out.push({lv:'warn', t:isikYaz(tt,'isikYassi'), d:isikYaz(tt,'isikYassiD')});
  if(tiltDeg!=null && Math.abs(tiltDeg)>4) out.push({lv:'warn', t:isikYaz(tt,'isikEgik'),
    d:isikYaz(tt,'isikEgikD',{d:Math.abs(Math.round(tiltDeg))})});
  if(!out.length) out.push({lv:'ok', t:isikYaz(tt,'isikIyi'),
    d:isikYaz(tt,'isikIyiD',{y,a,k})});
  return out;
}

/* KAMERA KAPALI SATIRI da ortak: iki kabukta farklı yazılsaydı, aynı
   durumda iki farklı cümle okunurdu. */
function isikKameraKapali(tt){
  return [{lv:'info', t:isikYaz(tt,'isikKapaliT'), d:isikYaz(tt,'isikKapaliD')}];
}
