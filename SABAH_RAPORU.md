# Sabah raporu — 14 Ağustos 2026 gecesi

**Bu dosya gece boyunca güncellendi; ne zaman uyandıysan güncel hâli budur.**

## Tek cümlede

Gecenin **bütün P0'ları** kapandı, ardından 27 P1 işlendi. **38 commit**, tamamı yerelde.
Testler **732 → 2045**. Kapı yeşil. **Hiçbir şey yayınlanmadı** — yayın kararı sende.

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
- **Kumanda profili geri yüklenemiyordu** — dışa aktarma vardı, içe aktarma yoktu; özelliğin sözü verdiği "ikinci cihazda baştan öğretme" hiçbir zaman gerçekleşmiyordu.
- **Word/PDF'ten yapıştırılan metin sessizce bozuluyordu** — görünmez karakterler kelime içinde kalıp sesle takibi kırıyor ve `.srt` dosyasına giriyordu; bazı kaynaklarda paragraflar tek satıra birleşiyordu.
- **Tahmini süre duraklamaları saymıyordu** — nefes işaretli 20 cümlelik metinde 7 saniye sapma; uygulama "sınıra uygun" derken çekim sınırı aşıyordu.
- **Yayın paketi yanlış senaryoyu koyabiliyordu** — çekimden sonra sürüm değiştirince paketteki metin ve yayın notu diğer sürümden üretiliyordu.
- **Yazı boyutunu/okuma çizgisini değiştirince okuduğun yer kayıyordu** — 300 kelimelik metinde 113 kelime geriye kadar; döndürme düzeltmesi bu yolları kapsamıyormuş.
- **Depo dolunca yanlış yer tarif ediliyordu** — "çekimleri sil" deniyordu ama çekimler ayrı depoda; senaryo silmek de yer açmıyordu (silinen senaryo geri alma için saklanıyor).
- **Masaüstünde depo dolunca kaydetme patlıyordu** — `setItem` istisnası hiç yakalanmıyordu, o sırada çalışan iş ortasında kırılıyordu (parite kapısı yakaladı).
- **Harf aralığı ve kalınlık hiç yeniden ölçülmüyordu** — metin uzuyor ama akışın sınırı eski kalıyor, yani **metnin son satırları hiç görünmeden** akış bitiyordu.
- **Kendi tetik kelimen sessizce çalışmayabiliyordu** — boşluk içeren tetik (iki kelimelik ifade) hiçbir zaman tanınmıyor, yalnız noktalama/emojiden oluşan tetik hiç denenmiyordu; alan dolu göründüğü için kurduğunu sanıyordun.
- **Yeşil ekran kapalıyken onun ayarları yine de sürükleniyordu** — perde rengi, eşik, kenar yumuşaklığı, saçak temizliği, arka plan seçimi: hepsi görünür, oynatılabilir ve tamamen etkisiz; sebebi de yazmıyordu. Altyazı gömme kapalıyken altyazı ayarları için de aynıydı.
- **Fener sessizce sönüyordu** — mikrofonu/çözünürlüğü değiştirince, kamerayı yeniden açınca veya uygulama arka plandan dönüp kamerayı kurtarınca ışık gidiyor, anahtar açık görünmeye devam ediyordu.
- **İki kelimeyi birden vurgulamak hiç çalışmıyordu** — `*çok önemli*` yazınca vurgu uygulanmıyor, yıldızlar suflede ve gömülü altyazıda kalıyordu; yayın paketi ise siliyordu. Okuduğun metinle yayımladığın metin ayrışıyordu. Masaüstünde de aynıydı.
- **Uzun senaryoda yazı boyutunu sürüklemek takılıyordu** — 6 düzen kaydırıcısının hepsi parmağın her kıpırdamasında metnin tamamını yeniden ölçüyordu; tek karede onlarca kez. Artık kare başına bir kez.
- **İkinci sürümde sesle takip hiç çalışmıyordu** — ikinci sürüm genelde başka dilde yazılır ama tanıma dili yerinde kalıyordu: İngilizce metni Türkçe dinleyen sufle tek kelime tutturamıyordu. Dahası sesle takip açıkken dili elle değiştirmek de bir işe yaramıyordu; düğme yeni dile geçiyor, dinleme eski dilde sürüyordu.
- **Sesle takip açıkken yukarıdaki düzeltmeler işe yaramıyordu** — takibin hedefi de piksel olduğu için düzelttiğim konumu hemen geri bozuyordu; ayrıca senaryo değişince eski metnin kelimeleri eşleştiriliyordu.

## Çürüyen hipotezler (kayda geçsin, tekrar aranmasın)

Planda "şu bozuktur" diye yazdığım 11 madde **doğru çalışıyordu**. Hepsini testle kilitledim ki ileride bozulursa yakalansın:

- Mikrofon sızıntısı yok (sesle takip Web Audio'ya hiç dokunmuyor)
- Kamera yeniden bağlanmasında sonsuz döngü yok
- Otomatik yedek, JSON dışa/içe aktarma ve silinen senaryoyu geri getirme ikinci sürümü **taşıyor**
- `lightCheck` boş karede **NaN üretmiyor** (ızgara sabit, bölen sıfır olamaz)
- `realRes()` gerçek çözünürlüğü okuyor
- Uyumluluk panelinde kompozit/duraklatma/paylaşma/MP4 satırları **doğru**
- Kumanda yeniden bağlanması eksik değil (tarayıcı kendi yapıyor + nabız var)
- **Sesle takip uzun metinde kaybolmuyor** — 800/2000/5000 kelimede işaretçi sona tam ulaşıyor; ileri sıçrama 6, geriye dönüş 5 kelimede yakalanıyor
- **Uzun kelime (URL) hiçbir yüzeyde taşmıyor** — sufle kırıyor, liste kısaltıyor, gömülü altyazı harf harf bölüyor
- **Türkçe telaffuz toleransı zaten kilitliydi** — 21 kabul + 16 ret çifti, 57 iddia

**Ama beşinde, hipotez çürürken yanı başında gerçek bir kusur çıktı.** Doğru soruyu yanlış yere sormak da işe yaradı.

## Kendi hatalarım

- **Kapıya kendi elimle regresyon soktum:** `denetim.py`'ye eklediğim satır-sonu yorum temizliği, metin içindeki `//` ifadesini de yorum sanıyordu. Sürüm notundaki `/ // (2)` dizeyi kesti ve Türkçe cümleler koda karıştı. Düzelttim, dört yönde doğruladım.
- **H6'daki koruma eksikti:** "Sesi düzelt" düğmesi izleri kendi durduruyor, kapıya hiç varmıyordu. F4 turunda yakaladım.
- **Sürüm notundaki kesme işareti** iki kez JS dizesini kırdı — uygulama **hiç açılmayacaktı**. Her ikisini de kapının 2. adımı yakaladı.
- **Testlerin koda birebir kilitlenmesi** kapıyı 5 kez gereksiz kırmızıya çevirdi. Kuralı `CLAUDE.md`'ye yazdım, süpürmeyi X1/X2 olarak P2'ye aldım. A1 turunda **14 sahte kırmızı** daha çıktı (aynı sınıf); üçünü iddiaya çevirdim ve gevşetmenin kapıyı kör etmediğini 4 ayrı bozmayla doğruladım.
- **Sesle takip ölçümünü üç kez yanlış yaptım**, üçü de kendi test düzeneğimde: kelimeyi iki kez göndermek, sonucu yanlış yorumlayıp etkisiz bir yama yazmak (geri aldım), ve kelime üreticimin `wordEq`'i yanıltması. Sonuncusu yüzünden bir tur boyunca **var olmayan bir kusuru** (D11) rapora yazdım; gerçek kelimelerle ölçünce hepsi düzeldi. Ders test 65'e ve plana yazıldı: sentetik veri, ölçtüğü sistemin denklik kurallarına karşı da doğrulanmalı.

- **Kasıtlı bozma turumu kendi kabuk satırım yalanladı:** `echo "$(basename $f) -> $?"` yazınca komut ikamesi `$?` genişlemeden önce koşup çıkış kodunu sıfırlıyor. 6 bozmanın 6'sı da "geçti" göründü; testler aslında hepsini yakalıyordu. Kuralı `CLAUDE.md`'ye yazdım.
- **Vurgu düzeltmemin ilk deseni dengesiz yıldızları (`***x***`) sessizce vurguya çeviriyordu**; kendi yazdığım test bunu görmedi, iki ESKİ test (06 ve 17) yakaladı. Kapının değeri tam da burada.
- **Denetimi argümansız koşturdum** (`python3 denetim.py`) ve "temiz" sandım — hiçbir dosyaya bakmamıştı. Tam da bu gece 12 kez bulduğum "ölçmeyen kapı" sınıfının kendisi.

## Sende karar bekleyenler

1. **v9.5 yayını** (yukarıda)
2. **T7** — iPhone'da paylaşım tanı satırı: "Fotoğraflara kaydetmiyor" sorununun tek kalan engeli, gerçek cihaz gerekiyor
3. **T23** — `/cmd` herhangi bir web sayfasından tetiklenebiliyor. Seçenekler: Origin kontrolü · QR'a jeton koymak · olduğu gibi bırakmak (yerel ağ, düşük risk)

## Sayılar

- **46 commit**, hepsi yerelde, `claude` dalında
- **2266 test** (gece başında 732) · yeni test dosyası: 39–73
- Gece planı: 136 görevden **40'ı** işlendi (bütün P0'lar + 33 P1)
- Kapı: 5 adım yeşil · 4 ayna birebir · `denetim.py` temiz
