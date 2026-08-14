const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const mac=oku(macYolu());
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
  const ESD={dbPut:'idbPut', dbDel:'idbDel', dbListe:'idbListe', dbGetir:'idbGetir', restore:'import'};
  const M=new Set(m);
  const eksik=t.filter(x=>!M.has(ESD[x]||x)).filter(x=>x!=='dbGuncelle');
  const MUAF=new Set(['persist','quota','mics','pickKey','softBg','voiceTest','measure',
                      'audmon','meter','bg','autoSave','mapIn']);
  const beklenmeyen=eksik.filter(x=>!MUAF.has(x));
  ok('Macte eksik her etiket gerekçeli'+(beklenmeyen.length?' — beklenmeyen: '+beklenmeyen.join(', '):'')+
     ' ('+eksik.length+' muaf)', beklenmeyen.length===0);
  ok('muafiyet listesi boşuna geniş değil (hepsi gerçekten eksik)',
     [...MUAF].every(x=>!M.has(x)));
}

/* ---------- KALICILIK: İKİ PLATFORMDA DA ---------- */
for(const [ad,k] of [['telefon',telKod],['Mac',macKod]]){
  ok(ad+': son hatalar diske yazılıyor',
     /localStorage\.setItem\(LS\+'_err',JSON\.stringify\(ERRLOG\.slice\(-10\)\)\)/.test(k));
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
