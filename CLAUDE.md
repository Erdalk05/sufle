# Sufle — çalışma kuralları

Teleprompter ("sufle"). **Asıl ürün iPhone PWA'sı**; Mac/Windows aynı işin masaüstü hâli.
Tek dosya, sıfır bağımlılık, hesap yok, sunucu yok, veri cihazdan çıkmıyor.
Erdal CTO yetkisi verdi: sırayı sen belirle, kapıda durup sorma — **aşağıdaki durma noktaları hariç**.

## Kanon depo ve aynalar

**Tek kaynak bu depodur.** Masaüstündeki klasörler AYNADIR, kaynak değil:

| Kanon (burada düzenle) | Ayna (kopyala) |
|---|---|
| `index.html` | `~/Desktop/iPhone Teleprompter/index.html` |
| `sw.js` · `denetim.py` | aynı klasör |
| `mac/Teleprompter Pro.html` | `~/Desktop/Teleprompter/` **ve** `~/Desktop/Teleprompter-Windows/` |
| `mac/teleprompter_server.py` | `~/Desktop/Teleprompter/` |

Kapının 5. adımı dördünü de md5 ile karşılaştırır; bayat ayna = KIRMIZI.
`~/Desktop/iPhone Teleprompter` **hiçbir git deposunda değil** — orada `git` komutu Sprinta'nın ev deposuna gider.

## Her değişiklikten sonra

```bash
./kapi.sh          # 5 adım: denetim.py · node --check · testler · sürüm · aynalar
```
Kapı yeşil değilse iş bitmemiştir. Yayından sonra kapı "VER son yayınla aynı" der — bu **doğru**, sonraki sürüm artışında yeşile döner.

## Yayın protokolü (sırası kritik)

1. `index.html` içinde `VER` **ve** `sw.js` içinde `CACHE` artır (ikisi birden)
2. Aynaları eşitle → `./kapi.sh` yeşil
3. **Erdal onayı al** → `git push`
4. Canlıdan doğrula: `curl -s "https://erdalk05.github.io/sufle/index.html?x=$RANDOM" | grep -oE "VER='[0-9.]+'"`
   Sürüm etiketi yetmez — düzeltmenin izini de say (ör. `grep -c kapanistaYaz`)
5. **Ancak ondan sonra** `.son-yayin` dosyasına `<VER> <cache>` yaz

`.son-yayin`'i önce yazarsan kapı yeni sürümü "zaten yayınlanmış" sanıp kendini bloke eder.

## Test disiplini

Testler mantığı **kopyalamaz**, gerçek kaynaktan `cikar()` ile çıkarıp koşturur — kopya test, kod değişince sessizce yalan söyler.

Yeni test yazınca **ayırt ettiğini kanıtla**: kodu kasıtlı boz, test kırılmalı.

Bu turda üç kez tökezlediğim yerler:

- **Bozmayı HEDEF BLOĞA uygula.** Aynı desen dosyanın başka yerinde de olabilir; `replace(...,1)` ilkini seçer ve yanlış yeri bozarsın (bugün iki kez: `},1400);` ve `rememberPos(); pullEditor();`). Fonksiyonu regex ile bulup içinde değiştir.
- **Her testten sonra ÇIKIŞ KODUNA bak.** "HATA satırı yok" testin geçtiğini göstermez — test çökmüş de olabilir, o zaman hiç satır basmaz. `node tests/X.js >/dev/null 2>&1; echo $?`
- **Asılı test kapıyı asar.** `kos.js` test başına 60 sn tavan uyguluyor (`SUFLE_TEST_TAVAN` ile değiştirilir); aşım KIRMIZI. Ölçüldü: tavansız hâlde tek bir `setInterval` dosyası koşturucuyu süresiz bekletiyordu. Bozma turunu koştururken bunu KENDİME de yaptım — tavanı kaldıran bozma kabuğu kilitledi; böyle bozmaları dış nöbetçiyle koştur.
- **İddia sayısı da bir kapı.** `tests/beklenen.json` dosya başına sayımı tutuyor: sıfır iddia = KIRMIZI, sayı düşerse = KIRMIZI, artarsa taban yükselir. Ölçüldü: eskiden 0 iddialı bir test "✓ 0 test" deyip yeşil geçiyordu ve 29 iddialı bir test 2ye inse kapı susuyordu. Ortama bağlı atlamalarda test `ATLANDI:` bassın.
- **Şablon dizesi (`` ` ``) içindeki yoruma ters tırnak koyma — BU GECE ÜÇ KEZ.** Kuralı yazdıktan sonra bile iki kez daha düştüm. Tezgâhı kesip `SyntaxError: missing ) after argument list` verir; hata satırı da yanıltıcı yeri gösterir. tests/81, tests/86, tests/72.
- **`$?` okumadan önce BAŞKA KOMUT ÇALIŞTIRMA.** `echo "$(basename $f) -> $?"` yalan söyler: komut ikamesi `$?` genişlemeden önce koşar ve kodu sıfırlar. Bu yüzden 6 kasıtlı bozmanın 6'sı da "geçti" göründü; testler aslında doğru çalışıyordu. Önce `c=$?`, sonra gerisi.
- **`indexOf` ile sıra ölçme.** Çağrı hiç yoksa `-1` döner ve `-1 < n` DOĞRU çıkar; eksikliği "sıra doğru" diye geçirir. Varlığı ayrıca sına.
- **Gevşek desen.** `/lsFull/` aramak yetmez, `lsFullWarned=false` de eşleşir. Kullanıcıya GÖSTERİLEN şeyi ara.
- Desenler koda değil, koda dair **iddiaya** bağlı olsun: `) < 0.12` ile `)<0.12` aynı şeydir.

**Bu kuralın bedeli ölçüldü (2026-08-14 gecesi, 5 vaka).** Davranış hiç bozulmadığı hâlde
kapı 5 kez kırmızıya döndü; her biri kodun BİÇİMİNE kilitlenmiş bir desendi:

| test | kilitlenen | kıran değişiklik |
|---|---|---|
| 41 | `.catch(e=>{ logErr('autoSave',e); curTakeId=null; toast(...) })` birebir | zincire bir satır eklendi |
| 22 | `>'+bionic(clean)` | kelime span'ına noktalama eklendi |
| 34 | "kısaltmadaki nokta böler" — **kusuru** kilitlemişti | kusur düzeltildi |
| 22 | `class="w">'+biyonik(m)` | Mac'e işaretleme motoru eklendi |
| 37 | `toast(m('camDenied'))` birebir | mesaja platform yolu eklendi |

Ayırt edici soru: **desen bozulunca kullanıcı için ne değişir?** Cevap "hiçbir şey" ise
desen yanlış yere bakıyor. Kullanıcının GÖRDÜĞÜ metni kilitlemek meşru
(`'SES '+clock(sesOldu)+' SANİYEDE KESİLDİ'`); iç çağrıların birleştirme biçimini
kilitlemek değil.

**Kabul edilmiş kusuru teste yazma.** tests/34 "bilinen sınır" diye kusurlu davranışı
kilitlemişti; sınır kalkınca test düzeltmeyi engelledi.

**Sürüm notunda KESME İŞARETİ KULLANMA.** Notlar tek tırnaklı JS dizeleri; `Mac'te`,
`PDF'ten` gibi bir ifade dizeyi ortadan kırar ve **uygulama hiç açılmaz**. Bu gece
altı kez oldu, her seferinde kapının 2. adımı yakaladı. Çözüm ekten kaçınmak:
"masaüstünde", "PDF belgesinden". Aynı şey Mac dosyasındaki notlar için de geçerli.

**Çıkarım çökerse adı olan iddia bassın.** `cikar()` bloğu bulamayınca test çöküyor ve
ADI OLAN tek bir satır bile basmıyor; çıkış kodu doğru olsa da rapor okunmuyor.
Kaynak düzeyi kontrolü simülasyondan ÖNCE koy, çıkarımı `match()` ile yap ve
bulunamazsa `ok(...,false)` ile bildir.

Geçici kopyada bozarken `SUFLE_TELEFON` / `SUFLE_MAC` ortam değişkenlerini kullan.
**Commit'siz işin üstünde `git checkout` yapma** — bugün öyle bir turda yazdığım Mac portunu sildim.

## Bu depoda tekrarlayan hata sınıfları

1. **Yarım kalmış düzeltme.** Port yedeği eklenmiş ama bildirilen port güncellenmemiş; ses düzeltmesi yapılmış ama yayınlanmamış; sürüm notu ekranı yazılmış ama tek girişi otomatik bırakılmış. Hepsi "yapıldı" işaretliydi.
2. **Tam da gerektiği anda sessizce çalışmayan özellik.** `pagehide`'da kurulan zamanlayıcı hiç ateşlenmez; kayıt sırasında `alert` kaydı dondurur.
3. **Ön koşulu olan ayar = ölü ayar.** Ya koşulu kendin sağla ya anahtarı geri al ve sebebini söyle.
4. **Jargon = görünmezlik.** Düğmenin adı özelliğin adı olsun (`.srt` değil "Altyazı dosyası").
5. **İki platformu karşılaştır.** Bugünkü en iyi teşhis aracı buydu: telefondaki hatayı Mac'in doğru davranışı ele verdi.
6. **Alanı YENİ eklediğin platformda `!durum.alan` bambaşka anlama gelir** — eski kullanıcıların kaydında o alan hiç yoktur.
7. **Grep sayımı kanıt değil.** Mac farklı adlandırma kullanıyor (`state.` vs `st.`); telefonun `role=switch`'i HTML'de değil `setAttribute` ile kuruluyor.

## Geriye dönük uyumluluk

Senaryo ve çekim nesnelerine alan eklerken **eski kayıtlarda o alan yoktur**.
`it.not.trim()` gibi bir çağrı arşivi tümden boşaltır ve kullanıcı her şeyini kaybettiğini sanır.
Her yeni alanı `(it.x||'')` biçiminde oku ve testte **eski kayıt nesnesiyle** koştur.

## ⛔ Onay olmadan asla

- `git push` / yayın
- `.son-yayin`'i yayından önce yazma
- `*.pem` dosyalarını depoya alma (depo GitHub Pages ile **public**; `.gitignore` engelliyor)
- Prod veri silme, geri döndürülemez işlem

## Belgeler

`belgeler/` — `SUFLE_v2_NOTLAR.md` (karar/denetim), `RAKIP_ANALIZI.md`, `MODUL_PLANI.md`, `DURUM_DEGERLENDIRME.md`
`DENETIM_20260813.md` — son büyük denetim turu ve çürüyen hipotezler
`GOREV_PLANI.md` — 120 maddelik plan (kapandı)
