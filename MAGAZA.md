# Sufle — Mağaza Metinleri

**Sürüm:** 9.39 · **Hazırlandı:** 15 Ağustos 2026 · **Son güncelleme:** 20 Ağustos 2026

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

## Sürüm notu (mağaza "Yenilikler" alanı, v9.39)

> Bu bölüm **ürün sürümüyle birlikte güncellenir**. 20 Ağustos 2026'da v9.39'a
> çekildi.

**TR:** Ayarlar artık Temel ve Gelişmiş olarak iki düzeyde: temel akışta uzman
kartları görünmüyor, hiçbir ayar kaybolmuyor ve arama her iki düzeyde de
hepsini buluyor. Güzellik (yüz yumuşatma) masaüstüne de geldi ve telefonla
aynı kaynaktan geliyor. Senaryolara etiket ve favori eklendi; favoriler
seçtiğin sıralamanın üstünde kalıyor. Masaüstünde elle pozlama, beyaz ayarı,
odak kilidi ve fener — kameran desteklemiyorsa hiç görünmüyorlar. Arayüz
metinlerinin tamamı tek kaynağa taşındı: dili değiştirdiğinde her ekran anında
değişiyor.

**EN:** Settings now come in two levels, Basic and Advanced: the basic flow
hides expert cards, nothing is lost, and search finds everything at either
level. Beauty (skin smoothing) reached the desktop and shares one source with
the phone. Scripts gained tags and favourites, and favourites sit on top of
your chosen sort order. On the desktop: manual exposure, white balance, focus
lock and torch — hidden entirely when your camera does not support them. Every
interface text now comes from a single source, so switching language updates
every screen instantly.

## Önceki sürüm notu (v9.34)

> Bu bölüm **ürün sürümüyle birlikte güncellenir**. 19 Ağustos 2026'da v9.34'e
> çekildi. Mağaza notu ile uygulamanın kendi sürüm notu ayrışırsa kullanıcı
> mağazada aylar önceki ürünü okur.

**TR:** Senaryolara etiket verebiliyorsun: başlığın altına virgülle yaz, listenin
üstündeki jetondan birine dokun, yalnız o etiketin senaryoları kalsın. Klasör
yerine etiket, çünkü aynı senaryo hem "Reels" hem "Müşteri A" olabilmeli.
Güzellik (yüz yumuşatma) eklendi — düz bulanıklık değil, göz, kaş ve dudak
sınırı olduğu gibi kalıyor. Sağ üstte saydam hızlı erişim: kamera çevir, ışık,
güzellik, yazı boyutu ve odak tek dokunuş uzakta. Masaüstünde elle pozlama,
beyaz ayarı, odak kilidi ve fener; kameran desteklemiyorsa hiç görünmüyorlar.

**EN:** Scripts can carry tags: type them comma-separated under the title, tap a
chip above the list and only that tag's scripts remain. Tags rather than folders,
because the same script should be able to be both "Reels" and "Client A". Added
beauty (skin smoothing) that is not a plain blur — eyes, brows and lip edges stay
intact. A translucent quick-access panel in the top right: flip camera, light,
beauty, text size and focus, one tap away. On the desktop, manual exposure, white
balance, focus lock and torch — hidden entirely when your camera does not support
them.

## Önceki sürüm notu (v9.30)

> Bu bölüm **ürün sürümüyle birlikte güncellenir**. v9.9'da kalmış hâli 18
> Ağustos 2026'da yenilendi: mağaza notu ile uygulamanın kendi sürüm notu
> ayrışırsa kullanıcı mağazada bir yıl önceki ürünü okur.

**TR:** iPhone'da çekimin bir süre sonra donması düzeltildi (sebep bellek değil,
sesle takibin ses oturumunu yeniden kurmasıydı). Arayüz baştan çizildi: konu
kutuları, ikonlu ayar kartları ve kamera açıkken görüntüyü kapatmayan cam ayar
paneli. Altı hazır çekim profili (Eğitim, Reels, YouTube, Satış, Haber, Cam rig)
oran, hız, okuma şeridi ve sesi tek dokunuşla kuruyor. Türkçe/English seçimi
artık uygulamanın içinde. Okuma zamanlamasından üretilen karaoke altyazı, marka
kiti, müzik yatağı, klip önerileri ve tek dosyalık yayın paketi eklendi.
Android'de sonuç ekranındaki video oynatıcının görünmediği hata giderildi.

**EN:** Fixed the iPhone recording freeze (the cause was not memory — voice
follow was rebuilding the audio session). The interface was redrawn: grouped
topic boxes, icon-led setting cards, and a glass settings panel that no longer
hides the camera. Six ready shooting profiles (Teaching, Reels, YouTube, Sales,
News, Glass rig) set aspect, speed, reading band and audio in one tap. Turkish /
English can now be switched inside the app. Added karaoke captions derived from
your own reading timing, a brand kit, a music bed, clip suggestions and a
one-file publishing package. Fixed the invisible result-screen video player on
Android.
