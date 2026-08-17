/* PERDE RENGİNİ KAMERADAN ÖLÇME — ortak hesap, iki kabukta da aynı.

   NEDEN ÇEKİRDEKTE: ölçme yalnız telefonda vardı. Masaüstünde yeşil ekran
   ÇALIŞIYOR (cropCv + WebGL) ama anahtar rengi hazır dört seçenekten
   seçiliyordu; kullanıcının gerçek perdesi o dördünden biri değilse
   silme kenarları kirli kalıyor ve sebebi hiçbir yerde yazmıyordu.

   NEDEN AYNI ZAMANDA BİR DÜZELTME: telefondaki hâli örneği SESSİZCE kabul
   ediyordu. Kullanıcı kamerayı perdeye çevirmeden düğmeye basarsa (ya da
   köşede duvar/omuz varsa) ortalama, perdenin rengi DEĞİL karışık bir renk
   çıkıyor; yeşil ekran bundan sonra hiç tutmuyor ve kullanıcı "özellik
   bozuk" diye düşünüyor. Bu deponun 6 numaralı hata sınıfının kardeşi:
   sessizce yanlış sonuç. Artık örneğin TEK RENK olup olmadığı ölçülüyor.

   BURADA OLMAYAN: kareyi kameradan alan tuval ve toast'ı basan kabuk. */

/* Örnek ızgarası: 32×32 = 1024 piksel. Karenin sol üst %18'lik bölgesi
   küçültülerek buraya çiziliyor — perde genelde arkada ve geniş, yüz ise
   ortada. (Bölge seçimi kabukta, çünkü kamera ölçüsünü o biliyor.) */
const KROMA_IZGARA = 32;

/* SAPMA EŞİĞİ — 0..255 ölçeğinde kanal başına ortalama mutlak sapma.
   ÖLÇÜLDÜ (sentetik karelerle, tests/177):
     · düz yeşil perde                       → sapma 0
     · hafif gölgeli/kırışık gerçek perde    → ~6-14 (kabul, yeşil ekran tutar)
     · perdenin yarısı + duvar               → ~35+
     · yüz/omuz karışmış kare                → ~40+
   Eşik 22: kırışık perdeyi geçirir, iki farklı yüzeyi geçirmez. Gevşetmek
   "renk ölçüldü" deyip yanlış anahtar yazmak demek — sessiz yanlış sonuç. */
const KROMA_SAPMA_ESIK = 22;

/* RGBA dizisinden ortalama renk + tek renk olup olmadığı.
   `sapma` kanal başına ortalamadan ortalama mutlak uzaklık: tek renkli
   yüzeyde 0'a yakın, iki farklı yüzey karışınca hızla büyüyor. Standart
   sapma yerine mutlak sapma: aynı işi görüyor ve tek geçişte hesaplanıyor. */
function kromaOrnekle(d){
  const px=d.length/4;
  let r=0,g=0,b=0;
  for(let i=0;i<d.length;i+=4){ r+=d[i]; g+=d[i+1]; b+=d[i+2]; }
  r/=px; g/=px; b/=px;
  let fark=0;
  for(let i=0;i<d.length;i+=4)
    fark+=Math.abs(d[i]-r)+Math.abs(d[i+1]-g)+Math.abs(d[i+2]-b);
  const sapma=fark/(px*3);
  const hex='#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  return {hex, r, g, b, sapma};
}

/* Örnek kabul edilebilir mi. Ayrı fonksiyon, çünkü iki kabuk da aynı
   soruyu soruyor ve eşiğin tek yerde yaşaması şart. */
function kromaTekRenkMi(o){ return o.sapma <= KROMA_SAPMA_ESIK; }
