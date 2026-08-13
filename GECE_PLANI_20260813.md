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
| A3 | ✅ Nefes durakları tahmini süreye yansıyor mu — **YANSIMIYORDU**. Üç tahmin de (platform açıklaması, hazırlık kontrolü, konuşulabilirlik denetimi) saf kelime/wpm hesabıydı; oysa sufle `/ // (2)` işaretlerinde gerçekten duruyor ve nefes akışı açıkken paragraf sonlarında 420 ms bekliyor. **Ölçüldü**: 20 cümlelik nefes işaretli metin 42,9 → 49,9 sn (**%16 sapma**); bilinçli `(3)` duraklamaları 9 sn = 60 sn Reels sınırının **%15'i**. Üstelik o `/` işaretlerini uygulamanın kendi “🫁 Nefes işareti” aracı koyuyor: araç metni uzatıyor, tahmin görmüyor, uygulama “sınıra uygun ✓” diyor. Üç tahmine de eklendi. Test 60 (30 iddia) | P1 |
| A4 | ⛔+✅ `maxPos` satır yüksekliği değişince güncelleniyor mu — **güncelleniyordu**, üç kaydırıcı da `measure()` çağırıyor; hipotez çürüdü ve testle kilitlendi. **Ama bir alt katmanda A5'in aynısı çıktı**: `pos` piksel, bu ayarlar satır sarmasını baştan hesaplatıyor. A5'in düzeltmesi yalnız resize/orientationchange olaylarını kapsıyordu. **Ölçüldü** (300 kelime, yazı 46→64): 50.'de 21, 150.'de 72, **250.'de 113 kelime geri** — döndürmeden büyük, çünkü satır yüksekliği ve satırdaki kelime sayısı birlikte değişiyor. Altı yol `yenidenOlc`'ye bağlandı (yazı boyutu, satır aralığı, kenar boşluğu, yazı tipi, okuma çizgisi, göz hattı reçetesi). Okuma bandı yalnız CSS maskesi olduğu için **kasten** dokunulmadı. Test 62 (22 iddia) | P1 |
| A5 | ✅ Ekran döndürmede konum korunuyor mu — **KORUNMUYORDU**. `pos` bir PİKSEL uzaklığı; dönünce satır sarması baştan hesaplanıyor ve aynı piksel BAŞKA kelimeye denk geliyor. Eski kod `measure()` sonrası `setPos(pos)` çağırıyordu. Ölçüm (300 kelime, dikey 6 / yatay 12 kelime-satır): 50.→107. (57 sapma) · **150.→299. (149 sapma)** · 250.→299. (49 sapma). Kayıt sürerken olduğu için kullanıcı hangi cümleyi kaçırdığını ancak çekimi izlerken anlıyordu. Artık ölçümden ÖNCE kelime indeksi alınıp sonra o kelime okuma çizgisine getiriliyor — her vakada **aynı satıra** düşüyor. **Mac'te de vardı ve tetikleyicisi daha sık** (pencere boyutu + tam ekran); orada da düzeltildi. Test 46 (24 iddia) | P1 |
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
| B3 | ✅ `duzMetin()` ile `markup()` aynı işaretleri tanıyor mu — **TANIMIYORDU, ikisi ayrışıyordu**. (1) Noktalama işarete yapışınca vurgu çalışmıyordu: `*harika*!` ve `(*vurgu*)` ekranda **ve yayımlanan altyazı dosyasında** yıldızlarıyla duruyordu, paket ise temizliyordu. (2) Telaffuz ipucu `{…}` markup'ta yalnız belirtecin SONUNDA aranıyordu, duzMetin her yerdekini siliyordu; uzunluk sınırları da farklıydı (24 / sınırsız). Artık okunan kelimelerde sapma **sıfır**. Duraklama simgeleri (⏸ | ‖) okunan kelime olmadığı için paketten çıkarılmaları doğru davranış — testte ayrıldı. Test 47 (43 iddia) | P1 |
| B11 | ✅ Mac'te işaretleme motoru HİÇ YOKTU — `buildWords` her belirteci olduğu gibi `.w` içine sarıyordu. Ölçüldü: `Bu *çok* önemli!` ekranda aynen öyle çıkıyor, altyazıya da öyle giriyordu. **Aracın kendisi sufleyi bozuyordu**: “🫁 Nefes işareti” düğmesi metne `/` ekliyor, sufle onu eğik çizgi olarak gösteriyordu. Telefonun kuralları taşındı (vurgu, telaffuz, duraklama + noktalama ayırma) ve duraklamalar `measure`/`tick`/`setPos` zincirine bağlanarak **gerçekten bekletiyor**; geri sarınca yeniden kuruluyor. 12 belirteçte Mac ile telefon çıktısı **birebir aynı**. Test 48 (42 iddia) | P1 |
| B4 | Çok uzun tek kelime (>42 karakter) editörde ve suflede taşıyor mu | P1 |
| B5 | RTL/Arapça metin akışı: karakter yönü ters mi | P2 |
| B6 | ✅ `stripInvisible` hangi karakterleri atıyor — **beş sınıf kaçıyordu** (gerçek fonksiyon koşturularak ölçüldü): **U+00AD yumuşak tire** (Word) — `mer<AD>haba` uzunluğu 8, sesle takip eşleştiremiyor ve karakter **.srt dosyasına** giriyor; **U+2028/2029 satır/paragraf ayracı** (PDF) — `\n` olmadığı için satıra BÖLÜNMÜYOR, iki paragraf tek satır oluyordu; **U+200E/200F, U+202A-202E, U+2066-2069 yön denetimleri** — görünmez, altyazıya sızıyor. Ayraçlar silinmiyor **satır sonuna çevriliyor** (silmek metni birleştirirdi). Görünen metne dokunulmadığı da sınandı (Türkçe harf, işaretleme, emoji, tire). Test 59 (31 iddia) | P1 |
| B7 | ✅ Rakam→yazı dönüşümü ondalık ve yüzdede doğru mu — **DEĞİLDİ, tahminden kötü**. Ölçülen gerçek çıktılar: `1.500`→"bir.beş yüz" · `1.250.000`→"bir.iki yüz elli.sıfır" · `%12,5`→"yüzde on iki,beş" · `14:30`→"on dört:otuz" · **`12,5%`→"on iki,yüzde beş"** (yüzde YANLIŞ parçaya yapışıyor → kameraya bambaşka bir sayı okutuyor). Her rakam öbeği ayrı ayrı çevriliyordu. Artık binlik ayracı/ondalık virgül/yüzde/saat tek belirteç olarak okunuyor; ondalıkta baştaki sıfır rakam rakam okunuyor (yoksa değer 10 kat değişirdi); 9 haneden büyük sayı yarım çevrilmiyor, olduğu gibi bırakılıyor. **Mac'te aynı hata birebir vardı**, o da düzeltildi. Test 44 (35 iddia) | P1 |
| B8 | Konuşulabilirlik denetiminin eşikleri ölçülü mü, uydurma mı — kaynağını yaz | P2 |
| B9 | Biyonik okuma + büyük harf dönüşümü birlikte doğru çalışıyor mu | P2 |
| B10 | ✅ `sentenceEnd` kısaltmalarda yanlış bölüyor — **BÖLÜYORDU**. Kural “noktayla biten her kelime cümle sonudur” idi; Türkçede nokta cümleyi bitirmek zorunda değil (kısaltma `vb. Dr. Sn. no.`, sıra sayısı `3. 12.`, noktalı kısaltma `T.C. A.Ş.`). Ölçüm: tek örnek cümlede **6 yanlış bölünme**, ekranda tek kelimelik altyazı kutucukları. Hem `.srt` dosyasını hem canlı altyazı önizlemesini etkiliyordu. Düzeltildi (telefon + Mac). **Test 34 bu kusuru “bilinen sınır” diye kilitliyordu** — obsolet iddia doğru davranışa çevrildi. Test 45 (51 iddia) | P1 |

## C. Senaryo yönetimi
| # | Görev | Ö |
|---|---|---|
| C1 | ✅ İki sürümlü senaryo yayın paketine giriyor mu — **sorunun altında sessiz bir sapma çıktı**: `paketPaylas` ve `yayinNotu` metni `active()` ile alıyordu, yani **çekimi yapılan senaryoyu değil o an açık olanı**. Çekimden sonra ⇄ ile geçmek paketi başka bir metinle dolduruyordu (video Türkçe, paketteki senaryo ve not İngilizce) ve yayın notu iki farklı şeyin karışımı oluyordu (başlık/etiket bir metinden, süre/tempo çekimden). Çekim başlarken senaryonun **kopyası** damgalanıyor (canlı nesne değil — sonradan düzenleme damgayı bozmasın). **KARAR**: pakete yalnız çekilen sürüm giriyor; ikinci sürüm başka bir videonun metni, bu videonun paketine koymak yanıltıcı olurdu. Test 61 (19 iddia) | P1 |
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
| D4 | ✅ Sesli komut uyandırma sözcüğü senaryoda geçerse — **kanıtlı DEĞİLDİ ve risk gerçek**. Gerçek `takeCommands` ile ölçüldü: `"Bu sufle kaydet demek"` → **rec** → `toggleRec()` → çekim cümlenin ortasında BİTİYOR · `"prompter stop dediğimde"` → pause. Kendi tetik kelimesi ayarlıyken çok daha kolay: uygulamanın örneği **“hazir”** ve o sıradan bir Türkçe kelime — `"her şey hazır dur bakalım"` komut tetikliyor. Çekimden önce hazırlık kontrolünde **engel (bad)** olarak gösteriliyor; sesli komut kapalıysa hiç çıkmıyor. Test 49 (22 iddia) | P1 |
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
| E3 | ⛔+✅ SSE koptuğunda kumanda yeniden bağlanıyor mu — **hipotezin yarısı çürüdü**: masaüstü tarafında EventSource'u tarayıcı kendi yeniden bağlıyor, elde tutulan kumanda sayfasında da 4 sn'de bir nabız var ve kopmayı söylüyor. **Ama eksik olan KOMUTUN KENDİSİNİN sonucuydu**: `send()` `.catch(()=>{})` ile hatayı tümüyle yutuyordu — düğmeye basıyorsun, sufle kıpırdamıyor ve durum satırı hâlâ “✅ Bağlı” diyor (nabız 4 sn'de bir). Çekim sırasında kumandanın öldüğünü 4 saniye boyunca bilmiyorsun. Artık sonuç anında bildiriliyor; HTTP hata kodu da başarısızlık sayılıyor; durum yazımı tek yardımcıdan geçiyor. Test 56 (22 iddia) | P1 |
| E4 | Aynı anda iki kumanda bağlıysa komutlar çakışıyor mu | P2 |
| E5 | Telefon HID kumanda: 6 sn tanı paneli hâlâ doğru çalışıyor mu | P1 |
| E6 | ✅ Öğrenilen tuş eşlemesi dışa/içe aktarımı bozuk dosyada çökmüyor mu — **İÇE AKTARMA HİÇ YOKTU**. `sufleRemote` işareti kaynakta yalnız dışa aktarma tarafında geçiyordu: dosya dışarı çıkıyor, geri giremiyordu. Dışa aktarmanın kendi yorumu amacı yazıyordu (“ikinci cihazda baştan öğretmek zorunda kalma”) ve o amaç hiçbir zaman gerçekleşmiyordu — yarım kalmış özellik. İçe aktarma eklendi; planın sorusu kabul ölçütü oldu: bozuk JSON, başka uygulamanın dosyası, tanınmayan eylem, null alanlar ve okuma hatası sınandı. **Tanınan eşleme yoksa mevcut profil KORUNUYOR** — bozuk dosya yüzünden öğretilmiş eşlemeyi kaybetmek, içe aktarmayı hiç yapmamaktan kötü olurdu. Test 58 (41 iddia) | P1 |
| E7 | Basılı tutma hızlanması üst sınıra takılıyor mu | P2 |
| E8 | Kumanda sunucusu `/qr` qrcode yoksa net mesaj veriyor mu | P2 |
| E9 | ✅ LAN IP bulunamazsa kumanda adresi ne gösteriyor — **ÖLÜ ADRESİ ÇALIŞIYORMUŞ GİBİ gösteriyordu**. `lan_ip()` başarısız olunca `127.0.0.1` dönüyor; bu adres telefon için ölüdür (telefonda kendisini gösterir). İki yerde de sessizdi: sunucu banner'ı `http://127.0.0.1:PORT/remote` yazıyordu, Mac sayfası da `location.host`'a düşüp QR'a **localhost** basıyordu — telefon QR'ı okuyor, kendine bağlanmaya çalışıyor, sayfa hiç açılmıyor ve sebebi hiçbir yerde yazmıyor. `lan_yok()` eklendi (127.x, ::1, localhost, boş); banner ve sayfa artık sebebi + ne yapılacağını söylüyor, çalışmayacak QR hiç üretilmiyor. Port yedeğindeki (tests/29) aynı sınıf: mekanizma var, **bildirilen değer** yanlış. Test 57 (24 iddia) | P1 |
| E10 | `iphone_server.py` için de entegrasyon testi (E3 deseniyle) | P1 |

## F. Kamera, çerçeve, ışık
| # | Görev | Ö |
|---|---|---|
| F1 | Işık denetçisi 32×48 örnekleme maliyeti kayıt sırasında ne kadar — ölç | P1 |
| F2 | Ön/arka geçişte zoom+fener sızıntısı testte kilitli mi | P1 |
| F3 | Kamera akışı koparsa yeniden bağlanma kaç deneme yapıyor — sonsuz mu | P0 | ⛔ sonsuz döngü YOK (yalnız visibilitychange ile bir kez tetikleniyor, hata yolları ayrı mesajlı) → ama ✅ **KAPSAM BOŞLUĞU**: telefonun kamera korumaları hiç test edilmiyordu (Mac'inki kilitliydi). tests/37 ile kilitlendi. |
| F4 | ⛔+✅ 4K istenip düşülünce gerçek çözünürlük gösteriliyor mu — **`realRes()` dürüst** (izin kendi ayarını okuyor) ve `resNote()` eşiği doğru; hipotez çürüdü, testle kilitlendi. **Ama araştırırken daha ciddi bir şey çıktı**: kamerayı yeniden açan 4 ayar durumu ÖNCE değiştirip SONRA `openCam` çağırıyordu. v9.5 kapısı openCam'de olduğu için ayar “değişmiş” görünüp uygulanmıyordu — st.quality '4k', akış 1080p, panel de “cihaz bu kadarını verdi” diye **yanlış açıklama** yazıyor (cihaza hiç sorulmadı). **En kötüsü “🔧 Sesi düzelt”**: izleri KENDİ durduruyor, openCam'in kapısına hiç varmadan çekimin sesi ve görüntüsü ölüyor, sonra yeniden açılamıyor. H6'nın boğaz noktası bu yolu kapsamıyormuş. Kapı artık durum değişmeden ÖNCE soruluyor (4 yol), openCam'deki yedek. Test 53 (24 iddia) | P1 |
| F5 | Eğim (tilt) izni reddedilince rozet gizleniyor mu | P2 |
| F6 | Göz hattı kılavuzu farklı oranlarda doğru yerde mi | P2 |
| F7 | ✅ Uyumluluk özeti yanlış söylüyor mu — **plandaki `deviceLine()` adı kodda YOK** (gerçek ad `deviceReport()`); ad üzerinden değil davranış üzerinden bakıldı. **Bir sapma bulundu**: kesme satırı panelin KENDİ kuralını yazıyordu (`video.captureStream`), oysa gerçek kapı `canTrim()` ve o `mozCaptureStream`'i de kabul ediyor. Ölçüm — Chrome/Safari: panel=true kapı=true · **Firefox: panel=FALSE kapı=TRUE** · desteksiz: ikisi de false. Yani Firefox'ta çalışan özelliğe “yok” deniyor, kullanıcı daha zahmetli yola gönderiliyordu. Panel artık kapının kendisini çağırıyor. Kompozit/duraklatma/paylaşma/MP4 satırları denetlendi — **ayrışma yok** (hipotezin geri kalanı çürüdü) ve testle kilitlendi. Test 50 (20 iddia) | P1 |
| F8 | ✅ Kamera izni reddedilince kurtarma metni platforma göre doğru mu — **DEĞİLDİ, iOS Safari'ye sabitlenmişti**: “Ayarlar → Safari → Kamera → İzin ver”. Android'de Safari **yok** (kullanıcı tarif edilen yeri bulamıyor), masaüstünde yol adres çubuğundaki simge, iOS'ta Chrome/Firefox kullananın kendi Ayarlar girdisi var. Kamera açılmazsa uygulamanın tamamı çalışmadığı için bu ilk adımda takılma demek — yanlış tarif, hiç tarif olmamasından kötü. 5 platformda ölçüldü, her biri kendi yolunu alıyor. **Mac sürümü zaten doğru söylüyordu** (adres çubuğu) — iki platformu karşılaştırmak yine teşhis aracı oldu. Test 52 (35 iddia) | P1 |
| F9 | Işık uyarısı kayıt sırasında kaç kez tekrarlıyor — bunaltıyor mu | P2 |
| F10 | ⛔+✅ `lightCheck` boş/siyah karede NaN üretiyor mu — **NaN hipotezi ÇÜRÜDÜ**: örnekleme ızgarası sabit 32×48, bölenler derlenme anında belli, sıfır olamıyor (tam siyah/orta gri/tam beyaz karelerde ölçüldü, hiçbir alan NaN değil; yine de testle kilitlendi). **Ama aynı ölçümde gerçek kusur çıktı**: siyah karede panel “Yüzün karanlık — ışığı yüzünün önüne al” diyordu. Mercek kapalıysa ya da iOS arka plandan dönerken boş kare veriyorsa kullanıcı ışık ekliyor, hiçbir şey değişmiyor. **Ölçüm zaten vardı**: `darkPct` hesaplanıp hiç okunmuyordu — ölü ölçüm. Artık ayrı teşhis veriyor ve yanıltıcı ışık öğüdü yığılmıyor. Test 51 (28 iddia) | P1 |

## G. Kompozit / yeşil ekran
| # | Görev | Ö |
|---|---|---|
| G11 | ✅ **YENİ (F4 turunun devamı)** — kayıt sürerken kompozit anahtarı iki yönde de bozuyordu. Kaynak çekim başında BİR KEZ seçiliyor: **kapatmak** `stopComp()` ile MediaRecorder'ın beslendiği tuval izini öldürüyor; **açmak** kayda hiç yansımıyor ama önizleme yeşil ekranı gösteriyor — kullanıcı arka planın değiştiğini sanarak çekimi tamamlıyor ve **hiçbir uyarı yok**. `burnCaps`/`chroma` da kompozit kapalıyken sessizce kompozit başlatıyordu. Kayıt sürerken engellendi; kompozit zaten açıkken kırpma/gömülü altyazı serbest (kayda yansıyor, çalışan yetenek kapatılmadı). Test 54 (26 iddia) | P1 |
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

## Y. Düzen ayarları (A4 turunda bulundu)
| # | Görev | Ö |
|---|---|---|
| Y1 | ✅ **Kalınlık ve harf aralığı HİÇ ölçüm yapmıyordu** — `bind('#weight','weight'); bind('#ls','ls');` geri aramasız. Oysa `#scroller` ikisini de kullanıyor ve `word-wrap:break-word` ile sarıyor. Üç sonuç: `wordTops` bayat (vurgu yanlış satırda), **`maxPos` bayat** (harf aralığı artınca metnin SON SATIRLARI hiç görünmeden akış bitiyor — A4 hipotezi tam burada doğru), `pxPerWord` bayat (wpm hızı yanlış). Biyonik okuma da sarmayı değiştiriyordu; `buildContent` ölçüyor ama konum kayıyordu. Perde koyuluğu ve hedef süreye **kasten** dokunulmadı. Test 63 (23 iddia) | P1 |

## X. Kapı hijyeni (gece bulgusu)
| # | Görev | Ö |
|---|---|---|
| X1 | ⬜ **Testlerin koda birebir kilitlenmesi** — 2026-08-14 gecesi kapıyı 5 kez gereksiz kırmızıya çevirdi. Tarama yapıldı: 26 şüpheli desenden ~14'ü kod BİÇİMİNİ kilitliyor (07:59, 11:122, 12:89, 13:109, 14:71, 15:159, 17:41, 20:62, 36:108, 41:122, 43:115, 46:104/111/113/121, 50:79, 52:76). Kalanlar kullanıcının gördüğü metni kilitliyor — meşru, dokunulmayacak. Kural CLAUDE.md'ye yazıldı; süpürme ürün kusurlarından SONRA | P2 |
| X2 | ⬜ Çıkarım (`cikar`) çökmesi hâlâ bazı testlerde adsız yığın izi bırakıyor — hepsinde `match()` + adlı iddia desenine geç | P2 |

## H. Kayıt ve ses yolu
| # | Görev | Ö |
|---|---|---|
| H11 | ✅ **YENİ (F4/G11 sınıfının kapanışı)** — Ses Stüdyosu ayarları ve bit hızı kayda ÇEKİM BAŞINDA giriyor (`fxParams()` yalnız `makeFxTrack`'te okunuyor). Çekim sürerken hazır ayarı ya da kapı/anlaşılırlık/gövde kaydırıcılarını değiştirmek arayüzü güncelliyor ama **kayda hiç yansımıyor** ve hiçbir şey söylenmiyordu — insanın en çok yapacağı şey tam da bu (sesini beğenmeyip çekim sırasında oynamak). Burada ENGELLEME yok, çünkü sonraki çekime hazırlık meşru: ne zaman geçerli olacağı söyleniyor, çekim başına bir kez. Test 55 (21 iddia) | P1 |
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
