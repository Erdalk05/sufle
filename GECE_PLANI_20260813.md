# Sufle — gece planı (2026-08-13 → 14)

13 modül × 10 görev = **130**. Erdal uyurken otonom koşulacak.

**Kurallar:** her görev → koddan kanıt → en küçük çözüm → regresyon testi → testin ayırt ettiğini
kasıtlı bozarak kanıtla → `./kapi.sh` → aynaları eşitle → commit. **Yayın yok**, commit'ler yerelde birikir.

**Öncelik:** `P0` kullanıcıyı doğrudan kesen · `P1` gerçek eksik · `P2` cila/sağlamlaştırma
**Durum:** ⬜ yapılacak · ✅ bitti · ⛔ iptal (sebebiyle) · 🔒 cihaz/insan gerekiyor

Bugünkü ölçüm: 236 fonksiyon · 28 ayar · 248 metin anahtarı · **1158 test**.
Kapsam haritası: telefonun 122, Mac'in 71 fonksiyonu testlerde hiç anılmıyor — görevlerin bir kısmı buradan.

---

## A. Kaydırma motoru
| # | Görev | Ö |
|---|---|---|
| A1 | 10.000 kelimelik senaryoda `measure()` maliyetini ÖLÇ, 16 ms'i aşıyorsa parçala | P1 |
| A2 | `setPos` kesirli piksel birikimi: 10 dk akışta sapma var mı, ölç | P2 |
| A3 | Nefes durakları (`/`, `//`, `(2)`) toplam süreyi ne kadar uzatıyor — tahmini süreye yansıyor mu | P1 |
| A4 | `maxPos` hesabı satır yüksekliği değişince güncelleniyor mu (font/satır aralığı ayarı) | P1 |
| A5 | Ekran döndürmede konum korunuyor mu — testle kilitle | P1 |
| A6 | `tick()` delta tavanı (0,1 sn) aşırı yüklemede yeterli mi, 5 fps'te ölç | P2 |
| A7 | Hız rampasının (200 ms) kayıt sırasında tempo ölçümünü bozup bozmadığı | P2 |
| A8 | `jumpLine` bölüm sınırında takılıyor mu | P2 |
| A9 | `prefers-reduced-motion` açıkken rampa da kapanmalı mı — karar + uygula | P2 |
| A10 | Motorun tamamı için tek bir "aynı girdi → aynı mesafe" altın testi | P1 |

## B. Metin ve işaretleme
| # | Görev | Ö |
|---|---|---|
| B1 | `markup()` iç içe `*a *b* c*` durumunda ne üretiyor — sınırları testle kilitle | P1 |
| B2 | `{telaffuz}` ipucu satır sarmasını bozuyor mu | P2 |
| B3 | `duzMetin()` (yayın paketi) ile `markup()` aynı işaretleri tanıyor mu — sapma testi | P1 |
| B4 | Çok uzun tek kelime (>42 karakter) editörde ve suflede taşıyor mu | P1 |
| B5 | RTL/Arapça metin akışı: karakter yönü ters mi | P2 |
| B6 | `stripInvisible` hangi karakterleri atıyor — listeyi testle sabitle | P1 |
| B7 | Rakam→yazı dönüşümü ondalık ve yüzdede doğru mu (`%12,5`) | P1 |
| B8 | Konuşulabilirlik denetiminin eşikleri ölçülü mü, uydurma mı — kaynağını yaz | P2 |
| B9 | Biyonik okuma + büyük harf dönüşümü birlikte doğru çalışıyor mu | P2 |
| B10 | `sentenceEnd` kısaltmalarda yanlış bölüyor (`Sn.`, `vb.`) — düzelt ya da gerekçelendir | P1 |

## C. Senaryo yönetimi
| # | Görev | Ö |
|---|---|---|
| C1 | İki sürümlü senaryo yayın paketine giriyor mu — ikinci sürüm de eklensin mi (karar) | P1 |
| C2 | ✅ Senaryo arama iki sürümün ikisinde de arıyor mu — **ARAMIYORDU**: yalnız o an AÇIK sürümün metnine bakıyordu, aradığın cümle diğer sürümdeyse senaryo listede hiç çıkmıyordu. Kullanıcı o metni bu uygulamaya kendisi yazmış oluyor. Düzeltildi. **Aynı turda plan dışı bir kayıp daha bulundu**: çoğaltma (⧉) alan alan kopyalıyordu, ikinci sürüm sessizce düşüyordu — tek dokunuşla metnin yarısı gidiyor. Artık nesnenin tamamı derin kopyalanıyor, sonraki alanlar da kendiliğinden taşınacak. Test 43 (36 iddia) | P1 |
| C3 | `localStorage` kotası: iki sürüm + arka plan görseli ile sınır nerede — ÖLÇ | P1 |
| C4 | ⛔ Otomatik yedek ikinci sürümü de kapsıyor mu — **hipotez çürüdü**: `st.scripts` dizisini olduğu gibi yazıyor, bütün alanlar taşınıyor. Testle kilitlendi (43) ki ileride "alan alan" yazıma dönülürse yakalansın | P1 |
| C5 | ⛔ JSON dışa/içe aktarım ikinci sürümü taşıyor mu — **hipotez çürüdü**: dışa aktarma `scripts:st.scripts`, içe aktarma `st.scripts=j.scripts` — tümüyle taşıyor. Testle kilitlendi (43) | P1 |
| C6 | ⛔ Silinen senaryo geri gelince ikinci sürüm de dönüyor mu — **hipotez çürüdü**: çöpe atarken `JSON.parse(JSON.stringify(gone))` derin kopya alınıyor, her şey dönüyor. Testle kilitlendi (43) | P1 |
| C7 | `.srt` içe aktarımı çok uzun dosyada ne kadar sürüyor — ölç | P2 |
| C8 | Senaryo sıralaması "son kullanım"da iki sürüm geçişini sayıyor mu | P2 |
| C9 | Başlıktan ad üretimi ikinci sürümde de çalışıyor mu | P2 |
| C10 | 50 senaryoda liste render maliyeti | P2 |

## D. Sesle takip ve sesli komut
| # | Görev | Ö |
|---|---|---|
| D1 | Eşleştirme penceresi: uzun senaryoda kaybolma oranını sentetik veriyle ölç | P1 |
| D2 | Türkçe telaffuz toleransı hangi harf çiftlerini eşliyor — listeyi kilitle | P1 |
| D3 | Sesle takip + ikinci sürüm: dil değişince tanıma dili de değişmeli mi (karar) | P1 |
| D4 | Sesli komut uyandırma sözcüğü senaryoda geçerse — testte kanıtlı mı | P1 |
| D5 | Tanıma koptuğunda yeniden başlatma sayacı sonsuz döngü yapıyor mu | P0 | ✅ **GERÇEK HATA** — sayaç `start()` dönünce sıfırlanıyordu, 5 sınırına hiç ulaşmıyordu (176 tur ölçüldü, srFails=0). Artık yalnız gerçekten çalışınca sıfırlanıyor. |
| D6 | Desteklenmeyen tarayıcıda anahtar gerçekten gri mi | P2 |
| D7 | `syncVoicePtr` konum atlamada doğru kelimeye gidiyor mu | P1 |
| D8 | Sesle takip kapalıyken de mikrofon açık kalıyor mu — sızıntı kontrolü | P0 | ⛔ mikrofon sızıntısı YOK (sesle takip Web Audio'ya hiç dokunmuyor, mikrofonu SpeechRecognition yönetiyor) → ama ✅ **BAŞKA HATA**: `stopVoice` bekleyen yeniden başlatmayı iptal etmiyordu; kapat-aç turunda taze oturumun sayacı 4'e çıkıyordu. |
| D9 | Komut sözlüğü kullanıcı düzenlemesi bozuk girdide çökmüyor mu | P1 |
| D10 | DE/AR komutları gerçekten sözlükte mi (v6.2 iddiası) — doğrula | P2 |

## E. Uzaktan kumanda
| # | Görev | Ö |
|---|---|---|
| E1 | `/cmd` erişim kararı (T23) uygulanır — Erdal seçimine göre | 🔒 |
| E2 | Kumanda sayfası hız/font kaydırıcıları sunucuya kaç istek atıyor — kısıtla | P2 |
| E3 | SSE bağlantısı koptuğunda kumanda sayfası yeniden bağlanıyor mu | P1 |
| E4 | Aynı anda iki kumanda bağlıysa komutlar çakışıyor mu | P2 |
| E5 | Telefon HID kumanda: 6 sn tanı paneli hâlâ doğru çalışıyor mu | P1 |
| E6 | Öğrenilen tuş eşlemesi dışa/içe aktarımı bozuk dosyada çökmüyor mu | P1 |
| E7 | Basılı tutma hızlanması üst sınıra takılıyor mu | P2 |
| E8 | Kumanda sunucusu `/qr` qrcode yoksa net mesaj veriyor mu | P2 |
| E9 | LAN IP bulunamazsa kumanda adresi ne gösteriyor | P1 |
| E10 | `iphone_server.py` için de entegrasyon testi (E3 deseniyle) | P1 |

## F. Kamera, çerçeve, ışık
| # | Görev | Ö |
|---|---|---|
| F1 | Işık denetçisi 32×48 örnekleme maliyeti kayıt sırasında ne kadar — ölç | P1 |
| F2 | Ön/arka geçişte zoom+fener sızıntısı testte kilitli mi | P1 |
| F3 | Kamera akışı koparsa yeniden bağlanma kaç deneme yapıyor — sonsuz mu | P0 | ⛔ sonsuz döngü YOK (yalnız visibilitychange ile bir kez tetikleniyor, hata yolları ayrı mesajlı) → ama ✅ **KAPSAM BOŞLUĞU**: telefonun kamera korumaları hiç test edilmiyordu (Mac'inki kilitliydi). tests/37 ile kilitlendi. |
| F4 | 4K istenip düşülünce gerçek çözünürlük gösteriliyor mu — testle kilitle | P1 |
| F5 | Eğim (tilt) izni reddedilince rozet gizleniyor mu | P2 |
| F6 | Göz hattı kılavuzu farklı oranlarda doğru yerde mi | P2 |
| F7 | `deviceLine()` uyumluluk özeti yanlış pozitif veriyor mu | P1 |
| F8 | Kamera izni reddedilince kurtarma metni platforma göre doğru mu | P1 |
| F9 | Işık uyarısı kayıt sırasında kaç kez tekrarlıyor — bunaltıyor mu | P2 |
| F10 | `lightCheck` boş/siyah karede NaN üretiyor mu | P1 |

## G. Kompozit / yeşil ekran
| # | Görev | Ö |
|---|---|---|
| G1 | Kompozit açıkken fps düşüşü ölçülüyor mu, eşik ne | P1 |
| G2 | WebGL bağlam kaybı sonrası kayıt sürüyorsa ne oluyor | P0 | ✅ **GERÇEK HATA** — kompozit kaydı TUVALDEN besleniyor; bağlam kopunca tuval izi 'canlı' kalıp donuyor, 'iz öldü' gözcüsü ateşlenmiyor ve donmuş kare dakikalarca yazılıyordu. Mesaj da 'kompoziti kapatıp aç' diyordu. Artık çekim hemen bitiriliyor + ayrı mesaj. |
| G3 | Chroma eşiği uç değerlerde (0 ve 100) çökmüyor mu | P1 |
| G4 | Arka plan görseli oran koruması testte kilitli mi | P1 |
| G5 | `makeBgCanvas` büyük görselde bellek şişiriyor mu — M1-P1 dersi | P1 |
| G6 | Despill şiddeti 0'da tümden kapanıyor mu | P2 |
| G7 | Kompozit kapanınca tüm GPU kaynakları bırakılıyor mu (telefon tarafı) | P1 |
| G8 | Bulanık zemin modu kompozitsiz çalışıyor mu | P2 |
| G9 | Maske önizlemesi kayıt sırasında kapatılıyor mu (maliyet) | P2 |
| G10 | Kompozit + yayın paketi birlikte: video türü doğru mu | P1 |

## H. Kayıt ve ses yolu
| # | Görev | Ö |
|---|---|---|
| H1 | `pickMime` her platformda ilk desteklenen türü mü seçiyor — testle kilitle | P1 |
| H2 | Duraklat/devam sonrası süre ve altyazı zamanları — testte var mı, genişlet | P1 |
| H3 | Kayıt 2,5 sn gözcüsü yanlış alarm veriyor mu | P1 |
| H4 | ✅ Disk dolunca `MediaRecorder` hatası kullanıcıya net mi — **mesaj vardı ama iki delik**: (1) `rec.onerror` yalnız uyarı basıyordu, arayüz KAYITTA kalıyordu (kırmızı nokta, akan sufle, kilitli ekran) — kullanıcı hiçbir şey kaydedilmezken konuşmaya devam ediyordu; artık çekim düzgün bitiriliyor. (2) Yer uyarısı çekim BİTİNCE geliyordu, yani çok geç; hazırlık paneline kalan yerin **dakika** karşılığı eklendi (`mbPerMin()` ile aynı kaynaktan, <3 dk engel / <10 dk uyarı). Test 41 (26 iddia) | P0 |
| H5 | ✅ Ses Stüdyosu zinciri kayıt sırasında kopunca ham ize düşüyor mu — **hipotez kısmen çürüdü, yerine daha büyüğü çıktı**: kayıt başladıktan sonra ham ize düşmek zaten MÜMKÜN DEĞİL (MediaRecorder'ın iz kümesi sabit). Asıl delik: kayıt sırasında **sesin ölmesini izleyen hiçbir gözcü yoktu** — görüntü için vardı. İki yol: (a) mikrofon izi biter (Bluetooth kopması), (b) FX bağlamı askıya alınır → sessizlik kaydedilir. İkisi de artık yakalanıyor + sonuç ekranında yazıyor; FX bağlamı önce geri getirilmeye çalışılıyor. Mac'te de aynı delik vardı, kapatıldı. Test 40 (35 iddia) | P0 |
| H6 | ✅ Mikrofon değişiminde kayıt sürüyorsa ne oluyor — **GERÇEK P0**: `openCam`'in ilk işi bütün izleri durdurmak, MediaRecorder tam da onlardan kaydediyordu → çekimin sesi ölüyor, kayıt sessiz sürüyordu. 9 çağrı yolundan yalnız 1'i korumalıydı; boğaz noktasına (openCam) tek koruma kondu. Mac'te aynı hata yok (`stopCam` kaydı önce düzgün bitiriyor). Test 39 (16 iddia) | P0 |
| H7 | Bit hızı ayarı iOS'ta yok sayılıyor — arayüzde açıkça yazıyor mu | P2 |
| H8 | `recElapsed` duraklatmalarda birikimli doğru mu — testle kilitle | P1 |
| H9 | Uzun kayıtta `chunks` bellek profili — 10 dk için ölç | P1 |
| H10 | Kayıt sırasında sekme arka plana alınırsa ne oluyor (belgelendir) | 🔒 |

## I. Altyazı
| # | Görev | Ö |
|---|---|---|
| I1 | `wrapLines` çok uzun kelimede testte kilitli mi — genişlet | P1 |
| I2 | Gömülü altyazı çizimi kompozit fps'ini ne kadar düşürüyor | P1 |
| I3 | Altyazı kayması uç değerlerde (±2 sn) kuyrukları negatife düşürüyor mu | P1 |
| I4 | `.srt` zaman biçimi 1 saati aşan çekimde doğru mu | P1 |
| I5 | Sosyal biçem (yanan altyazı) satır sayısı sınırı var mı | P2 |
| I6 | Altyazı üretimi ikinci sürümde doğru metni alıyor mu | P1 |
| I7 | `capTimes` kelime atlamada boşluk bırakıyor mu | P1 |
| I8 | Gömülü altyazı kontur/gölge okunabilirliği — açık zeminde ölç | P2 |
| I9 | `.srt` dosya adı Türkçe karakterli senaryoda bozuluyor mu | P2 |
| I10 | Mac altyazı gömme telefonla aynı sonucu veriyor mu | P1 |

## J. Çekim arşivi ve paylaşım
| # | Görev | Ö |
|---|---|---|
| J1 | Arşive yazarken video KOPYALANIYOR mu — M1-P1 dersini burada da ölç | P1 |
| J2 | ⭐/not değişikliğinde tüm kayıt (video dahil) yeniden yazılıyor mu — ölç | P1 |
| J3 | ✅ IndexedDB kotası dolunca en eskiyi silme önerisi çalışıyor mu — **öneri HİÇ YOKTU**: toplu silme özelliği vardı ama yalnız arşiv ekranında, yani kullanıcının bildiğini + geçici bildirimi okuduğunu + sonuç ekranını KAPATMADAN gidip bulduğunu varsayıyordu. Oysa yazılamayan çekim yalnızca bellekte; ekranı kapatınca gidiyor. Çıkış yolu artık kaybın yaşandığı yerde: sonuç ekranında düğme → yıldızsız çekimleri sil (iki aşamalı onay, yıldızlılara dokunmaz) → **aynı çekimi tekrar yaz**. Silme kendiliğinden yapılmıyor. Test 42 (42 iddia). Yan ürün: `denetim.py` satır sonu yorumlarını atmıyordu, bu gece 2 yalancı alarm verdi — düzeltildi | P0 |
| J4 | Yayın paketi ikinci sürümü de içermeli mi (C1 ile aynı karar) | P1 |
| J5 | Paylaşım iptalinde (AbortError) mesaj doğru mu — testle kilitle | P1 |
| J6 | Arşiv 50 çekimde render maliyeti | P2 |
| J7 | Çekim notu 140 karakter sınırı arayüzde belli mi | P2 |
| J8 | `dbDel` zaman aşımı koruması eksik — ekle (v9.4 deseni) | P1 |
| J9 | Toplu silme yıldızlıları gerçekten koruyor mu — testle kilitle | P1 |
| J10 | Paylaşım tanı satırı (T7) Erdal'ın cevabına göre iyileştirilir | 🔒 |

## K. Ayarlar, arayüz, erişilebilirlik
| # | Görev | Ö |
|---|---|---|
| K1 | Ayar araması 28 anahtarın hepsini buluyor mu — testle kilitle | P1 |
| K2 | Ön koşulu olan ayarlar gri + sebep: hepsi kapsanıyor mu | P1 |
| K3 | Klavye ile tam gezinme: sekme sırası mantıklı mı | P1 |
| K4 | Yüksek kontrast temasında kontrast oranı WCAG AA mı — ÖLÇ | P1 |
| K5 | Ayar profilleri (Reels/YouTube/Sunum) hangi ayarları değiştiriyor — belgele | P2 |
| K6 | `aria-live` bölgesi yok: toast'lar ekran okuyucuya duyuruluyor mu | P1 |
| K7 | Odak tuzağı: sayfa açıkken Tab arkaya kaçıyor mu | P1 |
| K8 | Dokunma hedefleri 44×44 px altında olan var mı — ölç | P1 |
| K9 | İlk açılış tanıtımı ikinci kez gösterilmiyor mu | P2 |
| K10 | Renk körlüğü: ses rozeti yalnız renge mi dayanıyor (🔊/🔈/⚠️ zaten simge) | P2 |

## L. Masaüstü parite
| # | Görev | Ö |
|---|---|---|
| L1 | Mac'e yayın paketi taşınsın mı (karar + maliyet) | P1 |
| L2 | Mac'e çekim notu taşınsın mı | P1 |
| L3 | Mac'e iki sürümlü senaryo taşınsın mı | P1 |
| L4 | Mac'te altyazı kelime sınırı ayarı yok — ekle ya da gerekçelendir | P2 |
| L5 | Mac `buildCues` telefonla birebir — testte kilitli ✅, sabitleri de kilitle | P1 |
| L6 | Windows kopyası md5 kapıda ✅ — zip paketi de eşit mi | P2 |
| L7 | Mac hata günlüğü telefondaki kadar kapsamlı mı (etiket sayısı) | P1 |
| L8 | Mac'te kalıcı depo isteği gerçekten gereksiz mi — ölç | P2 |
| L9 | Mac sunucusu olmadan açılınca kumanda paneli net mi | P1 |
| L10 | Mac fonksiyon kapsamı %47 — en riskli 5'ini testle kilitle | P1 |

## M. Kapı, test, denetim altyapısı
| # | Görev | Ö |
|---|---|---|
| M1 | Kapsam raporu `kapi.sh`'e eklensin (fonksiyon kapsamı düşerse uyar) | P1 |
| M2 | Testlerin ÇÖKMESİ ile geçmesi ayırt edilsin — `kos.js` çıkış kodunu zaten alıyor, iddia sayısını da say | P1 |
| M3 | Asılı kalan test kapıyı asar — `kos.js`'e test başına süre tavanı | P1 |
| M4 | `denetim.py` boş catch tabanı 23/16 — her birini gözden geçir, düşür | P2 |
| M5 | Parite listesi elle yazılıyor: yeni koruma eklenince uyaran bir kontrol | P1 |
| M6 | Test dosyalarının kendi kalitesi: ada bağlı desenleri tara | P1 |
| M7 | `sw.js` sürüm artışı unutulursa kapı zaten kırmızı ✅ — Mac notu unutulursa da | P2 |
| M8 | Bozma turu otomatikleşsin: her test için en az 1 kanıtlı bozma senaryosu | P1 |
| M9 | `GECE_PLANI` durumları her turda güncellensin | P2 |
| M10 | Sabah raporu: ne yapıldı, ne çürüdü, ne bekliyor | P1 |

---

## Gece protokolü
1. Sırayla P0 → P1 → P2. 🔒 olanlar atlanır (Erdal/cihaz gerekiyor).
2. Her turda **en fazla bir görev**; bitmeden diğerine geçilmez.
3. Hipotez çürürse görev ⛔ işaretlenir ve **sebebi yazılır** — çürüyen hipotez de sonuçtur.
4. Kapı kırmızıysa ilerlenmez.
5. **Yayın yok.** Commit'ler yerelde birikir; sabah tek onayla çıkar.
