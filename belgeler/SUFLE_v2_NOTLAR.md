# Sufle v2 — denetim ve geliştirme notları (2026-08-07)

Kaynak: `~/Desktop/iPhone Teleprompter/index.html` (canlı: https://erdalk05.github.io/sufle/)
v1 yedeği: `index_v1_yedek.html` (dokunulmadı)

---

## 1) v1'de bulunan gerçek kusurlar

### Motor / doğruluk
| # | Kusur | Etki |
|---|---|---|
| 1 | Kaydırma `pos += hız*0.5` ile **kare başına** artıyordu | 120 Hz ProMotion iPhone'da metin **iki kat hızlı** akıyordu; aynı ayar farklı cihazda farklı hız |
| 2 | Hız birimi 1–30 arası anlamsız bir sayıydı | "Kaç dakika sürer" hesaplanamıyordu; prova ile canlı çekim tutmuyordu |
| 3 | Metnin başı `padding:64%` ile hizalanıyordu (yüzde padding **genişliğe** göre hesaplanır) | Okuma çizgisi konumu değişince ilk kelime çizgiye oturmuyordu |
| 4 | Ekran uyanık tutulmuyordu | Uzun metinde iPhone ekranı kararıyor, çekim bozuluyordu |
| 5 | `getUserMedia`'da çözünürlük/kare hızı istenmiyordu | Cihaz varsayılanı (bazen 640×480) ile kaydediliyordu |
| 6 | MediaRecorder bit hızı verilmiyordu | Sıkıştırma kalitesi tarayıcının insafına kalıyordu |
| 7 | Çekim yalnız RAM'deydi (`lastBlob`) | Sekme kapanınca / uygulama arkaplanda öldürülünce **çekim kayboluyordu** |
| 8 | Bitiş koşulu `pos > scrollHeight` | Metin bittikten çok sonra duruyordu |

### Kullanım
| # | Kusur |
|---|---|
| 9 | Ekrana her dokunuş oynat/duraklat yapıyordu — çekim sırasında yanlışlıkla dokunmak sufleyi durduruyordu |
| 10 | Metinde ileri-geri sarmanın hiçbir yolu yoktu (yalnız baştan başlat) |
| 11 | Hız çekim sırasında değiştirilemiyordu (ayar sayfası açmak gerekiyordu) |
| 12 | Tek metin vardı — senaryo kütüphanesi yok, yedek yok, dışa aktarım yok |
| 13 | Kelime sayısı / süre tahmini / kalan süre yoktu |
| 14 | Klavye veya bluetooth kumanda desteği yoktu |
| 15 | Bölüm başlığı / yönerge notu gibi metin işaretleri yoktu |
| 16 | Yazı tipi, satır aralığı, kenar boşluğu, kalınlık ayarı yoktu |
| 17 | Kamerasız modda "siyah yazı" seçilince zemin de siyah olduğu için yazı görünmez oluyordu |
| 18 | Parlak kamera görüntüsü üstünde yazı okunmuyordu (karartma katmanı yok) |
| 19 | Çerçeveleme kılavuzu (9:16, üçler kuralı, baş boşluğu) yoktu |
| 20 | Kamera izni reddedilince yalnızca `alert()` çıkıyordu, ne yapılacağı yazmıyordu |
| 21 | Arayüz yalnız Türkçeydi |
| 22 | Sesle takip yalnız Mac sürümünde vardı, telefonda yoktu |
| 23 | Zoom / fener / dikey çevirme yoktu |
| 24 | PWA paylaşım hedefi yoktu (Notlar'dan metin paylaşılamıyordu) |
| 25 | Yeni sürüm yayınlanınca kullanıcı haberdar edilmiyordu |

---

## 2) v2'de yapılanlar

### Motor
- **Delta-time kaydırma**: `pos += pxSaniye * dt`, `dt` 0.1 s'e kırpılır → 60/120 Hz fark etmez, kare düşmesinde metin kaymaz.
- **Gerçek WPM**: hız artık dakikada kelime. Piksel/kelime metinden ölçülür, yani yazı boyutunu değiştirince hız değişmez.
- **Doğru hizalama**: metnin başına/sonuna JS ile ölçülen `padTop/padBot` boşluğu konur → ilk kelime tam okuma çizgisinde başlar, son kelime çizgiye ulaşır.
- **Nefes durağı**: paragraf sonunda 420 ms bekler (kapatılabilir).
- **Wake Lock**: okuma/kayıt sırasında ekran uyanık kalır, arkaplandan dönünce yeniden alınır.
- HUD güncellemesi 5 Hz'e kısıldı (pil).

### Kayıt
- 1080p varsayılan (720p / 4K seçilebilir), 30 fps, 9 Mbps video + 128 kbps ses.
- **Ham ses seçeneği** (echoCancellation/noiseSuppression/AGC kapalı) — konuşma daha doğal tınlar.
- MediaRecorder 1 s'lik parçalarla yazar → çökmede veri kaybı en aza iner.
- **Çekimler IndexedDB'ye otomatik kaydedilir.** "Çekimlerim" listesinden izle / paylaş / sil.
- Geri sayım artık **kayıttan önce** çalışır — videoda 3-2-1 görünmez.
- Dosya adı zaman damgalı: `sufle_20260807_181230.mp4`.

### Okuma deneyimi
- **Parmakla sarma**: ekranı yukarı-aşağı sürükle → metinde ileri-geri.
- **Sağ kenar = canlı hız**: kenarda sürükleyince WPM anında değişir, rozet gösterilir.
- **Çift dokunuş = kilit** (kayıtta yanlışlıkla durdurmaya karşı).
- **Sesle takip** telefona da geldi (TR/EN/DE/AR) — konuştukça metin seni izler.
- **Klavye / bluetooth kumanda**: boşluk, ↑↓ hız, ←→ satır atla, R kayıt, Home başa sar, Esc kapat.
- Okunan kelimeler soluklaşır, aktif kelime vurgulanır (ikisi de kapatılabilir).
- Üst rozetler: geçen süre · kalan süre · WPM. **Hedef süre** girilirse rozet "+12s / −8s" olarak geri mi ileri mi olduğunu gösterir.
- Metin işaretleri: `# satır` → bölüm başlığı, `[köşeli parantez]` → yönerge notu (soluk, kelime sayısına girmez).

### Görünüm
- Yazı tipi (Sistem / Serif / Yumuşak / Mono / **Disleksi**), kalınlık, harf aralığı, satır aralığı, kenar boşluğu, hizalama.
- Kamera üstü karartma şeridi (0–85 %) → parlak arkaplanda okunurluk.
- Kamerasız modda zemin rengi (siyah / lacivert / beyaz) → siyah yazı artık kullanılabilir.
- Yazıyı aynala (beam splitter cam rig) + dikey çevirme + gölge kapatma.
- Çerçeve kılavuzu 9:16 / 4:5 / 1:1 / 16:9, üçler kuralı ve baş boşluğu çizgisi.
- Yatay (landscape) ve tablet/masaüstü düzeni.

### Metin yönetimi
- Senaryo kütüphanesi: sınırsız senaryo, başlık, kopyala, sil, aktif seçimi kalıcı.
- Panodan yapıştır düğmesi.
- **JSON yedek: dışa aktar / içe aktar** (ayarlar + tüm senaryolar).
- Her senaryoda kelime sayısı ve o anki WPM'e göre tahmini süre.

### Platform
- Türkçe / İngilizce arayüz (cihaz diline göre otomatik seçilir, elle değiştirilebilir).
- PWA **paylaşım hedefi**: Notlar/Safari'den "Paylaş → Sufle" ile metin doğrudan yeni senaryo olur.
- Ana ekran kısayolları: "Kamerayla başla", "Çekimlerim".
- Service worker v3 + **yeni sürüm bildirimi**.
- Kamera hatasında ne yapılacağını anlatan çift uyarı (alert yerine toast).

---

## 3) Doğrulama

Chrome + `python3 -m http.server` ile localhost üzerinden test edildi:

- JS/JSON/SW sözdizimi: temiz (`node --check`).
- Metin ayrıştırma: 40 kelime / 2 başlık / 1 not doğru ayrıldı; başlık ve not kelime sayısına girmiyor.
- Sürükleyerek sarma: 100 px sürükleme = 100 px kayma (birebir).
- Sağ kenar hız sürüklemesi, klavye kısayolları (satır atla / hız / başa sar) çalışıyor.
- Çift dokunuş kilit + kilit ekranından çift dokunuş açma çalışıyor.
- Senaryo ekle/sil/kopyala, dil değişimi, localStorage kalıcılığı çalışıyor.
- IndexedDB çekim listesi (kayıt, listeleme, süre/boyut gösterimi) çalışıyor.
- **Regresyon taraması**: tüm sekmeler, tüm anahtarlar, tüm seg düğmeleri ve tüm sürgüler uçtan uca sürüldü → **0 JS hatası**.
- Delta-time doğrulandı (kırpılmış kare başına beklenen piksel kadar ilerliyor).

### Test edilemeyen (cihazda denenmeli)
- Kamera açma, ön/arka geçiş, zoom, fener → tarayıcı otomasyonunda kamera izni verilemiyor.
- MediaRecorder mp4 çıktısı ve `navigator.share` ile Fotoğraflar'a kaydetme → yalnız gerçek iPhone'da.
- Sesle takip (Safari konuşma tanıma) → gerçek cihaz + internet gerekir.

---

## 4) Yayına alma (henüz yapılmadı)

`~/Desktop/.sufle-deploy` klonu **artık yok**. Yayın için:

```bash
cd ~/Desktop
git clone https://github.com/Erdalk05/sufle.git .sufle-deploy
cp "iPhone Teleprompter/index.html" "iPhone Teleprompter/manifest.json" \
   "iPhone Teleprompter/sw.js" .sufle-deploy/
cd .sufle-deploy && git add -A && git commit -m "Sufle v2" && git push
```

`sw.js` içindeki `CACHE` zaten `sufle-v3`'e yükseltildi — telefon eski sürümde takılmaz.

---

---

## 4b) v2.1 — Uzaktan kumanda (2026-08-08)

**Neden Mac'teki QR yöntemi kullanılamadı:** Mac sürümünde prompter Mac'te, kumanda telefonda ve arada
`teleprompter_server.py` var. PWA'da prompter telefonun kendisi; GitHub Pages statik, sunucu yok. Üstelik
HTTPS sayfa Mac'in HTTP sunucusuna bağlanamaz (mixed content). Bu yüzden telefonda gerçekten çalışan iki yol kuruldu:

### A) Fiziksel kumanda — öğrenmeli tuş eşleme
- Bluetooth sunum kumandası / sayfa çevirici pedal / klavye telefona eşleşince tuşları `keydown` olarak geliyor.
- **Ayarlar → Diğer → 🎛 Uzaktan kumanda**: "Gelen son tuş" göstergesi (kumanda çalışıyor mu anında belli),
  **Tuş öğret** (tuşa bas → eylemi seç), eşleme tablosu (tek tek silinebilir), varsayılana dön.
- Eylemler: başlat/duraklat · satır ileri/geri · hız +/− · kayıt · başa sar · kilit.
- Varsayılanlar (çoğu kumanda kutudan çıktığı gibi çalışır): Boşluk/Enter/PageDown/F5/b/. = başlat-duraklat,
  PageUp/← = satır geri, → = satır ileri, ↑↓ = hız, R = kayıt, Home = başa sar, End = kilit.
- ⚠️ Kamera deklanşörü tipi ucuz bluetooth kumandalar **ses tuşu** gönderir; iOS bunu web sayfasına vermez.
  Alırken "sunum kumandası / presenter" olanı seç — bunlar PageUp/PageDown gönderir.

### B) Sesli komut (donanımsız)
- 🎤 sesle takip açıkken çalışır. Kalıp: **"sufle" + komut** (EN: "prompter" + komut).
- başla/başlat/devam · dur/duraklat · hızlan · yavaşla · başa dön / baştan al · kaydet.
- Komut kelimeleri metin akışından **düşürülür**, sufle konumunu bozmaz. 900 ms tekrar koruması var.
- Normal konuşmada yanlış tetiklenme yok (uyandırma kelimesi zorunlu).

### v2.2 — sesli komut ile takip döngüsünün çakışması (düzeltildi)
Sesli komut yalnız 🎤 (sesle takip) açıkken çalışıyor. Bu modda konumu `easeLoop` sürüyor, zamanlı `tick()` değil.
İlk sürümde "sufle başla" `start()` çağırıyordu → **iki döngü aynı anda `pos`'u yazıyordu**; "sufle dur" ise
`running` zaten false olduğu için **hiçbir şey yapmıyordu**. Artık:
- 🎤 açıkken: "başla" takibi sürdürür, "dur" konumu dondurur (`voicePaused`), eşleştirme de durur
- 🎤 kapalıyken: normal başlat/duraklat
- "başa dön" artık `vptr`/`vTarget`'ı da sıfırlıyor (yoksa takip eski hedefe geri çekiyordu)

### Bu turda çıkan 2 gerçek hata
1. **Türkçe harfler normalize edilmiyordu** — `norm()` yalnız şapkalı harfleri katlıyordu; "başla" → `başla`
   kalıyor, komut sözlüğündeki `basla` ile hiç eşleşmiyordu. Sesli komut **hiç çalışmayacaktı**.
   Artık ç/ğ/ı/İ/ş/ö/ü katlanıyor — sesle takip eşleşmesi de bu sayede toleranslı oldu.
2. **Geri sayarken ikinci basış sayacı iptal etmiyordu** — sufle sayaç bitmeden başlıyor, sayaç ekranda kalıyordu.

Doğrulama: komut ayrıştırıcı gerçek kaynaktan çıkarılıp node ile test edildi (6 komut kalıbı doğru,
normal cümlelerde tetiklenme yok); tarayıcıda tuş öğretme → atama → kapat → tuşa bas zinciri uçtan uca çalıştı; sweep'te 0 JS hatası.

---

## 4c) Mac + Windows sürümüne taşındı (2026-08-08)

`~/Desktop/Teleprompter/Teleprompter Pro.html` ve byte-aynısı olan `~/Desktop/Teleprompter-Windows/` kopyası
(zip de yeniden üretildi). Yedekler: `Teleprompter Pro_yedek_20260808.html`.

- **Sesli komut** aynen taşındı; Mac'te hazır `handleRemote({type})` dağıtıcısına bağlandı (telefon kumandası
  ve ses aynı eylem yolunu kullanıyor). Ek olarak Mac'e özel "sufle tam ekran" komutu var.
- **Türkçe normalize hatası düzeltildi** — Mac'te `norm()` düz `toLowerCase()` yapıyordu; "İstanbul" noktalı i
  ile kalıp tanıyıcının "istanbul"u ile eşleşmiyordu, yani **sesle takip Türkçe büyük İ/I ve ş/ğ/ı içeren
  kelimelerde sessizce kayıyordu**. Artık `toLocaleLowerCase('tr')` + harf katlama.
- Aynı `voicePaused` düzeltmesi Mac'te de uygulandı.
- Doğrulama: komut ayrıştırıcı gerçek Mac kaynağından çıkarılıp node ile test edildi (7 kalıp doğru, normal
  cümlelerde tetiklenme yok); sayfa Chrome'da yüklendi, sufle/hız/font/reset denendi → 0 JS hatası;
  `runVoiceCmd` ile `handleRemote` aynı IIFE içinde (satır 366-875) olduğu statik olarak doğrulandı.

### Mac/Windows sürümü tam denetimden geçti (2026-08-08, ikinci tur)

**Düzeltilen gerçek kusurlar:**
1. **Kare-bağımlı hız** — `pos += (WPM/3600)*pxPerWord` kare başına sabit piksel ekliyor ve 60 fps
   varsayıyordu. 120 Hz ProMotion MacBook'ta metin **iki kat hızlı** akıyordu. Artık delta-time
   (`pxPerSec()*dt`, dt 0.1 sn'ye kırpılı).
2. **Metin bitişi** — durma koşulu `pos > scrollHeight` idi; alt boşluk çerçevenin %70'i kadar olduğu için
   metin bittikten çok sonra duruyordu. Artık son kelime okuma çizgisini geçince duruyor ("Metin bitti").
3. **Baş hizalama** — `paddingTop = eyeOff + frameH*0.10` idi; ilk kelime okuma çizgisinin %10 altından
   başlıyordu. Artık tam çizgide.
4. **Pencere/tam ekran değişiminde yeniden ölçüm yoktu** — yalnız çerçeve boyutlanıyor, metnin baş boşluğu
   ve bitiş konumu eski ölçüde kalıyordu (hizalama kayıyordu). `relayout()` eklendi; ayrıca arka planda
   açılan sekmede rAF hiç koşmadığı için görünür olunca yeniden ölçülüyor.
5. **Kayıt türü webm'e sabitlenmişti** — `new Blob(chunks,{type:'video/webm'})`. Artık kaydedicinin gerçek
   türü kullanılıyor ve **mp4 destekleniyorsa mp4 seçiliyor** (Chrome'da destekleniyor → WebM-MP4 dönüştürme
   adımına artık gerek yok). Bit hızı 9 Mbps + 128 kbps.
6. **Kayıt tek parçada tutuluyordu** (`recorder.start()`); çökmede her şey gidiyordu. Artık saniyelik parçalar.
7. **Dosya adı** `cekim_00-00_1.webm` gibi çakışan bir addı → zaman damgalı.
8. **Geri sayım iptal edilemiyordu** (telefondaki hatanın aynısı).
9. **Kelime sayımı** başlıkları/notları da sayıyordu → süre tahmini şişiyordu.
10. **Mikrofon izi denetlenmiyordu** — ses yoksa uyarı yok, sessiz video. Artık kamera açılışında ve kayıt
    başlangıcında uyarıyor, ayrıca gerçek çözünürlüğü bildiriyor.
11. Kamera 1280×720'ye sabitti → 1920×1080 isteniyor.

**Eklenenler:** `#` bölüm başlığı + `[not]` işaretleri (telefonla aynı), fareyle sürükleyerek sarma,
tekerlek artık çalışırken de sarıyor, satır atlama, sunum kumandası tuşları (PageUp/PageDown/←/→/Home),
`K` = kayıt, Wake Lock (ekran kararmıyor).

**Doğrulama:** JS sözdizimi temiz; Chrome'da işaretli metin ayrıştırma (10 kelime/1 başlık/1 not, sayım
doğru), tüm anahtarlar-tema-yazı tipi-format-sürgü süpürmesi, senaryo ekle/sil, geri sayım iptali,
kumanda tuşları → **0 JS hatası**; `mp4` kayıt desteği doğrulandı (true).
⚠️ **Doğrulanamayan:** kaydırma hızının kendisi ve ölçüm (`measure`) — test tarayıcısındaki sekme arka planda
sayıldığı için (`document.hidden=true`) requestAnimationFrame hiç çalışmıyor. Delta-time mantığı telefonda
aynı kodla doğrulandı; Mac'te gerçek ekranda denenmeli. Kamera/kayıt/ses de izin verilemediği için denenmedi.

---

## 4d) Çekim modları (2026-08-08) — üç sürümde de var

Tek dokunuşla çerçeve + tempo + yazı boyutu + süre sınırı birlikte ayarlanır:

| Mod | Çerçeve | Tempo | Süre sınırı |
|---|---|---|---|
| Instagram Reels | 9:16 | 165 wpm | 90 sn |
| Instagram Story | 9:16 | 160 wpm | 60 sn |
| Instagram Gönderi | 4:5 | 150 wpm | — |
| YouTube Shorts | 9:16 | 170 wpm | 180 sn |
| YouTube Video | 16:9 | 145 wpm | — |
| Serbest | kendi ayarların | | |

- **Platform arayüz alanları**: alt yazı/düğme şeridi, sağ eylem sütunu ve üst bilgi çerçevenin içinde
  taralı gösteriliyor → yüz ve yazı oraya denk gelmiyor. Yüzdeler yaklaşıktır (uygulamalar sürümle değişiyor).
- **Kayıt rozeti** "geçen / sınır" gösteriyor; son 8 sn sarı, sınır aşılınca kırmızı + uyarı.
- **Metin sığıyor mu**: mod satırında anında yazıyor ("~00:47 → sınıra uygun ✓" / "12 sn FAZLA ✗").
- Mac'te yazı boyutları çerçeve genişliğine göre ayarlı (9:16 önizlemesi dar, 16:9 geniş).

Doğrulama: her iki sürümde 6 modun tamamı tek tek uygulandı — çerçeve/tempo/yazı boyutu/sınır/taralı alan
sayısı beklenen değerleri verdi, 0 JS hatası; Mac'te işaretleme dengesi de kontrol edildi (80 açılış/80 kapanış).

---

## 4e) Sesle takip yeniden yazıldı (2026-08-08)

Kullanıcı bildirimi: "komutla başlıyor ama akış titriyor, küçük bir konuşmada çok üste geçiyor, yerimi
kaybediyorum." Dört ayrı kök neden çıktı:

1. **Ara sonuçlar tekrar tekrar işleniyordu.** Tanıyıcı büyüyen metin gönderir ("bir" → "bir iki" → …);
   her olayda tamamı eşleştiriliyordu. İmleç ilerlediği için eski kelimeler ileride benzerine çarpıp
   metni fırlatıyordu. → Artık yalnız **yeni eklenen kısım** işleniyor (prefix farkı; tanıyıcı metni
   yeniden yazarsa son 3 kelime).
2. **Tek kelime eşleşmesi yeterliydi.** "bir/ve/bu" gibi sık kelimeler sıçratıyordu. → Son **5 kelimelik
   pencere** aranıyor, **en az iki kelime** tutmadan konum değişmiyor, 14 kelimeden büyük sıçrama yutuluyor.
3. **Pencere yalnız ileri bakıyordu**, kayma düzelemiyordu. → 8 kelime geriye de bakıyor.
4. **Yumuşatma kare hızına bağlıydı, hız tavanı yoktu** → titreme + ışınlanma. → delta-time + 1100 px/sn tavan.

Ayrıca **elle sarma takibi bozuyordu**: kullanıcı yerini bulmak için sardığında easeLoop eski hedefe geri
çekiyordu. `syncVoicePtr()` eklendi — sarma, satır atlama ve başa sarma sonrası takip yeni konumdan devam
ediyor. 4 sn'lik sessizlikten sonra kelime tamponu temizleniyor.

Doğrulama (algoritma gerçek kaynaktan çıkarılıp node'da simüle edildi, her iki sürüm için): içinde "bir/bu"
5 kez geçen cümle kelime kelime okunduğunda imleç **20/20 doğru** ilerledi, en büyük tek adım **2 kelime**;
tek başına "bir" demek konumu **hiç oynatmıyor**; aynı kelimeler tekrar geldiğinde ileri fırlamıyor.
⚠️ Gerçek mikrofonla denenmedi (tarayıcı otomasyonunda izin verilemiyor).

---

## 4f) CTO turu — v2.8 → v3.0 (2026-08-08)

**v2.8 — Otomatik altyazı (.srt).** Konuşma tanıma yok: kayıt sırasında her kelimenin okuma çizgisinden
geçtiği an damgalanıyor, metin senaryonun kendisi olduğu için yazım %100 doğru. Kuyruk kuralları
7 kelime / 42 karakter / 3.6 sn + cümle noktalaması + paragraf sınırı. Doğrulama: node'da 22 kelimelik
senaryo → 5 kuyruk, hiçbir kural ihlali yok, kuyruklar çakışmıyor.

**v2.9 — Kompozit kayıt.** Kayıt istenirse WebGL tuvalinden alınıyor → yeşil ekran (chroma key),
arka planı renk/görsel ile değiştirme, seçilen oranın GERÇEKTEN kırpılması (eskiden oran yalnızca ekran
kılavuzuydu, kayıt kameranın oranındaydı). Varsayılan kapalı. Shader gerçek WebGL'de test edildi:
yeşil→arka plan, kişi korunuyor, görsel arka plan, chroma kapalı geçiş, kırpma uniformları ✓.
Arka plan görseli 1280 px/JPEG'e indiriliyor — ham dataURL localStorage'ı doldurup TÜM ayarların
kaydını bozabiliyordu.

**v3.0 — Bölüm atlama, kaldığın yer, dosyadan metin, çekim yıldızı, tempo ölçeri.**
Bu turda çıkan 2 gerçek hata:
1. Ölçüm (`measure`/bölüm listesi) yalnız `requestAnimationFrame` içinde koşuyordu; arka planda açılan
   sekmede rAF hiç çalışmadığı için metin **hiç ölçülmüyordu**. Artık senkron da koşuyor.
2. `selectScript` içindeki `reset()`, hedef senaryonun kayıtlı konumunu okumadan **önce** sıfırlıyordu →
   "kaldığın yer" hiç çalışmayacaktı.

**Mac/Windows paritesi (aynı gün):** okuma şeridi (1/2/3 satır), göz teması reçetesi, bakış sapması ölçeri
(ekran yüksekliği + mesafe ile derece), bölüm atlama listesi ve `.srt` altyazı Mac sürümüne de taşındı.
Mac'te varsayılan ayarla bakış sapması **9°** çıkıyor (dizüstünde gerçekten öyle); reçete sonrası 2°.
Mac'te henüz olmayan: kompozit/yeşil ekran, kaldığın yer hafızası, dosyadan metin, çekim arşivi.

⚠️ **Cihazda doğrulanacak:** kompozitin ısı/pil maliyeti, kaydın gerçekten 9:16 çıkması, `.srt`'nin
videoyla senkronu, mikrofon/ses. Bunları tarayıcı otomasyonunda ölçemiyorum.

---

## 4g) v3.1 → v4.2 (2026-08-08, CTO turu devamı)

| Sürüm | Ne geldi |
|---|---|
| 3.1 | Senaryo işaretleme dili (`*vurgu*`, `/` `//` `(2)` gerçek duraklama), konuşulabilirlik denetimi, biyonik okuma |
| 3.2 | Işık ve çerçeve denetçisi (yüz/kenar parlaklık oranı, patlama, kontrast, eğim) |
| 3.3 | Bölüm bölüm çekim (her `#` sonunda dur, ✓ takibi) |
| 3.4 | Zorlanma haritası (yalnız gerçek sinyaller: sesle takipte tempo düşüşü, geri sarma, duraklatma) |
| 3.5 | Kayıt göstergesi (kırmızı çerçeve + KAYITTA rozeti), duraklat/devam et, ayarda canlı önizleme + sıfırlama |
| 3.6 | Altyazıyı videoya gömme (kompozit üstünde 2D katman) |
| 3.7 | Ana ekranda görünür −/+ hız kontrolü |
| 3.8 | Çekim öncesi hazırlık kontrolü (✅ tek ekranda git/gitme) |
| 3.9 | Sürüm görünür, sonuç ekranı netleşti ("Sakla" kaldırıldı), kırpma |
| 4.0 | Fotoğraflara kaydetme: iOS paylaşım tuzakları + ekranda tanı satırı |
| 4.1 | MP4 önceliği (her platform), cihaz uyumluluk paneli, Android kurulum istemi + titreşim |
| 4.2 | Statik denetimin bulduğu 3 sessiz hata |

### Bu turda yakalanan gerçek hatalar
1. **Bölüm sınırı ölü bölgesi** — `sectionAt()`'in ±2 px toleransı `curSec`'i sınırdan önce bir sonraki bölüme
   atlatıyor, durma noktası 2 px'lik boşluğa düşüyor, normal kare adımı (~3 px) sınırı atlıyordu.
   Bölüm bölüm çekim ilk bölümde hiç çalışmıyordu. Artık tüm bölüm sonları taranıyor.
2. **`selectScript` içindeki `reset()`** hedefin kayıtlı konumunu okumadan önce sıfırlıyordu → "kaldığın yer" ölüydü.
3. **rAF'a bağlı ölçüm** — arka planda açılan sekmede `measure()` hiç koşmuyordu; senkron da çağrılıyor.
4. **`scrim` id'si iki kez** kullanılmış → "Kamera üstü karartma" sürgüsü hiç çalışmıyordu.
5. **Türkçe mesaj sözlüğüne eklemeler sessizce atlanmış** (apostroflu/değişmiş desen eşleşmiyor) — 2 kez oldu:
   kayıt rozeti "recOn" yazacaktı; paylaşım tanı metinleri ham anahtar adı olarak çıkacaktı.
6. **Mac: `stopCrop` kameranın ses izini de durduruyordu** → ilk kayıttan sonra tüm çekimler sessiz olacaktı.
7. **Mac: indirme yalnız `<a download>`'a bağlıydı** → macOS Safari'de "Kaydet" hiçbir şey yapmıyordu.
8. **Mac: çerçeve yalnızca önizlemeydi** → 9:16 seçilse bile dosya yatay çıkıyordu (kullanıcı bildirdi).

### Kalıcı ders — her sürümde koşturulacak statik denetim
Yinelenen DOM id · JS'in eriştiği ama HTML'de olmayan öge · `m()`/`t()`/`data-i18n` ile çağrılıp sözlükte
olmayan anahtar · TR/EN anahtar farkı · sözlükte yinelenen anahtar. 5 ve 4 numaralı hatalar bu denetimle çıktı.

### Mac/Windows durumu
Kırparak kayıt (9:16/4:5/1:1/16:9 gerçekten uygulanıyor, iz ayarı 1080×1920 ölçüldü) · okuma şeridi ·
göz teması + bakış açısı · bölüm listesi · `.srt` + altyazı kayması · MP4 önceliği · çok kademeli kaydetme ·
durum çubuğunda cihaz uyumluluk özeti.
**Mac'e sonradan eklendi:** altyazı kayması arayüzü, **yeşil ekran (chroma key)** — telefondaki doğrulanmış
shader'ın aynısı; kırpma da artık aynı WebGL yolundan geçiyor, WebGL yoksa 2D kırpmaya düşüyor.
Perde rengi (yeşil/mavi/beyaz), eşik, kenar yumuşaklığı, arka plan rengi ve görsel (1280 px/JPEG'e küçültülür).
**Mac'e ayrıca eklendi (v4.4 turu):** despill (saçak temizliği) + 6 hazır arka plan (Stüdyo/Sıcak/Soğuk/
Bokeh/Marka/Görsel) — telefonla birebir aynı shader ve aynı üretim kodu.
**Mac'e ayrıca eklendi:** harf düzeni (Normal/BÜYÜK/küçük — CSS, metni bozmaz), 5 metin aracı
(temizle · satırları birleştir · cümle düzeni · nefes işareti · sayıları yazıya) + tek adım geri alma,
canlı ses kırpma uyarısı ve çekim sonu ses özeti.
**Mac'te hâlâ yok:** altyazı gömme, çekim arşivi, kaldığın yer hafızası, hazırlık kontrolü.

## Statik denetim aracı — `denetim.py`
Proje klasöründe. Kullanım:
```bash
python3 denetim.py "index.html" "../Teleprompter/Teleprompter Pro.html"
```
Denetlediği: yinelenen DOM id · JS'in eriştiği ama HTML'de olmayan öge · **tanımsız fonksiyon çağrısı** ·
`m()`/`t()`/`data-i18n` ile çağrılıp sözlükte olmayan anahtar · TR/EN farkı.
Kasten bozulmuş kopyada hem çakışan id'yi hem tanımsız çağrıyı yakaladığı doğrulandı.
**Sebebi:** ses izleme bloğu bir turda dosyaya hiç eklenmemişti (desen eşleşmedi, sessizce atlandı);
çağrılar vardı, tanımlar yoktu — kayıt düğmesi çökecekti. Bu sınıf 4 kez tekrarladı.

---

## 5) Sonraki tur için sırada ne var

1. **İkinci cihazdan kumanda (telefon/iPad ekranı kumanda olsun)** — küçük bir relay sunucusu gerekir
   (Vercel'de ~30 satır WebSocket). Erdal kararı bekliyor; fiziksel kumanda + sesli komut şimdilik yerini tutuyor.
2. **Kayıt sonrası kırpma** — çerçeve kılavuzu şu an sadece kılavuz; gerçek kırpma için WebCodecs.
3. **Sahne/senaryo bölümlerine atlama listesi** (uzun metinlerde `#` başlıklarına dokunarak atlama).
4. Metinden otomatik WPM önerisi (deneme okumasından ölçüp öner).
5. Mac ve Windows sürümlerini bu tek dosyayla birleştirmek (şu an üç ayrı kod tabanı, v1 mimarisinde).
