const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,blokKes,cekirdekOku}=require('./kaynak');
const telHam=oku(telefonYolu()), macHam=oku(macYolu());
const yorumsuz=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const tel=yorumsuz(telHam), mac=yorumsuz(macHam);
const CEK=cekirdekOku('tempo.js','SUFLE_TEMPO');

/* G.11 — SÜREYE SIĞDIR.

   ÖLÇÜLEN BAŞLANGIÇ:
   ① Telefonda "Hedef süre" yalnız bir ROZET besliyordu (ne kadar geri/ileri
      olduğun). Hızı kullanıcı tahmin etmek zorundaydı; rakipte bu iş
      "sabit süreli kaydırma" diye satılıyor.
   ② Masaüstünde hedef süre HİÇ YOKTU ve tahmini süre duraklamaları
      SAYMIYORDU (kelime/hız). Telefonda düzeltilmiş, Mac'e taşınmamış:
      kullanıcı burada "sınıra uygun" görüp çekimde sınırı aşıyordu.

   BU TESTİN KİLİTLEDİĞİ ŞEY: hesap iki kabukta AYNI ve DÜRÜST.
   Sığmıyorsa sessizce kırpmıyor, sebebini söylüyor. */

const c=(()=>new Function(CEK+'\nreturn {duraklamaSaniye, tahminiSure, gerekenWpm};')())();

/* ---------- 1) DURAKLAMA HESABI ---------- */
{
  const {duraklamaSaniye}=c;
  ok('işaretsiz metinde duraklama yok', duraklamaSaniye('bir iki uc', false)===0);
  ok('kısa duraklama 0,35 sn', Math.abs(duraklamaSaniye('bir / iki', false)-0.35)<1e-9);
  ok('uzun duraklama 0,8 sn', Math.abs(duraklamaSaniye('bir // iki', false)-0.8)<1e-9);
  ok('sayılı bekleme okunuyor', Math.abs(duraklamaSaniye('bir (2) iki', false)-2)<1e-9);
  ok('ondalık bekleme okunuyor (virgül)', Math.abs(duraklamaSaniye('bir (1,5) iki', false)-1.5)<1e-9);
  ok('saniye harfi de kabul', Math.abs(duraklamaSaniye('bir (3s) iki', false)-3)<1e-9);
  /* Sınır: kötü niyetli ya da yanlış yazılmış bir bekleme sufleyi
     dakikalarca durdurmamalı. */
  ok('bekleme 10 saniyeyle sınırlı', duraklamaSaniye('(600)', false)===10);
  ok('kelime İÇİNDEKİ eğik çizgi duraklama sayılmıyor',
     duraklamaSaniye('adres/yol gibi', false)===0);
  ok('nefes kapalıyken paragraf sonu sayılmıyor',
     duraklamaSaniye('bir\n\niki', false)===0);
  ok('nefes açıkken paragraf sonu 0,42 sn',
     Math.abs(duraklamaSaniye('bir\n\niki', true)-0.42)<1e-9);
  ok('boş metin çökertmiyor', duraklamaSaniye('', true)===0);
  ok('metin verilmezse çökertmiyor', duraklamaSaniye(null, true)===0);
  {
    const toplam=duraklamaSaniye('a / b // c (2) d', false);
    ok('işaretler toplanıyor ('+toplam.toFixed(2)+' sn)', Math.abs(toplam-3.15)<1e-9);
  }
}

/* ---------- 2) TAHMİNİ SÜRE ---------- */
{
  const {tahminiSure}=c;
  ok('120 kelime 120 WPM ile 60 saniye', Math.abs(tahminiSure(120,120,0)-60)<1e-9);
  ok('duraklamalar süreye ekleniyor', Math.abs(tahminiSure(120,120,7)-67)<1e-9);
  /* Hız kumandadan sıfıra düşebiliyor: sıfıra bölmek Sonsuz üretir ve
     ekranda "~Infinity" yazardı. */
  ok('hız sıfırken sonsuz üretmiyor', isFinite(tahminiSure(100,0,0)));
  ok('hız negatifken de sonlu', isFinite(tahminiSure(100,-5,0)));
  ok('kelime yoksa yalnız duraklama kalır', Math.abs(tahminiSure(0,140,3)-3)<1e-9);
}

/* ---------- 3) HEDEFE SIĞDIRMA ---------- */
{
  const {gerekenWpm}=c;
  {
    const r=gerekenWpm(120, 60, 0, 40, 320, 1);
    ok('120 kelime 60 saniyede 120 WPM ister', r && r.wpm===120 && r.sigar===true);
    ok('sığan durumda sebep yok', r && r.sebep===null);
  }
  {
    /* DURAKLAMALAR HEDEFTEN DÜŞÜLÜR — bunu atlamak, kullanıcıya "sığacak"
       deyip çekimde taşırmak demektir. */
    const r=gerekenWpm(120, 60, 12, 40, 320, 1);
    ok('duraklama hedeften düşülüyor (48 sn okuma → 150 WPM)', r && r.wpm===150);
    ok('okuma süresi de bildiriliyor', r && r.okumaSn===48);
  }
  {
    /* ADIMA OTURTMA: kaydırıcı 5lik adımlıysa 79 uygulanamaz. Yön YUKARI,
       çünkü daha düşük hız metni UZATIR ve hedefi aşar. */
    const r=gerekenWpm(35, 30, 3.15, 40, 320, 5);
    ok('adıma oturuyor (5in katı)', r && r.wpm%5===0);
    ok('yukarı yuvarlanıyor (hedefi aşmamak için)', r && r.wpm>=r.gereken);
    const bir=gerekenWpm(35, 30, 3.15, 40, 320, 1);
    ok('adım 1 iken tam değer', bir && bir.wpm===bir.gereken);
  }
  {
    /* SIĞMIYORSA SESSİZ KIRPMA YOK: üç sebep, üç ayrı mesaj. */
    const r=gerekenWpm(1000, 60, 0, 40, 320, 1);
    ok('çok uzun metin: sığmıyor', r && r.sigar===false);
    ok('sebep hızlı', r && r.sebep==='hizli');
    ok('yine de üst sınıra çekilmiş bir değer dönüyor', r && r.wpm===320);
    ok('gereken hız da bildiriliyor (kullanıcıya sayı söylenebilsin)', r && r.gereken>320);
  }
  {
    const r=gerekenWpm(10, 120, 0, 40, 320, 1);
    ok('çok kısa metin: sığmıyor', r && r.sigar===false && r.sebep==='yavas');
    ok('alt sınıra çekiliyor', r && r.wpm===40);
  }
  {
    /* YALNIZ DURAKLAMALAR HEDEFİ DOLDURUYORSA metni hızlandırmak ÇÖZMEZ —
       kullanıcıya işaretleri azaltması söylenmeli. */
    const r=gerekenWpm(50, 10, 12, 40, 320, 1);
    ok('duraklamalar hedefi aşıyorsa sebep duraklama', r && r.sebep==='duraklama');
    ok('bu durumda sığmıyor', r && r.sigar===false);
    ok('okuma süresi sıfır', r && r.okumaSn===0);
  }
  {
    ok('kelime yoksa null', gerekenWpm(0, 60, 0, 40, 320, 1)===null);
    ok('hedef yoksa null', gerekenWpm(100, 0, 0, 40, 320, 1)===null);
    ok('negatif hedef null', gerekenWpm(100, -5, 0, 40, 320, 1)===null);
    ok('adım verilmezse çökmüyor', !!gerekenWpm(100, 60, 0, 40, 320));
  }
  {
    /* TUTARLILIK: sığdırma sonucu, tahmin fonksiyonuyla doğrulanmalı.
       İki hesap birbirini tutmuyorsa kullanıcıya yalan söylenir. */
    const {tahminiSure, duraklamaSaniye}=c;
    const metin='bir iki uc dort bes / alti yedi sekiz // dokuz on (2) onbir onki onuc';
    const kelime=metin.split(/\s+/).filter(x=>!/^(\/|\/\/|\(\d+\))$/.test(x)).length;
    const dur=duraklamaSaniye(metin,false);
    for(const hedef of [20,45,90]){
      const r=gerekenWpm(kelime, hedef, dur, 40, 320, 1);
      if(!r || !r.sigar) continue;
      const olcum=tahminiSure(kelime, r.wpm, dur);
      ok('sığdırma tutuyor: hedef '+hedef+' sn → ölçülen '+olcum.toFixed(1)+' sn',
         Math.abs(olcum-hedef)<=1.0);
    }
  }
}

/* ---------- 4) KABUKLAR: bağlanmış mı, dürüst mü ---------- */
for(const [ad,ham,kod,dev] of [['telefon',telHam,tel,'st'],['masaüstü',macHam,mac,'state']]){
  ok(ad+': sığdır düğmesi arayüzde', /id="fitBtn"/.test(ham));
  ok(ad+': hedef süre kaydırıcısı var', /id="target"/.test(ham));
  ok(ad+': düğme çekirdek hesabı çağırıyor', /gerekenWpm\(/.test(kod));
  ok(ad+': duraklama çekirdekten hesaplanıyor', /duraklamaSaniye\(/.test(kod));
  ok(ad+': tahmini süre çekirdekten', /tahminiSure\(/.test(kod));
  ok(ad+': kaydırıcının adımı hesaba veriliyor', /sl\.step/.test(kod));
  ok(ad+': sığdıktan sonra hız gerçekten uygulanıyor',
     new RegExp(dev+'\\.(wpm|speed)=r\\.wpm').test(kod));
  /* SESSİZ BAŞARISIZLIK YOK: dört durumun dördü de kullanıcıya yazılıyor. */
  for(const anahtar of ['fitNoTarget','fitNoText','fitPause','fitTooFast','fitTooSlow','fitOk'])
    ok(ad+': '+anahtar+' mesajı kullanılıyor', new RegExp("m\\('"+anahtar+"'\\)").test(kod));
}
{
  /* Mesajlar İKİ DİLDE de olmalı: Mac uyarıları bir turda 67 kez Türkçe
     sabit çıkmıştı. */
  const telMsg=cekirdekOku('mesajlar.js','SUFLE_MESAJLAR');
  const macMsg=cekirdekOku('mac-mesajlar.js','SUFLE_MAC_MESAJLAR');
  for(const [ad,kaynak] of [['telefon',telMsg],['masaüstü',macMsg]]){
    for(const k of ['fitNoTarget','fitOk','fitPause','fitTooFast','fitTooSlow']){
      const bul=[...kaynak.matchAll(new RegExp(k+":'([^']*)'",'g'))].map(m=>m[1]);
      ok(ad+' mesajı '+k+' iki dilde', bul.length===2);
      ok(ad+' mesajı '+k+' çevrilmiş', bul.length===2 && bul[0]!==bul[1]);
    }
  }
}
{
  /* Mac tahmini artık duraklamaları sayıyor: eski hâli kelime/hız idi. */
  /* İDDİA, BİRLEŞTİRMEYE DEĞİL HESABA BAKIYOR: tests/114 haklı olarak
     "iç dize birleştirmesini kilitleyen desen" diye işaretledi — orada
     kilitlenen şey kullanıcının gördüğü metin değil, kodun yazılış biçimiydi. */
  ok('Mac tahmini eski duraklamasız formüle dönmedi',
     !/fmtTime\(wc\/Math\.max\(20/.test(mac));
  ok('Mac tahmini duraklamayı içeriyor', /tahminiSure\(wc, state\.speed, duraklamaSaniye/.test(mac));
}
