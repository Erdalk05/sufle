const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar,cekirdekOku}=require('./kaynak');
const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* HESAP ARTIK ÇEKİRDEKTE (cekirdek/isik.js) — masaüstü de aynı denetçiyi
   kullanıyor. Modülü ORTAM DEĞİŞKENİNE SAYGIYLA okuyoruz: test doğrudan depo
   dosyasını okusaydı kasıtlı bozma turu bu dosyada SESSİZCE etkisiz kalırdı
   (bu depoda dört kez yaşanmış hata sınıfı). */
const cek=cekirdekOku('isik.js','SUFLE_ISIK').replace(/\/\*[\s\S]*?\*\//g,'');
const SOZ=cekirdekOku('sozluk.js','SUFLE_SOZLUK');

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
function kos({ton=0, desen=null, tilt=null, kameraAcik=true, dil='tr'}={}){
  const px=new Uint8ClampedArray(32*48*4);
  for(let y=0;y<48;y++) for(let x=0;x<32;x++){
    const v=desen?desen(x,y):ton, i=(y*32+x)*4;
    px[i]=v; px[i+1]=v; px[i+2]=v; px[i+3]=255;
  }
  const ctx={ drawImage(){}, getImageData:()=>({data:px}) };
  /* v9.34: ışık cümleleri SÖZLÜĞE taşındı; modül artık dile değil bir ARAMA
     fonksiyonuna bağlı. Tezgâh gerçek sözlüğü yüklüyor — kendi sahte
     metinlerini uydursaydı, sözlükten silinen bir anahtar burada sessizce
     "geçer" ve test ölçmeyen bir kapıya dönerdi. */
  return new Function('cam','__ctx','L','tiltDeg', `
    let lightCv={getContext:()=>__ctx,width:32,height:48};
    const document={createElement:()=>lightCv};
    ${SOZ}
    const t=(k)=>I18N[L][k];
    ${cek}
    ${sf}
    ${lc}
    return {s:sampleFrame(), out:lightCheck()};
  `)({videoWidth:kameraAcik?640:0}, ctx, dil, tilt);
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

/* ---------- ÇEKİRDEK ADLARI VE MASAÜSTÜ ZİNCİRİ (2026-08-17 akşamı) ----------
   Hesap `cekirdek/isik.js`e taşınıp masaüstüne de gömüldü, ama fonksiyonların
   HİÇBİRİ testlerde adıyla anılmıyordu; kapsam kapısı bunu "kapsanmayan +6"
   diye bildirdi. Tabanı büyütmek yerine eksik olan yazıldı: aşağıdaki
   iddialar zincirin GERÇEKTEN bağlı olduğunu ölçüyor, ad saymıyor. */
{
  /* Çekirdek DOSYADAN okunuyor: gömülü kopya değil, tek kaynak ölçülsün. */
  const cek = cekirdekOku('isik.js');
  ok('istatistik ve bulgu ayrı fonksiyonlar (ölçüm/yargı ayrımı)',
     /function isikIstatistik\(d\)\{/.test(cek) && /function isikBulgular\(s, tt, tiltDeg\)\{/.test(cek));
  ok('kamera kapalı durumu ayrı fonksiyonda', /function isikKameraKapali\(tt\)\{/.test(cek));
  /* v9.34: METİN MODÜLDE DEĞİL SÖZLÜKTE. Sözlüğü atlayan kullanıcı metni üç
     kapının birden kör noktası (i18n kapsamı · çeviri kaçağı · çizilmiş
     arayüz) ve üçüncü arayüz dilinin önündeki asıl engel. */
  ok('modülde artık gömülü Türkçe/İngilizce cümle yok',
     !/L==='tr'\s*\?/.test(cek.replace(/\/\*[\s\S]*?\*\//g,'')));
  /* Kamera kapalıyken üretilen satır YARGI DEĞİL BİLGİ olmalı: hazırlık
     kontrolü info satırlarını atıyor, aksi hâlde kamerasız kipte
     "ışığın kötü" diye yalan bir uyarı çıkardı. */
  const kk=(dil)=>new Function('__L', SOZ+'\nconst t=(k)=>I18N[__L][k];\n'+cek+
                              '\nreturn isikKameraKapali(t);')(dil);
  const kapali=kk('tr');
  ok('kamera kapalı satırı info seviyesinde', kapali.length===1 && kapali[0].lv==='info');
  const kapaliEn=kk('en');
  ok('kamera kapalı satırı iki dilde', kapaliEn[0].t!==kapali[0].t);
  ok('kamera kapalı satırı sözlükten geliyor (boş değil)',
     !!kapali[0].t && !!kapali[0].d && !/\{/.test(kapali[0].d));

  /* MASAÜSTÜ AYNI ÇEKİRDEĞİ ÇAĞIRIYOR MU — kopya hesap varsa iki platform
     zamanla ayrışır ve bunu kimse fark etmez. */
  const macKod=oku(macYolu()).replace(/\/\*[\s\S]*?\*\//g,'');
  ok('masaüstü bulgusu çekirdeği çağırıyor',
     /function macIsikBulgu\(\)\{[\s\S]*?isikBulgular\(s, t, null\)/.test(macKod));
  ok('masaüstü kamera kapalıyken çekirdeğin bilgi satırını kullanıyor',
     /macIsikBulgu\(\)\{[\s\S]*?isikKameraKapali\(t\)/.test(macKod));
  ok('masaüstü çizimi bulgudan besleniyor',
     /function macIsikCiz\(\)\{[\s\S]*?macIsikBulgu\(\)\.map/.test(macKod));
  /* Nabız yalnız kamera açıkken atmalı; kapalıyken saniyede bir boş ölçüm
     yapmak pil yakar ve panelde bayat sonuç bırakır. */
  ok('masaüstü nabzı kamerasızken kurulmuyor',
     /function macIsikBaslat\(\)\{[\s\S]*?if\(!stream\) return;/.test(macKod));
  ok('nabız kurulmadan önce eskisi durduruluyor (çift zamanlayıcı olmasın)',
     /function macIsikBaslat\(\)\{\s*\n?\s*macIsikDurdur\(\);/.test(macKod));
}

/* ---------- YER TUTUCU VE BOŞ METİN SIZINTISI (v9.34) ----------
   Cümleler sözlüğe taşınınca yeni bir kusur sınıfı doğdu: anahtar
   bulunamazsa `undefined`, yer tutucu doldurulmazsa ekranda `{y}` görünür.
   İkisi de kaynakta görünmez, yalnız ÜRETİLEN metinde belli olur — o yüzden
   ölçüt üretilen metnin kendisi. Her iki dilde ve kusur üreten beş ayrı
   karede sınanıyor. */
{
  const kareler=[
    {ad:'karanlık', ton:20},
    {ad:'patlak', ton:255},
    {ad:'yassı', ton:128},
    {ad:'arkadan ışık', desen:(x,y)=>(x>=8&&x<24&&y>=8&&y<34)?40:200},
    {ad:'iyi', desen:(x,y)=>110+((x*7+y*13)%60)},
  ];
  for(const dil of ['tr','en']){
    for(const k of kareler){
      const r=kos({ton:k.ton, desen:k.desen||null, tilt:9, dil});
      const hepsi=r.out.map(o=>String(o.t)+' | '+String(o.d)).join(' ‖ ');
      ok(dil+'/'+k.ad+': başlık ve açıklama dolu',
         r.out.length>0 && r.out.every(o=>o.t && o.d));
      ok(dil+'/'+k.ad+': undefined sızmıyor', !/undefined/.test(hepsi));
      /* Doldurulmamış yer tutucu: `{y}` gibi. Emoji ve noktalama serbest. */
      ok(dil+'/'+k.ad+': doldurulmamış yer tutucu yok'+(/\{\w+\}/.test(hepsi)?' — '+hepsi.match(/\{\w+\}/g).join(','):''),
         !/\{\w+\}/.test(hepsi));
    }
  }
  /* İki dil GERÇEKTEN farklı çıkmalı: `t` yanlış bağlanırsa ikisi de aynı
     dilde döner ve test "dolu" diye geçerdi. */
  const tr=kos({ton:20, dil:'tr'}).out.map(o=>o.t).join('|');
  const en=kos({ton:20, dil:'en'}).out.map(o=>o.t).join('|');
  ok('iki dil farklı metin üretiyor', tr!==en && tr.length>0 && en.length>0);
}
