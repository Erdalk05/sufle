/* AKIŞ — kaydırmanın PÜRÜZSÜZLÜĞÜ. Tek kaynak, iki kabuk (2026-08-20).

   NEDEN AYRI BİR MODÜL: "altın kaydırma" `EKSIKLER` listesinde aylardır
   "ölçütü tanımsız" diye duruyordu. Tanımsız bir eksiği kapatmaya çalışmak
   olmayan hatayı onarmaktır; önce ÖLÇÜT yazıldı, sonra kusur arandı.

   ÖLÇÜT: sabit ayarda kaydırma hızı kare kare SIÇRAMAZ. Göz, konumdaki
   değil HIZDAKİ ani değişimi görür — bir karede tam hızdan sıfıra düşen
   metin, "duraklama" değil "takılma" gibi okunur.

   ÖLÇÜLEN ÜÇ KUSUR:
   ① Duraklama işaretleri (`/`, `//`, `(2)`) ve nefes molası akışı TEK KAREDE
      durduruyordu: hız tam değerden sıfıra, sonra yine tek karede tam değere.
      İki sert sıçrama, her paragraf sonunda. En görünür pürüz buydu.
   ② Masaüstünde hız rampası HİÇ YOKTU: telefonda WPM değişince ~200 ms
      yumuşak geçiş var, Mac'te aynı anda sıçrıyordu (canlı hız çubuğu
      tam da bunu yapıyor — sürükledikçe metin zıplıyordu).
   ③ Masaüstünde metin sonundaki yumuşak duruş da yoktu: son satır tam
      hızda gelip aniden kesiliyordu.

   ①'in çözümü ZARF: duraklama süresi boyunca hız 1 → 0 → 1 yolunu
   yumuşak geçişle (smoothstep) izliyor. Hızda basamak kalmıyor.

   ⚠️ ÖLÜ SÜRE KORUNUYOR: iniş ve çıkış sırasında metin bir miktar
   ilerliyor, yani zarf olmadan durulan süre kadar durulmuş SAYILMIYOR.
   Bu yüzden istenen süreye iniş kadar ekleniyor (`duraklamaSuresi`);
   smoothstep'in bir birim penceredeki integrali tam olarak yarım
   olduğundan iniş+çıkış birlikte tam bir `GECIS` kadar ilerleme üretiyor
   ve ölü süre istenene eşitleniyor.

   BU KORUMANIN SEBEBİ ÜRÜNDE: `cekirdek/tempo.js` süre tahminini bu
   duraklamaları TOPLAYARAK yapıyor. Zarf ölü süreyi kısaltsaydı, tahmin
   ile gerçek çekim her nefes işaretinde biraz daha ayrışırdı — telefonda
   düzeltilmiş, ölçülmüş bir kusurun geri gelmesi olurdu. */

/* Geçiş penceresi (ms). 160 seçildi: 60 Hz'de ~10 kare — göz basamağı
   ayırt edemiyor ama duraklamanın kendisi hâlâ "durdu" diye okunuyor.
   Daha uzunu (300+) duraklamayı "yavaşlama" gibi gösteriyor. */
const AKIS_GECIS = 160;

/* Smoothstep: 0'da ve 1'de TÜREVİ SIFIR. Doğrusal geçiş kullansaydım
   basamak konumdan hıza taşınırdı — pürüz yer değiştirir, kaybolmaz. */
function yumusakAdim(x){
  const u = x<0 ? 0 : (x>1 ? 1 : x);
  return u*u*(3-2*u);
}

/* Duraklamanın gerçek süresi: istenen ölü süre + bir geçiş penceresi.
   Kısa duraklamalarda (ör. 120 ms) pencere süreye sığmaz; o zaman
   pencere süreyle birlikte küçülür ve duraklama yine de yumuşak kalır. */
function duraklamaSuresi(istenenMs){
  const m = Math.max(0, +istenenMs || 0);
  return m + Math.min(AKIS_GECIS, m);
}

/* Duraklama zarfı: 0 = tam durdu, 1 = tam hız.
   `t0` duraklamanın başladığı an, `sure` = duraklamaSuresi() sonucu. */
function duraklamaCarpani(gecenMs, sureMs){
  const sure = Math.max(0, +sureMs || 0);
  if(sure<=0) return 1;
  const g = Math.max(0, +gecenMs || 0);
  if(g>=sure) return 1;
  const pencere = Math.min(AKIS_GECIS, sure/2);
  if(pencere<=0) return 0;
  if(g < pencere) return 1-yumusakAdim(g/pencere);          // yavaşla
  const kalan = sure-g;
  if(kalan < pencere) return 1-yumusakAdim(kalan/pencere);  // yeniden hızlan
  return 0;
}

/* Hız rampası — kare hızından BAĞIMSIZ.
   Eski telefon kodu `dt/0.2` doğrusal yaklaşımını kullanıyordu; 0.1 s'ye
   dayanan bir kare (sekme arka plandan dönünce oluyor) katsayıyı 0.5'e
   çıkarıp rampayı yarı yolda bitiriyordu. Üstel biçim her kare süresinde
   AYNI zaman sabitini veriyor. */
function hizRampasi(suanki, hedef, dtSn, tauSn){
  const tau = (tauSn===undefined ? 0.2 : tauSn);
  if(!(tau>0)) return hedef;
  const k = 1-Math.exp(-Math.max(0,dtSn)/tau);
  return suanki + (hedef-suanki)*k;
}

/* Metin sonunda yumuşak duruş: son `mesafe` pikselde hız oransal düşer.
   Sıfıra inmiyor — inseydi son satır hiç gelmezdi (asimptot). */
function frenCarpani(kalanPx, mesafePx){
  const d = mesafePx>0 ? mesafePx : 60;
  if(!(kalanPx<d)) return 1;
  return Math.max(0.18, Math.max(0,kalanPx)/d);
}
