const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu, oku, cikar, macMetni, REPO}=require('./kaynak.js');

/* E.4 — PROVA RAPORU (çekimden sonra "nasıl okudum").

   Rakip matrisinde bu satır BOŞ: on bir üründen hiçbirinde yok. E fazının
   geri kalanı sunucu istiyor ve Erdal kararı bekliyor; bu madde İSTEMİYOR —
   veri zaten cihazda. `cekimAltyazi` her kelimenin okuma çizgisinden geçtiği
   anı taşıyor (altyazı zaten bundan üretiliyor), yani rapor sıfır sunucu ve
   sıfır yapay zekâ ile çıkıyor.

   ⚠️ BU TESTİN ASIL İŞİ RAPORUN YALAN SÖYLEMEMESİ. Damgalar okuma çizgisini
   KİMİN sürdüğünü ölçer: sesle takip açıkken konuşmacıyı, kapalıyken suflenin
   kendi sabit akışını. Kapalıyken "gerçek hız" kullanıcının kendi WPM ayarıdır
   ve rapor ona kendi ayarını geri söylerdi — ölçmediğini ölçmüş gibi göstermek
   bu deponun en ağır kusur sınıfı. O yüzden kapalıyken sayı YAZILMIYOR.

   Kod KOPYALANMIYOR, kaynaktan çıkarılıp koşturuluyor. */

const src = oku(telefonYolu());
const mac = macMetni();

/* AÇIKÇA VERİLEN YOL YANLIŞSA SESSİZCE DEPOYA DÜŞME. Bozma turu geçici bir
   kopya yazıp SUFLE_PROVA ile gösteriyor; test depo dosyasını okusaydı bozma
   HİÇBİR ŞEY ölçmeden "geçti" görünürdü — nitekim ilk koşuda tam bu oldu. */
const acikProva = process.env.SUFLE_PROVA;
if (acikProva && !fs.existsSync(acikProva))
  throw new Error('Verilen prova yolu yok: ' + acikProva);
const PROVA_YOL = acikProva || path.join(REPO, 'cekirdek/prova.js');

/* ---------- KAYNAK DÜZEYİ: BAYRAK GERÇEKTEN KURULUYOR MU ---------- */
{
  /* Bayrak yoksa rapor sesle-kapalı çekimde de sayı yazar — sessiz yalan. */
  ok('cekimSesle bayrağı tanımlı', /let cekimSesle=false;/.test(src));
  ok('bayrak her kayıt başında mevcut duruma kuruluyor',
     /cekimAltyazi=null;\s*\n\s*cekimSesle=voiceOn;/.test(src));
  /* Bayrak, sesle takip sufleyi GERÇEKTEN sürdüğünde ve YALNIZ kayıt
     sürerken kalkmalı: kayıt dışında konuşmak çekimi "sesle sürüldü"
     yapmamalı. */
  ok('çekim ortasında açılırsa da yakalanıyor (yapışkan)',
     /if\(recT\)\s*cekimSesle=true;/.test(src));
  /* Bayrak EŞLEŞTİRİCİNİN İÇİNDE OLMAMALI: oraya konunca tests/65'in
     yalıtılmış tezgâhı `recT` tanımsız diye çöktü. Kayıt katmanına ait
     bilgi eşleştiricinin işi değil. */
  const esles = src.slice(src.indexOf('vptr=bestK+1;'), src.indexOf('vTarget=Math.max(0,wordTops[wi]'));
  ok('eşleştirici bölümü ayrılabildi (ölçmeyen kapı değil)', esles.length > 60);
  ok('bayrak eşleştiricinin içinde DEĞİL', !/cekimSesle/.test(esles));
  /* Rapor sonuç ekranına bağlı olmalı — bağlanmamış rapor ölü koddur. */
  /* İDDİA SONUÇ EKRANI YOLUNA DEMİRLİ. T49'da `sonucTazele()` de provaYaz()
     çağırmaya başladı ve genel desen (`^\s*provaYaz();`) oradan eşleşerek
     asıl bağlantı koparıldığında bile geçiyordu — bozma turu yakaladı. */
  /* SATIR BAŞINA DEMİRLİ: yorum işaretiyle kapatılan satır da aynı deseni
     taşıyor ve çağrıyı yoruma almak testten geçiyordu — bu tuzağa T40'ta da
     düşülmüştü, aynı dosyada ikinci kez. */
  ok('rapor sonuç ekranında çağrılıyor',
     /^\s*provaYaz\(\);\s*\/\/ E\.4 — çekim sonrası prova raporu/m.test(src));
  ok('rapor kutusu işaretlemede var', /id="provaBox"/.test(src));
}

/* ---------- HESAP TEK YERDE Mİ ---------- */
{
  /* Kopyalanmış bir hesap, biri düzeltilip diğeri unutulunca iki platformun
     farklı sayı göstermesi demektir — bu deponun en pahalı hata sınıfı.
     Tur 40'ta ortak çekirdeğe taşındı. */
  ok('prova hesabı ortak çekirdekte', fs.existsSync(PROVA_YOL));
  ok('telefon çekirdeği gömüyor', /==CEKIRDEK:prova\.js==/.test(src));
  ok('Mac de aynı çekirdeği gömüyor', /==CEKIRDEK:prova\.js==/.test(mac));
  /* Gömülen kopya kaynakla AYNI olmalı — bayat gömme sessiz sapmadır. */
  const cek = fs.readFileSync(PROVA_YOL, 'utf8');
  const imza = (cek.match(/const PROVA_DURAKLAMA=([\d.]+)/) || [])[1];
  ok('çekirdekte eşik okunabildi — ' + imza, !!imza);
  for (const [ad, k] of [['telefon', src], ['Mac', mac]])
    ok(ad + ' gömülü eşiği kaynakla aynı',
       new RegExp('const PROVA_DURAKLAMA=' + imza.replace('.', '\\.')).test(k));
}

/* ---------- GERÇEK FONKSİYONU ÇIKAR VE KOŞTUR ---------- */
const govde = cikar(fs.readFileSync(PROVA_YOL, 'utf8'),
                    /const PROVA_DURAKLAMA=[\s\S]*$/, 'provaRapor');
const provaRapor = new Function(govde + '\n return provaRapor;')();
ok('provaRapor çekirdekten çıkarılıp koşturulabildi', typeof provaRapor === 'function');

/* Yardımcı: t saniyelerinden kelime listesi kurar. */
const kelimeler = (zamanlar, kuyruk = 0) => {
  const a = zamanlar.map((t, i) => ({ s: 'k' + i, ln: 0, t }));
  for (let i = 0; i < kuyruk; i++) a.push({ s: 'son' + i, ln: 0, t: null });
  return a;
};

/* ---------- SAYILAR DOĞRU MU ---------- */
{
  /* 30 kelime, tam 15 saniye, eşit aralık -> 120 kelime/dk.
     (29 aralık × 0,5 sn = 14,5 sn okuma süresi; hız 30/14,5×60 = 124) */
  const esit = Array.from({length: 30}, (_, i) => i * 0.5);
  const r = provaRapor(kelimeler(esit), true);
  ok('eşit tempoda rapor üretildi', !!r);
  ok('okunan kelime doğru sayıldı — ' + r.kelime, r.kelime === 30);
  ok('hız hesabı doğru (' + r.wpm + ' bekleniyor 124)', r.wpm === 124);
  ok('eşit tempoda duraklama YOK — ' + r.duraklama, r.duraklama === 0);
  ok('en uzun duraklama yokken null', r.enUzun === null);
  ok('okunmayan kuyruk yok', r.okunmayan === 0);
}

/* ---------- DURAKLAMA YAKALANIYOR MU ---------- */
{
  /* İki gerçek duraklama: 2,0 sn ve 3,5 sn. Eşik 1,2 sn. */
  const t = [];
  let z = 0;
  for (let i = 0; i < 40; i++) {
    t.push(z);
    z += (i === 9 ? 2.0 : i === 24 ? 3.5 : 0.4);
  }
  const r = provaRapor(kelimeler(t), true);
  ok('iki duraklama da sayıldı — ' + r.duraklama, r.duraklama === 2);
  ok('duraklama toplamı doğru (' + r.duraklamaToplam.toFixed(1) + ')',
     Math.abs(r.duraklamaToplam - 5.5) < 0.01);
  ok('en uzun duraklama en büyüğü (' + r.enUzun.sn.toFixed(1) + ')',
     Math.abs(r.enUzun.sn - 3.5) < 0.01);
  /* Kullanıcı "nerede takıldım" diye soruyor: duraklamanın ARDINDAN GELDİĞİ
     kelime söylenmeli, yoksa rapor bir sayıdan ibaret kalır. */
  ok('duraklamanın hangi kelimeden sonra olduğu biliniyor', r.enUzun.sonra === 'k24');
  /* 0,4 sn'lik normal kelime araları duraklama SAYILMAMALI — sayılsaydı her
     çekim "37 duraklama" derdi ve rapor işe yaramaz olurdu. */
  ok('normal kelime araları duraklama sayılmıyor', r.duraklama < 5);
}

/* ---------- TEMPO DEĞİŞİMİ GÖRÜLÜYOR MU ---------- */
{
  /* İlk 10 sn yavaş (0,8 sn/kelime), sonraki 10 sn hızlı (0,25 sn/kelime).
     Tek ortalama bunu tümden gizlerdi. */
  const t = [];
  let z = 0;
  while (z < 10) { t.push(z); z += 0.8; }
  while (z < 20) { t.push(z); z += 0.25; }
  const r = provaRapor(kelimeler(t), true);
  ok('tempo penceresi hesaplandı — ' + r.pencere, r.pencere >= 2);
  ok('yavaş ve hızlı bölüm ayrıştı (' + r.enYavas + '–' + r.enHizli + ')',
     r.enHizli > r.enYavas * 1.5);
}

/* ---------- OKUNMAYAN KUYRUK ---------- */
{
  const r = provaRapor(kelimeler(Array.from({length: 20}, (_, i) => i * 0.4), 13), true);
  /* Kayıt senaryo bitmeden durdurulduysa bunu söylemek gerekir: kullanıcı
     çekimi bitmiş sanıp yayınlarsa cümlenin yarısı gider. */
  ok('okunmayan kuyruk sayıldı — ' + r.okunmayan, r.okunmayan === 13);
}

/* ---------- YALAN SÖYLEMEME SINIRLARI ---------- */
{
  /* ① Az kelimede rapor YOK: 8 kelimelik çekimde tek boşluk "hızın çok
     değişken" derdi. */
  ok('12 kelimenin altında rapor üretilmiyor',
     provaRapor(kelimeler([0, .4, .8, 1.2, 1.6, 2, 2.4, 3]), true) === null);
  /* ② Süre yoksa (bütün damgalar aynı an) bölme anlamsız. */
  ok('süre yokken rapor üretilmiyor',
     provaRapor(kelimeler(Array(20).fill(0)), true) === null);
  /* ③ Damga hiç yoksa (sufle akmamış çekim) rapor YOK. */
  ok('damgasız çekimde rapor üretilmiyor',
     provaRapor(kelimeler([], 40), true) === null);
  /* ④ Bozuk girdi çökmesin: sonuç ekranı rapor yüzünden açılmamazlık
     etmemeli. */
  ok('kaynak dizi değilse sessizce boş döner',
     provaRapor(null, true) === null && provaRapor(undefined, false) === null);

  /* ⑤ EN ÖNEMLİSİ: sesle takip kapalıyken de hesap yapılır ama EKRANDA hız ve
     duraklama YAZILMAZ. Bayrak rapora taşınıyor mu? */
  const kapali = provaRapor(kelimeler(Array.from({length: 30}, (_, i) => i * 0.5)), false);
  ok('rapor sesle bayrağını taşıyor', kapali.sesle === false);
  const yazici = src.slice(src.indexOf('function provaYaz'));
  ok('ekrana yazarken bayrak kontrol ediliyor', /if\(r\.sesle\)\{/.test(yazici));
  /* Kapalı dalda hız ve duraklama satırı OLMAMALI, sebep OLMALI. */
  const kapaliDal = yazici.slice(yazici.indexOf('} else {'), yazici.indexOf('if(r.okunmayan'));
  ok('kapalı dal ayrılabildi (ölçmeyen kapı değil)', kapaliDal.length > 100);
  ok('sesle kapalıyken hız sayısı yazılmıyor', !/r\.wpm/.test(kapaliDal));
  ok('sesle kapalıyken duraklama sayısı yazılmıyor', !/r\.duraklama/.test(kapaliDal));
  ok('sesle kapalıyken SEBEBİ yazılıyor (iki dilde)',
     /ÖLÇÜLEMEDİ/.test(kapaliDal) && /NOT measured/.test(kapaliDal));

  /* ⑥ Dolga kelime (şey/yani/ııı) VAAT EDİLMEMELİ: ölçmek için konuşmanın
     metnini saklamak gerekir, gizlilik metnimiz bunu yapmadığımızı söylüyor.
     Bir gün eklenirse önce gizlilik metni değişmeli. */
  const temiz = src.replace(/\/\*[\s\S]*?\*\//g, '');
  ok('rapor dolgu kelime saymayı vaat etmiyor',
     !/dolgu kelime|filler word/i.test(temiz.slice(temiz.indexOf('function provaYaz'),
                                                   temiz.indexOf('function srtText'))));
}

/* ---------- MAC PARİTESİ ---------- */
{
  /* Telefonda olup Mac'te olmayan özellik = yarım özellik, bu deponun 1
     numaralı hata sınıfı. E.4 iki kabukta da olmalı. */
  ok('Macte rapor kutusu var', /id="provaBox"/.test(mac));
  ok('Macte rapor çiziliyor', /function provaYaz\(\)\{/.test(mac));
  /* SATIR BAŞINA DEMİRLE: `provaYaz\(\);\s*\/\/ E\.4` deseni
     `// provaYaz();   // E.4` ile de eşleşiyordu, yani çağrıyı yoruma almak
     testten geçiyordu. Bozma turu yakaladı. */
  ok('Mac sonuç ekranında rapor çağrılıyor', /^\s*provaYaz\(\);/m.test(mac));
  ok('Macte de sesle bayrağı var', /cekimSesle=voiceOn;/.test(mac));
  ok('Macte de çekim ortasında açılış yakalanıyor',
     /recorder\.state==='recording'\)\s*cekimSesle=true;/.test(mac));

  /* Mac'in çizimi de aynı dürüstlük sınırına uymalı. */
  const yz = mac.slice(mac.indexOf('function provaYaz(){'), mac.indexOf('function showResult'));
  ok('Mac çizimi ayrılabildi (ölçmeyen kapı değil)', yz.length > 400);
  ok('Macte bayrak kontrol ediliyor', /if\(r\.sesle\)\{/.test(yz));
  const kapaliDal = yz.slice(yz.indexOf('} else {'), yz.indexOf('if(r.okunmayan'));
  ok('Macte sesle kapalıyken hız yazılmıyor', !/r\.wpm/.test(kapaliDal));
  ok('Macte sesle kapalıyken SEBEBİ yazılıyor',
     /ÖLÇÜLEMEDİ/.test(kapaliDal) && /NOT measured/.test(kapaliDal));

  /* ÇEKİMİN ANLIK GÖRÜNTÜSÜ: telefonda vardı, Mac'te yoktu. Olmayınca
     çekimden sonra senaryoya dokunmak altyazıyı ve raporu BAŞKA bir metne
     göre üretiyordu. */
  ok('Macte çekim anlık görüntüsü alınıyor',
     /cekimAltyazi = words\.length \? words\.map/.test(mac));
  ok('Mac altyazısı anlık görüntüden üretiliyor',
     /const kaynak = cekimAltyazi/.test(mac));
}

/* ---------- SONUÇ EKRANI DİLLE TAZELENİYOR MU (T49 denetimi) ----------
   Kapı çekim sonrası ekranı HİÇ ölçmüyordu; eklenince orada 1 kontrast
   ihlali ve 4 çevrilmemiş metin çıktı. Metinler iki dilde yazılıydı ama
   ekran bir kez çiziliyordu — "yazılı ama tazelenmiyor" sınıfı. */
{
  ok('sonuç ekranı tazeleyicisi var', /function sonucTazele\(\)\{/.test(src));
  ok('dil değişiminde çağrılıyor',
     /getComputedStyle\(\$\('#result'\)\)\.display!=='none'\) sonucTazele\(\)/.test(src));
  const tz = src.slice(src.indexOf('function sonucTazele(){'), src.indexOf('function showResult('));
  ok('tazeleyici ayrılabildi (ölçmeyen kapı değil)', tz.length > 300);
  /* Üç dinamik metnin üçü de yenilenmeli: ses özeti, altyazı bilgisi, rapor. */
  ok('ses özeti tazeleniyor', /audSummary\(\)/.test(tz));
  ok('altyazı bilgisi tazeleniyor', /#capInfo/.test(tz));
  ok('prova raporu tazeleniyor', /provaYaz\(\)/.test(tz));
  /* Paylaşım tanısındaki SABİT TÜRKÇE parçalar da çevrildi (denetimde
     bulundu): tanı satırı sorun anında bakılan tek yer, yarısı yabancı
     dilde olamaz. */
  ok('tanı satırı iki dilde', /'kompozit':'composite'/.test(src) &&
     /'ham kamera':'raw camera'/.test(src));
  /* Türkçe metin ŞAPKALI yazılmalı: Türkçe-öncelikli bir üründe
     "Ses cok kisik" kabul edilemez. */
  /* Kaynakta uzun tire `\u2014` kaçışıyla yazılı; iddia METNE bakmalı,
     kaçış biçimine değil. */
  ok('ses uyarısı şapkalı Türkçe', /Ses çok kısık .* mikrofona yaklaş/.test(src));
  ok('kırpma uyarısı şapkalı Türkçe', /ses kırpmış/.test(src));
}
