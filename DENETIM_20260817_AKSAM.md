# Sufle denetimi — 2026-08-17 akşam

Yöntem: depo + kapı (`./kapi.sh`, 10 adım) + **uygulamayı gerçek başsız Chrome'da
390×844 ve 360×844'te AÇIP çizilmiş ekrana bakmak** (TR ve EN) + kapının ölçmediği
sınıflar için yeni dedektörler. Ölçüm dosyaları: scratchpad `dedektor.py`, `tur2.py`.

Uygulama açılıyor, JS hatası yok, EN kipinde sızan Türkçe metin **0**, çekim akışı
uçtan uca çalışıyor (kapı 10/10 yeşil). Aşağıdakiler bunun üstünde kalan kusurlar.

---

## 🔴 P0 — Ses testi cihazın verdiği cevabı ÇÖPE ATIYOR

`runAudioTest()` (Ayarlar → *Ses onarımı ve testi* → "Ses testi (cihaza yaptır)")
altı MIME adayını tek tek kaydedip hangisinin gerçekten **ses yazdığını** ölçüyor,
kazananı buluyor, ekrana "✓ kazanan: …" yazıyor, toast atıyor ve kaydediyor:

```js
// index.html:5329
st.forceNoOpts = (winner === '(seçeneksiz)');
st.forceMime   = st.forceNoOpts ? '' : winner;   // ← YAZILIYOR
```

**`st.forceMime` dosyanın hiçbir yerinde OKUNMUYOR.** Kayıt başlarken:

```js
// index.html:5634
const mime = pickMime();          // sabit tercih listesi — forceMime'a bakmıyor
```

Yalnız `forceNoOpts` (yani "hiç seçenek verme" özel durumu) dikkate alınıyor.

Sonuç: MP4'te sessiz, webm'de sesli kaydeden bir cihazda test **doğru cevabı
buluyor, kullanıcıya "çözüldü" diyor ve uygulama sessiz MP4 kaydetmeye devam
ediyor.** Bu özelliğin var oluş sebebi tam olarak bu senaryoydu.

Ölçüm: `st.` alanlarının tamamı tarandı — telefonda **yazılıp hiç okunmayan tek
alan `forceMime`**, masaüstünde hiç yok. Yani bu bir sınıf değil, tekil bir kaçak.

Destekleyici kanıt: `runAudioTest`, `recordWith`, `probeAudio` üçü de
**hiçbir test dosyasında anılmıyor** — özelliğin sıfır testi var, o yüzden
kaçak yıllardır sessiz.

**Yapılacak:** `pickMime()` ilk sırada `st.forceMime`'ı denesin
(`isTypeSupported` hâlâ doğruluyorsa), testi kapsayan bir test yazılsın.

---

## 🟠 P1 — "Görüntü filtresi" kompozit kapalıyken TÜMÜYLE ölü, ama açık görünüyor

`vidParams()`in tek çağrıldığı yer `drawComp()` içindeki WebGL gölgelendirici
(index.html:4762). Kompozit kapalıyken filtre **ne önizlemeye ne kayda** işliyor.

Varsayılan `comp:false` ve varsayılan `vidFx:'natural'` — yani **her yeni
kullanıcıda** kart "Doğal" yazıyor ve hiçbir şey yapmıyor. Dahası çekim kipleri
bu ayarı kendileri kuruyor: `reels → vidFx:'bright'`, `youtube → 'natural'`.

Bu, deponun 6 numaralı kuralının ("ön koşulu olan ayar = sessiz ölü özellik")
kapsanmamış bir vakası. `burnCaps` ve `chroma` `ensureComp()` ile koşulu kendisi
sağlıyor; `gateSettings()` de gerekeni soluklaştırıp sebebini yazıyor — **ama
yalnız `.sw` anahtarlarını ve üç bağımlı bloğu** (`#chromaDeps`, `#burnDeps`,
`#wakeDeps`). `#vfxSeg` bir **segment**, `vidAmt` bir **sürgü**; ikisi de kapının
dışında kaldı.

> Kapının kör noktası: K2 taraması ön koşullu ayarları sistematik aradı ama
> ölçütü "anahtar" (`data-t=…`) idi. Anahtar olmayan denetimler taranmadı.

**Yapılacak:** ya `vidFx`/`vidAmt` için `ensureComp()` benzeri bir yol, ya da
`gateSettings()`e segment/sürgü desteği + "kompozit açık olmalı" etiketi.
Ve K2 taraması anahtar dışı denetimleri de kapsasın.

---

## 🟠 P1 — İlk açılışta karşılama ekranının başlığı "🆕 Ne değişti?"

Uygulamayı ilk kez açan kullanıcı, gövdesinde "Üç adımda başla" yazan bir sayfa
görüyor — ama başlığında **NEW rozeti ve "Ne değişti?"**. Hiç kullanmadığı bir
uygulamada neyin değiştiği sorusu anlamsız.

Kod bu riski zaten biliyor:

```js
/* Sürüm notu ELLE açıldığında karşılama eylemleri GİZLENİR: "Metnimi yapıştır"
   orada anlamsız ve yanlış yönlendirir. Aynı sayfayı iki amaç için kullanmanın
   bedeli bu — gizlemeyi unutmak sessiz kusur olurdu. */
```

Yani **düğmeler** iki kip için ayrılmış, **başlık ayrılmamış** — deponun 1 numaralı
sınıfı: yarım kalmış düzeltme. `newsKip==='onb'` iken başlık da değişmeli
(ör. "👋 Sufleye hoş geldin" — anahtar `mDlgWelcome` sözlükte **zaten var**).

Ekran görüntüsüyle doğrulandı (390×844, ilk açılış).

---

## 🟡 P2 — İki kart özeti üç noktayla kesiliyor: değer hiç okunmuyor

Ayar kartı kapalıyken o anki değeri yazıyor. İki kartta bu değer CSS ile kırpılıyor:

| kart | özet | yer | gereken | sonuç |
|---|---|---|---|---|
| Göz teması ve çizgi | `Okuma çizgisi 18` | 96 px (390'da) · **66 px (360'ta)** | 107 px | `Okuma çizgi…` |
| Altyazı zamanlaması | `Altyazı kayması` | 86 px | 98 px | `Altyazı kay…` |

Kök neden: bütçe **karakterle** ölçülüyor (`parca[0].slice(0,16)`), yer ise
**pikselle** belirleniyor ve başlık ne kadar uzunsa özete o kadar az yer kalıyor.
16 karakterlik sınır orta uzunlukta bir başlığa göre ayarlanmış; başlığı 19
karakter olan iki kartta yetmiyor. 360 px'te değer tümüyle kayboluyor.

Kapının kör noktası: ölçülen kural "**hiçbir kart başlığı iki satıra düşmüyor**".
Başlık gerçekten düşmüyor — bedeli **özet ödüyor** ve bunu kimse ölçmüyordu.

**Yapılacak:** bütçe karakterle değil `scrollWidth > clientWidth` ile ölçülsün
(kırpılıyorsa kısalt), ve bu ölçüm `tests/171`e bir iddia olarak eklensin.

---

## ⚫ Depo durumu — kapı KIRMIZI ve depoda commit'siz yarım iş var

`./kapi.sh` → **⛔ KIRMIZI**. 6968 testin 6967'si geçiyor; kırmızıyı yapan 5 kalem:

1. `tests/116-sabah-raporu.js` ✗ — rapordaki dosya aralığı **176** diyor, depoda
   **177** var (`tests/177-perde-rengi-olcumu.js` yeni ve **untracked**).
2. Kasıtlı bozma turunda 1 bozma inmiyor — "rapor yayın durumunu gizliyor"
   bozmasının hedef metni `SABAH_RAPORU.md`'de artık yok.
3. Kapsam tabanı **düştü**: telefon 43 → 46, masaüstü 26 → 32 (yeni ışık
   denetçisi + perde rengi fonksiyonları hiçbir testte adıyla anılmıyor).
4. Üç ayna bayat (telefon master · Mac masaüstü · Windows kopyası).
5. VER artmamış (9.21 = son yayın) — **bu doğru**, yayın sonrası beklenen kırmızı.

Yani `cekirdek/kroma.js` + `tests/177` ile gelen "perde rengini kameradan ölç"
işi **yazılmış ama bitirilmemiş**: rapor güncellenmemiş, taban ayarlanmamış,
aynalar eşitlenmemiş, hiçbir şey commit edilmemiş. Depo düzeyinde aynı
"yarım kalmış düzeltme" sınıfı.

⚠️ Bu turda depoda **başka bir Claude oturumu** çalışmış olabilir (dosya
zaman damgaları 20:27–20:34, ölçüm 20:49'da). Commit etmeden önce
`git status` + yalnız kendi dosyalarını `git add`.

---

## Çürüyen hipotezler (bir daha kovalanmasın)

- **"Aynı etiket iki yerde" karışıklığı yok.** 301 görünür etiket tarandı;
  ×2 çıkanların hepsi kartın **başlığı + özeti** ya da farklı bağlamlardaki
  seçenek adları (`Sıcak` hem filtre hem tema). Dedektör gürültülüydü.
- **`redoBtn`'in "Sil" yazması hata değil** — id eski adından kalma, etiket doğru.
- **EN kipinde çeviri kaçağı yok** (0 ölçüldü, 390 px, tüm ayar sekmeleri).
- **"Çerçeve kılavuzu" (`aspSeg`) yanıltmıyor** — adı zaten kılavuz olduğunu
  söylüyor, gerçek kırpma vaadi yalnız kompozit metninde geçiyor.
- **"Işık denetçisi" kartının boş özeti kusur değil** — kartta ayar yok, iki
  eylem düğmesi var; özetlenecek durum yok.
