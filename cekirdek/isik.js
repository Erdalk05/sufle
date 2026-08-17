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
   `tiltDeg` null ise eğim satırı hiç üretilmez (masaüstü). */
function isikBulgular(s, L, tiltDeg){
  /* SİYAH KARE — IŞIK SORUNU DEĞİL, GÖRÜNTÜ YOK.
     Kamera açık görünüyor ama kare bomboş: mercek kapağı/parmak, ya da iOS
     arka plandan dönerken bir süre boş kare veriyor. Eskiden bu duruma
     "Yüzün karanlık — ışığı yüzünün önüne al" ve "Görüntü yassı — ışık ekle"
     deniyordu. Kullanıcı ışık ekliyor, hiçbir şey değişmiyor; asıl sebep
     hiçbir yerde yazmıyor.
     Erken dönüyoruz: yanıltıcı ışık öğüdünü üstüne yığmanın anlamı yok. */
  if(s.darkPct>90) return [{lv:'bad',
    t:(L==='tr'?'Kamera siyah kare veriyor':'The camera is sending a black frame'),
    d:(L==='tr'?'Bu bir ışık sorunu değil — görüntü hiç gelmiyor. Mercek kapağını/parmağını kontrol et; '
               +'uygulamayı arka plandan yeni getirdiysen birkaç saniye bekle ya da kamerayı kapatıp aç.'
               :'This is not a lighting problem — no image is arriving. Check the lens cover or your finger; '
               +'if you just returned from the background, wait a moment or reopen the camera.')}];
  const out=[];
  if(s.center<55) out.push({lv:'bad',t:(L==='tr'?'Yüzün karanlık':'Your face is dark'),
    d:(L==='tr'?'Işığı yüzünün önüne al; pencereye dönük otur. Ortalama parlaklık '+Math.round(s.center)+'/255':'Move the light in front of you. Center brightness '+Math.round(s.center)+'/255')});
  else if(s.center<85) out.push({lv:'warn',t:(L==='tr'?'Yüzün az karanlık':'Face slightly dark'),d:(L==='tr'?'Biraz daha ışık iyi olur ('+Math.round(s.center)+'/255)':'A bit more light would help ('+Math.round(s.center)+'/255)')});
  if(s.edge>s.center*1.55) out.push({lv:'bad',t:(L==='tr'?'Arkadan ışık geliyor':'You are backlit'),
    d:(L==='tr'?'Pencereye sırtını dönmüşsün — dön ya da perdeyi kapat (arka '+Math.round(s.edge)+' / yüz '+Math.round(s.center)+')':'Turn away from the window (back '+Math.round(s.edge)+' / face '+Math.round(s.center)+')')});
  if(s.hotPct>8) out.push({lv:'warn',t:(L==='tr'?'Işık patlıyor':'Highlights blown'),
    d:(L==='tr'?'Karenin %'+Math.round(s.hotPct)+'\'i bembeyaz — ışığı kıs ya da uzaklaştır':Math.round(s.hotPct)+'% of the frame is pure white — dim or move the light')});
  if(s.sd<16) out.push({lv:'warn',t:(L==='tr'?'Görüntü yassı, kontrast düşük':'Flat, low-contrast image'),
    d:(L==='tr'?'Tek yönden yumuşak ışık ekle; düz tavan ışığı yassı gösterir':'Add one directional light; flat ceiling light looks dull')});
  if(tiltDeg!=null && Math.abs(tiltDeg)>4) out.push({lv:'warn',t:(L==='tr'?'Telefon eğik':'Phone is tilted'),
    d:Math.abs(Math.round(tiltDeg))+'° '+(L==='tr'?'yana yatık — düzelt':'roll — level it')});
  if(!out.length) out.push({lv:'ok',t:(L==='tr'?'Işık ve çerçeve iyi görünüyor ✓':'Light and framing look good ✓'),
    d:(L==='tr'?'yüz '+Math.round(s.center)+' · arka '+Math.round(s.edge)+' · kontrast '+Math.round(s.sd):'face '+Math.round(s.center)+' · back '+Math.round(s.edge)+' · contrast '+Math.round(s.sd))});
  return out;
}

/* KAMERA KAPALI SATIRI da ortak: iki kabukta farklı yazılsaydı, aynı
   durumda iki farklı cümle okunurdu. */
function isikKameraKapali(L){
  return [{lv:'info',t:(L==='tr'?'Kamera kapalı':'Camera off'),
           d:(L==='tr'?'Önce kamerayı aç':'Open the camera first')}];
}
