# BIGVU karşılaştırması ve FAZ G planı (2026-08-15)

**İstek (Erdal):** *"BIGVU'nun tüm özelliklerini incele — UI yönü, uygulama/modül yönü;
teleprompter uygulamalarının UI ve uygulama yönlerini incele; Sufle'yi hem UI hem kullanım
bakımından onların üstüne çıkar. Süreçleri TODO olarak planla, sonra yapalım."*

**Bu dosya plandır, iş değildir.** Hiçbir madde "yapıldı" işaretli değil. Kural değişmedi:
kanıtsız ✅ yasak, her madde ölçülen bir kabul ölçütüyle kapanır.

⚠️ **Ad çakışmasına dikkat:** buradaki maddeler **noktalı** (`G.1` … `G.16`) ve pazar yol
haritasının FAZ G'sine aittir. `GECE_PLANI_20260813.md` dosyasındaki **noktasız** `G12`
bambaşka bir görevdir (büyük fotoğraf çözme maliyeti). İkisi karıştırılmasın.

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
tavanımız 81,9 puan, o gün 63,0** — yani sunucuya hiç dokunmadan hâlâ **18,9 puanlık** iş var
ve bu iş liderin (BIGVU 65,3) üstüne çıkmaya yeter. FAZ G bu 18,9 puanın peşindedir.

**FAZ G sonrası yeniden ölçüm (16 Ağustos, v9.14): 63,0 → 64,3.** BIGVU ile aramızda
**1,0 puan** kaldı. Ders şu: on özellik eklendi ama puan yalnız **iki** kategoride
oynadı, çünkü altısı zaten tavanda olan kategorilere düştü (altyazı 5, sosyal format 5)
ve biri asıl üründe (iPhone) çalışmıyor (müzik). **Özellik saymak puan kazandırmıyor;
kategorinin ölçtüğü şeyi yapmak kazandırıyor.** Hangi özelliğin neyi değiştirdiği ve
**değiştirmediği** `belgeler/REKABET_30_OLCULDU.md`de satır satır yazılı.

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

### G.1 — Karaoke altyazı (kelime kelime senkron vurgu) · **P0** · ✅ **BİTTİ (v9.14)**
- **Ne yapıldı:** gömülü altyazıda okunan kelime **jetondan gelen renkle** vurgulanıyor,
  gerisi beyaz kalıyor. Ayar: "Konuşulan kelimeyi vurgula" (varsayılan **açık**), gömme
  bağımlıları grubunun içinde (ön koşulu olan ayar = ölü ayar kuralı).
- **Kayma sorunu hiç doğmadı — mimari sayesinde.** Kabul ölçütünü "±120 ms kayma" diye
  yazmıştım; ölçünce **kayma diye bir şey olmadığı** çıktı: `liveCue()` kelimeleri okuma
  çizgisinden geçtikçe ekliyor, yani vurgulanacak kelime her zaman cue'nun **sonuncusu**.
  Zamanlayıcı da tahmin de yok. BIGVU aynı şeyi bulut ASR ile tahmin ediyor (%92-95).
- **Dürüstlük sınırı:** gelecek kelimeler **gösterilmiyor**. Soluk gösterip vurguyu üstlerinde
  gezdirmek daha gösterişli olurdu ama söylenmemiş sözü altyazıda göstermek demekti.
  `tests/150` 7 konumda sızma olmadığını ölçüyor.
- **Ölçülen maliyet:** parçalama düzenle aynı önbellekte — 300 karede **127 measureText**
  (karaoke kapalıyken 57; önbelleksiz 2.400+ olurdu). İlk hâlimde her karede ölçüyordum,
  yani bu dosyada bir kez kapatılmış olan kusuru geri açıyordum; ölçüm yakaladı.
- **Kontrast:** vurgu rengi `--r-warn` (#FFB020) siyah zeminde **11,48:1**, beyazdan ayrımı 1,83:1.
- **Parite:** iki kabuk aynı matematiği kullanıyor (tek kaynak değil ama aynı test tezgâhında
  koşuyor; `tests/150` ikisini de aynı iddialarla ölçüyor).
- **Kapı:** `tests/150` **92 iddia** + **10 kasıtlı bozma** (hepsi kanıtlandı; toplam 148).

### G.2 — Altyazı stil paketi (tema · animasyon · konum) · **P0** · ✅ **BİTTİ (v9.14)**
- **Ölçüm önce ölü ayar buldu:** "Sade/Sosyal" seçimi **çizimi hiç değiştirmiyordu**
  (`st.capStyle` çizimde bir kez bile okunmuyor); yalnız punto+konum kısayoluydu.
  **Mac'te punto ve konum sabitti** (42/alt) ve `capSize`/`capPos`/`cpBottom`/`cpMiddle`
  sözlükte duruyordu — **ölü çeviri**. Dördü de canlandı.
- **Gelen:** 6 tema (Şerit · Kutu · Hap · Şeritsiz · Vurgu hapı · Gölge) · 3 animasyon
  (Yok · Yumuşak · Sıçra) · **Üst** konumu. Tablo `cekirdek/altyazi.js`de, iki kabuğa da
  aynı kaynaktan gömülüyor.
- **Okunurluk kuralı koda bağlandı:** zeminsiz tema kontursuz/gölgesiz olamaz; `altyaziOkunur()`
  hem çizimde uygulanıyor (okunmaz tema sadeye düşüyor) hem testte ölçülüyor.
- **Sessiz gerileme koruması:** varsayılan tema eski görünümü birebir koruyor; alt/orta konum
  eski formülle **1e-9 hassasiyetle** aynı.
- **Yan bulgu (test yakaladı):** animasyon kapalıyken bile her karede kimlik dönüşümü
  kuruluyordu — kaldırıldı.
- **Dış font İNDİRİLMEDİ** (sıfır bağımlılık sözü korunuyor); yazı tipi ailesi işi G.13'te.
- **Kapı:** `tests/151` **158 iddia** + **10 kasıtlı bozma**; parite iki kabukta
  **6 tema × 3 konum** birebir aynı çizim.

### G.3 — Önizleme kartlı seçim (UI'nin asıl sıçraması) · **P0** · ✅ **BİTTİ (v9.14)**
- **Ne yapıldı:** altyazı görünümü artık **kendi kamera görüntünün üstünde altı kart** olarak
  seçiliyor. Kart, uygulamanın **kendi çizimini** çağırıyor (`drawCaption` + `ops`), yani
  kartta gördüğün ile kaydettiğin aynı kod.
- **GERÇEK TARAYICIDA ÖLÇÜLDÜ** (Chrome, 430 px, sahte kamera): 6 kart çizildi ·
  **6 kartın 6'sı birbirinden farklı görünüm** üretti · tema değişimi **1,8 ms**
  (kabul ölçütü 150 ms idi) · adsız öge **0** · sayfa taşması **yok**.
- **En büyük risk önbellekti:** kart bambaşka metni bambaşka genişlikte çiziyor; önbellek
  paylaşılsaydı bir sonraki **kayıt karesi yanlış satırlarla** çizilirdi. Kart kendi
  önbelleğiyle çalışıyor, `tests/152` bunu davranışla ölçüyor.
- **Ölçüm bir eksik yakaladı:** panel açılınca kartlar boş kalıyordu (çizim yalnız görünürken
  yapılıyor, ama açılışta kimse tetiklemiyordu) → açılış zorla çiziyor, Mac'te sekme değişimi.
- **Kart listesi çekirdek tema listesinden üretiliyor**: yeni tema eklenince kart
  kendiliğinden çıkar; elle yazılmış altı düğme olsaydı yedinci tema görünmezdi.
- **Kapı:** `tests/152` **86 iddia** + **12 kasıtlı bozma** (toplam 170).

### G.4 — Marka kiti (logo · renk · alt bant) · **P1** · ✅ **BİTTİ (v9.14)**
- **Ne:** cihazdan seçilen logo (PNG/SVG) çekime yakılabilsin; marka rengi altyazı+alt banda
  uygulansın; **alt bant** (ad/unvan) şablonu.
- **Neden:** BIGVU'da bu **en pahalı katmana kilitli**; bizde ücretsiz olması doğrudan rekabet silahı.
- **Yapıldı:** dört köşeden birine boyutu ayarlanabilen logo · marka rengi · ad+unvan alt bandı
  (kayıt başladıktan sonra birkaç saniye görünüp kayboluyor). Hesap `cekirdek/marka.js`de.
- **Kural koda bağlandı:** marka rengi okunurluğu bozamaz — koyu renk koyu bandın üstünde
  görünmez olur; kontrast ölçülüp okunur renge düşülüyor, **şerit yine kullanıcının rengi**.
- **Bellek dersi uygulandı:** dosya belleğe kopyalanmıyor (nesne adresi), 256 px'e küçültülüyor,
  saydamlık için PNG, iki ayrı sınır sebebiyle söyleniyor (tür ve boyut).
- **Yan kazanç:** telefon gömme hatasını **sessizce yutuyormuş** (`catch(e){}`); Mac ile aynı
  hata yoluna bağlandı ve **parite muafiyet listesi bu bayatlığı kendi yakaladı**.
- **Gerçek tarayıcı iki kusurumu yakaladı:** köprü fonksiyonu yanlış kapsamda kalıp `apply()`i
  yarıda kesiyordu; genel anahtar yenileyicisi `data-t` taşımayan anahtarı sıfırlıyordu.
- **Kapı:** `tests/154` **169 iddia** + **14 kasıtlı bozma** (toplam 195). Dört eski testin
  biçime kilitli deseni iddiaya taşındı.

### G.5 — Müzik yatağı · **P1** · ✅ **BİTTİ (v9.14) — iOS kararı ölçüme dayandı**
- **Ne:** cihazdan seçilen ses dosyası kayda karışsın, konuşma altında **otomatik kısılma** (ducking).
- **Risk (bilinen sınıf):** mikrofonu Web Audio'ya bağlayan her özellik `openCam()`'de temizlenmeli;
  **iOS'ta kayıt sırasında Web Audio bağlamak MediaRecorder'ın sesini öldürüyor** →
  iOS'ta **kayıt sonrası karıştırma** yolu ölçülecek, olmuyorsa sebebi arayüzde yazacak.
- **Yapıldı:** masaüstü ve Android'de müzik çekime karışıyor ve **konuşurken kendiliğinden
  kısılıyor**; kısılma için ikinci analiz zinciri kurulmadı, gürültü kapısının zaten ölçtüğü
  RMS kullanılıyor. Hesap `cekirdek/muzik.js`de.
- **iOS'ta AÇILMIYOR ve sebebi yazıyor.** Risk ölçüldü: orada kayıt sırasında ses işleme
  MediaRecorder'ın ses yazmasını durduruyor, yani çekim **sessiz** çıkardı — bu üründeki en
  pahalı kayıp. Sessizce kapalı tutmak da yasak olduğu için durum ve sebep birlikte dönüyor.
- **Dosya cihazdan çıkmıyor ve saklanmıyor:** nesne adresi, iş bitince bırakılıyor; her
  oturumda yeniden seçiliyor ve arayüz bunu söylüyor.
- **Üç koruma:** zincir kapanırken müzik susuyor (hoparlör sızıntısı) · kayıt sürerken zincir
  değiştirilmiyor · Mac'te olmayan "ham ses" alanı okunmuyor (kapı yakaladı).
- **Kapı:** `tests/156` **113 iddia** + **12 kasıtlı bozma** (toplam 219).

### G.6 — Klip üreteci (Auto-Shorts karşılığı, AI'sız) · **P1** · ✅ **BİTTİ (v9.14)**
- **Ne:** çekimden sonra "paylaşılabilir 3 klip" önerisi — **bölüm işaretleri + `(2)` vurguları +
  zorlanma haritası + kelime zamanları** ile kesim noktaları; her klip için hazır başlık/etiket.
- **Neden:** BIGVU bunu sunucuda LLM ile yapıyor; bizde **senaryonun kendisi** bu bilgiyi taşıyor.
- **Yapıldı:** çekimden sonra sonuç ekranında 3 klip önerisi; hesap `cekirdek/klip.js`de.
  Sınırlar **cümle sonuna** oturuyor (oturmuyorsa klip hiç önerilmiyor), süre **15–60 sn**,
  öneriler çakışmıyor ve her biri **sebebini** yazıyor (bölüm başlangıcı · N vurgu işareti ·
  açılış · cümle sınırı).
- **Başlık uydurulmuyor:** bölüm adı ya da klibin kendi ilk kelimeleri **birebir**; test her
  kelimenin çekimde ve **aynı sırada** geçtiğini ölçüyor.
- **Zaman damgası yoksa öneri yok:** sufle akmamış demektir, zamanı uydurmak olmayan bir
  ölçümü varmış gibi göstermek olurdu.
- **Yeni kesme yolu açılmadı:** seçilen klip var olan budama kutusuna yükleniyor, kullanıcı
  sınırları değiştirebiliyor.
- **Kapı:** `tests/155` **117 iddia** + **12 kasıtlı bozma** (toplam 207). Bozma turu testimin
  iki veri kusurunu buldu (ölçmeyen damga verisi ve hiç koşmayan başlık iddiası).
- 🔴 **SONRADAN ÖLÇÜLDÜ (16 Ağustos) — özellik yarısı ölüymüş.** Klip önerisi üç klip
  gösteriyordu ama telefonda kesme `dbDel(curTakeId)` ile **kaynak çekimi siliyordu**:
  ilk klip kesildiği anda diğer iki öneri ulaşılamaz oluyordu ve kullanıcı sildiğini
  görmüyordu. Masaüstünde silme yoktu ama kaynak bellekte eziliyordu — sonuç aynı.
  **Onarıldı:** klip **yeni çekim** olarak arşivleniyor, kaynak duruyor, "↩ Tam çekim"
  düğmesiyle dönülüyor; kesim mesajı da kaynağın durduğunu söylüyor.
  `tests/160` **41 iddia** + **5 kasıtlı bozma**. Bu kusur, "özelliği yaptım" ile
  "özellik işe yarıyor" arasındaki farkın bu turdaki örneğidir.

### G.7 — Intro/outro + alt bant animasyonu · ✅ **ÖLÇÜLDÜ (16 Ağustos) → ERTELENDİ**

Alt bant tarafı zaten G.4 ile geldi. Kalan iş **video birleştirme** ve maliyeti
gerçek tarayıcıda ölçüldü (Chrome 151):

| yol | ölçüm | sonuç |
|---|---|---|
| **WebCodecs** (`VideoEncoder`/`VideoDecoder`/`AudioEncoder`) | üçü de **var** | ama **kapsayıcı yazıcı (muxer) YOK** — WebCodecs çıplak kodlanmış kare üretir; MP4 kutusunu yazmak için dış kitaplık (mp4box.js / mp4-muxer) gerekir → **sıfır bağımlılık kırılır** |
| WebCodecs H.264 kodlayıcı | `isConfigSupported` → **false** (VP9 → true) | yani bu yolla üretilen dosya **VP9/WebM** olurdu; deponun ölçülmüş kararı ise MP4 (galeri ve iOS webm kabul etmiyor) |
| **Tuvale yeniden çizip kaydetme** (`captureStream` + `MediaRecorder`, MP4 destekli) | ikisi de **var** | dış bağımlılık YOK — budamada zaten kullanılan ve sınanmış yol |

**Karar: yapılabilir ama ERTELENDİ, sebebi ölçülü.** Yeniden-kaydetme yolu üç
bedel taşıyor: ① **gerçek zamanlı** — 60 saniyelik videoya intro eklemek 60 saniye
sürer; ② **yeniden kodlama** — kalite kaybı, oysa bugün çekim ham hâliyle
paylaşılıyor; ③ ve asıl belirleyici: `canTrim()` **iOS Safaride false**
(`video.captureStream` yok), yani özellik **asıl üründe (iPhone) hiç çalışmaz**.
Müzik yatağında olduğu gibi masaüstüne özel bir özellik olurdu ve rekabet
ölçümünde de puan getirmez (15. kategori zaten 4).

Yani G.7 bir "yapılır mı" sorusu değil, **öncelik** sorusu: aynı emek 15. kategoriyi
5e çıkarmaz, 20. kategoriyi (platform kapsamı, ×4) mağaza kabuğu çıkarır.

<!-- ölçümden önceki plan notu -->
#### Önceki plan
- **Kabul:** kayıt boru hattını yavaşlatmayacak; yalnız çekim sonrası uygulanacak.

### G.8 — İçerik planlayıcı (cihazda) · ✅ **ÖLÇÜLDÜ (16 Ağustos) → YENİ DURUM ALANI ALINMADI**

Ölçüm koddan yapıldı, üç sorunun üçü de yanıtlandı:

| soru | ölçüm |
|---|---|
| Yeni alan eski kayıtları bozar mı? | Durum tek JSON olarak yazılıyor (`localStorage.setItem(LS,JSON.stringify(st))`); yeni alan eski kayıtlarda **undefined** olur, yani her okuma `(s.x\|\|…)` ile korunmalı — deponun 6 numaralı hata sınıfı |
| Depo tavanı sorun mu? | Hayır: senaryo başına birkaç bayt. Tavan (4,94 MB) **arka plan görseli** ve metin yüzünden doluyor, durum alanı yüzünden değil |
| Bilgi zaten var mı? | **BÜYÜK ÖLÇÜDE EVET.** `s.up` (son güncelleme) her senaryoda **zaten tutuluyor** ama listede **gösterilmiyor**. Çekim arşivi de her çekime senaryonun **başlığını** yazıyor (`title:active().title`), yani "bu senaryoyu kaç kez çektim" **arşivden türetilebilir** |

**Karar:** "çekilecek / çekildi / yayınlandı" diye **yeni bir durum alanı tutmak
ALINMADI.** Sebep ölçülü: tutulan durum **bakım ister** (kullanıcı elle
güncellemezse yalan söyler) ve **yeni veri = geriye dönük uyumluluk riski**.
Oysa aynı sorunun iki parçası zaten **ölçülmüş veriden türetilebiliyor**:
son güncelleme (`s.up`) ve çekim sayısı (arşivdeki başlık eşleşmesi). Bu depoda
kural nettir: **ölçülebilen şeyi tutma, türet.**

**Sıradaki tura bırakılan ucuz iş (kabul ölçütü yazılı):** senaryo listesinde
başlık altına *"· son değişiklik <tarih> · <n> çekim"* satırı. Kabul: ① `s.up`
yoksa satır **hiç** yazılmaz (eski kayıt bozulmaz), ② çekim sayısı arşivden
**bir kez** okunur (liste her çizimde IndexedDB'ye gitmez), ③ arşiv okunamazsa
sayı **hiç gösterilmez** (uydurulmuş sıfır yasak), ④ iki kabukta da aynı.
Yalnız "yayınlandı" bilgisi türetilemez — onu tutmak için kullanıcının elle
işaretlemesi gerekir ve o ancak ①–④ oturduktan sonra tartışılır.

<!-- ölçümden önceki plan notu -->
#### Önceki plan
- **Ne:** senaryolara "çekilecek/çekildi/yayınlandı" durumu + tarih; **hesapsız, cihazda**.
- **Kabul:** localStorage tavanı (4,94 MB) ölçülmüş sınırın içinde kalsın.

### G.9 — Göz teması düzeltme · ✅ **ÖLÇÜLDÜ (16 Ağustos) → ALINMADI**

**Ölçüm (gerçek tarayıcı, Chrome 151, güvenli bağlam, macOS):**

| ölçülen | sonuç |
|---|---|
| Shape Detection API | yalnız **BarcodeDetector** — `FaceDetector` **yok** |
| bakış/yüz ile ilgili medya kısıtı | **0** |
| iz yeteneklerinde bakış/yüz alanı | **0** |
| WebNN (`navigator.ml`) | **yok** |
| WebGPU · WASM SIMD | **var** · **var** |

**Okunuşu:** model KOŞAR (WebGPU + SIMD var) ama modeli **indirmek** gerekir —
platformun hazır yüz/bakış desteği yok. Yani G.15 ile birebir aynı denklem:
tek dosya ve sıfır bağımlılık sözü kırılır. Üstelik bu özellikte **yanlış
düzeltmenin bedeli** de var: bakışı kaydıran bir model, kişiyi tuhaf gösterir ve
kullanıcı bunu ancak yayından sonra fark eder.

**Alınmadı.** Bunun yerine zaten yapılan şey ölçülü: okuma çizgisini kameranın
altına alma, göz şeridi ve mesafe uyarısı — rekabet rubriğinde 6. kategori
(göz teması araçları) bu yüzden **5/5**. Yani sorunu AI olmadan çözüyoruz;
BIGVU'nun 19. kategoride aldığı 5 puan bizde 0 ve **bilerek** 0.
`tests/161` kararı kilitliyor (yüz ağı modeli belirirse kapı kırılır, kasıtlı
bozmayla kanıtlandı).

<!-- ölçümden önceki plan notu -->
#### Önceki plan
- **Ne:** ML gaze-correction. Model gerektiriyor → "sıfır bağımlılık" sözünü **kırar**.
- **Karar ölçütü:** model boyutu, cihazda kare hızı ve **yanlış düzeltmenin bedeli** ölçülmeden
  yazılmaz. `ffmpeg.wasm` ve OpenDyslexic'te verilen aynı karar süreci.

### G.10 + G.17 — Vitrin ve mağaza metni · **P1** · ✅ **BİTTİ (v9.14)**
- **Ne:** "sayısal WPM", "internetsiz çalışır", "altyazı ASR'siz ve %100 kelime doğru",
  "filigran yok, hepsi ücretsiz" — hepsi **ölçülmüş** ifadeler.
- **Yapıldı:** gecenin on maddesi vitrine (6 yeni kart, iki dilde), mağaza metnine ve JSON-LD
  `featureList`e girdi; rakiplerde ücretli olup bizde ücretsiz olanlar ayrı paragraf oldu.
- **Abartma engeli genişletildi:** `tests/132` ve `tests/133` her yeni sözü koddaki karşılığına
  bağlıyor; kod kaldırılırsa kapı önce kırılır.
- **Yeni kural: sınır saklamak da abartmadır.** Müzik yatağının iOS sınırı **iki dilde de**
  metinde yazılı olmak zorunda (bozma turu tek dilde silmenin geçtiğini gösterdi).

### 🔴 Erdal kararına bağlı olanlar (sunucu/hesap ister — kendiliğinden başlatılmaz)
- AI senaryo yazarı · AI avatar/ses · B-roll kütüphanesi · analitik
- **Tek tıkla sosyal yayınlama** (OAuth + sunucu)
- Bulut yedek / ekip / çoklu cihaz
- Bunların hepsi tek soruya bağlı: **sunucu işletecek miyiz?** (`FIYATLANDIRMA.md`)

---

## 6 · Teleprompter.com incelemesi (2026-08-15, ikinci tur)

Erdal *"bunları bir değerlendir ve gerekli olanları al; teleprompter.com'u incele ve
eklemeler yap"* dedi. BIGVU bir **video üretim** ürünü; teleprompter.com ise **asıl işi
sufle olan** rakip — yani bizim doğrudan sınıfımız. O yüzden karşılaştırma daha sıkı yapıldı.

### Onların modülleri

**Kaydırma:** VoiceGlide (sesle takip) · sabit hız · **sabit SÜRE** (metni verilen dakikaya
sığdırır) · sayısal WPM.
**Kayıt:** 4K · **arka plan değiştirme/bulanıklaştırma** · ön-arka kamera geçişi · "temiz ses"
(gürültü giderme) · dış mikrofon · platform oranlarına yeniden boyutlandırma.
**Metin:** TXT/Word/**PDF** · bulut senaryo deposu (Drive/Dropbox/iCloud) · **yatay ve dikey
aynalama** (cam rig) · **OpenDyslexic + Lexend** · **sağdan sola diller (Arapça/İbranice)** ·
geri sayım · ilerleme göstergesi · AI ile "zor cümleyi yeniden yaz".
**Kumanda:** iPhone/iPad/**Apple Watch**/tarayıcı · **bağlantıyı kendi seçiyor** (internet yoksa
Bluetooth, aynı Wi-Fi'daysa yerel ağ, uzaktaysa internet) · sunum kumandası, oyun kolu, MIDI,
pedal · **ikinci cihazda önizleme**.
**Yayın:** IG/TikTok/YouTube/LinkedIn canlı yayın entegrasyonu · altyazı üretimi.
**Fiyat:** Free (filigranlı) · Pro **$19,99/ay** ($7,50 yıllıkta) · Max **$49,99/ay**.
**Ücretsizde kilitli:** filigransız 4K, aynalama, altyazı, temiz ses.

### 🔴 Ölçüm bu turda beni İKİ KEZ yalanladı (kural 7'nin kitabî örneği)

İlk grep `ayna` · `disleksi` · `hedef süre` · `gürültü` için **0** döndürdü ve
"bunlar bizde yok" diye yazacaktım. Sözlükten arayınca hepsi çıktı:
`tgMirror:'Yazıyı aynala (cam rig / beam splitter)'` · `fDys:'Disleksi'` ·
`targetDur:'Hedef süre (pacing)'` · `fxGate:'Gürültü kapısı'` + uğultu kesme + 50 Hz çentiği.
**İngilizce anahtar aramak Türkçe adlandırılmış bir kod tabanında kanıt üretmez.**
Doğru yöntem: `cekirdek/sozluk.js`'te **kullanıcının gördüğü metni** aramak.

### Değerlendirme — özellik özellik

| Özellik | Onlarda | Sufle'de (ölçüldü) | Karar |
|---|---|---|---|
| Sesle takip | VoiceGlide (Pro) | ✅ var, **ücretsiz** | zaten var |
| Sayısal WPM | var | ✅ var | zaten var |
| **Sabit süreye sığdırma** | var | ⚠️ `targetDur` yalnız **geri/ileri rozeti** gösteriyor, hızı SÜRMÜYOR | **AL → G.11** |
| Aynalama (cam rig) | Pro'ya kilitli | ✅ var, ücretsiz | zaten var — **vitrine yaz** |
| Disleksi yazı tipi | OpenDyslexic + Lexend | ✅ `fDys` var (sistem fontu; dış font **bilerek gömülmedi**, 150 KB) | genişlet → G.13 |
| **Sağdan sola diller** | var | ❌ **yok** (ölçüldü: `dir`/RTL eşleşmesi yalnız "arabellek" gibi sahte eşleşmeler) | **AL → G.12** |
| Geri sayım · ilerleme | var | ✅ `tgCount` 3-2-1 + ilerleme | zaten var |
| Temiz ses / gürültü | Pro'ya kilitli | ✅ Ses Stüdyosu: uğultu kesme + 50 Hz çentik + gürültü kapısı + seviye | zaten var — **vitrine yaz** |
| Arka planı **bulanıklaştırma** (yeşil ekransız) | var | ❌ yalnız yeşil ekranla | **ÖNCE ÖLÇ → G.15** |
| Platform oranları | var | ✅ çekim modları (Reels/Story/IG/Shorts/YT) | zaten var |
| **PDF içe aktarma** | var | ❌ (kopyala-yapıştır yolu ve görünmez karakter temizliği var) | **ALMA → G.16, gerekçesi yazılı** |
| Bulut senaryo (Drive/Dropbox) | var | ❌ (cihaz dosyasına yedek + geri alma var) | Erdal kararı (sunucu/hesap) |
| Apple Watch kumandası | var | ❌ | **ALMA** — yerel uygulama ister, PWA'dan çıkar |
| Çok yollu kumanda (BT/LAN/internet) | var | ⚠️ BT HID ✅ · LAN QR ✅ (Mac) · internet ❌ | kısmi → G.14 |
| İkinci cihazda önizleme | Pro | ✅ Mac'te var | zaten var |
| Canlı yayın entegrasyonu | var | ⚠️ OBS tarayıcı kaynağı `?obs=1` var; doğrudan RTMP yok | Erdal kararı (sunucu) |
| AI yeniden yazma / başlık | var | ❌ | Erdal kararı (sunucu) |
| Filigran | ücretsizde **var** | **hiç yok** | üstünlük — koru |

### BIGVU listesinin değerlendirmesi — neyi ALMIYORUZ ve neden

| Almıyoruz | Sebep (ölçülmüş ya da ilkesel) |
|---|---|
| AI avatar / "Twin" | Ürünün sözü **senin yüzün, senin sesin**. Avatar bunun tam tersi; ayrıca sunucu ister |
| Ses klonlama | aynı sebep + kötüye kullanım yüzeyi |
| B-roll stok kütüphanesi | lisans + sunucu + depolama; "tek dosya, sıfır bağımlılık" ile bağdaşmaz |
| Fototale / video e-posta / VoiceMate | Sufle bir **sufle+çekim** ürünü; bunlar başka ürünler |
| Analitik panosu | hesap ve veri toplama ister — **gizlilik vaadini kırar** |
| Rastgele döndürme altyazı animasyonu | okunabilirliği düşürür; bizim ölçütümüz kontrast ve okunurluk (kapıya bağlı) |
| PDF içe aktarma | `pdf.js` ~1 MB. `.docx`'i kendi yazdık çünkü zip+XML; PDF metin çıkarımı font/kodlama tabloları ister. Yapıştırma yolu **zaten çalışıyor** ve görünmez karakter temizliği bağlı |
| Apple Watch kumandası | yerel uygulama ister; kabuk kurulsa bile ayrı bir Watch hedefi demek |

---

## 7 · TODO — teleprompter.com turundan eklenenler

### G.11 — Süreye sığdır (sabit süreli kaydırma) · **P1** · ✅ **BİTTİ (v9.14)**
- **Ne yapıldı:** hedef süre verilip **Süreye sığdır**a basılınca gereken WPM hesaplanıp
  uygulanıyor. **Duraklama işaretleri hedeften düşülüyor** (60 sn hedefte 12 sn duraklama →
  metin 48 saniyede okunmalı).
- **İkinci eksik ölçülerek bulundu:** masaüstünde hedef süre **hiç yoktu** ve tahmini süre
  **duraklamaları saymıyordu** (`kelime/hız`). Telefonda düzeltilmiş, Mac'e taşınmamış —
  kullanıcı "sınıra uygun" görüp çekimde sınırı aşıyordu. İkisi de kapandı.
- **Sığmıyorsa sessizce kırpmıyor:** üç ayrı sebep (yalnız duraklamalar hedefi dolduruyor ·
  gereken hız üst sınırın üstünde · metin çok kısa), her biri kendi mesajıyla, iki dilde.
- **GERÇEK TARAYICIDA ÖLÇÜLDÜ ve bir tutarsızlık çıktı:** hesap 79 WPM derken kaydırıcı
  5lik adımlarla 80e oturuyordu — mesajda yazan ile uygulanan ayrışıyordu. Çekirdek artık
  adıma **yukarı** yuvarlıyor (aşağı yuvarlamak metni uzatır, hedefi aşar). Sonrası:
  30 sn hedef → **80 WPM**, mesaj ve kaydırıcı aynı sayıyı söylüyor.
- **Hesap `cekirdek/tempo.js`de**: iki kabuk aynı sayıyı göstermek zorunda.
- **Kapı:** `tests/153` **87 iddia** + **11 kasıtlı bozma** (toplam 181). İki eski testin
  iddiası yer değiştirdi ve **gevşemedi** (`tests/16` sıfıra bölme koruması çekirdeğe,
  `tests/60` formül yerine iddiaya).

### G.12 — Sağdan sola diller (Arapça · İbranice · Farsça) · **P2** · ✅ **BİTTİ (v9.14)**
- **Ne:** senaryo yönü otomatik (`dir=auto`), hizalama, satır kırma, **altyazı ve `.srt` yönü**,
  işaretleme dilinin RTL'de bozulmaması.
- **Yapıldı:** yön **satır satır** belirleniyor (Unicode bidi P2/P3 sadeleştirmesi); güçlü
  karakter yoksa dayatılmıyor. Hesap `cekirdek/yon.js`de.
- **GERÇEK TARAYICIDA ÖLÇÜLDÜ** (üç dil × üç genişlik): **4/4 satır rtl · taşma 0 · kelime
  bölünmesi 0**, karışık satırda okuma yönü sağdan sola; Türkçe ltr kalıyor.
- **İki sessiz kusur kapandı:** karaoke vurgusu RTL'de **yanlış uçta** yanıyordu; Arapça soru
  işareti ve noktası cümle sonu sayılmadığı için Arapça senaryoda **klip önerisi hiç
  üretilmiyordu**.
- **Not:** arayüz çevirisi ayrı iş — bu madde yalnız **senaryo metni** için.
- **Kapı:** `tests/157` **77 iddia** + **11 kasıtlı bozma** (toplam 230).

### G.13 — Erişilebilir yazı tipi seçimi · **P2** · ✅ **BİTTİ (v9.14) — plan iki kez düzeltildi**
- **Planın öncülü yanlıştı:** "tek Disleksi anahtarı" deniyordu; ölçünce **iki kabukta da beş
  aile** çıktı (sistem · serif · yumuşak · mono · disleksi).
- **GERÇEK TARAYICIDA ÖLÇÜLDÜ:** 5 aile × 3 punto (46/72/110) → **bölünen kelime 0 · taşan 0**,
  en küçük çizilen punto 31 px (taban 22). Sebebi mimari: sığdırma **canlı ölçüm** yapıyor,
  font tablosuna bakmıyor.
- **Gerçek boşluk kapatıldı:** Mac'te **kalınlık ve harf aralığı yoktu**; eklendi ve aralık
  değişince **yeniden ölçülüyor** (yoksa son satırlar görünmeden akış biterdi). Telefonda
  **Mono düğmesi çevrilmemişti**, sözlüğe bağlandı.
- **Dış font kararı korundu** ve teste bağlandı (`@font-face`, Google Fonts, `.woff` yok).
- **Kapı:** `tests/158` **75 iddia** + **8 kasıtlı bozma** (toplam 238).

### G.14 — Kumanda bağlantı zinciri · **P2** · ✅ **BİTTİ (v9.14)**
- **Ne:** teleprompter.com bağlantıyı kendi seçiyor (BT → LAN → internet). Bizde BT HID ve
  LAN QR var; **internet yolu sunucu ister → Erdal kararı**. Bu maddede yapılacak olan:
  hangi yolun **neden** kullanılamadığını panelin açıkça söylemesi (bugün yalnız LAN durumu yazıyor).
- **Yapıldı:** panel üç yolu da **durumu ve sebebiyle** listeliyor. "Kapalı" ile "yok" bilerek
  ayrı (biri açılabilir, diğeri açılamaz). Hesap `cekirdek/kumanda.js`de.
- **Ölü adres kusuru tekrarlamıyor:** Mac'te sunucunun ayakta olduğu varsayılmıyor, bağlantı
  göstergesinden okunuyor ve gösterge değişince liste tazeleniyor.
- **Kapı:** `tests/159` **67 iddia** + **8 kasıtlı bozma** (toplam 246).

### G.15 — Arka planı bulanıklaştırma (yeşil ekransız) · ✅ **ÖLÇÜLDÜ (16 Ağustos)**

**Ölçüm (gerçek tarayıcı, Chrome 151, güvenli bağlam, macOS):**

| ölçülen | sonuç |
|---|---|
| `getSupportedConstraints()` toplam kısıt | **36** |
| bulanıklık/arka planla ilgili kısıt | **0** (`backgroundBlur` **yok**) |
| kamera izinin yetenek listesi | aspectRatio · deviceId · exposureMode · exposureTime · facingMode · focusDistance · focusMode · frameRate · groupId · height · resizeMode · width — **bulanıklık yok** |
| CSS `filter: blur()` | var (ama **tüm kareye** uygulanır, kişiyi ayıramaz) |

**Çıkan karar:** platformun kendi bulanıklaştırması W3C taslağında (`backgroundBlur`)
var ama bu makinede **yok**; Chrome bu yeteneği yalnız işletim sistemi verirse
gösteriyor (Windows Studio Effects). Yani yeşil ekransız bulanıklık için
**segmentasyon modeli** gerekir ve o da **sıfır bağımlılık sözünü kırar** —
`ffmpeg.wasm`, `mammoth.js` ve OpenDyslexic ile **aynı karar**: alınmadı.
`tests/161` bu kararı kilitliyor (kodda model yükleyici belirirse kapı kırılır) ve
bir kasıtlı bozmayla kanıtlandı.

**AÇIK KALAN TEK YOL (Erdal kararı):** yetenek VARSA kullan — kısıt desteklenen bir
cihazda (bugün: Windows Studio Effects) anahtarı göster, desteklemeyende sebebini yaz.
Maliyeti düşük ama **doğrulanamıyor**: elimizdeki hiçbir platform bu yeteneği
vermiyor, yani yazılsa "açık ama hiçbir şey olmuyor" sınıfına girme riski var ve
kanıtsız yayınlamak bu depoda yasak. Ölçüm cihazı çıkınca 30 dakikalık iş.

<!-- eski plan notu -->
#### Önceki plan (ölçümden önce yazılmıştı)
- **Sıra:** ① platformun kendi API'si var mı ölç (`getUserMedia` kısıtları / işletim sistemi
  video efektleri) ② yoksa segmentasyon modeli gerekir ve bu **"sıfır bağımlılık" sözünü kırar**
  → `ffmpeg.wasm`, `mammoth.js`, OpenDyslexic ile aynı karar süreci, ölçmeden yazılmaz.
- **Kabul (ölçüm turu):** kare hızı düşüşü ve model boyutu sayıya dökülmeden kod yazılmaz.

### G.16 — PDF içe aktarma · **ALMA (karar yazılı)**
Gerekçe yukarıdaki tabloda. Bunun yerine **yapıştırma yolunu görünür kıl**: içe aktarma
ekranında "PDF için: aç, kopyala, Yapıştır — görünmez karakterler temizlenir" satırı zaten var,
**keşfedilebilirliği** ölçülecek (jargon = görünmezlik kuralı).

### G.17 — Vitrinde ücretsiz olan üstünlükleri say · **P1 (G.10'a eklendi)**
Rakiplerde **paraya kilitli** ama bizde ücretsiz olanlar, tek tek ölçülerek:
aynalama (cam rig) · temiz ses/gürültü kapısı · altyazı · filigransız 4K · sesle takip ·
ikinci cihazda önizleme · sayısal WPM. **Her cümle koddaki karşılığına bağlanacak** (tests/132, 135).

---

## 🔍 Denetim turu (2026-08-16 gecesi) — gecenin işi kendi kapısıyla ölçüldü

FAZ G'nin on bir maddesi kapandıktan sonra gece kendi işini denetledi. **Üç bulgu çıktı ve
üçü de kapının kendi kör noktalarıydı:**

| # | Bulgu | Sonuç |
|---|---|---|
| ① | Gecenin yüzeylerinin çoğu **hiç ölçülmüyordu** — kompozit kutusu kapalıyken kontrast/çeviri/ad taraması oraya bakmıyor | Kapıya `telefon-kompozit` durumu eklendi: **214 öge · ihlal 0 · çevrilmemiş 0 · adsız 0** |
| ② | **Ses Stüdyosu kapalıyken müzik yatağı sessizce ölüydü** (zincir hiç kurulmuyor, sebep yazmıyor) | Dördüncü sebep (`fxKapali`) eklendi, iki kabukta da yazılı; test **her** çağrıyı ölçüyor |
| ③ | 🔴 **Kapsam kapısı fiilen kapalıymış**: depodaki taban `{"index.html":999}` — `tests/113`ün fikstür değeri depoya sızmış, Mac tabanı hiç yok | `kapsam.py` inanılmaz tabanı reddediyor ve *"kapı o ana kadar korumasızdı"* diye raporluyor; gerçek taban yazıldı (43 · 28) |

**Bulgu çıkmayan mercekler de sonuçtur:** yedi yeni ayarın hepsi yeniden açılışta kalıcı
(ölçüldü) · parite tam (her özellik iki kabukta, testler ikisini birden ölçüyor) · kare
başına maliyet önbelleğe alınmış (300 karede 127 measureText).

## 8 · Sıradaki tur

`G.1 → G.2 → G.3` tek bir yayına (v9.14) sığar ve BIGVU'nun vitrin özelliğini
**onlardan daha doğru** biçimde karşılar. G.4–G.6 ikinci yayın.
Her madde bittiğinde bu dosyada ✅ + ölçülen kanıt, sonra `./kapi.sh` yeşil, sonra commit.
