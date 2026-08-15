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

**A.2b** ✅ **BİTTİ** — Mac artık sözlüğü kullanıyor: `data-i18n` **0 → 85**.
27 yeni anahtar + 8 Mac'e özel anahtar sözlüğe eklendi (TR/EN parite **275/275**).
`applyLang()` yazıldı ve başlatmaya bağlandı; **Türkçede hiçbir şeyi değiştirmediği ölçüldü**
(85 ögenin 85'inde işaretleme metni sözlük değeriyle birebir).

**A.2c** ✅ **BİTTİ (Tur 33).** Etiketler + öznitelikler + **mesajlar**.

*Mesaj yarısı:* Mac'in 68 uyarı metni `cekirdek/mac-mesajlar.js` sözlüğüne taşındı ve `m()`
ile bağlandı — **çevrilmemiş 67 → 0**, TR/EN parite 68/68, hiçbir İngilizce karşılıkta Türkçe
kalıntı yok (ölçüldü). Sözlük Mac'e özeldir: telefonun `MSG`'si iOS'a özgü yollar
("Safari → Kamera") taşıyor ve daha önce Mac'e sızmıştı.

*Bu turun asıl dersi:* metin yerini değiştirince **11 test kırmızıya döndü** — hepsi
kullanıcıya NE SÖYLENDİĞİNİ arıyordu, cümle artık anahtarın arkasındaydı. İki kolay yanlış
vardı: testleri "bir şey söyleniyor"a gevşetmek (boş uyarı da geçerdi) ya da anahtar listesini
testlere gömmek (sözlük değişince sessizce yalan söylerdi). Yapılan: `tests/kaynak.js` içine
**gerçek sözlükten çözen** `macMetni()` eklendi; iddialar yine kullanıcının okuduğu cümleye
bağlı. Çözücünün kendisi de iki hata verdi ve ikisi de ölçüldü: tek tırnakla sarmak
"Mac'in Wi-Fi" mesajında tezgâhı kırdı, kaçış eklemek metni bozup aramayı öldürecekti —
tırnak artık **metne bakılarak** seçiliyor.

*Eski durum:* 21 yeni anahtar + 28 öznitelik bağlandı (`data-i18n-title` / `data-i18n-ph` / `data-aria`);
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
**B.2 Emoji → SVG ikon.** ⏳ **başladı** — `cekirdek/ikonlar.html` (Feather/MIT, stroke,
`currentColor`) + `derle.py` HTML-modül desteği. Telefonun 4 krom düğmesi geçti
(⚙︎📝✅🎤 → sliders/belge/onay/mikrofon), **tarayıcıda doğrulandı: 4/4 çizim, 22×22**,
erişilebilir adlar korundu. Kapsam bilerek dar: `playBtn/pauseBtn` çalışma zamanında yazılıyor
(▶︎/⏸ zaten tek renk), sözlük emoji önekleri İÇERİK — dokunmak i18n birebirlik iddialarını kırar.
Kalan: Mac krom düğmeleri (çalışma zamanı yazımlarıyla birlikte), sekme/sheet başlık ikonları.
**B.3 Aşamalı açılım.** ✅ **Mac paneli BİTTİ** — sağ panel 3 sekme (Okuma · Çekim · Görünüm),
telefonla aynı katmanlar, sözlükten etiketli. **Tarayıcıda doğrulandı:** varsayılan sekmede Çekim'in
27 kontrolü DOM akışından çıkıyor; sekme seçimi yeniden yüklemede korunuyor (`state.rtab`, eski
kayıtlara dayanıklı okuma). Yan kazanç: `.seg` stili — A.2d'deki dil düğmesi **çıplak tarayıcı
düğmesi** olarak kalmış, bu turda yakalandı ve stillendi.
Telefonda B.3 gereksiz çıktı (ilk açılış 5 kontrol, ölçüldü) — sadeliği test koruyor.
**B.4 Odak modu.** ✅ **telefon BİTTİ** — ve mevcut özellik bir TUZAKMIŞ: "Kayıtta düğmeleri
gizle" açıkken alt çubuk `pointer-events:none` oluyordu ve **kaydı durduracak düğme o çubukta**;
geri getirme yoktu, tek çıkış sesli komuttu. `peekUI()` eklendi: ilk dokunuş kabuğu getirir
(eylem yapmaz), 4 sn dokunulmazsa kayıt sürerken yeniden gizlenir; kabuk açıkken her dokunuş sayacı
tazeler. **Tarayıcıda kanıtlı** (dokunuş→geldi, 4,6 sn→yeniden gizli). Tuzak kapanınca odak modu
**varsayılan AÇIK** yapıldı (yalnız yeni kurulum — eski kayıtta alan yazılı). `tests/124`, 10 iddia +
kapıda kanıtlı bozma. **Mac tarafı da BİTTİ:** kayıt başlarken paneller kendiliğinden kapanıyor (`full`), kayıt bitince
**yalnız gerekirse** geri açılıyor — kullanıcının H ile açtığı düzen saklanıp aynen geri geliyor
(önce-sakla-sonra-kapat sırası testte kilitli; ters sıra özelliği sessizce yarım bırakırdı).
Kapıda kanıtlı bozma: geri dönüş satırı sökülünce test kırılıyor.
**B.5 Durum satırı.** ✅ **telefon BİTTİ** — HUD'a mod rozeti: `✋ Elle` / `▶︎ Otomatik` /
`🎤 Sesle · tr-TR`, rol renkleriyle (ses=bilgi mavisi, otomatik=eylem yeşili). **Dil de yazıyor** ve
bu kasıtlı: sesle takip yanlış dilde açıksa hiçbir kelime eşleşmez, sufle durur, kullanıcı sebebini
göremez. Tarayıcıda doğrulandı (Elle → Otomatik + rol sınıfı).
İki ders: ① rozet **senkron** güncelleniyor — rAF'a bırakılınca arka plan sekmesinde hiç koşmuyordu
(deponun 2 numaralı ölçüm tuzağı); ② tazeleme **arayüz katmanında**, `stopVoice`'un içinde değil —
o fonksiyon `tests/36`'da yalıtılmış koşuyor ve global bağımlılık **6 iddiayı birden düşürmüştü**.
**B.6 Klavye + kısayol kartı.** ✅ **BİTTİ** — `?` her iki kabukta da kartı açıyor.
**Kart sabit liste DEĞİL:** Mac'te durum çubuğunun gerçek `<kbd>` bağlarından üretiliyor
(tarayıcıda doğrulandı: 7 kısayol), telefonda `renderMap()` ile **kullanıcının kendi öğrettiği**
kumanda haritası çiziliyor. Sabit yazılsaydı bir kısayol değişince kart sessizce yalan söylerdi.
Neden gerekliydi: Mac'te `#statusbar` 820 pikselin altında `display:none` — dar pencerede tek keşif
yolu kayboluyordu; telefonda içerik vardı ama **tek girişi "Uzaktan kumanda" paneliydi**
(analizdeki "jargon = görünmezlik"). Yazı alanındayken `?` yok sayılıyor.
Mac'e `t()` bu turda eklendi — ilk gerçek kullanıcısı doğduğu için.
**B.7 Onboarding.** ✅ **BİTTİ — ama çok adımlı tur YAZILMADI.** CTO kararı: her adım bir çıkış
noktasıdır ve kimse okumaz; 2026 pratiği açıklama değil **aktivasyon**. Karşılama tek birincil
eylemle bitiyor: **"Metnimi yapıştır"** → senaryo sayfası açılıyor + metin alanına odak.
İkincil "Önce kendim bakayım" yalnız kapatıyor (baskı yok). Eylem satırı **yalnız gerçek ilk
kurulumda** görünür; sürüm notu için elle açıldığında gizleniyor (sayfa iki amaca hizmet ediyor).
Tarayıcıda üç davranış da doğrulandı.
**B.8 Erişilebilirlik sütunu.** ⏳ **iki dilim bitti.**
**🔴 DIŞ FONT GÖMÜLMEDİ — ölçülerek karar verildi.** OpenDyslexic tek ağırlık ~150 KB base64,
dört ağırlık Mac dosyasını **ikiye katlardı** ve "tek dosya, sıfır bağımlılık" sözünü bozardı.
Üstelik gerek de yoktu: telefon bu işi **sistem fontlarıyla zaten çözmüştü**
(`Chalkboard SE / Comic Sans MS / Comic Neue` + `.02em` harf aralığı).
· **Gerçek boşluk Mac'teydi:** 4 yazı tipi seçeneği vardı, **disleksi yoktu** — analizin "okul
bağlamında altın değerinde" dediği özellik masaüstünde eksikti. Eklendi, yığın telefonla **birebir**
(tarayıcıda doğrulandı: font + `1.28px` harf aralığı uygulanıyor).
· **Hareket azaltma** Mac'e eklendi (telefonda vardı). Sufle akışı **durmuyor** — o süsleme değil
ürünün işi; duran şey nabız ve panel geçişleri.
· **Mac yüksek kontrast eklendi** — sözlükte `tgHicon` anahtarı vardı ama **uygulama yoktu**,
yani şu ana dek **ölü bir çeviriydi**. Ölçülen kazanç: kenarlık kontrastı **1,29:1 → 21:1**,
vurgu 15,6:1. İşletim sistemi tercihi **bir kez** devralınıyor (`hiconSoruldu` bayrağı olmasaydı
kullanıcının kapattığı ayar her açılışta geri açılırdı). Tarayıcıda doğrulandı.
**B.8 kapandı.** Kalan tek kalem: kontrast denetiminin kapıya bağlanması (jetonlar için `tests/121`
zaten hesaplıyor; kabuk kuralları için ayrı bir tarayıcı-tabanlı ölçüm gerekir).
**Bitti ölçütü:** ilk açılışta görünen kontrol sayısı ≤ 5; kontrast denetimi 0 ihlal; dört platformda aynı.

---

## 3 · FAZ C — Veri sağlamlığı (en yüksek risk azaltımı)

**C.1** ❌ **ELENDİ — ölçümle.** Yol haritası "senaryolar IndexedDB'ye taşınsın" diyordu.
Uygulamadan **önce ölçtüm ve gerekçe çürüdü**:

| Ölçüm (Chrome, gerçek tarayıcı) | Değer |
|---|---|
| `localStorage` gerçek tavanı | **4,94 MB** (`QuotaExceededError` ile) |
| IndexedDB kotası | ~10 GB (2073×) |
| 2 dakikalık senaryo | **2.037 bayt** |
| Yedek kopyasıyla tavana sığan senaryo | **~1.271 adet** |
| 100 senaryonun kullanımı | **%7,9** |

Bir sufle kullanıcısının 1.271 senaryoya ulaşması gerçekçi değil; **kota riski teorik**.
Analizin asıl korkusu ("tarayıcı temizlenince senaryolar gider") ise **IndexedDB ile çözülmez** —
"site verilerini temizle" ikisini birden siler. Gerçek çare **cihaz dışına çıkan dosya**ydı ve
**C.2'de eklendi**. Kota dolması zaten özenle ele alınmıştı (çöp bırakma + dürüst mesaj).
Ayrıca `navigator.storage.persist()` zaten çağrılıyor ve **iki depoyu birden** korur.
**Karar: göç yapılmıyor.** Yapılsaydı haftalarca regresyon riski, kazanç sıfır.
**C.2** ✅ **BİTTİ** — ve asıl risk sanılan yerde değilmiş.
· Telefonda `autoBackup`/`restoreBackup` **zaten vardı** ve kota dolması ele alınmıştı.
Ele alınMAYAN: yedek de `localStorage`'daydı, yani **tarayıcı verisi silinince ikisi birden**
gidiyordu. Çözüm **cihaz dışına çıkan dosya**.
· **Telefonda dosyaya yedekleme YOKTU** (Mac'te vardı). Üstelik Mac'in mesajı *"telefonda İçe
aktar ile açabilirsin"* diyordu — telefonda öyle bir şey olmadığı için **mesaj yalan söylüyordu**.
Eklendi; biçim Mac'le birebir (`{sufle:1, scripts, activeId}`), tarayıcıda Mac yedeği telefonda
okundu (1→2 senaryo, eski duruyor).
· **Mac'te uygulama içi otomatik yedek HİÇ YOKTU.** Parite kapısı bunu yanlış bir isim eşlemesi
(`restore` ↔ `import`) arkasında **saklıyordu**; iki testte birden düzeltildi. Mac'e `autoBackup` +
`🛟 Otomatik yedekten dön` eklendi (tarayıcıda doğrulandı).
· **Kapı beni boşluğu örtmekten alıkoydu:** `restore`'u muafiyet listesine yazmayı denedim,
"muafiyet listesi BÜYÜDÜ" diye reddetti ve haklıydı — boşluk örtülmedi, **kapatıldı**.
**C.3** ⏸ **ölçüldü, ertelendi (gerekçeli).** Arama **zaten var** (`#scriptFind`).
Klasör/etiket, kütüphane büyüdüğünde değerli; ölçülen gerçek: tipik sufle kütüphanesi onlarca
senaryo (tavana 1.271 sığıyor, kimse oraya yaklaşmıyor). Şimdi eklemek, kullanılmayan bir
hiyerarşi ve her senaryo ekranında fazladan bir seçim demek — B fazında tam tersini yaptık.
**Tetikleyici:** kullanıcı kütüphanesi 50 senaryoyu aşarsa ya da Erdal isterse.
Bunun yerine sıra ağırlığı daha yüksek ve açıkça eksik olan **D.2 kamera kontrollerine** geçiyor
(matris ×3, SUFLE=2, lider=5).
**C.4** ✅ **BİTTİ** — yalnız `{id,title,text}` taşıyan **çok eski** biçimde üç kayıt
(başlıksız, boşluk-başlıklı, boş metinli) tarayıcıda içe alındı: üçü de başlık kazandı,
`up`/`pos` eklendi, liste çizildi. Kaynak düzeyi sözleşmesi **iki kabukta da** kilitli
(`tests/125`, 24 iddia) — kullanıcı yedeği hangi platformda açarsa açsın aynı korumayı alıyor.
Ayrıca içe alınan kayda **yeni id** veriliyor: yedekteki id mevcut bir senaryoyla çakışsaydı
biri sessizce erişilemez olurdu.

---

## 4 · FAZ D — Rakip paritesi (gerçek eksikler)

**D.1 İçe aktarma:** ✅ **`.docx` BİTTİ — sıfır bağımlılıkla.** Kural gözden geçirilmedi, **korundu**.
Ölçüm: `.docx` bir ZIP, içindeki `word/document.xml` düz XML ve açma işini tarayıcının **yerleşik**
`DecompressionStream('deflate-raw')` API'si yapıyor — kütüphane değil, platformun kendisi.
Kendi ZIP okuyucumuz ~40 satır (zip **yazıcıyı** zaten kendimiz yazmıştık).
**mammoth.js (~150 KB) elendi** — disleksi fontunda ve `ffmpeg.wasm`'de verilen aynı karar.
**Gerçek uygulamada uçtan uca doğrulandı:** 719 baytlık `.docx` içe alındı, senaryo 1→2, başlık
dosya adından, Türkçe karakterler bozulmadı, satır sonu korundu. İki kabukta da çalışıyor
(Mac'te metin dosyası içe aktarma **hiç yoktu**, o da eklendi).
**`.pdf` BİLEREK YOK:** doğru bir çıkarıcı font kodlamaları ve CID eşlemeleri yüzünden binlerce
satır ve yine de çoğu dosyada yanlış sonuç verir. Kullanıcıya **dürüst yol yazıldı**:
"PDF için: dosyayı aç, metni kopyala, Yapıştır ile getir."
**Yan bulgu:** içe aktarma mesajı iki dilde de **yanlıştı** — "Geri yüklendi"/"Restored" diyordu,
oysa kullanıcı dosya aldı, bir şey geri yüklemedi. Düzeltildi.
**D.2 Kamera kontrolleri:** ⏳ **harici kamera seçimi BİTTİ (Mac).**
Ölçülen boşluk: Mac `facingMode:'user'` ile **sabitti** — harici webcam, yakalama kartı ya da
iPhone Sürekli Kamera'sı olan masaüstü kullanıcısı **hiçbirini seçemiyordu**
(`deviceId` Mac'te 0 kez geçiyordu, telefonda 4). Matriste liderin 5 aldığı kalem.
Telefonun mikrofon seçicisiyle aynı kalıp: **iki kameradan azsa liste hiç görünmüyor**
(tarayıcıda doğrulandı), adlar izinden sonra tazeleniyor, **kayıt sürerken değişim engelleniyor**
ve sebebi söyleniyor. `tests/126` (17 iddia) + kapıda kanıtlı bozma: kısıt sökülünce
ayar ölü ayara dönüyor ve test kırılıyor.
✅ **odak/pozlama kilidi de BİTTİ (telefon).** "🔒 Odak ve pozlamayı kilitle": kamera çekim
ortasında arayış yapmayı bırakıyor — kıpırdayınca odak nefes almıyor, ışık değişince parlaklık
zıplamıyor.
**Ölü ayar yaratılmadı:** anahtar yalnız cihaz destekliyorsa görünüyor; desteklenmiyorsa satır,
ipucu ve durum bayrağı **birlikte** temizleniyor (tarayıcıda doğrulandı). iOS/Android farklı kip
adları verdiği için `manual` **ve** `single-shot` aranıyor; yalnız biri desteklense bile özellik
açılıyor. Kamera kısıtı reddederse anahtar geri alınıp **sebebi söyleniyor**.
`tests/71` artık davranışsal (yetenek taklidiyle 4 senaryo), `tests/126` 31 iddia.
Parite tabanı `camLock` için bilerek 13→14 (Mac'te `getCapabilities` kavramı hiç yok).
**D.3 Kumanda genişliği:** Bluetooth klavye/pedal tuş eşlemesi (öğrenmeli, zaten var → genişlet).
**D.4 Uzak önizleme:** ✅ **BİTTİ.** Tek başına çekim yapanın en büyük acısı — kadraja girip
girmediğini görememek. Mac kamera karesini **320 piksele** küçültüp JPEG olarak **kendi yerel
sunucusuna** gönderiyor, kumanda sayfası gösteriyor. **Yeni altyapı kurulmadı**: sunucu ve kumanda
sayfası zaten vardı.
**Gerçek sunucudan uçtan uca doğrulandı:** kare yokken `204` (telefon sessizce bekler),
gönderilince `200` ve içerik birebir, yabancı kaynak `403`, 400 KB üstü `413`.
**Gizlilik kullanıcının:** varsayılan **kapalı**, üç koşul birden aranıyor (ayar açık + kamera açık
+ sayfa sunucudan), kare **diske hiç yazılmıyor** (sunucu tek kareyi bellekte tutuyor) ve bu
kullanıcıya düz cümleyle söyleniyor. Bozma turu kapalıyken gönderimi yakalıyor.
Sayfa arka plandayken tazeleme duruyor — kilitli telefonda pil ve veri yakmasın.
**D.5 Entegrasyon:** ✅ **BİTTİ.** Ölçüm ikiye ayırdı:
· **Zoom/Teams tarafı ZATEN çözülmüştü** — Mac'teki "🪟 Yüzen Sufle" (Document PiP) sufleyi her
uygulamanın üstüne koyuyor. Matristeki 1 puan bunu görmemiş.
· **Eksik olan yayın yazılımı yoluydu:** `?obs=1` eklendi — kabuk tümüyle kapanıyor, zemin
**şeffaf** oluyor, geriye yalnız gölgeli metin kalıyor. OBS/vMix "Tarayıcı Kaynağı" bunu olduğu gibi
kameranın üstüne bindiriyor. **Gerçek sunucudan doğrulandı** (`localhost:8080/?obs=1`).
· **Hikâye tamamlandı çünkü kontrol zaten vardı:** aynı sunucudan beslenen telefon kumandası bu
pencereyi de sürüyor. Kullanıcıya adres kutusu ve talimat gösteriliyor (yayın penceresinin
kendisinde gizli — kimse kendi talimatını sahnede görmek istemez).
· **🔴 SANAL KAMERA YAZILMADI VE YAZILAMAZ:** tarayıcı işletim sistemine kamera aygıtı
kaydedemez, imzalı bir sistem eklentisi gerekir. "Yakında" sözü vermek yerine **yapılabilen yol**
açıldı ve sınırı belgeye yazıldı.
**D.6 Video düzenleme:** ✅ **BİTTİ.** Ölçüm sürprizliydi: **telefonda budama zaten tamdı**
(kaydırmalar, önizleme, gerçek yeniden kayıt) — **Mac'te hiç yoktu**, üstelik paylaşılan sözlükte
`trimStart/trimEnd/trimGo/trimPrev` anahtarları duruyordu, yani yine **ölü çeviri**.
Mac'e taşındı; yöntem telefonla aynı: videoyu seçilen aralıkta oynatıp `captureStream`'i yeniden
kaydetmek. **`ffmpeg.wasm` gömülmedi** — jeton fontlarındaki aynı gerekçe ("tek dosya, sıfır
bağımlılık"). Bedeli kullanıcıya **açıkça söyleniyor**: kesme, seçilen süre kadar sürer.
Kutu **yalnız `captureStream` destekleniyorsa** açılıyor; boş çıktı **eskisini ezmiyor**;
çift çalıştırma ve süresiz bekleme engelli.
**Parite kapısı telefonda bir eksik buldurdu:** `doTrim` hatayı **günlüğe hiç yazmıyordu** —
kullanıcı "kesilemedi" görüyor, sebebi hiçbir yerde kalmıyordu. Düzeltildi.

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
**F.4** ⏳ **gizlilik + manifest BİTTİ.** Ölçüm: manifest beklenenden dolgunmuş (ad, açıklama,
kapsam, `display_override`, kategoriler, 192/512/maskable ikonlar, `share_target`, kısayollar).
**Kısayollar ve paylaşım hedefi ÖLÜ DEĞİL** — `?go=cam`/`?go=takes` kodda gerçekten karşılanıyor
(denetlendi). Eklenen: **`id`** (kalıcı uygulama kimliği; `start_url` değişirse tarayıcı kurulu
kopyayı ayrı uygulama sanar) ve `dir`.
**`screenshots` BİLEREK yazılmadı:** olmayan dosyaya işaret eden manifest kurulum ekranını bozar.

**🔒 `GIZLILIK.md` yazıldı (TR+EN) ve uygulamanın İÇİNE kondu.** Yalnız depoda duran bir belge
kimsenin okumadığı ölü kâğıt olurdu; metin artık "Nasıl kullanılır?" sayfasında da duruyor.
**Ölçülerek yazıldı:** bize ait sunucuya giden ağ çağrısı **0**, analitik **0**, üçüncü taraf
kütüphane **0**.
**🔴 İSTİSNA SAKLANMADI:** sesle takip açıkken konuşma tarayıcının kendi tanıma servisine gidiyor ve
Chrome/Safari bunu **üreticinin sunucusunda** işliyor. "Hiçbir veri toplamıyoruz" deyip bunu
yazmamak mağaza başvurusunda **yanlış beyan** olurdu. Metin bunu ilk paragrafta söylüyor, varsayılan
kapalı olduğunu da. `tests/131` (40 iddia) hem belgeyi hem iddiaların **hâlâ doğru olduğunu**
kilitliyor — biri analitik eklerse belge yalan söylemeye başlar, kapı önce kırılır.

**F.4 mağaza metni de BİTTİ** (`MAGAZA.md`, TR+EN): ad, kısa açıklama (karakter sınırlarına
**sığdığı ölçüldü**), uzun açıklama, anahtar kelimeler, kategori, yaş derecelendirmesi, ekran
görüntüsü planı. **Kural: her cümle ölçülen bir özelliğe dayanır.** `tests/132` (34 iddia) 20 somut
sözü koddaki karşılığına bağlıyor **ve abartmayı engelliyor** — sanal kamera, PDF, bulut, yapay zekâ
metne yazılırsa kapı kırılıyor (kanıtlandı).

**F.1 ön ölçümü yapıldı** (`MAGAZA_TEKNIK.md`) — kabuk kurulmadan önce neyin gerektiğini saymak
için. **🔴 Ölçülen en büyük engel: `SpeechRecognition` iOS WKWebView'da YOK**, yani kabuğa alınan
PWA iOS'ta **sesle takibi kaybeder** — matriste bizim 5, liderin 3 aldığı kalem. Üç yol yazıldı
(yerel köprü · Whisper-WASM · özelliği kapatmak) ve **karar Erdal'a bırakıldı**; kabuk bu karar
verilmeden kurulursa ürünün en güçlü özelliğini sessizce kaybeder.
İzinler (`Info.plist`, `AndroidManifest`) ve **yapılamayacaklar** (sanal kamera, arka planda kayıt,
Fotoğraflar'a doğrudan yazma) sebebiyle listelendi.

**Kalan F.4:** ekran görüntüleri (plan yazıldı, görseller üretilmedi).
**F.5** Ödeme modeli: bedava = 1080p + filigran; ücretli = 4K + filigransız + altyazı + bulut.
**F.6** ⏳ **meta katmanı bitti, vitrin sayfası açık.** Ölçülen başlangıç: `<title>` **tek kelimeydi** ("Sufle"),
`og:`/`twitter:`/JSON-LD/canonical **hiç yoktu**.
Eklendi: anahtar kelimeli başlık (**40 karakter**, sınır 60), açıklama (**157**, sınır 160),
canonical, 6 `og:` + 4 `twitter:` etiketi, `SoftwareApplication` JSON-LD (dört platform, iki dil,
8 özellik).
**"Ücretsiz" sözü ÖLÇÜLDÜ:** kodda ödeme duvarı/abonelik/satın alma **0** — `tests/133` bunu
kilitliyor; bir gün ücretli katman gelirse başlık, açıklama ve JSON-LD fiyatı **birden** yalan
söyler ve kapı önce kırılır.
**Abartma engeli** mağaza metnindekiyle aynı: JSON-LD `featureList`'teki her madde koddaki
karşılığına bağlı (kanıtlandı — "yapay zekâ senaryo yazarı" yazılınca kapı kırılıyor).
**Kalan F.6:** ayrı vitrin sayfası ve içerik — bu tur yalnız uygulamanın kendi meta katmanıydı.

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
| 9 | 2026-08-14 | B.3 Mac: sağ panel 53 kontrol → 3 sekme; .seg stili | tarayıcıda: Çekim 27 kontrol gizleniyor · sekme kalıcı · 23 iddia | 7/8 yeşil (VER doğru kırmızı) |
| 10 | 2026-08-14 | B.2 başlangıç: SVG ikon altyapısı + telefon kromu | 4/4 ikon tarayıcıda çiziliyor (22×22) · aria korundu · 36 iddia | 7/8 yeşil (VER doğru kırmızı) |
| 11 | 2026-08-14 | B.4 telefon: odak modu tuzağı kapandı + varsayılan açık | tarayıcıda döngü kanıtlı · peekUI sırası kilitli · 28 bozma | 7/8 yeşil (VER doğru kırmızı) |
| 12 | 2026-08-14 | B.4 Mac: kayıtta paneller oto-kapanır, düzen geri gelir | sıra iddiası kilitli · 29 bozma kanıtlı · 14 iddia | 7/8 yeşil (VER doğru kırmızı) |
| 13 | 2026-08-14 | **v9.8 yayın hazırlığı** — VER 9.8 · cache v80 · TR+EN sürüm notları | **KAPI 8/8 YEŞİL** — kampanyanın ilk tam yeşili; push Erdal onayı bekliyor | ✅ 8/8 |
| 14 | 2026-08-15 | B.5 telefon: mod rozeti (Elle/Otomatik/Sesle+dil) | tarayıcıda geçiş kanıtlı · senkron güncelleme · 30 bozma · **KAPI 8/8 YEŞİL** | ✅ 8/8 |
| 15 | 2026-08-15 | B.6 kısayol kartı (iki kabuk) | Mac kartı 7 satır, gerçek bağlardan · telefon kullanıcının haritasını gösteriyor · 51 iddia | ✅ 8/8 YEŞİL |
| 16 | 2026-08-15 | B.7 karşılama eylemle bitiyor (tur yerine aktivasyon) | tarayıcıda 3 davranış kanıtlı · 57 iddia · kapsam tabanı gevşetilmedi | ✅ 8/8 YEŞİL |
| 17 | 2026-08-15 | B.8: Mac'e disleksi yazı tipi + hareket azaltma | dış font ölçülüp ELENDİ (~150 KB/ağırlık) · yığın birebir · 65 iddia | ✅ 8/8 YEŞİL |
| 18 | 2026-08-15 | B.8 ikinci dilim: Mac yüksek kontrast (ölü çeviri canlandı) | kenarlık 1,29:1 → 21:1 · OS tercihi bir kez devralınıyor · 72 iddia | ✅ 8/8 YEŞİL |
| 19 | 2026-08-15 | C.2 cihaz dışı yedek + Mac otomatik yedek | Mac yedeği telefonda okundu (1→2) · yanlış isim eşlemesi 2 testte düzeltildi · 19 iddia | ✅ 8/8 YEŞİL |
| 20 | 2026-08-15 | C.1 ÖLÇÜLDÜ ve ELENDİ · C.4 bitti · C.3 gerekçeli ertelendi | ls tavanı 4,94 MB · 2 dk senaryo 2 KB · tavana 1.271 senaryo → kota riski teorik | ✅ 8/8 YEŞİL |
| 21 | 2026-08-15 | D.2: Mac harici kamera seçimi | deviceId Mac'te 0→kullanımda · tek kamerada gizli (tarayıcı) · parite tabanı bilerek 5→6 | ✅ 8/8 YEŞİL |
| 22 | 2026-08-15 | D.2 tamam: odak/pozlama kilidi (yeteneğe bağlı) | desteksizde satır+ipucu+durum birlikte temizleniyor · 33 bozma · 25 kanıtlı dosya | ✅ 8/8 YEŞİL |
| 23 | 2026-08-15 | D.6: Mac'e video budama + telefonda eksik günlükleme | ölü çeviri canlandı · 20 iddia · 34 bozma · ffmpeg.wasm elendi | ✅ 8/8 YEŞİL |
| 24 | 2026-08-15 | D.1: .docx içe aktarma, sıfır bağımlılıkla | gerçek .docx uçtan uca okundu · mammoth elendi · 24 iddia · 35 bozma | ✅ 8/8 YEŞİL |
| 25 | 2026-08-15 | D.5: yayın (OBS) kipi — şeffaf katman | gerçek sunucudan doğrulandı · 19 iddia · 36 bozma · parite tabanı mac 6→7 | ✅ 8/8 YEŞİL |
| 26 | 2026-08-15 | D.4: uzak önizleme (telefonda kadraj) | 204/200/403/413 gerçek sunucuda ölçüldü · varsayılan kapalı · 22 iddia · 37 bozma | ✅ 8/8 YEŞİL |
| 27 | 2026-08-15 | **v9.9 hazır** + ulaşılabilirlik denetimi | 18/18 kapı ulaşılabilir · 329 anahtarın 0'ı ölü · not tarayıcıda doğrulandı | ✅ 8/8 YEŞİL |
| 28 | 2026-08-15 | F.4: gizlilik politikası + manifest kimliği | ağ çağrısı 0 / analitik 0 ölçüldü · istisna saklanmadı · 40 iddia · 38 bozma | ✅ 8/8 YEŞİL |
| 29 | 2026-08-15 | F.4 mağaza metni + F.1 ön ölçümü | 20 söz koda bağlı · abartma engeli kanıtlı · iOS sesle takip engeli bulundu | ✅ 8/8 YEŞİL |
| 30 | 2026-08-15 | **v9.9 YAYINLANDI** — Erdal onayıyla | canlı VER=9.9 · sw v81 · md5 birebir · 11/11 özellik izi canlıda sayıldı | ✅ canlı |
| 31 | 2026-08-15 | F.6 SEO meta katmanı · v9.10 hazır | başlık 40/60 · açıklama 157/160 · abartma engeli kanıtlı · 39 bozma | ✅ 8/8 YEŞİL |

---

## 🔍 Denetim turu (Tur 32) — bu gecenin işini kendi kapımla ölçtüm

Üç eksen ölçüldü; **iki gerçek eksik** çıktı ve ikisi de kapatıldı.

**(a) Kapıda kanıtlı bozma:** gecenin 14 test dosyasından **12'sinde** vardı.
`122` ve `132` için bozmayı elle denemiş ama **kalıcı kayda geçirmemiştim** —
yani o iki test bir gün sessizce kör olsa kimse fark etmezdi. İkisi de eklendi
ve kapıda kanıtlandı; `MAGAZA.md` bozma koşturucusuna yeni kaynak olarak tanıtıldı
(abartma engelinin çalıştığı ancak metne olmayan bir özellik yazılarak kanıtlanır).
**Şimdi 14/14.**

**(b) Platform asimetrisi:** 11 ortak özelliğin **11'i iki kabukta da var**.
Kalan 4 fark bilinçli ve gerekçeli (mod rozeti, karşılama eylemi, SVG ikon,
SEO — Mac'te karşılığı ya var ya da anlamsız).

**(c) 🔴 YOL HARİTASI GERÇEĞİ SÖYLEMİYORDU — iki yönde birden:**
· `F.6` **✅ diyordu ama içinde "Kalan" yazıyordu** → ⏳ yapıldı.
· `A.2b` ⏳ görünüyordu ama **gerçekte bitmişti** (kapsam 0, dil düğmesi var) → ✅.
· **Asıl bulgu:** `A.2c` "bitti" sanılıyordu; ölçünce **Mac'te `m()` hiç yok** ve
**71 toast Türkçe sabit** çıktı. Yani Mac'te dil düğmesi var ama İngilizceye geçen
kullanıcı **düğmeleri İngilizce, uyarıları Türkçe** görüyor — yarım özellik.
`tests/122`'ye **çevrilmemiş mesaj sayacı** eklendi (taban **67**, `kapsam.py`
mantığıyla: yeni sabit mesaj artırır → kırmızı, sözlüğe bağlamak azaltır → taban sıkışır).

| 32 | 2026-08-15 | **Denetim turu** — kendi gecemi kapımla ölçtüm | 12/14 → **14/14** kanıtlı bozma · asimetri 0 · yol haritası 3 yerde gerçeği söylemiyordu · Mac 67 çevrilmemiş mesaj bulundu |  ✅ 8/8 YEŞİL |
| 33 | 2026-08-15 | **A.2c kapandı** — Mac uyarıları sözlüğe; testler forma değil cümleye bağlandı | çevrilmemiş toast **67 → 0** (83 çağrının 83'ü) · TR/EN 68/68 · 11 test `macMetni()` ile onarıldı · 121 yorum sızıntısını ayırt ediyor (kanıtlandı) · **4282 test, 0 hata** | ✅ 8/8 YEŞİL |
