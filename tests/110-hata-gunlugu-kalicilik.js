const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,esnek}=require('./kaynak');
const tel=esnek(esnek(oku(telefonYolu())));
const mac=esnek(esnek(oku(macYolu())));
const telKod=tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
const macKod=mac.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');

/* L7 — MAC HATA GÜNLÜĞÜ TELEFONDAKİ KADAR KAPSAMLI MI (ETİKET SAYISI):
   ETİKET SAYISI SORUN DEĞİLDİ — asıl fark KALICILIKTAYDI, ve iki
   platformda da ters yönde bir kusur çıktı.

   ÖLÇÜLDÜ (etiket): telefon 31, Mac 23. Aradaki etiketlerin hepsi Macte
   OLMAYAN özelliklere ait (kalıcı depo, kota, mikrofon seçici, perde
   rengi ölçme, bulanık zemin, ses testi, ölçüm, ses gözcüsü, seviye
   göstergesi, arka plan, otomatik arşivleme, tuş eşlemesi öğrenme).
   Parite kapısı bunları zaten gerekçesiyle muaf tutuyor. Yani kapsam
   farkı DEĞİL, özellik farkı.

   ASIL BULGU:
     · TELEFON son 10 hatayı localStorage a yazıyordu ve kaynakta o
       anahtarı OKUYAN TEK SATIR YOKTU — ölü yazma. Kayıt yer kaplıyor,
       kimse göremiyor.
     · MAC hiç yazmıyordu; sayfa yenilenince günlük tümüyle gidiyordu.
   Oysa günlüğün asıl işe yaradığı an tam da sayfanın çöküp yeniden
   açıldığı andır: "çekimim neden bozuldu" sorusu o zaman soruluyor ve
   cevap tam o zaman siliniyordu. İki platformda da kapatıldı. */

/* ---------- ETİKET KAPSAMI ---------- */
const etiketler=s=>[...new Set([...s.matchAll(/logErr\(\s*['"]([A-Za-z0-9_]+)['"]/g)].map(m=>m[1]))];
{
  const t=etiketler(tel), m=etiketler(mac);
  console.log('   etiket: telefon '+t.length+' · Mac '+m.length);
  ok('telefonda bol etiket var ('+t.length+')', t.length>=30);
  ok('Macte de ciddi kapsam var ('+m.length+')', m.length>=20);
  /* Fark YALNIZ Macte olmayan özelliklerden gelmeli — parite kapısındaki
     muafiyet listesiyle birebir örtüşmeli, yoksa gerçek bir boşluk vardır. */
  /* `restore:'import'` EŞLEMESİ YANLIŞTI (tests/15'te de aynısı vardı ve
     orada da düzeltildi): telefondaki `restore` UYGULAMA İÇİ otomatik
     yedekten dönmek, Mac'teki `import` DOSYADAN içe almak. Farklı
     özellikler. C.2'de Mac'e de otomatik yedek eklendi, yani `restore`
     artık iki tarafta da var ve eşlemeye gerek yok. Yeni doğru eşleme:
     telefonun `bkImport`'u ↔ Mac'in `import`'u. */
  const ESD={dbPut:'idbPut', dbDel:'idbDel', dbListe:'idbListe', dbGetir:'idbGetir', bkImport:'import'};
  const M=new Set(m);
  const eksik=t.filter(x=>!M.has(ESD[x]||x)).filter(x=>x!=='dbGuncelle');
  /* poz/wb: elle pozlama ve beyaz ayarı camLock ile aynı sınıf — masaüstü
     kameraları o yetenekleri vermiyor, kavram Mac'te YOK (tests/15'te
     gerekçesi yazılı). */
  /* pickKey ÇIKARILDI (2026-08-17): perde rengini kameradan ölçme masaüstüne
     de geldi, yani hata yolu artık iki kabukta da var. "Muafiyet listesi
     boşuna geniş değil" iddiası bunu kendiliğinden yakaladı — listenin
     var olma sebebi tam olarak bu. */
  /* 'hizli': hızlı erişim paneli TELEFONA ÖZGÜ. Masaüstünde sahnenin üstünde
     duran bir panel yok — pencere zaten geniş, ayarlar sağ panelde açık
     duruyor ve kadrajı örtmüyor. Yani eksiklik değil, kavramın karşı
     platformda bulunmaması. */
  const MUAF=new Set(['hizli','persist','quota','mics','softBg','voiceTest','measure',
                      'audmon','meter','bg','autoSave','mapIn','camLock','poz','wb']);
  const beklenmeyen=eksik.filter(x=>!MUAF.has(x));
  ok('Macte eksik her etiket gerekçeli'+(beklenmeyen.length?' — beklenmeyen: '+beklenmeyen.join(', '):'')+
     ' ('+eksik.length+' muaf)', beklenmeyen.length===0);
  ok('muafiyet listesi boşuna geniş değil (hepsi gerçekten eksik)',
     [...MUAF].every(x=>!M.has(x)));
}

/* ---------- KALICILIK: İKİ PLATFORMDA DA ---------- */
for(const [ad,k] of [['telefon',telKod],['Mac',macKod]]){
  /* İDDİA FONKSİYONA BAĞLI (2026-08-17). Eskiden dosyanın HERHANGİ bir
     yerinde yazma satırını görmek yetiyordu. Önizleme nöbetçisi için eklenen
     `logNot` da aynı satırı içeriyor; `logErr`in yazması silinince test yine
     geçti — yani gerçek bir hata yolunun kalıcılığı sessizce korumasız kaldı.
     Ölçüm artık HATA YOLUNUN kendi gövdesine bakıyor. */
  const gLogErr=(k.match(/function logErr\(where,e\)\{[\s\S]*?\n  \}/)||
                 k.match(/function logErr\(where,e\)\{[\s\S]*?\n\}/)||[])[0];
  ok(ad+': logErr gövdesi çıkarılabildi', !!gLogErr);
  ok(ad+': son hatalar diske yazılıyor',
     !!gLogErr && /localStorage\.setItem\(LS\+'_err',JSON\.stringify\(ERRLOG\.slice\(-10\)\)\)/.test(gLogErr));
  ok(ad+': açılışta geri OKUNUYOR (yazma ölü değil)',
     /localStorage\.getItem\(LS\+'_err'\)/.test(k));
  ok(ad+': geri yükleme adlı bir işlev', /function eskiHatalariGeriYukle\(\)\{/.test(k));
  ok(ad+': geri yükleme gerçekten çağrılıyor', /\n\s*eskiHatalariGeriYukle\(\);/.test(k));
  ok(ad+': geri okunanlar işaretleniyor', /eski:true/.test(k));
  ok(ad+': günlük 30 kayıtla sınırlı', /if\(ERRLOG\.length>30\) ERRLOG\.shift\(\);/.test(k));
  ok(ad+': mesaj 180 karakterle sınırlı', /\.slice\(0,180\)/.test(k));
}

/* ---------- GERÇEK GERİ YÜKLEMEYİ KOŞTUR ---------- */
function tezgah(k, saklanan){
  /* Desen fonksiyonun SONUNA kadar gitmeli: gevşek biçimi ilk `\n  }` de
     duruyor ve içerideki forEach bloğunda kesiliyordu — çıkarılan metin
     dengesiz kalıp SyntaxError veriyordu. */
  const m=k.match(/function eskiHatalariGeriYukle\(\)\{[\s\S]*?\}catch\(_\)\{\}\s*\n\s*\}/);
  if(!m) return null;
  return new Function('__s', `
    const LS='x';
    const ERRLOG=[];
    const localStorage={ getItem:(a)=>a==='x_err'?__s:null };
    ${m[0]}
    eskiHatalariGeriYukle();
    return ERRLOG;
  `)(saklanan);
}
for(const [ad,k] of [['telefon',telKod],['Mac',macKod]]){
  const kos=s=>tezgah(k,s);
  ok(ad+': geri yükleme çıkarılabildi', !!kos(null));
  if(!kos(null)) continue;
  {
    const r=kos(JSON.stringify([{t:5,where:'dbPut',msg:'depo dolu'},{t:6,where:'js',msg:'patladi'}]));
    ok(ad+': önceki oturumun hataları geri geliyor', r.length===2);
    ok(ad+': etiket korunuyor', r[0].where==='dbPut' && r[1].where==='js');
    ok(ad+': mesaj korunuyor', r[0].msg==='depo dolu');
    ok(ad+': zaman korunuyor', r[0].t===5);
    ok(ad+': hepsi eski olarak işaretli', r.every(x=>x.eski===true));
  }
  {
    ok(ad+': kayıt yoksa boş başlıyor', kos(null).length===0);
    ok(ad+': boş dizi sorun değil', kos('[]').length===0);
  }
  {
    /* BOZUK KAYIT AÇILIŞI ENGELLEMEMELİ — günlük lüks, uygulama değil. */
    ok(ad+': bozuk JSON çökertmiyor', kos('{bu json degil').length===0);
    ok(ad+': dizi olmayan kayıt yok sayılıyor', kos('{"a":1}').length===0);
    ok(ad+': etiketsiz kayıtlar atlanıyor',
       kos(JSON.stringify([{msg:'etiketsiz'},{where:'js',msg:'iyi'}])).length===1);
    ok(ad+': null öge çökertmiyor', kos(JSON.stringify([null,{where:'js',msg:'iyi'}])).length===1);
    ok(ad+': eksik alanlar tamamlanıyor',
       JSON.stringify(kos(JSON.stringify([{where:'js'}]))[0])==='{"t":0,"where":"js","msg":"","eski":true}');
  }
  {
    /* Depoda ne kadar birikirse biriksin en fazla 10 tanesi geri gelmeli. */
    const cok=Array.from({length:40},(_,i)=>({t:i,where:'js',msg:'m'+i}));
    const r=kos(JSON.stringify(cok));
    ok(ad+': en fazla 10 eski hata geri geliyor ('+r.length+')', r.length===10);
    ok(ad+': geri gelenler EN SON olanlar', r[9].msg==='m39');
  }
}

/* ---------- İKİ PLATFORM AYNI DAVRANIYOR MU ---------- */
{
  const ornekler=[null,'[]','bozuk',JSON.stringify([{t:1,where:'js',msg:'a'},{where:'bg'}])];
  for(const s of ornekler){
    const a=tezgah(telKod,s), b=tezgah(macKod,s);
    ok('aynı girdide aynı sonuç: '+JSON.stringify(String(s).slice(0,20)),
       JSON.stringify(a)===JSON.stringify(b));
  }
}

/* ---------- GÜNLÜK KULLANICIYA GÖRÜNÜYOR MU ---------- */
ok('telefonda uyumluluk panelinde okunuyor', /if\(ERRLOG\.length\)\{/.test(telKod));
ok('Macte durum çubuğunda gösteriliyor', /el\.textContent='⚠️ '\+ERRLOG\.length\+' hata'/.test(macKod));
ok('Macte hazırlık kontrolünde de anılıyor', /ERRLOG\.length\+' hata kaydedildi'/.test(macKod));
ok('telefonda kullanıcı bir kez uyarılıyor (boğulmasın)', /if\(n-errShown>8000\)\{ errShown=n;/.test(telKod));

/* ---------- YAKALANMAYAN SÖZ REDDİ: KORKUTUCU AMA ANLAMSIZ SATIR ----------
   ÖLÇÜLDÜ (2026-08-16, kapının 10. adımı — çekim akışı uçtan uca): normal bir
   çekimden sonra hata günlüğünde 'Unable to decode audio data' satırı çıkıyordu.
   Kod durumu ZATEN ele alıyordu (geri çağrıyla), ama `decodeAudioData` Chrome'da
   HEM geri çağrı HEM söz döndürüyor; dönen söz yakalanmayınca genel
   `unhandledrejection` işleyicisine düşüyor ve kullanıcının "Son hatalar"
   listesine yazılıyordu. Kullanıcı için anlamı: her çekimde bir hata görmek. */
{
  const {telefonYolu,oku,blokKes}=require('./kaynak');
  const kod=esnek(esnek(oku(telefonYolu()))).replace(/\/\*[\s\S]*?\*\//g,'');
  const govde=blokKes(kod,'async function sesKanali(') || kod;
  ok('ses çözümlemesi kaynakta bulundu', /decodeAudioData/.test(govde));
  /* İDDİA: dönen söz de yakalanıyor. Yalnız geri çağrı bağlamak yetmiyor. */
  /* Desen SATIR SONUNA takılmasın: çağrı iki satıra bölünmüş durumda.
     İddia "söz bir değişkene alınıp yakalanıyor mu", biçim değil. */
  ok('decodeAudioData sözü de yakalanıyor',
     /const soz=ctx\.decodeAudioData\(/.test(govde) && /soz && soz\.catch/.test(govde));
  ok('yakalanan söz aynı düşüşe gidiyor', /soz\.catch\(\(\)=>no\(0\)\)/.test(govde));
  /* Geri çağrı yolu da DURMALI: birini diğerinin yerine koymak, eski
     tarayıcılarda (söz döndürmeyen) çözümlemeyi sessizce askıda bırakırdı. */
  ok('geri çağrı yolu korunuyor', /ctx\.decodeAudioData\(buf\.slice\(0\),ok,\(\)=>no\(0\)\)/.test(govde));
}
