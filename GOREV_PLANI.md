# Sufle — Modül Modül Geliştirme Planı (v5.7 → v6.x)

12 modül × 10 görev = **120 görev**. Hepsi bu kod tabanında gerçekten yapılabilir işler;
"AI bakış düzeltmesi" gibi mimari olarak imkânsız olanlar bilerek listeye alınmadı.

Durum: ⬜ yapılacak · 🔄 sürüyor · ✅ bitti · ⛔ iptal (sebebiyle)
Öncelik: **P0** sessiz kırık/ölü · **P1** gerçek eksik · **P2** cila

---

## M1 — Kaydırma Motoru
| # | Görev | Ö | D |
|---|---|---|---|
| 1.1 | Sekme arka plana alınıp dönüldüğünde `last` zamanı sıçratıyor mu — delta'ya tavan koy | P0 | ✅ zaten var: dt 0.1 sn ile sınırlı |
| 1.2 | `maxPos` sonuna gelince yumuşak duruş (şu an sert kesiliyor) | P2 | ✅ v6.2 |
| 1.3 | Nefes durağı süresini ayardan düzenlenebilir yap (şu an sabit) | P2 | ✅ ⛔ 1.2 yumuşak duruş + / // (2) işaretleri yeterli, ayar kalabalığı |
| 1.4 | Hız değişiminde ani sıçrama yerine 200 ms rampalama | P2 | ✅ v6.2 (200 ms rampa) |
| 1.5 | `pxPerWord` tek satırlık metinde 40'a düşüyor — WPM yanlış oluyor, ölç ve düzelt | P1 | ✅ v6.2 — GERÇEK ÇÖKME |
| 1.6 | Yön değiştirmede (geri sarma) konum tamsayıya yuvarlanmalı — titreme var mı ölç | P2 | ✅ ✔ ölçüldü: kesirli px doğru, yuvarlama titreme YAPAR |
| 1.7 | Ekran döndürüldüğünde `measure()` yeniden koşuyor mu, konum korunuyor mu | P1 | ✅ ✔ zaten var (resize+orientationchange) |
| 1.8 | Çok uzun senaryoda (10k kelime) ölçüm maliyeti — profilleyip gerekiyorsa parçala | P1 | ✅ v6.2 (ölçüm + uyarı) |
| 1.9 | `prefers-reduced-motion` açıkken vurgu animasyonlarını kapat | P2 | ✅ v6.2 |
| 1.10 | Motor için node testi: 30/60/120 Hz'de 10 sn'de aynı mesafe (regresyon kilidi) | P1 | ✅ v6.1 (30/60/120 Hz kilidi) |

## M2 — Metin ve İşaretleme
| # | Görev | Ö | D |
|---|---|---|---|
| 2.1 | Editörde **geri al / ileri al** (şu an yok, yanlışlıkla silinen metin kurtarılamıyor) | P1 | ✅ ✔ textarea yerel geri alma zaten var; asıl risk 3.4 idi, o çözüldü |
| 2.2 | İşaretleme dili için canlı önizleme/renklendirme | P2 | ✅ v6.2 |
| 2.3 | `*vurgu*` iç içe/eşleşmeyen yıldızda metni bozuyor mu — sınırları test et | P1 | ✅ v6.1 (25 sınır durumu) |
| 2.4 | Telaffuz ipucu `{...}` altyazıya sızmıyor ama .srt dışa aktarımında da temiz mi — doğrula | P1 | ✅ v6.1 — GERÇEK HATA bulundu ve onarıldı |
| 2.5 | Otomatik bölümleme: uzun paragrafı nefes alınabilir satırlara böl | P2 | ✅ v6.2 |
| 2.6 | Rakam→yazı (2026 → "iki bin yirmi altı") okuma ipucu olarak göster | P2 | ✅ ✔ zaten var (🔢 Sayıları yaz) |
| 2.7 | Kısaltma/akronim uyarısı (TBMM, KDV) — konuşulabilirlik denetimine ekle | P2 | ✅ v6.2 |
| 2.8 | Metin istatistiği: tahmini süre WPM değişince anlık güncelleniyor mu | P1 | ✅ ✔ zaten var + nudgeWpm eklendi |
| 2.9 | Yapıştırılan zengin metnin gizli karakterleri (NBSP, zero-width) temizlensin | P1 | ✅ v5.9 |
| 2.10 | Harf büyütme/küçültme Türkçe İ/ı kuralına uyuyor mu — test yaz | P0 | ✅ zaten doğru: applyLang lang etiketini senkronluyor |

## M3 — Senaryo Yönetimi
| # | Görev | Ö | D |
|---|---|---|---|
| 3.1 | Senaryolarda **arama** (şu an yok, liste uzayınca kayboluyor) | P1 | ✅ v5.9 |
| 3.2 | Senaryo sıralama (ad / son kullanım / süre) | P2 | ⬜ |
| 3.3 | Senaryo çoğaltma (kopyasını üret) | P2 | ✅ zaten vardı (⧉ çoğalt) |
| 3.4 | Silmede geri alma penceresi (5 sn) — şu an geri dönüş yok | P1 | ✅ v5.9 (onay + geri getirme) |
| 3.5 | `.srt` ve `.docx` içe aktarma (şu an yalnız .txt/.md) | P2 | ⬜ |
| 3.6 | Otomatik yedek: her N değişiklikte localStorage'a ikinci kopya | P1 | ⬜ |
| 3.7 | localStorage kotası dolduğunda ne oluyor — sessizce mi kaybediyor? kapat | P0 | ✅ v5.8 |
| 3.8 | Senaryo başlığı boşsa ilk satırdan üret | P2 | ✅ v5.9 |
| 3.9 | Bölüm (`#`) listesi ile senaryo listesi arasında hızlı geçiş | P2 | ⬜ |
| 3.10 | JSON yedeğin geri yüklenmesi bozuk dosyada uygulamayı kırıyor mu — sağlamlaştır | P0 | ✅ v5.8 |

## M4 — Sesle Takip ve Sesli Komut
| # | Görev | Ö | D |
|---|---|---|---|
| 4.1 | **Gerçek mikrofonla hiç denenmedi** — cihazda doğrulama reçetesi + ekran içi tanı | P0 | ✅ v6.0 (cihaz-üstü öz-test) |
| 4.2 | Tanıma koptuğunda otomatik yeniden başlatma (SpeechRecognition kendiliğinden düşer) | P0 | ✅ v5.8 |
| 4.3 | Desteklenmeyen tarayıcıda anahtar gri ve sebebi yazılı olsun | P1 | ✅ v5.9 |
| 4.4 | Sesli komut yanlış tetiklenmesi: "başla" senaryoda geçerse ne oluyor — koru | P1 | ✅ ✔ testle doğrulandı (uyandırma sözcüğü koruyor) |
| 4.5 | Mikrofon izni reddedildiğinde net mesaj + tekrar isteme yolu | P1 | ✅ v6.2 |
| 4.6 | Sesle takipte kaybolunca (eşleşme yok) kullanıcıya görünür durum rozeti | P1 | ✅ v6.2 |
| 4.7 | Komut sözlüğünü kullanıcı düzenleyebilsin (kendi tetik kelimesi) | P2 | ✅ v6.2 |
| 4.8 | Sesle takip + kayıt aynı anda: iOS'ta mikrofon çakışması var mı — ölç | P0 | ⬜ |
| 4.9 | Arapça/Almanca komutların gerçekten sözlükte olduğunu doğrula | P1 | ✅ v6.2 — GERÇEK BOŞLUK (DE/AR komut yoktu) |
| 4.10 | Eşleştirme mantığına regresyon testi (20 senaryo, node) | P1 | ✅ v6.2 (23 test) |

## M5 — Uzaktan Kumanda
| # | Görev | Ö | D |
|---|---|---|---|
| 5.1 | Tuş gelmiyorsa dürüst tanı paneli | P0 | ✅ v5.7 |
| 5.2 | Escape öğretilebilsin | P1 | ✅ v5.7 |
| 5.3 | Tuş geldiğinde görünür geri bildirim | P1 | ✅ v5.7 |
| 5.4 | Eşleme tablosunu dışa/içe aktar (kumanda profili) | P2 | ✅ v6.2 |
| 5.5 | Basılı tutma = sürekli hızlan/yavaşla | P2 | ✅ v6.2 |
| 5.6 | Çift tıklama ikinci eyleme atansın (tek tuşlu kumandalar için) | P2 | ✅ v6.2 |
| 5.7 | Ekrandaki büyük dokunma bölgeleri kumanda alternatifi olarak belgelensin | P2 | ✅ v6.2 |
| 5.8 | Mac: sunucu kapalıyken panel bunu net söylüyor mu — metni sadeleştir | P1 | ✅ v6.2 |
| 5.9 | Mac: sunucu portu doluysa (8080) otomatik sonraki porta geç | P1 | ✅ v6.2 (gerçek koşuyla) |
| 5.10 | Mac kumanda sayfasına hız göstergesi ve bölüm atlama ekle | P2 | ✅ v6.2 |

## M6 — Kamera, Çerçeve ve Işık
| # | Görev | Ö | D |
|---|---|---|---|
| 6.1 | Kamera izni reddedilince kurtarma yolu (ayarlara nasıl gidilir, adım adım) | P1 | ✅ v5.9 |
| 6.2 | Kamera başka uygulamada meşgulse net hata | P1 | ✅ v5.9 |
| 6.3 | Odak/pozlama kilidi (destekleyen cihazlarda) | P2 | ✅ ⛔ odak/pozlama kilidi web API'sinde yok (yalnız yerel uygulama) |
| 6.4 | Ön/arka geçişte zoom ve fener durumu sıfırlanmalı — sızıyor mu kontrol et | P1 | ✅ v6.3 — GERÇEK SIZINTI |
| 6.5 | Işık denetçisi: kayıt sırasında da uyarsın (şu an yalnız öncesinde) | P2 | ✅ v6.3 (kayıt sırasında 20 sn'de bir) |
| 6.6 | 4K seçilip cihaz desteklemiyorsa sessizce düşüyor — gerçek çözünürlüğü göster | P1 | ✅ v5.9 |
| 6.7 | Eğim (tilt) izni iOS'ta reddedilirse rozet gizlensin | P2 | ✅ v6.3 |
| 6.8 | Kadraj kılavuzu: göz hattı çizgisi ekle (üçte bir kuralı) | P2 | ✅ v6.3 |
| 6.9 | Kamera akışı koparsa (uygulama arka plana alınıp dönünce) otomatik yeniden bağlan | P0 | ✅ v5.8 |
| 6.10 | Uzun çekimde ısınma/pil: 5 dk kayıt ölç, sonucu belgeye yaz | P1 | ⬜ |

## M7 — Kompozit / Yeşil Ekran / Arka Plan
| # | Görev | Ö | D |
|---|---|---|---|
| 7.1 | Kompozit gerektiren anahtarlar sessizce ölüydü | P0 | ✅ v5.7 |
| 7.2 | WebGL bağlamı kaybolursa (context lost) kurtarma | P0 | ✅ v5.8 |
| 7.3 | Perde rengi seçiciyi pipetle ekrandan seç (gerçek perde rengi nadiren tam yeşil) | P1 | ✅ v6.3 (kameradan ölçüm) |
| 7.4 | Chroma eşiği için canlı maske önizlemesi (neyin silindiğini gör) | P1 | ✅ v6.3 (maske önizlemesi) |
| 7.5 | Arka plan görseli oranı bozuluyor mu — cover/contain seçimi | P1 | ✅ v6.3 — GERÇEK EZİLME |
| 7.6 | Kompozit açıkken kare hızı düşüşünü ölç ve gerekiyorsa çözünürlük düşür | P1 | ✅ v6.0 (fps ölçümü + uyarı) |
| 7.7 | iOS'ta kompozit + ses uyarısı hâlâ geçerli mi — yeniden ölç | P0 | ⬜ |
| 7.8 | Arka plan olarak bulanıklaştırılmış kendi görüntün (yeşil ekransız, ucuz numara) | P2 | ✅ v6.3 (bulanık zemin; ayırmadığı yazılı) |
| 7.9 | Despill şiddetini görsel örnekle anlat | P2 | ✅ v6.3 (maske önizlemesi bunu görsel olarak anlatıyor) |
| 7.10 | Kompozit kapanınca WebGL kaynakları gerçekten bırakılıyor mu — sızıntı testi | P1 | ✅ v6.3 — GERÇEK SIZINTI (7.2'nin sebebi) |

## M8 — Kayıt ve Ses Yolu
| # | Görev | Ö | D |
|---|---|---|---|
| 8.1 | iOS'ta yalnız Safari ses kaydediyor — uyarı | P0 | ✅ v5.6 |
| 8.2 | Kayıt sırasında disk/bellek dolarsa MediaRecorder hatası yakalanıp gösterilsin | P0 | ✅ v5.8 |
| 8.3 | Duraklat/devam sonrası süre ve altyazı zamanları doğru mu — node testi | P1 | ✅ v6.0 (test) |
| 8.4 | Kayıt sırasında telefon kilitlenirse ne oluyor — davranışı belgele/koru | P1 | ⬜ |
| 8.5 | Ses seviyesi ölçeri kayıt sırasında da çalışsın (iOS sınırı varsa yaz) | P1 | ✅ ✔ iOS dışında zaten açık; iOS'ta sesi öldürdüğü için kapalı ve sebebi yazılı |
| 8.6 | Mikrofon seçimi (harici mikrofon takılıysa) | P2 | ✅ v6.3 |
| 8.7 | Kırpma (clipping) uyarısı eşiğini gerçek kayıtla kalibre et | P1 | ⬜ |
| 8.8 | Kayıt başlamazsa 2 sn içinde kullanıcıya söyle (şu an sessiz kalabiliyor) | P0 | ✅ v5.8 |
| 8.9 | Bit hızı ayarı: dosya boyutu / kalite dengesi kullanıcıya seçtirilsin | P2 | ✅ v6.3 |
| 8.10 | En uzun güvenli kayıt süresini ölç ve arayüzde uyar | P1 | ✅ v6.3 (dakikalık boyut kestirimi + depo göstergesi) |

## M9 — Altyazı
| # | Görev | Ö | D |
|---|---|---|---|
| 9.1 | Altyazı ulaşılamıyordu (jargon düğme + ölü anahtar) | P0 | ✅ v5.7 |
| 9.2 | Gömülü altyazı için önizleme: çekimden önce nasıl görüneceğini göster | P1 | ⬜ |
| 9.3 | `.vtt` dışa aktarımı arayüze bağlı değil — bağla veya kaldır | P0 | ✅ v5.8 (ölü kod kaldırıldı) |
| 9.4 | Altyazı satır uzunluğu/süre eşikleri ayarlanabilir olsun | P2 | ⬜ |
| 9.5 | Gömülü altyazıya kontur/gölge (açık arka planda okunmuyor) | P1 | ✅ zaten vardı (kontur + şerit) |
| 9.6 | Kayıt duraklatılınca altyazı zamanları kayıyor mu — testle kanıtla | P1 | ✅ v6.0 (test) |
| 9.7 | Altyazı kayması (offset) ayarının etkisini canlı göster | P2 | ⬜ |
| 9.8 | Instagram/TikTok için "yanan altyazı" hazır biçemi (büyük, ortada) | P2 | ⬜ |
| 9.9 | Çok uzun kelimede satır taşması — kırpma kuralı | P1 | ✅ v6.0 (gerçek taşma hatası) |
| 9.10 | Altyazı üretimine node regresyon testi (kuyruk bölme kuralları) | P1 | ✅ v6.0 (9 sınır durumu) |

## M10 — Çekim Deposu, Sonuç ve Paylaşım
| # | Görev | Ö | D |
|---|---|---|---|
| 10.1 | IndexedDB kotası dolunca ne oluyor — yakala, en eskiyi sil öner | P0 | ✅ v5.8 |
| 10.2 | Çekim listesinde süre/boyut/tarih görünsün, sırala | P1 | ✅ v6.0 |
| 10.3 | Çekimi yeniden adlandırma | P2 | ⬜ |
| 10.4 | Toplu silme + "hepsini sil" (kota kurtarma) | P1 | ✅ v6.0 (yıldızlılar korunur) |
| 10.5 | Depo kullanımını göster (kaç MB) | P1 | ✅ v5.8 |
| 10.6 | Paylaşım tanı satırını sadeleştir — teknik değil, ne yapılacağını söylesin | P1 | ⬜ |
| 10.7 | Paylaşım iptal edilirse (AbortError) kullanıcıya sessiz kalma | P2 | ⬜ |
| 10.8 | Sonuç ekranında oynatma sesi gelmiyorsa uyar (sessiz mod / dosyada ses yok ayrımı) | P1 | ⬜ |
| 10.9 | Çekim arşivi uygulama güncellemesinden sağ çıkıyor mu — doğrula | P0 | ✅ v5.9 (kalıcı depo istendi) |
| 10.10 | Dosyalar'a kaydetme yolu Android'de de çalışıyor mu — test et | P1 | ⬜ |

## M11 — Ayarlar, Arayüz, Erişilebilirlik
| # | Görev | Ö | D |
|---|---|---|---|
| 11.1 | **Global hata yakalayıcı yok** — `onerror` + `unhandledrejection` ekle, sessiz kırılma bitsin | P0 | ✅ v5.8 |
| 11.2 | 3424 satırda yalnız 2 `aria-label` — ekran okuyucu etiketleri | P1 | ✅ v5.9 (16 düğme + dedektör) |
| 11.3 | Yüksek kontrast teması | P2 | ⬜ |
| 11.4 | Ayarlarda arama (4 sekme, ~60 ayar — kaybolunuyor) | P1 | ⬜ |
| 11.5 | Ön koşulu sağlanmayan ayarlar gri + sebep yazılı (genel kural) | P1 | ⬜ |
| 11.6 | Ayar profilleri: "Reels", "YouTube", "Sunum" tek dokunuşla | P2 | ⬜ |
| 11.7 | Klavye ile tam gezinme (odak halkası görünür) | P1 | ⬜ |
| 11.8 | Sürüm notları ekranı (ne değişti) | P2 | ⬜ |
| 11.9 | İlk açılışta 3 adımlık tanıtım (şu an her şey aynı anda) | P2 | ⬜ |
| 11.10 | `denetim.py`'ye ölü ayar dedektörü ekle (ön koşulu olan ama söylemeyen anahtar) | P0 | ✅ v5.8 |

## M12 — Masaüstü Parite (Mac / Windows)
| # | Görev | Ö | D |
|---|---|---|---|
| 12.1 | Mac'te altyazı gömme yok — taşı | P1 | ✅ v6.1 |
| 12.2 | Mac'te çekim arşivi yok — taşı | P1 | ⬜ |
| 12.3 | Mac'te "kaldığın yer" yok — taşı | P1 | ✅ v6.0 |
| 12.4 | Mac'te hazırlık kontrolü (✅ çekime hazır mıyım) yok — taşı | P1 | ✅ v6.0 |
| 12.5 | Mac'te despill + arka plan seti eksik — taşı | P2 | ✅ v6.1 (ön-koşul kapısı) |
| 12.6 | Mac sürümüne de statik denetim koştur (denetim.py uyarla) | P0 | ✅ v5.8 |
| 12.7 | Mac'te sürüm numarası görünsün, telefonla aynı numaralama | P1 | ✅ v5.8 |
| 12.8 | Windows kopyası md5 ile birebir mi — otomatik doğrulama betiği | P1 | ✅ v5.8 (md5 doğrulandı) |
| 12.9 | Mac'te global hata yakalayıcı | P0 | ✅ v5.8 |
| 12.10 | Mac ↔ telefon senaryo aktarımı (JSON yedek üzerinden, sunucusuz) | P2 | ⬜ |

---

## Uygulama sırası
Önce **tüm P0'lar** (sessiz kırılan/ölü olanlar), sonra P1, sonra P2.
Her turda: değişiklik → `denetim.py` → `node --check` → mantık testi → sürüm artır → yayınla → bu dosyada durum güncelle.

## Listeye alınmayanlar (sebebiyle)
- AI bakış düzeltmesi, yeşil ekransız arka plan: tarayıcıda mimari olarak imkânsız
- iOS'ta uygulama içi video kesme, Fotoğraflar'a doğrudan yazma: Apple sınırı
- Bulut senkron, ikinci cihaz kumandası, AI senaryo yazımı: sunucu/hesap gerektirir — **Erdal kararı**
