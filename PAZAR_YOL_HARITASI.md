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
**A.2** Sözlük tek kaynak. Mac'te `data-i18n` **hiç yok** (0 eşleşme, telefonda 252) → Mac Türkçe'ye
gömülü; İngilizce desteği de bu adımda gelir (matris #28 "çok dil" = 1).
**A.3** Motor + işaretleme + SRT çekirdeğe taşınır; iki kabuk da aynı kodu gömer.
**A.4** Mac'te eksik özellikler (kompozit, arşiv, hazırlık) çekirdekten otomatik gelir.
**Bitti ölçütü:** bir özelliği çekirdekte değiştir → iki çıktıda da değişsin; kapı bayat-çıktıyı yakalasın.

---

## 2 · FAZ B — 2026 arayüzü (rakiplerin en iyisini taklit)

Taklit hedefi **Teleprompter.com**: özellik listesi değil **hiyerarşi disiplini**.
Ek kaynaklar: Elgato (odak modu), BIGVU (çekim sonrası akış), Video Teleprompter UK (kamera kontrolü).

**B.1 Tasarım jetonları.** Rol bazlı renk (`--action` yeşil / `--record` kırmızı / `--info` mavi / `--warn`),
5 adımlı tipografi, 4px boşluk ritmi, `tabular-nums`. Kural: **ekranda aynı anda tek yeşil buton**.
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
