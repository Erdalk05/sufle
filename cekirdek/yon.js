/* METİN YÖNÜ — sağdan sola diller (G.12). TEK KAYNAK.

   ÖLÇÜLEN BAŞLANGIÇ (2026-08-16): uygulamada `dir` ile ilgili tek bir satır
   yoktu. Arapça, İbranice ya da Farsça bir senaryo yapıştırıldığında
   tarayıcı harfleri doğru çiziyor ama SATIR SOLDAN başlıyor, noktalama
   yanlış uca düşüyor ve karışık cümlede (Arapça + Latin rakam) sıra bozuk
   görünüyordu. Rakipte (teleprompter.com) sağdan sola destek satılıyor.

   Yön kararı SATIR SATIR verilir, senaryonun tamamına değil: iki dilli bir
   metinde her satırın kendi yönü vardır ve tek bir yön dayatmak yarısını
   bozar. Kural Unicode bidi P2/P3in sadeleştirilmiş hâli: ilk GÜÇLÜ
   karakter yönü belirler; güçlü karakter yoksa yön nötrdür (auto). */

/* Arapça, İbranice, Farsça/Urduca, Süryanice, Tana ve ilgili sunum
   biçimleri. Aralıklar Unicode blok sınırlarıdır. */
const RTL_ARALIK = /[֐-׿؀-ۿ܀-ݏݐ-ݿހ-޿ࢠ-ࣿיִ-﷿ﹰ-﻿]/;
/* Latin, Yunan, Kiril, Ermeni ve Türkçe harfler (güçlü soldan sağa). */
const LTR_ARALIK = /[A-Za-zÀ-ʯͰ-֏Ḁ-῿]/;
/* Yönü belirlemeyen ama metinde sık geçenler: rakamlar, noktalama,
   işaretleme dilimizin karakterleri (# * / ( ) [ ] { }). */

/* NOT: bir zamanlar burada `rtlHarfVar` diye ikinci bir yardımcı vardı ve
   hiçbir yerde kullanılmıyordu — kapı haklı olarak ölü kod dedi. `metinYonu`
   zaten aynı soruyu daha kesin yanıtlıyor (ilk GÜÇLÜ karakter kuralı). */

/* Satırın yönü: ilk güçlü karaktere bakar.
   Dönüş 'rtl' | 'ltr' | 'auto' — 'auto' yön belirleyen harf YOK demektir
   (yalnız rakam, noktalama ya da işaret). Orada yön dayatmak yanlış olur;
   tarayıcının kendi kuralı daha doğrudur. */
function metinYonu(metin){
  const s=String(metin||'');
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(RTL_ARALIK.test(c)) return 'rtl';
    if(LTR_ARALIK.test(c)) return 'ltr';
  }
  return 'auto';
}

/* Cümle sonu noktalaması — RTL dillerde farklı işaretler kullanılıyor:
   Arapça soru işareti (؟ U+061F), Arapça nokta (۔ U+06D4), İbranice sof
   pasuk (׃ U+05C3) ve maqaf sonrası. Latin işaretler de geçerli çünkü
   Arapça metinlerde sık kullanılıyorlar.
   ÖLÇÜLDÜ: bu işaretler eklenmeden Arapça senaryoda altyazı ve klip
   sınırları HİÇ oluşmuyordu — cümle sonu bulunamıyor, klip üretilmiyordu. */
const CUMLE_SONU_RE = /[.!?…؟۔׃]["')\]]?$/;
function cumleSonuMu(kelime){ return CUMLE_SONU_RE.test(String(kelime||'')); }

/* Karaoke parçalarının GÖRSEL sırası. Soldan sağa metinde okuma sırası
   ile görsel sıra aynıdır; sağdan solada TERSTİR.
   Bunu atlamak, RTL bir cümlede vurgunun cümlenin YANLIŞ UCUNDA yanması
   demek — kullanıcı okuduğu kelimeyi değil, karşı uçtakini vurgulu görür. */
function gorselSira(parcalar, yon){
  const p=Array.isArray(parcalar)?parcalar.slice():[];
  return yon==='rtl' ? p.reverse() : p;
}
