# Sufle — araç, UI ajanı ve ajan mimarisi önerileri (2026-08-15)

Bu belge üç soruyu yanıtlıyor: **(1)** GitHub'da kullanacağımız UI ajanı hangisi olmalı,
**(2)** farklı ajan mimarileri arasından Sufle'ye hangisi uyar, **(3)** geliştirici olarak
yararlanabileceğimiz repolar hangileri. Her öneri, önce depoda **ölçülen** duruma dayanıyor.

---

## 0. Önce ölçüm — Sufle bugün ne? (öneriler bu tabana oturuyor)

| Ölçü | Değer |
|---|---|
| `index.html` (telefon, ürünün kendisi) | 514 KB / 7.419 satır, tek dosya |
| `mac/Teleprompter Pro.html` | 4.309 satır |
| `cekirdek/` (tek kaynak modüller) | 10 dosya — `sozluk.js` 34 KB, `mesajlar.js` 17 KB, `jetonlar.css`, `docx.js`, `kumanda.js`, `metin.js`, `prova.js`, `zorlanma.js`… |
| Derleme | `derle.py` — modülleri iki kabuğun **içine gömüyor**; `--denetle` bayat çıktıyı yakalıyor |
| Test | `tests/` altında **152** node dosyası, `tests/kos.js` koşucu |
| Kapı | `kapi.sh` **9 adım**: derleme tazeliği → denetim → `node --check` → testler → sürüm → aynalar → kapsam → bozma turu → kontrast |
| El yapımı tezgâh | `denetim.py` (statik denetim), `bozma.py` (mutasyon), `kontrast.py`, `ekran.py` (CDP mağaza kareleri), `fark.py`, `kapsam.py` |
| Bağımlılık | **sıfır** — `package.json` yok |

**Kritik ayrım — tüm önerilerin ekseni:**
> "Tek dosya, sıfır bağımlılık" **ÜRÜNÜN** kimliği. **TEZGÂHIN** (dev-time) kimliği değil.
> Ürüne giren her bayt tartışılır; `devDependencies`'e giren araç ise yalnızca "hangi gerçek
> hatayı yakaladı" sorusuyla ölçülür. Aşağıdaki önerilerin neredeyse tamamı **tezgâh tarafında**.

`derle.py` zaten bu ayrımı mümkün kılıyor: kaynak modüllerde yaşar, çıktı tek dosya kalır.
Yani bir kütüphaneyi `cekirdek/`e koyup gömmek kimliği bozmuyor (bkz. Mediabunny önerisi).

### Tezgâhın bugün göremediği üç şey
1. **Çizilen arayüzü gerçekten gören test yok.** 152 test node'da sentetik veriyle koşuyor
   (bu doğru bir seçimdi — headless sekmede `document.hidden=true`, rAF donuyor). Ama
   canvas/kamera/video/kompozit boru hattının **görsel** doğruluğu hiç ölçülmüyor.
2. **Kod düzenlemenin sessiz kayması.** Kendi kayıtlı hata sınıfın #1: `str.replace` deseni
   tutmazsa değişiklik sessizce yapılmıyor (3 kez oldu). Bunun yapısal (AST) çözümü var.
3. **Mağaza/paketleme hattı.** `ios-olcum/` (WKWebView probu) ve `magaza/` başlamış ama
   Apple'ın 4.2 "repackaged website" riski belgelenmemiş.

---

## 1. UI ajanı — hangisi, neden

### Sufle'nin özel zorluğu
DOM tabanlı otomasyonun tavanına **zaten çarpmış** bir üründesin: sufle akışı, kırpma önizlemesi,
yeşil ekran kompoziti, kamera kadrajı, gömülü altyazı — hepsi **canvas ve video**. `querySelector`
bunların hiçbirini "doğru görünüyor mu" diye ölçemez. Bu yüzden UI ajanı seçimi Sufle'de
"güzel olur"dan öte, **kör noktanın tek çözümü**.

### Öneri: üç katman, hepsi birden değil

**L1 — Deterministik iskelet: Playwright + Playwright MCP**
`microsoft/playwright` · `microsoft/playwright-mcp` (MIT)
- DOM, klavye sırası, odak tuzağı, erişilebilirlik ağacı, `toHaveScreenshot()` ile piksel temel çizgisi.
- Ucuz, tekrarlanabilir, **kapıya konabilir** (model çağırmaz → yeşil kapı yeşil kalır).
- Mevcut 152 node testini **taşıma**; onlar mantık testi. Playwright DOM/olay/erişilebilirlik
  katmanı için yeni bir küme (10-15 senaryo yeter).

**L2 — Görüş tabanlı ajan: 🥇 Midscene.js — birinci önerim**
`web-infra-dev/midscene` (ByteDance Web Infra, MIT, ~14,6k ★)
- **Ekran görüntüsünden çalışır**, seçiciye ihtiyaç duymaz → canvas, video, ikon düğme,
  kamera önizlemesi dahil DOM'da olmayan her şeyi ölçebilir. Sufle'nin kör noktası tam burası.
- **Web + Android + iOS + masaüstü + HarmonyOS** tek API. Ürünün asıl hedefi iPhone PWA olduğu
  için bu, *gerçek cihazda* doğrulama demek — "headless sekmede rAF donuyor" kısıtını **atlar**.
- Playwright/Puppeteer SDK, Chrome uzantısı (kod yazmadan deneme), CLI, **YAML senaryoları**, MCP.
  YAML senaryosu = kapıya takılabilir bir dosya biçimi; Python tezgâhınla uyumlu.
- Model tarafı: Qwen3.x, Doubao, GLM-4.6V, Gemini, **açık kaynak UI-TARS** — self-host mümkün,
  yani "veri dışarı çıkmasın" kimliğine dev-time'da da sadık kalabilirsin.
- **Sufle'de ilk iş:** `ekran.py` kare **üretmeye** devam etsin; kareyi **denetlemek** (kadraj taşması,
  kesik düğme, yanlış dil, boş panel) Midscene'e geçsin. `ekran.py`'ın başındaki not zaten
  "sağ kenar taşıyor sandım, iframe'de ölçünce 0 çıktı" diyor — o yanlış alarm sınıfını bu kapatır.

**L3 — Keşif turu (kapıya KOYMA): browser-use veya Stagehand**
`browser-use/browser-use` (~108k ★, otonom döngü) · `browserbase/stagehand` (act/extract/observe, TS, Playwright üstü)
- "Gerçek kullanıcı gibi gez, kırılanı bildir" gece turları için değerli.
- **Kapıya asla konmaz**: nondeterministik bir kapı, kapısızlıktan tehlikelidir (senin
  "yanlış yeri ölçen kapı" dersinin ikizi). Çıktısı bulgu listesi olur, yeşil/kırmızı değil.

**İzle ama alma: stagewise** — `stagewise-io/stagewise` (AGPL, ~6,5k ★). Tarayıcıda ögeye tıkla →
ajana bağlam ver. Gücü React/Vue bileşen ağacını çözmesinde; Sufle vanilla + tek dosya olduğu için
kazanç sınırlı. Ayrıca AGPL, ürün public repo olduğu için ayrıca düşünülmeli.

### Görsel regresyon (UI ajanının tamamlayıcısı)
- **Playwright `toHaveScreenshot()`** — sıfır konfig, en kolay giriş.
- **odiff** / **pixelmatch** — hızlı piksel diff; `ekran.py` çıktısını temel çizgiye bağlamak için
  yeterli, Python tarafından da çağrılabilir.
- Bu, "tasarım sessizce kaydı" sınıfını yakalar — `kontrast.py`'nin göremediği sınıf.

### Erişilebilirlik ve bütçe kapıları
- **axe-core** (`dequelabs/axe-core`) — tek JS dosyası, CDP ile enjekte edilir, **ürüne girmez**.
  Kapıya 10. adım. Elle yazdığın klavye/ekran okuyucu testlerinin üstüne endüstri kural seti.
- **Lighthouse / lighthouse-ci** — PWA + performans bütçesi; 514 KB tek dosya için sınır koy.
- **size-limit** — "tek dosya X KB'ı geçemez" kapısı; şu an hiçbir sınır yok, dosya büyümeye devam ediyor.

---

## 2. Farklı ajan yapıları — hangi mimari nereye

Soruyu ikiye ayırmak şart: **(a)** Sufle'yi *geliştiren* ajan mimarisi, **(b)** *ürünün içinde* ajan.

### (a) Geliştirme tarafı — dört mimari sınıfı

**1) Tek ajan + sıkı kapı — bugünkü Sufle**
Güçlü yanı: 9 adımlı kapı, mutasyon turu, kapsam ölçümü. Piyasadaki çoğu "AI agent kurulumundan"
daha disiplinli. Zayıf yanı: **üreten = denetleyen**. v9.2'de kapının yakaladığı iki hatanın
ikisi de senin kendi düzenlemendi — kapı olmasa yayınlanacaklardı.

**2) Rol ayrımı (üreten ≠ denetleyen) — Claude Code subagent/skill/hook**
Bilge'deki "Dil Loncası"nda çalıştığı kanıtlanmış desen. Sufle'ye uyarlaması:
`üretici` → `denetçi` (kodu görmeden yalnız davranışı sınar) → `kapı`.
Örnek/ilham repoları:
- `VoltAgent/awesome-claude-code-subagents` — 100+ hazır subagent
- `ComposioHQ/awesome-claude-skills` · `composio-community/awesome-claude-plugins`
- `rohitg00/awesome-claude-code-toolkit` — 135 agent, 35 skill, 42 komut, hook/rule şablonları
- `jqueryscript/awesome-claude-code` — genel dizin
> ⚠️ Bunlar **prompt koleksiyonu**, kütüphane değil. Kopyalama — Sufle'nin denetim kültürü
> (kanıtlı test, mutasyon turu, ölçülmüş iddia) çoğundan daha sıkı; oradan **yalnız yapı** al.

**3) Graf / durum makinesi — LangGraph, Mastra**
`langchain-ai/langgraph` (döngü, dallanma, checkpoint, insan onayı; kurumsal kullanımda lider),
`mastra-ai/mastra` (~21k ★, TypeScript-native, ReAct + graf + agent ağı).
**Sufle için önerim: alma.** Bu çerçevelerin sattığı şey deterministik orkestrasyon —
sende o zaten `kapi.sh` + `/loop /cto` olarak var ve **bağımlılıksız**. Getirisi düşük, bakım yükü gerçek.

**4) Vendor SDK — Claude Agent SDK**
Tek anlamlı çerçeve yatırımı bu: **gece turunu CI'da koşturmak**. GitHub Actions içinde
"kapıyı koş → kırmızıysa teşhis et → PR aç" ajanı. Yayın kararını yine sen verirsin
(protokoldeki "Erdal onayı" adımı korunur).

**Özet karar:** mimari değiştirme; **rol ayrımı (2)** ekle, **CI ajanı (4)** ile kapıyı otomatikleştir.

### (b) Ürünün içinde ajan — sınır nerede
Sufle'nin satış vaadi: *hesap yok, sunucu yok, veri cihazdan çıkmıyor* (`GIZLILIK.md`).
Bulut LLM eklemek bu vaadi **doğrudan** bozar — ve `magaza`/gizlilik metniyle çelişir.

Kimlikle uyumlu tek yol **cihaz üstü**:
- `huggingface/transformers.js` + Whisper (WebGPU) — WASM'a göre 5-10× hızlanma, model indikten
  sonra **çevrimdışı**, 100 dil. Sufle'de karşılığı: `webkitSpeechRecognition`'a bağlı
  **sesle takip** ve **.srt üretimi** — bugün tarayıcının insafında, çevrimdışı çalışmıyor.
- Maliyet dürüstlüğü: model indirimi onlarca MB → **opsiyonel özellik** olarak, kullanıcı
  onayıyla. Tek dosya kimliğini bozmaz (model veri, kod değil).
- "Sunucu gerektirenler = Erdal kararı" maddene dokunmadan ilerleyen **tek AI hattı** budur.

---

## 3. Geliştiricinin yararlanacağı repolar — Sufle acısına göre sıralı

| # | Repo | Neyi çözer | Sufle'deki hangi acı | Risk |
|---|---|---|---|---|
| 1 | **ast-grep/ast-grep** | tree-sitter tabanlı yapısal arama/değiştirme; eşleşme sayısı verir, 0 eşleşmede hata döndürebilir | **Kayıtlı hata sınıfı #1**: `str.replace` deseni tutmazsa değişiklik SESSİZCE yapılmıyor (3 kez oldu) | düşük — tek ikili, dev-only |
| 2 | **oxc-project/oxc (oxlint)** veya **biomejs/biome** | Rust hızında lint, sıfır konfig | çıkarılan `<script>` bloğunda ölü değişken, gölgeleme, boş catch, `==` | düşük |
| 3 | **stryker-mutator/stryker-js** | mutasyon testi — "test ayırt ediyor mu" sorusunu otomatik yanıtlar | `bozma.py`'nin endüstriyel hâli; senin kendi kuralın ("yeni test yazınca ayırt ettiğini kanıtla") | orta — kurulum, tek dosyada özel konfig |
| 4 | **GoogleChrome/workbox** (yalnız `workbox-cli`) | içerik hash'iyle precache manifesti | `sw.js` CACHE sürümünü **elle** artırma zorunluluğu — tek unutmada bayat önbellek, kullanıcı eski sürümde kalır | düşük — çıktı yine düz `sw.js` |
| 5 | **Vanilagy/mediabunny** | saf TS medya araç seti; MP4/WebM mux+demux, WebCodecs; tree-shakable (~17 kB) — `mp4-muxer`/`webm-muxer` **artık kullanımdan kalktı**, halefi bu | iOS'ta MP4 önceliği, kayıt/altyazı gömme, uzun çekim bellek tepesi; MediaRecorder'ın *verdiğiyle* yetinmek yerine *istediğini* üret | orta — `cekirdek/`e girip `derle.py` ile gömülür, kimlik korunur |
| 6 | **101arrowz/fflate** | akış tabanlı zip/deflate, çok küçük | yayın paketi zip'i — **şart değil**, kendi 50 satırlık yazıcın çalışıyor ve v9.3'te akışa çevrildi. Yalnız sıkıştırma gerekirse | düşük |
| 7 | **dequelabs/axe-core** | erişilebilirlik kural seti | elle yazılan klavye/ekran okuyucu testlerinin üstüne endüstri katmanı | düşük — dev-only |
| 8 | **GoogleChrome/lighthouse** + **ai/size-limit** | PWA denetimi + bayt bütçesi | 514 KB tek dosyanın sınırı yok, sessizce büyüyor | düşük |
| 9 | **microsoft/playwright** (+ `playwright-mcp`) | deterministik tarayıcı testi + görsel temel çizgi | çizilen arayüzün hiç ölçülmemesi | düşük |
| 10 | **web-infra-dev/midscene** | görüş tabanlı UI ajanı, web+iOS+Android | canvas/kamera/kompozit doğrulaması; **gerçek iPhone'da** PWA turu | orta — model çağrısı, maliyet; kapıya değil rapora bağla |
| 11 | **huggingface/transformers.js** | cihaz üstü ASR (Whisper/WebGPU) | sesle takip + .srt'nin tarayıcıya bağımlılığı, çevrimdışı çalışmaması | orta — model boyutu, opsiyonel özellik |
| 12 | **ionic-team/capacitor** | PWA → native kabuk (App Store / Play) | `ios-olcum/` WKWebView probun tam bunun için; `magaza/` başlamış | ⚠️ **yüksek — aşağıya bak** |

### ⚠️ 12 numaranın uyarısı — Apple 4.2
Apple'ın 4.2 ("minimum functionality") kuralı **"yeniden paketlenmiş web sitesi"** görünen
WebView uygulamalarını rutin olarak reddediyor; PWABuilder'ın iOS çıktısı da aynı riski taşıyor
(Android/TWA tarafı sorunsuz). **Sufle'nin şansı ortalamanın çok üstünde**, çünkü gerçek native
değer zaten var: kamera kaydı, Fotoğraflar'a paylaşım, Wake Lock, BT kumanda, dosya dışa aktarma,
çekim arşivi. Ama bunlar **başvuruda öne çıkarılmazsa** "web sitesi" gibi okunur.
→ `MAGAZA_TEKNIK.md`'ye bir **"4.2 savunma dosyası"** bölümü ekle: her native yeteneğin
ekran görüntüsü + hangi iOS API'sini kullandığı. Reddi *sonra* tartışmak pahalı.

---

## 4. Almayacaklarımız — ve nedeni (bu bölüm en az öneriler kadar önemli)

| Alınmayacak | Neden |
|---|---|
| React / Tailwind / shadcn / v0 | "tek dosya + `file://` ile açılabilir" kimliğini kırar; `derle.py`'ın varlık sebebi bu ölçümdü (`<script type="module">` `file://` altında **sessizce** yüklenmiyor) |
| LangGraph / CrewAI / AutoGen / Dify / n8n | Sufle'nin ajan ihtiyacı geliştirme zamanında; `kapi.sh` zaten deterministik orkestratör. Çerçeve = yeni bakım yükü, sıfır yeni kabiliyet |
| Ürün içinde bulut LLM | gizlilik vaadi + mağaza metni ile çelişir |
| `browser-use`'u yeşil kapıya koymak | nondeterministik kapı = kapısızlık; kırmızı/yeşil kararı modele bırakılmaz |
| Hazır "awesome-agents" prompt paketlerini olduğu gibi kopyalamak | çoğu ölçülmemiş prompt; Sufle'nin kanıt kültürünü aşağı çeker |

---

## 5. Önerilen sıra (getiri/risk oranına göre)

1. **ast-grep** — yarım gün, en yüksek getiri. `denetim.py`'nin regex kurallarının bir kısmını
   yapısal kurala taşı; toplu düzenlemeler artık sessizce başarısız olamaz.
2. **size-limit + Lighthouse** kapısı — bir saat, dosya büyümesine sınır.
3. **Playwright + axe-core** → `kapi.sh` adım 10 ve 11.
4. **Midscene PoC** — üç senaryo: (a) kayıt akışı baştan sona, (b) kompozit yeşil ekran kadrajı,
   (c) paylaşım ekranı tanı satırı. **Gerçek iPhone'da.** Erdal'ın açık maddesi olan
   "paylaşım tanı satırı ne yazıyor" sorusunu bu tur kendiliğinden yanıtlar.
5. **Workbox** ile `sw.js` sürümlemesini elden al.
6. **Stryker** ile bozma turunu genişlet (`bozma.py` kalsın, tamamlayıcı olsun).
7. **Capacitor + 4.2 savunma dosyası** — mağaza kararı verildiğinde.
8. **transformers.js ASR** — Erdal kararı; kimlikle uyumlu tek AI hattı.

### Ölçüt
Her araç için tek soru: **"bu ay hangi gerçek hatayı yakaladı?"** Cevabı olmayan araç,
üçüncü ayın sonunda tezgâhtan çıkarılır. (Aynı ölçüt `kontrast.py` ve `kapsam.py` için de geçerli.)

---

## Kaynaklar
- Midscene: https://github.com/web-infra-dev/midscene
- Tarayıcı ajanı karşılaştırmaları: https://www.firecrawl.dev/blog/best-browser-agents · https://www.nxcode.io/resources/news/stagehand-vs-browser-use-vs-playwright-ai-browser-automation-2026
- Stagewise: https://github.com/stagewise-io/stagewise
- Ajan çerçeveleri: https://www.speakeasy.com/blog/ai-agent-framework-comparison/ · https://www.firecrawl.dev/blog/best-open-source-agent-frameworks
- Claude Code ekosistemi: https://github.com/VoltAgent/awesome-claude-code-subagents · https://github.com/rohitg00/awesome-claude-code-toolkit · https://github.com/ComposioHQ/awesome-claude-skills
- Görsel regresyon: https://percy.io/blog/open-source-visual-regression-testing-tools
- ast-grep karşılaştırması: https://ast-grep.github.io/advanced/tool-comparison.html · https://www.hypermod.io/blog/4-jscodeshift-vs-ast-grep
- Mediabunny (mp4-muxer halefi): https://github.com/Vanilagy/mediabunny · https://vanilagy.github.io/mp4-muxer/
- PWA → App Store / 4.2: https://www.mobiloud.com/blog/publishing-pwa-app-store · https://capacitorjs.com/docs/web/progressive-web-apps
- Cihaz üstü ASR: https://github.com/xenova/whisper-web
