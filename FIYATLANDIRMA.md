# F.5 — Fiyatlandırma: ölçüm ve öneri

**Ölçüm tarihi:** 15 Ağustos 2026 · **Güncellendi:** 16 Ağustos 2026 (FAZ G sonrası) · **Ölçülen sürüm:** 9.14
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
| **Karaoke altyazı + 6 altyazı teması** | ✅ ücretsiz (FAZ G, 16 Ağustos) |
| **Marka kiti — logo ve alt bant** | ✅ ücretsiz (BIGVU bunu abonelikte satıyor) |
| **Klip önerileri (Auto-Shorts karşılığı)** | ✅ ücretsiz, yapay zekâ yok, ölçümden çıkıyor |
| **Süreye sığdır (hedef süreye göre WPM)** | ✅ ücretsiz |
| **Müzik yatağı + konuşurken kısılma** | ✅ ücretsiz (masaüstü; iOS'ta kayıt sesini kestiği için kapalı, sebebi yazılı) |
| **Sağdan sola diller (Arapça · İbranice · Farsça)** | ✅ ücretsiz |
| **Beş yazı tipi ailesi + kalınlık ve harf aralığı** | ✅ ücretsiz |

Liste 15 Ağustos'tan bu yana **yedi satır büyüdü** ve büyümenin tamamı,
rakiplerin ücretli katmanında duran şeylerden geliyor: BIGVU'da marka kiti ve
otomatik klipler abonelikte, altyazı stilleri abonelikte.
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
Marka kiti bunun tam tersini yapıyor: filigranı **kullanıcının kendi logosu** olarak
ve **kullanıcı isterse** koyuyor. Ücretsiz katmana filigran basan rakiplerin
karşısındaki en açık fark bu.

**4) Karar aslında tek soruya indi:** *sunucu işletmek istiyor muyuz?*
· **Hayır** → ürün ücretsiz kalır, gelir yok, işletme maliyeti de yok. Ürün
  bugünkü hâliyle eksiksiz; F.5 kapanır.
· **Evet** → bulut + AI ücretli katman olur, o zaman **hesap, sunucu, ödeme
  sağlayıcısı ve KVKK metni** gerekir; "ücretsiz" diyen on yer birlikte
  güncellenir (kapı zaten zorlar).

**Bu belge bir sonraki adımı beklemede tutuyor: mimari karar verilmeden fiyat
yazmak, ölçülmemiş bir söz vermek olur.**

---

## 16 Ağustos eki — rekabet ölçümü aynı kapıya çıktı

`belgeler/REKABET_30_OLCULDU.md` bağımsız yoldan aynı sonuca vardı:

| ölçüm | değer |
|---|---|
| Bugünkü ağırlıklı skor | **64,3 / 100** (4. sıra; BIGVU 65,3) |
| **Sunucu işletmeden ulaşılabilecek tavan** | **81,9** |
| Sunucusuz kazanılabilecek kalan pay | **17,7 puan** |
| Sunucu/hesap/pazar gerektiren kategorilerin ağırlığı | 17/94 — yani skorun **%18'i** |

Yani ücretsiz-ve-sunucusuz kalmanın bedeli ölçülü: **tavan 81,9**, bugünkü liderin
(80,6) hemen üstü. Ürünü lider yapmak için sunucu ŞART DEĞİL; sunucu yalnız son
%18'lik dilim için gerekiyor ve o dilimin tamamı zaten para gerektiren şeyler
(bulut, AI, mağaza konumu). Fiyat kararı bu yüzden hâlâ tek soruya iniyor ve
cevabı "hayır" olduğunda ürün **eksik kalmıyor**, tavanı 81,9 oluyor.
