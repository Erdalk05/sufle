const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const TDIR=__dirname;
const dosyalar=fs.readdirSync(TDIR).filter(f=>/^\d{2,}-.*\.js$/.test(f)).sort();

/* M6 — TEST DOSYALARININ KENDİ KALİTESİ: ADA BAĞLI DESENLERİ TARA.
   Bu gece kapı BEŞ kez boşuna kırmızıya döndü; hepsi kodun BİÇİMİNE
   kilitlenmiş desenlerdi (CLAUDE.md tablosu). Tarayıcı için üç ölçüt
   denedim, ikisi ÇÜRÜDÜ:

     1) "80 karakterden uzun desen"  -> 113 dosyada 90 işaret. Kurt masalı.
     2) "birden çok deyim zincirleyen desen" (>=2 noktalı virgül)
        -> 50 dosyada 121 işaret; çoğu MEŞRU, çünkü orada bitişikliğin
        kendisi iddianın ta kendisi ("Blob devralır almaz dizi boşalıyor").
     3) "ÜRÜN KODUNDAKİ DİZE BİRLEŞTİRMESİNİ kilitleyen desen"
        -> 12 dosyada 16 işaret. KESKİN ve CLAUDE.md deki beş vakanın
        şekliyle birebir örtüşüyor.

   Üçüncüsü ikiye ayrılıyor ve ayrım CLAUDE.md deki kuralın kendisi:
   kullanıcının GÖRDÜĞÜ metni kilitlemek meşru, iç işaretleme birleştirmesini
   kilitlemek değil. Dört riskli olan iddiaya bağlandı (32, 48, 50, 52) ve
   dördünün de gerçek gerilemeyi hâlâ yakaladığı bozmayla kanıtlandı.

   Bu test taramayı sürekli kılıyor: yeni bir işaretleme-birleştirme kilidi
   eklenirse kapı söylüyor. */

/* ---------- TARAYICI ---------- */
function desenler(kaynak){
  const out=[]; const re=/\/(?:\\.|\[[^\]]*\]|[^\/\n\\])+\/[gimsuy]*/g; let m;
  while((m=re.exec(kaynak))) if(m[0].length>=25) out.push(m[0]);
  return out;
}
/* Ürün kodundaki DİZE birleştirmesini kilitleyen desen: TIRNAK, hemen
   ardından kaçırılmış artı, hemen ardından bir ÇAĞRI.
   Tırnak şartı olmadan `pos+eyeOff()` gibi SAYISAL toplamalar da
   yakalanıyordu — ilk ölçümümde iki yanlış pozitif çıktı (63 ve 74). */
const birlestirmeKilidi=d=>/['"]\\\+[a-zA-Z_$]+\\\(|\\\+[a-zA-Z_$]+\\\(\)\\\+['"]/.test(d);
/* MEŞRU İSTİSNA: kullanıcının EKRANDA GÖRDÜĞÜ cümleyi kilitleyenler.
   Ayırt edici işaret, desende gerçek bir insan cümlesinin bulunması —
   büyük harfli Türkçe/İngilizce sözcük öbeği ya da dosya adı kalıbı. */
const GORUNUR_METIN=[
  /SANİYEDE/, /STOPPED AT/, /yayin-notu_/, /dilAdi/, /^\/SES /, /^\/GÖRÜNTÜ /,
];
const gorunurMu=d=>GORUNUR_METIN.some(re=>re.test(d));

const bulgular=[];
for(const f of dosyalar){
  const s=fs.readFileSync(path.join(TDIR,f),'utf8');
  for(const d of desenler(s))
    if(birlestirmeKilidi(d) && !gorunurMu(d)) bulgular.push({f, d:d.slice(0,80)});
}
console.log('   birleştirme kilidi (görünür metin hariç): '+bulgular.length);
bulgular.slice(0,8).forEach(b=>console.log('     '+b.f+'  '+b.d));

/* Aracın kendisi ölçüyor mu: tek bir dosyaya bakmak yanıltıcı (ilk dosyada
   hiç uzun desen olmayabilir — ölçtüm, yoktu). Depo genelinde bak. */
{
  let toplam=0;
  for(const f of dosyalar) toplam+=desenler(fs.readFileSync(path.join(TDIR,f),'utf8')).length;
  console.log('   taranan desen: '+toplam+' ('+dosyalar.length+' dosya)');
  ok('tarayıcı desen bulabiliyor ('+toplam+')', toplam>200);
}
ok('birleştirme kilidi ölçütü çalışıyor (araç doğrulaması)',
   birlestirmeKilidi("/'<span>'\\+biyonik\\(m\\)/") && !birlestirmeKilidi('/basit desen burada/'));
ok('görünür metin istisnası çalışıyor',
   gorunurMu("/SES '\\+clock\\(x\\)\\+' SANİYEDE KESİLDİ/") && !gorunurMu("/'<div>'\\+esc\\(r\\)/"));

/* ASIL İDDİA: iç işaretleme birleştirmesini kilitleyen desen KALMADI. */
ok('işaretleme birleştirmesi kilitleyen desen yok'+
   (bulgular.length?' — '+bulgular.map(b=>b.f).join(', '):''),
   bulgular.length===0);

/* ---------- BU GECE DÜZELTİLEN DÖRDÜ GERİ GELMESİN ---------- */
{
  const oku=f=>fs.readFileSync(path.join(TDIR,f),'utf8');
  ok('48: işaretleme motoru iddiaya bağlı',
     !/'<span class="w">'\\\+biyonik/.test(oku('48-mac-isaretleme.js')));
  ok('50: öneri gösterimi iddiaya bağlı',
     !/'<div class="s">'\\\+esc/.test(oku('50-uyumluluk-paneli.js')));
  ok('32: not düğmesi adı iddiaya bağlı (öznitelik sırası serbest)',
     /data-a="note"\[\^\\n\]\{0,80\}aria-label/.test(oku('32-cekim-notu.js')));
  ok('52: izin mesajı iddiaya bağlı (üçüncü parça eklenebilir)',
     /toast\\\(\[\^\\n\]\*m\\\('camDenied'\\\)/.test(oku('52-izin-kurtarma-yolu.js')));
}

/* ---------- BİLİNEN KUSURU KİLİTLEYEN TEST VAR MI ---------- */
{
  /* tests/34 bir kez tam bunu yapmıştı: "bilinen sınır" diye KUSURU
     kilitlemiş, sınır kalkınca düzeltmeyi engellemişti. */
  const supheli=[];
  for(const f of dosyalar){
    const s=fs.readFileSync(path.join(TDIR,f),'utf8');
    /* Yalnız İDDİA satırlarında ara: yorumda "bilinen sınır" yazmak
       tarihi anlatmaktır, kusuru kilitlemek değil. */
    for(const satir of s.split('\n')){
      if(!/^\s*ok\(/.test(satir)) continue;
      if(/bilinen sınır|kabul edilmiş kusur|şimdilik böyle/i.test(satir)) supheli.push(f);
    }
  }
  ok('hiçbir İDDİA bilinen kusuru kilitlemiyor'+(supheli.length?' — '+[...new Set(supheli)].join(', '):''),
     supheli.length===0);
}

/* ---------- BOZMA TEZGÂHININ KENDİSİ ÖLÇÜYOR MU ---------- */
{
  /* Bu gece üç bozma "yakalanmadı" göründü; oysa bozma dosyaları hiç
     yazılmamıştı ve tezgâh sessizce DEPODAKİ gerçek dosyaya düşmüştü.
     Açıkça verilen yol yanlışsa artık hata veriyor. */
  /* Tezgâh da bozulabilir bir kaynak: env desteği olmadan bozma turu
     bu iddiaya hiç ulaşamazdı. */
  const k=(()=>{ const v=process.env.SUFLE_TEZGAH;
    if(v && !fs.existsSync(v)) throw new Error('Verilen yol yok: '+v);
    return fs.readFileSync(v || path.join(TDIR,'kaynak.js'),'utf8'); })();
  ok('verilen yol yoksa hata veriliyor (sessizce depoya düşmüyor)',
     /if \(acikYol && !fs\.existsSync\(acikYol\)\)/.test(k));
  ok('telefon yolu bu korumadan geçiyor', /'telefon index\.html', process\.env\.SUFLE_TELEFON\)/.test(k));
  ok('Mac yolu da geçiyor', /'Mac Teleprompter Pro\.html', process\.env\.SUFLE_MAC\)/.test(k));
  ok('sebep açıkça yazılıyor', /bozma turu HİÇBİR ŞEY ölçmez/.test(k));
  /* Gerçekten fırlatıyor mu — koşturarak. */
  let firlatti=false;
  const eski=process.env.SUFLE_TELEFON;
  process.env.SUFLE_TELEFON='/yok/boyle/bir/dosya.html';
  try{ delete require.cache[require.resolve('./kaynak')];
       require('./kaynak').telefonYolu(); }
  catch(e){ firlatti=/Verilen yol yok/.test(e.message); }
  if(eski===undefined) delete process.env.SUFLE_TELEFON; else process.env.SUFLE_TELEFON=eski;
  delete require.cache[require.resolve('./kaynak')];
  ok('yanlış yol gerçekten hata fırlatıyor', firlatti);
  ok('doğru yolda hâlâ çalışıyor', typeof require('./kaynak').telefonYolu()==='string');
}

/* ---------- HER TEST GERÇEKTEN KIRMIZI VEREBİLİYOR MU ----------
   ÖLÇÜLDÜ (2026-08-16): `tests/01` içindeki `ok` yardımcısı yalnız YAZDIRIYOR,
   çıkış kodunu ayarlamıyordu. Yani o dosya kurulduğundan beri kapıyı hiç
   kırmızıya çeviremiyor, iddiaları "✗ HATA" diye bassa bile koşturucu geçti
   sayıyordu — kasıtlı bozma turunda iki bozma bu yüzden "yakalanmadı" dedi.
   Kapının en sessiz kusuru budur: ölçen ama SONUCU BİLDİRMEYEN test. */
{
  const testDizin=__dirname;
  const kotu=[];
  for(const f of fs.readdirSync(testDizin).filter(a=>/^\d+.*\.js$/.test(a))){
    const metin=fs.readFileSync(path.join(testDizin,f),'utf8');
    /* Ölçüt DAVRANIŞ: dosya bir başarısızlıkta süreç çıkış kodunu
       değiştirebilmeli. İki meşru yol var: `process.exitCode` ya da
       `process.exit(...)`. */
    if(!/process\.exitCode/.test(metin) && !/process\.exit\(/.test(metin)) kotu.push(f);
  }
  ok('her test dosyası çıkış kodunu ayarlayabiliyor'+(kotu.length?' — '+kotu.join(', '):''),
     kotu.length===0);
  /* Denetimin kendisi sınanıyor (bu iddiayı bozma turuyla kanıtlamak mümkün
     değil: `tests/114` KAYNAK tablosunda yok, kendini bozduramaz). */
  const tara=(metin)=>!/process\.exitCode/.test(metin) && !/process\.exit\(/.test(metin);
  ok('denetim: sessiz testi yakalıyor', tara("const ok=(n,c)=>console.log(n);")===true);
  ok('denetim: exitCode ayarlayanı geçiriyor',
     tara("const ok=(n,c)=>{ if(!c) process."+"exitCode=1; };")===false);
}
