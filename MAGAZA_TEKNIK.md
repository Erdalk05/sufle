# F.1 — Mağaza kabuğu ön ölçümü (iOS + Android)

**Ölçüm tarihi:** 15 Ağustos 2026 · **Ölçülen sürüm:** 9.9

Bu belge **ölçümdür, plan değil.** Kabuk henüz kurulmadı; kurmadan önce neyin
gerektiğini ve mevcut PWA'nın neyi zaten karşıladığını saymak gerekiyordu,
çünkü bu depoda en pahalı hata sınıfı "yapılabilir sanıp yarısında tıkanmak".

---

## Kullanılan tarayıcı API'leri (ölçüldü)

| API | Kullanım yeri | Kabukta karşılığı |
|---|---|---|
| `getUserMedia` | kamera + mikrofon | **izin gerekir** (aşağıda) |
| `MediaRecorder` | çekim kaydı | WKWebView/Chromium'da var |
| `SpeechRecognition` | sesle takip | ⚠️ **iOS WKWebView'da YOK** — aşağıda |
| Wake Lock | ekran uyanık kalsın | iOS'ta yerel karşılık gerekir |
| IndexedDB | çekim arşivi | var |
| `navigator.share` | çekimi paylaş | var |
| Clipboard | yapıştır | izin/etkileşim gerekir |
| `DecompressionStream` | `.docx` okuma | Chromium ✓ · WKWebView (iOS 16.4+) ✓ |
| Service Worker | çevrimdışı | kabukta **gereksiz** (dosyalar zaten yerel) |

## Gereken izinler

**iOS — `Info.plist`:**

| Anahtar | Neden |
|---|---|
| `NSCameraUsageDescription` | çekim |
| `NSMicrophoneUsageDescription` | çekim sesi **ve** sesle takip |
| `NSPhotoLibraryAddUsageDescription` | çekimi Fotoğraflar'a kaydetme |
| `NSSpeechRecognitionUsageDescription` | sesle takip yerel API'ye taşınırsa |

Metinler **ne yaptığını söylemeli**: "Sufle kameranızı yalnız siz çekime
başladığınızda kullanır" gibi. Apple genel ifadeleri reddediyor.

**Android — `AndroidManifest.xml`:**
`CAMERA`, `RECORD_AUDIO`, `INTERNET` (yerel sunucu/kumanda için),
`FOREGROUND_SERVICE` (uzun çekimde ekran açık kalsın).

## 🔴 Ölçülen en büyük engel: iOS'ta sesle takip

`SpeechRecognition` **WKWebView'da yok**. Yani Capacitor kabuğuna alınan PWA,
iOS'ta sesle takip özelliğini **kaybeder**. Matriste bu bizim 5 aldığımız,
liderin 3 aldığı kalem — kaybetmek kabul edilemez.

**Üç yol var, üçü de ölçülmeli:**

1. **Yerel köprü:** iOS `Speech` çerçevesini bir Capacitor eklentisiyle
   sarmalamak. Yapılabilir; Türkçe destekliyor. Bedeli: Swift kodu ve ayrı
   bir bakım yüzeyi.
2. **Whisper (WASM):** tarayıcıda çalışır, **cihazdan hiç çıkmaz** — gizlilik
   metnindeki tek istisnayı da kapatır. Bedeli: model dosyası (küçüğü bile
   ~40 MB) ve "tek dosya, sıfır bağımlılık" sözünün mağaza kabuğunda
   esnetilmesi.
3. **iOS'ta özelliği kapatmak** ve sebebini söylemek. En ucuz, en kötü.

**Karar Erdal'ın.** 2. yol gizlilik açısından en güçlüsü ve mağaza kabuğunda
"tek dosya" sözü zaten geçerli değil (uygulama paketi zaten çok dosya).

## Mevcut PWA'nın karşıladıkları

Manifest tam (ad, ikonlar 192/512/maskable, kategoriler, `id`, `share_target`,
kısayollar), uygulama tek dosya ve dış bağımlılığı yok, arayüz iki dilli,
gizlilik metni yazılı ve uygulamanın içinde. Yani kabuk işi **arayüz değil,
platform köprüsü** işi.

## Yapılmayacaklar ve nedeni

- **Sanal kamera:** tarayıcıdan yazılamaz, imzalı sistem eklentisi gerekir.
  Kabuk da bunu değiştirmez (D.5'te ölçüldü ve belgeye yazıldı).
- **Arka planda kayıt:** iOS izin vermiyor; söz vermek yanlış olur.
- **Fotoğraflar'a doğrudan yazma:** iOS'ta yalnız paylaş menüsüyle mümkün;
  bu sınır kullanıcıya zaten söyleniyor.

## Sıradaki somut adım

Kabuk kurmadan önce **sesle takip kararı** verilmeli (yukarıdaki üç yol).
Karar verilmeden kurulan kabuk, iOS'ta ürünün en güçlü özelliğini sessizce
kaybettiği için yarım kalır — bu deponun 1 numaralı hata sınıfı.
