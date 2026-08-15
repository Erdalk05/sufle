const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku}=require('./kaynak.js');

/* BUDAMA SINIRLARI — B4 turunun ilk kalemi (2026-08-15).

   Kapsam ölçümü şunu göstermişti: testlerin hiç anmadığı 46 fonksiyonun
   çoğu KAYIT ve SONUÇ yolunda toplanıyor — yani kırılınca bedeli
   "kaybedilen çekim" olan yerde. Budama (trimA/trimB) tam oradaydı ve
   ölçünce iki gerçek kusur çıktı:

   ① SEÇİM VİDEONUN SONUNU AŞABİLİYORDU. "En az 0,3 sn" kuralı yalnız ALT
      sınırı kuruyordu, üst sınır yoktu:
        · başlangıcı sona sürükle (60 sn video) → seçim 60,00–60,30
        · 0,2 sn'lik video                      → seçim 0,00–0,30
      İkisinde de var olmayan bir bölge kesilmeye çalışılıyor. `doTrim`
      `currentTime>=trimB` bekliyor, o an hiç gelmiyor; iş yalnız `v.ended`
      ya da zaman aşımıyla bitiyor. Üstelik kullanıcıya "seçilen 0,3 sn"
      yazılıp `lastDur` da öyle kaydediliyor: EKRANDAKİ SÜRE İLE ELDEKİ
      ÇEKİM AYRIŞIYOR. Bu deponun "bağlı ama yanlış sayı" sınıfı.

   ② BİRİM ÇEVRİLMİYORDU. İki etiket de dile bakmadan " sn" yazıyordu;
      İngilizce arayüzde süreler Türkçe birimle görünüyordu.

   İKİSİNİ DE KAPI GÖREMEZDİ: budama kutusu çekimden sonra "Kes" denene
   kadar gizli, yani `kontrast.py`nin çizdiği hiçbir durumda görünmüyor.
   Bu yüzden kilit KAYNAK düzeyinde ve DAVRANIŞ düzeyinde birlikte. */

const fs = require('fs');
const { macYolu } = require('./kaynak.js');
const tel = oku(telefonYolu());
const fn = (tel.match(/function trimUpdate\(\)\{[\s\S]*?\n\}/) || [])[0];
ok('trimUpdate çıkarılabildi', !!fn);

/* ---------- KAYNAK DÜZEYİ ---------- */
if (fn) {
  /* Desen `[^)]*` ile yazılmıştı ve `$('#trimB')` içindeki paranteze takıldı —
     davranış taraması geçerken kaynak kilidi yanlış alarm verdi. */
  ok('üst sınır var: seçim video süresini aşamıyor',
     /Math\.min\(Math\.max\([\s\S]*?trimA\+0\.3\), d\)/.test(fn));
  ok('alt sınır korundu (en az 0,3 sn)', /trimA\+0\.3/.test(fn));
  ok('kısa videoda başlangıç geri çekiliyor', /trimB-trimA<0\.3\) trimA=Math\.max\(0, trimB-0\.3\)/.test(fn));
  ok('birim dile göre seçiliyor', /L==='tr' \? ' sn' : ' s'/.test(fn));
  ok('etiketler sabit " sn" yazmıyor', !/toFixed\(1\)\+' sn'/.test(fn));
}

/* ---------- DAVRANIŞ: BÜTÜN KAYDIRICI ARALIĞI ----------
   Tek tek sınır örneği yetmez; iki kaydırıcının bütün birleşimleri taranıyor.
   Aranan şey üç değişmez: 0 ≤ A ≤ B ≤ süre. */
function kur(d, aVal, bVal, L) {
  const store = {};
  const $ = sel => {
    if (sel === '#trimA') return { value: aVal };
    if (sel === '#trimB') return { value: bVal };
    return (store[sel] = store[sel] || { textContent: '' });
  };
  let trimA = 0, trimB = 0;
  new Function('ctx', 'with(ctx){' + fn + '; trimUpdate();}')({
    $, L,
    get trimA(){ return trimA; }, set trimA(v){ trimA = v; },
    get trimB(){ return trimB; }, set trimB(v){ trimB = v; },
    trimDur: () => d,
  });
  return { trimA, trimB, d, etA: store['#vTrimA'].textContent,
           etB: store['#vTrimB'].textContent, bilgi: store['#trimInfo'].textContent };
}

if (fn) {
  const sureler = [0.2, 1, 7.5, 60, 600];
  let denenen = 0, ihlal = [];
  for (const d of sureler) {
    for (let a = 0; a <= 1000; a += 50) {
      for (let b = 0; b <= 1000; b += 50) {
        const r = kur(d, a, b, 'tr'); denenen++;
        if (r.trimA < -1e-9) ihlal.push(`A<0 (d=${d} a=${a} b=${b})`);
        else if (r.trimA > r.trimB + 1e-9) ihlal.push(`A>B (d=${d} a=${a} b=${b})`);
        else if (r.trimB > d + 1e-9) ihlal.push(`B>süre (d=${d} a=${a} b=${b} → ${r.trimB})`);
      }
    }
  }
  ok('tarama gerçekten koştu (' + denenen + ' birleşim)', denenen > 2000);
  ok('hiçbir birleşimde seçim video dışına taşmıyor' +
     (ihlal.length ? ' — ' + ihlal.length + ' ihlal, ilki: ' + ihlal[0] : ''),
     ihlal.length === 0);

  /* Uzun videoda tam aralık seçilebilmeli — sınır koymak özelliği
     kısıtlamamalı (fazla sıkı bir kilit de kusurdur). */
  const tam = kur(60, 0, 1000, 'tr');
  ok('baştan sona seçim hâlâ mümkün (0 → 60)',
     Math.abs(tam.trimA) < 1e-9 && Math.abs(tam.trimB - 60) < 1e-9);

  /* Başlangıcı sona sürüklemek: son 0,3 sn seçilir, video dışına çıkılmaz. */
  const sonda = kur(60, 1000, 1000, 'tr');
  ok('başlangıç sona sürüklenince son 0,3 sn seçiliyor (' +
     sonda.trimA.toFixed(2) + '–' + sonda.trimB.toFixed(2) + ')',
     Math.abs(sonda.trimB - 60) < 1e-9 && Math.abs(sonda.trimA - 59.7) < 1e-9);

  /* 0,3 sn'den kısa videoda seçim videonun kendisidir; doTrim bunu
     `trimShort` ile açıkça reddeder — sessizce yanlış kesmez. */
  const kisa = kur(0.2, 0, 1000, 'tr');
  ok('0,3 sn altı videoda seçim videonun kendisi (' + kisa.trimB.toFixed(2) + ')',
     Math.abs(kisa.trimB - 0.2) < 1e-9);
  ok('doTrim kısa seçimi açıkça reddediyor',
     /if\(sel<0\.3\)\{ toast\(m\('trimShort'\)\); return; \}/.test(tel));

  /* i18n: birim iki dilde de doğru. */
  ok('Türkçede birim "sn"', /\bsn$/.test(kur(60, 0, 1000, 'tr').etA.trim()));
  ok('İngilizcede birim "s" (Türkçe kalıntı yok)',
     / s$/.test(kur(60, 0, 1000, 'en').etA) && !/sn/.test(kur(60, 0, 1000, 'en').etA));
  ok('bilgi satırı da iki dilde',
     /Seçilen/.test(kur(60, 0, 1000, 'tr').bilgi) && /Selected/.test(kur(60, 0, 1000, 'en').bilgi));
}

/* ---------- MAC PARİTESİ ----------
   Aynı kusur masaüstünde de vardı ve ORASI DAHA KÖTÜYDÜ: bilgi satırının
   TAMAMI sabit Türkçeydi (telefonda hiç değilse dile bakıyordu). Mac A.2d'de
   iki dilli olmuştu, bu metin geride kalmıştı. */
{
  const mac = fs.readFileSync(macYolu(), 'utf8');
  const mFn = (mac.match(/function trimGuncelle\(\)\{[\s\S]*?\n  \}/) || [])[0];
  ok('Mac trimGuncelle çıkarılabildi', !!mFn);
  if (mFn) {
    ok('Mac: üst sınır var (seçim video sonunu aşmıyor)',
       /Math\.min\(Math\.max\([\s\S]*?trimA\+0\.3\), d\)/.test(mFn));
    ok('Mac: kısa videoda başlangıç geri çekiliyor',
       /trimB-trimA<0\.3\) trimA=Math\.max\(0, trimB-0\.3\)/.test(mFn));
    ok('Mac: birim dile göre', /L==='tr' \? ' sn' : ' s'/.test(mFn));
    ok('Mac: bilgi satırı iki dilde (eskiden tamamı Türkçeydi)',
       /Seçilen: /.test(mFn) && /Selected: /.test(mFn));
    ok('Mac: sabit " sn" eki kalmadı', !/toFixed\(1\)\+' sn'/.test(mFn));

    /* Davranış: iki kabuk AYNI matematiği uyguluyor mu? Ayrışırlarsa aynı
       çekim iki platformda farklı kesilir — bu deponun 1 numaralı sınıfı. */
    function kurMac(d, aVal, bVal, L) {
      const store = {};
      const $ = sel => {
        if (sel === '#rrTrimA') return { value: aVal };
        if (sel === '#rrTrimB') return { value: bVal };
        return (store[sel] = store[sel] || { textContent: '' });
      };
      let trimA = 0, trimB = 0;
      new Function('ctx', 'with(ctx){' + mFn + '; trimGuncelle();}')({
        $, L,
        get trimA(){ return trimA; }, set trimA(v){ trimA = v; },
        get trimB(){ return trimB; }, set trimB(v){ trimB = v; },
        trimSure: () => d,
      });
      return { trimA, trimB, bilgi: store['#rrTrimInfo'].textContent,
               etA: store['#rrTrimAV'].textContent };
    }
    /* METNİN VAR OLMASI YETMEZ, SEÇİLDİĞİ DE ÖLÇÜLMELİ. İlk hâli kaynakta
       "Seçilen:" ve "Selected:" dizelerini arıyordu; bozma turu dalın
       koşulunu `true` yapınca iki dize de yerinde kaldığı için test susuyordu.
       Artık İngilizce arayüzde ÇİZİLEN metne bakılıyor. */
    const mEn = kurMac(60, 0, 1000, 'en'), mTr = kurMac(60, 0, 1000, 'tr');
    ok('Mac: İngilizce arayüzde bilgi satırı İngilizce çiziliyor',
       /^Selected: /.test(mEn.bilgi) && !/Seçilen/.test(mEn.bilgi));
    ok('Mac: Türkçe arayüzde Türkçe çiziliyor', /^Seçilen: /.test(mTr.bilgi));
    ok('Mac: birim de İngilizcede "s" (Türkçe kalıntı yok)',
       / s$/.test(mEn.etA) && !/sn/.test(mEn.etA));
    let ayrilik = 0, bakilan = 0;
    for (const d of [0.2, 7.5, 60]) {
      for (let a = 0; a <= 1000; a += 100) {
        for (let b = 0; b <= 1000; b += 100) {
          const t = kur(d, a, b, 'tr'), k = kurMac(d, a, b, 'tr'); bakilan++;
          if (Math.abs(t.trimA - k.trimA) > 1e-9 || Math.abs(t.trimB - k.trimB) > 1e-9) ayrilik++;
        }
      }
    }
    ok('karşılaştırma gerçekten koştu (' + bakilan + ' birleşim)', bakilan > 300);
    ok('telefon ve Mac aynı seçimi hesaplıyor' + (ayrilik ? ' — ' + ayrilik + ' ayrılık' : ''),
       ayrilik === 0);
  }
}
