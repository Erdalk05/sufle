# BIGVU karşılaştırması ve FAZ G planı (2026-08-15)

**İstek (Erdal):** *"BIGVU'nun tüm özelliklerini incele — UI yönü, uygulama/modül yönü;
teleprompter uygulamalarının UI ve uygulama yönlerini incele; Sufle'yi hem UI hem kullanım
bakımından onların üstüne çıkar. Süreçleri TODO olarak planla, sonra yapalım."*

**Bu dosya plandır, iş değildir.** Hiçbir madde "yapıldı" işaretli değil. Kural değişmedi:
kanıtsız ✅ yasak, her madde ölçülen bir kabul ölçütüyle kapanır.

**Yöntem:** BIGVU tarafı **dış kaynaktan** (App Store, kendi site/FAQ'ları, bağımsız inceleme
ve Erdal'ın gönderdiği ödeme ekranı görüntüsü) çıkarıldı. Sufle tarafı **tahmin edilmedi,
kaynaktan sayıldı** (aşağıdaki her "var/yok" bir grep/okuma sonucudur). İkisini aynı tabloya
koymadan önce not: grep sayımı tek başına kanıt değildir (CLAUDE.md kural 7), o yüzden
"yok" diyen her satır ayrıca ilgili ekranda aranarak doğrulandı.

---

## 1 · BIGVU modül envanteri (15 modül)

| # | Modül | Ne yapıyor | Nasıl çalışıyor |
|---|---|---|---|
| 1 | Teleprompter | Kamera üstünde metin akışı, hız/boyut ayarı, **satır başına hız** (cümledeki kelime sayısına göre) | cihazda |
| 2 | AI senaryo yazarı | Konu → hazır suflelenebilir metin (giriş, ana noktalar, CTA) | **sunucu + LLM** |
| 3 | Otomatik altyazı | Konuşmadan altyazı; temiz seste **%92–95 doğruluk** | **sunucu ASR** |
| 4 | Altyazı stili / karaoke | Kelime kelime **senkron vurgulu** altyazı, tema/font/renk/animasyon, rastgele döndürme, "Highlight/Quote/Lower third/Intro/Split" düzenleri | cihaz + tema paketi |
| 5 | Marka kiti | Logo, marka renkleri, alt bant, tutarlı tipografi (**AI Pro/Team'e kilitli**) | hesap |
| 6 | Video editör (Composer) | B-roll, bölünmüş ekran, animasyonlu başlık, zoom efekti, sahne algılama, müzik yatağı, intro/outro | web + sunucu |
| 7 | Göz teması düzeltme | Bakışı kameraya çeviren ML | **model** |
| 8 | AI avatar / "Twin" | Çekim yapmadan konuşan kafa videosu | sunucu |
| 9 | AI ses tasarımı / klonlama | Anlatım sesi üretme | sunucu |
| 10 | Auto-Shorts | Uzun videodan kısa klipler | sunucu |
| 11 | B-roll üreteci | Senaryoya uyan stok görüntü | sunucu + lisanslı kütüphane |
| 12 | Fototale | Fotoğraflardan anlatımlı video | sunucu |
| 13 | Tek tıkla yayınlama | IG / YouTube / TikTok / LinkedIn / Facebook | OAuth + sunucu |
| 14 | Analitik + içerik takvimi | Performans takibi, planlama | hesap |
| 15 | Video e-posta / VoiceMate | CTA'lı video e-posta, 7/24 sesli ajan | sunucu |

**Fiyat (Erdal'ın ekranı, TR mağazası):** AI Pro **₺2.799,99/6 ay** (₺466,66/ay) · Starter
**₺2.299,99/6 ay** (₺383,33/ay) · Starter aylık **₺699,99**. ABD fiyatları $24,99–$29,99/ay
bandında; ücretsiz katman **filigranlı, altyazısız ve 2-3 dakikayla sınırlı**.

**Bağımsız incelemenin bulduğu zayıflıklar (bunlar bizim açık kapımız):**
yazı boyutu denetimi "adanmış sufle uygulamalarına göre kısıtlı" · **sayısal WPM ayarı yok**,
1-3 arası kaydırıcıyla tahmin · 160 WPM üstünde kaydırma güvenilmez · **internet şart** ·
ücretsiz katman fiilen kullanılamaz · kayıttan önce **zorunlu onboarding** · arka plan
değiştirme yalnız çekim sonrası.

---

## 2 · Sufle'nin ölçülen karşılığı

| BIGVU modülü | Sufle'de durum (ölçüldü) |
|---|---|
| Teleprompter | ✅ **üstün**: gerçek WPM (sayısal), delta-time motor, işaretleme dili (`*vurgu*` `/` `//` `(2)`), biyonik okuma, okuma şeridi, bölüm bölüm çekim, zorlanma haritası |
| Sesle takip | ✅ **BIGVU'da YOK** — bizde var (ücretsiz; PromptSmart'ta patentli/ücretli) |
| Otomatik altyazı | ✅ **ASR'siz** — `cekimAltyazi` her kelimenin okuma çizgisinden geçtiği anı taşıyor (`{s, ln, t}`), yani **kelime düzeyinde zaman damgası zaten elimizde** |
| Altyazı stili / karaoke | ⚠️ **yarım**: `capStyleSeg` yalnız **2 stil** (Sade · Sosyal), konum 2 (Alt · Orta), boyut, satırda en fazla kelime, kayma. **Kelime kelime senkron vurgu YOK**, font seçimi YOK, animasyon YOK |
| Marka kiti | ❌ **hiç yok** — `logo` 0, `brandKit/marka` 0, `fontFamily` 0 (iki kabukta da) |
| Editör | ⚠️ **kısmi**: budama ✅, yeşil ekran + arka plan + gerçek kırpma ✅, zoom ✅(24 kullanım, kadraj), **müzik yatağı ❌ (0)**, **intro/outro ❌ (0)**, **bölünmüş ekran ❌ (0)**, B-roll ❌ |
| Auto-Shorts | ❌ yok — ama **ham madde var**: bölüm işaretleri + zorlanma haritası + kelime zamanları |
| Yayın paketi | ✅ **BIGVU'da bu adla yok**: zip = video + .srt + senaryo + başlık/açıklama/etiket |
| Prova raporu | ✅ **BIGVU'da yok**: hız, duraklama, tempo, okunmayan kuyruk |
| Tek tıkla yayınlama | ❌ (paylaş menüsü var) — OAuth + sunucu ister |
| AI senaryo/avatar/ses/B-roll/analitik/takvim | ❌ — sunucu/model ister |
| Göz teması düzeltme | ❌ ML yok; bizde **kılavuz** var (kameraya bak + kadraj: gözler bu hizada) |
| Fiyat | ✅ **tamamen ücretsiz, filigransız, 4K, çevrimdışı, hesapsız** |

---

## 3 · Stratejik ayrım — neyi neden yapıyoruz

**Yapısal üstünlüğümüz (BIGVU'nun mimarîsi buna izin vermiyor):**
Onlar altyazıyı **buluttaki ASR ile tahmin ediyor** (%92–95). Biz metni **zaten biliyoruz** —
kullanıcı onu okudu. Kelime doğruluğumuz **%100**, tahmin edilen tek şey zamanlama ve onu da
okuma çizgisinden ölçüyoruz. Yani BIGVU'nun **en pahalı ve en çok reklamı yapılan modülünü**
(karaoke altyazı) biz **sunucusuz, internetsiz, ücretsiz ve daha doğru** yapabiliriz.
Bu, FAZ G'nin bir numaralı maddesi olmasının sebebi.

**Onların gerçek üstünlüğü (dürüstlük sınırı):** AI üretimi (senaryo, avatar, ses, B-roll),
bulut/ekip ve tek tıkla yayınlama. Bunların hepsi **sunucu ve hesap** ister; `FIYATLANDIRMA.md`
ve rekabet ölçümü (Tur 52 · Tur 56) aynı sonuca bağımsız yollardan varmıştı: **sunucusuz
tavanımız 81,9 puan, bugün 63,0** — yani sunucuya hiç dokunmadan hâlâ **18,9 puanlık** iş var
ve bu iş liderin (BIGVU 65,3) üstüne çıkmaya yeter. FAZ G bu 18,9 puanın peşindedir.

---

## 4 · UI dersleri — Erdal'ın gönderdiği ekrandan ve rakip incelemesinden

| Ders | BIGVU ne yapıyor | Sufle bugün | Ne yapacağız |
|---|---|---|---|
| **Önizleme-önce seçim** | Altyazı stilleri **canlı küçük resim kartlarıyla** seçiliyor; ne alacağını görüyorsun | metin etiketli anahtar/kaydırıcı listesi | soyut ayarları, **kendi videosundan üretilmiş** önizleme kartlarına çevir |
| **Modül çubuğu** | Alt şeritte ikonlu modül geçişi (video · sihirli düzenleme · CC · avatar · görsel · favori · profil) | ayarlar 3 sekme + üst krom | çekim sonrası **tek şerit**: Altyazı · Marka · Kırp · Paket |
| **"Detayları gör"** | Her modülün derinliği ayrı sayfada, ana ekran sade | ayar sayfaları dolu | derinliği ikinci kademeye al, ilk kademede 3-4 seçim |
| **Kilit rozeti** | 💎 ile ücretli olan **açıkça** işaretli | ücretsizlik 10 yerde yazılı | **bu bizim reklamımız**: "hepsi ücretsiz" görünür kalsın, rozet YOK |
| **Onboarding sürtünmesi** | Kayıttan önce zorunlu kurulum (incelemenin şikâyeti) | ilk açılışta 3 adım, atlanabilir | koru; **kayıt yolu asla kapıda durmasın** |
| **Sayısal WPM** | yok, 1-3 kaydırıcı | **var** | vitrinde ve mağaza metninde bunu **söyle** |

---

## 5 · TODO — FAZ G (sıra P0 → P1 → P2)

Her madde: *ne · neden · kabul ölçütü (ölçülebilir) · kapı bağı.*
Sıra bilerek "en çok kullanıcıya değen ve sunucusuz olan" ile başlıyor.

### G.1 — Karaoke altyazı (kelime kelime senkron vurgu) · **P0**
- **Ne:** gömülü altyazıda ve `.srt`/`.ass` çıktısında, konuşulan kelime **o an vurgulansın**.
- **Neden:** BIGVU'nun vitrin özelliği; bizde veri (`cekimAltyazi[i].t`) **zaten var**, ASR yok.
- **Kabul:** 3 tempoda (120/160/200 WPM) vurgulanan kelime ile ses arasındaki kayma **≤120 ms**
  ölçülsün; kelime atlanmasın; 0 kelime kaybı. Emoji/Türkçe harf bölünmesi 0 (tests/66+ korunur).
- **Kapı:** yeni test — kaynaktan `cikar()` ile alınan zamanlayıcı sanal saatle koşturulur + 4 bozma.

### G.2 — Altyazı stil paketi (font · renk · animasyon · konum) · **P0**
- **Ne:** bugünkü 2 stil → **en az 6 hazır tema** + konum 3 + kelime vurgu rengi + 3 animasyon
  (yok · yumuşak · sıçra). **Dış font indirilmeyecek** (sıfır bağımlılık sözü) → sistem fontlarından
  ölçülmüş 4 aile + ağırlık/harf aralığı ile fark yaratılacak.
- **Kabul:** her tema **çizilmiş karede** kontrast ≥4,5:1 (kontrast kapısı ölçer); 430/393/375 px'te
  taşma 0; tema değişimi kare başına maliyet **≤2 ms** (uzun senaryo tuzağı).
- **Kapı:** `kontrast.py` tema listesini dolaşsın (ölü tema = kırmızı).

### G.3 — Önizleme kartlı seçim (UI'nin asıl sıçraması) · **P0**
- **Ne:** altyazı stili, kadraj/profil ve arka plan seçimleri **kendi çekiminden üretilmiş
  küçük resimle** seçilsin (BIGVU'nun kart şeridi, ama içerik senin videon).
- **Neden:** "ayar adı" değil "sonuç" gösterilir; jargon = görünmezlik kuralının UI karşılığı.
- **Kabul:** kart üretimi **≤150 ms** (tek kare, düşük çözünürlük); kart yokken eski liste
  çalışmaya devam etsin (ön koşulu olan ayar = ölü ayar kuralı).
- **Kapı:** `ekran.py` ile kart şeridinin çizildiği doğrulansın; adsız öge 0.

### G.4 — Marka kiti (logo · renk · alt bant) · **P1**
- **Ne:** cihazdan seçilen logo (PNG/SVG) çekime yakılabilsin; marka rengi altyazı+alt banda
  uygulansın; **alt bant** (ad/unvan) şablonu.
- **Neden:** BIGVU'da bu **en pahalı katmana kilitli**; bizde ücretsiz olması doğrudan rekabet silahı.
- **Kabul:** logo **belleğe kopyalanmadan** çizilsin (arka plan fotoğrafı dersinin aynısı: 12 MP'de
  51 MB tuzağı); kayıt sırasında kare maliyeti **+1 ms**'i geçmesin; logo kadraj dışına taşmasın (4 genişlik).
- **Kapı:** parite (Mac'te de olacak) + boyut kapısı testi.

### G.5 — Müzik yatağı · **P1**
- **Ne:** cihazdan seçilen ses dosyası kayda karışsın, konuşma altında **otomatik kısılma** (ducking).
- **Risk (bilinen sınıf):** mikrofonu Web Audio'ya bağlayan her özellik `openCam()`'de temizlenmeli;
  **iOS'ta kayıt sırasında Web Audio bağlamak MediaRecorder'ın sesini öldürüyor** →
  iOS'ta **kayıt sonrası karıştırma** yolu ölçülecek, olmuyorsa sebebi arayüzde yazacak.
- **Kabul:** iOS'ta sessiz kayıt üretme riski **sıfır** olduğu kanıtlanmadan açılmaz.

### G.6 — Klip üreteci (Auto-Shorts karşılığı, AI'sız) · **P1**
- **Ne:** çekimden sonra "paylaşılabilir 3 klip" önerisi — **bölüm işaretleri + `(2)` vurguları +
  zorlanma haritası + kelime zamanları** ile kesim noktaları; her klip için hazır başlık/etiket.
- **Neden:** BIGVU bunu sunucuda LLM ile yapıyor; bizde **senaryonun kendisi** bu bilgiyi taşıyor.
- **Kabul:** klip sınırları kelime ortasına düşmesin; her klip 15–60 sn; öneri **sebebini yazsın**
  ("bölüm 2, en yüksek vurgu"). Uydurma başlık yok — abartma engeli (tests/132) geçerli.

### G.7 — Intro/outro + alt bant animasyonu · **P2**
- **Kabul:** kayıt boru hattını yavaşlatmayacak; yalnız çekim sonrası uygulanacak.

### G.8 — İçerik planlayıcı (cihazda) · **P2**
- **Ne:** senaryolara "çekilecek/çekildi/yayınlandı" durumu + tarih; **hesapsız, cihazda**.
- **Kabul:** localStorage tavanı (4,94 MB) ölçülmüş sınırın içinde kalsın.

### G.9 — Göz teması düzeltme · **ÖLÇÜLECEK, sonra karar**
- **Ne:** ML gaze-correction. Model gerektiriyor → "sıfır bağımlılık" sözünü **kırar**.
- **Karar ölçütü:** model boyutu, cihazda kare hızı ve **yanlış düzeltmenin bedeli** ölçülmeden
  yazılmaz. `ffmpeg.wasm` ve OpenDyslexic'te verilen aynı karar süreci.

### G.10 — Vitrin ve mağaza metnini üstünlüklerle güncelle · **P1**
- **Ne:** "sayısal WPM", "internetsiz çalışır", "altyazı ASR'siz ve %100 kelime doğru",
  "filigran yok, hepsi ücretsiz" — hepsi **ölçülmüş** ifadeler.
- **Kapı:** tests/132 + tests/135 abartma engeli; her cümle koddaki karşılığına bağlı.

### 🔴 Erdal kararına bağlı olanlar (sunucu/hesap ister — kendiliğinden başlatılmaz)
- AI senaryo yazarı · AI avatar/ses · B-roll kütüphanesi · analitik
- **Tek tıkla sosyal yayınlama** (OAuth + sunucu)
- Bulut yedek / ekip / çoklu cihaz
- Bunların hepsi tek soruya bağlı: **sunucu işletecek miyiz?** (`FIYATLANDIRMA.md`)

---

## 6 · Sıradaki tur

`G.1 → G.2 → G.3` tek bir yayına (v9.14) sığar ve BIGVU'nun vitrin özelliğini
**onlardan daha doğru** biçimde karşılar. G.4–G.6 ikinci yayın.
Her madde bittiğinde bu dosyada ✅ + ölçülen kanıt, sonra `./kapi.sh` yeşil, sonra commit.
