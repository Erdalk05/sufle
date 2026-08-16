# Sufle — Mağaza Metinleri

**Sürüm:** 9.9 · **Hazırlandı:** 15 Ağustos 2026

⚠️ **KURAL: bu dosyadaki her cümle uygulamada ÖLÇÜLEREK doğrulanmış bir
özelliğe dayanır.** Mağaza metni pazarlama değil **söz**dür; olmayan bir
şeyi yazmak, indiren kullanıcının ilk beş dakikada terk etmesi demektir.
Yeni bir cümle eklemeden önce özelliğin kullanıcıya açılan bir kapısı
olduğunu doğrulayın (`tests/131` bu disiplini kilitliyor).

---

## Uygulama adı

- **Tam ad:** Sufle — Teleprompter
- **Kısa ad (ana ekran):** Sufle
- **Paket kimliği önerisi:** `com.erdalkiziroglu.sufle`

## Kısa açıklama (Play Store, 80 karakter sınırı)

**TR:** `Telefonun önünde okurken çek. Sesle takip, hız denetimi, göz teması.`
(69 karakter)

**EN:** `Read while you record. Voice follow, pace control, real eye contact.`
(67 karakter)

## Alt başlık (App Store, 30 karakter sınırı)

**TR:** `Okurken çek, göz teması bozulmasın` → 34 karakter, **sığmıyor**.
Kullanılacak: `Okurken çek, gözün kamerada` (27 karakter)

**EN:** `Read on screen, look at lens` (28 karakter)

## Uzun açıklama — TR

**Kameraya bakarken metnini oku.**

Sufle, telefonunu ya da bilgisayarını bir sufle cihazına çeviriyor. Metnin
kameranın hemen altında akar, böylece okurken bile göz teması bozulmaz.

**Konuştukça akar.** Sesle takip açıkken sufle senin hızına uyar; duraksarsan
bekler, hızlanırsan yetişir. İstemezsen kapat, dakikadaki kelime (WPM) ile
sabit hızda aksın.

**Çekimi burada yaparsın.** Kamera ve mikrofon uygulamanın içinde: okurken
kaydedersin, ayrı bir uygulamaya geçmen gerekmez. Reels, Shorts, Story ve
YouTube oranları hazır; platform arayüzünün kapatacağı alanlar ekranda
işaretli, böylece yazın altyazı çubuğunun altında kalmaz.

**Okumayı kolaylaştıran araçlar.** Okuma şeridi, göz çizgisi, nefes işaretleri,
biyonik okuma ve disleksi yazı tipi. Yüksek kontrast teması ve hareket azaltma
tercihi destekleniyor.

**Çekimden sonrası da hazır.** Videoyu baştan ve sondan kesebilir, altyazı
dosyasını senaryodan üretebilirsin — sesi yeniden tanımaya gerek yok, metin
zaten elinde, bu yüzden yazım her zaman doğru.

**Kendi metinlerinle çalış.** Word dosyası (.docx), düz metin ve altyazı
dosyalarını doğrudan alır. Bütün senaryolarını tek dosyaya yedekleyip geri
yükleyebilirsin.

**Verilerin sende kalır.** Hesap yok, giriş yok, sunucumuz yok. Senaryoların ve
çekimlerin yalnız kendi cihazında durur. Tek istisna sesle takiptir:
açıkken konuşman tarayıcının kendi ses tanıma servisine gider; bu ayar
varsayılan olarak kapalıdır ve uygulamanın gizlilik bölümünde açıkça yazılıdır.

**Masaüstünde daha fazlası.** Harici kamera seçimi, kayıtta panellerin
kendiliğinden kapanması, telefonundan uzaktan kumanda ve kumanda ekranında
kameranın gördüğü kare — tek başına çekim yaparken kadrajını görebilirsin.
OBS ve vMix kullananlar için şeffaf zeminli yayın kipi var.

Arayüz Türkçe ve İngilizce.

**Altyazıda okuduğun kelime vurgulanır.** Altyazı senaryodan üretildiği için
kelime yazımı her zaman doğru; vurgu da tahmin değil, senin okuma anına
dayanıyor. Altı hazır görünüm (şerit, kutu, hap, şeritsiz, vurgu hapı, gölge),
üç vurgu animasyonu ve üç konum var. Görünümü **kendi kamera görüntünün
üstünde** küçük kartlara bakarak seçersin.

**Marka kitin çekime işlenir.** Logo (dört köşeden biri, boyutu ayarlanır),
marka rengi ve ad-unvan alt bandı. Alt bant kayıt başladıktan sonra birkaç
saniye görünüp kaybolur. Marka rengin koyuysa yazı okunur bir renge düşer,
şerit yine senin rengin kalır.

**Süreye sığdır.** Hedef süreyi ver, hız metni tam o sürede bitirecek şekilde
ayarlansın; duraklama işaretleri hesaba katılır. Sığmıyorsa sebebini söyler.

**Çekimden sonra klip önerileri.** Bölüm başlıkları, vurgu işaretleri ve okuma
zamanlarından kısa klipler önerilir; her öneri hangi ölçüme dayandığını yazar
ve başlıklar senaryodan birebir alınır — uydurma başlık yok.

**Müzik yatağı.** Cihazından seçtiğin müzik çekime karışır ve konuşurken
kendiliğinden kısılır. iPhone ve iPad'de bu özellik kapalı tutulur ve sebebi
uygulamada yazar: orada kayıt sırasında ses işleme çekimi sessiz bırakıyor.

**Sağdan sola diller.** Arapça, İbranice ve Farsça senaryolar doğru yönde akar;
yön satır satır belirlendiği için iki dilli senaryo bozulmaz.

**Rakiplerin ücretlendirdiği şeyler burada ücretsiz:** aynalama (cam rig),
gürültü kapısı ve uğultu kesmeyle temiz ses, altyazı üretimi, filigransız 4K,
sesle takip, ikinci cihazda önizleme ve sayısal WPM. Abonelik, hesap ve
filigran yok.

## Uzun açıklama — EN

**Read your script while looking at the lens.**

Sufle turns your phone or computer into a teleprompter. Your text scrolls just
under the camera, so your eye contact holds even while you read.

**It follows your voice.** With voice follow on, the prompter matches your
pace: it waits when you pause and catches up when you speed up. Prefer a fixed
pace? Turn it off and scroll by words per minute.

**Record right here.** Camera and microphone are built in, so you read and
record in one place. Reels, Shorts, Story and YouTube ratios are ready, and the
areas each platform covers with its own interface are marked on screen so your
text never ends up under a caption bar.

**Tools that make reading easier.** Reading band, eye line, breath marks,
bionic reading and a dyslexia typeface. High contrast theme and reduced motion
are supported.

**Ready for what comes after.** Trim the start and end of a take, and generate
a subtitle file straight from the script — no re-recognition needed, so the
spelling is always right.

**Bring your own text.** Word files (.docx), plain text and subtitle files
import directly. Back every script up into one file and restore it later.

**Your data stays with you.** No account, no sign-in, no server of ours. Your
scripts and recordings live only on your device. The one exception is voice
follow: while it is on, your speech goes to your browser's own speech
recognition service. It is off by default and stated plainly in the app's
privacy section.

**More on the desktop.** External camera selection, panels that clear
themselves while recording, remote control from your phone, and a live camera
preview on that remote so you can check your framing when shooting alone.
For OBS and vMix there is a transparent streaming mode.

Interface in Turkish and English.

**The word you read is highlighted in the caption.** Captions are generated
from your script, so the spelling is always right, and the highlight is not a
guess: it follows the moment you read the word. Six looks (band, box, pill, no
band, highlight pill, shadow), three highlight animations and three positions.
You pick the look from small cards drawn **over your own camera image**.

**Your brand kit is burned into the take.** A logo in any of the four corners
with adjustable size, a brand colour, and a lower third with your name and
title that appears for a few seconds after recording starts. If your brand
colour is dark the text falls back to a readable colour while the accent stripe
keeps your colour.

**Fit to duration.** Set a target length and the pace is set so the script ends
exactly then, pause marks included. If it does not fit, it says why.

**Clip suggestions after a take.** Short clips are proposed from section
headings, emphasis marks and reading times; every suggestion states which
measurement it rests on and titles are taken from your script word for word.

**Music bed.** Music from your device is mixed into the take and ducks by
itself while you speak. On iPhone and iPad it stays off and the app says why:
audio processing during a recording leaves the take silent there.

**Right to left languages.** Arabic, Hebrew and Persian scripts flow in the
correct direction, decided line by line, so a bilingual script does not break.

**What competitors charge for is free here:** mirroring for a glass rig, clean
audio with a noise gate and rumble cut, caption generation, 4K without a
watermark, voice follow, preview on a second device and a numeric WPM setting.
No subscription, no account, no watermark.

## Anahtar kelimeler

**TR:** sufle, teleprompter, sufle uygulaması, teleprompter programı, video
çekerken metin okuma, konuşma metni, sunum, içerik üretici, reels, shorts,
altyazı, göz teması

**EN:** teleprompter, prompter, script reader, video script, voice tracking
teleprompter, content creator, reels, shorts, subtitles, eye contact

## Kategori

- Play Store: **Video Oynatıcılar ve Düzenleyiciler** (ikincil: Verimlilik)
- App Store: **Photo & Video** (ikincil: Productivity)

## Yaş derecelendirmesi

**4+ / Herkes.** Uygulama kullanıcı içeriği barındırmaz, reklam içermez, veri
toplamaz, satın alma sunmaz.

## Ekran görüntüsü planı (henüz üretilmedi)

Altı kare, her biri **tek bir şeyi** anlatır — kalabalık ekran görüntüsü
hiçbir şey anlatmaz:

1. Sufle akarken, metin kameranın altında, yüz kadrajda → *"Okurken göz teması"*
2. Sesle takip açık, durum satırında `🎤 Sesle · tr-TR` → *"Konuştukça akar"*
3. Kayıt sürerken odak modu: sahne temiz, yalnız metin ve kayıt noktası
4. Reels güvenli alanları işaretli ekran → *"Yazın arayüzün altında kalmaz"*
5. Çekim sonrası budama ekranı → *"Baştan sondan kes"*
6. Masaüstü: sağ panel sekmeleri + telefonda uzak önizleme

## Sürüm notu (mağaza "Yenilikler" alanı, v9.9)

**TR:** Word dosyasından metin alma, senaryoları tek dosyaya yedekleme, odak ve
pozlama kilidi ve ekranda hangi modda olduğunu gösteren durum satırı eklendi.
Masaüstü sürümüne kamera seçimi, video budama, telefonda önizleme ve yayın
kipi geldi.

**EN:** Import text from Word, back every script up into one file, lock focus
and exposure, and see which mode you are in at a glance. The desktop version
gains camera selection, trimming, a phone preview and a streaming mode.
