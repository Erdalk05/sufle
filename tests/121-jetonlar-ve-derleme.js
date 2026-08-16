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
const derleYolu = (()=>{ const v=process.env.SUFLE_DERLE;
  if(v && !fs.existsSync(v)) throw new Error('Verilen yol yok: '+v);
  return v || path.join(REPO, 'derle.py'); })();
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
  const kaynak = fs.readFileSync(jetonYolu, 'utf8');
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

/* ---------- 4. SÖZLÜK TEK KAYNAK MI ---------- */
{
  /* Sözlük çekirdeğe taşındı (A.2a). Bu bölümün işi geri kaymayı önlemek:
     biri kabuğa elle ikinci bir I18N/MSG yazarsa "tek kaynak" sessizce biter
     ve iki dil iki yerde ayrışmaya başlar. */
  /* SUFLE_JETON'da olduğu gibi: bozma turu sözlüğü geçici kopyada bozup yolu
     SUFLE_SOZLUK ile veriyor. Bu satır olmadan test hep depodaki sağlam dosyayı
     okur ve bozma YAKALANMAZ — bir kez tam bunu yaşadım, kapı söyledi. */
  const sozYolu = (() => {
    const v = process.env.SUFLE_SOZLUK;
    if (v && !fs.existsSync(v))
      throw new Error('Verilen yol yok: ' + v + ' (SUFLE_SOZLUK) — bozma turu hiçbir şey ölçmez.');
    return v || path.join(REPO, 'cekirdek', 'sozluk.js');
  })();
  ok('sözlük çekirdekte', fs.existsSync(sozYolu));
  const soz = fs.existsSync(sozYolu) ? fs.readFileSync(sozYolu, 'utf8') : '';
  /* I18N ve MSG AYRI dosyada: Mac yalnız etiketleri kullanıyor, mesajları
     değil. Tek dosyada tutup Mac'e gömdüğümde telefona özgü metin
     ("Ayarlar → Safari → Kamera") Mac dosyasına sızdı ve tests/52 haklı
     olarak kırıldı. Kabuk KULLANDIĞINI gömsün. */
  ok('sözlükte I18N var, MSG YOK (ayrı dosyada)',
     /const I18N=\{/.test(soz) && !/const MSG=\{/.test(soz));
  const mesajYolu = path.join(REPO, 'cekirdek', 'mesajlar.js');
  ok('mesajlar ayrı çekirdek dosyasında',
     fs.existsSync(mesajYolu) && /const MSG=\{/.test(fs.readFileSync(mesajYolu, 'utf8')));
  /* Sızıntının kendisi de kilitlensin: Mac'te kamera izni için Safari yolu
     tarif edilmemeli — Mac'te Safari izni diye bir şey yok. */
  /* KULLANICIYA GÖSTERİLEN metinde aranıyor, yorumlarda değil. mac-mesajlar.js
     başlığı bu sızıntıyı DERS olarak anlatıyor ve ifadeyi tırnak içinde
     anıyor; yorumu kırmızı saymak, hatanın belgelenmesini cezalandırmak
     olurdu. Yorumları atınca iddia yerinde kalıyor: sızıntının kendisi hâlâ
     yakalanır (aşağıda kanıtlandı). */
  const macTemiz = oku(macYolu())
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  ok('Mac dosyasına telefona özgü Safari kamera yolu sızmıyor',
     !/Ayarlar → Safari → Kamera/.test(macTemiz));
  /* Ölçmeyen kapı olmasın: temizlenmiş metin gerçekten TARANABİLİR mi? */
  ok('yorum ayıklama metni tümden silmedi', macTemiz.length > 40000);

  const tel = oku(telefonYolu());
  ok('telefonda sözlük işaretleyicisi var', tel.includes('/* ==CEKIRDEK:sozluk.js== */'));
  /* İDDİA: kabukta sözlük TAM OLARAK BİR kez tanımlı. İkinci bir tanım
     JavaScript'te sessizce öncekini gölgeler; hata vermez, yalnız yanlış
     çalışır — bu deponun en sevdiği hata biçimi. */
  ok('telefonda I18N tam olarak 1 kez tanımlı',
     (tel.match(/const I18N\s*=/g) || []).length === 1);
  ok('telefonda MSG tam olarak 1 kez tanımlı',
     (tel.match(/const MSG\s*=/g) || []).length === 1);

  /* TR/EN paritesi: eksik çeviri kullanıcıya BOŞ etiket olarak görünür. */
  const kes = (ad) => {
    const m = soz.match(new RegExp('\\b' + ad + '\\s*:\\s*\\{'));
    if (!m) return null;
    let d = 1, k = m.index + m[0].length;
    while (d && k < soz.length) { if (soz[k] === '{') d++; else if (soz[k] === '}') d--; k++; }
    return soz.slice(m.index + m[0].length, k - 1);
  };
  /* ⚠️ BLOĞU indexOf('en:') İLE KESME. İlk yazımda öyle yaptım ve test yalan
     söyledi: tr 51 · en 241 çıktı, oysa gerçek 240/240. Sebep, TR değerlerinin
     İÇİNDE geçen bir "en:" dizisi bloğu erkenden kesmesiydi. Süslü parantez
     sayan kes() zaten yazılmıştı; asıl hata onu kullanmamaktı. */
  /* ⚠️ SATIR BAŞI GİRİNTİLİ OLABİLİR. İlk desen `(?:^|[,{]\s*)` idi: virgülden
     sonra gelen anahtarı görüyordu ama ÖNÜNDE YORUM OLAN anahtarı görmüyordu
     (yorum satırından sonra anahtar iki boşlukla başlıyor ve `^` hemen ondan
     önce eşleşmiyor). Ölçüldü: TR'ye yorumla birlikte eklenen `gDosya` ve
     `gYeni` sözlükte VARDI, test "en'de fazla 2 anahtar" diye kırmızı verdi —
     yani testin kendi kusuru gerçek bir pariteyi bozuk gösteriyordu. */
  const anah = (govde) => new Set([...govde.matchAll(/(?:^\s*|[,{]\s*)([A-Za-z]\w*)\s*:/gm)].map(x => x[1]));
  const trG = kes('tr'), enG = kes('en');
  ok('sözlükte tr ve en blokları okunabildi', !!trG && !!enG);
  if (trG && enG) {
    const t = anah(trG), e = anah(enG);
    const eksik = [...t].filter(k => !e.has(k));
    const fazla = [...e].filter(k => !t.has(k));
    /* Sayının kendisi de bir iddia: blok yanlış kesilirse 240 çıkmaz. */
    ok(`I18N tr/en paritesi (tr ${t.size} · en ${e.size} · eksik ${eksik.length} · fazla ${fazla.length})`,
       eksik.length === 0 && fazla.length === 0 && t.size > 200);
  }
}

/* ---------- B.1: ÖLÇEK TANIMLI DEĞİL, KULLANILIYOR (Tur 43) ----------
   ÖLÇÜLDÜ: `--tx-*` ve `--sp-*` jetonları tanımlıydı ama KULLANAN KİMSE
   YOKTU (0 kullanım) — tanımlı ama ölü ölçek, bu deponun "ölü ayar" sınıfı.
   Tanım tek başına hiçbir şeyi garanti etmez; bir sonraki geliştirici yine
   rastgele piksel yazar. Bu blok ölçeğin GERÇEKTEN kullanıldığını kilitliyor.

   Ayrıca tarayıcıda ölçülen iki AYIRT EDİLEMEZ ikiz tekleştirildi:
   telefonda 11 vs 11,5 px · Mac'te 12 vs 12,5 px. Yarım piksellik basamak
   tasarım değil kazadır; iki kabukta da farklı punto sayısı 7'den 6'ya indi. */
{
  const jetonKaynak = fs.readFileSync(jetonYolu, 'utf8');
  for (const [ad, kaynak] of [['telefon', oku(telefonYolu())],
                             ['Mac', oku(macYolu())]]) {
    const tx = (kaynak.match(/var\(--tx-/g) || []).length;
    const sp = (kaynak.match(/var\(--sp-/g) || []).length;
    ok(ad + ': tipografi ölçeği kullanılıyor (' + tx + ' bildirim)', tx >= 10);
    ok(ad + ': boşluk ritmi kullanılıyor (' + sp + ' bildirim)', sp >= 10);
    /* Yarım piksellik punto GERİ GELMESİN: ölçüm onu ikiz olarak buldu. */
    const yarim = kaynak.match(/font-size:\s*\d+\.\d+px/g) || [];
    ok(ad + ': yarım piksellik punto yok — bulunan: ' + yarim.join(','), yarim.length === 0);
  }
  /* Jetonların KENDİSİ hâlâ tanımlı mı — kullanım varken tanım silinirse
     bütün bildirimler sessizce varsayılana düşerdi. */
  for (const j of ['--tx-xs','--tx-sm','--tx-md','--tx-lg','--tx-xl',
                   '--sp-1','--sp-2','--sp-3','--sp-4','--sp-6','--sp-8'])
    ok('jeton tanımlı: ' + j, new RegExp(j.replace(/-/g, '\\-') + ':').test(jetonKaynak));
}
