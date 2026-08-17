const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,macYolu}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/<!--[\s\S]*?-->/g,'');

/* GİRİŞ EKRANI (2026-08-17 yenilendi).

   Eski hâlde DÖRT düğme alt alta duruyordu ve hepsi aynı görsel ağırlıktaydı:
   "Kamerayı Aç & Başla", "Kamerasız sadece sufle", "Ana ekrana ekle",
   "Nasıl kullanılır?". Uygulamayı ilk açan kişi, daha hiçbir şey görmeden
   dört yol arasından seçim yapmak zorunda kalıyordu.

   Yeni düzen üç bölge: KİMLİK (marka + tek cümle) · EYLEM (bir asıl, bir
   ikincil) · GÜVEN ve üçüncül işler. Sürüm numarası marka yazısının altından
   en alt satıra indi: kullanıcının ilk okuyacağı şey değil.

   ROZETLER SÜS DEĞİL: üçü de üründe DOĞRULANABİLİR vaat. Bu dosya onları
   koda karşı sınıyor — bir gün biri "Bulut senkron" rozeti eklerse ya da
   ürüne hesap/ücret/ağ girerse kapı kırmızı verir. Vaadi ekranda yazmak
   kolay; burada yazılı olan, o vaadin ölçülmesi. */

/* ---------- YERLEŞİM: TEK ASIL EYLEM ---------- */
{
  const giris=tel.slice(tel.indexOf('<div id="intro">'), tel.indexOf('<!-- AYARLAR -->'));
  ok('giriş ekranı bulundu', giris.length>200);
  const dolu=(giris.match(/class="big"/g)||[]).length;
  ok('giriş ekranında tek dolu eylem var ('+dolu+')', dolu===1);
  const hayalet=(giris.match(/class="ghostbig"/g)||[]).length;
  ok('ikincil yol tek ('+hayalet+')', hayalet===1);
  /* Üçüncül işler artık büyük düğme değil, metin satırı. */
  ok('yardım ve kurulum metin düğmesine indi',
     /class="metinBtn hidden" id="installBtn"/.test(giris) &&
     /class="metinBtn" id="helpBtn"/.test(giris));
  ok('sürüm numarası en alt satırda', giris.indexOf('id="verChip"') > giris.indexOf('id="helpBtn"'));
  ok('marka ve tek cümle üstte',
     giris.indexOf('<h1>') < giris.indexOf('id="startCam"') &&
     giris.indexOf('data-i18n="introP"') < giris.indexOf('id="startCam"'));
  /* Metin düğmesi küçük görünür ama dokunma hedefi 44 px olmalı (çubuk
     düğmelerindeki kuralın aynısı: görünmez örtü). */
  ok('metin düğmesinin dokunma hedefi 44 px', /\.metinBtn::after\{[^}]*height:44px/.test(tel));
}

/* ---------- ROZETLER: ÜÇÜ DE DOĞRULANABİLİR ---------- */
{
  const mac=oku(macYolu());
  const temiz=(tel+mac).replace(/\/\*[\s\S]*?\*\//g,'').replace(/<!--[\s\S]*?-->/g,'');
  ok('üç rozet de ekranda', /data-i18n="rozHesap"/.test(tel) &&
     /data-i18n="rozNet"/.test(tel) && /data-i18n="rozUcret"/.test(tel));
  for(const k of ['rozHesap','rozNet','rozUcret'])
    ok('"'+k+'" iki dilde tanımlı', (tel.match(new RegExp(k+":'","g"))||[]).length===2);

  /* 1) HESAP YOK */
  ok('rozet doğru: hesap/giriş kodu yok',
     !/signIn|signUp|createAccount|oturum aç|logout|oauth/i.test(temiz));
  /* 2) İNTERNET GEREKMEZ — dış adrese çağrı yok ve çevrimdışı katman var */
  ok('rozet doğru: dış adrese ağ çağrısı yok',
     !/fetch\(['"]https?:\/\//.test(temiz) && !/new WebSocket\(/.test(temiz));
  ok('rozet doğru: çevrimdışı katman gerçekten var (service worker)',
     /serviceWorker\.register/.test(kod));
  /* 3) ÜCRETSİZ */
  /* ⚠️ DESEN ÖDEMEYE ÖZGÜ OLMALI. İlk yazımda `stripe` kelimesini arıyordum
     ve İngilizce sürüm notundaki "accent stripe" (vurgu şeridi) ifadesine
     takıldı: ürün tertemizken kırmızı verdi. tests/128'deki "import ... from"
     tuzağının aynısı — düz metinde geçen bir kelime kanıt değildir. */
  const ODEME = /stripe\.com|paddle\.com|createCheckout|in-app-purchase|StoreKit|billingClient|purchase\(|paywall/i;
  ok('rozet doğru: ödeme/paywall kodu yok', !ODEME.test(temiz));
  /* Rozet sayısı sabit kalmalı: dördüncü bir rozet eklenirse o da burada
     ölçülmek zorunda — ekranda vaat, testte kanıt. */
  const giris=tel.slice(tel.indexOf('<div id="introRozet">'), tel.indexOf('<div id="introAlt">'));
  ok('rozet sayısı üç (her rozetin kanıtı bu dosyada)',
     (giris.match(/<span data-i18n="/g)||[]).length===3);
}
