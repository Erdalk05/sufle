const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar,cekirdekOku}=require('./kaynak');
const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* HESAP ARTIK ÇEKİRDEKTE (cekirdek/isik.js) — masaüstü de aynı denetçiyi
   kullanıyor. Modülü ORTAM DEĞİŞKENİNE SAYGIYLA okuyoruz: test doğrudan depo
   dosyasını okusaydı kasıtlı bozma turu bu dosyada SESSİZCE etkisiz kalırdı
   (bu depoda dört kez yaşanmış hata sınıfı). */
const cek=cekirdekOku('isik.js','SUFLE_ISIK').replace(/\/\*[\s\S]*?\*\//g,'');

/* IŞIK DENETÇİSİ — İKİ SORU
   1) Boş/siyah karede NaN üretiyor mu?  → HAYIR, hipotez çürüdü.
      Örnekleme ızgarası SABİT 32×48; merkez (16×26=416) ve kenar sayıları
      derlenme anında belli, hiçbir bölen sıfır olamıyor. Üç sentetik karede
      (tam siyah / orta gri / tam beyaz) ölçüldü: hiçbir alan NaN değil.
      Bu test o durumu kilitliyor ki ızgara ileride dinamikleşirse yakalansın.

   2) Ama aynı ölçümde GERÇEK bir kusur çıktı: SİYAH KAREDE YANLIŞ ÖĞÜT.
      Kamera açık ama kare bomboş (mercek kapağı/parmak, ya da iOS arka
      plandan dönerken boş kare veriyor). Panel şunu diyordu:
        "Yüzün karanlık — ışığı yüzünün önüne al"
        "Görüntü yassı — tek yönden yumuşak ışık ekle"
      Kullanıcı ışık ekliyor, hiçbir şey değişmiyor; asıl sebep hiçbir yerde
      yazmıyor. Üstelik ÖLÇÜM ZATEN VARDI: darkPct sampleFrame'de hesaplanıp
      HİÇ OKUNMUYORDU — ölü ölçüm. Artık asıl işini yapıyor.

   Bu satır hazırlık kontrolüne de giriyor, yani çekimden önce engel oluyor:
   siyah video çekmek, uyarıyı görmemekten kötü. */

const sf=cikar(kod,/function sampleFrame\(\)\{[\s\S]*?\n\}/,'sampleFrame');
const lc=cikar(kod,/function lightCheck\(\)\{[\s\S]*?\n\}/,'lightCheck');

/* Sentetik kare: her piksel aynı ton. `desen` verilirse (x,y)->ton. */
function kos({ton=0, desen=null, tilt=null, kameraAcik=true}={}){
  const px=new Uint8ClampedArray(32*48*4);
  for(let y=0;y<48;y++) for(let x=0;x<32;x++){
    const v=desen?desen(x,y):ton, i=(y*32+x)*4;
    px[i]=v; px[i+1]=v; px[i+2]=v; px[i+3]=255;
  }
  const ctx={ drawImage(){}, getImageData:()=>({data:px}) };
  return new Function('cam','__ctx','L','tiltDeg', `
    let lightCv={getContext:()=>__ctx,width:32,height:48};
    const document={createElement:()=>lightCv};
    ${cek}
    ${sf}
    ${lc}
    return {s:sampleFrame(), out:lightCheck()};
  `)({videoWidth:kameraAcik?640:0}, ctx, 'tr', tilt);
}
const basliklar=r=>r.out.map(o=>o.t);
const seviyeler=r=>r.out.map(o=>o.lv);

/* ---------- 1) NaN ÜRETMİYOR (çürüyen hipotez, kilitlendi) ---------- */
for(const [ad,ton] of [['tam siyah',0],['orta gri',128],['tam beyaz',255]]){
  const r=kos({ton});
  const bozuk=Object.entries(r.s).filter(([k,v])=>!isFinite(v)).map(([k])=>k);
  ok(ad+' karede hiçbir ölçüm NaN değil ('+bozuk.join(',')+')', bozuk.length===0);
}
{
  const r=kos({ton:128});
  ok('merkez ve kenar ayrı ayrı ölçülüyor', isFinite(r.s.center) && isFinite(r.s.edge));
  ok('yüzdeler 0–100 aralığında',
     r.s.hotPct>=0 && r.s.hotPct<=100 && r.s.darkPct>=0 && r.s.darkPct<=100);
}
ok('örnekleme ızgarası sabit (bölen sıfır olamaz)',
   /ISIK_W\s*=\s*32/.test(cek) && /ISIK_H\s*=\s*48/.test(cek) &&
   /for\(let y=0;y<ISIK_H;y\+\+\) for\(let x=0;x<ISIK_W;x\+\+\)/.test(cek));

/* ---------- 2) SİYAH KARE AYRI TEŞHİS ---------- */
{
  const r=kos({ton:0});
  ok('siyah karede "kamera siyah kare veriyor" deniyor',
     basliklar(r).some(t=>/siyah kare/i.test(t)));
  ok('siyah karede bunun ışık sorunu OLMADIĞI söyleniyor',
     r.out.some(o=>/ışık sorunu değil/.test(o.d)));
  ok('siyah karede ne yapacağı söyleniyor (mercek/parmak)',
     r.out.some(o=>/[Mm]ercek/.test(o.d)));
  ok('siyah karede yanıltıcı ışık öğüdü YIĞILMIYOR',
     !basliklar(r).some(t=>/karanlık|yassı/i.test(t)));
  ok('siyah kare ENGEL sayılıyor (siyah video çekmek daha kötü)',
     seviyeler(r).includes('bad') && r.out.length===1);
}
{
  /* Gerçekten karanlık ama görüntü OLAN oda siyah kare sayılmamalı — yoksa
     asıl ışık öğüdü hiç görünmez. l<8 eşiğinin üstünde kalan loş bir kare. */
  const r=kos({ton:20});
  ok('loş ama görüntü olan kare siyah sayılmıyor',
     !basliklar(r).some(t=>/siyah kare/i.test(t)));
  ok('loş karede asıl ışık öğüdü veriliyor',
     basliklar(r).some(t=>/karanlık/i.test(t)));
}
{
  /* Derin gölgeleri OLAN ama gerçek bir görüntü: karenin ~%25'i koyu.
     Eşik gevşerse burası da "siyah kare" sayılır ve asıl ışık öğüdü kaybolur —
     yani düzeltme, düzeltmeye çalıştığı şeyi bozar. */
  const r=kos({desen:(x,y)=> (x<8 ? 2 : 150)});
  ok('gölgeli ama gerçek kare siyah sayılmıyor',
     !basliklar(r).some(t=>/siyah kare/i.test(t)));
  ok('gölgeli karede olağan değerlendirme sürüyor', r.out.length>=1);
}
ok('siyah kare eşiği darkPct üzerinden', /s\.darkPct>90/.test(cek));
ok('darkPct artık ölü ölçüm değil', (kod.match(/darkPct/g)||[]).length >= 2);

/* ---------- ÜÇ PLATFORM TEK HESAP (2026-08-17) ----------
   Denetçi yalnız telefondaydı; masaüstünün sözlüğünde `lightBtn` DURUYOR ama
   karşılığı yoktu (ortak sözlükte ölü anahtar). Kopyalamak yerine hesap
   çekirdeğe alındı. Bu iddialar, hesabın ileride yeniden KOPYALANMASINI
   engelliyor: eşik iki yerde yaşarsa biri düzeltilip diğeri unutulur. */
{
  const macKod=oku(macYolu());
  ok('masaüstü ışık çekirdeğini gömüyor', macKod.includes('==CEKIRDEK:isik.js=='));
  ok('masaüstünde de ışık paneli var (ölü sözlük anahtarı kalmadı)',
     /id=["']lightOut["']/.test(macKod) && /id=["']lightBtn["']/.test(macKod));
  /* ÖLÇÜT AKIŞ, KARE DEĞİL. Kamera kapatıldıktan sonra video ögesi bir süre
     eski genişliğini bildirmeye devam ediyor; yalnız kareye bakan bir panel
     "kamera kapalı" demek yerine SON ÖLÇÜMÜ asılı bırakır ve kullanıcı
     olmayan bir ışık durumunu okur. Bu iddiayı yorumda bırakmak yetmez —
     bozma turu (IŞ8) tam olarak bunu deniyor. */
  ok('masaüstünde ışık ölçütü akışa bağlı (kapalı kamerada son ölçüm asılı kalmıyor)',
     /const s=stream \? macIsikOrnek\(\) : null;/.test(macKod));
  ok('masaüstü nabzı kamera kapanınca duruyor',
     /function stopCam\(\)\{[\s\S]{0,600}?macIsikDurdur\(\);/.test(macKod));
  /* Eşikler ÇEKİRDEKTE yaşamalı: kabukta yeniden yazılmış bir eşik, iki
     platformun aynı kareye farklı not vermesi demek. */
  for(const [ad,desen] of [['siyah kare',/darkPct>90/],['yüz karanlık',/center<55/],
                           ['arkadan ışık',/edge>s\.center\*1\.55/],['patlama',/hotPct>8/],
                           ['yassı görüntü',/sd<16/]])
    ok('“'+ad+'” eşiği kabukta değil çekirdekte',
       desen.test(cek) && !desen.test(macKod.replace(/==CEKIRDEK:isik\.js==[\s\S]*?==\/CEKIRDEK:isik\.js==/,'')));
}
{
  /* MASAÜSTÜNDE EĞİM YOK — ve bu bir eksik değil, kasıtlı sınır.
     `deviceorientation` dizüstünde ya hiç yok ya da ekran kapağının açısını
     verir; kamerayı eğmez. Eğim PARAMETRE olduğu için veren kabuk verir,
     vermeyen null geçer ve satır hiç çıkmaz — "ölü ayar" üretmiyoruz. */
  const r=kos({ton:128, tilt:null});
  ok('eğim verilmeyince eğim satırı hiç çıkmıyor',
     !basliklar(r).some(t=>/eğik/i.test(t)));
}

/* ---------- ESKİ DAVRANIŞ BOZULMADI ---------- */
{
  /* "Patlıyor" ölçütü l>250 — yani gerçekten KIRPILMIŞ beyaz. 200 tonu parlak
     ama kırpılmamış; ilk yazışımda 200 verip uyarı bekledim, beklentim yanlıştı.
     İki tarafı da sınıyoruz: kırpılan uyarı verir, parlak-ama-sağlam vermez. */
  const r=kos({ton:255});
  ok('kırpılmış beyaz karede "patlıyor" uyarısı', basliklar(r).some(t=>/patlıyor/i.test(t)));
  const r2=kos({ton:200});
  ok('parlak ama kırpılmamış karede yanlış alarm yok',
     !basliklar(r2).some(t=>/patlıyor/i.test(t)));
}
{
  /* Arkadan ışık: kenarlar parlak, merkez loş. */
  const r=kos({desen:(x,y)=>(x>=8&&x<24&&y>=8&&y<34)?90:230});
  ok('arkadan ışık yakalanıyor', basliklar(r).some(t=>/[Aa]rkadan ışık/.test(t)));
}
{
  /* İyi kare: merkez aydınlık, kenar benzer, kontrast var. */
  const r=kos({desen:(x,y)=>110+((x*7+y*13)%60)});
  ok('iyi karede olumlu satır', seviyeler(r).includes('ok'));
  ok('iyi karede tek satır yeter', r.out.length===1);
}
{
  const r=kos({ton:128, tilt:9});
  ok('telefon eğikse söyleniyor', basliklar(r).some(t=>/eğik/i.test(t)));
  const r2=kos({ton:128, tilt:2});
  ok('küçük eğim uyarı üretmiyor', !basliklar(r2).some(t=>/eğik/i.test(t)));
}
{
  const r=kos({kameraAcik:false});
  ok('kamera kapalıyken ölçüm yapılmıyor', r.s===null);
  ok('kamera kapalıyken bilgi satırı çıkıyor', seviyeler(r).includes('info'));
}

/* ---------- HAZIRLIK KONTROLÜNE BAĞLI MI ---------- */
const ready=cikar(kod,/function readyChecks\(\)\{[\s\S]*?\n\}/,'readyChecks');
ok('hazırlık kontrolü ışık denetçisini kullanıyor', /lightCheck\(\)\.forEach/.test(ready));
ok('bilgi satırları hazırlık kontrolüne taşınmıyor (gürültü olmasın)',
   /o\.lv!=='info'/.test(ready));
