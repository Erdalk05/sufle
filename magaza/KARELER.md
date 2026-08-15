# Mağaza kareleri — durum ve nasıl üretilir

**Üretildi:** 15 Ağustos 2026 · **Ölçülen sürüm:** 9.10
**Komut:** `python3 ekran.py` (kareler `magaza/ekranlar/` altına yazılır)

Kareler elle çekilmiyor: `ekran.py` uygulamanın **kendisini** açıp gerçek
arayüzü basıyor. Sebebi, elle çekilen mağaza karelerinin her sürümde
bayatlaması ve kimsenin fark etmemesi. Sürüm değişince tek komutla yenilenirler.

---

## Hangi kare hazır, hangisi değil

| # | Kare | Durum | Eksik olan |
|---|---|---|---|
| 1 | Okurken göz teması | **taslak** | kadrajda gerçek insan |
| 2 | Konuştukça akar | **mağazaya hazır** | — (kamerasız kip) |
| 3 | Kayıtta sahne temizlenir | **taslak** | kadrajda gerçek insan |
| 4 | Yazın arayüzün altında kalmaz | **taslak** | kadrajda gerçek insan |
| 5 | Baştan sondan kes | **taslak** | kadrajda gerçek insan |
| 6 | Masaüstünde daha fazlası | **mağazaya hazır** | — (panel görünümü) |

**Depoda ne duruyor:** yalnız mağazaya hazır kareler. Taslaklar `.gitignore`
içinde — her koşuda yeniden üretilen ikili dosyalar geçmişi şişirir ve tek
komutla geri gelirler.

**Taslak ne demek:** kare gerçek arayüzü ve gerçek durumu gösteriyor, ama
kameranın yerinde Chrome'un sahte test deseni (yeşil daire) var. Ürünü doğru
anlatır, **mağazaya konulamaz** — dosya adları bu yüzden `.taslak.png`.

## Taslakları mağazaya hazır hâle getirmek

Tek şey gerekiyor: Erdal'ın kameraya konuştuğu kısa bir çekim, Y4M biçiminde.

```bash
ffmpeg -i cekim.mov -pix_fmt yuv420p -s 1280x720 -t 20 yuz.y4m
python3 ekran.py --cekim yuz.y4m
```

Aynı altı kare bu kez gerçek yüzle basılır ve dosya adlarındaki `.taslak`
düşer. Kurulum, metin ve durumlar değişmez — yalnız kameradan gelen görüntü
değişir.

## Tezgâhın kendi kuralları (ölçülerek kondu)

**Pencere boyutu YALAN SÖYLÜYOR.** `--window-size=430,932` verildiğinde gerçek
viewport 500×845 çıktı ve kare 430'a **kırpıldı**. İlk denemede tam bu yüzden
"sağ kenar taşıyor, düğme kesiliyor" diye var olmayan bir kusur gördüm; iframe
içinde ölçünce yatay taşmanın 0 olduğu çıktı. Tezgâh artık
`Emulation.setDeviceMetricsOverride` kullanıyor ve **her kareden önce
viewport'un istenen ölçüde olduğunu doğruluyor** — uymazsa kare atılmıyor,
hata veriliyor.

**Hedef duruma varıldığı DOĞRULANIYOR.** İlk toplu koşuda dört kare sessizce
**giriş ekranını** bastı: kurulum betiği çalışmıştı ama uygulama henüz o
duruma geçmemişti. Kareler üretildi, boyutları bile makuldü, dördü de aynıydı
ve kimse fark etmezdi. Artık her karenin beklenen durumu bir JS ifadesiyle
yoklanıyor (`bekle` / `bekle2`); varılamazsa kare **basılmıyor**, hata
veriliyor.

**Kare başına temiz tarayıcı.** Aynı örnek yeniden kullanılınca önceki karenin
kamera akışı serbest kalmıyor ve sonraki kare sessizce giriş ekranında
kalıyordu. Altı açılışın bedeli, sessizce yanlış bir mağaza karesinin
bedelinden ucuz.

**Kullanıcı gibi sürülüyor.** `applyMode()` ve `toggleRec()` sayfa
kapsamında; dışarıdan çağrılamıyor (ReferenceError ile ölçüldü). Zaten
doğrusu da düğmeye basmak — kareler gerçek kullanıcı yolunu gösteriyor.

## Bu tur karelerin ortaya çıkardığı kusur

Kare 3 üretilirken tezgâhın taşma sayacı **1** dedi. Ölçünce `#playBtn` sağ
kenarı 452 px, ekran 430 px çıktı. Kök neden: `.cbtn` 54 px ve `#recBtn`
74 px `flex:none` ile sabitti, çubuk `nowrap`.

| durum | düğme | gereken | 430 px | 393 px | 375 px |
|---|---|---|---|---|---|
| kayıt yok | 6 | 410 px | sığıyor | **taşıyor** | **taşıyor** |
| kayıt var | 7 | 470 px | **taşıyor** | **taşıyor** | **taşıyor** |

Yani **kayıt başlar başlamaz ▶ düğmesi en büyük iPhone'da bile ekranın
dışına çıkıyordu** ve dokunulamıyordu. Düğme boyu artık en dar duruma
(7 düğme) göre viewport'tan hesaplanıyor; `tests/134` aritmetiği kaynaktan
yeniden kurup üç gerçek genişlikte sığdığını kilitliyor.
