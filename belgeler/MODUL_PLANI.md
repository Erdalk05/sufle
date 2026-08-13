# Sufle — modül planı (2026-08-08, zanaat gözüyle)

Rakip listesi değil. Prompter'dan okumanın **neden kötü ses verdiği** ve bizim hâlâ nerede
yardım etmediğimiz üzerinden çıkarıldı. Her modülün yanında: değer, maliyet, sunucu gerekir mi.

---

## A. Senaryo işaretleme dili ✅ v3.1'de yapıldı
Profesyonel prompter operatörleri metni işaretler: vurgu, duraklama, tonlama.
Bizde yalnız `#` başlık ve `[not]` vardı.
- `*kelime*` → **vurgu** (renk + kalınlık) — nereye basacağını görürsün
- `/` → kısa duraklama (0,35 sn) · `//` → uzun duraklama (0,8 sn)
- `(2)` → 2 saniye bekle (sufle gerçekten durur)
Motor duraklamaları **gerçekten uyguluyor**; nefes noktalarını sen belirliyorsun.
Değer: yüksek · Maliyet: düşük · Sunucu: yok

## B. Konuşulabilirlik denetimi ✅ v3.1'de yapıldı
Metni okumadan önce nesnel denetim (yapay zekâ yok, tamamen yerel):
uzun cümle (>20 kelime), uzun kelime (>4 hece), dolgu kelime (şey/yani/aslında/işte/hani),
aynı kelimenin tekrarı, rakam ve kısaltma (sesli okunuşu yazılmalı), hedef süreye sığma
("60 sn için 18 kelime fazla").
Değer: yüksek — metin daha okunur hâle gelince prompter sesi kaybolur · Maliyet: düşük

## C. Biyonik okuma ✅ v3.1'de yapıldı
Her kelimenin ilk %40'ı kalın → göz kelimeyi tanıyıp atlıyor, prompter'da okuma hızı artıyor.
Erdal'ın hızlı okuma projeleriyle (fREADo/Sprinta) aynı temel.
Değer: orta-yüksek · Maliyet: çok düşük

---

## Sıradaki (D ve E bitti — kalanlar)

## D. Işık ve çerçeve denetçisi ✅ v3.2'de yapıldı
Kameradan 32×32 örnek alıp histogram çıkarmak: yüz karanlık mı, arkadan ışık mı geliyor,
kontrast düşük mü. "Yüzün karanlık — ışığı öne al" gibi somut uyarı.
Ayrıca DeviceMotion ile "telefon 4° eğik / titriyor" uyarısı.
Değer: yüksek (kötü çekimlerin çoğu ışıktan) · Maliyet: orta · Sunucu: yok

## E. Bölüm bölüm çekim ✅ v3.3'te yapıldı
Sufle her `#` bölüm sonunda otomatik duruyor; her bölümü ayrı çekiyorsun.
Reels/Shorts'ta standart yöntem. Bölüm bölüm "çekildi ✓" takibi.
Değer: yüksek · Maliyet: düşük-orta

## F. Zorlanma haritası ✅ v3.4'te yapıldı
Her provada kelime geçiş anlarını zaten kaydediyoruz. Birden fazla okumayı üst üste koyup
"hep burada yavaşlıyorsun" diyen bir harita çıkarabiliriz → o cümleyi yeniden yaz.
Bunu yapan rakip görmedim; verisi elimizde.
Değer: yüksek (özgün) · Maliyet: orta

## G. Yayın paketi
Video + .srt + senaryo metni + başlık/açıklama/etiket şablonu tek klasör olarak dışa aktarma.
Şablon `#` başlıklarından ve ilk cümleden üretilir (yapay zekâ gerekmez).
Değer: orta-yüksek · Maliyet: düşük-orta

## H. Gömülü altyazı ✅ v3.6'da yapıldı
Kompozit altyapı hazır; kuyruk metnini tuvale çizmek yeterli. Reels/Shorts'ta altyazı şart.
Değer: yüksek · Maliyet: orta · ⚠️ iOS'ta ısı/pil ölçülmeli

## I. Röportaj modu
Soru listesi; her soruda sayaç, dokununca sıradaki soru. Konuk çekimleri için.
Değer: orta · Maliyet: düşük

## J. İki dilli senaryo
Aynı senaryonun TR/EN sürümü, tek dokunuşla geçiş — iki dilli içerik üretimi için.
Değer: orta (Erdal'ın işlerinde iki dillilik var) · Maliyet: düşük

## K. Telaffuz ipuçları
`Nietzsche{ni-çe}` → küçük puntoyla üstte okunuş. Yabancı isim/terim geçen metinlerde.
Değer: orta · Maliyet: düşük

## L. Ses kırpma uyarısı (canlı) — sıradaki
Kayıt sırasında tepe seviyesi kırpma sınırındaysa kırmızı uyarı — sesi sonradan kurtarmak zor.
Seviye ölçer altyapısı hazır.
Değer: orta-yüksek · Maliyet: çok düşük

---

## Sunucu/hesap gerektirenler — Erdal kararı bekliyor
- Bulut senkron + çok cihaz + takım onayı
- İkinci cihazı kumanda yapmak (relay, Vercel'de ~30 satır)
- AI senaryo yazımı / AI göz teması (API anahtarı ya da dış araç)
- Yeşil ekran olmadan arka plan değiştirme (segmentasyon modeli, ~3 MB, telefonda ağır)

---

## Ek olarak yapılanlar (planda yoktu, ihtiyaçtan çıktı)
- Kayıt göstergesi + duraklat/devam et (v3.5)
- Ana ekranda görünür hız kontrolü (v3.7)
- Çekim öncesi hazırlık kontrolü (v3.8)
- Kırpma + sonuç ekranı sadeleşmesi (v3.9)
- Fotoğraflara kaydetme tanısı (v4.0)
- Cihaz uyumluluk paneli + Android kurulum/titreşim (v4.1)
- Mac: orana kırparak kayıt, altyazı kayması arayüzü
