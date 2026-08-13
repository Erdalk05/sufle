const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());

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
    const $=()=>({ set innerHTML(v){}, get innerHTML(){return '';} });
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
ok('düğme showNews\'e bağlı',
   /\$\('#newsBtn'\)\.onclick\s*=\s*showNews/.test(tel));
ok('düğmenin metni iki dilde de var (data-i18n)',
   /id="newsBtn"[^>]*data-i18n="newsTitle"/.test(tel) &&
   /newsTitle:'[^']+'/.test(tel));
/* showNews yalnız otomatik açılıştan çağrılıyorsa özellik yine ulaşılamaz.
   En az iki çağrı olmalı: otomatik + elle. */
const cagriSayisi = (tel.match(/showNews\b/g) || []).length;
ok('showNews birden fazla yerden erişilebilir ('+cagriSayisi+' geçiş)', cagriSayisi >= 3);

/* ---------- KAYNAK DÜZEYİ KİLİT ----------
   Damganın setTimeout'un DIŞINA geri taşınması bu dosyadaki davranış
   testlerini kırar; yine de niyeti kaynakta da sabitliyoruz. */
const govde = firstRunSrc.replace(/\/\*[\s\S]*?\*\//g,'');
const zamanlayiciBasi = govde.indexOf('setTimeout');
ok('seenVer yazımı setTimeout bloğunun içinde',
   govde.indexOf('st.seenVer=VER') > zamanlayiciBasi);
