# 30 kategorilik rekabet analizi — ÖLÇÜLMÜŞ SÜRÜM

**Ölçüm tarihi:** 15 Ağustos 2026 · **Ölçülen sürüm:** 9.11 · **Ölçen:** kapı (4720 test, 96 kanıtlı bozma)

Erdal'ın gönderdiği 30 kategorilik analiz **tahminle** puanlanmıştı. Bu belge aynı
rubriği koruyor ama SUFLE sütunundaki her puanı **kodda ölçüyor**.

> **DÜRÜSTLÜK SINIRI — önce bu okunsun.**
> Yalnız **SUFLE sütunu** yeniden ölçüldü. Rakip puanlarına DOKUNULMADI; onlar
> hâlâ tahmin ve bu belge onları doğrulamıyor. Yani aşağıdaki sıralama
> "biz ölçüldük, onlar ölçülmedi" karşılaştırmasıdır. Ayrıca puanlar
> **kendi rubriğimizde kendi ürünümüze** verildi — bu bir öz-değerlendirmedir,
> bağımsız bir ölçüm değil.

---

## Sonuç

| | ağırlıklı skor /100 | sıra |
|---|---|---|
| Analizin tahmini | **53,6** | 6. (Speakflow ile Video Teleprompter arasında) |
| **Ölçülen** | **63,0** | **4.** (PromptSmart 56,0'ın üstünde, BIGVU 65,3'ün altında) |

Fark **+9,4 puan** ve tamamı zaten yayında olan, ölçülebilir özelliklerden geliyor —
tek satır yeni özellik yazılmadı. Analiz bunları bilmiyordu.

---

## Düzeltilen 11 kategori (her biri kanıtla)

| # | kategori | ağ. | tahmin | ölçülen | kanıt |
|---|---|---|---|---|---|
| 2 | Sesle takip gücü | ×5 | 3 | **4** | iOS Safari **ve** elle derlenmiş WKWebView'da 10/10 yetenek yeşil (`ios-olcum/olc.sh`) · sessiz ölüm nöbetçisi + öz-test (`tests/142`) · kare başına yeniden ölçüm (`tests/69`) · uzun metin (`tests/65`) |
| 4 | Uzaktan kumanda genişliği | ×4 | 3 | **4** | tuş öğretme (`learnKey`, `tests/138`, `tests/139`) — marka bağımsız · tanı paneli (`tests/76`) · telefon↔Mac yerel sunucu (`tests/29`, `tests/75`) |
| 8 | İçe aktarma | ×2 | 1 | **3** | `.docx` ayrıştırıcı depoda (`cekirdek/docx.js`, `tests/128`) + `.txt`. **PDF ve Drive YOK** — 5 değil, 3 |
| 11 | Kayıt kalitesi | ×4 | 3 | **4** | 4K (`data-q="4k"`) · MP4 · kare hızı seçimi · kompozit kayıt · uzun kayıt bellek sınaması (`tests/102`) |
| 12 | Kamera denetimleri | ×3 | 2 | **3** | `focusMode`/`exposureMode` · fener + zum (`tests/71`) · cihaz seçimi (`tests/126`) · kayıtta kamera değiştirme (`tests/39`). Elle ISO/beyaz ayarı yok |
| 14 | Altyazı & SRT | ×3 | 4 | **5** | Altyazı **konuşma tanımadan** üretiliyor: her kelimenin okuma çizgisini geçtiği an zaten biliniyor → kelime bazlı kusursuz senkron. Rakipler ASR kullanıyor, biz kullanmıyoruz · gömme (`tgBurn`) · kayma denetimi · platform paritesi (`tests/80·81·82·89·91·103`) |
| 15 | Video düzenleme / kırpma | ×2 | 1 | **3** | budama (`openTrim`, `tests/127`) · kompozit kayıtla **gerçek** kırpma · yeşil ekran. Çoklu klip zaman çizelgesi yok |
| 22 | Kararlılık | ×4 | 2 | **3** | 4720 test · 96 kanıtlı kasıtlı bozma · kalıcı hata günlüğü (`tests/110`) · disk dolu / ses ölümü / kamera kurtarma yolları sınanıyor. **Mağaza puanı yok** — 4 olamaz |
| 25 | UI / görsel tasarım | ×5 | 3 | **4** | Tur 55 tasarım kimliği (`tests/143`, 44 iddia) · kontrast AA kapıda ölçülüyor (6 yüzey, 0 ihlal) · tek-eylem kuralı · çizilmiş arayüzde 0 taşma, 0 çakışma |
| 26 | Onboarding | ×2 | 2 | **3** | tanıtım akışı · **hazır kurulum** tek dokunuşla (Reels/YouTube/Sunum) · ayarlarda arama (`tests/93`) · ön koşullu ayarların sebebi yazılı (`tests/94`) |
| 30 | Entegrasyonlar | ×3 | 1 | **3** | **OBS/vMix tarayıcı kaynağı kipi** (`?obs=1`: kabuk gider, zemin şeffaf) · yerel sunucu. Sanal kamera ve NDI **yok** — 5 değil |

## Düzeltilmeyenler — analiz burada HAKLIYDI

Bu satırlara dokunulmadı; ölçüm analizi doğruladı:

- **17 · AI senaryo yazımı = 0**, **18 · AI ekstralar = 0**, **19 · AI göz teması = 0**.
  Depoda hiçbir AI sağlayıcı çağrısı yok (ölçüldü: `openai|anthropic|gpt-|claude-` → 0 eşleşme).
  BIGVU bu üçünde 5/5/5 alıyor ve **puan farkının en büyük tek kalemi bu**.
- **9 · Bulut senkron = 0** — hesap yok, sunucu yok, bize ait hiçbir uca çağrı yok.
- **21 · Kurulu taban = 0** — mağazada değiliz.
- **29 · Takım & iş birliği = 0**.

---

## Asıl bulgu: kalan boşluğun çoğu KOD YAZARAK kapanmıyor

Sıfır alan altı kategorinin ağırlık toplamı **17** — yani **85/470 puan, tümün %18'i**.
Ve altısının altısı da **sunucu, hesap ya da pazar konumu** gerektiriyor:

| kategori | neyi gerektiriyor |
|---|---|
| Bulut senkron (×4) | sunucu + hesap |
| AI senaryo · AI ekstralar · AI göz teması (×3+×2+×2) | sunucu + anahtar + token maliyeti |
| Kurulu taban (×4) | mağazada olmak + zaman |
| Takım & iş birliği (×2) | sunucu + hesap |

**Bundan çıkan tavan:** sunucu işletmeden ulaşılabilecek en yüksek skor **81,9**.
Bugün **63,0**'teyiz, yani **istemci tarafında hâlâ 18,9 puan kazanılabilir** —
bu, bugünkü liderin (80,6) hemen altına kadar çıkmak demek.

Bu, `FIYATLANDIRMA.md`'nin bağımsız yoldan vardığı sonucun aynısı:
**karar tek soruya iniyor — sunucu işletmek istiyor muyuz?**
İki belge birbirini doğruluyor; biri fiyat tarafından, diğeri rekabet tarafından baktı.

## Sunucusuz kazanılabilecek 18,9 puan — sıraya kondu

En yüksek "puan / iş yükü" oranına göre:

| sıra | kategori | bugün | tavan | kazanç | ne gerekiyor |
|---|---|---|---|---|---|
| 1 | 20 · Platform kapsamı (×4) | 2 | 4 | **+8** | mağaza kabuğu (iOS engeli T51'de ölçüldü ve **çürüdü**) |
| 2 | 25 · UI / görsel (×5) | 4 | 5 | **+5** | Tur 55 devam: gruplama, tipografik ritim |
| 3 | 1 · Sufle motoru (×5) | 4 | 5 | **+5** | altın kaydırma testi var; kalan pürüz ölçülmeli |
| 4 | 12 · Kamera denetimleri (×3) | 3 | 4 | **+3** | elle pozlama/beyaz ayarı |
| 5 | 8 · İçe aktarma (×2) | 3 | 5 | **+4** | PDF ayrıştırıcı |
| 6 | 22 · Kararlılık (×4) | 3 | 4 | **+4** | mağaza puanı — yayına bağlı |

**En büyük tek hamle mağazaya çıkmak** (#20 ve #21 birlikte ×8 ağırlık taşıyor) ve
onun önündeki teknik engel Tur 51'de ölçülüp yıkıldı.

---

## Bu belge nasıl bayatlamaz

`tests/144-rekabet-olcumu.js` yukarıdaki **kanıt sütununu koda bağlıyor**: belgenin
"var" dediği bir özellik kodda kalmazsa ya da "yok" dediği bir şey (AI çağrısı,
ödeme duvarı, sunucu ucu) belirirse kapı **önce kırılır**, belge yalan söylemeye
başlamadan.
