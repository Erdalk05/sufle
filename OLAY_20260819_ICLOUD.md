# 🔴 19 Ağustos 2026 — kapı BOŞ dosyaları ölçtü ve yeşil dedi

**Bir cümlede:** `~/Desktop/.sufle-deploy` iCloud'a senkronlanan bir dizinde
duruyordu; disk **%98 dolu** olduğu için macOS 60 dosyanın yerel içeriğini attı
(`dataless`) ve **o dosyalar 0 bayt okunmaya başladı — hata vermeden**. Biri bir
TESTTİ; boş test hiçbir iddia koşmaz ve **çıkış kodu 0** döndürür, yani kapı onu
"geçti" sayar. Depo GitHub'dan `~/sufle`'ye temiz klonlandı, iş oraya taşındı,
kapı yeşile döndü ve bu sınıfı doğrudan ölçen bir nöbetçi eklendi.

## ✅ VERİ KAYBI YOK (ölçüldü, tahmin edilmedi)

İlk teşhis "içerik geri indirilemiyor" idi ve **yanlış çıktı**. Dosyalar
sabırla okunduğunda (dakikalarca bloklayan bir indirme) geri geldi:

```
~/Desktop/.sufle-deploy → 304 dosya · hâlâ boş okunan: 0
```

Eski depo **sağlam ve dokunulmadı**; yerel `21ee8ca` (v9.33) commit'i de orada
duruyor. İçeriği zaten `~/sufle`'de yeniden birleştirildiği için kayıp yok.

## Gerçek mekanizma (bunu bilmeyen aynı tuzağa düşer)

| Nerede | Dataless dosya okunduğunda |
|---|---|
| Normal kabuk | **Bloklar**, indirir, doğru içeriği verir (dakikalar sürebilir) |
| Claude Code kum havuzu | **Anında 0 bayt döner, hata YOK** |

Yani araç zinciri (git, node, python, `kapi.sh`) hatasız çalıştı ve **boş
dosyaları ölçtü**. `ls` doğru boyutu gösteriyor, `git status` dosyayı temiz
sayıyor (boyut eşleşiyor), okuma boş dönüyor.

```
ls -lO tests/kaynak.js
-rw-r--r--  1 … hidden,compressed,dataless  14501 …
df -h /System/Volumes/Data     →  926Gi toplam · 854Gi dolu · 24Gi boş · %98
```

## Nasıl fark edildi — ve neden bu rahatsız edici

Kapı **yeşilken** `tests/116-sabah-raporu.js`ye inen bir kasıtlı bozma
**yakalanmadı**. Dosyaya bakıldı: `ls` 10.949 bayt, `open().read()` **0 bayt**.

> Deponun bildiği kör noktanın en tehlikeli hâli: *koşamayan test görünmez.*
> Burada test koştu, **hiçbir şey ölçmedi** ve **yeşil** dedi. Kapı kendi
> ölçüm aletinin boşaldığını göremiyordu.

Bulan şey tesadüftü. Nöbetçi tam da bu yüzden yazıldı.

## Yapılanlar

1. Okunabilir 244 dosya `~/sufle-kurtarma-20260819`'a kopyalandı.
2. GitHub'dan temiz klon: **`~/sufle`** (origin/main = v9.32).
3. Kurtarılan 26 değişik dosya klonun üstüne bindirildi.
4. O anda okunamayan dosyalardaki düzenlemeler **yeniden yazıldı**:
   `mac/Teleprompter Pro.html` (v9.33 sürüm notu + v9.34 etiket işi) ·
   `kontrast.py` (v9.33 `telefon-hizli` durumu) · `bozma.py` (etiket kaynağı) ·
   `DENEME.md` · `tests/33` · `tests/43` · `tests/parite-taban.json`.
5. `./kapi.sh` → **10/10 yeşil**, 676 kasıtlı bozma kanıtlı.
6. `tests/194-bos-dosya-nobetcisi.js` eklendi.

## Kapıya eklenen nöbetçi — `tests/194`

Dört şeyi ölçüyor: ① her dosyanın **stat boyutu ile gerçekten okunan bayt
sayısı** aynı mı ② hiçbir test dosyası 0 bayt mı ③ kritik dosyalar ve çekirdek
modülleri dolu mu ④ **depo iCloud senkronlu bir dizinde mi**. Dördü de bu
olayın ayrı bir yüzü.

## Erdal'ın karar vermesi gerekenler

1. **Disk açılmalı** — 854 GB dolu, 24 GB boş. Açılmazsa atım sürer.
2. **iCloud "Mac depolamasını iyileştir" kapatılmalı** ya da kod depoları
   `~/Desktop` / `~/Documents` dışında tutulmalı.
3. **Kanon depo artık `~/sufle`** (CLAUDE.md güncellendi). Geri almak istersen
   tek iş yolu değiştirmek; eski dizin **silinmedi, dokunulmadı**.
4. Aynalar (`~/Desktop/iPhone Teleprompter`, `~/Desktop/Teleprompter`,
   `~/Desktop/Teleprompter-Windows`) hâlâ iCloud altında ve yeniden boşalabilir.
   Kapının 5. adımı md5 ile yakalar; asıl çözüm 1 ve 2.
