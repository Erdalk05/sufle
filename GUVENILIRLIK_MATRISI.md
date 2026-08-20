# Çekim güvenilirliği matrisi

Rakip yol haritasının **P0** maddesi: *"İzin, depolama, arka plan, Bluetooth
kopması ve uzun çekim senaryoları kayıtlı."* Bu dosya o kaydı tutuyor.

**Yöntem:** her satır KODDAN ölçüldü — hangi olay yakalanıyor, kullanıcıya ne
söyleniyor ve hangi test kilitliyor. "Muhtemelen çalışır" diye satır yok;
kanıtı olmayan senaryo **açık** yazıyor. `tests/199` bu dosyanın kendisini
denetliyor: adı geçen her test dosyası ve her mesaj anahtarı gerçekten var mı.

Son ölçüm: 2026-08-20 · sürüm 9.44

## A · Kamera ve izin

| Senaryo | Uygulama ne yapıyor | Kullanıcı ne görüyor | Kilitleyen test |
|---|---|---|---|
| Kamera izni reddedildi | `getUserMedia` `NotAllowedError` ayrı ele alınıyor; izin yolu **tarayıcıya göre** yazılıyor (iOS Safari/Chrome/Firefox/Edge, Android, masaüstü ayrı) | `msg:camDenied` + `msg:izIos`/`msg:izAndroid`/`msg:izMasa` | `37-kamera-kurtarma.js`, `52-izin-kurtarma-yolu.js` |
| Kamera başka uygulamada | `NotReadableError`/`AbortError` ayrı; hangi uygulamaları kapatacağı yazılı | `msg:camBusy` | `37-kamera-kurtarma.js`, `39-kayitta-kamera-degistirme.js` |
| Uygun kamera yok | `NotFoundError`/`OverconstrainedError` ayrı | `msg:camNone` | `37-kamera-kurtarma.js` |
| Mikrofon yok | Kayıt sessiz sürüyor ama **önceden** söyleniyor | `msg:noMic` | `37-kamera-kurtarma.js`, `14-nefesle-akis-ve-yuzen.js` |
| Arka plandan dönünce iz ölmüş | `visibilitychange`te iz `ended` ise kamera **kendiliğinden** yeniden açılıyor; kayıt sürerken akışa DOKUNULMUYOR | `msg:camBack` | `37-kamera-kurtarma.js` |

## B · Çekim sırasında kopmalar

| Senaryo | Uygulama ne yapıyor | Kullanıcı ne görüyor | Kilitleyen test |
|---|---|---|---|
| Ses ortada kesildi (Bluetooth kopması, mikrofonu başka uygulama aldı) | Ses izi ölümü izleniyor; o saniyeden sonrası sessiz kaydedilir ve **söyleniyor** | `msg:audDied` + sonuç ekranında `msg:srAudStopped` (kesilme ANI ile) | `40-kayitta-ses-olumu.js` |
| Görüntü dondu | Yeni kare gelmiyorsa kayıt bitiriliyor, o ana kadarki bölüm korunuyor | `msg:vidDied` + sonuç ekranında `msg:srVidFroze` | `13-kayit-yolu-ve-durum.js`, `37-kamera-kurtarma.js` |
| Kayıt yarıda öldü | `MediaRecorder.onerror` yakalanıyor; ekran "kayıtta" takılı kalmıyor | `msg:recCut` | `13-kayit-yolu-ve-durum.js` |
| Kırpma boru hattı koptu (bellek) | Kullanıcıya durdur-yeniden başlat deniyor | `msg:cropDied` | `102-uzun-kayit-bellek.js` |
| Kayıt sırasında ayar değiştirme | Çözünürlük/kompozit/ses zinciri kayıt sürerken **değiştirilmiyor** ve sebebi söyleniyor | `msg:camBusyChange`, `msg:muzikRec` | `53-ayar-uygulanmadi.js`, `39-kayitta-kamera-degistirme.js` |

## C · Depolama

| Senaryo | Uygulama ne yapıyor | Kullanıcı ne görüyor | Kilitleyen test |
|---|---|---|---|
| Depo dolmak üzere | Kalan yer **dakikaya** çevrilip çekimden ÖNCE söyleniyor (MB kimseye bir şey anlatmıyor) | `msg:rcDepoAz` / `msg:rcDepoDolu` (`msg:rcYer` ile süre) | `41-disk-dolu.js`, `102-uzun-kayit-bellek.js` |
| Senaryo kaydedilemedi | Doğru yer tarif ediliyor (çekim arşivi AYRI depo) | `msg:lsFull` | `67-depo-dolunca-senaryo.js`, `27-kapanista-kaydetme.js` |
| Arşive yazılamadı | Sonuç ekranında çıkış yolu duruyor; "kaydedildi" YALANI söylenmiyor | arşiv hata yolu | `41-disk-dolu.js` |
| Arşiv kalıcı değil | Cihaz panelinde yazıyor ve ne yapılacağı söyleniyor | `msg:dvPersist` / `msg:dvPersistD` | `79-arsiv-ustveri-video.js` |

## D · Uzun çekim

| Senaryo | Uygulama ne yapıyor | Kullanıcı ne görüyor | Kilitleyen test |
|---|---|---|---|
| 10 dk+ çekim belleği | Parçalar biriktiriliyor, bit hızından tahmin ediliyor; yayın paketi videoyu **belleğe almadan** akıtıyor | hazırlık kontrolünde süre/yer | `102-uzun-kayit-bellek.js` |
| Kompozit yavaşladı | Kare hızı ölçülüyor; 20 fps altında ne yapılacağı yazılıyor | `msg:rcKompYavas` | `97-kompozit-fps-olcumu.js` |
| iPhone sesle takip ↔ kayıt çakışması | Kayıt boyunca tanıma kapatılıyor (ses oturumu yeniden kurulmuyor) | — (sessiz düzeltme) | `179-iphone-cekim-donmasi.js`, `180-ios-ses-oturumu-nobeti.js` |

## E · Bozuk veri ve eski kayıt

| Senaryo | Uygulama ne yapıyor | Kilitleyen test |
|---|---|---|
| Bozuk/eksik ayar | Her yeni alan `(x||varsayılan)` ile okunuyor; eski kayıtta olmayan alan uydurulmuyor | `162-senaryo-turetilmis-bilgi.js`, `43-ikinci-surum-tasima.js` |
| Otomatik yedekten dönüş | Yedek okunamazsa söyleniyor, sessizce boş liste gösterilmiyor | `125-cihaz-disi-yedek.js` |
| Silinen senaryo | Çöp kutusu + geri alma | `03-metin-temizleme-ve-cop.js` |

## 🔴 AÇIK — kanıtı olmayan satırlar

Bunlar **gerçek cihaz** gerektiriyor; tezgâh yerine geçemez ve "çalışıyor"
denmeyecek:

| # | Senaryo | Neden açık |
|---|---|---|
| B1 | 5 ve 15 dakikalık gerçek iPhone çekimi (görüntü/ses süreleri eşleşiyor mu) | Başsız tarayıcıda rAF ve video oynatma donuk; süre eşitliği ancak cihazda ölçülür |
| B2 | Gelen arama / kulaklık değişimi ortasında çekim | Simülasyonu yok; kodda yolu var (`msg:audDied`), davranışı cihazda doğrulanmalı |
| B3 | Kayıt sürerken uygulamayı arka plana alma | Kod kayıt sürerken akışa dokunmuyor; iOS'un kaydı öldürüp öldürmediği ölçülmedi |
| B4 | Android PWA çevrimdışı açılış | Service worker kayıtlı ve önbellek sürümlü; çevrimdışı ilk açılış cihazda denenmedi |
| B5 | Windows Edge yerel sunucu + uzak kumanda | Sunucu ve başlatıcı depoda; Windows'ta uçtan uca koşulmadı |
