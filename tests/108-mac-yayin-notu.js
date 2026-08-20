const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku, macMetni,esnek}=require('./kaynak');
const tel=esnek(esnek(oku(telefonYolu())));
const mac=esnek(esnek(macMetni()));
const macKod=mac.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');

/* L1 — MACE YAYIN PAKETİ TAŞINSIN MI (KARAR + MALİYET):
   KISMEN — yayın notu taşındı, ZIP KASTEN TAŞINMADI.

   ÖLÇÜLDÜ, paketin dört parçası masaüstünde nerede duruyor:
     video     -> ZATEN VAR (⬇︎ İndir)
     altyazı   -> ZATEN VAR (💬 Altyazı)
     senaryo   -> ZATEN VAR (metin kullanıcının kendi dosyası)
     yayın notu-> YOKTU     <- tek gerçek boşluk

   MALİYET ÖLÇÜMÜ (telefondaki satır sayıları):
     zipYap 28 + crc32 16 + crc32Akis 10 = 54 satır İKİLİ BİÇİM kodu
     yayinNotu 60 + duzMetin 10          = 70 satır DÜZ METİN kodu

   KARAR: masaüstünde dosya sistemi zaten var ve iki dosya ayrı ayrı
   iniyor; tek dosyaya paketlemenin kazancı, ince bir ikili biçimi iki
   yerde tutmanın riskini karşılamıyor (bu depoda kopya sürüklenmesi
   bilinen bir hata sınıfı). Telefonda durum tersiydi: iOS çok dosyayı
   zor taşıyor, orada zip gerçek bir ihtiyaç.

   Bu test taşınan kısmın İKİ PLATFORMDA AYNI çıktıyı ürettiğini
   kilitliyor — yoksa iki ayrı not biçimi doğar ve zamanla ayrışır. */

/* ---------- KARARIN KENDİSİ ---------- */
ok('Macte yayın notu var', /function yayinNotu\(\)\{/.test(macKod));
ok('Macte düz metin ayıklama var', /function duzMetin\(t\)\{/.test(macKod));
ok('Macte not indirilebiliyor', /function downloadNote\(\)\{/.test(macKod));
/* Desen BİÇİME değil İDDİAYA bağlı. Eskiden markup birebir kilitliydi
   (`<button class="btn" id="rrNote">📝 Yayın notu</button>`) ve A.2b'de
   `data-i18n` özniteliği eklenince kırıldı — oysa kullanıcı için HİÇBİR ŞEY
   değişmemişti, düğme aynı yerde aynı yazıyla duruyordu. CLAUDE.md'nin
   ölçülmüş kuralı: desen bozulunca kullanıcı için ne değişiyor? Cevap
   "hiçbir şey" ise desen yanlış yere bakıyor. İddia şu: rrNote diye bir
   DÜĞME var ve üstünde "Yayın notu" YAZIYOR. */
{
  const dugme = mac.match(/<button\b[^>]*\bid="rrNote"[^>]*>([\s\S]*?)<\/button>/);
  ok('Macte notun düğmesi var', !!dugme);
  ok('düğmenin üstünde "Yayın notu" yazıyor', !!dugme && /Yayın notu/.test(dugme[1]));
}
ok('düğme bağlı', /\$\('#rrNote'\)\.onclick=downloadNote;/.test(macKod));
/* ZIP kasten yok — karar kodda da görünür olmalı ki sonradan "unutulmuş"
   sanılıp taşınmasın. */
ok('Mace zip TAŞINMADI (karar)', !/function zipYap/.test(macKod));
ok('Mace crc kodu taşınmadı', !/function crc32/.test(macKod));
ok('kararın gerekçesi kodda yazılı', /ZIP KASTEN TAŞINMADI/.test(mac));
ok('video zaten indirilebiliyordu', /function downloadRec\(\)/.test(macKod));
ok('altyazı zaten indirilebiliyordu', /function downloadSrt\(\)/.test(macKod));

/* ---------- İKİ PLATFORM AYNI NOTU ÜRETİYOR MU ---------- */
const mTel=tel.replace(/\/\*[\s\S]*?\*\//g,'').match(/function yayinNotu\(\)\{[\s\S]*?\n\}/);
const mMac=macKod.match(/function yayinNotu\(\)\{[\s\S]*?\n  \}/);
const dTel=tel.replace(/\/\*[\s\S]*?\*\//g,'').match(/function duzMetin\(t\)\{[\s\S]*?\n\}/);
/* Tur 46: bu araç ortak çekirdeğe taşındı, iki kabuk da AYNI bloğu
   gömüyor — Mac kopyasının 2 boşluklu girintisi kalmadı. Parite iddiası
   duruyor: biri çekirdekten koparılırsa metinler yine ayrışır. */
const dMac=macKod.match(/function duzMetin\(t\)\{[\s\S]*?\n\}/);
ok('telefon notu çıkarılabildi', !!mTel);
ok('Mac notu çıkarılabildi', !!mMac);
ok('telefon duzMetin çıkarılabildi', !!dTel);
ok('Mac duzMetin çıkarılabildi', !!dMac);
if(!mTel||!mMac||!dTel||!dMac) return;

function telNot(metin, sn){
  return new Function('__m','__s', `
    /* Bu simülasyon TAZE çekimi ölçüyor: arşivden açılmış bir kayıt yok.
       (2026-08-17'de eklendi — kaynak sırası genişledi: arşiv kaydı →
       çekim damgası → açık senaryo.) */
    const arsivKaynak=null;
    const L='tr'; const lastDur=__s; const lastPath=null;
    const cekimSenaryo={title:'T', text:__m, surum2:false, ikiSurumlu:false, dil:''};
    const active=()=>cekimSenaryo;
    const clock=s=>{const m=Math.floor(s/60),k=s%60;return String(m).padStart(2,'0')+':'+String(k).padStart(2,'0');};
    const dilAdi=k=>k;
    ${dTel[0]}
    ${mTel[0]}
    return yayinNotu();
  `)(metin, sn);
}
function macNot(metin, sn){
  return new Function('__m','__s', `
    /* Bu simülasyon TAZE çekimi ölçüyor: arşivden açılmış bir kayıt yok.
       (2026-08-17'de eklendi — kaynak sırası genişledi: arşiv kaydı →
       çekim damgası → açık senaryo.) */
    const arsivKaynak=null;
    const curScript=()=>({title:'T', text:__m});
    const recStart=0, recStop=__s*1000;
    const fmtTime=s=>{const m=Math.floor(s/60),k=Math.round(s%60);return String(m).padStart(2,'0')+':'+String(k).padStart(2,'0');};
    ${dMac[0]}
    ${mMac[0]}
    return yayinNotu();
  `)(metin, sn);
}
/* Zaman damgası satırı iki koşumda farklı olabilir; onu ayıklayıp
   karşılaştırıyoruz. Denklik kuralı: not, tarih satırı DIŞINDA birebir
   aynı olmalı. */
const tarihsiz=t=>t.split('\n').filter((l,i)=>i!==1).join('\n');

const ORNEKLER=[
  ['başlıklı metin', '# Robotik Nedir\nMerhaba arkadaslar. Bugun robotlardan konusacagiz.\n## Kapanis Sozu\nGorusmek uzere.'],
  ['başlıksız metin', 'Duz bir metin. Ikinci cumle. Ucuncu cumle.'],
  ['işaretli metin', '# Baslik\nBu *cok* onemli {telaffuz} bir [not] konu / ve (2) devami.'],
  ['boş metin', ''],
  ['yalnız başlık', '# Tek Baslik'],
  ['uzun metin', '# Nasil Basaririz\n'+('Bir cumle daha. '.repeat(40))],
  /* DURAK SÖZCÜĞÜ LİSTESİ de iki platformda aynı olmalı. İlk yazışımda
     örneklerimin hiçbiri o sözcükleri içermiyordu; listeyi Macte kısaltan
     kasıtlı bozma bu yüzden kaçtı. Başlıklar artık listenin ayırt edici
     sözcüklerini taşıyor. */
  ['durak sözcüklü başlıklar',
   '# Sonra Once Kadar Hakkinda Uzerine Basari\n## Gibi Birkac Cokca Azami Sonuc\nBir cumle.'],
  ['İngilizce durak sözcükleri',
   '# What Which About With From That Success\n## These Those Your Result\nA sentence.'],
];
for(const [ad,metin] of ORNEKLER){
  const a=tarihsiz(telNot(metin,125)), b=tarihsiz(macNot(metin,125));
  ok(ad+': iki platform BİREBİR aynı notu üretiyor', a===b);
}
{
  /* Süre ve tempo da aynı hesaplanmalı — kaynakları farklı (lastDur vs
     recStop-recStart), sonuç aynı olmalı. */
  for(const sn of [1, 42, 125, 600]){
    const a=tarihsiz(telNot('# B\nBir iki uc dort bes alti yedi sekiz.',sn));
    const b=tarihsiz(macNot('# B\nBir iki uc dort bes alti yedi sekiz.',sn));
    ok('süre '+sn+' sn: iki platform aynı', a===b);
  }
}

/* ---------- NOTUN İÇERİĞİ DOĞRU MU ---------- */
{
  const n=macNot('# Robotik Nedir\nMerhaba arkadaslar. Bugun robotlardan konusacagiz.\n## Kapanis Sozu\nGorusmek uzere.',125);
  ok('başlık adayları listeleniyor', /1\) Robotik Nedir/.test(n) && /2\) Kapanis Sozu/.test(n));
  ok('açıklama taslağı ilk cümlelerden', /Merhaba arkadaslar\./.test(n));
  ok('etiketler başlıklardan üretiliyor', /#robotik/.test(n));
  ok('bağlaç ve soru sözcükleri etiket olmuyor', !/#nedir/.test(n));
  ok('süre ve tempo yazılıyor', /Süre: 02:05/.test(n) && /wpm/.test(n));
  ok('yapay zekâ kullanılmadığı yazıyor', /yapay zekâ kullanılmadı/.test(n));
}
{
  const n=macNot('',125);
  ok('boş metinde çökmüyor', typeof n==='string' && n.length>0);
  ok('boş metinde başlık yok deniyor', /senaryoda # başlık yok/.test(n));
  ok('boş metinde metin boş deniyor', /\(metin boş\)/.test(n));
  ok('boş metinde etiket üretilemedi deniyor', /etiket üretilemedi/.test(n));
}
{
  /* İşaretleme çıktıya SIZMAMALI: kullanıcı notu olduğu gibi yapıştırıyor.
     KÖŞELİ PARANTEZ İSTİSNA ve bu KASITLI: yalnız TEK BAŞINA SATIR olan
     `[yönerge]` siliniyor, cümlenin içindeki `[not]` metnin parçası sayılıp
     korunuyor. İlk yazışımda "hepsi silinmeli" diye ölçtüm ve test yanlış
     kırmızı verdi — kural doğruydu, iddiam yanlıştı. Kuralın iki yanı da
     burada kilitli. */
  const n=macNot('# Baslik\nBu *cok* onemli {telaffuz} bir konu / ve (2) devami.',60);
  const aciklama=n.split('AÇIKLAMA')[1];
  for(const iz of ['*','{','(2)',' / '])
    ok('işaretleme nota sızmıyor: '+JSON.stringify(iz), !aciklama.includes(iz));
  const y=macNot('# Baslik\nBirinci cumle.\n[kameraya bak]\nIkinci cumle.',60);
  ok('tek başına satır olan yönerge siliniyor', !y.split('AÇIKLAMA')[1].includes('kameraya bak'));
  const i=macNot('# Baslik\nBu bir [not] konu.',60);
  ok('cümle içindeki köşeli parantez KORUNUYOR (kasıtlı)', i.split('AÇIKLAMA')[1].includes('[not]'));
  /* Telefon da aynı davranmalı — parite. */
  ok('köşeli parantez kuralı iki platformda aynı',
     telNot('# Baslik\nBu bir [not] konu.',60).split('AÇIKLAMA')[1].includes('[not]'));
}

/* ---------- İNDİRME YOLU ---------- */
ok('not düz metin olarak iniyor', /new Blob\(\[yayinNotu\(\)\],\{type:'text\/plain;charset=utf-8'\}\)/.test(macKod));
ok('dosya adı zaman damgalı', /a\.download='yayin-notu_'\+stamp\(\)\+'\.txt'/.test(macKod));
ok('adres bırakılıyor (sızıntı yok)', /setTimeout\(\(\)=>URL\.revokeObjectURL\(u\),4000\);[\s\S]{0,60}Yayın notu indirildi/.test(macKod));
ok('kullanıcıya bildiriliyor', /toast\('📝 Yayın notu indirildi'\)/.test(macKod));
