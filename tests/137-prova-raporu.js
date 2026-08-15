const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku, cikar}=require('./kaynak.js');

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
  ok('rapor sonuç ekranında çağrılıyor', /\n  provaYaz\(\);/.test(src));
  ok('rapor kutusu işaretlemede var', /id="provaBox"/.test(src));
}

/* ---------- GERÇEK FONKSİYONU ÇIKAR VE KOŞTUR ---------- */
const govde = cikar(src, /const PROVA_DURAKLAMA=[\s\S]*?\n\}\nfunction provaYaz/, 'provaRapor');
const kod = govde.replace(/\nfunction provaYaz$/, '');
const provaRapor = new Function(kod + '\n return provaRapor;')();
ok('provaRapor kaynaktan çıkarılıp koşturulabildi', typeof provaRapor === 'function');

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
