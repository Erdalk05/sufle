# Sufle — derin inceleme + araç/ajan önerileri (2026-08-15)

**Yöntem:** önce depo ölçüldü (kapı araçları koşturuldu, kod sayıldı, **gerçek tarayıcıda
iki yeni ölçüm yapıldı**), sonra öneri yazıldı. Ölçülmemiş hiçbir iddia yok; ölçemediğim
yerde sınırı yazdım.

> **İlk turumda iki hatam vardı, düzeltiyorum:**
> ① "Whisper'a geç, iOS'ta sesle takip yok" demiştim — **yanlış**: `MAGAZA_TEKNIK.md` T51
> ölçümü, iOS 18.6 WKWebView'da `SpeechRecognition`'ın **var olduğunu** kanıtlamış; üç yol
> da elenmiş. Whisper'ın kalan gerekçesi başka (aşağıda, §4.11).
> ② "Çizilen arayüzü ölçen hiçbir şey yok" demiştim — **yanlış**: `kontrast.py` + `ekran.py`
> altı ekranı gerçek Chrome'da çizip ölçüyor. Doğru cümle: *ölçülen şey renk ve dil; **akış**
> ve **düzen** ölçülmüyor.*

---

# BÖLÜM 1 — ÖLÇÜLEN DURUM

## 1.1 Anatomi

| Katman | Değer | Not |
|---|---|---|
| `index.html` ham | **513.872 bayt** | gzip **178 KB** (Pages sıkıştırarak servis eder) |
| ↳ JS (tek blok) | 406.716 bayt | **%82** — ürün fiilen bir JS uygulaması |
| ↳ CSS | 39.962 bayt | 64 jeton tanımı, 165 `var()` kullanımı |
| ↳ HTML | 46.452 bayt | 285 id (**yinelenen 0**), 173 düğme, 266 `data-i18n` |
| `mac/Teleprompter Pro.html` | 4.309 satır | ortak çekirdek `cekirdek/`den gömülüyor |
| `cekirdek/` | 10 modül | `sozluk.js` 34 KB · `mesajlar.js` 17 KB · `jetonlar.css` |
| Testler | **152 dosya / 4.720 iddia** | hepsi geçiyor (ölçüldü) |
| Kapı | 9 adım | derleme · denetim · sözdizimi · test · sürüm · ayna · kapsam · bozma · kontrast |
| Hız | **1 Ağustos'tan beri 302 commit** | 14 Ağustos'ta tek günde 133 |

## 1.2 Mimarî — en belirleyici tek gerçek

```js
(function(){ 'use strict';
  const $=s=>document.querySelector(s), …, VER='9.11';
  let st; function load(){…}
})();
```

Uygulamanın tamamı **tek bir IIFE** içinde, `'use strict'` ile. Dışarıya **hiçbir şey**
sızmıyor. Sonuçları:

- ✅ Kirlilik yok, çakışma yok, `window` temiz. Doğru bir karar.
- ⛔ **Tarayıcıda test tutamağı (seam) yok.** `Runtime.evaluate` ile `st`, `measure()`,
  `buildContent()` çağrılamıyor (denedim: `ReferenceError: st is not defined`).
  152 testin kaynaktan **regex ile çıkarma** yöntemi kullanmasının asıl sebebi bu.
- ⛔ Bunun bedeli: davranış ancak **kullanıcı yolu sürülerek** ölçülebilir
  (düğmeye tıkla, metni yaz). Tam da bir **UI ajanının** işi — §2'nin gerekçesi budur.

## 1.3 İyi olan ve kanıtlanan şeyler (bunlara dokunma)

| İddia | Ölçüm |
|---|---|
| "Veri cihazdan çıkmıyor" | `fetch` **0** · `XMLHttpRequest` **0** · `WebSocket` **0** · `sendBeacon` **0** · dış host **0** · dış `src`/`href` **0** (tek istisna kendi kanonik URL'i). **Kodla doğrulandı.** |
| Sıfır bağımlılık | `package.json` yok; `ekran.py` kendi WebSocket istemcisini bile yazmış |
| Gürültü yok | `console.*` **0** · `TODO/FIXME` **0** · satır içi `onclick` **0** |
| Hata yönetimi | `window.onerror` + `unhandledrejection` → `logErr` · localStorage kota dolumu ayrıca ele alınmış (`lsFull`) |
| iOS IndexedDB'nin "üçüncü hâli" | `sozZamanAsimi()` — *cevapsızlık* için zaman aşımı. Çoğu ekip bunu bilmez bile |
| Depo kalıcılığı | `navigator.storage.persist` + `estimate()` kullanılıyor (kontrol ettim, **açık değil**) |
| Kayıt sırasında diyalog | 3 `prompt()` kaldı, **üçü de korumalı** (`if(rec.state==='recording'){ toast(dlgBusy); return; }`) |
| Kapanışta kayıp | `kapanistaYaz()` → `pagehide` + `visibilitychange` (senkron) — eski P0 kapalı |
| Kontrast | 6 ekran, **564 ölçüm, ihlal 0** |
| Statik denetim | iki kabuk da **temiz** |
| Derleme tazeliği | ✓ güncel (19 gömme noktası) |

Bu tablo bir denetim sonucu değil, **rekabet avantajı**: "hiçbir veri toplamıyoruz" diyen
uygulamaların çoğu bunu kanıtlayamaz; sen `grep` ile kanıtlıyorsun.

---

## 1.4 BULGULAR — ölçtüklerim

### ✅ B1 — KAPATILDI (uygulandı, kapı yeşil) · aslı **6 değil 39** çıktı

> **Uygulama notu (aynı gün):** düzeltilirken sayı büyüdü. Tarayıcı taraması yalnız AÇIK
> yüzeyleri görüyor; kaynak düzeyi kilit yazılınca **telefonda 24, Mac'te 15** — toplam
> **39 adsız kaydırıcı** çıktı. Yeşil ekran (`keySim/keySmooth/spill`), altyazı gömme
> (`capSize/capMaxW`), budama (`trimA/trimB`) ve yakınlaştırma panelleri kapalı oldukları
> için ölçümde görünmüyordu. **Ders: tarayıcı ölçümü ile kaynak kilidi birbirinin yerine
> geçmez, biri diğerinin kör noktasını kapatır** — `tests/145` ikisini birden tutuyor.
>
> Çözüm yeni sözlük anahtarı değil: zaten çevrili `<label>`ler `for` ile bağlandı (tek kaynak,
> dil değişince ad da değişir). Mac'te üç ayrı biçim vardı: düz etiket → `for`; `<span>`
> etiketi → `aria-labelledby` (CSS'e dokunmamak için); yüzen penceredeki id'siz kaydırıcı →
> `aria-label`. Kapıya **mutlak kural** olarak bağlandı (`adsız = 0`), 6 kasıtlı bozma ile
> kanıtlandı. **Yan bulgu:** kapıya ayar sekmeleri eklenince "bir kez çizilen kutu dil
> değişince eski dilde kalıyor" sınıfının **üçüncü vakası** çıktı (`#lightOut`, `#checkOut`)
> — o da düzeltildi.

#### Bulgunun ilk hâli (ölçüm kaydı)

Ayarlar ekranı, 430×932, gerçek Chrome, hesaplanmış erişilebilir ad:

| Öge | Tür | Ad | Etiket | Ekran okuyucu ne der |
|---|---|---|---|---|
| `#wpm` | range | ✗ | ✗ | "kaydırıcı, %50" |
| `#eye` | range | ✗ | ✗ | "kaydırıcı, %50" |
| `#dist` | range | ✗ | ✗ | "kaydırıcı, %50" |
| `#fs` | range | ✗ | ✗ | "kaydırıcı, %50" |
| `#lh` | range | ✗ | ✗ | "kaydırıcı, %50" |
| `#mg` | range | ✗ | ✗ | "kaydırıcı, %50" |
| `#setFind` | text | ✓ placeholder | — | doğru |

Yani hız, göz çizgisi, mesafe, yazı boyutu, satır aralığı ve kenar boşluğu — **suflenin
altı temel ayarı** — ekran okuyucuyla ayırt edilemiyor. Mac'te `#scriptFind` ve `#title`
aynı durumda. `role="switch"` 29 ögede doğru kurulmuş (anahtarlar iyi), sorun yalnız
kaydırıcılarda.
**Neden kapı görmedi:** `kontrast.py` **rengi** ölçüyor, **adı** ölçen bir kural yok.
**Düzeltme:** 6 `aria-label`, sözlükten (i18n'e de uyar) — yarım saatlik iş.

### ✅ B2 — KAPATILDI (uygulandı, gerçek kökende doğrulandı)

> **Uygulanan:** telefonda `connect-src 'none'`, Mac'te `connect-src 'self'` (kumanda sunucusu
> `/events`, `/info`, `/preview`, `/qr` ile **aynı kökenden** konuşuyor; `'none'` yazmak
> kumandayı sessizce öldürürdü — bu dosyada kumandanın sessizce ölmesi iki kez yaşanmış).
> `default-src` bilerek `'self'` seçildi, `'none'` değil: saymadığım her kaynak türünü de
> düşürür ve sessiz kırılma bu deponun en pahalı sınıfı.
> **Ölçülerek doğrulandı, varsayılmadı:** iki kabuk `file://` altında + telefon gerçek bir
> HTTP kökeninde açıldı → **CSP ihlali 0, JS hatası 0**, service worker kaydı ve manifest
> yükleniyor. `tests/145` hem CSP'yi hem "kodda gerçekten dış çağrı yok"u kilitliyor.

#### Bulgunun ilk hâli (ölçüm kaydı)

`<head>` içinde `Content-Security-Policy` **yok** (ölçüldü: `http-equiv` meta sayısı 0).
Bugün dış çağrı sıfır — ama bunu koruyan tek şey dikkat. Tek bir `fetch(...)` satırı
`GIZLILIK.md`'yi, `tests/131`'in 40 iddiasını ve mağaza beyanını aynı anda yalanlar.

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';
  img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'none';
  font-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'">
```

`connect-src 'none'` = **tarayıcı** ağ çıkışını engeller; ihlal artık koda değil
platforma takılır. `file://` ve PWA'da çalışır, kimliği bozmaz.
Yan kazanç: mağaza başvurusunda ve tanıtımda **kanıt** olarak gösterilir.
*(Sınır: `'unsafe-inline'` şart, çünkü kod tek dosyada satır içi. Yine de `connect-src`
ve `default-src` asıl değeri veriyor.)*

### 🟠 B3 — v9.11 depoda hazır, canlıda 9.10 (3 commit yayınlanmamış)

| Yer | Sürüm | Önbellek |
|---|---|---|
| Depo (`index.html` / `sw.js`) | **9.11** | `sufle-v83` |
| `.son-yayin` | 9.10 | 82 |
| **Canlı** (`erdalk05.github.io/sufle`) | **9.10** | `sufle-v82` |
| `main` vs `origin/main` | **3 commit ileride** | |

Bekleyen üç commit: alt kumandaların üst üste binmesi (kök neden kendi düzeltmesi),
**sesle takibin sessizce ölmesi**, 236 süs emojisinin kaldırıldığı arayüz kimliği turu.
Protokole göre `git push` senin onayını bekliyor — yani bu bir hata değil, **bekleyen bir
karar**. Ama "sesle takip sessizce ölüyordu" düzeltmesi kullanıcıya değen bir kusuru
kapatıyor ve canlıda **yok**.

### 🟡 B4 — Test kapsamı riskle ters orantılı

`kapsam.py`: 276 fonksiyonun **230'u** anılıyor, **46'sı hiç anılmıyor** (%83).
Anılmayanların dağılımı tesadüfi değil — **çekim ve sonuç yolunda yoğunlaşıyor**:

```
recordWith · probeAudio · runAudioTest · countdown · cancelCountdown · setLock
trimUpdate · trimDur · closeResult · shareCaptions · crcHazirla · statLine
diffReport · renderBitrate · qConstraint · autoLightCheck · drawEyeLine · gazeLine
```

Bunlar kırılırsa bedeli **kaybedilen çekim** — üründeki en pahalı hata. Buna karşılık
en çok test edilen alanlar metin/altyazı/sözlük gibi ucuz-kurtarılır alanlar.
Sebebi anlaşılır: kayıt yolu gerçek kamera, gerçek mikrofon ve gerçek zaman istiyor;
node'da sentetik veriyle sınanamıyor. **Bu, bir araç boşluğudur — disiplin boşluğu değil.**
Çözümü §2'deki L2 katmanı (sahte kamera akışı + gerçek tarayıcı).

### 🟡 B5 — Jeton geçişi yarım

64 jeton tanımlı, 165 yerde `var(--…)` kullanılıyor — ama CSS'te hâlâ **107 çıplak hex**
ve **22 `!important`** var. `prefers-color-scheme` **0** (sufle için doğru: sahne siyah),
`vh` **0** (iOS adres çubuğu tuzağına hiç düşülmemiş — iyi), `env(safe-area)` 13 (doğru).
Yani jeton boru hattı kuruldu ama **geçiş bitmedi**; renk kararı hâlâ iki yerde yaşıyor.

### 🟡 B6 — Platform paritesi: 75'e 29

`fark.py`: telefonda olup Mac'te olmayan **75** yüzey, tersi **29**. Depodaki kendi
kuralın şunu diyor: *"Telefonda olup Mac'te olmayan özellik yarım özelliktir — bu deponun
1 numaralı hata sınıfı."* Rakam bu kuralın hâlâ açık olduğunu gösteriyor. (Bir kısmı
doğal olarak telefona ait: `installBtn`, `reopenCam`. Ama `checkBtn` konuşulabilirlik
denetimi, `pkgBtn` yayın paketi, `devBtn` cihaz uyumluluğu, `resetAll`, `undoDel`
Mac'te de anlamlı.)

### 🟢 B7 — Uzun senaryo hipotezi: ÖLÇÜLDÜ ve büyük ölçüde ÇÜRÜDÜ

`tests/69` açıkça şunu yazmış: *"buradaki tezgâh gerçek tarayıcı düzeni koşturamaz, yani
'10.000 kelimede ölçüm X ms sürüyor' diyemem. Milisaniye iddiası yok."*
`ekran.py` kurulduktan sonra bu **ölçülebilir** hâle gelmiş — ölçtüm.
(macOS, başsız Chrome, 430×932, gerçek kullanıcı yolu: metni yaz → Uygula.)

| kelime | DOM ögesi | metin yüksekliği | kurulum (ms) | düzen okuma (ms) | **kirli düzen okuma (ms)** | 60 kare kaydırma (ms) |
|---:|---:|---:|---:|---:|---:|---:|
| 266 | 273 | 9.668 px | 7,4 | 1,1 | 0,9 | 0,2 |
| 1.349 | 1.380 | 45.479 px | 9,1 | 1,9 | **4,0** | 0,2 |
| 4.066 | 4.153 | 135.041 px | 19,5 | 4,3 | **10,2** | 0,1 |
| 8.132 | 8.305 | 269.216 px | 41,8 | 8,0 | **22,3** | 0,2 |
| 16.283 | 16.628 | 538.167 px | 73,8 | 15,1 | **44,4** | 0,3 |

**Okuma:** gerçek kullanım (10 dakikalık video ≈ 1.300 kelime) **9 ms kurulum, 4 ms
yeniden ölçüm** — sorun yok. Kaydırmanın kendisi (`transform`) kelime sayısından
**bağımsız** — motor tasarımı doğru. Ölçüm maliyeti ancak **~8.000 kelimeden sonra**
hissedilir hâle geliyor (kaydırıcıyı sürüklerken kare başına 22 ms → ~45 fps).
`tests/69`'un birleştirme düzeltmesi (kare başına tek ölçüm) bu yükü zaten 12×'ten 1×'e
indirmiş; onsuz 1.300 kelimede bile takılırdı.
**Dürüstlük sınırı:** Mac'te ölçüldü, iPhone'da değil. iPhone düzen motoru kabaca
1,5–2× daha yavaş → 8.000 kelimede ~40 ms/kare beklenir. Yine de **ilan edilebilir sınır:
"20.000 kelimeye kadar sorunsuz" değil, "10.000 kelimeye kadar ölçüldü".**

### 🟢 B8 — LAN kumandası: kapı var, kilit yok

`mac/teleprompter_server.py` `0.0.0.0`'a bağlanıyor ve `Access-Control-Allow-Origin: *`
gönderiyor, **ama** POST'ta `_origin_tamam()` kontrolü var: Origin farklıysa reddediyor,
**Origin yoksa kabul ediyor** ("tarayıcı değil, betik"). Yani:
- Kötü niyetli bir web sayfası kumandayı ele geçiremez ✅ (tarayıcı Origin'i hep gönderir)
- Aynı Wi-Fi'daki biri `curl` ile sufleyi başlatıp durdurabilir ⚠️

Risk düşük (yerel ağ, geçici sunucu, etkisi "metin kaydı"), ama düzeltmesi de ucuz:
QR'a rastgele bir jeton koy, sunucu jetonsuz komutu reddetsin. **Kafede çekim yapan
kullanıcı** senaryosunda anlamlı.

---

# BÖLÜM 2 — UI AJANI

## 2.1 Tezgâhın gerçekte nerede bittiği

`ekran.py` şunu yapıyor: Chrome'u `--headless=new` + `--use-fake-device-for-media-stream`
ile açıyor, ham CDP konuşuyor (WebSocket istemcisi dahil kendi yazılmış),
`Emulation.setDeviceMetricsOverride` ile **gerçek** viewport kuruyor (pencere boyutunun
yalan söylediğini ölçmüşler), ekran alıyor. `kontrast.py` bunun üstünde 6 durum çiziyor.

Bu ciddi bir tezgâh. Yapamadıkları (ve neden):

| Yapılamayan | Sebep | Kim çözer |
|---|---|---|
| **Akış testi** (tıkla → çek → sonuç ekranı doğru mu) | girdi sentezi, bekleme, yeniden deneme, iz alma elle yazılmalı | Playwright |
| **Düzen regresyonu** (dün bu düğme buradaydı) | piksel temel çizgisi + gürültü toleransı yok | Playwright `toHaveScreenshot()` / odiff |
| **Canvas/kamera içeriği doğru mu** | kompozit, kırpma, göz çizgisi DOM'da yok — piksel | Midscene (görüş) |
| **Gerçek cihaz** (iPhone'da PWA) | başsız Chrome iPhone değil; `document.hidden` rAF'ı donduruyor | Midscene (iOS) |
| **Erişilebilir ad / 90+ kural** | elle yazılırsa her kural ayrı emek (B1'i ben elde yazdım) | axe-core |

## 2.2 Karar

**L1 — Playwright (dev-only, ürüne girmez): AL.**
Sufle'nin ihtiyacı olan "tıkla-çek-doğrula" akışı Playwright'ın tam merkezi. Üstelik
`ekran.py`'ın notlarında yazılı **iki tuzağı da hazır çözüyor**: cihaz metrikleri
(`page.setViewportSize` + device descriptors) ve sahte medya
(`--use-fake-device-for-media-stream` + `--use-file-for-fake-video-capture` bayrakları
`launchOptions.args` ile). `ekran.py`'ı **silme** — mağaza karesi üretimi ve kontrast
ölçümü çalışıyor ve senin. Playwright yanına, yeni sınıf için gelir.
→ İlk 8 senaryo: giriş→sahne · metin yaz→başlat→durdur · kayıt→sonuç ekranı ·
altyazı indir · arşive yaz→geri yükle · yayın paketi · ayarlar gezinme · dil değiştir.

**L2 — Midscene.js: PoC yap, karar sonra.** (`web-infra-dev/midscene`, MIT, ~14,6k★)
Ekran görüntüsünden çalışır → canvas/kamera/kompozit doğrulaması. **web + iOS + Android**
tek API: gerçek iPhone'da PWA turu. Playwright/Puppeteer SDK'sı, Chrome uzantısı, YAML
senaryoları, MCP. Model tarafı UI-TARS ile **self-host edilebilir** — "veri dışarı
çıkmasın" kültürüne dev-time'da da uyar.
⚠️ Model çağrısı = para + nondeterminizm. **Kapıya bağlama**; gece turu raporu olarak koş.
→ İlk 3 senaryo: kayıt akışı uçtan uca · kompozit yeşil ekran kadrajı · **paylaşım tanı
satırı** (senin açık maddendi: "iPhone'da ne yazıyor?" — bu tur kendiliğinden yanıtlar).

**L3 — browser-use / Stagehand: şimdilik hayır.** Keşif turu değerli ama sende
keşif zaten var (kendi denetim turların, `bozma.py`). Sıra bunda değil.

**stagewise: hayır.** Gücü React/Vue bileşen ağacını çözmekte; Sufle vanilla. Ayrıca AGPL,
depo public.

**axe-core: AL, hemen.** Tek dosya, CDP ile enjekte, ürüne girmez. B1'i ben elde yazdığım
kaba bir kuralla buldum; axe 90+ kuralı getirir ve `kontrast.py`'nin yanına 10. kapı
adımı olur. **En ucuz gerçek kazanç bu.**

---

# BÖLÜM 3 — AJAN MİMARİSİ

## 3.1 Asıl darboğaz: üretim değil doğrulama

Ölçüm: **1 Ağustos'tan beri 302 commit, 14 Ağustos'ta 133.** Bu hızda üretim sorun değil.
Sorun, üretilenin doğru olduğunu **kanıtlamak**. Kanıt: v9.2'de kapının yakaladığı iki
hatanın **ikisi de kendi düzenlemendi**; v9.11'de "alt kumandalar üst üste biniyordu"
commit'inin kök nedeni yine **kendi düzeltmen**. Bu, kötü bir işaret değil — hızlı
çalışan tek ajanın kaçınılmaz sonucu. Mimari kararın buradan çıkması lazım.

## 3.2 Dört sınıf, tek tavsiye

| Sınıf | Örnek | Sufle için |
|---|---|---|
| Tek ajan + sıkı kapı | **bugünkü Sufle** | Zaten en iyi sürümü. Zayıflığı: üreten = denetleyen |
| **Rol ayrımı** | Claude Code subagent/skill/hook | ✅ **AL** — aşağıda tasarım |
| Graf/durum makinesi | LangGraph · Mastra | ❌ `kapi.sh` zaten deterministik orkestratör; çerçeve sıfır yeni kabiliyet, gerçek bakım yükü |
| Vendor SDK | Claude Agent SDK | ✅ **AL (sonra)** — kapıyı CI'da koşturmak için |

## 3.3 Somut tasarım — "gece fabrikası v2"

```
        ┌─ ÜRETİCİ ────────────┐   kodu yazar, kapıyı koşar, commit eder
        │                      │   (bugünkü sen)
        ├─ DENETÇİ ────────────┤   KODU GÖRMEZ. Yalnız: sürüm notu + yeni
        │                      │   yüzeyler + kullanıcı yolu. "Bu özelliği
        │                      │   bulabiliyor muyum, çalışıyor mu?"
        ├─ KIRICI ─────────────┤   bozma.py + Stryker: testin ayırt ettiğini kanıtlar
        └─ HAKEM = kapi.sh ────┘   tek gerçek otorite; nondeterministik girdi almaz
```

Kritik kural: **denetçi kodu görmez.** Kodu gören denetçi, üreticinin gerekçesini
tekrarlar — bu deponun defalarca kaydettiği "jargon = görünmezlik" ve "sessiz ölü
özellik" sınıfları tam da kodu okuyanın göremediği şeyler. `.srt` düğmesi vakası
(Erdal "str ne demek bilmiyorum" dedi) kod okunarak asla bulunamazdı.

İlham repoları (**kopyalama, yapı al**): `VoltAgent/awesome-claude-code-subagents`
(100+ subagent), `ComposioHQ/awesome-claude-skills`, `rohitg00/awesome-claude-code-toolkit`,
`composio-community/awesome-claude-plugins`. Bunlar ölçülmemiş prompt koleksiyonları;
Sufle'nin kanıt çıtası çoğundan yüksek.

## 3.4 Ürünün içine ajan?

`GIZLILIK.md` + `tests/131` + mağaza beyanı üçlüsü bulut LLM'i **kilitliyor**.
Yol haritasındaki E.1/E.2 (senaryo yazarı, yeniden yazım) bu yüzden doğru şekilde
"Erdal kararı" diye bekliyor. Eklenecek tek not: bu özellik gelirse **ayrı bir onay
yüzeyi** ister ("metniniz şu sunucuya gidecek"), yoksa `tests/131` kırılır ve iyi ki
kırılır.

---

# BÖLÜM 4 — REPOLAR (bulguya bağlı, sırayla)

| # | Repo | Hangi bulguyu kapatır | Emek | Karar |
|---|---|---|---|---|
| 1 | **dequelabs/axe-core** | **B1** (6 adsız kaydırıcı) + gelecekteki tüm sınıf | 2 sa | ✅ AL |
| 2 | **ast-grep/ast-grep** | kayıtlı hata sınıfı #1: `str.replace` sessiz kayması; `denetim.py`'nin regex kurallarını yapısal kurala taşır | 4 sa | ✅ AL |
| 3 | **microsoft/playwright** | **B4** (kayıt yolu testsiz) + akış/düzen regresyonu | 1 gün | ✅ AL |
| 4 | **oxc-project/oxc (oxlint)** | 25 boş catch, ölü değişken, gölgeleme — `node --check`'in göremediği sınıf | 1 sa | ✅ AL |
| 5 | **web-infra-dev/midscene** | canvas/kamera/**gerçek iPhone** | 1 gün PoC | 🟡 PoC |
| 6 | **stryker-mutator/stryker-js** | `bozma.py`'yi tamamlar; "test ayırt ediyor mu" otomatik | 1 gün | 🟡 sonra |
| 7 | **GoogleChrome/workbox** (`workbox-cli`) | `sw.js` sürümünü elle artırma zorunluluğu (B3'ün yapısal sebebi) | 3 sa | 🟡 sonra |
| 8 | **ai/size-limit** | 514 KB'ın sınırı yok; sessizce büyüyor | 1 sa | 🟡 sonra |
| 9 | **Vanilagy/mediabunny** | MP4 hattı; `mp4-muxer`/`webm-muxer` **kullanımdan kalktı**, halefi bu. `cekirdek/`e girip `derle.py` ile gömülür | ölçüm önce | 🟡 koşullu |
| 10 | **ionic-team/capacitor** | F.1 mağaza kabuğu (yol haritasında zaten) | hesap işi | 🟡 Erdal |
| 11 | **huggingface/transformers.js** | ⚠️ **iOS gerekçesi ÇÜRÜDÜ.** Kalan gerçek gerekçe: sesle takip bugün konuşmayı **tarayıcı üreticisinin sunucusuna** gönderiyor (`GIZLILIK.md` bunu dürüstçe yazıyor) ve Firefox'ta hiç yok. Cihaz üstü Whisper bu istisnayı **kaldırır** | büyük | 🔵 Erdal |

**Almayacaklar:** React/Tailwind/shadcn (tek dosya + `file://` kimliği — `derle.py`'ın
varlık sebebi bu ölçüm) · LangGraph/CrewAI/Dify/n8n (§3.2) · ürün içi bulut LLM (§3.4) ·
`browser-use`'u kapıya koymak (nondeterministik kapı = kapısızlık) · fflate (kendi zip
yazıcın çalışıyor ve v9.3'te akışa çevrildi — çalışanı değiştirme).

---

# BÖLÜM 5 — SIRA

**Bu hafta:**
1. ~~**B1**: adsız kaydırıcılar~~ ✅ **BİTTİ** — 39 kaydırıcı bağlandı, kapıya mutlak kural,
   6 bozma kanıtı, `tests/145` (32 iddia)
2. ~~**B2**: CSP~~ ✅ **BİTTİ** — iki kabuk, gerçek kökende 0 ihlalle doğrulandı
3. **B3**: v9.11 yayın kararı (senin) — sesle takip düzeltmesi canlıda yok
4. **axe-core** → kapı adımı 10. **B1 sonrası gerekçesi güçlendi:** elle yazdığım tek kural
   39 kusur buldu; axe 90+ kural getirir (rol, sıra, odak, kontrast-oran, canlı bölge…)
5. **size-limit** → kapı adımı 11 (bugünkü boyut taban olsun)

**Önümüzdeki iki hafta:**
6. **ast-grep** — toplu düzenleme artık sessizce başarısız olamaz
7. **Playwright** — 8 akış senaryosu, önce **B4'ün kayıt yolu**
8. **B6 paritesi** — `fark.py`'nin 75'ini üçe böl: telefona özgü / Mac'e gerekli / gereksiz
9. **B5 jeton geçişi** — 107 çıplak hex'i bitir
10. **Midscene PoC** — 3 senaryo, gerçek iPhone

**Erdal kararı bekleyenler:** Capacitor + Apple Developer hesabı · cihaz üstü Whisper ·
E.1/E.2 AI katmanı · B8 kumanda jetonu (istersen 1 saat).

## Ölçüt
Her araç için tek soru: **"bu ay hangi gerçek hatayı yakaladı?"** Cevabı olmayan araç
üçüncü ayın sonunda tezgâhtan çıkar. Bu belgedeki B1, B2 ve B7'yi öneri yazmak için
değil, **önerinin işe yaradığını kanıtlamak** için ölçtüm: B1'i bir tarayıcı ajanı buldu,
B7'yi bir tarayıcı ajanı çürüttü.

---

## Ölçüm betikleri
Bu belgedeki B1 ve B7 ölçümleri `ekran.py`'nin `Tarayici` sınıfıyla yapıldı; betikler
oturum klasöründe. Kalıcı olmalarını istersen `araclar/` altına alınır ve kapıya bağlanır
(B1 için önerilen budur).

## Kaynaklar
- Midscene: https://github.com/web-infra-dev/midscene · Stagehand/browser-use karşılaştırma: https://www.firecrawl.dev/blog/best-browser-agents
- Stagewise: https://github.com/stagewise-io/stagewise
- Ajan çerçeveleri: https://www.speakeasy.com/blog/ai-agent-framework-comparison/
- Claude Code ekosistemi: https://github.com/VoltAgent/awesome-claude-code-subagents · https://github.com/rohitg00/awesome-claude-code-toolkit
- ast-grep karşılaştırma: https://ast-grep.github.io/advanced/tool-comparison.html
- Mediabunny (mp4-muxer halefi): https://github.com/Vanilagy/mediabunny
- Görsel regresyon: https://percy.io/blog/open-source-visual-regression-testing-tools
- PWA → App Store 4.2: https://www.mobiloud.com/blog/publishing-pwa-app-store
