/* SENARYO ETİKETLERİ — "klasör"ün yerine geçen tek kavram.

   NEDEN KLASÖR DEĞİL (karar, eksiklik değil): rakiplerde senaryolar KLASÖRE
   konuyor. Klasör tek üyelik demektir: "Reels" klasörüne koyduğun senaryo
   aynı anda "Müşteri A"da olamaz, kullanıcı ikisinden birini seçmek ya da
   kopya tutmak zorunda kalır — kopya tutmak bu depoda veri kaybının bilinen
   yolu. Etiket çok üyeliğe izin verir ve tek etiket seçildiğinde ekranda
   klasörün yaptığı işi aynen yapar. Yani klasör, etiketin dar hâli.

   TUTULAN TEK ALAN `s.tags` (dizi). G.8'in "ölçülebiliyorsa tutma, türet"
   kuralı burada UYGULANMAZ ve sebebi var: bir senaryonun hangi işe ait
   olduğu metinden türetilemez — bu kullanıcının kafasındaki bilgidir.
   Türetilebilen her şey (kelime, süre, son değişiklik, çekim sayısı) zaten
   türetiliyor; bu alan onların yerine değil, yanına geliyor.

   ⚠️ ANAHTAR DİLDEN BAĞIMSIZ. Karşılaştırma anahtarı `L` (arayüz dili)
   okumaz. Okusaydı arayüzü TR'den EN'e alan kullanıcının etiketleri
   SESSİZCE yeniden bölünürdü: `toLocaleLowerCase('tr')` ile "İŞ" → "iş",
   `('en')` ile "i̇ş" — aynı etiket iki ayrı kutuya düşer ve kimse sebebini
   bulamaz. Katlama burada elle ve sabit yazılı.

   SINIRLAR VE GEREKÇELERİ:
     · Senaryo başına en çok 6 etiket: liste satırında etiketler tek satıra
       sığmalı; 7. etiket satırı ikiye böler ve özet metni ezer (aynı bütçe
       kavgası 2026-08-17'de kart özetinde ölçüldü).
     · Etiket en çok 24 karakter: jeton çubuğu yatay kaydırma gerektirmesin.
     · Boş ve yalnız noktalama olan etiket atılır — anahtarı boş olan bir
       etiket bütün senaryolarla eşleşirdi.
     · Aynı etiketin farklı yazımı (İŞ / iş / Iş) TEK etikettir; ekranda
       kullanıcının İLK yazdığı biçim durur. */

const ETIKET_EN_COK = 6;
const ETIKET_EN_UZUN = 24;

/* Karşılaştırma anahtarı. Dilden bağımsız, elle katlanmış Türkçe. */
function etiketAnahtar(x){
  const kat={'İ':'i','I':'i','ı':'i','Ç':'c','ç':'c','Ğ':'g','ğ':'g',
             'Ş':'s','ş':'s','Ö':'o','ö':'o','Ü':'u','ü':'u',
             'Â':'a','â':'a','Î':'i','î':'i','Û':'u','û':'u','É':'e','é':'e'};
  return String(x||'')
    .replace(/[İIıÇçĞğŞşÖöÜüÂâÎîÛûÉé]/g, c=>kat[c])
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu,'');
}

/* Kullanıcının yazdığı satırı etiket dizisine çevir.
   Ayraç: virgül ya da boşluklu `#` — ikisi de yaygın alışkanlık.
   Dönen dizi TEMİZ: boşlar atılmış, tekrarlar tek, sayı ve uzunluk sınırlı. */
function etiketAyristir(ham){
  const parcalar=String(ham||'').split(/[,\n;]+|\s+#/);
  const gorulen=new Set(), out=[];
  for(let p of parcalar){
    p=String(p).replace(/^\s*#/,'').trim().replace(/\s+/g,' ');
    if(p.length>ETIKET_EN_UZUN) p=p.slice(0,ETIKET_EN_UZUN).trim();
    const a=etiketAnahtar(p);
    if(!a) continue;                       // boş ya da yalnız noktalama
    if(gorulen.has(a)) continue;           // aynı etiketin ikinci yazımı
    gorulen.add(a); out.push(p);
    if(out.length>=ETIKET_EN_COK) break;
  }
  return out;
}

/* Diziyi kullanıcının düzenleyeceği satıra çevir (giriş kutusunun değeri). */
function etiketYaz(dizi){
  return (Array.isArray(dizi)?dizi:[]).join(', ');
}

/* Bütün senaryolardan etiket tablosu: [{ad, n}] — çok kullanılan önde.
   Eşitlikte ada göre: sıra her çizimde aynı olmalı, yoksa jetonlar
   kullanıcının gözünün önünde yer değiştirir ve yanlış jetona basılır. */
function etiketTablo(scripts){
  const say=new Map(), ad=new Map();
  for(const s of (Array.isArray(scripts)?scripts:[])){
    for(const e of etiketAyristir(etiketYaz(s && s.tags))){
      const a=etiketAnahtar(e);
      if(!ad.has(a)) ad.set(a,e);          // ilk yazım ekranda kalır
      say.set(a,(say.get(a)||0)+1);
    }
  }
  return [...say.entries()]
    .map(([a,n])=>({ad:ad.get(a), anahtar:a, n}))
    .sort((x,y)=> y.n-x.n || x.ad.localeCompare(y.ad,'tr'));
}

/* Seçili etikete göre süz. Seçili yoksa liste olduğu gibi döner. */
function etiketSuz(scripts, secili){
  const a=etiketAnahtar(secili);
  const liste=Array.isArray(scripts)?scripts:[];
  if(!a) return liste.slice();
  return liste.filter(s=>(Array.isArray(s&&s.tags)?s.tags:[])
    .some(e=>etiketAnahtar(e)===a));
}

/* SEÇİLİ ETİKET KAYBOLABİLİR: onu taşıyan son senaryo silinince ya da
   etiketi kaldırılınca seçim ekranda kalırsa liste SONSUZA KADAR BOŞ
   görünür ve kullanıcı senaryolarını kaybettiğini sanır — bu deponun
   "arayüz var olmayan bir şeyi söylüyor" sınıfı. Seçim o anda düşer. */
function etiketSeciliGecerli(secili, tablo){
  const a=etiketAnahtar(secili);
  if(!a) return '';
  return (Array.isArray(tablo)?tablo:[]).some(x=>x.anahtar===a) ? secili : '';
}
