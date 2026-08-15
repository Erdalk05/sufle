const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu, oku, macMetni, cikar, REPO}=require('./kaynak.js');

/* D.3 — MAC'TE ÖĞRENMELİ TUŞ EŞLEME.

   T44'te ölçüldü: Mac sabit bir `switch(e.key)` kullanıyordu. Piyasadaki
   sunum kumandalarının tuşları (PageDown/PageUp/Home/oklar) karşılanıyordu,
   ama ALIŞILMADIK bir tuş gönderen pedal için kullanıcının yapabileceği
   hiçbir şey yoktu. Telefonda öğrenmeli eşleme vardı — yani yetenek bir
   platformda var, diğerinde yok: bu deponun 1 numaralı hata sınıfı.

   TARAYICIDA GERÇEK TUŞ OLAYIYLA DOĞRULANDI (Tur 45, CDP Input.dispatchKeyEvent):
     PageDown            -> "PageDown → ▶︎/⏸"     (varsayılan sürüyor)
     F13 (öğretilmemiş)  -> hiçbir şey             (sessiz, doğru)
     F13 öğretildi       -> depoya {"F13":"reset"} yazıldı, kutu kapandı
     F13 (öğretilmiş)    -> "F13 → ⟲"             (artık çalışıyor)
     sıfırla             -> depo null, tablo "öğrenilmiş tuş yok" diyor

   KAPSAM SINIRI BİLİNÇLİ: Mac'te tek/çift basış ayrımı ve profil dosyası
   dışa/içe aktarma YOK. Bunlar telefonun ek sözleri; Mac'in arayüzü onları
   VAAT ETMİYOR, dolayısıyla yarım özellik değil — daha küçük ama bütün bir
   yetenek. Sınır yol haritasında yazılı. */

const tel = oku(telefonYolu());
const mac = macMetni();

/* ---------- KURALLAR ORTAK ÇEKİRDEKTE Mİ ---------- */
{
  /* AÇIKÇA VERİLEN YOL YANLIŞSA SESSİZCE DEPOYA DÜŞME — bozma turu hiçbir
     şey ölçmeden "geçti" derdi (T40'ta tam bu oldu). */
  const acik = process.env.SUFLE_KUMANDA;
  if (acik && !fs.existsSync(acik)) throw new Error('Verilen yol yok: ' + acik);
  const yol = acik || path.join(REPO, 'cekirdek', 'kumanda.js');
  ok('kumanda çekirdeği depoda', fs.existsSync(yol));
  ok('telefon çekirdeği gömüyor', /==CEKIRDEK:kumanda\.js==/.test(tel));
  ok('Mac de aynı çekirdeği gömüyor', /==CEKIRDEK:kumanda\.js==/.test(mac));

  /* Gerçek fonksiyonları çıkarıp koştur — kopya test, kod değişince yalan söyler. */
  const cek = fs.readFileSync(yol, 'utf8');
  const api = new Function(cek +
    '\n return {KUMANDA_EYLEMLERI, tusEtiketi, tusEslemesi, tusEslemesiSuz};')();

  ok('geçerli eylem kümesi okunabildi — ' + api.KUMANDA_EYLEMLERI.size,
     api.KUMANDA_EYLEMLERI.size >= 9);
  ok('boş tuş da bir seçim (none geçerli)', api.KUMANDA_EYLEMLERI.has('none'));

  /* Boşluk ekranda GÖRÜNÜR olmalı: boş hücre "tuş gelmedi" gibi okunur. */
  ok('boşluk tuşu adlandırılıyor (tr)', api.tusEtiketi(' ', 'tr') === 'Boşluk');
  ok('boşluk tuşu adlandırılıyor (en)', api.tusEtiketi(' ', 'en') === 'Space');
  ok('normal tuş olduğu gibi', api.tusEtiketi('F13', 'tr') === 'F13');

  /* Öğrenilen varsayılanın ÜSTÜNE biner; varsayılan tablo BOZULMAZ. */
  const varsayilan = {'a':'toggle', 'b':'rec'};
  const birlesik = api.tusEslemesi(varsayilan, {'a':'reset'});
  ok('öğrenilen varsayılanı eziyor', birlesik.a === 'reset');
  ok('dokunulmayan varsayılan duruyor', birlesik.b === 'rec');
  ok('varsayılan tablo değişmedi (kopya döndü)', varsayilan.a === 'toggle');

  /* Dışarıdan gelen eşleme GÜVENİLMEZ: tanınmayan eylem, basınca hiçbir şey
     yapmayan ölü bir tuş üretirdi. */
  const suzuldu = api.tusEslemesiSuz({'x':'toggle', 'y':'uydurma', 'z':123, '':'rec'});
  ok('bilinen eylem geçiyor', suzuldu.x === 'toggle');
  ok('uydurma eylem süzülüyor', suzuldu.y === undefined);
  ok('dize olmayan değer süzülüyor', suzuldu.z === undefined);
  ok('boş tuş adı süzülüyor', suzuldu[''] === undefined);
  ok('bozuk girdide çökmüyor',
     Object.keys(api.tusEslemesiSuz(null)).length === 0 &&
     Object.keys(api.tusEslemesiSuz('metin')).length === 0);

  /* İKİ KABUK DA SÜZGECİ KULLANMALI: aynı profil dosyası ikisine de
     girebiliyor, kural tek yerde yaşamalı. */
  ok('telefon süzgeci çekirdekten alıyor', /tusEslemesiSuz\(o\)/.test(tel));
  ok('Mac süzgeci çekirdekten alıyor', /tusEslemesiSuz\(state\.tusEsleme\)/.test(mac));
}

/* ---------- MAC: SABİT switch YERİNE TABLO ---------- */
{
  ok('Mac varsayılan eşleme tablosu var', /const MAC_VARSAYILAN=\{/.test(mac));
  ok('Mac eylem sözlüğü var', /const MAC_EYLEM=\{/.test(mac));

  const tablo = cikar(mac, /const MAC_VARSAYILAN=\{[\s\S]*?\};/, 'MAC_VARSAYILAN');
  /* T44'te kilitlenen sunum kumandası tuşları DAVRANIŞ OLARAK korunmalı:
     switch'ten tabloya geçiş bir yeniden yazımdı, kayıp olmamalı. */
  for (const tus of ['PageDown', 'PageUp', 'ArrowLeft', 'ArrowRight',
                     'ArrowUp', 'ArrowDown', 'Home'])
    ok('kumanda tuşu tabloda korundu: ' + tus,
       new RegExp("'" + tus + "':").test(tablo));
  ok('boşluk tuşu tabloda korundu', /' ':'toggle'/.test(tablo));

  /* Tablodaki her eylemin gerçekten bir karşılığı olmalı; olmayan eylem
     sessizce çalışmayan tuş demektir. */
  const eylemler = [...tablo.matchAll(/:'([a-zA-Z]+)'/g)].map(m => m[1]);
  const sozluk = cikar(mac, /const MAC_EYLEM=\{[\s\S]*?\n  \};/, 'MAC_EYLEM');
  const eksik = [...new Set(eylemler)].filter(a => !new RegExp('\\b' + a + ':').test(sozluk));
  ok('varsayılan tablodaki her eylemin karşılığı var — eksik: ' + eksik.join(','),
     eksik.length === 0);
}

/* ---------- ÖĞRENME AKIŞI BÜTÜN MÜ ---------- */
{
  /* Dört parça: tuşu yakala · eylemi seç · tabloyu göster · sıfırla.
     Biri düşerse özellik yarım kalır. */
  for (const [ad, id] of [['tuş öğret düğmesi', 'macLearn'],
                          ['gelen son tuş göstergesi', 'macLastKey'],
                          ['eylem seçici', 'macActSeg'],
                          ['eşleme tablosu', 'macMapList'],
                          ['varsayılana dön', 'macMapReset']])
    ok('Mac: ' + ad + ' var', new RegExp('id="' + id + '"').test(mac));

  ok('öğret düğmesi bir olaya bağlı', /\$\('#macLearn'\)\.onclick=/.test(mac));
  ok('eylem düğmeleri bir olaya bağlı', /#macActSeg button'\)\.forEach/.test(mac));
  ok('sıfırlama bir olaya bağlı', /\$\('#macMapReset'\)\.onclick=/.test(mac));

  /* ÖĞRENME MODU DAĞITIMDAN ÖNCE gelmeli: Escape ya da PageDown gönderen bir
     kumanda, eylemi çalıştırıp asla öğretilemezdi. */
  const dagitici = cikar(mac, /document\.addEventListener\('keydown',e=>\{[\s\S]*?\n  \}\);/,
                         'Mac dağıtıcı');
  const iOgren = dagitici.indexOf('if(macOgrenme)');
  const iDagit = dagitici.indexOf('macEsleme()[e.key]');
  ok('öğrenme modu dağıtımdan ÖNCE ele alınıyor', iOgren > 0 && iDagit > iOgren);
  ok('yazı kutusundayken kısayol çalışmıyor',
     /tag==='TEXTAREA'\|\|tag==='INPUT'\) return;/.test(dagitici));
  /* Basılı tutma: yalnız hız tuşları tekrar etsin (telefonla aynı kural).
     Kayıt ya da başlat/duraklat tekrarı çekimi mahveder. */
  ok('basılı tutmada yalnız hız tuşları tekrarlıyor',
     /e\.repeat && act!=='faster' && act!=='slower'/.test(dagitici));

  /* Öğrenilen eşleme KALICI olmalı; oturum sonunda kaybolan öğretme işe
     yaramaz. */
  /* İDDİA ÖĞRETME YOLUNA DEMİRLİ. Önce yalnız `state.tusEsleme=y; save()`
     arıyordu; aynı desen KALDIRMA yolunda da geçtiği için öğretmedeki save()
     silinse bile test geçiyordu — bozma turu yakaladı. */
  const ogret = mac.slice(mac.indexOf("#macActSeg button'"), mac.indexOf("#macMapReset'"));
  ok('öğretme yolu ayrılabildi (ölçmeyen kapı değil)', ogret.length > 150);
  ok('öğrenilen eşleme kaydediliyor', /state\.tusEsleme=y; save\(\);/.test(ogret));
  ok('sıfırlama da kaydediliyor', /state\.tusEsleme=null; save\(\)/.test(mac));
  /* Boş durumda SEBEP yazılmalı: boş kutu "bozuldu" gibi okunur. */
  ok('tablo boşken sebebi söyleniyor', /mMapEmpty/.test(mac));
  /* Tek tek kaldırma olmadan kullanıcı yanlış öğrettiğini geri alamaz
     (sıfırlama hepsini siler — bu yeterli değil). */
  ok('tek eşleme kaldırılabiliyor', /delete y\[k\]; state\.tusEsleme=y/.test(mac));
}

/* ---------- VAAT EDİLMEYEN ŞEY GÖSTERİLMİYOR ---------- */
{
  /* Mac'te çift basış ve profil aktarımı YOK. Arayüz onları vaat etmemeli:
     görünüp çalışmayan düğme, hiç olmayandan kötüdür. */
  const isaret = mac.slice(mac.indexOf('id="macLearnBox"'), mac.indexOf('id="macMapList"'));
  ok('Mac öğrenme kutusu ayrılabildi (ölçmeyen kapı değil)', isaret.length > 200);
  ok('Macte çift basış VAAT EDİLMİYOR', !/data-tap=/.test(isaret));
  ok('Macte profil aktarımı VAAT EDİLMİYOR',
     !/macMapExport|macMapImport/.test(mac));
}

/* ---------- GERİ BİLDİRİM VE ÇİZİM PARÇALARI ---------- */
{
  /* "Çalışmıyor" şikâyetinin yarısı, tuşun uygulamaya ULAŞTIĞINI görememekten
     çıkıyor (telefonda ölçülmüştü). Mac'te de her basış göstergeye yazılıyor. */
  ok('gelen tuş göstergeye yazılıyor', /function macSonTus\(k, act\)\{/.test(mac));
  ok('gösterge hem tuşu hem eylemi söylüyor',
     /tusEtiketi\(k, L\)\+\(act\?' → '/.test(mac));
  /* Dağıtıcı her başarılı eşleşmeden sonra göstergeyi tazelemeli; yoksa
     kullanıcı hangi tuşun çalıştığını göremez. */
  ok('dağıtıcı göstergeyi güncelliyor', /MAC_EYLEM\[act\]\(\);\s*\n\s*macSonTus\(e\.key, act\);/.test(mac));

  /* Öğrenme modunda yakalanan tuş bekletiliyor ve kullanıcıya SORULUYOR;
     doğrudan atamak yanlış tuşu kalıcı yapardı. */
  ok('yakalanan tuş bekletiliyor', /function macTusYakala\(k\)\{/.test(mac));
  ok('yakalanan tuş için eylem soruluyor', /mLearnPick/.test(mac));

  /* Öğrenme kutusu ve tablo, dil değişiminde de yeniden çiziliyor — T42'de
     ölçülen "yazılı ama tazelenmiyor" sınıfı burada tekrarlanmasın. */
  ok('öğrenme kutusu çizici var', /function macOgrenmeCiz\(\)\{/.test(mac));
  ok('tablo çizici var', /function macMapCiz\(\)\{/.test(mac));
  ok('dil değişince ikisi de tazeleniyor',
     /macMapCiz\(\); macOgrenmeCiz\(\);/.test(mac));

  /* Eşleme okuma tek yerden geçmeli: iki ayrı okuma yolu olsaydı biri
     süzgeçsiz kalırdı. */
  ok('eşleme tek fonksiyondan okunuyor', /function macEsleme\(\)\{/.test(mac));
  const kacYer = (mac.match(/macEsleme\(\)/g) || []).length;
  ok('eşleme okuyucusu kullanılıyor (' + kacYer + ' yer)', kacYer >= 2);
}
