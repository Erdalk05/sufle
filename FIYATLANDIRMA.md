# F.5 — Fiyatlandırma: ölçüm ve öneri

**Ölçüm tarihi:** 15 Ağustos 2026 · **Ölçülen sürüm:** 9.10
**Durum:** karar Erdal'ın. Bu belge **karar vermiyor**, kararın zeminini ölçüyor.

Yol haritasındaki öneri şuydu:
> bedava = 1080p + filigran · ücretli = 4K + filigransız + altyazı + bulut

**Bu öneri ölçülmeden yazılmıştı. Ölçünce üç sorunu çıktı.**

---

## Ölçüm 1 — Öneri, ZATEN ÜCRETSİZ olan üç şeyi geri alıyor

Bugün yayında ve ücretsiz olanlar (`index.html`, v9.10'da sayıldı):

| özellik | durum |
|---|---|
| **4K kayıt** | ✅ ücretsiz (`data-q="4k"`) |
| **Altyazı (.srt) üretimi** | ✅ ücretsiz |
| Filigran | **hiç yok** — yani "filigransız" zaten varsayılan |
| Yayın paketi (zip) | ✅ ücretsiz |
| Video budama | ✅ ücretsiz |
| Dosyaya yedekleme | ✅ ücretsiz |
| Sesle takip | ✅ ücretsiz |
| Uzaktan kumanda | ✅ ücretsiz |
| `.docx` içe aktarma | ✅ ücretsiz |
| Prova raporu · zorlanma haritası | ✅ ücretsiz |

Öneri uygulanırsa **4K, altyazı ve filigransızlık kullanıcıdan GERİ ALINIR.**
Verilmiş bir şeyi geri almak, hiç vermemekten çok daha ağır bir güven kaybıdır;
mağaza yorumlarında en hızlı 1 yıldız üreten hamle budur. Bu depo "tutulmayan söz
verme" ilkesiyle çalışıyor — tersi de geçerli: **verdiğini geri alma.**

## Ölçüm 2 — İstemci tarafı ödeme duvarı UYGULANAMAZ

| ölçülen | değer |
|---|---|
| Hesap / giriş | **yok** (0) |
| Bize ait sunucuya çağrı | **yok** (0) |
| Uygulama dosyası | **herkese açık** (`https://erdalk05.github.io/sufle/index.html` → 200) |

Uygulama tek bir HTML dosyası ve kaynağı herkese açık. "Ücretli" bir bayrağı
istemcide tutmak, kaynağı açıp bayrağı çevirmekle aşılır. Yani **cihazda çalışan
bir özelliği paraya bağlamak dürüst kullanıcıyı rahatsız eder, ödemeyeni
durdurmaz.**

**Bundan çıkan mimari gerçek:** yalnız **bizim sunucumuzu gerektiren** şeyler
gerçekten ücretlendirilebilir — çünkü kontrol sunucuda. Yani fiyat modelini
pazarlama değil **mimari** belirliyor.

## Ölçüm 3 — Ücretsizlik bugün bir PAZARLAMA VARLIĞI

Rakip analizinde ölçülen: sesle takip PromptSmart'ta patentli ve **ücretli**,
BIGVU **abonelikli**. Bizde ücretsiz. Vitrin sayfası, mağaza metni, `<title>`,
açıklama ve JSON-LD fiyatı — **on yerde** "ücretsiz" yazıyor ve `tests/133` ile
`tests/135` bunu kilitliyor: koda ödeme duvarı girdiği an on yer birden yalan
söyler ve kapı önce kırılır.

---

## Öneri (CTO)

**1) Bugün yayında olan HER ŞEY kalıcı olarak ücretsiz kalsın.**
Bu bir fedakârlık değil, ölçülen bir üstünlük: rakiplerin para aldığı özellik
bizde bedava ve bunu söylemek en güçlü satış cümlemiz.

**2) Ücret yalnız SUNUCU GEREKTİREN yeni değer için.**
Uygulanabilir olan tek yer burası ve gerçek bir maliyeti karşılıyor:

| aday | neden ücretlendirilebilir | durum |
|---|---|---|
| Bulut yedek / cihazlar arası eşitleme | depolama + trafik maliyeti, kontrol sunucuda | Erdal kararı (sunucu) |
| AI senaryo yazarı / yeniden yazım (E.1, E.2) | token maliyeti, kontrol sunucuda | Erdal kararı (anahtar) |

**3) Filigran EKLENMESİN.** Bugün yok; eklemek var olan çıktıyı kötüleştirmek olur.

**4) Karar aslında tek soruya indi:** *sunucu işletmek istiyor muyuz?*
· **Hayır** → ürün ücretsiz kalır, gelir yok, işletme maliyeti de yok. Ürün
  bugünkü hâliyle eksiksiz; F.5 kapanır.
· **Evet** → bulut + AI ücretli katman olur, o zaman **hesap, sunucu, ödeme
  sağlayıcısı ve KVKK metni** gerekir; "ücretsiz" diyen on yer birlikte
  güncellenir (kapı zaten zorlar).

**Bu belge bir sonraki adımı beklemede tutuyor: mimari karar verilmeden fiyat
yazmak, ölçülmemiş bir söz vermek olur.**
