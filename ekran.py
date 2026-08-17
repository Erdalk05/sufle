#!/usr/bin/env python3
"""ekran.py — mağaza ekran görüntülerini GERÇEK uygulamadan üretir.

Neden bir tezgâh: mağaza kareleri elle çekilirse her sürümde bayatlar ve
kimse fark etmez. Bu betik kareleri uygulamanın KENDİSİNDEN üretir; sürüm
değişince tek komutla yenilenirler.

ÖLÇÜLDÜ, varsayılmadı (2026-08-15, macOS, Chrome başsız):

  --window-size=430,932  ->  gerçek viewport 500x845   YALAN
  CDP Emulation ile 430x932  ->  gerçek viewport 430x932   DOĞRU

Başsız Chrome macOS'ta pencereyi 500 px'in altına indirmiyor ve kareyi
istenen boyuta KIRPIYOR. İlk denemede tam da bu yüzden "sağ kenar taşıyor,
düğme kesiliyor" diye gerçek olmayan bir kusur gördüm; iframe içinde
ölçünce yatay taşmanın 0 olduğu çıktı. Bu yüzden burada pencere boyutu
DEĞİL, `Emulation.setDeviceMetricsOverride` kullanılıyor ve her kareden
önce viewport'un istenen ölçüde olduğu DOĞRULANIYOR (uymazsa kare atılmaz,
hata verilir — yanlış ölçekte bir mağaza karesi sessizce reddedilir).

Bağımlılık yok: WebSocket istemcisi de aşağıda, standart kütüphaneyle.
Depo "sıfır bağımlılık" diyor; aracı da o sözü tutsun.

KAMERA: Chrome'un sahte kamerası dönen bir test deseni çiziyor. Kadrajında
insan olması gereken kareler bununla MAĞAZAYA KONULAMAZ; taslak üretilir ve
`--cekim <dosya.y4m>` ile Erdal'ın çekimi verildiğinde aynı komut mağazaya
hazır kareyi basar. Hangi karenin hangi durumda olduğu KARELER'de yazılı ve
üretilen `KARELER.md` bunu tekrar ediyor.

Kullanım:
  python3 ekran.py                 # hepsini üret
  python3 ekran.py --sadece 2,6    # yalnız bu kareler
  python3 ekran.py --cekim yuz.y4m # sahte kamera yerine gerçek çekim
"""

import base64
import http.client
import json
import os
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import time

REPO = os.path.dirname(os.path.abspath(__file__))
CIKTI = os.path.join(REPO, 'magaza', 'ekranlar')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

TELEFON = 'file://' + os.path.join(REPO, 'index.html')
MAC = 'file://' + os.path.join(REPO, 'mac', 'Teleprompter Pro.html').replace(' ', '%20')

# App Store 6.7" = 1290x2796 -> 430x932 @3x · Mac vitrini 1440x900 @2x
TEL = dict(w=430, h=932, dsf=3, mobil=True)
MAK = dict(w=1440, h=900, dsf=2, mobil=False)

# Onboarding sayfayı kaplıyor; her karede önce kapatılır.
KAPAT_ONB = """
 (document.querySelector('#onbLater')||{click(){}}).click();
 (document.querySelector('#newsX')||{click(){}}).click();
"""

# Sahnenin gerçekten açıldığı: giriş ekranı kapandı VE video karesi geldi.
# "intro gizlendi" tek başına yetmez — kamera reddedilirse de bir an gizlenir.
SAHNE_ACIK = ("getComputedStyle(document.querySelector('#intro')).display==='none'"
              " && !!document.querySelector('#stage')")
KAMERA_AKIYOR = SAHNE_ACIK + (
    " && (()=>{const v=document.querySelector('video');"
    "return !!v && v.videoWidth>0;})()")

KARELER = [
    dict(no=1, ad='01-okurken-goz-temasi', cihaz=TEL, url=TELEFON, kamera=True,
         magaza=False,  # kadrajda insan gerek
         baslik='Okurken göz teması',
         kur=KAPAT_ONB + """
 document.querySelector('#text').value =
   'Bugün size üç şey anlatacağım. Birincisi, kameraya bakarken okumak '+
   'öğrenilebilir bir şey. İkincisi, metnin nerede durduğu her şeyi değiştirir. '+
   'Üçüncüsü, doğru araçla bu iş ilk denemede tutuyor.';
 document.querySelector('#startCam').click();
""", bekle=KAMERA_AKIYOR),
    dict(no=2, ad='02-konustukca-akar', cihaz=TEL, url=TELEFON, kamera=False,
         magaza=True,  # kamerasız kip: kadrajda insan GEREKMİYOR
         baslik='Konuştukça akar',
         kur=KAPAT_ONB + """
 document.querySelector('#text').value =
   'Sesle takip açıkken sufle senin hızına uyar. Duraksarsan bekler, '+
   'hızlanırsan yetişir. İstemezsen kapatırsın, dakikadaki kelime ile '+
   'sabit hızda akar.';
 document.querySelector('#startNoCam').click();
""", bekle=SAHNE_ACIK),
    dict(no=3, ad='03-kayitta-odak-modu', cihaz=TEL, url=TELEFON, kamera=True,
         magaza=False,
         baslik='Kayıtta sahne temizlenir',
         kur=KAPAT_ONB + """
 document.querySelector('#text').value =
   'Kayıt başlayınca ekrandaki her şey çekilir; geriye yalnız metin ve '+
   'kayıt noktası kalır.';
 document.querySelector('#startCam').click();
""",
         # Kamera akmadan kaydı başlatmak anlamsız: iki aşamalı kurulum.
         sonra="document.querySelector('#recBtn').click()",
         bekle=KAMERA_AKIYOR,
         bekle2="document.body.classList.contains('rec')"),
    dict(no=4, ad='04-guvenli-alanlar', cihaz=TEL, url=TELEFON, kamera=True,
         magaza=False,
         baslik='Yazın arayüzün altında kalmaz',
         kur=KAPAT_ONB + """
 document.querySelector('#text').value =
   'Reels ve Shorts kendi düğmelerini ekranın altına koyuyor. Sufle o '+
   'alanları işaretliyor, böylece yazın kapanmıyor.';
 document.querySelector('#startCam').click();
""",
         # KULLANICI GİBİ SÜR: applyMode() sayfa kapsamında, dışarıdan
         # çağrılamıyor (ReferenceError ile ölçüldü). Zaten doğrusu da
         # düğmeye basmak — kare böylece gerçek kullanıcı yolunu gösteriyor.
         sonra="document.querySelector('#modeSeg button[data-mode=reels]').click()",
         bekle=KAMERA_AKIYOR,
         bekle2="document.body.classList.contains('safeOn')"),
    dict(no=5, ad='05-bastan-sondan-kes', cihaz=TEL, url=TELEFON, kamera=True,
         magaza=False,
         baslik='Baştan sondan kes',
         kur=KAPAT_ONB + """
 document.querySelector('#text').value = 'Çekim bitti; başındaki ve '+
   'sonundaki fazlalığı burada kesersin.';
 document.querySelector('#startCam').click();
""",
         # Budama ekranı GERÇEK bir çekim ister: kaydet, durdur, sonra aç.
         # Sahte veriyle açılan bir budama ekranı ürünü temsil etmez.
         # Hepsi arayüzden: kayıt düğmesi → dur → "Kes" düğmesi. Sayfa
         # kapsamındaki fonksiyonlar dışarıdan çağrılamıyor ve zaten
         # çağrılmamalı — kare kullanıcının yürüdüğü yolu göstersin.
         sonra=("const b=document.querySelector('#recBtn'); b.click();"
                " await new Promise(r=>setTimeout(r,4000)); b.click();"
                " await new Promise(r=>setTimeout(r,3500));"
                " document.querySelector('#editBtn').click();"),
         sonra_async=True,
         bekle=KAMERA_AKIYOR,
         bekle2="!document.querySelector('#trimBox').classList.contains('hidden')"),
    dict(no=6, ad='06-masaustu-paneller', cihaz=MAK, url=MAC, kamera=False,
         magaza=True,  # masaüstü panelleri: kamera gerekmiyor
         baslik='Masaüstünde daha fazlası',
         kur="""
 (document.querySelector('#newsX')||{click(){}}).click();
 const e=document.querySelector('#editor');
 if(e) e.value='Masaüstü sürümünde sağ panel üç sekmeye ayrıldı: metin, '+
   'çekim ve ayarlar. Kayıt başlayınca panellerin hepsi kendiliğinden '+
   'kapanıyor, bitince geri geliyor.';
""", bekle="!!document.querySelector('#rtabs')"),
]


# ---------------------------------------------------------------- WebSocket
class WS:
    """Asgari RFC6455 istemcisi. CDP tek çerçeveli metin mesajı kullanıyor;
       maskeleme ZORUNLU (sunucu maskesiz çerçeveyi kapatır)."""

    def __init__(self, url):
        _, rest = url.split('://', 1)
        host_port, _, yol = rest.partition('/')
        host, _, port = host_port.partition(':')
        self.s = socket.create_connection((host, int(port or 80)), timeout=30)
        anahtar = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((
            'GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\n'
            'Connection: Upgrade\r\nSec-WebSocket-Key: %s\r\n'
            'Sec-WebSocket-Version: 13\r\n\r\n' % (yol, host_port, anahtar)).encode())
        tampon = b''
        while b'\r\n\r\n' not in tampon:
            p = self.s.recv(4096)
            if not p:
                raise RuntimeError('el sıkışma kesildi')
            tampon += p
        if b'101' not in tampon.split(b'\r\n')[0]:
            raise RuntimeError('WebSocket reddedildi: ' + tampon.split(b'\r\n')[0].decode())
        self.kalan = tampon.split(b'\r\n\r\n', 1)[1]

    def _al(self, n):
        while len(self.kalan) < n:
            p = self.s.recv(65536)
            if not p:
                raise RuntimeError('bağlantı kapandı')
            self.kalan += p
        v, self.kalan = self.kalan[:n], self.kalan[n:]
        return v

    def gonder(self, metin):
        veri = metin.encode()
        b = bytearray([0x81])
        n = len(veri)
        if n < 126:
            b.append(0x80 | n)
        elif n < 65536:
            b.append(0x80 | 126); b += struct.pack('>H', n)
        else:
            b.append(0x80 | 127); b += struct.pack('>Q', n)
        maske = os.urandom(4)
        b += maske
        b += bytes(veri[i] ^ maske[i % 4] for i in range(n))
        self.s.sendall(bytes(b))

    def oku(self):
        """Parçalı çerçeveleri birleştirir: ekran görüntüsü base64'ü büyük ve
           Chrome onu tek çerçevede göndermeyebiliyor."""
        parcalar = b''
        while True:
            b0, b1 = self._al(2)
            son, opkod = b0 & 0x80, b0 & 0x0F
            n = b1 & 0x7F
            if n == 126:
                n = struct.unpack('>H', self._al(2))[0]
            elif n == 127:
                n = struct.unpack('>Q', self._al(8))[0]
            govde = self._al(n)
            if opkod == 0x8:
                raise RuntimeError('sunucu kapattı')
            if opkod == 0x9:      # ping -> pong
                continue
            parcalar += govde
            if son:
                return parcalar.decode()


class Tarayici:
    def __init__(self, cekim=None):
        self.profil = tempfile.mkdtemp(prefix='sufle-ekran-')
        self.port = self._bos_port()
        bayraklar = [
            CHROME, '--headless=new', '--no-first-run',
            # WEBGL YAZILIMLA ÇİZİLİYOR: `--disable-gpu` tek başınayken WebGL
            # bağlamı hiç kurulamıyordu ve kompozit (yakılmış altyazı, marka,
            # yeşil ekran) başsız tarayıcıda ÖLÇÜLEMİYORDU — bu deponun en yeni
            # özellikleri tam da orada yaşıyor. SwiftShader ile bağlam kuruluyor.
            '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
            '--no-default-browser-check', '--hide-scrollbars',
            '--allow-file-access-from-files',
            '--use-fake-ui-for-media-stream',
            '--autoplay-policy=no-user-gesture-required',
            '--user-data-dir=' + self.profil,
            '--remote-debugging-port=%d' % self.port,
            'about:blank',
        ]
        # ÖLÇÜLDÜ (2026-08-16): dosyadan sahte görüntü verilirken sahte CİHAZ
        # bayrağı düşürülüyordu ve `getUserMedia({video,audio})` TÜMDEN
        # başarısız oluyordu ("kamera izni yok" toastu). Yani hazır görüntüyle
        # yapılan her ölçüm aslında KAMERASIZ koşuyordu ve bunu kimse görmedi.
        # Doğrusu ikisi birlikte: cihaz sahte, görüntü dosyadan.
        bayraklar.insert(-1, '--use-fake-device-for-media-stream')
        if cekim:
            bayraklar.insert(-1, '--use-file-for-fake-video-capture=' + cekim)
        self.p = subprocess.Popen(bayraklar, stdout=subprocess.DEVNULL,
                                  stderr=subprocess.DEVNULL)
        self.ws = WS(self._hedef_ws())
        self.sayac = 0

    @staticmethod
    def _bos_port():
        s = socket.socket()
        s.bind(('127.0.0.1', 0))
        p = s.getsockname()[1]
        s.close()
        return p

    def _hedef_ws(self):
        son = None
        for _ in range(100):
            try:
                c = http.client.HTTPConnection('127.0.0.1', self.port, timeout=2)
                c.request('GET', '/json/list')
                sayfalar = json.loads(c.getresponse().read())
                for s in sayfalar:
                    if s.get('type') == 'page' and s.get('webSocketDebuggerUrl'):
                        return s['webSocketDebuggerUrl']
            except Exception as e:      # Chrome henüz dinlemiyor
                son = e
            time.sleep(0.2)
        raise RuntimeError('Chrome hata ayıklama portu açılmadı: %s' % son)

    def cagir(self, yontem, **p):
        self.sayac += 1
        self.ws.gonder(json.dumps({'id': self.sayac, 'method': yontem, 'params': p}))
        while True:
            c = json.loads(self.ws.oku())
            if c.get('id') == self.sayac:
                if 'error' in c:
                    raise RuntimeError('%s: %s' % (yontem, c['error']))
                return c.get('result', {})

    def js(self, kod):
        r = self.cagir('Runtime.evaluate', expression=kod, awaitPromise=True,
                       returnByValue=True)
        if 'exceptionDetails' in r:
            raise RuntimeError('JS: ' + json.dumps(r['exceptionDetails'])[:400])
        return r.get('result', {}).get('value')

    def kapat(self):
        try:
            self.p.terminate(); self.p.wait(timeout=10)
        except Exception:
            self.p.kill()
        shutil.rmtree(self.profil, ignore_errors=True)


def kare_uret(t, k):
    c = k['cihaz']
    t.cagir('Emulation.setDeviceMetricsOverride', width=c['w'], height=c['h'],
            deviceScaleFactor=c['dsf'], mobile=c['mobil'])
    t.cagir('Page.navigate', url=k['url'])
    time.sleep(3.0)

    # ÖLÇMEYEN TEZGÂH OLMASIN: viewport gerçekten istenen ölçüde mi?
    olculen = t.js('document.documentElement.clientWidth+"x"+'
                   'document.documentElement.clientHeight')
    istenen = '%dx%d' % (c['w'], c['h'])
    if olculen != istenen:
        raise RuntimeError('viewport %s istendi, %s ölçüldü — kare atılmadı'
                           % (istenen, olculen))

    t.js(k['kur'])

    # HEDEF DURUM DOĞRULANIR, VARSAYILMAZ.
    # Toplu koşuda dört kare sessizce GİRİŞ EKRANINI bastı: kurulum betiği
    # çalıştı ama uygulama henüz o duruma geçmemişti (soğuk açılış yarışı ve
    # bir önceki karenin kamerayı bırakmamış olması). Kare yine üretildi,
    # boyutu bile makuldü — kimse fark etmezdi. Artık beklenen durum bir JS
    # ifadesiyle YOKLANIYOR; varılamazsa kare ATILMIYOR, hata veriliyor.
    son = None
    for _ in range(60):
        try:
            if t.js(k['bekle']):
                break
        except Exception as e:
            son = e
        time.sleep(0.5)
    else:
        raise RuntimeError('kare %d hedef duruma varmadı (%s) son hata: %s'
                           % (k['no'], k['bekle'][:60], son))
    time.sleep(1.2)   # akış oturana kadar

    # İKİNCİ AŞAMA: ilk durum kurulmadan yapılamayacak şeyler (kaydı başlat,
    # kipi değiştir, budamayı aç). Tek blokta yapılsaydı kamera daha akmadan
    # çalışır ve sessizce hiçbir şey olmazdı — bu turda dört kare tam olarak
    # böyle aynı çıktı.
    if k.get('sonra'):
        kod = k['sonra']
        t.js('(async()=>{%s})()' % kod if k.get('sonra_async') else kod)
        son2 = None
        for _ in range(60):
            try:
                if t.js(k['bekle2']):
                    break
            except Exception as e:
                son2 = e
            time.sleep(0.5)
        else:
            raise RuntimeError('kare %d ikinci duruma varmadı (%s) son hata: %s'
                               % (k['no'], k['bekle2'][:60], son2))
        time.sleep(1.0)

    # YATAY KAYAN KAPSAYICI TAŞMA DEĞİLDİR (2026-08-17'de ölçülerek bulundu).
    # Eski kural "sağ kenarı viewport'u geçen her öge" diyordu ve altyazı
    # önizleme şeridini (`.kartlar`, overflow-x:auto) 12 ihlal olarak sayıyordu:
    # şerit TASARIM GEREĞİ yana kayıyor, sayfa kaymıyor. Ölçüldü: sayfanın
    # scrollWidth'i 390, clientWidth'i 390 — yani kullanıcı için hiçbir şey
    # taşmıyordu. Aracın yalancı alarmı, bu depoda kovalanan sahte kusurların
    # bilinen kaynağı; ölçüt artık İKİ parçalı: (1) sayfanın kendisi yatay
    # kayıyor mu, (2) taşan öge yatay kayan bir kapsayıcının İÇİNDE değil mi.
    tasan = t.js("""(()=>{
      const de=document.documentElement;
      const kayanIcinde=e=>{
        for(let p=e.parentElement;p;p=p.parentElement){
          const s=getComputedStyle(p);
          if(s.overflowX==='auto'||s.overflowX==='scroll'||s.overflowX==='hidden') return true;
        }
        return false;
      };
      const n=[...document.querySelectorAll('*')].filter(e=>{
        const b=e.getBoundingClientRect();
        return b.width>0 && b.right>de.clientWidth+0.5 && !kayanIcinde(e);
      }).length;
      // Sayfanın kendisi yatay kayıyorsa bu her hâlükârda kusurdur.
      return n + (de.scrollWidth>de.clientWidth+0.5 ? 1 : 0);
    })()""")

    # ÇAKIŞAN KUMANDA SAYACI (T53). Erdal ekran görüntüsüyle bildirdi: hız hapı,
    # durum satırı ve kumanda çubuğu birbirinin üstüne biniyordu — üstelik AYNI
    # KUSUR v8.6'da da olmuş ve düzeltmesi piksel değeriyle kilitlenmişti, o
    # yüzden ikinci kez sessizce geri geldi. Sayı artık HER KAREDE ölçülüyor:
    # kaynak düzeyi bir test bunu göremez, ancak çizilmiş ekran gösterir.
    cakisan = t.js("""(()=>{
      const gor=e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();
        return s.display!=='none'&&s.visibility!=='hidden'&&parseFloat(s.opacity)>0.1
               &&b.width>2&&b.height>2;};
      /* Yalnız KUMANDA katmanları: metin akışı ve kamera görüntüsü bilerek
         üst üste (sufle zaten görüntünün üstünde duruyor). */
      /* TAM EKRAN KAPLAYAN ÖGE KUMANDA DEĞİLDİR. İlk koşuda 5 "çakışma"
         çıktı ve beşi de `#recFrame` ile: o bir kayıt ÇERÇEVESİ, sahneyi
         baştan sona kaplıyor ve her şeyin üstünde durması TASARIM. Onu
         çakışma saymak, aracın kendisinin yalancı alarm vermesi olurdu —
         bu oturumda benzerine iki kez düştüm. */
      const vpA=innerWidth*innerHeight;
      /* `.tapnote` 2026-08-17'de listeye eklendi: yatay ekranda hız hapının
         TAM ÜSTÜNE biniyordu ve dedektör onu hiç ölçmediği için kapı sessiz
         kaldı. Ölçmeyen dedektör, olmayan kusuru değil GERÇEK kusuru kaçırır. */
      const list=[...document.querySelectorAll('#speedCtl,#hud,#hud>span,#bar,#audBadge,#recFrame,.tapnote')]
        .filter(gor)
        .filter(e=>{const b=e.getBoundingClientRect(); return (b.width*b.height) < vpA*0.8;});
      let n=0;
      for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
        const a=list[i],b=list[j];
        if(a.contains(b)||b.contains(a)) continue;
        const A=a.getBoundingClientRect(),B=b.getBoundingClientRect();
        const x=Math.max(0,Math.min(A.right,B.right)-Math.max(A.left,B.left));
        const y=Math.max(0,Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top));
        if(x>4&&y>4) n++;}
      return n;})()""")

    png = t.cagir('Page.captureScreenshot', format='png')['data']
    yol = os.path.join(CIKTI, k['ad'] + ('.png' if k['magaza'] else '.taslak.png'))
    with open(yol, 'wb') as f:
        f.write(base64.b64decode(png))
    return yol, tasan, cakisan


def main():
    argv = sys.argv[1:]
    cekim = None
    sadece = None
    if '--cekim' in argv:
        cekim = os.path.abspath(argv[argv.index('--cekim') + 1])
        if not os.path.exists(cekim):
            sys.exit('Çekim dosyası yok: ' + cekim)
    if '--sadece' in argv:
        sadece = {int(x) for x in argv[argv.index('--sadece') + 1].split(',')}

    if not os.path.exists(CHROME):
        sys.exit('Chrome bulunamadı: ' + CHROME)
    os.makedirs(CIKTI, exist_ok=True)

    isteneler = [k for k in KARELER if sadece is None or k['no'] in sadece]
    sonuc = []
    kirmizi = [False]
    for k in isteneler:
        # KARE BAŞINA TEMİZ TARAYICI. Aynı örneği yeniden kullanınca bir
        # önceki karenin kamera akışı serbest kalmıyordu ve sonraki kare
        # sessizce giriş ekranında kalıyordu. Altı açılışın bedeli, sessizce
        # yanlış bir mağaza karesinin bedelinden ucuz.
        t = Tarayici(cekim)
        try:
            yol, tasan, cakisan = kare_uret(t, k)
            boy = os.path.getsize(yol)
            durum = 'MAĞAZAYA HAZIR' if (k['magaza'] or cekim) else 'TASLAK (çekim gerek)'
            print('  %d · %-24s %s · %d bayt · taşan %d · çakışan kumanda %d'
                  % (k['no'], k['ad'], durum, boy, tasan, cakisan))
            sonuc.append((k, yol, tasan))
            if tasan:
                print('     ⚠ %d öge viewport dışına taşıyor' % tasan)
            if cakisan:
                print('     ⛔ %d kumanda çifti ÜST ÜSTE BİNİYOR' % cakisan)
                kirmizi[0] = True
        finally:
            t.kapat()

    hazir = sum(1 for k, _, _ in sonuc if k['magaza'] or cekim)
    print('\n%d kare üretildi · %d mağazaya hazır · %d taslak'
          % (len(sonuc), hazir, len(sonuc) - hazir))
    if not cekim:
        print('Taslakları mağazaya hazır hâle getirmek için:'
              '  python3 ekran.py --cekim <yuz.y4m>')
    if kirmizi[0]:
        print('\n⛔ ÇAKIŞAN KUMANDA VAR — düzen kırık')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
