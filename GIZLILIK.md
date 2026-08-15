# Sufle — Gizlilik Politikası

**Son güncelleme:** 15 Ağustos 2026 · **Sürüm:** 9.9

Bu metin, mağaza başvurularının zorunlu şartı olduğu için değil, ürünün en
önemli özelliği olduğu için yazıldı. Aşağıdaki her madde **kaynak koddan
ölçülerek** doğrulandı, iddia edilmedi.

---

## Kısa cevap

**Sufle sizin hakkınızda hiçbir veri toplamıyor.** Hesap yok, giriş yok,
sunucumuz yok. Senaryolarınız, çekimleriniz ve ayarlarınız yalnızca kendi
cihazınızda duruyor.

**Tek istisna** sesle takip özelliğidir ve aşağıda açıkça anlatılmıştır.

---

## Neyi topluyoruz

**Hiçbir şeyi.** Sufle'nin bize ait bir sunucusu yok; toplanacak bir yer yok.

Ölçüldü (v9.9 kaynak kodu):

| Ölçüm | Sonuç |
|---|---|
| Bize ait sunucuya giden ağ çağrısı | **0** |
| Analitik / izleme / çökme raporu aracı | **0** |
| Reklam kimliği, parmak izi, çerez | **0** |
| Hesap, e-posta, telefon numarası isteği | **yok** |

## Verileriniz nerede duruyor

| Veri | Yeri | Sizin denetiminiz |
|---|---|---|
| Senaryolarınız | Cihazınızın tarayıcı deposu | Silebilir, dosyaya yedekleyebilirsiniz |
| Çekimleriniz (video) | Cihazınızın tarayıcı deposu (IndexedDB) | Silebilir, indirebilirsiniz |
| Ayarlarınız | Cihazınızın tarayıcı deposu | Sıfırlayabilirsiniz |
| Hata günlüğü | Cihazınızda, son 10 kayıt | Hiçbir yere gönderilmez |

Uygulamayı silmek ya da tarayıcı verilerini temizlemek bu verilerin
**tamamını** siler. Bu yüzden **Senaryolar → Dosyaya yedekle** ile kendi
yedeğinizi almanızı öneriyoruz; o dosya sizde kalır.

## Kamera ve mikrofon

Kamera ve mikrofon **yalnız siz açtığınızda** çalışır ve görüntü/ses
**cihazınızdan çıkmaz**. Kayıt, tarayıcının kendi kayıt motoruyla yapılır ve
dosya cihazınızda kalır. Biz o dosyayı görmeyiz.

**İsteğe bağlı uzak önizleme (yalnız masaüstü sürümü):** açarsanız kameranın
gördüğü küçük bir kare, **kendi bilgisayarınızda çalışan** yerel sunucuya
gider ve **aynı Wi-Fi ağındaki** telefonunuzun kumanda sayfasında görünür.
Kare **diske hiç yazılmaz**, bellekte tek kare tutulur ve uygulama kapanınca
kaybolur. İnternete çıkmaz. Bu ayar **varsayılan olarak kapalıdır**.

## 🔴 Tek istisna: sesle takip

Sesle takip (🎤) açıkken, konuşmanız **tarayıcınızın kendi ses tanıma
servisine** gönderilir. Bu servis bize ait değildir; tarayıcının bir
parçasıdır ve **Chrome ile Safari'de bu işlem üreticinin sunucularında
yapılır** (Google, Apple). Yani sesle takip açıkken konuşmanız cihazınızdan
çıkar.

Bunu saklamak yerine açıkça yazıyoruz çünkü:

- Sesle takip **varsayılan olarak kapalıdır**; siz açmadan çalışmaz.
- Kapattığınız anda ses gönderimi durur.
- Uygulamanın diğer bütün özellikleri sesle takip kapalıyken tam çalışır.
- Bu veriyi biz görmeyiz, saklamayız, kimseyle paylaşmayız — bizim elimize
  hiç geçmez.

Konuşmanızın cihazdan çıkmasını istemiyorsanız **sesle takibi kapalı
tutun**; sufle zamanlı akışla (WPM) aynı işi görür.

## Çocuklar

Sufle çocuklara yönelik değildir ve yaş verisi dahil hiçbir kişisel veri
toplamaz.

## Üçüncü taraflar

Sufle'de **hiçbir üçüncü taraf kütüphanesi, reklam ağı veya analitik aracı
yoktur**. Uygulama tek bir dosyadır ve dışarıdan hiçbir kod yüklemez.
Bu, ölçülen bir sınırdır: bir kütüphane eklemek için önce bu maddeyi
değiştirmek gerekir.

## Veri talepleri

Bize ait hiçbir veriniz olmadığı için silme, düzeltme ya da dışa aktarma
talebi göndermenize gerek yoktur. Verileriniz zaten sizde: uygulamadan
silebilir, **Dosyaya yedekle** ile dışa aktarabilirsiniz.

## Değişiklikler

Bu metin değişirse sürüm notlarında duyurulur. Metnin tarihi ve sürümü en
üstte yazılıdır.

## İletişim

erdalkiziroglu@gmail.com

---

# Sufle — Privacy Policy

**Last updated:** 15 August 2026 · **Version:** 9.9

## Short answer

**Sufle collects nothing about you.** No account, no sign-in, no server of
ours. Your scripts, recordings and settings stay on your own device.

**One exception** is voice follow, described plainly below.

## What we collect

**Nothing.** We have no server, so there is nowhere to collect anything.

Measured in the v9.9 source: zero network calls to any server of ours, zero
analytics or crash reporting, zero advertising identifiers or cookies, and no
request for an account, e-mail or phone number.

## Where your data lives

Scripts, recordings and settings live in your device's browser storage.
Deleting the app or clearing browser data removes **all** of it, which is why
we recommend **Scripts → Back up to a file** — that file stays with you.

## Camera and microphone

The camera and microphone run **only when you turn them on**, and the video
and audio **never leave your device**. Recording uses the browser's own
recorder and the file stays on your device.

**Optional remote preview (desktop only):** if you enable it, a small frame of
what the camera sees goes to a local server running **on your own computer**
and appears on your phone's remote page **over your own Wi-Fi**. The frame is
never written to disk, only one frame is kept in memory, and it disappears when
the app closes. It never reaches the internet. This setting is **off by
default**.

## 🔴 The one exception: voice follow

While voice follow (🎤) is on, your speech is sent to **your browser's own
speech recognition service**. That service is not ours; it is part of the
browser, and in Chrome and Safari the processing happens on the vendor's
servers (Google, Apple). So while voice follow is on, your speech does leave
your device.

We state this openly because voice follow is **off by default**, stops sending
the moment you turn it off, and every other feature works fully without it.
We never see, store or share this data — it never reaches us at all.

If you do not want your speech to leave the device, keep voice follow off; the
timed scroll (WPM) does the same job.

## Children

Sufle is not directed at children and collects no personal data of any kind,
including age.

## Third parties

Sufle contains **no third-party libraries, ad networks or analytics**. The app
is a single file and loads no external code.

## Data requests

Because we hold no data of yours, there is nothing to request deletion or
export of. Your data is already yours: delete it in the app, or export it with
**Back up to a file**.

## Contact

erdalkiziroglu@gmail.com
