# Sufle — rakip boşluk analizi (2026-08-08)

Karşılaştırma kümesi: **BIGVU**, **PromptSmart Pro**, **Speakflow**, **Teleprompter.com**,
çevre araçlar: **Descript**, **VEED**, **Filmora**, **NVIDIA Broadcast**, **CaptionX**.

---

## 1) Bizde olan, rakiplerde para duvarının arkasında olan
- Sesle takip (PromptSmart'ın patentli VoiceTrack'i, Speakflow'un Flow'u ile aynı iş) — bizde ücretsiz
- Sesli komut ("sufle başla/dur") — üç rakipte de göremedim
- Öğrenmeli bluetooth kumanda eşlemesi (her marka kumandayla)
- Platform arayüz alanlarının çerçeve içinde gösterilmesi
- Okuma şeridi (1/2/3 satır) + bakış sapması ölçeri (derece)
- Çekim modları (Reels/Story/Shorts/YouTube) tek dokunuşla tempo+çerçeve+sınır
- Tamamen çevrimdışı, hesap yok, abonelik yok, veri cihazdan çıkmıyor

---

## 2) Rakiplerde olup bizde OLMAYAN — mimarimizde yapılabilir

| # | Özellik | Kimde var | Bizde yapılabilir mi | İş yükü |
|---|---|---|---|---|
| 1 | **Otomatik altyazı / .srt** | BIGVU (prompter kaydırma hızından SRT üretiyor) | **EVET — hem de daha iyisi.** Her kelimenin okuma çizgisini geçtiği anı zaten biliyoruz; konuşma tanımaya hiç gerek yok, kelime bazlı kusursuz senkron | 1 tur |
| 2 | **Bölüm listesine atlama** | BIGVU, Speakflow | Evet — `#` başlıklarını listeleyip dokununca atlama | küçük |
| 3 | **Kaldığın yeri hatırlama** (senaryo başına) | çoğu | Evet | küçük |
| 4 | **Dosyadan metin içe aktarma** (.txt/.docx/.pdf) | BIGVU, Speakflow | .txt kolay; .docx/.pdf için ayrıştırıcı gerekir | küçük–orta |
| 5 | **Çekim notu / puan / en iyi çekimi işaretleme** | BIGVU | Evet (çekim arşivi zaten var) | küçük |
| 6 | **Prova modu → gerçek tempoyu öğrenip WPM önerme** | kısmen | Evet, ölçüm altyapısı hazır | küçük |
| 7 | **Gerçek kırpma + gömülü altyazı + logo/alt bant** | BIGVU | Evet ama **mimari değişiklik**: kaydı ham kameradan değil, `canvas` kompozitinden almak gerekir. Bir kerede şunları açar: gerçek 9:16 kırpma, altyazı gömme, logo, filtre, ayna düzeltme | orta–büyük, iOS'ta ısı/pil ölçülmeli |
| 8 | **Arka plan bulanıklaştırma / değiştirme** | Speakflow | Teknik olarak mümkün (segmentasyon modeli) ama telefonda ağır; #7 ile birlikte anlamlı | büyük |
| 9 | **Çekim sonrası kesme / sessizlik ve dolgu kelime temizleme** | Descript, BIGVU | Tarayıcıda WebCodecs ile kısmen; kalite/hız riski | büyük |

---

## 3) Rakiplerde olup bizde YAPILAMAYAN (mimari veya donanım engeli)

| Özellik | Kimde var | Neden bizde olmaz |
|---|---|---|
| **AI göz teması düzeltmesi** | BIGVU (AI Eye Contact Fix), Descript, VEED, Filmora, CaptionX, NVIDIA Broadcast | Kareyi yeniden üreten sinir ağı gerekir. Tek dosyalık PWA'da 30 fps'te çalışmaz; çalışsa da "tekinsiz" görünür. Dış araç önerilir |
| **Bulut senkron / çok cihaz / takım işbirliği-onay** | Speakflow, BIGVU | Sunucu + hesap sistemi gerekir. Bizde JSON yedek var |
| **AI senaryo yazma** | BIGVU | Model erişimi (API anahtarı) gerekir; anahtarı sen sağlarsan eklenebilir |
| **Doğrudan sosyal yayın + zamanlama** | BIGVU | Platform API'leri + sunucu. Bizde iOS paylaş sayfası var (elle paylaşım) |
| **İkinci cihazı kumanda yapmak** | Speakflow, BIGVU | Relay sunucusu gerekir (~30 satır, Vercel). Mac sürümünde yerel sunucuyla ZATEN var |
| **Konuşmayı metne çevirip düzeltme (STT)** | BIGVU %92-95 doğruluk | Bizde gereksiz — altyazıyı okuma zamanlamasından üretmek daha doğru (#1) |

---

## 4) Göz teması — senin sorunun için üç yol

**A. Fizik (en iyi sonuç, bedava) — v2.7'de eklendi**
- Ayarlar → Okuma → **👁 Göz teması ayarını uygula**: okuma çizgisi %8'e, şerit 2 satıra
- **Mesafe kritik**: 30 cm'de sapma ~12° (izleyici görür), 60 cm'de ~2°, 1 m'de ~1°.
  Telefonu uzaklaştır + yazıyı büyüt. Sapma ölçeri bunu derece olarak gösteriyor.
- Telefon göz hizasında, tripod/sehpa üzerinde, ön kamera.

**B. Prompter camı (beam splitter) — profesyonel çözüm**
- Yazı camda yansır, tam merceğin önünde okursun → sapma sıfır.
- Telefon için rig ~₺500–1.500 (Neewer / Ulanzi / Desview).
- Sufle'de **Görünüm → 🪞 Yazıyı aynala** açılınca camda düz okunur (destek hazır).

**C. AI düzeltme — dış araç (bizim yapamadığımız)**
| Araç | Platform | Nasıl |
|---|---|---|
| NVIDIA Broadcast | Windows + RTX ekran kartı | Sanal kamera, **canlı** düzeltir |
| Descript Eye Contact | Mac/Win | Çekim sonrası, ücretsiz kredi ile denenir |
| VEED / Filmora / CaptionX | tarayıcı / Mac / Win | Çekim sonrası, GPU gerekmez |
| BIGVU | iOS/Android | Prompter + AI göz teması aynı uygulamada (abonelik) |

→ Pratik reçete: **Sufle ile çek** (sufle, tempo, kumanda, çerçeve), sonucu **Descript/VEED'e at**, göz temasını orada düzelt. Sadece o adım için abonelik yeter.

---

## 5) Önerilen sıra

1. **Okuma zamanlamasından altyazı (.srt) üretimi** — en yüksek değer, bizim veri avantajımız, sunucu gerekmez
2. **Küçük boşluk paketi**: bölüm atlama listesi + kaldığın yer hafızası + .txt içe aktarma + çekim notu/puanı + prova WPM önerisi
3. **Canvas kompozit kaydı** (gerçek kırpma + gömülü altyazı + logo) — önce iOS'ta ısı/pil ölçümü, sonra karar
4. **Sunucu gerektirenler** (bulut senkron, ikinci cihaz kumanda, AI senaryo) — Erdal kararı

---

## Kaynaklar
- https://bigvu.tv/blog/best-teleprompter-apps-481af/
- https://www.speakflow.com/compare/bigvu
- https://teleprompter.works/blog/bigvu-review-and-pricing/
- https://ecommerceparadise.com/best-teleprompter-apps-in-2026-top-tools-for-content-creators-educators-and-business-video/
- https://www.veed.io/tools/eye-tracking-software/eye-contact-ai
- https://filmora.wondershare.com/video-editing-tools/eye-contact-ai-tools.html
- https://caption-x.com/ai-eye-contact
- https://www.technewsworld.com/story/nvidias-eye-contact-effect-changes-the-game-for-video-content-creators-177717.html
