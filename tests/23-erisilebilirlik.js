const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const mac=oku(macYolu());

/* ERİŞİLEBİLİRLİK KAPISI
   2026-08-13 denetimi: Mac'te aria-* sayısı 0, tabindex 0, odak halkası yok.
   Anahtarlar <div class="sw2"> olduğu için klavyeyle ne odaklanılıyor ne
   açılıyordu; ekran okuyucu ne adını ne durumunu söylüyordu. Telefonda
   odaklanma vardı ama durum (aria-checked) ve ad (aria-label) yoktu.

   Bu dosya iddiaları KAYNAKTAN doğruluyor. Tarayıcı otomasyonunda sekme
   gizli olduğu için gerçek odak sırası ölçülemiyor (bkz. depo notları);
   ölçülebilen şey korumaların kodda gerçekten bağlı olduğu. */

const PLATFORMLAR = [['telefon', tel, '.sw'], ['Mac', mac, '.sw2']];

for (const [ad, src, sinif] of PLATFORMLAR) {
  const s = sinif.slice(1);   // 'sw' | 'sw2'

  // 1. ODAKLANABİLİRLİK — div anahtar tabindex olmadan klavyeye tümüyle kapalı
  ok(ad+': anahtarlar odaklanabilir (tabindex)',
     new RegExp("\\$\\$\\('\\."+s+"'\\)[\\s\\S]{0,400}?setAttribute\\('tabindex','0'\\)").test(src));

  // 2. ROL — role="switch" olmadan ekran okuyucu "anahtar" bile demez
  ok(ad+': anahtarlara switch rolü veriliyor',
     new RegExp("\\$\\$\\('\\."+s+"'\\)[\\s\\S]{0,400}?setAttribute\\('role','switch'\\)").test(src));

  // 3. DURUM — role="switch" + aria-checked yoksa açık/kapalı duyulmaz
  ok(ad+': açık/kapalı durumu aria-checked ile bildiriliyor',
     /setAttribute\('aria-checked'/.test(src));

  // 4. DURUM GERÇEKTEN BAĞLI MI — sabit 'true' yazmak testi kandırırdı
  ok(ad+': aria-checked sabit değil, duruma bağlı',
     /aria-checked',\s*a\s*\?\s*'true'\s*:\s*'false'/.test(src));

  // 5. AD — adsız anahtar ekran okuyucuda "anahtar, açık" diye okunur, hangisi belirsiz
  ok(ad+': anahtarın adı etiket metninden türetiliyor',
     /setAttribute\('aria-label',\s*et\.textContent\.trim\(\)\)/.test(src));

  // 6. KLAVYEYLE AÇILABİLİRLİK — odaklanmak yetmez, Boşluk/Enter çalışmalı
  ok(ad+': Boşluk ve Enter anahtarı çeviriyor',
     new RegExp("addEventListener\\('keydown'[\\s\\S]{0,200}?e\\.key===' '\\|\\|e\\.key==='Enter'").test(src));

  // 7. KISAYOL ÇAKIŞMASI — Boşluk belge düzeyinde başlat/duraklat'a bağlı.
  //    stopPropagation yoksa ayar açarken sufle de akmaya başlar. Telefonda
  //    bu GERÇEK TARAYICIDA bulunmuştu; Mac'te aynı bağlama var.
  ok(ad+': tuş olayı genel kısayola sızmıyor (stopPropagation)',
     new RegExp("e\\.key===' '\\|\\|e\\.key==='Enter'[\\s\\S]{0,400}?stopPropagation\\(\\)").test(src));

  // 8. ODAK HALKASI — klavyeyle gezen kullanıcı nerede olduğunu görmeli
  ok(ad+': klavye odak halkası tanımlı (:focus-visible)',
     /:focus-visible\{[^}]*outline:/.test(src));

  // 9. Fareyle tıklayanda halka ÇIKMAMALI — :focus kullanılsaydı her tıkta çıkardı
  ok(ad+': odak halkası yalnız klavyede (düz :focus değil)',
     !/[^-]:focus\{[^}]*outline:\s*3px/.test(src));
}

/* ---------- DİL DEĞİŞİNCE AD DA DEĞİŞMELİ (yalnız telefon iki dilli) ----------
   aria-label bir kez başlangıçta yazılırsa İngilizceye geçen kullanıcı
   Türkçe etiket duymaya devam eder. */
ok('telefon: anahtar adları dil uygulanırken yenileniyor',
   /function applyLang\(\)\{[\s\S]*?setAttribute\('aria-label',\s*et\.textContent[\s\S]*?\n\}/.test(tel));

/* ---------- TÜRETİLEN ADLAR GERÇEKTEN İŞE YARIYOR MU ----------
   aria-label yandaki <span>'den türetiliyor. "Kod aria-label yazıyor" demek
   yetmez: span bulunamazsa ad BOŞ kalır, iki anahtarın etiketi aynıysa ekran
   okuyucu ikisini de aynı adla okur ve ayırt edilemezler. Kaynaktan gerçek
   etiketleri çıkarıp ölçüyoruz. */
function anahtarAdlari(src, sinif){
  const cikti = [];
  const re = /<div class="(?:tog|toggle)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
  let m;
  while ((m = re.exec(src))) {
    const blok = m[1];
    const k = blok.match(new RegExp('class="'+sinif+'[^"]*"[^>]*data-t="([^"]+)"'));
    if (!k) continue;
    const sp = blok.match(/<span[^>]*>([\s\S]*?)<\/span>/);
    cikti.push([k[1], sp ? sp[1].replace(/<[^>]+>/g,'').trim() : '']);
  }
  return cikti;
}
for (const [ad, src, sinif] of [['telefon', tel, 'sw'], ['Mac', mac, 'sw2']]) {
  const adlar = anahtarAdlari(src, sinif);
  ok(ad+': anahtarlar etiket kapsayıcısında bulundu ('+adlar.length+' adet)', adlar.length > 0);
  const bos = adlar.filter(([,v]) => !v).map(([k]) => k);
  ok(ad+': hiçbir anahtarın adı boş değil'+(bos.length ? ' — BOŞ: '+bos.join(', ') : ''), bos.length === 0);
  const sayac = {};
  adlar.forEach(([,v]) => { sayac[v] = (sayac[v]||0) + 1; });
  const yinelenen = Object.keys(sayac).filter(v => sayac[v] > 1);
  ok(ad+': iki anahtar aynı adı taşımıyor'+(yinelenen.length ? ' — YİNELENEN: '+yinelenen.join(' | ') : ''),
     yinelenen.length === 0);
}

/* ---------- İKONLU DÜĞMELER ADSIZ KALMASIN ----------
   Yalnız emoji içeren düğme ekran okuyucuda ya hiç ya da emoji adıyla okunur.
   Kabul edilen adlandırma: aria-label, data-aria (telefonun i18n yolu) veya title. */
/* DEDEKTÖRÜN KENDİ TUZAĞI: ilk sürüm "4 karakterden kısa metin" diyordu ve
   TR / Mavi / 720p / Tümü gibi GERÇEK metin etiketlerini adsız sanıyordu.
   Ölçüt uzunluk değil: içinde hiç harf ya da rakam yoksa ikonludur. */
for (const [ad, src] of [['telefon', tel], ['Mac', mac]]) {
  const ikonlu = (src.match(/<button[^>]*>[^<]*<\/button>/g) || [])
    .filter(b => { const ic = b.replace(/^<button[^>]*>/,'').replace(/<\/button>$/,'').trim();
                   return ic && !/[\p{L}\p{N}]/u.test(ic); });
  const adsiz = ikonlu.filter(b => !/aria-label=|data-aria=|title=/.test(b));
  ok(ad+': ikonlu düğmelerin hepsi adlandırılmış ('+ikonlu.length+' düğme'+
     (adsiz.length ? ', ADSIZ: '+adsiz.join(' ') : '')+')', adsiz.length === 0);
}
