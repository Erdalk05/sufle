# Sufle — 19 Ağustos otonom turu (Erdal yok, 3 saat)

**Başlangıç durumu:** canlı = **9.32 / `sufle-v104`**. Depoda **1 yayınlanmamış commit**:
`21ee8ca` v9.33 (güzellik + hızlı erişim), kapı 10/10 yeşil, 663 bozma kanıtlı.
⛔ **`git push` yok, yayın yok** — Erdal onayı bekliyor (CLAUDE.md durma noktası).
Bu turda yapılan her şey depoya commit edilir, yayın kararı Erdal'a bırakılır.

Kaynak: `EKSIKLER_20260816.md` (16 Ağustos envanteri, o günden beri güncellenmedi).
Aşağıdaki sıra **sunucusuz + hesapsız + cihazsız** yapılabilenlerden seçildi;
A (karar bekleyen), B (gerçek cihaz) ve mağaza hesapları kapsam dışı.

## ⚠️ Ölçüm düzeltmesi (turun ilk işi)

`EKSIKLER_20260816.md` **üç gün bayat**: 16 Ağustos'tan sonra v9.17→v9.33 arası
sekiz yayın daha yapıldı. Plan yazılmadan önce her madde bugünkü koda karşı ölçüldü
ve **dört madde zaten kapanmış** çıktı — eski dokümanın grep sayımıyla yazılmış
"D" tablosu yanıltıcıydı (deponun bilinen hata sınıfı: *grep sayımı kanıt değil*).

| Eski iddia | Bugün ölçülen | Sonuç |
|---|---|---|
| Mac'te "kaldığın yer" yok | `selectScript` `s.pos`u okuyup `setPos` ediyor, `resumed` bildirimi çıkıyor | ✅ **VAR** |
| Mac'te çekim arşivi yok | `indexedDB.open('teleprompter_pro')` + `Çekimlerim` düğmesi + arşive yazma | ✅ **VAR** |
| PDF içe aktarma yok | `txtFile` `accept` listesinde `.pdf`, `index.html:11470` ayrıştırıcı, üç ayrı sebep mesajı | ✅ **VAR** |
| Elle pozlama / beyaz ayarı yok | telefonda `whiteBalance` 3 · `exposureCompensation` 4 · `applyConstraints` 8 iz | ✅ **telefonda VAR**, Mac'te **yok** |

Kalan gerçek eksikler ölçülerek yeniden sıralandı.

## Sıra

| # | İş | Kaynak | Neden bu sıra |
|---|---|---|---|
| 1 | **Senaryo klasörü + etiket** | C ek | İki kabukta da **yok** (`s.etiket`/`s.klasor` sıfır iz). Kategori 7'yi 4'te tutan tek eksik. |
| 2 | **Masaüstü: elle pozlama / beyaz ayarı / odak / fener** | C7 + D | Telefonda var, Mac'te `applyConstraints` **hiç yok**. Parite açığı, küçük iş. |
| 3 | **Arayüz dili sayısı** | C6 | `cekirdek/sozluk.js` yalnız `tr` + `en`. RTL motoru hazır; eksik olan arayüz sözlüğü. |
| 4 | **Masaüstü: kompozit boru hattı** | D | `compOut`/`drawComp` Mac'te **0 iz** — gerçek ve en büyük parite açığı, en uzun iş. |
| 5 | **Depo borcu**: F7 mağaza sürüm notu · F4 `tests/29` sabit port · F2/F3 biçim kilitleyen testler | F | Ürüne değmiyor, ölçümü zayıflatıyor. |

## Kurallar (bu turda da geçerli)

- Her madde: kanıtla → en küçük çözüm → test + **kasıtlı bozma** → `./kapi.sh` → aynaları eşitle → commit.
- `cekirdek/` altındaki modülleri düzenle, `index.html`'in gömülü bloklarını **değil** (`python3 derle.py`).
- Yeni bir sürüm numarası **yalnız yayın kararı verilince** artar; bu turun işleri v9.34 altında toplanır,
  `VER`/`CACHE` bir kez artırılır ve yayınlanmadan bekler.
