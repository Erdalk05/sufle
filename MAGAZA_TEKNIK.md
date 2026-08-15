# F.1 — Mağaza kabuğu ön ölçümü (iOS + Android)

**Ölçüm tarihi:** 15 Ağustos 2026 · **Ölçülen sürüm:** 9.10
**Güncelleme (T51):** iOS engeli ÖLÇÜLDÜ ve çürüdü — aşağıdaki tabloya bak.

Bu belge **ölçümdür, plan değil.** Kabuk henüz kurulmadı; kurmadan önce neyin
gerektiğini ve mevcut PWA'nın neyi zaten karşıladığını saymak gerekiyordu,
çünkü bu depoda en pahalı hata sınıfı "yapılabilir sanıp yarısında tıkanmak".

---

## Kullanılan tarayıcı API'leri (ölçüldü)

| API | Kullanım yeri | Kabukta karşılığı |
|---|---|---|
| `getUserMedia` | kamera + mikrofon | **izin gerekir** (aşağıda) |
| `MediaRecorder` | çekim kaydı | WKWebView/Chromium'da var |
| `SpeechRecognition` | sesle takip | ✅ **VAR** — WKWebView'da ölçüldü (T51) |
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

## ✅ ENGEL KALKTI — ölçüldü (2026-08-15, iOS 18.6 simülatörü)

Bu belge aylarca şunu yazıyordu: *"`SpeechRecognition` WKWebView'da YOK; Capacitor
kabuğuna alınan PWA iOS'ta sesle takibi KAYBEDER."* **Bu iddia ölçülmemişti ve
yanlış çıktı.** Mağaza kabuğunu bloke eden tek madde buydu.

**Ölçüm yöntemi** (`ios-olcum/olc.sh` ile tekrarlanabilir): aynı yetenek sayfası
önce Mobile Safari'de, sonra elle derlenmiş **gerçek bir WKWebView** uygulamasında
açıldı; ikisinin de ekran görüntüsü alındı (`ios-olcum/sonuc-*.png`).
Ayırt edici kanıt **User-Agent**: Safari `… Mobile/15E148 Safari/604.1`,
WKWebView `… Mobile/15E148` (Safari eki **yok**).

| yetenek | Safari | WKWebView |
|---|---|---|
| **SpeechRecognition** | ✅ | ✅ |
| MediaRecorder | ✅ | ✅ |
| MediaRecorder `video/mp4` | ✅ | ✅ |
| getUserMedia | ✅ | ✅ |
| canvas `captureStream` | ✅ | ✅ |
| `DecompressionStream` (.docx) | ✅ | ✅ |
| Wake Lock | ✅ | ✅ |
| `navigator.share` | ✅ | ✅ |
| IndexedDB | ✅ | ✅ |
| secure context | ✅ | ✅ |

**Sonuç: yerel Speech köprüsü de, Whisper-WASM da, "iOS'ta kapat" da GEREKMİYOR.**
Kabuk sesle takibi kaybetmeden kurulabilir; üç yolun üçü de elendi.

**Dürüstlük sınırı:** ölçülen şey API'nin VARLIĞI — engel iddiası da tam olarak
buydu. Uçtan uca tanıma ayrıca ağ ve mikrofon izni ister; simülatörde gerçek
mikrofon yok. Gerçek cihazda ilk kabuk denemesinde bu ayrıca sınanmalı.
**iOS sürümü değiştiğinde ölçümü tekrarla** — betik bunun için duruyor.

## ✅ İKİNCİ ENGEL DE ÖLÇÜLDÜ — paketlenmiş kabuk (`file://`) çalışıyor

T51 API'lerin **varlığını** ölçtü ama kabuğun asıl mimarî varsayımını değil:
*uygulama dosyası pakete gömülüp `file://` ile açılırsa kamera/mikrofon izni ve
kalıcı depolama çalışır mı?* Tutmazsa kabuğun mimarisi değişirdi (yerel HTTP
sunucusu ya da özel şema gerekirdi) — yani sonradan değil ÖNCE bilinmesi gereken şey.

**Ölçüm** (`ios-kabuk/`, 2026-08-15 18:17, iOS simülatörü): elle derlenmiş gerçek bir
WKWebView kabuğu, sayfa `loadFileURL` ile pakete gömülü hâlden açıldı
(`ios-kabuk/kabuk.swift` · `Kabuk-Info.plist` · kare `ios-kabuk/sonuc-kabuk.png`).

| ölçülen | sonuç |
|---|---|
| kaynak / protokol | `file://` · güvenli bağlam **EVET** |
| localStorage yazma/okuma | ✅ |
| IndexedDB | ✅ |
| mediaDevices | ✅ |
| MediaRecorder | ✅ |
| SpeechRecognition | ✅ |
| **kamera + mikrofon izni** | ✅ (2 iz geldi) |

**Kritik ayrıntı — kabuk kodunun kendisi:** `requestMediaCapturePermissionFor`
temsilcisi yazılmazsa WKWebView kamera/mikrofon isteğini **sessizce reddeder** ve
uygulama "kamera açılmıyor" der. Bu deponun 2 numaralı hata sınıfının (tam
gerektiği anda sessizce çalışmayan şey) kabuk tarafındaki karşılığı; kabuk
kurulurken ilk yazılacak satır budur. `allowsInlineMediaPlayback=true` de şart,
yoksa iOS kaydı kendi tam ekran oynatıcısına alır ve **sufle görünmez olur**.

**Dürüstlük sınırı:** simülatörde gerçek mikrofon/kamera donanımı yok — ölçülen
şey iznin **verilebildiği ve akışın kurulabildiği**. Gerçek cihazda kayıt kalitesi
ayrıca sınanmalı. Ayrıca service worker `file://`'de çalışmaz; kabukta zaten
gereksiz (dosyalar yerel), ama **çevrimdışı yolun kabukta farklı olduğu** yazılı kalsın.

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

Sesle takip engeli **ölçümle kalktı**, yani kabuk kurulabilir. Kalan gerçek
gereksinimler kod değil **hesap ve donanım**: Apple Developer üyeliği, imzalama
kimliği ve mağaza kayıtları. Bunlar Erdal'ın kararı ve hesabı.

Kabuk kurulduğunda ilk sınanacak şey ölçümün dürüstlük sınırı: **gerçek cihazda
uçtan uca sesle takip** (API varlığı ≠ çalışan tanıma).
