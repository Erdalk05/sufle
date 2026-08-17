const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku} = require('./kaynak.js');

/* İKİ KUSUR, TEK KAYNAK: "yapıldı sayılan ama yarım kalmış düzeltme"
   (2026-08-17 akşamı, uygulama gerçek tarayıcıda açılarak bulundu)

   1) KARŞILAMA EKRANININ BAŞLIĞI "🆕 Ne değişti?" idi.
      Aynı sayfa iki amaca hizmet ediyor: ilk açılışta karşılama, sonraki
      sürümlerde sürüm notu. Kod bunun riskini BİLİYORDU — kaynakta şu yorum
      duruyordu: "Aynı sayfayı iki amaç için kullanmanın bedeli bu — gizlemeyi
      unutmak sessiz kusur olurdu" — ve DÜĞMELER iki kip için ayrılmıştı.
      Başlık ayrılmamıştı. Sonuç: uygulamayı ilk kez açan kullanıcı, gövdesinde
      "Üç adımda başla" yazan bir sayfayı NEW rozetli "Ne değişti?" başlığıyla
      görüyordu. Hiç kullanmadığı bir üründe neyin değiştiği sorusu anlamsız.
      Karşılama anahtarı (mDlgWelcome) sözlükte zaten vardı, kullanılmıyordu.

   2) SES TESTİNİN SEÇTİĞİ KAYIT BİÇİMİ HİÇBİR YERDE GÖRÜNMÜYORDU.
      Seçim yalnız st.forceMime içinde yaşıyor; kullanıcı ne seçildiğini
      göremiyor ve yanlış bir turda seçilmişse bırakamıyordu. Görünmeyen
      kalıcı durum, bu deponun "sessiz ayar" sınıfı. (Biçimin KAYITTA
      kullanılması ayrı bir kusurdu ve tests/87de kilitlendi.) */

const tel = oku(telefonYolu());
const kod = tel.replace(/\/\*[\s\S]*?\*\//g, '');

/* ---------- 1. KARŞILAMA BAŞLIĞI ---------- */
ok('başlık ögesinin adı var (kipe göre yazılabilsin)',
   /<h2><span id="newsTitle" data-i18n="newsTitle">/.test(tel));

const mBaslik = kod.match(/function newsBaslikYaz\(\)\{[\s\S]*?\n\}/);
ok('newsBaslikYaz çıkarılabildi', !!mBaslik);

/* Mantık KOPYALANMIYOR: gerçek kaynaktan çıkarılıp koşturuluyor. */
function baslikKos(kip){
  return new Function('__kip', `
    const newsKip=__kip;
    const yazilan={};
    const $=()=>({ set textContent(v){ yazilan.t=v; }, get textContent(){ return yazilan.t; } });
    const t=k=>({ mDlgWelcome:'Sufleye hoş geldin', newsTitle:'🆕 Ne değişti?' })[k]||k;
    ${mBaslik ? mBaslik[0] : ''}
    newsBaslikYaz();
    return yazilan.t;
  `)(kip);
}
if(mBaslik){
  const onb = baslikKos('onb');
  const news = baslikKos('news');
  ok('ilk açılışta başlık KARŞILAMA oluyor', /hoş geldin/.test(onb));
  ok('ilk açılışta "ne değişti" ifadesi geçmiyor', !/değişti/.test(onb));
  /* Rozet de kipe uymalı: NEW rozeti hiç kullanmamış kullanıcıya yalan söyler. */
  ok('ilk açılışta NEW rozeti taşınmıyor', !/🆕/.test(onb));
  ok('sürüm notu kipinde başlık ESKİSİ GİBİ kalıyor', /değişti/.test(news));
  ok('iki kip aynı başlığı vermiyor', onb!==news);
}

/* Başlık, gövdeyle BİRLİKTE yazılmalı: ayrı çağrılırsa biri güncellenip
   diğeri eski kipte kalır — bu kusurun ta kendisi buydu. */
ok('gövde çizilirken başlık da çiziliyor',
   /function newsYaz\(\)\{\s*\n\s*newsBaslikYaz\(\);/.test(kod));
/* Dil değişiminde de doğru kalmalı: applyLang önce [data-i18n] süpürmesini
   yapıyor, SONRA newsYaz çağırıyor. Sıra tersine dönerse süpürme başlığı
   sözlük değeriyle ezer ve karşılama yine "Ne değişti" olur. */
{
  const iSup = kod.indexOf("$$('[data-i18n]')");
  const iYaz = kod.indexOf('newsYaz();', iSup);
  ok('applyLang içinde i18n süpürmesi bulunuyor', iSup > 0);
  ok('newsYaz süpürmeden SONRA çağrılıyor', iSup > 0 && iYaz > iSup);
}
/* Karşılama anahtarı gerçekten sözlükte, iki dilde de. */
ok('karşılama anahtarı TR sözlükte', /mDlgWelcome:'Sufleye hoş geldin'/.test(tel));
ok('karşılama anahtarı EN sözlükte', /mDlgWelcome:'Welcome to Sufle'/.test(tel));

/* ---------- 2. SEÇİLİ KAYIT BİÇİMİ GÖRÜNÜR VE BIRAKILABİLİR ---------- */
ok('seçili biçim satırı var', /id="mimeRow"/.test(tel));
ok('seçimi bırakma düğmesi var', /id="mimeClear"/.test(tel));
ok('satır varsayılan olarak gizli (seçim yokken görünmesin)',
   /<div class="row hidden" id="mimeRow">/.test(tel));
/* İLK YAZIŞIMDA DESEN `renderMime\(\)` İDİ VE AYIRT ETMİYORDU: fonksiyonun
   KENDİ TANIMI da eşleşiyor, yani çağrı apply()ten silinse bile test yeşil
   kalıyordu (kasıtlı bozma turu yakaladı). Ölçüt: render zincirinde çağrılması. */
ok('render ayar uygulanırken koşuyor', /renderVad\(\);[^\n]*renderMime\(\)/.test(kod));

const mRender = kod.match(/function renderMime\(\)\{[\s\S]*?\n\}/);
const mKisa = kod.match(/function mimeKisa\(\)\{[\s\S]*?\n\}/);
ok('renderMime ve mimeKisa çıkarılabildi', !!mRender && !!mKisa);
if(mRender && mKisa){
  function renderKos(st, L){
    return new Function('__st','__L', `
      const st=__st, L=__L;
      const mk=()=>({ hidden:false, sinif:{},
        classList:{ toggle(c,v){ this.sahip=v; }, sahip:false } });
      const ogeler={ '#mimeRow':mk(), '#mimeClearRow':mk(), '#vMimeNow':{ textContent:'' } };
      const $=s=>ogeler[s];
      ${mKisa[0]}
      ${mRender[0]}
      renderMime();
      return { gizli:ogeler['#mimeRow'].classList.sahip,
               dugmeGizli:ogeler['#mimeClearRow'].classList.sahip,
               deger:ogeler['#vMimeNow'].textContent };
    `)(st, L);
  }
  const yok = renderKos({}, 'tr');
  ok('seçim yokken satır gizli', yok.gizli===true);
  ok('seçim yokken bırakma düğmesi de gizli', yok.dugmeGizli===true);

  const webm = renderKos({ forceMime:'video/webm;codecs=vp8,opus' }, 'tr');
  ok('seçim varken satır görünür', webm.gizli===false);
  /* Kullanıcıya MIME dizesinin tamamı gösterilmez — jargon görünmezliktir;
     tanınabilir kısa ad yeter. */
  ok('değer kısa ve okunur yazılıyor', webm.deger==='webm');
  ok('kodek kuyruğu kullanıcıya gösterilmiyor', !/codecs/.test(webm.deger));

  /* "(seçeneksiz)" kazananı forceMime'a YAZILMAZ, ayrı alanda tutulur; o
     durumda da satır bir şey söylemeli, yoksa seçim yine görünmez olur. */
  const varsayilan = renderKos({ forceMime:'', forceNoOpts:true }, 'tr');
  ok('cihaz varsayılanı seçildiğinde de satır görünüyor', varsayilan.gizli===false);
  ok('cihaz varsayılanı Türkçe yazılıyor', varsayilan.deger==='cihaz varsayılanı');
  const en = renderKos({ forceMime:'', forceNoOpts:true }, 'en');
  ok('cihaz varsayılanı İngilizcede de çevriliyor', en.deger==='device default');
}

/* Bırakma düğmesi İKİ alanı birden temizlemeli: yalnız forceMime silinirse
   forceNoOpts açık kalır ve kayıt sessizce seçeneksiz kurulmaya devam eder. */
ok('bırakma iki alanı da temizliyor',
   /#mimeClear'\)\.onclick=\(\)=>\{ st\.forceMime=''; st\.forceNoOpts=false;/.test(kod));
ok('bırakınca eski test çıktısı da siliniyor (bayat sonuç kalmasın)',
   /#mimeClear'\)\.onclick[\s\S]{0,200}?audTestOut'\);\s*if\(box\) box\.innerHTML='';/.test(kod));

/* Etiketler çevrilmiş olmalı — çevrilmemiş metin kontrast kapısında da
   yakalanır ama kaynak düzeyinde de kilitli olsun. */
for(const k of ['mimeNow','mimeClear'])
  ok('sözlükte TR karşılığı var: '+k, new RegExp(k+":'[^']+'").test(tel));
