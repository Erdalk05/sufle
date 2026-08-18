# Sufle — deneme kılavuzu (mağazadan önce)

**Sürüm 9.28 · 18 Ağustos 2026 · adres: https://erdalk05.github.io/sufle/**

Bu sayfa, uygulamayı kendinde ve yakınlarında denetmek isteyen için yazıldı.
Her platform için **tek doğru yol** var; başka yollar çalışır ama bir yerde
eksik kalır ve sebebi burada yazılı. Kurulum yok, hesap yok, izin verdiğin
şeyler dışında hiçbir veri cihazından çıkmıyor.

**Paylaşacağın tek şey bu bağlantı:** `https://erdalk05.github.io/sufle/`

---

## iPhone / iPad — **Safari ile aç**

1. **Safari**'de adresi aç (Chrome ya da Firefox ile değil — sebebi aşağıda).
2. Alttaki **Paylaş** simgesi → **Ana Ekrana Ekle** → **Ekle**.
3. Ana ekranda beliren **Sufle** simgesinden aç. Artık adres çubuğu yok,
   tam ekran çalışıyor ve **internet olmadan da açılıyor**.
4. İlk kayıtta iOS kamera ve mikrofon izni soracak — **İzin ver** de.

> **Neden yalnız Safari:** iOS'ta Chrome ve Firefox aslında Safari motorunu
> kullanır ama **ses kaydını alamazlar** — video sessiz çıkar. Uygulama bunu
> zaten söylüyor (Uyumluluk panelinde yazılı), ama en baştan Safari ile
> başlamak en temizi.

**iPhone'da çalışmayan iki şey (kasıtlı, sebebi ekranda yazılı):**
- **Ses Stüdyosu ve müzik yatağı** — iOS'ta kayıt sırasında ses işlemek
  çekimi SESSİZ bırakıyor (ölçüldü). Bu yüzden orada kapalı.
- **Uygulama içinde video kesme** — Safari video akışı vermiyor. Uygulama
  "Fotoğraflar'da kırp" diye yol gösteriyor; orada kırpmak kalite de kaybettirmez.

---

## Android — **Chrome ile aç**

1. **Chrome**'da adresi aç.
2. Sağ üst menü → **Uygulamayı yükle** (ya da çıkan "Ana ekrana ekle" balonu).
3. Simgeden aç, kamera ve mikrofon izni sorulunca **İzin ver**.

Android'de **her şey çalışıyor**: 4K kayıt, ses stüdyosu, müzik yatağı,
yeşil ekran, uygulama içinde kesme, altyazı gömme.

---

## Mac — **iki seçenek var, ikisi de doğru**

**A) En kolay: tarayıcıda aç.** Safari ya da Chrome'da adresi aç. Kurulum yok.
Chrome'da adres çubuğundaki **Yükle** simgesiyle ayrı bir pencereye de alabilirsin.

**B) Masaüstü sürümü (telefonu kumanda olarak kullanmak için).**
`Teleprompter` klasöründeki **`Teleprompter Sunucu.command`** dosyasına çift tıkla.
Pencere açılır, tarayıcı `http://localhost:8080/` adresini kendi açar ve
kumanda için bir **QR** gösterir; telefonla okutunca telefon uzaktan kumanda olur
(başlat, durdur, hız, punto).

> ⚠️ **`Teleprompter Pro.html` dosyasına ÇİFT TIKLAMA.** O zaman adres `file://`
> olur ve **kumanda hiç çalışmaz** — tarayıcı o kipte sunucuya bağlanamıyor.
> Uygulama bunu ekranda da söylüyor. Kumanda istemiyorsan zaten (A) şıkkı daha kolay.

---

## Windows — **`Teleprompter Baslat.bat`**

1. `Teleprompter-Windows` klasörünü masaüstüne çıkar.
2. Python yoksa bir kez kur: https://www.python.org/downloads/ —
   kurulum ekranında **"Add Python to PATH"** kutusunu işaretle.
3. **`Teleprompter Baslat.bat`** dosyasına çift tıkla. Siyah pencere açılır,
   tarayıcı `http://localhost:8080/` adresini açar.
4. Windows ilk açılışta güvenlik duvarı uyarısı verebilir → **Erişime izin ver**
   (yalnız yerel ağ içindir).

Python kurmak istemiyorsan: Chrome ya da Edge'de doğrudan **canlı adresi** aç —
kayıt, altyazı ve kompozit orada da tam çalışır; yalnız telefon kumandası olmaz.

---

## İlk 5 dakikada denenecekler (sırayla)

1. **Metni yapıştır** → sufle akıyor mu, hız düğmeleri işe yarıyor mu.
2. **🎤 Sesle takip** → konuşurken metin seni takip ediyor mu, durduğunda duruyor mu.
3. **🎥 Kamera** → kendini görüyor musun, ışık uyarısı çıkıyor mu.
4. **Kayıt** → 20 saniye çek, durdur; sonuç ekranında video oynuyor mu.
5. **Altyazı** → sonuç ekranında "Altyazı dosyası"na bas, `.srt` iniyor mu;
   kompozit açıkken altyazı videoya gömülüyor mu.
6. **Klip önerileri** → sonuç ekranında öneriler çıkıyor mu, birine dokununca
   budama kutusu doluyor mu. (Kestikten sonra **↩ Tam çekim** ile geri dön,
   ikinci klibi de kesebilirsin.)
7. **Senaryolar** → listede "son değişiklik" ve "n çekim" yazıyor mu.

## Bir şey ters giderse

Uygulama sessiz kalmaz: her hata **Ayarlar → Diğer → Son hatalar** listesine
yazılıyor ve orada duruyor. Bana o listeden bir ekran görüntüsü ile
**hangi cihaz + hangi tarayıcı** bilgisini gönder; gerisini ben ölçerim.

## Bilerek yapılmayanlar (eksik değil, karar)

- **Hesap ve bulut yok** — senaryolar ve çekimler yalnız cihazda. Başka
  telefona geçmek istersen Senaryolar → **Dışa aktar** ile dosya olarak taşı.
- **Yapay zekâ yok** — altyazı tahmin edilmiyor, senaryodan üretiliyor; bu
  yüzden yazım her zaman doğru ve internet gerekmiyor.
- **Filigran yok, ücret yok, reklam yok.**
