const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,esnek,cekirdekOku,blokKes}=require('./kaynak');

/* GİRİŞ EKRANI ARTIK ÇALIŞMA EKRANI (v9.47).

   20 Ağustos sabahı Erdal şunu söyledi: *"v9.33'ten v9.46'ya yaptığın hiçbir
   değişikliği görmedim."* Ölçtüm ve HAKLIYDI: v9.34 ile v9.46'nın giriş
   ekranı aynı tarayıcıda, aynı ölçüde **piksel piksel aynıydı**
   (272.388 / 272.380 bayt). On iki sürüm çıkmış ama uygulamayı her açtığında
   gördüğü ekran hiç değişmemişti.

   Sebep öncelik hatasıydı: ölçebildiğim ve kanıtlayabildiğim kusurları
   kovaladım, kullanıcının HİSSEDECEĞİ ürünü değil. Bu dosya o dersin
   nöbetçisi — giriş ekranı bir tanıtım sayfası değil, çalışma ekranı:
   senaryolar orada, seçim orada, son çekimler bir dokunuş uzakta.

   ⚠️ SINIR BİLEREK KONDU: ekran sınırsız büyüyemez. En çok 3 "diğer senaryo"
   ve 3 çekim çiziliyor; gerisi Senaryolar sayfasında. Sınırsız bir liste,
   giriş ekranını ikinci bir senaryolar sayfasına çevirirdi. */

const tel=esnek(oku(telefonYolu()));
const SOZ=cekirdekOku('sozluk.js','SUFLE_SOZLUK');

/* ---------- 1) YÜZEY VAR ---------- */
for(const id of ['introListe','introDigerler','introSenAc','introCekim','introCekimSerit'])
  ok('giriş ekranında #'+id+' var', new RegExp('id="'+id+'"').test(tel));
/* Aktif senaryo kartı listenin İÇİNDE: dışarıda dursaydı aynı bilgi iki kez
   yazılırdı (kart + liste satırı). */
ok('aktif senaryo kartı listenin içinde',
   /<div id="introListe"[\s\S]{0,400}?<div id="introSenaryo"/.test(tel));

/* ---------- 2) LİSTE GERÇEKTEN DOLDURULUYOR ---------- */
{
  const f=blokKes(tel,'function introListeYaz(){');
  ok('introListeYaz çıkarılabildi', !!f);
  const b=f||'';
  /* Aktif senaryo listede İKİNCİ KEZ görünmemeli. */
  ok('aktif senaryo listede tekrarlanmıyor', /x\.id!==st\.activeId/.test(b));
  /* Sıra senaryolar sayfasıyla AYNI kural: favori üstte, sonra son kullanılan.
     İki yüzeyin farklı sıra göstermesi "hangisi doğru" sorusunu doğurur. */
  ok('favoriler üstte', /\(b\.fav\?1:0\)-\(a\.fav\?1:0\)/.test(b));
  ok('sonra son kullanılan', /\(b\.up\|\|0\)-\(a\.up\|\|0\)/.test(b));
  ok('liste tavanı var', /slice\(0,INTRO_LISTE_TAVAN\)/.test(b));
  /* Kullanıcının senaryo adı HTML olarak yorumlanmamalı: `innerHTML` ile
     yazılsaydı, adında `<img onerror>` geçen bir senaryo kod çalıştırırdı. */
  ok('senaryo adı metin olarak yazılıyor (HTML olarak değil)',
     /a\.textContent=ad/.test(b) && !/dig\.innerHTML\s*\+=/.test(b));
  ok('boş metinli senaryo listeye girmiyor', /filter\(x=>\(\(x\.text\|\|''\)\.trim\(\)\)\)/.test(b));
}
ok('liste tavanı 3 (aktif + 3 = 4 senaryo)', /const INTRO_LISTE_TAVAN=3;/.test(tel));

/* ---------- 3) ÇEKİM ŞERİDİ ---------- */
{
  const f=blokKes(tel,'async function introCekimYaz(){');
  ok('introCekimYaz çıkarılabildi', !!f);
  const b=f||'';
  ok('en çok 3 çekim çiziliyor', /liste=liste\.slice\(0,3\)/.test(b));
  /* HİÇ ÇEKİM YOKSA ŞERİT HİÇ ÇİZİLMİYOR: boş bir kutu, olmayan bir şeyi
     varmış gibi sunmaktır (deponun kendi kuralı). */
  ok('çekim yoksa şerit gizleniyor', /classList\.toggle\('hidden',\s*liste\.length===0\)/.test(b));
  /* Arşiv okuması patlarsa açılış durmamalı — yalnız şerit çizilmez. */
  ok('arşiv hatası açılışı durdurmuyor', /catch\(e\)\{\s*logErr\('introCekim',e\);\s*\}/.test(b));
}

/* ---------- 4) DOKUNUŞLAR BAĞLI ---------- */
ok('satıra dokununca o senaryo seçiliyor',
   /st\.activeId=yeni\.id;/.test(tel) && /introSenaryoYaz\(\);\s*introListeYaz\(\);/.test(tel));
ok('seçim kullanıcıya bildiriliyor', /toast\(m\('introSecildi'\)\)/.test(tel));
ok('"Senaryoları aç" senaryolar sayfasını açıyor',
   /#introSenAc'\)\.onclick=\(\)=>\{[^}]*openSheet\('#scriptsSheet'\)/.test(tel));
ok('çekime dokununca arşiv açılıyor',
   /#introCekimSerit'\)\.onclick=[\s\S]{0,200}?openSheet\('#takesSheet'\)/.test(tel));
/* Olay DELEGASYON: satırlar her tazelemede yeniden üretiliyor, tek tek
   dinleyici bağlamak silinen satırların dinleyicilerini geride bırakırdı. */
ok('dinleyici satır satır değil, kapsayıcıya bağlı',
   /#introDigerler'\)\.onclick=/.test(tel) && !/b\.onclick=\(\)=>\{ st\.activeId/.test(tel));
/* Açılışta çiziliyor mu — yoksa liste ancak bir ayar değişince görünürdü. */
ok('açılışta liste çiziliyor', /\nintroListeYaz\(\);\nintroCekimYaz\(\);/.test(tel));
/* Senaryo adı değişince satır da tazelenmeli, yoksa eski adı gösterir. */
ok('senaryo değişince liste tazeleniyor',
   /updateStats\(\)\{[\s\S]{0,400}?introListeYaz\(\);/.test(tel));

/* ---------- 5) METİNLER SÖZLÜKTE, İKİ DİLDE ---------- */
{
  const kes=SOZ.search(/\n\s*en:\{/);
  const tr=SOZ.slice(0,kes), en=SOZ.slice(kes);
  for(const k of ['introListeEt','introCekimEt','introSenAc','zSimdi','zDk','zSa','zGun']){
    ok('"'+k+'" iki dilde tanımlı',
       new RegExp(k+":'").test(tr) && new RegExp(k+":'").test(en));
  }
  /* Bağıl zaman yer tutucusu iki dilde aynı olmalı, yoksa bir dilde süslü
     parantez görünür. */
  const al=(blok,k)=>{ const m=blok.match(k+":'((?:[^'\\\\]|\\\\.)*)'");
    return m?[...new Set(m[1].match(/\{\w+\}/g)||[])].sort().join(''):null; };
  for(const k of ['zDk','zSa','zGun'])
    ok('"'+k+'" yer tutucusu iki dilde aynı', al(tr,k)==='{n}' && al(en,k)==='{n}');
}

/* ---------- 6) BAĞIL ZAMAN ---------- */
{
  const f=blokKes(tel,'function bagilZaman(ms){');
  ok('bagilZaman çıkarılabildi', !!f);
  const bz=new Function('t','srY','Date', (f||'')+'; return bagilZaman;')(
    (k)=>({zSimdi:'az önce',zDk:'{n} dk önce',zSa:'{n} sa önce',zGun:'{n} gün önce'}[k]||k),
    (m,d)=>{ for(const x in (d||{})) m=m.split('{'+x+'}').join(d[x]); return m; },
    { now:()=>1000000000 });
  ok('30 sn önce → "az önce"', bz(1000000000-30000)==='az önce');
  ok('5 dk önce', bz(1000000000-5*60000)==='5 dk önce');
  ok('3 saat önce', bz(1000000000-3*3600000)==='3 sa önce');
  ok('2 gün önce', bz(1000000000-2*86400000)==='2 gün önce');
  /* Gelecek tarihli bir kayıt (cihaz saati kayması) "-5 dk önce" dememeli.
     NOT: bu iddianın kasıtlı bozması YOK ve bilerek eklenmedi — `Math.max(0,…)`
     kaldırılsa bile `dk<1` dalı negatifi zaten yakalıyor, yani bozma hiçbir
     şeyi ayırt etmiyordu. Ayırt etmeyen bir bozma, kanıt değil süstür. */
  ok('gelecek tarih negatif göstermiyor', bz(1000000000+90000)==='az önce');
}
