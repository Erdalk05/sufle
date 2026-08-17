const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const path=require('path');
const {telefonYolu,oku,repoOku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* AYAR KARTLARI (2026-08-17) — Erdal'ın teşhisi: "modüller dağınık, mobil
   uygulama değil web modülü gibi." Ölçülen karşılığı: Kamera sekmesi TEK
   akışta 15 ilgisiz modül sıralıyordu ve hepsi aynı görsel ağırlıktaydı.
   Ayarlar artık konuya göre katlanır kartlarda; kart kapalıyken başlığın
   yanında O ANKİ değer yazıyor.

   Bu dosya o düzenin KURALLARINI kilitliyor. Kilitlenen şey biçim değil
   davranış: kartın içine ne düştüğü, özetin neyi söylediği, kapalı bir
   özelliğin sayısını göstermemesi ve boş kartın gizlenmesi. */

/* ---------- 1. YAPI ---------- */
const sheet=tel.slice(tel.indexOf('id="sheet"'), tel.indexOf('id="scriptsSheet"'));
const kartlar=[...sheet.matchAll(/<details class="grup"( open)?><summary><span data-i18n="(\w+)"/g)];
ok('ayar sayfası kartlardan oluşuyor ('+kartlar.length+' kart)', kartlar.length>=20);

/* AÇIK KART YOK: sayfa açıldığında konuların LİSTESİ görünür. Bir kart açık
   gelirse ekranın yarısı tek konuya gider ve "uzun akış" hissi geri döner —
   düzeltilen kusur tam olarak buydu. */
const acik=kartlar.filter(k=>k[1]);
ok('hiçbir kart açık başlamıyor'+(acik.length?' — açık: '+acik.map(k=>k[2]):''), acik.length===0);

/* Başlık KISA olmalı: iki satıra taşan başlık kart yığınının ritmini bozar
   ve özete yer bırakmaz (390 px genişlikte ölçüldü). */
/* Sözlük de ENV üzerinden okunmalı: bozma turu sözlüğü geçici kopyada
   bozuyor ve doğrudan okuyan test o bozmayı HİÇ görmez (kapının kör noktası,
   tests/115 bunu ölçüyor). */
const soz=repoOku('cekirdek/sozluk.js','SUFLE_SOZLUK');
const trBlok=soz.slice(soz.indexOf(' tr:{'), soz.indexOf(' en:{'));
const enBlok=soz.slice(soz.indexOf(' en:{'));
const deger=(blok,anahtar)=>{
  const m=blok.match(new RegExp("\\b"+anahtar+":'((?:[^'\\\\]|\\\\.)*)'"));
  return m? m[1] : null;
};
const uzun=[], eksik=[];
kartlar.forEach(k=>{
  const t=deger(trBlok,k[2]), e=deger(enBlok,k[2]);
  if(!t||!e) eksik.push(k[2]);
  else if(t.length>26 || e.length>28) uzun.push(k[2]+' ('+t.length+')');
});
ok('her kart başlığı TR ve EN sözlükte var'+(eksik.length?' — eksik: '+eksik:''), eksik.length===0);
ok('kart başlıkları kısa (tek satıra sığar)'+(uzun.length?' — uzun: '+uzun.join(', '):''), uzun.length===0);

/* Kartın dışında kalmış ayar bloğu olmamalı: gruplama yarım kalırsa o ayar
   hem kartsız durur hem de arama onu bulamaz. */
const panolar=[...sheet.matchAll(/<div class="tab(?: [^"]*)?" id="tab-(\w+)">/g)].map(m=>m[1]);
ok('dört ayar panosu duruyor ('+panolar.join(', ')+')', panolar.length===4);

/* ---------- 2. ÖZET MANTIĞI (gerçek kaynaktan çıkarılıp koşturulur) ---------- */
/* Çizim işi `ozetCiz`e taşındı (sınırlayıcı ayrı fonksiyon); testin
   koşturduğu şey ÇİZİM mantığıdır. */
const mOzet=kod.match(/function ozetCiz\(\)\{[\s\S]*?\n\}/);
ok('ozetCiz çıkarılabildi', !!mOzet);
const mZincir=kod.match(/function gorunurZincir\(el,kok\)\{[\s\S]*?\n\}/);
ok('gorunurZincir çıkarılabildi', !!mZincir);
const mNorm=kod.match(/function norm\(x\)\{[\s\S]*?FOLD\[c\]\|\|c\); \}/);
const mFold=kod.match(/const FOLD=\{[^}]*\};/);
ok('norm ve FOLD çıkarılabildi', !!mNorm && !!mFold);
if(!mOzet || !mZincir || !mNorm || !mFold) return;

/* Sahte DOM — yalnız ozetTazele'nin dokunduğu yüzey. Kopya mantık YOK:
   koşan kod dosyadan çıkarılan kodun kendisi. */
/* Sahte DOM'un seçici eşleştiricisi. Basit ama GERÇEK: etiket adı, sınıf ve
   torun ("summary span") desteklenir. İlk yazışımda yalnız sınıfa bakıyordu
   ve `querySelector('summary span')` hep null dönüyordu; ozetTazele başlığı
   hiç göremediği için testin altı iddiası ürün doğruyken kırmızı verdi —
   tezgâhın kendi kusuru. */
/* NİTELİK VE ÇOCUK BİRLEŞİMİ (2026-08-17'de eklendi — GEREKÇESİ ÖLÇÜLDÜ).
   Ürün tarafında başlık span'i `summary span` ile seçiliyordu; ayar kartlarına
   ikon kutucuğu eklenince o "ilk span" İKON oldu ve başlık boş dizeye düştü.
   Sessiz bedeli: `kisaEtiket` içindeki `n.includes(baslik)` boş dizede her
   zaman doğru döndüğü için bütün kısa etiketler atıldı — özetler "Okuma
   çizgisi 18" yerine çıplak "18" yazmaya başladı, yani çıplak sayıyı
   yasaklayan kural kendini kapattı. Ürün artık `:scope > summary >
   span[data-i18n]` kullanıyor; tezgâh o seçiciyi ANLAMAZSA testin altı iddiası
   ürün doğruyken kırmızı verir (bu dosyanın bilinen kusur sınıfı). */
function parcaEslesir(d,parca){
  const nitelikler=[];
  parca=parca.replace(/\[([\w-]+)(?:=["']?([^\]"']*)["']?)?\]/g,
    (_,a,v)=>{ nitelikler.push([a,v]); return ''; });
  const m=parca.match(/^([a-z]+)?((?:\.[\w-]+)*)$/i);
  if(!m) return false;
  if(m[1] && d._n.etiket!==m[1]) return false;
  const siniflar=(m[2]||'').split('.').filter(Boolean);
  if(!siniflar.every(s=>d.classList.contains(s))) return false;
  const nit=d._n.nitelik||{};
  return nitelikler.every(([a,v])=>
    Object.prototype.hasOwnProperty.call(nit,a) && (v===undefined || nit[a]===v));
}
/* Seçici yolu: ":scope" başlangıcı ve ">" (doğrudan çocuk) birleşimi.
   Eski eşleştirici yalnız torun ilişkisini biliyordu; `:scope > summary`
   yazan bir seçiciyi HİÇ eşleştiremez ve sessizce null döndürürdü. */
function selYol(sel){
  const t=sel.trim().split(/\s+/);
  let kokten=false, i=0;
  if(t[0]===':scope'){ kokten=true; i=1; }
  const adim=[];
  for(; i<t.length; i++){
    if(t[i]==='>'){ adim.push({b:'>', p:t[++i]}); }
    else adim.push({b:' ', p:t[i]});
  }
  return {kokten, adim};
}
function eslesir(d,sel,kok){
  const {kokten,adim}=selYol(sel);
  if(!adim.length) return false;
  if(!parcaEslesir(d,adim[adim.length-1].p)) return false;
  let cur=d;
  for(let i=adim.length-1;i>=1;i--){
    if(adim[i].b==='>'){
      cur=cur.parentElement;
      if(!cur || !parcaEslesir(cur,adim[i-1].p)) return false;
    } else {
      cur=cur.parentElement;
      while(cur && !parcaEslesir(cur,adim[i-1].p)) cur=cur.parentElement;
      if(!cur) return false;
    }
  }
  if(kokten){
    if(!kok) return false;
    if(adim[0].b==='>') return cur.parentElement===kok;
    let a=cur.parentElement; while(a && a!==kok) a=a.parentElement;
    return a===kok;
  }
  return true;
}
function el(o){
  const n=Object.assign({ sinif:[], metin:'', etiket:'div', cocuk:[] }, o);
  const dugum={
    _n:n, children:n.cocuk, parentElement:null,
    /* SETTER ŞART: yalnız getter yazdığımda `o.textContent=...` sessizce
       hiçbir şey yapmadı ve altı iddia ürün doğruyken kırmızı verdi. */
    get textContent(){ return n.metin || n.cocuk.map(c=>c.textContent).join(' '); },
    set textContent(v){ n.metin=v; n.cocuk=[]; dugum.children=n.cocuk; },
    classList:{ _s:new Set(n.sinif),
      contains(x){ return this._s.has(x); },
      add(x){ this._s.add(x); }, remove(x){ this._s.delete(x); },
      toggle(x,v){ if(v) this._s.add(x); else this._s.delete(x); } },
    querySelector(sel){ return dugum.querySelectorAll(sel)[0]||null; },
    /* `closest` 2026-08-17'de gerekti: kartlar bölüm kutularının içine
       taşınınca ürün `parentElement` yerine `closest('.tab')` kullanmaya
       başladı. Sahte DOM bunu sağlamayınca test ÜRÜN DOĞRUYKEN çöküyordu
       (TypeError, tek bir iddia bile basmadan) — CLAUDE.mddeki "çıkarım
       çökerse rapor okunmaz" tuzağının aynısı. */
    closest(sel){
      let d=dugum;
      while(d){ if(eslesir(d,sel)) return d; d=d.parentElement; }
      return null;
    },
    querySelectorAll(sel){
      const out=[];
      /* Kök İLETİLİR: `:scope` olan seçicilerde "hangi ögeye göre" sorusunun
         cevabı budur. İletmezsek `:scope > summary` hiçbir şey döndürmez ve
         başlık yine sessizce boş kalır — düzelttiğimiz kusurun tezgâh hâli. */
      const gez=d=>{ d.children.forEach(c=>{ if(eslesir(c,sel,dugum)) out.push(c); gez(c); }); };
      gez(dugum); return out;
    }
  };
  n.cocuk.forEach(c=>{ c.parentElement=dugum; });
  return dugum;
}
const stil=new Map();
function kur(kartlar){
  const koklar=kartlar.map(k=>{
    const ic=el({ sinif:['icerik'], cocuk:k.cocuk });
    const ozet=el({ etiket:'span', sinif:['ozet'], metin:'' });
    /* İKON KUTUCUĞU TEZGÂHTA DA VAR — ve BAŞLIKTAN ÖNCE. Gerçekte kartın ilk
       span'i artık ikon; tezgâh onu koymazsa `summary span` yazan eski
       (kusurlu) seçici burada YİNE başlığı bulur ve test kusuru göremez.
       Yani bu span, düzeltmenin ayırt edilebilmesi için ŞART: kaldırılırsa
       "özet çıplak sayı yazıyor" bozması sessizce geçer. */
    const ikon=el({ etiket:'span', sinif:['kikon'], metin:'' });
    const baslik=el({ etiket:'span', metin:k.baslik, nitelik:{'data-i18n':k.anahtar||'x'} });
    const sum=el({ etiket:'summary', cocuk:[ikon,baslik,ozet] });
    const kart=el({ etiket:'details', sinif:['grup'], cocuk:[sum,ic] });
    kart._ozet=ozet; kart._ic=ic;
    return kart;
  });
  return koklar;
}
function kosturr(kartNesneleri){
  const koklar=kur(kartNesneleri);
  new Function('__k','__stil', `
    const L='tr';
    ${mFold[0]}
    ${mNorm[0]}
    ${mZincir[0]}
    const getComputedStyle=e=>({display:__stil.get(e)||''});
    const $$=sel=>__k;
    /* Özet çizimi bittiğinde bölüm kutularının boş kalıp kalmadığını da
       tazeliyor. Burada sahte: bu test ÖZET METNİNİ ölçüyor, kutuların
       gizlenmesini tests/166nın kutu bölümü ayrıca sınıyor. */
    function bolumleriTazele(){}
    ${mOzet[0]}
    ozetCiz();
  `)(koklar, stil);
  return koklar;
}
function satir(etiket, deger, gizli){
  const l=el({ etiket:'label', metin:etiket });
  const v=el({ sinif:['v'], metin:deger });
  const r=el({ sinif:['row'], cocuk:[l,v] });
  if(gizli) stil.set(r,'none');
  return r;
}
function segment(secili){
  const b=el({ etiket:"button", sinif:["on"], metin:secili });
  return el({ sinif:['seg'], cocuk:[b] });
}
function anahtar(acik){
  const sw=el({ sinif:acik?['sw','on']:['sw'] });
  return el({ sinif:['tog'], cocuk:[sw] });
}

{
  /* ÇIPLAK SAYI ÖZET DEĞİLDİR: "18" hiçbir şey söylemez, "Okuma çizgisi 18"
     söyler. Etiket kart başlığını tekrarlıyorsa yalnız değer kalır. */
  const k=kosturr([
    { baslik:'Göz teması ve çizgi',
      cocuk:[satir('Okuma çizgisi konumu (kameraya yaklaştır)','18'),
             satir('Yüz–telefon mesafesi (cm)','60')] },
    { baslik:'Görüntü filtresi',
      cocuk:[satir('Görüntü filtresi','%100'), segment('Doğal')] },
    { baslik:'Kayıt kalitesi', cocuk:[segment('1080p')] },
  ]);
  ok('değerin başına satırın kısa etiketi konuyor',
     k[0]._ozet.textContent==='Okuma çizgisi 18');
  ok('etiket kart başlığını tekrarlıyorsa yalnız değer yazılıyor',
     k[1]._ozet.textContent==='%100 · Doğal');
  ok('yalnız segment taşıyan kartta seçili düğme yazılıyor',
     k[2]._ozet.textContent==='1080p');
}
{
  /* KAPALI ÖZELLİĞİN SAYISI GÖSTERİLMEZ. Ölçülerek bulundu: kompozit
     kapalıyken kartın özeti gizli kutudaki eşik değerini ("30") yazıyordu —
     kullanıcı kapalı bir özelliğin ayarını açık sanıyordu. */
  const gizliSatir=satir('Eşik (ne kadarı silinsin)','30');
  const kutu=el({ sinif:['kutu'], cocuk:[gizliSatir] });
  stil.set(kutu,'none');
  const k=kosturr([{ baslik:'Kompozit ve yeşil ekran', cocuk:[anahtar(false), kutu] }]);
  ok('gizli ATA altındaki değer özete girmiyor', !/30/.test(k[0]._ozet.textContent));
  ok('tek anahtarlı kart durumunu söylüyor', k[0]._ozet.textContent==='Kapalı');
}
{
  const k=kosturr([
    { baslik:'Okuma yardımcıları',
      cocuk:[anahtar(true),anahtar(true),anahtar(false),anahtar(true)] },
    { baslik:'Ses onarımı', cocuk:[anahtar(true)] },
  ]);
  ok('çok anahtarlı kart kaç tanesinin açık olduğunu söylüyor',
     k[0]._ozet.textContent==='3/4 açık');
  ok('tek anahtarlı kart açıkken de durumunu söylüyor',
     k[1]._ozet.textContent==='Açık');
}
{
  /* BOŞ KART GİZLENİR: koşula bağlı içerik (mikrofon seçimi, fener, kilit)
     tümüyle gizliyken geriye "aç, içi boş" bir başlık kalıyordu. */
  const g1=satir('Mikrofon','—',true);
  const g2=satir('Cihaz','—',true);
  const k=kosturr([{ baslik:'Mikrofon seçimi', cocuk:[g1,g2] }]);
  ok('içeriğinin tamamı gizli olan kart gizleniyor', k[0].classList.contains('bos'));
  const d=kosturr([{ baslik:'Kayıt kalitesi', cocuk:[segment('1080p')] }]);
  ok('içeriği görünen kart gizlenmiyor', !d[0].classList.contains('bos'));
}
{
  /* İki uzun parça yan yana kesilirdi; kesik özet yanlış okunur. */
  const k=kosturr([{ baslik:'Yazı ölçüleri',
    cocuk:[satir('Satır aralığı arasında uzun etiket','1.45'), segment('Çok uzun bir seçenek adı')] }]);
  ok('özet 26 karakteri aşarsa ikinci parça atılıyor',
     k[0]._ozet.textContent.split(' · ').length===1);
}
{
  /* gorunurZincir ayrı sınanıyor: ata zinciri kuralı bu düzenin temeli. */
  const alt=el({ sinif:['alt'] });
  const orta=el({ sinif:['orta'], cocuk:[alt] });
  const kok=el({ sinif:['kok'], cocuk:[orta] });
  const sonuc=new Function('__alt','__orta','__kok','__stil', `
    const getComputedStyle=e=>({display:__stil.get(e)||''});
    ${mZincir[0]}
    const once=gorunurZincir(__alt,__kok);
    __stil.set(__orta,'none');
    const sonra=gorunurZincir(__alt,__kok);
    return [once,sonra];
  `)(alt,orta,kok,stil);
  ok('zincir temizken görünür sayılıyor', sonuc[0]===true);
  ok('ATA gizlenince çocuk da görünmez sayılıyor', sonuc[1]===false);
}

/* ---------- 3. SENARYOLAR SAYFASI DA KARTLANDI ---------- */
{
  const sc=tel.slice(tel.indexOf('id="scriptsSheet"'), tel.indexOf('id="takesSheet"'));
  const k=[...sc.matchAll(/<details class="grup"><summary><span data-i18n="(\w+)"/g)].map(m=>m[1]);
  ok('senaryolar sayfasında da kart var ('+k.length+')', k.length>=4);
  /* Sık kullanılan İKİSİ kartın DIŞINDA kalmalı: liste ve metin alanı.
     Kullanıcı buraya senaryo yazmaya gelir; onları da katlamak işi bozar. */
  const disarida=(id)=>{
    const i=sc.indexOf(id);
    if(i<0) return false;
    const once=sc.slice(0,i);
    const acilan=(once.match(/<details class="grup">/g)||[]).length;
    const kapanan=(once.match(/<\/details>/g)||[]).length;
    return acilan===kapanan;
  };
  ok('senaryo listesi kartın dışında (tek dokunuşla erişilir)', disarida('id="scriptList"'));
  ok('metin alanı kartın dışında', disarida('id="text" data-i18n-ph'));
  ok('başlık alanı kartın dışında', disarida('id="title" data-i18n-ph'));
  /* Seyrek kullanılanlar kartın İÇİNDE: yedekleme ve metin araçları. */
  ok('yedekleme kartın içinde', !disarida('id="bkExport"'));
  ok('metin araçları kartın içinde', !disarida('id="toolSeg"'));
}

/* ---------- 3b. SONUÇ EKRANI: TEK ASIL EYLEM ---------- */
{
  const res=tel.slice(tel.indexOf('<div id="result">'), tel.indexOf('<div id="ready"'));
  const kartlar=[...res.matchAll(/<details class="grup"><summary><span data-i18n="(\w+)"/g)].map(m=>m[1]);
  ok('sonuç ekranında kart var ('+kartlar.join(', ')+')', kartlar.length>=2);
  /* Jetonların kendi kuralı: dolu yeşil = asıl eylem, ekranda TEK olmalı.
     Ölçülen kusur: sekiz düğme aynı ağırlıkta iki sıra hâlinde duruyordu. */
  /* Budama kutusu SAYILMAZ: açıldığında ekranın konusu değişir ve o alt
     kipin kendi asıl eylemi "Kes ve uygula"dır. Kutu kapalıyken zaten
     görünmez. Sayım onun dışında yapılıyor — kuralı kutuya da uygulasaydım
     kesme düğmesini ikincil yapardım, oysa orada asıl eylem odur. */
  const trimBas=res.indexOf('<div id="trimBox"');
  const trimSon=res.indexOf('</div>', res.indexOf('id="trimGo"'));
  const dis=res.slice(0,trimBas)+res.slice(trimSon);
  const dolu=(dis.match(/class="save"/g)||[]).length;
  ok('sonuç ekranında tek dolu eylem var ('+dolu+')', dolu===1);
  const disarida=(id)=>{
    const i=res.indexOf(id); if(i<0) return false;
    const once=res.slice(0,i);
    return (once.match(/<details class="grup">/g)||[]).length===(once.match(/<\/details>/g)||[]).length;
  };
  ok('asıl eylem (Paylaş / Kaydet) dışarıda', disarida('id="saveBtn"'));
  ok('çıkış yolu (Kapat) dışarıda — kart açılmadan görünür', disarida('id="keepBtn"'));
  ok('düzenleme dışarıda', disarida('id="editBtn"'));
  /* Yıkıcı eylem asıl eylemin yanında durmaz: yanlış dokunuş çekimi siler.
     ⚠️ VARLIK AYRICA SINANIYOR: ilk hâli yalnız "dışarıda değil" diyordu ve
     düğme TÜMDEN SİLİNDİĞİNDE de geçiyordu (kasıtlı bozma turunda ölçüldü) —
     yokluğu "doğru yerde" saymak, bu deponun `indexOf` tuzağının aynısı. */
  const icinde=id=> res.includes(id) && !disarida(id);
  ok('Sil düğmesi duruyor ve kartın içinde', icinde('id="redoBtn"'));
  ok('yayın paketi duruyor ve kartın içinde', icinde('id="pkgBtn"'));
  /* Tanı satırları DIŞARIDA kalmalı: bir şey ters gittiğinde tam o an
     görünmek zorundalar, kartın arkasında değil. */
  ok('ses tanısı dışarıda', disarida('id="audInfo"'));
  ok('paylaşım tanısı dışarıda', disarida('id="shareDiag"'));
  ok('arşiv uyarısı dışarıda', disarida('id="archBox"'));
}

/* ---------- 4. KART BİLEŞENİ SAYFADA TANIMLI ---------- */
ok('.grup kart biçimi tanımlı', /\.grup\{[^}]*background:var\(--s-raised\)/.test(tel));
ok('kapalı kartta özet görünür, açıkta gizli',
   /\.grup\[open\]>summary \.ozet\{display:none\}/.test(tel));
ok('kart başlığı en az 44 px dokunma hedefi', /\.grup>summary\{[^}]*min-height:var\(--tap\)/.test(tel));
ok('boş kart gizleniyor', /\.grup\.bos\{display:none\}/.test(tel));
/* İKİ AYRI İDDİA, ÇÜNKÜ İKİ AYRI SATIR. İlk hâli tek gevşek desendi ve
   kasıtlı bozma turunda YAKALANMADI: başlangıç satırını bozunca aşağıdaki
   `toggle` dinleyicisi aynı desene uyduğu için test yeşil kaldı. Desen
   bağlamıyla birlikte aranıyor (bu deponun "gevşek desen" hata sınıfı). */
ok('kartların açılış durumu BAŞLANGIÇTA okunuyor',
   /\$\$\('\.sheet \.grup'\)\.forEach\(g=>\{\s*\n\s*g\.dataset\.acik\s*=\s*g\.open\s*\?\s*'1'\s*:\s*'0';/.test(kod));
ok('kullanıcı kartı açıp kapatınca yeni durum akılda kalıyor (arama kapatmasın)',
   /addEventListener\('toggle'[\s\S]{0,80}?g\.dataset\.acik=g\.open\?'1':'0'/.test(kod));

/* ---------- TİPOGRAFİK RİTİM (2026-08-17) ----------
   Rekabet belgesi 25. kategoriyi (UI/görsel) 5'e çıkarmak için iki şey
   istiyor: GRUPLAMA ve TİPOGRAFİK RİTİM. Gruplama kartlarla yapıldı; ritim
   ölçüldü ve dört yüzeyde 39 öge ölçek DIŞINDA çıktı (12 · 14 · 17 · 18 ·
   21 · 30 px). Hepsi jetona bağlandı; ölçüm yeniden koştu: 0 ölçek dışı öge.

   Kilitlenen kural: uygulama kabuğunda ÇIPLAK punto yazılmaz. Üç istisna
   var ve üçünün de sebebi kodda yazılı:
     ·  9/10 px — video ÜSTÜNDEKİ mikro etiketler (güvenli alan rozeti,
                  hız rayı, göz hattı, çubuk etiketi): ölçek gövde metni
                  içindir, kamera görüntüsünün üstündeki işaretler değil
     ·  16 px   — senaryo yazı kutusu; iOS 16'nın altında odakta ZUMLUYOR */
{
  const kabuk = oku(telefonYolu());
  const ciplak = [...kabuk.matchAll(/font-size:\s*([\d.]+)px/g)].map(m => +m[1]);
  const izin = new Set([9, 10, 16]);
  const disarida = ciplak.filter(v => !izin.has(v));
  ok('kabukta ölçek dışı çıplak punto yok' + (disarida.length ? ' — ' + disarida.join(', ') : ''),
     disarida.length === 0);
  /* Ölçek gerçekten KULLANILIYOR mu: jetona bağlı bildirim sayısı çıplak
     olanları açık ara geçmeli, yoksa "ölçek var ama kimse kullanmıyor"
     durumuna geri döneriz (bu deponun ölü-ayar sınıfı). */
  const jetonlu = (kabuk.match(/font-size:\s*var\(--tx-/g) || []).length;
  ok('punto bildirimlerinin çoğu jetondan geliyor (' + jetonlu + ' jeton / ' + ciplak.length + ' çıplak)',
     jetonlu >= 20 && jetonlu > ciplak.length * 4);
  /* Giriş başlığı için ALTINCI adım eklendi: değer aynı kaldı ama artık
     rastgele bir sayı değil, seçilmiş bir basamak. */
  ok('marka başlığı ölçeğin bir adımı (--tx-hero)', /--tx-hero:\s*30px/.test(kabuk));
  ok('giriş başlığı o adımı kullanıyor', /#intro h1\{font-size:var\(--tx-hero\)/.test(kabuk));
}

/* ---------- ÖZET BÜTÇESİ (2026-08-17, çizilmiş ekranda ölçüldü) ----------
   Kısa etiket eklenince özet uzadı ve 390 px'te KART BAŞLIĞI İKİ SATIRA
   düştü; üstelik özet kendisi de üç noktayla kesiliyordu, yani iki bilgi
   birden bozuluyordu. Başlık asla kesilmemeli: kullanıcının okuduğu ilk şey
   o. Bütçe 26 → 20 karaktere, özetin genişliği %52 → %46'ya indirildi ve
   ölçüm yeniden koştu: üç sekmede de iki satırlık başlık 0. */
{
  const kabuk = oku(telefonYolu());
  const kod2 = kabuk.replace(/\/\*[\s\S]*?\*\//g, '');
  const m = kod2.match(/parca\.join\(' · '\)\.length>(\d+)\) parca\.length=1;/);
  ok('özet bütçesi kaynakta yazılı', !!m);
  ok('iki parçalık özet en fazla 20 karakter (' + (m ? m[1] : '?') + ')', !!m && +m[1] <= 20);
  const t = kod2.match(/parca\[0\]\.length>(\d+)\) parca\[0\]=parca\[0\]\.slice/);
  ok('tek parçalık özet de kısaltılıyor', !!t && +t[1] <= 20);
  const g = kabuk.match(/\.grup>summary \.ozet\{[^}]*max-width:(\d+)%/);
  ok('özet genişliği en fazla %46 (' + (g ? g[1] : '?') + ')', !!g && +g[1] <= 46);
}

/* ---------- ÖZET TAZELEME MALİYETİ (2026-08-17, ölçülerek) ----------
   `apply()` her sürgü olayında koşuyor ve özet tazeleme 26 kartın bütün
   satırlarını dolaşıyor. 8100 kelimelik senaryoda gerçek tarayıcıda ölçüldü
   (olay başına, en kötü hâl — gerçek sürüklemede kare başına bir kez):
     hız sürgüsü (yeniden ölçüm YOK) ....  3,2 ms  ← temel apply + özet
     kamera karartma .....................  17,3 ms
     satır aralığı .......................  45,8 ms
     yazı boyutu .........................  66,1 ms
   Yani yük özet değil, uzun metnin yeniden ölçümü (zaten `olcPlanla` ile
   kare başına sınırlı). Özet yine de iki kuralla ucuzlatıldı ve KURALLAR
   burada kilitli. */
{
  const kabuk = oku(telefonYolu());
  const kod3 = kabuk.replace(/\/\*[\s\S]*?\*\//g, '');
  /* ⚠️ SINIRLAYICI rAF'A BAĞLANMAZ: arka plan sekmesinde rAF hiç koşmaz ve
     bayrak asılı kalır — özetler bir daha hiç tazelenmez (deponun 2 numaralı
     hata sınıfı). Zaman damgalı sınırlayıcı takılamaz. */
  /* Desen İDDİAYA bağlanır, KOMŞULUĞA değil (CLAUDE.md, 5 vakayla ölçülmüş
     ders). Eski hâli `let ozetSon=0;` ile sınırlayıcı arasında en fazla 200
     karakter olduğunu varsayıyordu; araya ikon/bölüm haritası girince
     DAVRANIŞ HİÇ DEĞİŞMEDEN kırmızıya döndü. İddia şu: sınırlayıcı bir zaman
     damgasına bakıyor — hangi satırda durduğu değil. */
  const mTazele=kod3.match(/function ozetTazele\(zorla\)\{[\s\S]*?\n\}/);
  ok('ozetTazele çıkarılabildi', !!mTazele);
  ok('özet sınırlayıcısı zaman damgalı (rAF değil)',
     !!mTazele && /performance\.now\(\)/.test(mTazele[0])
               && /simdi-ozetSon<120/.test(mTazele[0]));
  ok('sınırlayıcının sayacı tanımlı', /let ozetSon=0;/.test(kod3));
  ok('özet tazeleme rAF ile ertelenmiyor',
     !/function ozetTazele\(\)\{[\s\S]{0,200}?requestAnimationFrame/.test(kod3));
  /* Görünmeyen sekmenin kartları hesaplanmıyor; sekme değişince ZORLA
     tazeleniyor, yoksa yeni sekme boş özetle açılırdı. */
  /* Kartlar bölüm kutularının içine taşındı; sekmeyi bulmanın yolu artık
     `closest('.tab')`. Doğrudan ebeveyne bakan eski kontrol HİÇBİR kartı
     "sekmede" saymaz — yani atlama sessizce çalışmaz olurdu. Kilitlenen şey
     yol değil, DAVRANIŞ: sekmesi kapalı olan kart hesaplanmaz. */
  ok('görünmeyen sekmenin kartları atlanıyor',
     /const pano=g\.closest\('\.tab'\);\s*\n\s*if\(pano && !pano\.classList\.contains\('on'\)\) return;/
       .test(kod3));
  ok('sekme değişince özet ZORLA tazeleniyor', /ozetTazele\(true\);\n\}\);/.test(kod3));
  ok('kart açılınca da zorla tazeleniyor', /if\(g\.open\) ozetTazele\(true\);/.test(kod3));
}

/* ---------- MASAÜSTÜ SAĞ PANELİ DE KARTLANDI (2026-08-17) ----------
   Telefonda ayarlar kartlara bölününce ekran sakinleşti; masaüstünde de iki
   blok aynı sorunu yaşıyordu. "Kumanda tuşları" (öğretme kutusu + eşleme
   tablosu) ve "Zorlanma haritası", paragraflarıyla panelin yarısını kaplayıp
   HER ZAMAN açık duruyordu — oysa ikisi de seyrek kullanılıyor.

   Kural: SIK kullanılan anahtarlar açıkta kalır, SEYREK kullanılan bloklar
   katlanır kartta durur ve kart açık başlamaz. Ölçüldü: iki kart, ikisi de
   kapalı, panel yüksekliği 421 px; kartlar açılınca düğmeler çalışıyor
   (tuş öğret kutusu açıldı, harita sıfırlandı), JS hatası 0. */
{
  const { macYolu } = require('./kaynak.js');
  const mac = oku(macYolu());
  const okuma = mac.slice(mac.indexOf('<div class="ctrl" data-rtab="read">'),
                          mac.indexOf('<div class="ctrl" id="remoteCtrl"'));
  const kart = [...okuma.matchAll(/<details class="grup"( open)?><summary><span data-i18n="(\w+)"/g)];
  ok('masaüstü Okuma sekmesinde kart var (' + kart.length + ')', kart.length === 2);
  ok('masaüstünde de hiçbir kart açık başlamıyor', kart.every(k => !k[1]));
  ok('kartlar seyrek kullanılan iki blok',
     kart.map(k => k[2]).sort().join(',') === 'mDiffTitle,mRemoteKeys');
  /* Sık kullanılan anahtarlar KART DIŞINDA kalmalı: onları da katlamak
     masaüstünde her seferinde fazladan tıklama demek olurdu. */
  const disarida = (id) => {
    const i = okuma.indexOf(id); if (i < 0) return false;
    const once = okuma.slice(0, i);
    return (once.match(/<details class="grup">/g) || []).length ===
           (once.match(/<\/details>/g) || []).length;
  };
  for (const t of ['data-t="mirror"', 'data-t="eye"', 'data-t="dim"', 'data-t="hl"', 'data-t="count"'])
    ok('anahtar kart dışında: ' + t, disarida(t));
  ok('kumanda öğretme kartın içinde', !disarida('id="macLearn"'));
  ok('zorlanma haritası kartın içinde', !disarida('id="macDiffClear"'));
  ok('masaüstünde kart biçimi tanımlı', /\.grup\{background:var\(--card/.test(mac));
  ok('masaüstü kart başlığı en az 40 px', /\.grup>summary\{[^}]*min-height:40px/.test(mac));
}
