# SUFLE — Pazar Yol Haritası (Ağustos 2026)

**Amaç:** SUFLE'yi iOS · Android · Mac · Windows'ta **aynı anda** markete çıkacak,
2026 arayüz standardında, rakiplerle her yönüyle boy ölçüşen bir ürün hâline getirmek.

**Yetki:** Erdal CTO yetkisi verdi. Sıra bende, kapıda durmuyorum.
Durma noktaları yalnız `CLAUDE.md` → "⛔ Onay olmadan asla" listesidir (`git push`, prod, `.pem`).

**Bu dosya loop'un beynidir.** Her turda: buradan sıradaki AÇIK maddeyi al → yap → `./kapi.sh` yeşil →
maddeyi ✅ işaretle + ölçülen kanıtı yaz → commit. Kanıtsız ✅ yasak.

---

## 0 · Rekabet analizindeki YANLIŞLARI önce düzelt (Tur 0)

Erdal'ın verdiği 30-kategorili analiz **yalnız `mac/Teleprompter Pro.html`'e (2.824 satır) bakmış**.
Asıl ürün `index.html` (6.357 satır PWA). Bu yüzden analizin şu iddiaları **şüpheli**:

### ✅ T0.1 — kaynaktan doğrulandı (2026-08-14)

| Analiz diyor | Gerçek | Kanıt |
|---|---|---|
| "Mobil yok, sadece masaüstü tarayıcı" | ❌ **YANLIŞ** | `index.html` 6.357 satır PWA; `manifest.json` + `sw.js` + `share_target` |
| "PWA → Faz 4'te yapılacak" | ❌ **YANLIŞ** | zaten var, canlıda kurulu |
| "MediaRecorder → .webm, ayrı Dönüştür.command gerek" | ❌ **YANLIŞ** | `video/mp4;codecs="avc1.42E01E,mp4a.40.2"` **iki dosyada da** öncelikli |
| "Test yok" | ❌ **YANLIŞ** | `tests/` 126 dosya + `beklenen.json` iddia tabanı + `kapsam.py` kapsam kapısı |
| "Bulut senkron yok" | ✅ **DOĞRU** | `supabase`=0, uzak `fetch` yok |
| "AI sıfır" | ✅ **DOĞRU** | `openai\|anthropic\|gemini` = 0 (iki dosyada da) |
| "İçe aktarma yok" | ✅ **DOĞRU** | `docx`=0; `pdf` eşleşmeleri yalnız U+2028 **yorumu** — içe aktarma değil |
| "Onboarding yok" | ⚠️ **KISMEN** | `firstRun()` (satır 5490) 3 adımlı karşılama paneli **var**; etkileşimli tur yok |
| "Klasör/etiket/arama yok" | ⚠️ **KISMEN** | **arama VAR** (`#setFind` ayarlarda, `#scriptFind` senaryolarda); klasör/etiket yok |
| "localStorage = tüm senaryolar gider" | ⚠️ **KISMEN** | çekimler **IndexedDB**'de (satır 3733); **senaryolar** hâlâ localStorage → risk gerçek ama dar |

**Grep sayımı kanıt değil** (CLAUDE.md kural 7) — bu turda iki kez kurtardı:
`import` 32 eşleşme çıktı, hepsi `!important`; `etiket` 17 eşleşme, hepsi yayın-paketi etiketi + a11y etiketi.

### ✅ T0.3 — gerçek başlangıç skoru: **54,5** (ilan 53,6 idi)

Puan modeli **birebir yeniden üretildi**: ağırlık toplamı 94, maks 470, ağırlıklı toplam 252 → 53,6.
Model tutarlı, yani analizin aritmetiği güvenilir. Tek düzeltme:
**#20 Platform kapsamı 2 → 3** (PWA dört platformda da koşuyor; 4'e çıkması Safari/PWA sınırlarının
ölçülmesine bağlı, 5 ise mağaza kabuklarıyla Faz F'te gelir). 256/470 = **54,5**.

**Turun asıl bulgusu:** analizin 4 yanlışı **skoru neredeyse hiç değiştirmiyor** (+0,9).
Yani yol haritası sağlam — yanlışlar özelliklerdeydi, teşhiste değil. Analizi daha fazla
sorgulamaya tur harcamıyorum; sıradaki iş gerçek eksikler.

### ✅ T0.2 — platform farkı makineyle çıkarıldı (`fark.py`)

Ölçüt **fonksiyon adı değil DOM yüzeyi**: iki dosya aynı işi farklı adlandırıyor
(`st.` / `state.`), ad karşılaştırması yüzlerce sahte fark üretirdi. Etkileşimli ögelerin
id'si + görünür etiketi karşılaştırılıyor; id değişmiş ama etiket karşıda duruyorsa fark sayılmıyor.

| Ölçüm | Değer |
|---|---|
| telefon etkileşimli yüzey | **106** |
| Mac etkileşimli yüzey | **50** |
| ortak id | **22** |
| telefonda var, Mac'te yok | **76** |
| Mac'te var, telefonda yok | **23** |
| yalnız ad farkı (özellik iki tarafta da var) | **13** |

**Mac'in telefonda olmayan gerçek özellikleri:** `pipBtn` "🪟 Yüzen Sufle" (Zoom/Teams üstünde
okuma — analizdeki **Tip B rakip paritesi**), `undoDelBtn` "Geri getir", `scImport`, `fsBtn`, `resetBtn`.

**Araç iki kez kendi kendini yalanladı, ikisi de kayda değer:**
1. İlk kurtarma ölçütü **yapısal olarak ateşlenemiyordu** — id'ler İngilizce (`pipBtn`), etiketler
   Türkçe; `normal("pipBtn")` bir etikete asla eşleşmez. Araç "0 şüpheli" deyip doğru görünüyordu.
   Düzeltince 0 → **22** kurtarma. Artık `--kanit` iki vakayla ayırt ettiğini kanıtlıyor.
2. `rrDownload` etiketi "İndir (.webm)" görünüyor → "Mac hâlâ webm veriyor" sanılırdı.
   **Yanlış:** satır 1875 etiketi çalışma zamanında gerçek uzantıyla yeniden yazıyor.
   Araç belgesine "çıktısı hipotezdir" uyarısı eklendi.

`fark.py` kapıya **bağlanmadı** — tabanı yok, raporlama aracı. Taban gerekirse FAZ A sonunda eklenir.

---

## 1 · FAZ A — Tek çekirdek (en kritik mimari borç)

İki dosya diverge etti (6.357 vs 2.824; ortak yüzey yalnız 22/106). Dört platforma **aynı anda**
çıkmanın ön koşulu: özellik iki kez yazılmasın. Aksi hâlde her yeni özellik 2× maliyet + kalıcı davranış farkı.

### 🔴 Mimari karar — ES modülü ELENDİ, ölçümle (2026-08-14)

Yol haritasının ilk hâli "`<script type=module>`, build yok" diyordu. **Ölçüldü, yanlış çıktı.**
Chrome headless, aynı çekirdek iki biçimde, `file://` üzerinden:

| Biçim | `file://` sonucu |
|---|---|
| `<script type="module">` + `import` | ❌ **BASLANGIC** — modül hiç yüklenmedi |
| `<script src>` klasik | ✅ **CEKIRDEK-YUKLENDI** |

Üstelik **sessizce** başarısız oluyor: hata yok, uygulama boş açılır. Bu deponun 2 numaralı
tekrarlayan hata sınıfı. Mac kullanıcısı HTML'e çift tıkladığında (`file://` — hafızada kayıtlı,
"kumanda yok" sanılan vaka da buydu) uygulama **tümden açılmazdı**.

**İkinci ve daha ağır gerekçe:** ürünün kimliği "tek dosya, sıfır bağımlılık" (`CLAUDE.md`).
`çekirdek/*.js`'e bölmek bunu bozar — kullanıcı tek HTML'i kopyaladığında uygulama kırılır.

**Karar:** kaynak `çekirdek/` modüllerinde yaşar, **derleme adımı** onları iki kabuğun içine
**gömer**. Çıktı yine tek dosya, sıfır bağımlılık, `file://` uyumlu.

**Derlemenin bedeli ölçülü olarak biliniyor:** kaynak ile çıktının ayrışması (Erdal'ın diğer
depolarında "bayat dist" iki kez pahalıya patladı). Bu yüzden derleme adımı kapıya bağlanacak:
**kapı çıktıyı yeniden üretip diff alır; fark varsa KIRMIZI.** Bayat çıktı imkânsız hâle gelir.

### Görevler

**A.1** ✅ **BİTTİ** — `derle.py` + `cekirdek/jetonlar.css`, iki kabuğa da gömülüyor.
Kapıya **1. adım** olarak bağlandı ("Derleme tazeliği"): kaynak değişip kabuk yenilenmezse KIRMIZI
(ölçüldü: bayatlıkta çıkış 1, tazede 0). En başa kondu çünkü çıktı bayatsa sonraki yedi adım da
yanlış dosyayı ölçer. Kapı 7 → **8 adım**.
· Jetonlar bugün **hiçbir kuralı değiştirmiyor** — boru hattı bilerek görsel değişiklik olmadan
kanıtlandı (`class="tnum"` kullanan öge sayısı: 0). Kurallara geçiş B.1'de.
· Kontrast **hesaplanarak** seçildi, `tests/121` her koşuda yeniden hesaplıyor (26 iddia).
**Ölçümün ortaya çıkardığı tasarım gerçeği:** metin kırmızısı ile üstüne beyaz yazı gelen dolgu
kırmızısı **aynı renk olamıyor** (#FF4D4F metin 5,19 ✓ ama dolgu 3,27 ✗). Roller dolgu/metin diye
ayrıldı; tek renkle idare etmek erişilebilirliği sessizce kırardı.
· Bozma koşturucusu çekirdek modüllerini de bozabiliyor artık (`jeton` kaynağı). İlk denemede
`cekirdek` diye **var olmayan bir kaynak** uydurmuştum — o iki bozma hiç koşmayacaktı, kapı yakaladı.

**A.1'de çıkan yan bulgu — kapsam kapısı sessizce silahsızlanıyormuş:**
`tests/kapsam.json` tabanı `{"index.html":0}` hâlinde bulundu (Mac girdisi tümden kayıp, index 51→0).
Kaynağı bulundu: `tests/113` kapıyı sınamak için tabanı **gerçek dosyada** geçici bozuyor ve geri
koyuyor; geri koyma **sinyale dayanıklı değildi**. Ölçüldü: eski sürüm `kos()` içinde SIGTERM alınca
taban bozuk kalıyor (çıkış 143), yeni sürüm sinyali yakalayıp geri koyuyor. Tetikleyici de bilinen:
`kos.js` test başına 60 sn tavan uyguluyor ve bu test python3'ü birkaç kez çağırıyor — yani kaza
tekrar edecekti. `finally` + `exit` + `SIGTERM/SIGINT/SIGHUP` işleyicisi eklendi.
**A.2a** ✅ **BİTTİ** — `I18N` + `MSG` → `cekirdek/sozluk.js`, telefona derlemeyle gömülüyor.
Taşımanın **birebir** olduğu md5 ile kanıtlandı (I18N 19.016 karakter, MSG 14.154 karakter, iki hash de
aynı); telefon davranışı değişmedi. `tests/121` artık pariteyi de kilitliyor: **tr 240 · en 240 · eksik 0**,
ve kabukta `I18N`/`MSG` **tam olarak birer kez** tanımlı (ikinci tanım JS'te sessizce gölgeler).

**A.2b** ⏳ **BÜYÜK KISMI BİTTİ** — Mac artık sözlüğü kullanıyor: `data-i18n` **0 → 85**.
27 yeni anahtar + 8 Mac'e özel anahtar sözlüğe eklendi (TR/EN parite **275/275**).
`applyLang()` yazıldı ve başlatmaya bağlandı; **Türkçede hiçbir şeyi değiştirmediği ölçüldü**
(85 ögenin 85'inde işaretleme metni sözlük değeriyle birebir).

**A.2c** ⏳ 21 yeni anahtar + 28 öznitelik bağlandı (`data-i18n-title` / `data-i18n-ph` / `data-aria`);
`applyLang` artık `title` ve `aria-label` da çeviriyor. Parite **296/296**.
**Kapsam 69 → 41** (aynı ölçütle önceki commit'e karşı ölçüldü).

**Dil düğmesi HÂLÂ eklenmedi — bu turda iki kez daha haklı çıktı.** Ölçütüm iki kez dardı:
① yalnız öge metni sayılıyordu, 28 öznitelik görünmüyordu → "0 eksik" deyip düğmeye yeşil ışık
yakacaktı (ekran okuyucu kullanan biri arayüzün tamamını Türkçe duyardı);
② öznitelikler eklendi ama `<span>` ve iç içe ögeler hâlâ dışarıdaydı → durum çubuğu ve bütün
anahtar etiketleri sayılmıyordu, **53 metin daha**. Ölçüt artık **eleme** ile çalışıyor: bütün
görünür metinler sayılır, kapsananlar ve **gerekçesi yazılı** istisnalar düşülür.

Kapı ayrıca üç yarım yapıyı reddetti — üçü de düğme turuna ertelendi: `setLang()` (çağıran yok),
`mLangTR/EN` anahtarları (kullanan yok), `state.lang` okuması (yazan yok).
**A.2d** ✅ **BİTTİ — Mac tam iki dilli.** Kapsam **41 → 0**; 31 yeni anahtar (parite **327/327**);
dil düğmesi (TR/EN) durum çubuğunda, okuma+yazma+düğme birlikte geldi.
**Gerçek tarayıcıda doğrulandı:** `🎯 Göz çizgisi → 🎯 Eye line`, `Çekime hazır mıyım? → Am I ready
to shoot?`, `lang="en"`. No-op iddiası bir hata da yakaladı: `mHScripts` başlığa konsaydı
applyLang h3 içindeki ＋ düğmesini silecekti — iç span'e alındı.
`denetim.py` ayrıştırıcısında iki katman kör nokta bulundu ve düzeltildi (dize içindeki `:` sahte
anahtar üretiyordu; çift tırnaklı `"Dosyalar'a Kaydet"` maskeleyiciyi şaşırtıyordu).

### 🎯 ERDAL TALİMATI (2026-08-14 akşam): "en gelişmiş dizayn, tek tuş, görsel ve içeriksel"
FAZ B öne çekildi ve ölçütü yükseltildi: yalnız jeton geçişi değil — **tek tuşla çekime giden,
2026 standardında, dört platformda aynı hiyerarşi**. Sıradaki tur B.1+B.3 birlikte:
rol renkleri + aşamalı açılım ("ilk açılışta yalnız metin + BAŞLAT + hız").

Bu adımın ortaya çıkardığı üç yapısal sonuç:
1. **Sözlük ikiye ayrıldı** (`sozluk.js` = etiketler, `mesajlar.js` = mesajlar). Hepsini Mac'e
   gömünce telefona özgü metin ("Ayarlar → Safari → Kamera") Mac dosyasına sızdı ve `tests/52`
   haklı olarak kırıldı — Mac'te Safari izni diye bir şey yok. **Kabuk kullandığını gömer.**
2. **`denetim.py` iki geçişli oldu.** Ölü anahtar denetimi tek dosyaya bakıyordu; sözlük
   ortaklaşınca Mac'in kullandığı anahtar telefonda ölü göründü ve **35 sahte ölü anahtar** çıktı.
   Kullanım artık bütün kabuklardan toplanıyor.
3. **`tests/108` biçime kilitliydi** — markup'ı birebir eşleştiriyordu, `data-i18n` eklenince
   kırıldı, oysa kullanıcı için hiçbir şey değişmemişti. Desen iddiaya bağlandı.

*(Eski ölçüm, kayıt için)* Kapsam ölçüldü:
**Mac'te 105 görünür etiket, 58'inin (%55) telefon sözlüğünde karşılığı zaten var**
(`1 satır`→`b1`, `Ayarlar`→`settings`, `Bokeh`→`bkBokeh`…). Kalan **47** etiket yeni anahtar + İngilizce
çeviri istiyor. Buna Mac'e `t()`/`m()`/`applyLang()` + dil düğmesi eklemek ve 105 özniteliği göçürmek
ekleniyor → **tek başına bir tur**. Yarım bırakılırsa deponun 1 numaralı hata sınıfı olur
("yarım kalmış düzeltme"), o yüzden bölündü.
Sözlük Mac'e **henüz gömülmüyor**: kullanılmayan 250 satır ölü koddur ve `denetim.py` haklı olarak bağırır.
**A.3** Motor + işaretleme + SRT çekirdeğe taşınır; iki kabuk da aynı kodu gömer.
**A.4** Mac'te eksik özellikler (kompozit, arşiv, hazırlık) çekirdekten otomatik gelir.
**Bitti ölçütü:** bir özelliği çekirdekte değiştir → iki çıktıda da değişsin; kapı bayat-çıktıyı yakalasın.

---

## 2 · FAZ B — 2026 arayüzü (rakiplerin en iyisini taklit)

Taklit hedefi **Teleprompter.com**: özellik listesi değil **hiyerarşi disiplini**.
Ek kaynaklar: Elgato (odak modu), BIGVU (çekim sonrası akış), Video Teleprompter UK (kamera kontrolü).

**B.1 Tasarım jetonları.** ⏳ **başladı** — `--accent` iki kabukta da `var(--r-action)`'a bağlandı
(#00C853 → #00D47E, ölçülmüş kontrast 8,21 → 8,65); 12 sayısal gösterge `tabular-nums` aldı
(HUD, kayıt süresi, hız, geri sayım, Mac saat/sayaç). `tests/123` kilitliyor (15 iddia).
Kalan: rol ayrımı (kayıt kırmızı ayrı jetonda ama vurgu hâlâ tek yeşil), tipografi ölçeği, boşluk ritmi.

**📏 B.3 ölçümü tarayıcıda yapıldı — analizin iddiası telefon için YANLIŞ çıktı:**
telefon ilk açılış **5 kontrol**, ana ekran **9 kontrol** — Teleprompter.com disiplini telefonda
**zaten var**. "40+ kontrol" Mac'in sağ paneline ait. B.3'ün gerçek hedefi **Mac paneli**;
telefonun sadeliği korunması gereken varlık (test 123 §3 bunu kilitliyor: intro ≤6 düğme).
**B.2 Emoji → SVG ikon.** Tek sprite, 20×20 stroke. "Amatör → ürün" algısının yarısı bu.
**B.3 Aşamalı açılım.** İlk açılışta yalnız: metin + BAŞLAT + hız. Gerisi sekme/`<details>` arkasında.
Sağ panel 3 sekme: **Okuma · Çekim · Görünüm**, sekme başına ≤6 kontrol.
**B.4 Odak modu.** Çekim başlayınca kabuk kaybolur: metin + ince ilerleme + süre + kayıt noktası.
**B.5 Durum satırı.** "Sesle takip · tr-TR · mikrofon açık" — kullanıcı hangi moddayım diye denemesin.
**B.6 Klavye + kısayol kartı.** `↑↓` hız, `M` ayna, `R` kayıt, `F` tam ekran, `?` kart.
**B.7 Onboarding.** 4 adım, atlanabilir, bir kez.
**B.8 Erişilebilirlik sütunu.** OpenDyslexic + Lexend, kontrast temaları, AA 4.5:1 zorunlu, ekran okuyucu.
**Bitti ölçütü:** ilk açılışta görünen kontrol sayısı ≤ 5; kontrast denetimi 0 ihlal; dört platformda aynı.

---

## 3 · FAZ C — Veri sağlamlığı (en yüksek risk azaltımı)

**C.1** IndexedDB'ye tam geçiş + `localStorage` göçü (eski kullanıcı verisi kaybolmadan).
**C.2** Otomatik yedek dışa aktarma + geri yükleme (tek dosya, tüm senaryolar + çekimler).
**C.3** Klasör + etiket + arama + sürüm geçmişi.
**C.4** Geriye dönük uyum testi: eski kayıt nesnesiyle koş (`CLAUDE.md` kuralı).

---

## 4 · FAZ D — Rakip paritesi (gerçek eksikler)

**D.1 İçe aktarma:** `.docx` (mammoth), `.pdf` (pdf.js), düz metin, pano. Sıfır bağımlılık kuralı gözden geçirilecek.
**D.2 Kamera kontrolleri:** odak/pozlama kilidi, harici kamera seçimi, ön/arka.
**D.3 Kumanda genişliği:** Bluetooth klavye/pedal tuş eşlemesi (öğrenmeli, zaten var → genişlet).
**D.4 Uzak önizleme:** telefon kumandasında kameranın gördüğü kare. Güçlü farklılaşma.
**D.5 Entegrasyon:** sanal kamera / OBS / Zoom yolu (masaüstünde gerçekçi).
**D.6 Video düzenleme:** kırpma zaten var → başlangıç/bitiş budama + hızlı kesme.

---

## 5 · FAZ E — AI katmanı (rakiplerin tek gerçek üstünlüğü)

Sunucu gerektirir → **Erdal kararı** (CLAUDE.md: sunucu gerektiren işi kendiliğinden başlatma).
Hazırlık yapılır, anahtar/uç bağlama onayla.

**E.1** Türkçe senaryo yazarı: konu + hedef süre → kelime sayısı ayarlı metin.
**E.2** Yeniden yazım: sadeleştir / 30 sn'ye sığdır / daha samimi.
**E.3** Whisper (WASM veya API) → sesle takip Chrome bağımlılığından kurtulsun, Safari/Firefox açılsın.
**E.4** Prova raporu: hız, duraklama, dolgu kelime (şey/yani/ııı). **Bu kategoride kimsede yok.**

---

## 6 · FAZ F — Markete çıkış (dört platform aynı anda)

**F.1** iOS + Android: Capacitor kabuğu, aynı çekirdek. Kamera/mikrofon/dosya izinleri, gizlilik bildirimi.
**F.2** Mac: imzalı `.app` (Tauri veya Capacitor Electron), notarize.
**F.3** Windows: `.exe`/MSIX, Microsoft Store.
**F.4** Mağaza varlıkları: ikon seti, ekran görüntüleri (4 platform), tanıtım metni TR+EN, gizlilik politikası.
**F.5** Ödeme modeli: bedava = 1080p + filigran; ücretli = 4K + filigransız + altyazı + bulut.
**F.6** Web vitrin + Türkçe SEO ("sufle uygulaması", "teleprompter programı") — **rakipsiz alan**.

---

## Karar bekleyen (Erdal)

- **Bağımsız ürün mü, edugo modülü mü?** Analiz "edugo modülü" öneriyor; kullanıcı "markete çıkmak" dedi
  → **bağımsız ürün** varsayımıyla ilerliyorum, ters karar gelirse Faz F durur, A–D yine değerli.
- Bulut/hesap sağlayıcısı (Supabase) ve AI uç noktası → anahtar gerektirir.
- `git push` her yayında ayrı onay.

---

## Tur günlüğü

| Tur | Tarih | İş | Kanıt | Kapı |
|---|---|---|---|---|
| — | 2026-08-14 | Yol haritası kuruldu, başlangıç VER=9.7, 126 test | — | — |
| 0 | 2026-08-14 | T0.1 + T0.3: analizin 10 iddiası kaynaktan sınandı | 4 çürüdü · 3 doğrulandı · 3 kısmen; skor 53,6 → **54,5** | ⬜ kod değişmedi |
| 1 | 2026-08-14 | T0.2: `fark.py` — platform yüzey farkı çıkarıcı | telefon 106 / Mac 50 etkileşimli yüzey; 76 telefon-özel, 23 Mac-özel, 13 yalnız-ad; ölçüt `--kanit` ile ayırt ediyor | 6/7 yeşil (VER doğru kırmızı) |
| 2 | 2026-08-14 | FAZ A mimari kararı: ES modülü elendi (ölçüldü) + `tests/120-file-protokolu.js` | Chrome headless `file://`: modül YÜKLENMEDİ, klasik çalıştı; 8 iddia, 3 kasıtlı bozmanın 3'ü kapıda yakalandı | 6/7 yeşil (VER doğru kırmızı) |
| 3 | 2026-08-14 | A.1: `derle.py` + jeton çekirdeği + kapı 8. adımı; kapsam tabanı onarımı | bayatlık çıkış 1/0 ölçüldü · 26 iddia · 2 bozma kapıda · SIGTERM'de taban artık korunuyor | 7/8 yeşil (VER doğru kırmızı) |
| 4 | 2026-08-14 | A.2a: sözlük çekirdeğe taşındı + parite kilidi | md5 birebir (I18N+MSG) · tr/en 240/240 · 27 bozma kanıtlı · Mac eşleşmesi %55 ölçüldü | 7/8 yeşil (VER doğru kırmızı) |
| 5 | 2026-08-14 | A.2b: Mac sözlüğü kullanıyor (data-i18n 0→85) + kapsam kapısı | parite 275/275 · applyLang TR'de no-op (85/85 birebir) · eksik 28 ölçüldü · denetim.py iki geçişli | 7/8 yeşil (VER doğru kırmızı) |
| 6 | 2026-08-14 | A.2c: 28 öznitelik + 21 anahtar; kapsam ölçütü iki kez düzeltildi | kapsam **69 → 41** (önceki commit'e karşı ölçüldü) · parite 296/296 · applyLang TR'de no-op (öznitelikler dahil) | 7/8 yeşil (VER doğru kırmızı) |
| 7 | 2026-08-14 | A.2d: Mac tam iki dilli — kapsam 41→0, dil düğmesi, tarayıcı kanıtı | EN geçişi gerçek tarayıcıda doğrulandı · parite 327/327 · denetim.py 2 kör nokta | 8/8'in 7'si yeşil (VER doğru kırmızı) |
| 8 | 2026-08-14 | B.1 başlangıç: jetonlar kullanımda + tnum ×12 + ilk-açılış ölçümü | accent→r-action iki kabukta · telefon 5/9 kontrol (analiz iddiası çürüdü) · 15 iddia | 7/8 yeşil (VER doğru kırmızı) |
