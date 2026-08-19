const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
/* v9.39: bu fonksiyonların metinleri sözlüğe taşındı; tezgâh GERÇEK sözlüğü
   yükleyip t() ve yer tutucu yardımcısını sağlıyor.
   (Yorumda ters tırnak yok: şablon dizelerinin içine giriyor.) */
const {cekirdekOku:_co4}=require('./kaynak.js');
const SOZ_T=_co4('sozluk.js','SUFLE_SOZLUK').replace(/\/\*[\s\S]*?\*\//g,'')+
  "\nglobalThis.I18N=I18N; globalThis.t=(k)=>I18N[globalThis.L||'tr'][k];"+
  "\nglobalThis.srY=(m,d)=>{ for(const x in (d||{})) m=m.split('{'+x+'}').join(d[x]); return m; };";
eval(SOZ_T);
const tel=oku(telefonYolu());
const mac=oku(macYolu());

/* SÜRÜM NOTUNUN SESSİZ KAYBI
   firstRun() "görüldü" damgasını (st.seenVer=VER; save()) 1400 ms'lik
   setTimeout'tan ÖNCE basıyordu. Kullanıcı o 1,4 saniye içinde uygulamayı
   kapatır, yeniler ya da PWA'yı arka plana atarsa damga çoktan basılmış
   oluyor ve "Ne değişti" ekranı O SÜRÜM İÇİN BİR DAHA HİÇ açılmıyordu.
   Ekranın tek girişi bu olduğu için özellik tümden kayboluyordu.

   Testin ayırt edici kurgusu: setTimeout'u ÇAĞIRMADAN bırakıyoruz —
   uygulamanın 1,4 sn dolmadan kapanmasının birebir karşılığı. Damga
   basılmışsa hata oradadır. */

const firstRunSrc = cikar(tel, /function firstRun\(\)\{[\s\S]*?\n\}/, 'firstRun');

/* firstRun'ı gerçek kaynaktan koşturur.
   zamanlayiciCalissin=false → setTimeout geri çağrısı HİÇ çalışmaz. */
function kos({seenVer, zamanlayiciCalissin}){
  const izler = [];
  const st = { seenVer };
  const kur = new Function('__st','__iz','__calissin', `
    const st=__st, VER='9.1', L='tr';
    let gecikme=null;
    const save=()=>__iz.push('save');
    const openSheet=id=>__iz.push('openSheet '+id);
    const showNews=()=>__iz.push('showNews');
    /* Tur 42'de karşılama metni dil değişince tazelenebilsin diye ayrı bir
       çiziciye alındı (newsYaz). Bu test o çizimi değil, DAMGANIN ne zaman
       basıldığını sınıyor; çizim iz olarak kaydediliyor. */
    let newsKip=null;
    const newsYaz=()=>__iz.push('newsYaz '+newsKip);
    /* B.7'de firstRun karşılama EYLEM satırını da açıyor; taklit yalnız
       innerHTML sağladığı için "classList of undefined" veriyordu. Taklit
       gerçeğe uyduruldu ve dokunulan sınıflar İZ olarak kaydediliyor —
       böylece eylem satırının yalnız ilk açılışta açıldığı da sınanabiliyor. */
    const $=(sel)=>({ set innerHTML(v){}, get innerHTML(){return '';},
      classList:{ remove:c=>__iz.push('goster '+sel+'.'+c),
                  add:c=>__iz.push('gizle '+sel+'.'+c) } });
    const setTimeout=(f,ms)=>{ gecikme=ms; if(__calissin){ __iz.push('zamanlayici'); f(); } return 1; };
    ${firstRunSrc}
    firstRun();
    return gecikme;
  `);
  const gecikme = kur(st, izler, zamanlayiciCalissin);
  return { izler, st, gecikme };
}

/* ---------- ASIL HATA: gösterilmeden damga basılmamalı ---------- */
const kapandi = kos({seenVer:'9.0', zamanlayiciCalissin:false});
ok('1,4 sn dolmadan kapanınca "görüldü" damgası BASILMIYOR (eski kodda basılıyordu)',
   kapandi.st.seenVer === '9.0');
ok('kapanınca hiçbir şey kaydedilmiyor', !kapandi.izler.includes('save'));
/* B.7: karşılama eylem satırı YALNIZ gerçek ilk kurulumda açılmalı. Sürüm
   güncellemesinde açılırsa "Metnimi yapıştır" mevcut kullanıcıyı yanlış
   yönlendirir — sayfa iki amaca hizmet ediyor. */
{
  const ilk = kos({seenVer:undefined, zamanlayiciCalissin:true});
  const guncel = kos({seenVer:'9.0', zamanlayiciCalissin:true});
  ok('ilk kurulumda eylem satırı AÇILIYOR',
     ilk.izler.includes('goster #onbActions.hidden'));
  ok('sürüm güncellemesinde eylem satırı açılMIYOR',
     !guncel.izler.includes('goster #onbActions.hidden'));
}

const ilkKurulumKapandi = kos({seenVer:'', zamanlayiciCalissin:false});
ok('ilk kurulumda da kapanınca damga basılmıyor', ilkKurulumKapandi.st.seenVer === '');

/* ---------- SIRA: önce göster, sonra damgala ---------- */
const guncelleme = kos({seenVer:'9.0', zamanlayiciCalissin:true});
ok('güncellemede sürüm notu gösteriliyor', guncelleme.izler.includes('showNews'));
ok('damga gösterimden SONRA basılıyor',
   guncelleme.izler.indexOf('save') > guncelleme.izler.indexOf('showNews'));
ok('gösterildikten sonra damga basılıyor', guncelleme.st.seenVer === '9.1');

const ilkKurulum = kos({seenVer:'', zamanlayiciCalissin:true});
ok('ilk kurulumda tanıtım sayfası açılıyor (sürüm notu değil)',
   ilkKurulum.izler.includes('openSheet #newsSheet') && !ilkKurulum.izler.includes('showNews'));
ok('ilk kurulumda damga açılıştan SONRA basılıyor',
   ilkKurulum.izler.indexOf('save') > ilkKurulum.izler.indexOf('openSheet #newsSheet'));

/* ---------- AYNI SÜRÜMDE TEKRAR GÖSTERİLMEMELİ ---------- */
const ayniSurum = kos({seenVer:'9.1', zamanlayiciCalissin:true});
ok('aynı sürümde ekran bir daha açılmıyor', ayniSurum.izler.length === 0);
ok('aynı sürümde zamanlayıcı bile kurulmuyor', ayniSurum.gecikme === null);

/* ---------- GECİKME MAKUL OLMALI ----------
   0 yapılsa açılış animasyonunun üstüne biner; çok büyük yapılsa kullanıcı
   çoktan başka bir şeye dokunmuş olur ve sayfa onu keser. */
ok('gecikme 0,5-3 sn arasında ('+guncelleme.gecikme+' ms)',
   guncelleme.gecikme >= 500 && guncelleme.gecikme <= 3000);

/* ---------- DAMGA GERÇEKTEN KALICI MI ----------
   st.seenVer'i yazıp save() çağırmamak da aynı kaybı yaratır: bellekte
   görülmüş sayılır, diske yazılmaz, sonraki açılışta yine gösterilir. */
ok('damga kaydediliyor (save çağrılıyor)', guncelleme.izler.includes('save'));

/* ---------- ELLE GİRİŞ ----------
   Sürüm notlarının tek girişi güncellemeden sonra kendiliğinden açılan
   sayfaydı. Kapatan ya da o anı kaçıran kullanıcı bir daha ulaşamıyordu:
   ekran kodda duruyor ama pratikte yok. Deponun "ulaşılamayan özellik =
   olmayan özellik" sınıfı. */
ok('ayarlarda "Ne değişti" düğmesi var', /id="newsBtn"/.test(tel));
/* Desen BİÇİME değil AMACA bağlı. Eskiden `onclick = showNews` birebir
   aranıyordu; B.7'de araya meşru bir sarmalayıcı girdi (karşılama eylem
   satırını önce gizlemesi gerekiyor) ve test kırıldı — oysa kullanıcı için
   hiçbir şey değişmemişti, düğme yine sürüm notunu açıyor. İddia: düğme bir
   işleyiciye bağlı VE o işleyici showNews çağırıyor. */
{
  const bag = tel.match(/\$\('#newsBtn'\)\.onclick\s*=\s*([A-Za-z_$][\w$]*)\s*;/);
  ok('newsBtn bir işleyiciye bağlı', !!bag);
  const govde = bag && tel.match(new RegExp('function ' + bag[1] + '\\(\\)\\{[^}]*\\}'));
  ok('düğme showNews\'e bağlı (doğrudan ya da sarmalayıcıyla)',
     !!bag && (bag[1] === 'showNews' || (!!govde && /showNews\(\)/.test(govde[0]))));
}
ok('düğmenin metni iki dilde de var (data-i18n)',
   /id="newsBtn"[^>]*data-i18n="newsTitle"/.test(tel) &&
   /newsTitle:'[^']+'/.test(tel));
/* showNews yalnız otomatik açılıştan çağrılıyorsa özellik yine ulaşılamaz.
   En az iki çağrı olmalı: otomatik + elle. */
const cagriSayisi = (tel.match(/showNews\b/g) || []).length;
ok('showNews birden fazla yerden erişilebilir ('+cagriSayisi+' geçiş)', cagriSayisi >= 3);

/* ---------- MAC: AYNI HATA KOPYALANMASIN ----------
   Mac'e 2026-08-13'te taşındı ve DÜZELTİLMİŞ hâli taşındı. Telefondaki
   damga sırası hatası oraya da gitseydi aynı sessiz kayıp Mac'te de olurdu.
   Mac tek dilli ve sayfa altyapısı yok; alert/toast deyimini kullanıyor. */
const macFirstRun = cikar(mac, /function firstRun\(\)\{[\s\S]*?\n  \}/, 'Mac firstRun');
function macKos({seenVer, zamanlayiciCalissin, ilkKurulum=!seenVer}){
  const izler = [];
  const state = { seenVer };
  const kur = new Function('__st','__iz','__calissin','__ilk', `
    const state=__st, VER='9.1', ilkKurulum=__ilk;
    let gecikme=null;
    const save=()=>__iz.push('save');
    /* Mac artık engelleyici alert kullanmıyor; hoş geldin ekranı da
       sayfayı durdurmayan panelden geçiyor. Tezgâh ikisini de tanımalı. */
    const alert=()=>__iz.push('alert');
    const bilgiGoster=()=>__iz.push('bilgiGoster');
    /* Karşılama Tur 42'de anahtarla açılmaya başladı (dil değişince
   tazelenebilsin diye). İDDİA AYNI KALIYOR: kullanıcı tanıtımı GÖRÜYOR mu.
   İz adı ortak tutuluyor ki iddia biçime değil davranışa baksın. */
    const bilgiGosterK=(b,m)=>__iz.push('bilgiGoster');
    const toast=()=>__iz.push('toast');
    const showNews=()=>__iz.push('showNews');
    const setTimeout=(f,ms)=>{ gecikme=ms; if(__calissin){ f(); } return 1; };
    ${macFirstRun}
    firstRun();
    return gecikme;
  `);
  const gecikme = kur(state, izler, zamanlayiciCalissin, ilkKurulum);
  return { izler, state, gecikme };
}

/* MEVCUT KULLANICI YÜKSELTİYOR — bu oturumda benim eklediğim gerileme.
   seenVer alanı Mac'e 2026-08-13'te eklendi; eski kullanıcıların kaydında
   yok ve DEFAULT'tan '' geliyor. Ölçüt `!state.seenVer` olsaydı her eski
   kullanıcı "yeni" sayılıp sürüm notu yerine hoş geldin ekranı görürdü.
   Doğru ölçüt: localStorage'da kayıt VAR MI. */
/* Mac'te güncelleme bildirimi bilerek TOAST: alert kullanıcıyı bloklar,
   Mac'te sayfa altyapısı yok. Tam notlar sürüm düğmesinden açılıyor.
   Ölçülen şey: eski kullanıcı HOŞ GELDİN alert'i GÖRMÜYOR. */
const macEskiKullanici = macKos({seenVer:'', zamanlayiciCalissin:true, ilkKurulum:false});
ok('Mac: kaydı olan eski kullanıcı hoş geldin ekranı GÖRMÜYOR',
   !macEskiKullanici.izler.includes('alert'));
ok('Mac: eski kullanıcı güncellemeden haberdar ediliyor',
   macEskiKullanici.izler.includes('toast'));
ok('Mac: eski kullanıcıda da damga en sonda basılıyor',
   macEskiKullanici.izler.indexOf('save') === macEskiKullanici.izler.length - 1);

const macGercektenYeni = macKos({seenVer:'', zamanlayiciCalissin:true, ilkKurulum:true});
ok('Mac: hiç kaydı olmayan gerçek yeni kullanıcı HOŞ GELDİN görüyor',
   /* İDDİA: hoş geldin GÖSTERİLİYOR ve sürüm notu gösterilmiyor. Hangi
      yolla gösterildiği (alert mi kendi panelimiz mi) iddianın parçası
      değil — engelleyici alert kalktığında bu desen boşuna kırılmıştı. */
   (macGercektenYeni.izler.includes('bilgiGoster')||macGercektenYeni.izler.includes('alert'))
   && !macGercektenYeni.izler.includes('showNews'));

/* Kaynak düzeyi: ölçüt artık olmayan bir alandan türetilmiyor. */
ok('Mac: ilk kurulum sinyali kayıtlı verinin varlığından geliyor',
   /ilkKurulum=!ham;/.test(mac) && /const ilk=ilkKurulum;/.test(mac));
ok('Mac: ilk kurulum artık seenVer\'den türetilmiyor',
   !/const ilk=!state\.seenVer;/.test(mac));

const macKapandi = macKos({seenVer:'9.0', zamanlayiciCalissin:false});
ok('Mac: 1,4 sn dolmadan kapanınca damga BASILMIYOR', macKapandi.state.seenVer === '9.0');
ok('Mac: kapanınca kaydetme yok', !macKapandi.izler.includes('save'));

const macGuncelleme = macKos({seenVer:'9.0', zamanlayiciCalissin:true});
ok('Mac: güncellemede kullanıcı bilgilendiriliyor',
   macGuncelleme.izler.includes('toast') || macGuncelleme.izler.includes('alert'));
ok('Mac: damga bilgilendirmeden SONRA basılıyor',
   macGuncelleme.izler.indexOf('save') === macGuncelleme.izler.length - 1);
ok('Mac: gösterildikten sonra damga basılıyor', macGuncelleme.state.seenVer === '9.1');

const macIlk = macKos({seenVer:'', zamanlayiciCalissin:true});
ok('Mac: ilk kurulumda tanıtım gösteriliyor', (macIlk.izler.includes('bilgiGoster')||macIlk.izler.includes('alert')));
ok('Mac: ilk kurulumda damga en sonda basılıyor',
   macIlk.izler.indexOf('save') === macIlk.izler.length - 1);

const macAyni = macKos({seenVer:'9.1', zamanlayiciCalissin:true});
ok('Mac: aynı sürümde hiçbir şey yapılmıyor', macAyni.izler.length === 0 && macAyni.gecikme === null);

/* ---------- KAYNAK DÜZEYİ KİLİT ----------
   Damganın setTimeout'un DIŞINA geri taşınması bu dosyadaki davranış
   testlerini kırar; yine de niyeti kaynakta da sabitliyoruz. */
const govde = firstRunSrc.replace(/\/\*[\s\S]*?\*\//g,'');
const zamanlayiciBasi = govde.indexOf('setTimeout');
ok('seenVer yazımı setTimeout bloğunun içinde',
   govde.indexOf('st.seenVer=VER') > zamanlayiciBasi);

/* ---------- KARŞILAMA METNİ İKİ DİLDE VE DİLLE TAZELENİYOR (Tur 42) ----------
   ÖLÇÜLDÜ: sayfa açıkken dil değiştiren kullanıcı ESKİ DİLDE okumaya devam
   ediyordu — metin iki dilde yazılıydı ama çizim bir kez yapılıyordu. Çizim
   ayrı bir fonksiyona alındı; burası hem içeriği hem tazelemeyi kilitliyor. */
{
  const govde = cikar(tel, /function onbGovde\(\)\{[\s\S]*?\n\}/, 'onbGovde');
  /* v9.39: metin sözlüğe taşındı; sözlük dili genel kapsamdan okunuyor. */
  const yap = (dil) => { globalThis.L=dil; return new Function('L', govde + '\n return onbGovde();')(dil); };
  const tr = yap('tr'), en = yap('en');
  ok('karşılama metni Türkçe üretiliyor', /Üç adımda başla/.test(tr));
  ok('karşılama metni İngilizce üretiliyor', /Three steps/.test(en));
  /* İki dil GERÇEKTEN farklı olmalı: aynı dönerse çeviri yok demektir. */
  ok('iki dil birbirinden farklı', tr !== en && !/Üç adımda/.test(en));
  /* Üç adımın üçü de duruyor mu — karşılamanın tek işi bu. */
  for (const n of ['1️⃣', '2️⃣', '3️⃣']) {
    ok('Türkçe karşılamada ' + n + ' adımı var', tr.includes(n));
    ok('İngilizce karşılamada ' + n + ' adımı var', en.includes(n));
  }
  /* Dil değişince yeniden çizilmeli — yoksa metin doğru ama ekran yanlış. */
  ok('applyLang karşılama sayfasını yeniden çiziyor',
     /\n  newsYaz\(\);/.test(tel));
}
