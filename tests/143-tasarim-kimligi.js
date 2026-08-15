const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu, oku, macMetni, cikar, cozJeton, REPO}=require('./kaynak.js');

/* TASARIM KİMLİĞİ — TUR 55.

   Erdal ekran görüntüsüyle bildirdi: "siyah üzerine kurulmuş, gençler
   hoşlanmaz, yapay zekâ tarafından tasarlanmış gibi duruyor; insan eli
   değmiş bir arayüz olsun."

   Şikâyet öznel görünüyor ama ÖLÇÜLEBİLİR dört nedeni vardı ve dördü de
   sayıldı (Tur 55, gerçek tarayıcıda çizilmiş arayüz üzerinde):

     ① 6000 satırlık uygulamada yalnız 4 gölge ve 4 basış geri bildirimi
        vardı — yüzeylerin kalınlığı yok, dokunma karşılıksız.
     ② Yüzey renkleri telefonda ELLE YAZILIYDI (#141418/#1e1e24/#2a2a32) ve
        jetonlar.css bunları hiç beslemiyordu: jeton dosyasını değiştirmek
        ekranda hiçbir şeyi değiştirmiyordu. "Tek kaynak" kâğıt üstündeydi.
     ③ 236 etiket başında süs emojisi taşıyordu. Emoji çok renkli olduğu için
        tek renkli sistemle çakışır ve her satıra bir tane koyunca hiyerarşi
        kurmaz — hepsi aynı ağırlıkta olur.
     ④ Altı öğeli seçicide son düğme TEK BAŞINA tam genişlik bir satır
        kaplıyordu; eşitlerden biri önemliymiş gibi duruyordu.

   Bu dosya dördünün de geri gelmesini engelliyor. Tasarım kararları koda
   yazılmazsa bir sonraki tur onları sessizce geri alır. */

const tel = oku(telefonYolu());
const mac = macMetni();
const telCss = tel.replace(/\/\*[\s\S]*?\*\//g, '');   // yorumdaki örnek renk sayılmasın

/* ---------- ① DERİNLİK VE BASIŞ ---------- */
{
  const jet = fs.readFileSync(path.join(REPO, 'cekirdek', 'jetonlar.css'), 'utf8');
  for (const j of ['--el-1', '--el-2', '--el-3'])
    ok('yükselti jetonu tanımlı: ' + j, new RegExp(j + ':').test(jet));

  /* Üstten ışık varsayımı: yükselen yüzey ÜST kenarından aydınlanır. Bu
     olmadan gölge yalnız karartma olur, kalınlık okunmaz. */
  ok('yükseltide üst kenar aydınlığı var', /inset 0 1px 0 rgba\(255,255,255/.test(jet));

  /* Basış geri bildirimi ölçülen kusurdu: dokunulan şey tepki vermiyordu. */
  ok('basış küçülmesi jetonu var', /--bas:\s*\.?\d/.test(jet));
  ok('telefonda basış gerçekten bağlanmış',
     /:active[^{]*\{[^}]*transform:scale\(var\(--bas\)\)/.test(telCss));

  /* Sayı: tek bir bileşene gölge eklemek "derinlik" değildir. Çizilmiş
     arayüzde 196 öğe ölçüldü; eşik düşük tutuldu ki biçim değişikliği
     testi kırmasın, ama düzlüğe dönüş yakalansın. */
  const golge = (telCss.match(/box-shadow:/g) || []).length;
  ok('gölge kullanımı düzlükten çıktı — ' + golge, golge >= 12);
}

/* ---------- HAREKET AZALTMA TERCİHİ ---------- */
{
  const jet = fs.readFileSync(path.join(REPO, 'cekirdek', 'jetonlar.css'), 'utf8');
  /* Süreleri tek yerden sıfırlamak, her bileşende ayrı kural yazmaktan
     kısa DEĞİL — unutulamaz olduğu için tercih edildi: yeni bir bileşen
     jetonu kullandığı anda kurala uyuyor. */
  const blok = (jet.match(/@media \(prefers-reduced-motion: reduce\)\{[\s\S]*?\}\s*\}/) || [])[0] || '';
  ok('hareket azaltma bloğu var', blok.length > 20);
  ok('süreler sıfırlanıyor', /--hiz-hizli:0ms/.test(blok) && /--hiz-orta:0ms/.test(blok));
  ok('basış küçülmesi de sıfırlanıyor', /--bas:1/.test(blok));
}

/* ---------- ② YÜZEYLER TEK KAYNAĞA BAĞLI ---------- */
{
  /* Asıl bulgu buydu: jetonlar.css vardı ama telefon onu KULLANMIYORDU.
     Elle yazılı hex geri gelirse jeton dosyası yine ölü ayara döner. */
  for (const [ad, jeton] of [['sheetbg', '--s-surface'], ['card', '--s-raised'],
                             ['line', '--s-line'], ['muted', '--t-low']]) {
    const m = telCss.match(new RegExp('--' + ad + ':\\s*([^;]+);'));
    ok('yüzey jetona bağlı: --' + ad, !!m && m[1].trim() === 'var(' + jeton + ')');
  }

  /* Renk gerçekten ÇÖZÜLEBİLMELİ: var() zinciri kırık olsaydı ekran
     renksiz kalırdı ve yukarıdaki kontrol yine geçerdi. */
  for (const jeton of ['--s-bg', '--s-surface', '--s-raised', '--s-line']) {
    const c = cozJeton('var(' + jeton + ')');
    ok('jeton bir renge çözülüyor: ' + jeton + ' → ' + c, /^#[0-9a-fA-F]{6}$/.test(c));
  }

  /* Zemin düz siyah OLMAMALI — Erdal'ın şikâyetinin birinci cümlesi.
     Sufle metninin kendi zemini (--pbg) bunun DIŞINDA: o kamera karşısında
     okunan yüzey ve orada saf siyah doğru tercih. */
  const zem = cozJeton('var(--s-bg)');
  ok('uygulama zemini saf siyah değil (' + zem + ')', zem.toLowerCase() !== '#000000');
  ok('sufle metninin zemini saf siyah KALDI (kamera için doğru)', /--pbg:#000/.test(telCss));
}

/* ---------- ③ ETİKETLERDE SÜS EMOJİSİ YOK ---------- */
{
  const emoji = /[\u{1F300}-\u{1FAFF}]/u;
  const sz = fs.readFileSync(path.join(REPO, 'cekirdek', 'sozluk.js'), 'utf8');
  const kirli = [...sz.matchAll(/\w+:'([^']*)'/g)].map(m => m[1])
                  .filter(v => emoji.test(v));
  ok('sözlükte emojili etiket yok — ' + kirli.length + (kirli.length ? ' → ' + kirli[0] : ''),
     kirli.length === 0);

  /* İşaretlemedeki VARSAYILAN metinler de temiz olmalı: sözlüğü temizleyip
     işaretlemeyi bırakmak iki platformu ayrıştırıyordu (tests/122 yakaladı,
     32 etiket uyuşmuyordu). */
  for (const [ad, src] of [['telefon', tel], ['Mac', mac]]) {
    const m = [...src.matchAll(/>\s*([\u{1F300}-\u{1FAFF}])\s+\S/gu)];
    ok(ad + ' işaretlemesinde emojili etiket yok — ' + m.length, m.length === 0);
  }

  /* SINIR: bu kural ETİKETLER içindir. Geri bildirim emojileri DURUM
     bildiriyor (✅ oldu / ⚠️ dikkat / ⛔ olmaz) ve onlar süs değil; silinirse
     kullanıcı sonucu ayırt edemez. Kuralın kapsamı burada kilitleniyor. */
  const msg = fs.readFileSync(path.join(REPO, 'cekirdek', 'mesajlar.js'), 'utf8');
  ok('durum emojileri mesajlarda DURUYOR', emoji.test(msg) || /[✅⚠⛔]/.test(msg));
}

/* ---------- ④ YETİM DÜĞME BIRAKMAYAN DÜZEN ---------- */
{
  /* Esnek kutuda son satırda tek kalan öğe tüm genişliğe ŞİŞİYORDU. Izgara
     öğe sayısından bağımsız eşit hücre veriyor. */
  const seg = (telCss.match(/\.seg\{[^}]*\}/) || [''])[0];
  ok('seçiciler ızgaraya geçti', /display:grid/.test(seg));
  ok('hücreler eşit genişlikte', /repeat\(auto-fit,minmax\(\d+px,1fr\)\)/.test(seg));
  /* Altı öğeli seçici auto-fit ile dörde bölünüp son satırda iki dar hücre
     bırakıyordu; 3'e 2 bölünmesi için açıkça yazıldı. */
  ok('altı öğeli seçici 3e 2 bölünüyor', /#modeSeg\{grid-template-columns:repeat\(3,1fr\)\}/.test(telCss));
}

/* ---------- KAYDIRICI DOLGUSU: HESAP ---------- */
{
  /* Kaydırıcıyı tarayıcının hazır görünümünden çıkarınca DOLU KISIM gitti,
     yani değer bir bakışta okunamaz oldu. Bu bir bilgi kaybıydı, tasarım
     tercihi değil — dolgu geri geldi ama artık bize ait. */
  const kod = cikar(tel, /function railDoldur\(r\)\{[\s\S]*?\n\}/, 'railDoldur');
  const api = new Function(kod + '\n return railDoldur;')();

  const sahte = (min, max, val) => {
    const o = { min: String(min), max: String(max), value: String(val), _y: {} };
    o.style = { setProperty: (k, v) => { o._y[k] = v; } };
    return o;
  };
  const oran = (min, max, val) => { const r = sahte(min, max, val); api(r); return r._y['--dolu']; };

  ok('en düşük değerde boş', oran(0, 100, 0) === '0%');
  ok('en yüksek değerde dolu', oran(0, 100, 100) === '100%');
  ok('ortada yarım', oran(0, 100, 50) === '50%');

  /* ASIL TUZAK: min her zaman sıfır değil (hız 60'tan başlıyor). Oranı ham
     değerden hesaplasaydık çubuk HİÇ boşalmaz, en düşük hızda bile yarı dolu
     görünürdü — yani gösterge sessizce yalan söylerdi. */
  ok('sıfırdan başlamayan aralıkta en düşük değer BOŞ', oran(60, 200, 60) === '0%');
  ok('sıfırdan başlamayan aralık doğru oran veriyor', oran(60, 200, 130) === '50%');

  /* Sınır dışı değer çubuğu taşırmamalı. */
  ok('aralık üstü değer %100de duruyor', oran(0, 100, 999) === '100%');
  ok('aralık altı değer %0da duruyor', oran(0, 100, -5) === '0%');
  /* Bozuk aralık (max=min) sıfıra bölme yapmamalı. */
  ok('sıfır genişlikli aralık çökmüyor', oran(5, 5, 5) === '0%');
}

/* ---------- KAYDIRICI DOLGUSU: TAM GEREKTİĞİ ANDA ÇALIŞIYOR MU ---------- */
{
  /* Bu deponun en verimli hata sınıfı: özellik VAR ama gerektiği anda
     çalışmıyor. Dolguyu yalnız `input` olayına bağlasaydık, değerler
     PROGRAMLA değiştiğinde (hazır kurulum seçilince, ayarlar sıfırlanınca,
     kayıtlı durum yüklenince) çubuk eski oranda kalırdı. */
  ok('toplu tazeleyici var', /function railHepsi\(\)\{/.test(tel));
  ok('toplu tazeleyici TÜM kaydırıcıları geziyor',
     /function railHepsi\(\)\{ \$\$\('input\[type=range\]'\)\.forEach\(railDoldur\); \}/.test(tel));

  const acilis = cikar(tel, /function openSheet\(id\)\{[\s\S]*?railHepsi\(\);/, 'openSheet');
  ok('panel her açılışta tazeliyor', /railHepsi\(\);/.test(acilis));

  ok('kullanıcı sürüklerken de tazeleniyor',
     /r\.addEventListener\('input',\(\)=>railDoldur\(r\),\{passive:true\}\)/.test(tel));
  ok('ilk çizimde de dolduruluyor (açılışta boş görünmesin)',
     /forEach\(r=>\{\s*\n\s*railDoldur\(r\);/.test(tel));

  /* Dolgu CSS tarafında GERÇEKTEN kullanılmalı — jeton yazılıp okunmazsa
     hesap doğru olsa bile ekranda hiçbir şey olmaz. */
  ok('ray dolguyu okuyor', /background:linear-gradient\(90deg,var\(--accent\) 0 var\(--dolu,0%\)/.test(telCss));
}

/* ---------- SAYI EYLEM DEĞİLDİR ---------- */
{
  /* B.1de kurulan kural: DOLU yeşil = ekrandaki TEK asıl eylem. Değer
     sayıları da yeşil yazılınca aynı vurguyu paylaşıyor ve göz hangisinin
     dokunulacak şey olduğunu ayırt edemiyor. */
  const v = (telCss.match(/\.row \.v\{[^}]*\}/) || [''])[0];
  ok('değer sayısı vurgu rengini kullanmıyor', v.length > 10 && !/var\(--accent\)/.test(v));
  ok('değer ağırlığını puntodan alıyor', /font-size:var\(--tx-lg\)/.test(v));
  /* Kaydırıcı sürülürken 99→100 giderken rakamların zıplamaması için. */
  ok('rakamlar sabit genişlikte', /font-variant-numeric:tabular-nums/.test(v));
}
