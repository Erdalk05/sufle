# Sufle — 20 başlıkta durum değerlendirmesi (2026-08-08, v4.3)

Ölçek: ✅ olgun · 🟡 çalışıyor ama eksiği var · 🔴 yok / zayıf

| # | Konu | Durum | Nerede duruyoruz | Eksik / sıradaki |
|---|---|---|---|---|
| 1 | Kaydırma motoru | ✅ | Delta-time, gerçek WPM, nefes durakları, kare hızından bağımsız | Yok denecek kadar az |
| 2 | Göz teması / okunabilirlik | ✅ | Okuma şeridi (1/2/3 satır), bakış açısı ölçeri, reçete, disleksi+biyonik | AI bakış düzeltmesi mimari olarak imkânsız (dış araç) |
| 3 | Senaryo yönetimi | ✅ | Sınırsız senaryo, kaldığın yer, dosyadan içe aktarma, JSON yedek | .docx/.pdf içe aktarma; bulut senkron (sunucu) |
| 4 | Metin işaretleme dili | ✅ | `#` başlık, `[not]`, `*vurgu*`, `/` `//` `(2)` gerçek duraklama | Telaffuz ipucu (`kelime{o-ku-nuş}`) |
| 5 | Metin kalitesi araçları | ✅ | Konuşulabilirlik denetimi, zorlanma haritası, tempo ölçeri | Yeniden yazma önerisi (AI gerektirir) |
| 6 | Sesle takip | 🟡 | Pencere eşleştirme, 2 kelime eşiği, geri arama, hız tavanı | **Gerçek mikrofonla hiç denenmedi** |
| 7 | Sesli komut | 🟡 | "sufle başla/dur/hızlan/başa dön/kaydet", TR/EN/DE/AR | Aynı şekilde cihazda doğrulanmadı |
| 8 | Fiziksel kumanda | ✅ | Öğrenmeli tuş eşleme — her marka kumandayla | Ses tuşu gönderen kumandalar web'e ulaşmıyor (iOS sınırı) |
| 9 | İkinci cihazdan kumanda | 🔴 | Mac'te yerel sunucuyla var, telefonda yok | Relay sunucusu gerekir (~30 satır, Vercel) — **Erdal kararı** |
| 10 | Kamera kontrolü | 🟡 | 720p/1080p/4K, ön-arka, zoom, fener, kılavuzlar | Zoom/fener yalnız destekleyen cihazda; odak/pozlama kilidi yok |
| 11 | Ses yolu | 🟡 | Ham ses seçeneği, mikrofon yok uyarısı, canlı seviye ölçer | **Canlı kırpma (clipping) uyarısı yok** — sıradaki |
| 12 | Kayıt güvenilirliği | ✅ | MP4 önceliği, saniyelik parçalar, duraklat/devam, otomatik arşiv, KAYITTA göstergesi | — |
| 13 | Kırpma / kompozit | ✅ | Telefon ve Mac'te seçilen oran videoya gerçekten uygulanıyor | iOS'ta ısı/pil uzun çekimde ölçülmedi |
| 14 | Yeşil ekran ve arka plan | 🟡 | Chroma key + despill + 6 hazır arka plan + görsel | **Yeşil ekransız arka plan değiştirme yok** (segmentasyon modeli gerekir) |
| 15 | Altyazı | ✅ | Okuma zamanlamasından .srt (yazım %100 doğru) + videoya gömme | Gömme yalnız telefonda; Mac'te yok |
| 16 | Çekim öncesi denetim | ✅ | Işık/arkadan ışık/patlama/kontrast/eğim + hazırlık kontrolü (✅) | Yüz konumu/kadraj denetimi (yüz algılama gerekir) |
| 17 | Çekim sonrası düzenleme | 🔴 | Baştan/sondan kesme var ama **iOS Safari desteklemiyor** | iOS'ta kesme ancak Fotoğraflar'da (kayıpsız, daha iyi); uygulama içi için WebCodecs |
| 18 | Dışa aktarım / paylaşım | 🟡 | Paylaş menüsü + Dosyalar yedek yolu + ekranda tanı satırı | **"Fotoğraflara kaydetmiyor" sorunu hâlâ doğrulanmadı** — tanı satırı bekleniyor |
| 19 | Platform kapsama / parite | 🟡 | iOS+Android (PWA), Mac+Windows (yerel dosya) | Mac'te yok: altyazı gömme, çekim arşivi, kaldığın yer, hazırlık kontrolü, despill/arka plan seti |
| 20 | Erişilebilirlik ve dil | 🟡 | TR/EN tam, disleksi fontu, biyonik okuma, büyük dokunma hedefleri | Ekran okuyucu etiketleri, yüksek kontrast teması, 3. dil |

## Genel değerlendirme

**Çekirdek ürün olgun.** 20 başlığın 10'u ✅, 8'i 🟡, 2'si 🔴. Kalan eksiklerin çoğu üç kovaya düşüyor:

1. **Cihazda doğrulanmamışlar** (6, 7, 13, 18) — kod hazır, gerçek telefonla test bekliyor. Bunlar "eksik" değil,
   "kanıtlanmamış". En kritiği 18: paylaşım sorunu hâlâ açık.
2. **Platform sınırları** (2 AI göz teması, 14 yeşil ekransız arka plan, 17 iOS kesme) — tarayıcıda çözülemez;
   ya dış araç ya yerel uygulama gerekir. Bunları "yapılacak" listesinde tutmak yanıltıcı olur.
3. **Sunucu/hesap gerektirenler** (9 ikinci cihaz kumandası, 3 bulut senkron, 5 AI yeniden yazma) —
   teknik değil, karar meselesi.

**Kendi başıma ilerletebileceğim gerçek kuyruk kısa:**
- Canlı ses kırpma uyarısı (11)
- Telaffuz ipuçları (4)
- Mac paritesi: despill + arka plan seti + altyazı gömme + hazırlık kontrolü (19)
- Röportaj modu ve yayın paketi (modül planından kalanlar)
- Erişilebilirlik: ekran okuyucu etiketleri, yüksek kontrast (20)

**Bitti mi?** Ürün olarak kullanılabilir ve rakiplerin çoğundan fazlasını yapıyor. Ama "bitti" demek için
önce 1. kovadaki dört maddenin gerçek cihazda kanıtlanması gerekiyor — özellikle paylaşım.
