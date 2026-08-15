const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,blokKes,cekirdekOku}=require('./kaynak');
const telHam=oku(telefonYolu()), macHam=oku(macYolu());
const yorumsuz=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const tel=yorumsuz(telHam), mac=yorumsuz(macHam);

/* G.13 — ERİŞİLEBİLİR YAZI TİPİ SEÇİMİ.

   ÖLÇÜM PLANI İKİ KEZ DÜZELTTİ. Plan "bugün tek Disleksi anahtarı var,
   dört aile ekle" diyordu; ölçünce TELEFONDA DA MACTE DE BEŞ AİLE çıktı
   (sistem · serif · yumuşak · mono · disleksi). Grep sayımının kanıt
   olmadığı kuralının bir vakası daha.

   GERÇEK TARAYICIDA ÖLÇÜLDÜ (Chrome, 430 px, uzun Türkçe kelimeler:
   Cumhurbaskanligi, elektroensefalografi, akranlarindan, gozlugumu):
     5 aile × 3 punto (46 / 72 / 110) → BÖLÜNEN KELİME 0 · TAŞAN 0
     küçültülen kelime 3-15 · en küçük çizilen punto 31 px (taban 22 px)
   Yani kabul ölçütü zaten sağlanıyordu; G.1in ölç-küçült döngüsü aileden
   bağımsız çalışıyor çünkü CANLI ölçüm yapıyor, tabloya bakmıyor.

   GERÇEK BOŞLUK BAŞKA YERDEYDİ: Macte KALINLIK ve HARF ARALIĞI yoktu
   (telefonda ikisi de vardı) ve telefonda Mono düğmesi çevrilmemişti. */

const AILELER=['system','serif','round','mono','dys'];

/* ---------- 1) BEŞ AİLE İKİ KABUKTA DA VAR ---------- */
{
  for(const a of AILELER){
    ok('telefon: '+a+' ailesi seçilebiliyor', new RegExp('data-f="'+a+'"').test(telHam));
    ok('masaüstü: '+a+' ailesi seçilebiliyor', new RegExp('data-fam="'+a+'"').test(macHam));
  }
  /* HER AİLENİN GERÇEK BİR FONT YIĞINI OLMALI: seçenek var ama CSS yoksa
     "açık ama hiçbir şey olmuyor" sınıfına düşer. */
  for(const a of AILELER){
    if(a==='system'){
      ok('telefon: system ailesi varsayılan yığını kullanıyor', /-apple-system/.test(tel));
      ok('masaüstü: system ailesi varsayılan yığını kullanıyor', /-apple-system/.test(mac));
      continue;
    }
    ok('telefon: '+a+' için font yığını tanımlı', new RegExp('f-'+a+'\\s*#scroller\\{font-family').test(tel));
    ok('masaüstü: '+a+' için font yığını tanımlı', new RegExp('data-fam='+a+'\\]\\s*#scroller\\{font-family').test(mac));
  }
}

/* ---------- 2) DIŞ FONT İNDİRİLMİYOR ---------- */
{
  /* KARAR KORUNUYOR (OpenDyslexic ~150 KB/ağırlık, ölçülerek elendi):
     tek dosya ve sıfır bağımlılık sözü, bir yazı tipi için bozulmaz.
     Disleksi seçeneği SİSTEMDE ZATEN OLAN ailelerle karşılanıyor. */
  for(const [ad,kod] of [['telefon',tel],['masaüstü',mac]]){
    ok(ad+': @font-face yok', !/@font-face/.test(kod));
    ok(ad+': fonts.googleapis kullanılmıyor', !/fonts\.googleapis|fonts\.gstatic/.test(kod));
    ok(ad+': .woff indirilmiyor', !/\.woff2?/.test(kod));
    ok(ad+': OpenDyslexic gömülmedi', !/OpenDyslexic/i.test(kod));
    /* Disleksi seçeneği yine de GERÇEK bir ailenin üstünde durmalı. */
    ok(ad+': disleksi seçeneği sistem ailesine dayanıyor', /Comic Sans MS|Chalkboard SE/.test(kod));
  }
}

/* ---------- 3) KALINLIK VE HARF ARALIĞI (parite) ---------- */
for(const [ad,ham,kod,dev] of [['telefon',telHam,tel,'st'],['masaüstü',macHam,mac,'state']]){
  ok(ad+': kalınlık ayarı var', /id="weight"/.test(ham));
  ok(ad+': harf aralığı ayarı var', /id="(ls|track)"/.test(ham));
  /* İki kabuk aynı işi FARKLI adlarla tutuyor (telefon `ls`, Mac `track`);
     iddia ADA değil, ayarın gerçekten duruma yazılıp CSS değişkenine
     bağlanmasına bakıyor. */
  ok(ad+': kalınlık CSS değişkenine bağlanıyor', /setProperty\('--(p?)[Ww]eight'/.test(kod));
  ok(ad+': harf aralığı CSS değişkenine bağlanıyor', /setProperty\('--(pTrack|ls)'/.test(kod));
  /* HARF ARALIĞI METNİ UZATIR: yeniden ölçülmezse akışın sınırı eski kalır
     ve metnin SON SATIRLARI hiç görünmeden akış biter. Bu, telefonda bir kez
     ölçülüp düzeltilmiş bir kusur; Macte de aynı korumayla açılıyor. */
  ok(ad+': aralık değişince yeniden ölçülüyor', /measure\(\)/.test(kod));
}
{
  /* Mac tarafı yeni: değişkenler CSS'e gerçekten bağlanmış mı. */
  ok('Mac kalınlık değişkeni tanımlı', /--pWeight:/.test(mac));
  ok('Mac harf aralığı değişkeni tanımlı', /--pTrack:/.test(mac));
  ok('Mac sufle kalınlığı değişkenden geliyor', /font-weight:var\(--pWeight\)/.test(mac));
  ok('Mac sufle harf aralığı değişkenden geliyor', /letter-spacing:var\(--pTrack\)/.test(mac));
  ok('Mac kalınlık duruma yazılıyor', /setProperty\('--pWeight'/.test(mac));
  ok('Mac harf aralığı em birimine çevriliyor', /--pTrack'.*em/.test(mac));
  /* Sabit 650 kalıntısı kalmamalı: kalırsa ayar ölü olur. */
  ok('Mac sabit kalınlığa dönmedi', !/font-weight:650;/.test(mac));
}

/* ---------- 4) SEÇENEKLERİN ADI ÇEVRİLİ ---------- */
{
  const sozluk=cekirdekOku('sozluk.js','SUFLE_SOZLUK');
  for(const k of ['fSystem','fSerif','fRound','fDys','weight','tracking','mMono']){
    const bul=[...sozluk.matchAll(new RegExp(k+":'([^']*)'",'g'))].map(m=>m[1]);
    ok('sözlükte '+k+' iki dilde', bul.length===2);
  }
  /* TELEFONDA MONO ÇEVRİLMEMİŞTİ: düğme metni sabit yazılıydı, yani
     İngilizce arayüzde de Türkçe listede de aynı sabit metin görünüyordu.
     Küçük ama i18n kapsamının kör noktası (bu depoda bir kez daha çıkmıştı). */
  ok('telefon: mono düğmesi sözlüğe bağlı', /data-f="mono" data-i18n="mMono"/.test(telHam));
  ok('masaüstü: mono düğmesi sözlüğe bağlı', /data-fam="mono" data-i18n="mMono"/.test(macHam));
}

/* ---------- 5) SIĞDIRMA AİLEDEN BAĞIMSIZ ---------- */
for(const [ad,kod] of [['telefon',tel],['masaüstü',mac]]){
  const govde=blokKes(kod,'function kelimeSigdir(');
  ok(ad+': kelimeSigdir çıkarılabildi', !!govde);
  if(!govde) continue;
  /* ASIL SEBEP: sığdırma CANLI ölçüyor (getBoundingClientRect / offsetWidth),
     yani hangi aile seçilirse seçilsin doğru sonucu verir. Font tablosuna
     bakan bir çözüm, yeni bir aile eklenince sessizce yanılırdı. */
  ok(ad+': sığdırma canlı ölçümle çalışıyor', /offsetWidth|getBoundingClientRect/.test(govde));
  ok(ad+': aileye göre sabit tablo kullanılmıyor', !/serif|mono|dys/.test(govde));
  /* Taban MUTLAK piksel: oran taban büyük puntoda gerçek kelimeyi
     sığdıramıyordu (ölçülmüş karar, G.1). Sabit fonksiyonun dışında
     tanımlı, o yüzden dosya genelinde aranıyor. */
  ok(ad+': taban mutlak piksel olarak tanımlı', /SIG_TABAN_PX\s*=\s*22/.test(kod));
  ok(ad+': sığdırma o tabanı kullanıyor', /SIG_TABAN_PX/.test(govde));
}
