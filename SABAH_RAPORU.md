# Sabah raporu — 14 Ağustos 2026 gecesi

**Bu dosya gece boyunca güncellendi; ne zaman uyandıysan güncel hâli budur.**

## Tek cümlede

Gecenin **bütün P0'ları** kapandı, ardından 16 P1 işlendi. **24 commit**, tamamı yerelde.
Testler **732 → 1793**. Kapı yeşil. **Hiçbir şey yayınlanmadı** — yayın kararı sende.

## 🔴 Senden istediğim tek şey

**v9.5'i yayınlamak.** Gecenin tamamı yerelde birikti, `.son-yayin` dosyasına dokunmadım.
Yayın protokolü `CLAUDE.md`'de; sıra kritik. Onay verirsen ben yaparım, tek komut.

Sürüm notu iki dilde yazıldı ve gecenin bütün düzeltmelerini kullanıcı diliyle anlatıyor
(uygulama içinde ⚙️ → "Ne değişti" bölümünde görünecek).

## Ne bozuktu — kullanıcıya değen sırayla

Hepsi **kanıtlanarak** bulundu: kodu koşturup ölçtüm, tahmin etmedim.
Her düzeltmenin regresyon testi var ve testin gerçekten ayırt ettiğini kasıtlı bozarak kanıtladım.

### Çekimi doğrudan mahveden (P0)

| Ne oluyordu | Sonucu |
|---|---|
| Kayıt sürerken mikrofon/kamera/çözünürlük değiştirmek | Çekimin **sesi ölüyordu**, kayıt sessiz devam ediyordu |
| Çekim ortasında ses kesilirse (Bluetooth kopması vb.) | **Hiçbir uyarı yoktu** — görüntü için vardı, ses için yoktu |
| Kayıt yarıda ölürse (disk dolu) | Ekran **kayıtta kalıyordu**: kırmızı nokta yanıyor, sufle akıyor, hiçbir şey kaydedilmiyor |
| Depo dolunca | Uyarı çekim **bittikten sonra** geliyordu; çekim çoktan kayıp |
| Arşive yazılamayan çekim | **Çıkış yolu yoktu** — ekranı kapatınca gidiyordu |
| Yeşil ekran kayıt sırasında koparsa | **Donmuş kare** dakikalarca kaydedilmeye devam ediyordu |
| Sesle takip | Sonsuz yeniden başlatıyor, bir süre sonra sözü takip etmeyi bırakıyordu |

### Sessizce yanlış sonuç üretenler (P1)

- **`12,5%` → "on iki, yüzde beş"** — "Sayıları yazıya çevir" aracı kameraya **bambaşka bir sayı** okutuyordu. `1.250.000` de "bir.iki yüz elli.sıfır" çıkıyordu.
- **Altyazı kısaltmalarda kesiliyordu** — `vb.`, `Dr.`, `3.`, `T.C.` gördüğü yerde satır bölüyordu. Tek örnek cümlede **6 yanlış bölünme**. Bu, yayımladığın `.srt` dosyasına giriyordu.
- **Ekranı döndürünce sufle metnin başka yerine atlıyordu** — 300 kelimelik metinde ortadan döndürmek **149 kelime** ileri fırlatıyordu, üstelik kayıt sürerken.
- **Vurgu yıldızları ekranda ve altyazıda görünüyordu** — `*harika*!` gibi noktalama yapışık yazımlarda.
- **Mac'te işaretleme motoru hiç yoktu** — `*vurgu*`, `{telaffuz}`, `/ // (2)` harfi harfine görünüyordu. Üstelik Mac'teki "🫁 Nefes işareti" düğmesi `/` ekliyor, yani **araç sufleyi kendi bozuyordu**.
- **Senaryonun kendisi sesli komut tetikliyordu** — metinde "sufle kaydet" geçmesi çekimi bitiriyordu.
- **Kayıt sürerken değiştirilen ayar uygulanmıyor ama uygulanmış görünüyordu** — 4K yaptın, uygulama "4K" diyor, kayıt 1080p; panel de "cihaz bu kadarını verdi" diye **yanlış açıklama** yazıyordu.
- **Kompozit çekim ortasında açılınca kayda hiç yansımıyordu** — önizleme yeşil ekranı gösteriyor, dosyada ham arka plan, **uyarı yok**.
- **İki sürümlü senaryoda iki sessiz kayıp** — arama diğer sürümü görmüyordu; çoğaltma (⧉) ikinci sürümü **düşürüyordu**.
- **Kamera izni reddedilince yanlış yer tarif ediliyordu** — "Ayarlar → Safari" deniyordu; Android'de Safari yok.
- **Kumandada komut sessizce yutuluyordu** — düğmeye basıyorsun, sufle kıpırdamıyor, durum satırı hâlâ "Bağlı" diyor.
- **Kumanda adresi bulunamayınca ölü adres gösteriliyordu** — QR'a `localhost` basılıyor, telefon kendine bağlanmaya çalışıyordu.

## Çürüyen hipotezler (kayda geçsin, tekrar aranmasın)

Planda "şu bozuktur" diye yazdığım 7 madde **doğru çalışıyordu**. Hepsini testle kilitledim ki ileride bozulursa yakalansın:

- Mikrofon sızıntısı yok (sesle takip Web Audio'ya hiç dokunmuyor)
- Kamera yeniden bağlanmasında sonsuz döngü yok
- Otomatik yedek, JSON dışa/içe aktarma ve silinen senaryoyu geri getirme ikinci sürümü **taşıyor**
- `lightCheck` boş karede **NaN üretmiyor** (ızgara sabit, bölen sıfır olamaz)
- `realRes()` gerçek çözünürlüğü okuyor
- Uyumluluk panelinde kompozit/duraklatma/paylaşma/MP4 satırları **doğru**
- Kumanda yeniden bağlanması eksik değil (tarayıcı kendi yapıyor + nabız var)

**Ama beşinde, hipotez çürürken yanı başında gerçek bir kusur çıktı.** Doğru soruyu yanlış yere sormak da işe yaradı.

## Kendi hatalarım

- **Kapıya kendi elimle regresyon soktum:** `denetim.py`'ye eklediğim satır-sonu yorum temizliği, metin içindeki `//` ifadesini de yorum sanıyordu. Sürüm notundaki `/ // (2)` dizeyi kesti ve Türkçe cümleler koda karıştı. Düzelttim, dört yönde doğruladım.
- **H6'daki koruma eksikti:** "Sesi düzelt" düğmesi izleri kendi durduruyor, kapıya hiç varmıyordu. F4 turunda yakaladım.
- **Sürüm notundaki kesme işareti** iki kez JS dizesini kırdı — uygulama **hiç açılmayacaktı**. Her ikisini de kapının 2. adımı yakaladı.
- **Testlerin koda birebir kilitlenmesi** kapıyı 5 kez gereksiz kırmızıya çevirdi. Kuralı `CLAUDE.md`'ye yazdım, süpürmeyi X1/X2 olarak P2'ye aldım.

## Sende karar bekleyenler

1. **v9.5 yayını** (yukarıda)
2. **T7** — iPhone'da paylaşım tanı satırı: "Fotoğraflara kaydetmiyor" sorununun tek kalan engeli, gerçek cihaz gerekiyor
3. **T23** — `/cmd` herhangi bir web sayfasından tetiklenebiliyor. Seçenekler: Origin kontrolü · QR'a jeton koymak · olduğu gibi bırakmak (yerel ağ, düşük risk)

## Sayılar

- **24 commit**, hepsi yerelde, `claude` dalında
- **1793 test** (gece başında 732) · yeni test dosyası: 39–57
- Gece planı: 135 görevden **22'si** işlendi (bütün P0'lar + 16 P1)
- Kapı: 5 adım yeşil · 4 ayna birebir · `denetim.py` temiz
