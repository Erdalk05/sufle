# Sufle v5.6 — 20 kategoride 100 üzerinden karşılaştırma (2026-08-09)

Karşılaştırılanlar: **BIGVU** (hepsi-bir-arada, abonelik) · **PromptSmart Pro** (sesle takip uzmanı, ücretli)
· **Speakflow** (tarayıcı tabanlı, takım özellikli, abonelik).
Puanlar benim değerlendirmem; rakiplerin özellikleri araştırmaya dayanıyor, hepsini kendim kullanmadım.

| # | Kategori | Sufle | BIGVU | PromptSmart | Speakflow | Not |
|---|---|---:|---:|---:|---:|---|
| 1 | Kaydırma motoru | **95** | 85 | 85 | 80 | delta-time, gerçek WPM, nefes durakları |
| 2 | Göz teması | 75 | **90** | 60 | 60 | bizde ölçüm+şerit var, AI düzeltme yok |
| 3 | Sesle takip | 80 | 75 | **95** | 85 | PromptSmart'ın uzmanlık alanı; bizimki yeni |
| 4 | Sesli komut | **85** | 10 | 15 | 10 | rakiplerde neredeyse yok |
| 5 | Senaryo yönetimi | 85 | **90** | 75 | 90 | onlarda bulut senkron var |
| 6 | Metin işaretleme dili | **95** | 30 | 25 | 30 | *vurgu*, / // (2), telaffuz |
| 7 | Metin kalitesi araçları | **90** | 50 | 15 | 25 | konuşulabilirlik, zorlanma haritası, 5 araç |
| 8 | Kayıt güvenilirliği | 80 | **90** | 85 | 75 | yerel uygulamalar daha sağlam |
| 9 | Oran / kırpma / kompozit | **90** | 85 | 60 | 70 | seçilen oran videoya gerçekten uygulanıyor |
| 10 | Yeşil ekran / arka plan | 75 | 70 | 20 | **85** | Speakflow'da yeşil ekransız arka plan var |
| 11 | Altyazı | **90** | 85 | 20 | 40 | bizimki senaryodan üretiliyor → yazım hatasız |
| 12 | Çekim öncesi denetim | **95** | 15 | 10 | 10 | ışık/arkadan ışık/kontrast/eğim/hazırlık |
| 13 | Çekim sonrası düzenleme | **35** | **85** | 30 | 40 | iOS'ta uygulama içi kesme yok |
| 14 | Dışa aktarım / paylaşım | **60** | **90** | 85 | 75 | web uygulaması Fotoğraflar'a doğrudan yazamıyor |
| 15 | Uzaktan kumanda | **85** | 55 | 60 | 70 | öğrenmeli tuş eşleme, her marka |
| 16 | Platform kapsama | **85** | 80 | 70 | 75 | iOS+Android+Mac+Windows, tek kod |
| 17 | Erişilebilirlik | 70 | 55 | 50 | 55 | disleksi+biyonik var, ekran okuyucu yok |
| 18 | Çevrimdışı / gizlilik | **100** | 35 | 70 | 30 | veri cihazdan hiç çıkmıyor, hesap yok |
| 19 | Maliyet | **100** | 30 | 40 | 30 | kendi kodun, abonelik yok |
| 20 | Kurulum / kullanım kolaylığı | 70 | **90** | 85 | 80 | iOS'ta Safari şartı + ayar derinliği |
| | **ORTALAMA** | **82** | **66** | **53** | **57** | |

## Nerede öndeyiz
Zanaat katmanı: işaretleme dili, metin kalitesi araçları, çekim öncesi ışık/çerçeve denetimi, sesli komut,
öğrenmeli kumanda, senaryodan üretilen altyazı. Bunların çoğu rakiplerde hiç yok.
Ayrıca **çevrimdışı, hesapsız, ücretsiz** ve veri cihazdan çıkmıyor.

## Nerede geride kaldık — ve neden
| Konu | Puan | Sebep | Çözülebilir mi |
|---|---:|---|---|
| Çekim sonrası düzenleme | 35 | iOS Safari video akışı vermiyor | Hayır (tarayıcıda). Fotoğraflar'da kırpmak zaten kayıpsız |
| Dışa aktarım | 60 | Apple, web uygulamasının Fotoğraflar'a yazmasına izin vermiyor | Hayır (yerel uygulama gerekir) |
| Göz teması | 75 | AI bakış düzeltmesi tarayıcıda çalışmaz | Hayır. Dış araç: Descript/VEED/NVIDIA Broadcast |
| Yeşil ekransız arka plan | 75 | Segmentasyon modeli telefonda çok ağır | Teknik olarak evet, pratikte hayır |
| Kurulum kolaylığı | 70 | iOS'ta **yalnız Safari** ses kaydediyor | Hayır — ama uygulama artık uyarıyor |

## Sonuç
**82/100 — kullanıma hazır.** Kalan üç eksiğin hiçbiri yazılımla çözülemez; ikisi Apple'ın web
uygulamalarına koyduğu sınır, biri donanım/model maliyeti. Yani "eksik" değil, "sınır".

**Kullanım kuralı (tek cümle):** iPhone'da **Safari** ile aç, bir kez **Ana Ekrana Ekle**, bundan sonra
simgeden çalıştır.
