# 30 kategorilik rekabet analizi — ÖLÇÜLMÜŞ SÜRÜM

**İlk ölçüm:** 15 Ağustos 2026 (v9.11) · **Yeniden ölçüm:** 16 Ağustos 2026, FAZ G sonrası (v9.14)
**Ölçen:** kapı (6058 test, 258 kanıtlı bozma)

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
| Ölçülen (15 Ağustos, v9.11) | **63,0** | 4. (PromptSmart 56,0'ın üstünde, BIGVU 65,3'ün altında) |
| Ölçülen (16 Ağustos, FAZ G sonrası, v9.14) | 64,3 | 4. — BIGVU 65,3'ün 1,0 puan altında |
| **Ölçülen (16 Ağustos, G.8 uygulandıktan sonra, v9.15)** | **64,9** | **4.** — BIGVU 65,3'ün **0,4 puan** altında |

İlk sıçrama (+9,4) tek satır yeni kod yazılmadan geldi: analiz, yayında olan
özellikleri bilmiyordu. İkinci sıçrama (+1,3) FAZ G'nin on özelliğinden geldi ve
**yalnız iki kategoriyi** hareket ettirdi — aşağıda hangileri olduğu ve
**diğer sekizinin neden değişmediği** tek tek yazılı.

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

---

## FAZ G sonrası yeniden ölçüm (16 Ağustos) — iki kategori hareket etti

Gecede on özellik eklendi (karaoke altyazı, 6 altyazı teması, önizleme kartları,
süreye sığdır, marka kiti, klip önerileri, müzik yatağı, sağdan sola diller,
yazı tipi paritesi, kumanda yolları). Rubrik sabit tutuldu; hangi kategorinin
oynadığı **koddan** karara bağlandı.

| # | kategori | ağ. | önce | şimdi | kanıt |
|---|---|---|---|---|---|
| 15 | Video düzenleme / kırpma | ×2 | 3 | **4** | klip önerileri (`cekirdek/klip.js`, `tests/155`) budama kutusunu dolduruyor **ve** kesim artık kaynağı korumuyor değil — koruyor (`tests/160`): tek çekimden **birden çok klip** çıkıyor. Zaman çizelgesi, geçiş ve çoklu iz yok → 5 değil |
| 28 | Çok dil ve RTL | ×2 | 1 | **3** | satır satır bidi yönü (`cekirdek/yon.js`), RTL noktalaması cümle sonu sayılıyor, karaoke vurgusu doğru uçta, tuval yönü ayrı ayarlanıyor, yazı alanı `dir="auto"` — Chrome'da 3 dil × 3 genişlikte ölçüldü (`tests/157`). Arayüz hâlâ **iki dil** → 5 değil |

**+1,3 puan** (302/470). Kalan sekiz özellik puanı DEĞİŞTİRMEDİ ve sebebi şu:

| özellik | dokunduğu kategori | neden puan değişmedi |
|---|---|---|
| Karaoke altyazı · 6 tema · önizleme kartları | 14 · Altyazı ve SRT | Kategori zaten **5** (tavan). Karaoke gerekçeyi güçlendiriyor, sayıyı değil |
| Marka kiti (logo + alt bant) | 16 · Sosyal format | Kategori zaten **5** (tavan) |
| Süreye sığdır | 1 · Sufle motoru | Motor 4; 5 için "altın kaydırma" pürüzleri ölçülmeli — süre hedefi kaydırma kalitesini değiştirmiyor |
| Müzik yatağı | 11 · Kayıt kalitesi | **Asıl üründe (iPhone) çalışmıyor**: Web Audio kayıt sesini kesiyor, Ses Stüdyosu iOS'ta kapalı (`cekirdek/muzik.js`). Masaüstünde çalışan bir özellik bu kategoriyi yükseltemez |
| Yazı tipi paritesi + kalınlık/harf aralığı | 25 · UI / görsel | UI 4; belgenin kendi tavan şartı "gruplama ve tipografik ritim" (Tur 55 devamı) ve o iş yapılmadı. Erişilebilirlik kazancı gerçek ama bu kategorinin ölçtüğü şey değil |
| Kumanda bağlantı yolları | 4 · Uzaktan kumanda | Yeni **yol** açılmadı, olmayan yolun **sebebi** görünür kılındı. Genişlik aynı → 4 |
| Klip önerileri (tek başına) | 17 · AI senaryo | Yapay zekâ **yok** ve olmayacak; öneriler ölçümden çıkıyor. 17 hâlâ **0** |
| Ölçülen kontrast yüzeyi (kompozit) | 25 · UI / görsel | Kapı kapsamı büyüdü, ürün yüzeyi değil |

**Turun asıl kazancı puan değil, bulunan kusur:** klip önerisi üç klip gösteriyordu
ama telefonda kesme `dbDel(curTakeId)` ile **kaynak çekimi siliyordu** — yani ilk
kesimden sonra diğer iki öneri ulaşılamazdı ve kullanıcı sildiğini hiç görmüyordu.
Masaüstünde silme yoktu ama kaynak bellekte eziliyordu, sonuç aynı. Onarıldı
(klip yeni çekim olarak arşivleniyor, "↩ Tam çekim" ile dönülüyor) ve beş kasıtlı
bozmayla kilitlendi. 15. kategorinin 4 alması **bu onarımdan sonra** doğru oldu.

---

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
Bugün **64,9**'dayız, yani **istemci tarafında hâlâ 17,0 puan kazanılabilir** —
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
| 7 | 28 · Çok dil ve RTL (×2) | 3 | 5 | **+4** | arayüz dili sayısı (bugün 2); RTL tarafı bitti |

**En büyük tek hamle mağazaya çıkmak** (#20 ve #21 birlikte ×8 ağırlık taşıyor) ve
onun önündeki teknik engel Tur 51'de ölçülüp yıkıldı.

---

---

---

## G.8 sonrası (v9.15): 7. kategori de ölçüldü

| # | kategori | ağ. | önce | şimdi | kanıt |
|---|---|---|---|---|---|
| 7 | Senaryo kütüphanesi ve organizasyon | ×3 | 3 (tahmin) | **4** | arama (`#scriptFind`) · üç sıralama kipi (`st.scSort`) · çoğaltma · **geri alınabilir çöp** (`st.trash`) · iki sürümlü senaryo · içe/dışa aktarma · ve G.8 ile **türetilmiş bilgi**: son değişiklik + çekim sayısı (`tests/162`). **Klasör ve etiket yok** → 5 değil |

**64,3 → 64,9.** BIGVU (65,3) ile fark **0,4 puana** indi. Bu satır bugüne kadar
"tahmin korundu" durumundaydı; ölçülünce analizin bir kez daha **eksik bildiği**
çıktı — arama, sıralama ve geri alınabilir çöp zaten yayındaydı.


## Rubriğin tamamı — 30 satırın hepsi

Bugüne dek bu belge yalnız **düzelttiği** satırları yazıyordu; kalan on dokuzu
belgede hiç görünmüyordu, yani okuyan kişi 64,3'ün nereden geldiğini
denetleyemiyordu. Tablo artık tamamı ve her satır kendi **durumunu** söylüyor:

- **ölçüldü** — puan kodda ölçülüp değiştirildi ya da doğrulandı (13 satır)
- **sıfır doğrulandı** — 0 olduğu ölçüldü; sunucu/hesap/pazar gerektiriyor (6 satır)
- **tahmin korundu** — analizin verdiği puana DOKUNULMADI, ölçülmedi (11 satır)

| # | kategori | ağ. | Sufle | durum |
|---|---|---|---|---|
| 1 | Sufle motoru ve kaydırma kalitesi | ×5 | 4 | tahmin korundu |
| 2 | Sesle takip gücü | ×5 | 4 | ölçüldü |
| 3 | TÜRKÇE sesle takip | ×4 | 5 | tahmin korundu |
| 4 | Uzaktan kumanda genişliği | ×4 | 4 | ölçüldü |
| 5 | Ayna / prompter donanım desteği | ×3 | 3 | tahmin korundu |
| 6 | Göz teması araçları | ×3 | 5 | tahmin korundu |
| 7 | Senaryo kütüphanesi ve organizasyon | ×3 | 4 | ölçüldü |
| 8 | İçe aktarma (docx/pdf/Drive) | ×2 | 3 | ölçüldü |
| 9 | Bulut senkron ve çok cihaz | ×4 | 0 | sıfır doğrulandı |
| 10 | Çevrimdışı ve gizlilik | ×3 | 5 | tahmin korundu |
| 11 | Kayıt kalitesi (4K, format) | ×4 | 4 | ölçüldü |
| 12 | Kamera kontrolleri | ×3 | 3 | ölçüldü |
| 13 | Yeşil ekran / arka plan | ×2 | 4 | tahmin korundu |
| 14 | Altyazı ve SRT | ×3 | 5 | ölçüldü |
| 15 | Video düzenleme / kırpma | ×2 | 4 | ölçüldü |
| 16 | Sosyal format ve güvenli alanlar | ×3 | 5 | tahmin korundu |
| 17 | AI senaryo yazımı | ×3 | 0 | sıfır doğrulandı |
| 18 | AI ekstralar (avatar/çeviri/dublaj) | ×2 | 0 | sıfır doğrulandı |
| 19 | AI göz teması düzeltme | ×2 | 0 | sıfır doğrulandı |
| 20 | Platform kapsamı | ×4 | 2 | tahmin korundu |
| 21 | Kurulu taban / dağıtım | ×4 | 0 | sıfır doğrulandı |
| 22 | Puan / kararlılık / destek | ×4 | 3 | ölçüldü |
| 23 | Fiyat / değer | ×3 | 5 | tahmin korundu |
| 24 | Ücretsiz katman cömertliği | ×2 | 5 | tahmin korundu |
| 25 | UI / görsel tasarım kalitesi | ×5 | 4 | ölçüldü |
| 26 | Onboarding / öğrenme eğrisi | ×2 | 3 | ölçüldü |
| 27 | TÜRKÇE arayüz / yerelleştirme | ×3 | 5 | tahmin korundu |
| 28 | Çok dil ve RTL | ×2 | 3 | ölçüldü |
| 29 | Takım ve iş birliği | ×2 | 0 | sıfır doğrulandı |
| 30 | Entegrasyonlar (OBS/NDI/sanal kamera) | ×3 | 3 | ölçüldü |

**Ağırlık toplamı 94 · maksimum 470 · ağırlıklı toplam 305 → 64,9.**
Aritmetiği `tests/144-rekabet-olcumu.js` her koşuda yeniden yapıyor; tablo ile
dizi ayrışırsa kapı kırılır.

> **AÇIK SORU — sonraki tura kalsın.** `PAZAR_YOL_HARITASI.md` T0.3, 20. kategoriyi
> (Platform kapsamı) 2 yerine **3** okumuştu: PWA dört platformda da koşuyor.
> Bu belge 2'de tuttu (mağaza kabuğu yok). İki belge aynı sayıyı farklı söylüyor;
> hangisinin doğru olduğu **ölçülmeden** yükseltmek, tam da bu belgenin karşı
> çıktığı şey olurdu. Ölçüm turu: dört platformda kurulum + çevrimdışı açılış.


## Bu belge nasıl bayatlamaz

`tests/144-rekabet-olcumu.js` yukarıdaki **kanıt sütununu koda bağlıyor**: belgenin
"var" dediği bir özellik kodda kalmazsa ya da "yok" dediği bir şey (AI çağrısı,
ödeme duvarı, sunucu ucu) belirirse kapı **önce kırılır**, belge yalan söylemeye
başlamadan.
