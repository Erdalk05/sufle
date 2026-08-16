const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,blokKes,cekirdekOku}=require('./kaynak');
const telHam=oku(telefonYolu()), macHam=oku(macYolu());
const yorumsuz=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const tel=yorumsuz(telHam), mac=yorumsuz(macHam);
const CEK=cekirdekOku('muzik.js','SUFLE_MUZIK');

/* G.5 — MÜZİK YATAĞI.

   ÖLÇÜLMÜŞ RİSK ÖNCE: bu depoda iPhone'da KAYIT SIRASINDA mikrofonu Web
   Audio'ya bağlamak MediaRecorder'ın ses yazmasını durduruyor. Ses Stüdyosu
   bu yüzden iOS'ta hiç açılmıyor. Müzik AYNI zincire bağlandığı için aynı
   riski taşıyor ve karar şu: iOS'ta AÇILMIYOR, sebebi YAZILIYOR.

   Alternatif "yine de aç" olurdu; bedeli SESSİZ ÇEKİM — bu üründeki en
   pahalı kayıp, çünkü kullanıcı ancak oynatınca fark eder ve o an konuşma
   bitmiştir. Sessizce kapalı tutmak da yasak (ön koşulu olan ayar = ölü
   ayar), o yüzden durum ve sebep BİRLİKTE dönüyor. */

const c=(()=>new Function(CEK+
  '\nreturn {muzikKisilmaKazanci, muzikDosyaKabul, muzikDurum, MUZIK_MAX, MUZIK_KIS_ESIK};')())();

/* ---------- 1) KULLANILABİLİRLİK KURALI ---------- */
{
  const {muzikDurum}=c;
  const ios=muzikDurum(true, false, true);
  ok('iOSta müzik çalışmıyor', ios.calisir===false);
  ok('iOS sebebi bildiriliyor', ios.sebep==='ios');
  /* iOS kararı DOSYA VARLIĞINDAN ÖNCE gelmeli: kullanıcıya önce "dosya seç"
     deyip sonra "zaten olmuyor" demek, iki kez yanıltmaktır. */
  ok('iOSta dosya olmasa da sebep iOS', muzikDurum(true, false, false).sebep==='ios');
  const ham=muzikDurum(false, true, true);
  ok('ham ses açıkken çalışmıyor', ham.calisir===false && ham.sebep==='ham');
  /* DENETİM TURU BULGUSU: Ses Stüdyosu kapalıyken ses zinciri hiç
     kurulmuyor, yani müzik açılsa da HİÇBİR ŞEY olmuyordu ve sebebi de
     yazmıyordu — ön koşulu olan ayar = ölü ayar. */
  const fx=muzikDurum(false, false, true, true);
  ok('Ses Stüdyosu kapalıyken müzik çalışmıyor', fx.calisir===false);
  ok('sebep fxKapali', fx.sebep==='fxKapali');
  ok('dosya olsa da sebep fxKapali', muzikDurum(false,false,true,true).sebep==='fxKapali');
  ok('fx açıkken bu sebep çıkmıyor', muzikDurum(false,false,true,false).sebep===null);
  const yok=muzikDurum(false, false, false);
  ok('dosya yokken çalışmıyor', yok.calisir===false && yok.sebep==='dosyaYok');
  const tamam=muzikDurum(false, false, true);
  ok('koşullar sağlanınca çalışıyor', tamam.calisir===true);
  ok('çalışırken sebep yok', tamam.sebep===null);
  /* HER OLUMSUZ DURUMUN BİR SEBEBİ OLMALI — sessiz false yasak. */
  for(const [i,h,d] of [[true,false,true],[false,true,true],[false,false,false]]){
    const r=muzikDurum(i,h,d);
    ok('olumsuz durumun sebebi var ('+[i,h,d].join(',')+')', !r.calisir && !!r.sebep);
  }
}

/* ---------- 2) KISILMA (DUCKING) ---------- */
{
  const {muzikKisilmaKazanci, MUZIK_KIS_ESIK}=c;
  const taban=0.5;
  ok('sessizken müzik tam düzeyde', Math.abs(muzikKisilmaKazanci(0, taban, 0.8)-taban)<1e-9);
  ok('eşik altında kısılma yok', Math.abs(muzikKisilmaKazanci(MUZIK_KIS_ESIK*0.5, taban, 0.8)-taban)<1e-9);
  const konusma=muzikKisilmaKazanci(0.3, taban, 0.8);
  ok('konuşurken kısılıyor ('+konusma.toFixed(3)+')', konusma<taban);
  ok('tam kısma isteğinde susuyor', Math.abs(muzikKisilmaKazanci(0.3, taban, 1))<1e-9);
  ok('kısma kapalıyken hiç kısılmıyor', Math.abs(muzikKisilmaKazanci(0.3, taban, 0)-taban)<1e-9);
  {
    /* GEÇİŞ YUMUŞAK OLMALI: eşiğin hemen üstünde ani düşüş müziği
       pompalatır ve kulakta makine hissi bırakır. Eşik çevresinde en az
       üç ayrı ara değer görülmeli. */
    const degerler=[];
    for(let r=MUZIK_KIS_ESIK; r<=MUZIK_KIS_ESIK*2.6; r+=MUZIK_KIS_ESIK*0.2)
      degerler.push(+muzikKisilmaKazanci(r, taban, 0.8).toFixed(4));
    const benzersiz=new Set(degerler);
    ok('geçiş kademeli ('+benzersiz.size+' ara değer)', benzersiz.size>=4);
    let azalan=true;
    for(let i=1;i<degerler.length;i++) if(degerler[i]>degerler[i-1]) azalan=false;
    ok('kazanç yalnız azalıyor (dalgalanma yok)', azalan);
  }
  {
    /* Taban ve oran SINIRLANMALI: 0-1 dışına çıkan değer sesi patlatır. */
    ok('taban üst sınırla kırpılıyor', muzikKisilmaKazanci(0, 5, 0)===1);
    ok('taban alt sınırla kırpılıyor', muzikKisilmaKazanci(0, -3, 0)===0);
    ok('oran üst sınırla kırpılıyor', muzikKisilmaKazanci(0.3, taban, 9)>=0);
    ok('sonuç hiçbir zaman negatif değil', muzikKisilmaKazanci(0.9, taban, 1)>=0);
    ok('sonuç tabanı aşmıyor', muzikKisilmaKazanci(0, taban, 0.8)<=taban+1e-9);
    ok('sayı olmayan rms çökertmiyor', isFinite(muzikKisilmaKazanci(NaN, taban, 0.8)));
  }
}

/* ---------- 3) DOSYA KABULÜ ---------- */
{
  const {muzikDosyaKabul, MUZIK_MAX}=c;
  ok('mp3 kabul', muzikDosyaKabul('audio/mpeg', 1000).ok===true);
  ok('m4a kabul', muzikDosyaKabul('audio/mp4', 1000).ok===true);
  ok('wav kabul', muzikDosyaKabul('audio/wav', 1000).ok===true);
  ok('video reddediliyor', muzikDosyaKabul('video/mp4', 1000).sebep==='tur');
  ok('tür yoksa reddediliyor', muzikDosyaKabul('', 1000).sebep==='tur');
  ok('büyük dosya reddediliyor', muzikDosyaKabul('audio/mpeg', MUZIK_MAX+1).sebep==='boyut');
  ok('sınırdaki dosya kabul', muzikDosyaKabul('audio/mpeg', MUZIK_MAX).ok===true);
  ok('sınır makul (20 MB)', MUZIK_MAX===20*1024*1024);
}

/* ---------- 4) KABUKLAR: risk gerçekten kapatılmış mı ---------- */
{
  /* TELEFON: iOS bayrağı GERÇEKTEN geçiliyor mu. Sabit `false` geçmek,
     özelliği iPhone'da açıp sessiz çekim üretmek demekti. */
  /* İDDİA TEK ÇAĞRIYA DEĞİL HEPSİNE BAKIYOR: bir çağrı IS_WK geçerken
     diğerinin sabit false geçmesi, özelliği iPhonede açıp SESSİZ ÇEKİM
     üretirdi ve "en az bir yerde IS_WK var" diyen iddia bunu geçirirdi
     (bozma turu tam bunu gösterdi). */
  {
    /* TANIM DEĞİL ÇAĞRI: çekirdek modülü de kabuğa gömülü olduğu için
       `function muzikDurum(iosMu, ...)` satırı da eşleşiyordu ve iddia
       kendi kusurunu bildiriyordu. */
    const cagrilar=[...tel.matchAll(/(?<!function )muzikDurum\(([^,]+),/g)].map(x=>x[1].trim());
    ok('telefonda muzikDurum çağrısı var ('+cagrilar.length+')', cagrilar.length>=2);
    ok('telefondaki HER çağrı iOS bayrağını geçiyor',
       cagrilar.length>0 && cagrilar.every(x=>x==='IS_WK'));
  }
  ok('telefon ham ses durumunu geçiriyor', /muzikDurum\(IS_WK, !!st\.rawAudio/.test(tel));
  ok('telefon iOS sebebini kullanıcıya yazıyor', /m\('muzikIos'\)/.test(tel));
  ok('telefon ham ses sebebini yazıyor', /m\('muzikHam'\)/.test(tel));
  /* Yeni sebep de iki kabukta da kullanıcıya yazılmalı. */
  for(const [ad,kod] of [['telefon',tel],['masaüstü',mac]]){
    ok(ad+': Ses Stüdyosu sebebi yazılıyor', /m\('muzikFxKapali'\)/.test(kod));
    ok(ad+': durum satırında kısa sebep var', /muzikFxKisa/.test(kod));
    /* TEK ÇAĞRI YETMEZ: bir çağrı fx bayrağını geçerken diğerinin sabit
       false geçmesi, ayarı yine sessizce ölü bırakırdı. Çağrıların HEPSİ
       ölçülüyor (bozma turu bunu gerektirdi). */
    {
      const cagrilar=[...kod.matchAll(/(?<!function )muzikDurum\(([^)]*)\)/g)].map(x=>x[1]);
      ok(ad+': muzikDurum çağrısı var ('+cagrilar.length+')', cagrilar.length>=3);
      ok(ad+': HER çağrı fx durumunu geçiriyor',
         cagrilar.length>0 && cagrilar.every(x=>/audioFx/.test(x)));
    }
  }
  /* MAC: iOS kavramı yok, ham ses ayarı da yok — olmayan durumu okumak
     kapının yakaladığı ölü durumdu. */
  ok('Mac olmayan ham ses alanını okumuyor', !/state\.rawAudio/.test(mac));
  ok('Mac çekirdeğe sabit değer geçiyor', /muzikDurum\(false, false,/.test(mac));
}
for(const [ad,ham,kod,dev] of [['telefon',telHam,tel,'st'],['masaüstü',macHam,mac,'state']]){
  ok(ad+': müzik seçici arayüzde', /id="muzikFile"/.test(ham));
  ok(ad+': karıştırma anahtarı var', /id="muzikSw"/.test(ham));
  ok(ad+': düzey ve kısma kaydırıcıları var', /id="muzikSes"/.test(ham) && /id="muzikKis"/.test(ham));
  ok(ad+': dosya kabulü çekirdekten', /muzikDosyaKabul\(f\.type, f\.size\)/.test(kod));
  /* BELLEK DERSİ: dosya belleğe kopyalanmıyor, adres bırakılıyor. */
  ok(ad+': nesne adresi kullanılıyor', /muzikAdres=URL\.createObjectURL\(f\)/.test(kod));
  ok(ad+': adres bırakılıyor', /revokeObjectURL\(muzikAdres\)/.test(kod));
  ok(ad+': dosya okunup belleğe alınmıyor', !/readAsArrayBuffer|readAsDataURL/.test(kod.split('muzikFile')[1]||''));
  /* SES ZİNCİRİ: müzik aynı hedefe karışıyor, ikinci bağlam kurulmuyor. */
  ok(ad+': müzik aynı hedefe bağlanıyor', /muzikKazanc\.connect\(dest\)/.test(kod));
  /* İDDİA DARALTILDI: uygulama zaten birkaç meşru yerde ses bağlamı açıyor
     (mikrofon ölçer, nefes algılama, çekim sesi analizi). Doğru iddia
     "toplam bağlam sayısı" değil, MÜZİĞİN KENDİ BAĞLAMINI AÇMAMASI:
     ikinci bağlam iOSta zaten olmayan bir kaynağı iki kez ister ve
     masaüstünde iki ayrı zaman ekseni demektir. */
  ok(ad+': müzik var olan bağlama bağlanıyor',
     /const msrc=ctx\.createMediaElementSource\(el\)/.test(kod));
  {
    const yardimcilar=['muzikOgesi','muzikCalisir','muzikDurdur','muzikBirak']
      .map(f=>blokKes(kod,'function '+f+'(')||'').join('\n');
    ok(ad+': müzik yardımcıları ses bağlamı açmıyor', !/new AC\(/.test(yardimcilar));
  }
  /* KISILMA gürültü kapısının ZATEN ölçtüğü rms ile yapılıyor. */
  ok(ad+': kısılma çekirdek hesabıyla', /muzikKisilmaKazanci\(rms,/.test(kod));
  /* HOPARLÖR SIZINTISI: bağlam kapanınca <audio> susmalı. */
  /* İDDİA DOĞRU BLOĞA BAKIYOR: `muzikDurdur();` çağrısı `muzikBirak()`
     içinde de var, o yüzden dosya genelinde aramak bozmayı geçiriyordu.
     Asıl kural: SES ZİNCİRİ KAPANIRKEN müzik de susmalı, yoksa <audio>
     hoparlörden çalmaya devam eder ve mikrofona sızar. */
  ok(ad+': ses zinciri kapanırken müzik de duruyor',
     /muzikDurdur\(\);/.test(blokKes(kod,'function stopAudioFx()')||''));
  ok(ad+': müzik bırakılırken adres de bırakılıyor', /function muzikBirak\(\)/.test(kod));
  /* KAYIT SÜRERKEN ses zinciri değiştirilemez — ölçülmüş kayıp sınıfı. */
  ok(ad+': kayıt sürerken zincir değiştirilmiyor', /m\('muzikRec'\)/.test(kod));
  ok(ad+': anahtar durumu ekran okuyucuya bildiriliyor', /aria-checked/.test(blokKes(kod,'function muzikAnahtari()')||''));
  ok(ad+': durum satırı sebebi gösteriyor', /muzikDurumTxt/.test(kod));
}
/* ---------- 5) YARDIMCILAR ADIYLA SINANIYOR ---------- */
for(const [ad,kod] of [['telefon',tel],['masaüstü',mac]]){
  const birak=blokKes(kod,'function muzikBirak()')||'';
  ok(ad+': muzikBirak çıkarılabildi', birak.length>0);
  /* SIRA ÖNEMLİ: önce durdur, sonra adresi bırak. Ters sırada çalan bir
     öğenin kaynağı elinden alınır ve tarayıcı hata basar. */
  ok(ad+': önce durduruyor sonra adresi bırakıyor',
     birak.indexOf('muzikDurdur()')<birak.indexOf('revokeObjectURL'));
  ok(ad+': öge de bırakılıyor', /muzikEl=null/.test(birak));
  ok(ad+': dosya adı da temizleniyor', /ad:''/.test(birak));
  const durdur=blokKes(kod,'function muzikDurdur()')||'';
  ok(ad+': muzikDurdur çıkarılabildi', durdur.length>0);
  ok(ad+': durdurma korumalı (öge yoksa çökmüyor)', /if\(muzikEl\)/.test(durdur));
  ok(ad+': durdurma hatası yutulmuyor', /logErr\('muzikDur'/.test(durdur));
  const calisir=blokKes(kod,'function muzikCalisir()')||'';
  ok(ad+': muzikCalisir çıkarılabildi', calisir.length>0);
  /* Anahtar açık olsa bile koşullar sağlanmıyorsa çalışmamalı. */
  ok(ad+': hem anahtar hem koşul aranıyor', /mk\.acik && muzikDurum\(/.test(calisir));
  const oge=blokKes(kod,'function muzikOgesi()')||'';
  ok(ad+': muzikOgesi çıkarılabildi', oge.length>0);
  /* Zincirin yeniden kurulması: müzik açılıp kapandığında sesin gerçekten
     değişmesinin TEK yolu. Kayıt sürerken YAPILMAMALI. */
  const yeniden=blokKes(kod,'function fxYenidenKur()')||'';
  ok(ad+': fxYenidenKur çıkarılabildi', yeniden.length>0);
  ok(ad+': kayıt sürerken yeniden kurmuyor', /state==='recording'/.test(yeniden));
  ok(ad+': önce eski zincir durduruluyor', yeniden.indexOf('stopAudioFx()')>=0);
  ok(ad+': koşul sağlanıyorsa yeniden kuruluyor', /if\(fxOn\(\)\) makeFxTrack\(\)/.test(yeniden));
}

{
  const sozluk=cekirdekOku('sozluk.js','SUFLE_SOZLUK');
  for(const k of ['muzikTitle','muzikPick','muzikClear','tgMuzik','muzikSes','muzikKis','muzikHint','muzikYokKisa']){
    const bul=[...sozluk.matchAll(new RegExp(k+":'([^']*)'",'g'))].map(m=>m[1]);
    ok('sözlükte '+k+' iki dilde', bul.length===2);
    ok('sözlükte '+k+' çevrilmiş', bul.length===2 && bul[0]!==bul[1]);
  }
  const msg=cekirdekOku('mesajlar.js','SUFLE_MESAJLAR');
  for(const k of ['muzikTur','muzikBuyuk','muzikSet','muzikIos','muzikHam','muzikRec']){
    const bul=[...msg.matchAll(new RegExp(k+":'([^']*)'",'g'))].map(m=>m[1]);
    ok('telefon mesajı '+k+' iki dilde', bul.length===2);
  }
  /* iOS mesajı SEBEBİ söylemeli, yalnız "olmuyor" dememeli. */
  const iosMsg=(msg.match(/muzikIos:'([^']*)'/)||[])[1]||'';
  ok('iOS mesajı sebebi anlatıyor', /sessiz|SESSİZ/i.test(iosMsg) && iosMsg.length>60);
}
