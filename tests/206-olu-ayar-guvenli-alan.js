const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,esnek,cekirdekOku}=require('./kaynak');

/* ÖN KOŞULU OLAN AYAR = ÖLÜ AYAR — GÜVENLİ ALAN ANAHTARI (2026-08-20).

   ÖLÇÜLDÜ (gerçek tarayıcı, gerçek kamera akışı): "Platform arayüz alanlarını
   göster" anahtarı AÇILIYOR — `sw on` sınıfı geliyor, ayar kaydediliyor — ama
   ekranda hiçbir şey değişmiyordu: `#safeWrap` `display:none`, içi BOŞ.

   Sebep: alanları yalnız DİKEY platform formatları tanımlıyor (Reels, Story,
   Shorts). Varsayılan format "Serbest" ve orada `curMode().safe` yok. Yani
   kullanıcı için bu "açtım ama olmuyor" demekti — deponun 3 numaralı hata
   sınıfı: *ön koşulu olan ayar, ölü ayardır. Ya koşulu kendin sağla ya
   anahtarı geri al ve SEBEBİNİ söyle.*

   Seçilen yol: anahtar duruyor, sönüyor ve ALTINDA sebebi yazıyor — hangi
   formatlarda çizildiği adıyla. Gizlemek yanlış olurdu: format bir dokunuş
   ötede ve kullanıcı özelliğin var olduğunu bilmeli. Devre dışı bırakmak da
   yanlış olurdu: dokunuşu sessizce yutardı. */

const tel=esnek(oku(telefonYolu()));
const SOZ=cekirdekOku('sozluk.js','SUFLE_SOZLUK');

/* ---------- 1) SEBEP EKRANDA YAZIYOR ---------- */
ok('ipucu kutusu var', /id="safeHint"/.test(tel));
{
  const ds=tel.match(/function drawSafe\(\)\{[\s\S]*?\n\}/);
  ok('drawSafe çıkarılabildi', !!ds);
  const b=ds?ds[0]:'';
  ok('ipucu ancak ön koşul YOKKEN yazılıyor', /varMi \? '' : srY\(t\('safeYok'\)/.test(b));
  ok('ipucu ön koşul varken gizleniyor', /ip\.style\.display = varMi \? 'none' : ''/.test(b));
  /* Hangi formatlarda çalıştığı ELLE yazılmıyor, MODES'tan türetiliyor:
     yeni bir dikey format eklenince cümle kendiliğinden doğru kalır. */
  ok('çalışan formatlar listesi MODESten türetiliyor',
     /Object\.keys\(MODES\)\.filter\(k=>MODES\[k\]\.safe\)/.test(b));
  ok('anahtar söndürülüyor', /classList\.toggle\('etkisiz',\s*!varMi\)/.test(b));
}
/* Sönük ama TIKLANABİLİR: `disabled` dokunuşu sessizce yutardı ve kullanıcı
   ikinci kez dener, yine bir şey olmaz. */
ok('anahtar devre dışı bırakılmıyor (dokunuş yutulmuyor)',
   !/data-t="safe"[^>]*disabled/.test(tel));
ok('sönük anahtar görünür kalıyor (gizlenmiyor)',
   /\.sw\.etkisiz\{opacity:\.45\}/.test(tel) && !/\.sw\.etkisiz\{display:none/.test(tel));

/* ---------- 2) CÜMLE İKİ DİLDE VE AYNI YER TUTUCULARLA ----------
   Yer tutucular ayrışırsa bir dilde süslü parantez görünür (tests/197 aynı
   sınıfı bütün sözlük için ölçüyor; burada bu anahtar adıyla kilitli). */
{
  const al=(blok)=>{ const m=blok.match(/safeYok:'((?:[^'\\]|\\.)*)'/);
    return m?[...new Set(m[1].match(/\{\w+\}/g)||[])].sort().join(''):null; };
  const kes=SOZ.search(/\n\s*en:\{/);
  const tr=al(SOZ.slice(0,kes)), en=al(SOZ.slice(kes));
  ok('sebep cümlesi Türkçe tanımlı', tr!==null);
  ok('sebep cümlesi İngilizce tanımlı', en!==null);
  ok('yer tutucular iki dilde aynı ('+tr+')', !!tr && tr===en);
  ok('cümle hem formatı hem çıkış yolunu söylüyor',
     tr==='{format}{liste}');
}

/* ---------- 3) ALANI OLAN FORMATLAR ----------
   Liste sessizce boşalırsa anahtar HİÇBİR formatta çalışmaz ve ipucu her
   zaman görünür — kusur "açıklanmış" olur ama kaybolmaz. */
{
  const m=tel.match(/const MODES=\{[\s\S]*?\n\};/);
  ok('formatlar çıkarılabildi', !!m);
  const alanli=(m?m[0]:'').match(/safe:\{/g)||[];
  ok('güvenli alan tanımlayan format var ('+alanli.length+')', alanli.length>=3);
  for(const k of ['reels','story','shorts'])
    ok('"'+k+'" formatı güvenli alan tanımlıyor',
       new RegExp(k+':\\s*\\{[\\s\\S]{0,300}?safe:\\{').test(m?m[0]:''));
}
