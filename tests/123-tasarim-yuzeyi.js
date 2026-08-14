const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, macYolu, oku}=require('./kaynak.js');

/* B.1 başlangıcı — JETONLAR ARTIK KULLANIMDA + sayısal göstergeler sabit.

   ÖLÇÜLEN GERÇEK (2026-08-14, Chrome headless, görünürlük hesaplı):
     telefon ilk açılış:  5 kontrol (TR·EN·kameralı·kamerasız·yardım)
     telefon ana ekran :  9 kontrol (hız −/+ · ayarlar · senaryolar ·
                          hazır · kayıt · ses · oynat · not kapat)
   Yani rakip analizindeki "ilk açılışta 40+ kontrol karşılıyor" iddiası
   TELEFON İÇİN YANLIŞTI — o sayı Mac'in sağ paneline ait. B.3'ün gerçek
   hedefi Mac; telefonun sadeliği ise BOZULMAMASI gereken bir varlık.
   Bu test o varlığı biçim düzeyinde korur (öge sayısı tarayıcı işi,
   ama intro'daki kontrol KİMLİKLERİ işaretlemede sayılabilir). */

const tel = oku(telefonYolu());
const mac = oku(macYolu());

/* ---------- 1. JETONLAR GERÇEKTEN KULLANILIYOR ---------- */
{
  /* --accent artık rol jetonuna bağlı. Değeri kopyalamak DEĞİL bağlamak
     gerekiyor: kopya, jeton güncellenince sessizce ayrışır. */
  ok('telefon: --accent rol jetonuna bağlı',
     /--accent:var\(--r-action\)/.test(tel));
  ok('telefon: --accent-d karşı renk jetonuna bağlı',
     /--accent-d:var\(--on-action\)/.test(tel));
  ok('Mac: --accent rol jetonuna bağlı',
     /--accent:var\(--r-action\)/.test(mac));
  /* Eski sabit değer kural olarak kalmamalı (yorum/canvas hariç).
     ':' öneki CSS değerini yakalar, yorumdaki düz metni yakalamaz. */
  /* Yorumlar ve canvas çizimi sayılmaz: jeton dosyasının kendi açıklaması
     eski değeri tarihçe olarak ANLATIYOR, kural olarak kullanmıyor. İlk
     yazımda yorumları ayıklamadım ve test kendi açıklamasına takıldı. */
  const cssTemiz = tel.replace(/\/\*[\s\S]*?\*\//g, '').replace(/g\.addColorStop[^\n]*/g, '');
  ok('telefon: sabit #00C853 CSS değeri kalmadı', !/:#00C853/i.test(cssTemiz));
}

/* ---------- 2. SAYISAL GÖSTERGELER ZIPLAMAZ ---------- */
{
  /* tabular-nums: süre/WPM her saniye değişirken genişlik sabit kalır.
     Sayaç zıplaması, "amatör ürün" algısının küçük ama sürekli kaynağı. */
  for (const id of ['hEl','recTime','railV','spVal','count']) {
    const m = tel.match(new RegExp('<[^>]*id="' + id + '"[^>]*>'));
    ok('telefon #' + id + ' tabular-nums taşıyor', !!m && /class="[^"]*tnum/.test(m[0]));
  }
  for (const id of ['clock','wc','sbWpm']) {
    const m = mac.match(new RegExp('<[^>]*id="' + id + '"[^>]*>'));
    ok('Mac #' + id + ' tabular-nums taşıyor', !!m && /class="[^"]*tnum/.test(m[0]));
  }
  /* Kuralın kendisi jeton dosyasından geliyor — iki kabukta da gömülü olmalı. */
  ok('tnum kuralı iki kabukta da gömülü',
     /\.tnum[^{]*\{[^}]*tabular-nums/.test(tel) && /\.tnum[^{]*\{[^}]*tabular-nums/.test(mac));
}

/* ---------- 3. TELEFONUN SADELİĞİ KORUNUYOR ---------- */
{
  /* İlk açılış yüzeyi: intro'da yalnız bu kontroller var. Yeni bir düğme
     eklemek isteyen önce buraya gelsin ve gerekçesini yazsın — sadelik
     kazara değil kararla bozulur. Ölçülen: 5 kontrol. */
  /* intro'nun sınırı: kendi kapanışına kadar (langSwitch iç div'i tek
     satırda açılıp kapanıyor, o yüzden ilk satır-başı </div> güvenli).
     İlk yazımda "hud'a kadar" demiştim; hud intro'dan ÖNCE duruyor ve
     desen hiç eşleşmedi — 0 düğme sayıp yanlış yere kırmızı bastı. */
  const intro = (tel.match(/<div id="intro">[\s\S]*?\n<\/div>/) || [''])[0];
  ok('intro bölümü bulunabildi', intro.length > 100);
  const dugmeler = [...intro.matchAll(/<button\b[^>]*>/g)];
  ok('ilk açılışta en fazla 6 düğme (ölçülen 5 + pay 1) — şimdi: ' + dugmeler.length,
     dugmeler.length > 0 && dugmeler.length <= 6);
}
