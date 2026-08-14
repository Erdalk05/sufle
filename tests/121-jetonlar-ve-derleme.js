const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu, macYolu, oku, REPO}=require('./kaynak.js');

/* A.1 — TASARIM JETONLARI TEK KAYNAK + DERLEME BORU HATTI.

   İki ayrı iddia sınanıyor:
     1) Jetonların kontrastı WCAG AA (4.5:1) geçiyor — DEĞERDEN HESAPLANARAK,
        yorumdaki sayıya güvenilmeden. Yorumdaki sayı bayatlayabilir; oran
        renkten yeniden hesaplanırsa bayatlayamaz.
     2) Boru hattı KAPIYA BAĞLI: kaynak değişip kabuk yenilenmezse kapı kırmızı.
        Bağlı olmayan bir derleme adımı, hiç olmamasından daha kötüdür — güven
        verir ama ölçmez.

   ⚠️ Jetonların BUGÜN hiçbir kuralı değiştirmemesi KASITLI (bkz. cekirdek/
   jetonlar.css). Bu yüzden burada "şu düğme yeşil" gibi bir iddia YOK; öyle bir
   iddia B.1'de, geçiş yapıldıkça gelecek. */

/* Kasıtlı bozma turu jetonları geçici bir kopyada bozup yolu SUFLE_JETON ile
   veriyor. Bu satır olmadan test HER ZAMAN depodaki sağlam dosyayı okur ve
   bozma hiç ölçülmez — "ölçmeyen kapı" sınıfı. kaynak.js'teki kural burada da
   geçerli: açıkça verilen yol YANLIŞSA sessizce depoya düşme, bağır. */
const jetonYolu = (() => {
  const v = process.env.SUFLE_JETON;
  if (v && !fs.existsSync(v))
    throw new Error('Verilen yol yok: ' + v + ' (SUFLE_JETON) — bozma turu hiçbir şey ölçmez.');
  return v || path.join(REPO, 'cekirdek', 'jetonlar.css');
})();
const derleYolu = path.join(REPO, 'derle.py');
const kapiYolu  = path.join(REPO, 'kapi.sh');

/* ---------- 1. KONTRAST: değerden hesapla ---------- */
{
  ok('jeton dosyası depoda', fs.existsSync(jetonYolu));
  const css = fs.readFileSync(jetonYolu, 'utf8');

  const oku6 = ad => {
    const m = css.match(new RegExp('--' + ad + ':\\s*(#[0-9A-Fa-f]{6})'));
    return m && m[1];
  };
  const lin = c => { c/=255; return c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
  const L = h => { const n=parseInt(h.slice(1),16);
    return 0.2126*lin((n>>16)&255) + 0.7152*lin((n>>8)&255) + 0.0722*lin(n&255); };
  const K = (a,b) => { const x=L(a), y=L(b);
    return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };

  /* En zor zemin bilerek seçildi: --s-raised en açık yüzey, oran orada en düşük.
     Kolay zeminde ölçmek testi yalancı yeşile boyardı. */
  const zemin = oku6('s-raised');
  ok('en zor zemin --s-raised okunabildi ('+zemin+')', /^#[0-9A-Fa-f]{6}$/.test(zemin||''));

  for (const ad of ['t-hi','t-mid','t-low','r-action-t','r-record-t','r-info-t','r-warn-t']) {
    const c = oku6(ad);
    const o = c ? K(c, zemin) : 0;
    ok(`--${ad} (${c}) koyu yüzeyde AA: ${o.toFixed(2)}`, o >= 4.5);
  }
  /* Dolgu rolleri: ÜSTÜNDEKİ yazıyla birlikte ölçülür. Tek başına dolgunun
     zemine kontrastı yanıltıcıdır — okunan şey üstündeki yazı. */
  for (const [dolgu, yazi] of [['r-action','on-action'],['r-record','on-record'],
                               ['r-info','on-info'],['r-warn','on-warn']]) {
    const d = oku6(dolgu), y = oku6(yazi);
    const o = (d&&y) ? K(d,y) : 0;
    ok(`--${dolgu} + --${yazi} AA: ${o.toFixed(2)}`, o >= 4.5);
  }

  /* ÖLÇÜMÜN ÖĞRETTİĞİ: metin kırmızısı ile dolgu kırmızısı AYNI OLAMAZ.
     Biri geçerse öbürü kalıyor. Birleştirilirse erişilebilirlik sessizce
     kırılır, bu yüzden ayrı kalmaları KİLİTLENİYOR. */
  ok('kayıt rolünün dolgu ve metin biçimi farklı (ölçüm gereği)',
     oku6('r-record') !== oku6('r-record-t'));
  ok('bilgi rolünün dolgu ve metin biçimi farklı (ölçüm gereği)',
     oku6('r-info') !== oku6('r-info-t'));
}

/* ---------- 2. BORU HATTI KAPIYA BAĞLI MI ---------- */
{
  ok('derle.py depoda', fs.existsSync(derleYolu));
  const sh = fs.readFileSync(kapiYolu, 'utf8');
  /* Adım NUMARASINA değil VARLIĞINA kilitlen — kapıya adım eklemek bu testi
     boşuna kırmasın (116 numaralı test aynı dersi bir kez verdi). */
  ok('kapıda derleme adımı var', /say "\d+\/\d+ Derleme tazeliği"/.test(sh));
  ok('kapı --denetle ile çağırıyor (yazmıyor, ölçüyor)',
     /python3 derle\.py --denetle/.test(sh));
  ok('bayatlık kapıyı KIRMIZI yapıyor',
     /python3 derle\.py --denetle[^\n]*\|\| KOD=1/.test(sh));
}

/* ---------- 3. GÖMÜLEN İÇERİK GERÇEKTEN İKİ KABUKTA DA MI ---------- */
{
  /* BİLEREK depodaki çekirdek — SUFLE_JETON değil. Bu bölümün sorusu
     "kabuk depodaki kaynağa göre taze mi", geçici bozma kopyasıyla ilgisi yok.
     Karıştırılsaydı bozma turunda bu bölüm de kırılır ve 1. bölümdeki kontrast
     iddiasının gerçekten ayırt edip etmediği belirsiz kalırdı. */
  const kaynak = fs.readFileSync(path.join(REPO, 'cekirdek', 'jetonlar.css'), 'utf8');
  /* Kaynaktan RASTGELE değil, ayırt edici bir satır seç: ölçümle bulunmuş
     ve kolay kolay tesadüfen bulunmayacak bir değer. */
  const imza = (kaynak.match(/--t-low:\s*(#[0-9A-Fa-f]{6})/)||[])[1];
  ok('jeton kaynağında imza değeri var', !!imza);
  for (const [ad, yol] of [['telefon', telefonYolu()], ['Mac', macYolu()]]) {
    const s = oku(yol);
    ok(ad+': çekirdek işaretleyicisi var',
       s.includes('/* ==CEKIRDEK:jetonlar.css== */') &&
       s.includes('/* ==/CEKIRDEK:jetonlar.css== */'));
    ok(ad+': gömülen jeton içeriği yerinde ('+imza+')', !!imza && s.includes(imza));
    ok(ad+': gömülen blok "ÜRETİLDİ" uyarısı taşıyor',
       /ÜRETİLDİ — ELLE DÜZENLEME/.test(s));
  }
}
