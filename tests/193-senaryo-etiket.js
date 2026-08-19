const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cekirdekOku}=require('./kaynak');
const tel=oku(telefonYolu()), mac=oku(macYolu());
const CEK=cekirdekOku('etiket.js','SUFLE_ETIKET');

/* SENARYO ETİKETLERİ (2026-08-19).

   Rakiplerde senaryolar KLASÖRE konuyor; bizde etiket var ve bu bilinçli:
   klasör tek üyeliktir, etiket çoklu. Tek etiket seçildiğinde ekranda
   klasörün yaptığı işi aynen yapıyor, üstelik "Reels" ile "Müşteri A"nın
   ikisine birden ait bir senaryo için kopya tutturmuyor.

   Bu test kararın kabul ölçütlerini kilitliyor. Hepsinin ortak paydası şu:
   bir düzenleme aracı, düzenlediği veriyi SESSİZCE kaybetmemeli. */

const c=(()=>new Function(CEK+
  '\nreturn {etiketAnahtar,etiketAyristir,etiketYaz,etiketTablo,etiketSuz,'+
  'etiketSeciliGecerli,ETIKET_EN_COK,ETIKET_EN_UZUN};')())();

/* ---------- 1) ANAHTAR: DİLDEN BAĞIMSIZ TÜRKÇE KATLAMA ---------- */
{
  const {etiketAnahtar}=c;
  ok('büyük/küçük harf aynı etiket', etiketAnahtar('Reels')===etiketAnahtar('reels'));
  /* TÜRKÇE İ TUZAĞI: `toLocaleLowerCase('tr')` ile "İŞ" → "iş",
     `('en')` ile noktalı i + birleştirici. Anahtar `L`yi okusaydı arayüz
     dilini değiştiren kullanıcının etiketleri İKİYE bölünür ve sebebini
     hiçbir ekranda göremezdi. */
  ok('İŞ ile iş aynı etiket', etiketAnahtar('İŞ')===etiketAnahtar('iş'));
  ok('Iş ile ış aynı etiket', etiketAnahtar('Iş')===etiketAnahtar('ış'));
  ok('Türkçe harfler katlanıyor', etiketAnahtar('Müşteri')===etiketAnahtar('musteri'));
  ok('boşluk anlamsız', etiketAnahtar('müşteri a')===etiketAnahtar('MüşteriA'));
  ok('yalnız noktalama boş anahtar verir', etiketAnahtar('—!?')==='');
  /* Anahtar KAYNAKTA `L` okumuyor olmalı — davranış testi geçse bile
     sonradan biri `L`yi içeri sokabilir. */
  ok('anahtar fonksiyonu arayüz dilini okumuyor',
     !/function etiketAnahtar\([\s\S]{0,600}?toLocaleLowerCase\(\s*L/.test(CEK));
}

/* ---------- 2) AYRIŞTIRMA: TEMİZ VERİ, SINIRLI ---------- */
{
  const {etiketAyristir,ETIKET_EN_COK,ETIKET_EN_UZUN}=c;
  ok('virgülle ayrılıyor', JSON.stringify(etiketAyristir('reels, ders'))==='["reels","ders"]');
  ok('baştaki # atılıyor', etiketAyristir('#reels')[0]==='reels');
  ok('boş parçalar düşüyor', etiketAyristir('reels,,  ,ders').length===2);
  ok('yalnız noktalamadan etiket olmaz', etiketAyristir('--- , ???').length===0);
  /* AYNI ETİKETİN İKİNCİ YAZIMI İKİ KUTU AÇMAZ; ekranda İLK yazım kalır. */
  const d=etiketAyristir('Reels, reels, REELS');
  ok('tekrarlar tek etikete iniyor', d.length===1);
  ok('ilk yazım korunuyor', d[0]==='Reels');
  /* SINIRLAR: 7. etiket liste satırını ikiye böler, uzun etiket jeton
     çubuğunu yatay kaydırmaya zorlar. İkisi de ölçülmüş bütçe kavgası. */
  ok('en çok altı etiket', etiketAyristir('a,b,c,d,e,f,g,h').length===ETIKET_EN_COK);
  ok('etiket 24 karakterde kesiliyor',
     etiketAyristir('x'.repeat(60))[0].length===ETIKET_EN_UZUN);
  ok('iç boşluk tek boşluğa iniyor', etiketAyristir('müşteri    a')[0]==='müşteri a');
  ok('bozuk girdi çökmüyor',
     etiketAyristir(null).length===0 && etiketAyristir(undefined).length===0);
}

/* ---------- 3) TABLO: SIRA KARARLI OLMALI ---------- */
{
  const {etiketTablo}=c;
  const t=etiketTablo([{tags:['reels','ders']},{tags:['reels']},{tags:['Reels']},{tags:[]},{},null]);
  ok('etiketler sayılıyor', t.length===2 && t[0].ad==='reels' && t[0].n===3);
  ok('az kullanılan arkada', t[1].ad==='ders' && t[1].n===1);
  /* EŞİTLİKTE SIRA SABİT: sıralama kararlı değilse jetonlar kullanıcının
     gözünün önünde yer değiştirir ve yanlış jetona basılır. */
  const e1=etiketTablo([{tags:['bbb']},{tags:['aaa']}]);
  const e2=etiketTablo([{tags:['aaa']},{tags:['bbb']}]);
  ok('eşit sayıda etiket hep aynı sırada',
     e1.map(x=>x.ad).join()===e2.map(x=>x.ad).join());
  ok('bozuk liste çökmüyor', etiketTablo(null).length===0 && etiketTablo('x').length===0);
}

/* ---------- 4) SÜZGEÇ VE KAYBOLAN SEÇİM ---------- */
{
  const {etiketSuz,etiketSeciliGecerli,etiketTablo}=c;
  const liste=[{id:1,tags:['reels']},{id:2,tags:['ders','reels']},{id:3,tags:['ders']},{id:4}];
  ok('seçili yoksa liste tam', etiketSuz(liste,'').length===4);
  ok('etikete göre süzülüyor', etiketSuz(liste,'reels').map(s=>s.id).join()==='1,2');
  ok('süzgeç de Türkçe katlıyor', etiketSuz(liste,'REELS').length===2);
  ok('etiketsiz senaryo süzgeçte görünmüyor',
     etiketSuz(liste,'ders').every(s=>s.id!==4));
  /* 🔴 KAYBOLAN SEÇİM: etiketi taşıyan son senaryo silinince seçim ekranda
     kalırsa liste SONSUZA KADAR boş görünür — kullanıcı senaryolarını
     kaybettiğini sanar. Bu deponun "arayüz var olmayan bir şeyi söylüyor"
     sınıfı; seçim o anda düşmeli. */
  const tablo=etiketTablo(liste);
  ok('var olan seçim korunuyor', etiketSeciliGecerli('reels',tablo)==='reels');
  ok('kaybolan etiketin seçimi düşüyor', etiketSeciliGecerli('kampanya',tablo)==='');
  ok('boş seçim boş kalıyor', etiketSeciliGecerli('',tablo)==='');
  ok('tablo yoksa seçim düşüyor', etiketSeciliGecerli('reels',null)==='');
}

/* ---------- 5) GİDİŞ-DÖNÜŞ: DÜZENLEME VERİ KAYBETMEZ ---------- */
{
  const {etiketAyristir,etiketYaz}=c;
  const a=etiketAyristir('Reels, müşteri a, ders 1');
  ok('yaz→ayrıştır aynı diziyi veriyor',
     JSON.stringify(etiketAyristir(etiketYaz(a)))===JSON.stringify(a));
  ok('boş dizi boş satır', etiketYaz([])==='' && etiketYaz(null)==='');
}

/* ---------- 6) KABUKLAR: İKİSİNDE DE, AYNI KURALLA ---------- */
for(const [ad,src] of [['telefon',tel],['Mac',mac]]){
  ok(ad+': etiket süzgeç çubuğu var', /id="scTagBar"/.test(src));
  ok(ad+': etiket giriş kutusu var', /id="scTags"/.test(src));
  /* HİÇ ETİKET YOKKEN ÇUBUK ÇİZİLMEZ: tek başına duran "Tümü" jetonu
     hiçbir şey yapmaz — bu deponun "ölü ayar" sınıfının liste hâli. */
  ok(ad+': etiket yokken çubuk gizleniyor',
     /classList\.toggle\('hidden',\s*!et[Tt]ablo\.length\)/.test(src));
  /* SÜZGEÇ TERCİH DEĞİL GÖRÜNÜM DURUMU: kalıcı olsaydı süzgeci açık bırakan
     kullanıcı ertesi gün senaryolarının çoğunu göremezdi. */
  ok(ad+': seçili etiket kalıcı duruma yazılmıyor',
     !/st\.scTag\s*=|state\.(mac)?[Tt]agSecili\s*=/.test(src));
  /* ⚠️ KUTU DOLDURULMADAN YAZMA: açılışta kutu boşken koşulsuz yazsaydı
     senaryonun etiketleri sessizce silinirdi (3 numaralı hata sınıfı). */
  ok(ad+': kutu bu senaryo için dolmadan etiket yazılmıyor',
     /(scTagKutuId|macTagKutuId)===s\.id\)\s*s\.tags=etiketAyristir/.test(src));
  /* `change`, `input` DEĞİL: her tuş vuruşunda ayrıştırmak çubukta
     "r", "re", "ree" jetonları yakıp söndürürdü. */
  ok(ad+': etiket kutusu change olayını dinliyor',
     /#scTags'\)\.onchange=|#scTags'\)\.addEventListener\('change'/.test(src));
  ok(ad+': süzgeç kapalıyken satırda etiket yazılıyor',
     /!(scTagSecili|macTagSecili) && et\.length/.test(src));
  ok(ad+': etiket modülü gömülü', /function etiketAyristir\(/.test(src));
}

/* ---------- 7) SÖZLÜK: İKİ DİLDE DE KARŞILIĞI VAR ---------- */
for(const k of ['scTagsL','scTagsPh','scTagAll','scTagsHint']){
  ok('anahtar iki dilde: '+k,
     (tel.match(new RegExp(k+":'",'g'))||[]).length>=2);
}

/* ---------- 8) SENARYO FAVORİSİ (v9.35) ----------
   Rakip yol haritasının "senaryo organizasyonu" maddesinin son parçası.
   Çekim arşivinde yıldız ZATEN vardı (`fav`), senaryolarda yoktu — aynı
   kavramın yarısı eksikti. Favori ayrı bir sekme DEĞİL: liste ikiye
   bölünürse kullanıcı aradığı senaryonun hangi yarıda olduğunu bilemez. */
for(const [ad,src] of [['telefon',tel],['Mac',mac]]){
  ok(ad+': favori düğmesi var', /aria-pressed="\$\{?s\.fav/.test(src) || /s\.fav\?'★':'☆'/.test(src));
  ok(ad+': favori kalıcı duruma yazılıyor', /s\.fav=!s\.fav; save\(\)/.test(src));
  /* Sıralamanın YERİNE değil ÜSTÜNE: kullanıcının seçtiği sıra korunuyor. */
  /* SIRALAMANIN ÜSTÜNDE, YERİNE DEĞİL: favori eşitliğinde kullanıcının
     seçtiği sıra (son kullanılan / ada göre / uzunluğa göre) devam etmeli.
     Yalnız `fav` farkını döndüren bir karşılaştırma o sırayı tümden siler. */
  ok(ad+': favoriler seçili sıralamanın üstünde',
     /const f=\(b\.fav\?1:0\)-\(a\.fav\?1:0\); if\(f\) return f;/.test(src) ||
     /\.sort\(\(a,b\)=>\(\(b\.fav\?1:0\)-\(a\.fav\?1:0\)\)\)/.test(src));
  /* Telefonda yıldız AYRI bir düğme ve `stopPropagation` çağırıyor; Mac'te
     satırın kendi tıklaması sınıfa bakarak ayrılıyor. İkisi de aynı sonucu
     veriyor: yıldız senaryoyu AÇMIYOR. */
  ok(ad+': yıldıza dokunmak senaryoyu AÇMIYOR',
     /\[data-a="fav"\]'\)\.onclick=e=>\{ e\.stopPropagation\(\);/.test(src) ||
     /!e\.target\.classList\.contains\('fav'\)/.test(src));
}
/* Erişilebilir ad DURUMU söylemeli: "Favori" tek başına açık mı kapalı mı
   demiyor; ekran okuyucu kullanıcısı için düğme o zaman anlamsız. */
ok('favori düğmesinin adı duruma göre değişiyor',
   /scFavAdd:'Favorilere ekle'/.test(tel) && /scFavDel:'Favorilerden çıkar'/.test(tel) &&
   /scFavAdd:'Add to favourites'/.test(tel) && /scFavDel:'Remove from favourites'/.test(tel) &&
   /\(s\.fav\?t\('scFavDel'\):t\('scFavAdd'\)\)/.test(tel));

