#!/usr/bin/env python3
"""ÇEKİM AKIŞI UÇTAN UCA — gerçek tarayıcıda, sahte kamerayla.

   NEDEN VAR: kapının dokuz adımı da KAYNAĞI ölçüyordu. Kullanıcının yaptığı
   şey ise tek bir zincir: kamerayı aç → kaydet → durdur → sonucu gör →
   altyazıyı al. Bu zincirin herhangi bir halkası koptuğunda testlerin hepsi
   yeşil kalabilir, çünkü her biri kendi parçasını ölçüyor.

   Erdal uygulamayı kendinde ve yakınlarında denemeye başlıyor; "bende
   çalışmadı" ile "kodda kırık" arasındaki farkı önceden ayıran ölçüm bu.

   Ölçülen (gerçek Chrome, 430x932, sahte kamera+mikrofon):
     · kamera açılıyor ve akış geliyor
     · kayıt başlıyor (gövde 'rec' sınıfı, sayaç KAYITTA)
     · kayıt duruyor, sonuç ekranı açılıyor ve videonun kaynağı var
     · altyazı senaryodan üretiliyor
     · çekim IndexedDB arşivine yazılıyor
     · hata günlüğü BOŞ kalıyor (sessiz istisna yok)

   Kamera açılışı 2,5 saniyede bitmiyor — ilk ölçümde bu yüzden "akış yok"
   sanmıştım; kusur üründe değil ölçümdeydi. Bekleme süreleri o yüzden bol.
"""
import json
import os
import sys
import tempfile
import time

from ekran import Tarayici, KAPAT_ONB

TELEFON = 'file:///Users/erdalkiziroglu/Desktop/.sufle-deploy/index.html'


def js(t, kod, ad):
    try:
        return json.loads(t.js(kod))
    except Exception as e:
        print('  ✗ %s ölçülemedi: %s' % (ad, str(e)[:90]))
        return None


def main(argv):
    adres = argv[0] if argv else TELEFON
    t = Tarayici()
    kirik = 0
    try:
        t.cagir('Page.enable')
        t.cagir('Emulation.setDeviceMetricsOverride', width=430, height=932,
                deviceScaleFactor=2, mobile=True)
        t.cagir('Page.navigate', url=adres)
        time.sleep(2.5)
        try:
            t.js(KAPAT_ONB)
        except Exception:
            pass
        time.sleep(0.5)

        # 1) KAMERA
        t.js("document.querySelector('#startCam').click()")
        time.sleep(4.5)
        kam = js(t, """JSON.stringify({
          akis: !!(document.querySelector('#cam')||{}).srcObject,
          introGizli: document.querySelector('#intro').classList.contains('hidden'),
          barAcik: !document.querySelector('#bar').classList.contains('hidden')
        })""", 'kamera')
        if not kam or not kam['akis'] or not kam['introGizli']:
            print('  ✗ kamera açılmadı:', kam); kirik += 1
        else:
            print('  ✓ kamera açıldı, giriş ekranı kapandı, kumanda çubuğu geldi')

        # 2) KAYIT BAŞLIYOR
        # SIRA ÖNEMLİ (ölçüldü): önce sufle akışı, sonra kayıt. Altyazı ancak
        # kelimeler okuma çizgisinden geçtikçe üretiliyor; akış başlatılmazsa
        # uygulama DOĞRU davranıp "altyazı yok, sufle akmamış" diyor. Kayıt
        # başladıktan SONRA akışı başlatmak ise kaydı düşürüyordu — ilk iki
        # denememde ürün kusuru sandığım şey ölçüm sırasının kendisiydi.
        t.js("(()=>{ const b=document.querySelector('#playBtn'); if(b) b.click(); })()")
        time.sleep(1.2)
        t.js("document.querySelector('#recBtn').click()")
        time.sleep(3.5)
        rec = js(t, """JSON.stringify({
          rec: document.body.classList.contains('rec'),
          etiket: (document.querySelector('#recLbl')||{textContent:''}).textContent.trim()
        })""", 'kayıt')
        if not rec or not rec['rec']:
            print('  ✗ kayıt başlamadı:', rec); kirik += 1
        else:
            print('  ✓ kayıt başladı (%s)' % rec['etiket'])

        # 3) KAYIT DURUYOR, SONUÇ EKRANI
        t.js("document.querySelector('#recBtn').click()")
        time.sleep(5)
        son = js(t, """JSON.stringify({
          sonucAcik: !!document.querySelector('#result.open'),
          videoVar: !!(document.querySelector('#resultVid')||{}).src,
          altyazi: (document.querySelector('#capInfo')||{textContent:''}).textContent.trim(),
          hata: (()=>{ try{ return JSON.parse(localStorage.getItem('sufle_v2_err')||'[]').length; }
                       catch(e){ return -1; } })()
        })""", 'sonuç')
        if not son or not son['sonucAcik'] or not son['videoVar']:
            print('  ✗ sonuç ekranı gelmedi:', son); kirik += 1
        else:
            print('  ✓ sonuç ekranı açıldı ve videonun kaynağı var')
        if son and 'altyazı satırı hazır' not in son['altyazi']:
            print('  ✗ altyazı üretilmedi: %r' % (son['altyazi'][:60] if son else None)); kirik += 1
        elif son:
            print('  ✓ %s' % son['altyazi'][:60])
        if son and son['hata'] != 0:
            icerik = js(t, """JSON.stringify((()=>{ try{
              return JSON.parse(localStorage.getItem('sufle_v2_err')||'[]').slice(-3)
                       .map(h=>h.where+': '+String(h.msg).slice(0,70));
            }catch(e){ return ['okunamadı']; } })())""", 'hata içeriği')
            print('  ✗ hata günlüğü boş değil (%s kayıt): %s' % (son['hata'], icerik)); kirik += 1
        elif son:
            print('  ✓ hata günlüğü boş (sessiz istisna yok)')

        # 4) ARŞİV
        time.sleep(1.5)
        ars = js(t, """(async () => {
          const db = await new Promise(res=>{ const r=indexedDB.open('sufle',1);
            r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); });
          if(!db) return JSON.stringify({cekim:-1});
          const n = await new Promise(res=>{ const q=db.transaction('takes').objectStore('takes').count();
            q.onsuccess=()=>res(q.result); q.onerror=()=>res(-1); });
          return JSON.stringify({cekim:n});
        })()""", 'arşiv')
        if not ars or ars['cekim'] < 1:
            print('  ✗ çekim arşive yazılmadı:', ars); kirik += 1
        else:
            print('  ✓ çekim arşive yazıldı (%d kayıt)' % ars['cekim'])
    finally:
        t.kapat()

    kirik += kompozit(adres)
    kirik += marka(adres)
    kirik += yesil_ekran(adres)

    print()
    print('✅ çekim akışı uçtan uca çalışıyor' if not kirik
          else '⛔ ÇEKİM AKIŞI KIRIK — %d halka' % kirik)
    return 1 if kirik else 0


def kompozit(adres):
    """ALTYAZI GERÇEKTEN VİDEOYA GÖMÜLÜYOR MU — çıktı tuvalinden ölçülüyor.

       FAZ G'nin amiral özelliği bu ve bugüne kadar yalnız PARÇALARI ölçülüyordu
       (tema tablosu, karaoke hesabı, çizim yardımcıları). "Kayıt sırasında
       altyazı videoya yazılıyor" cümlesi hiç uçtan uca kanıtlanmamıştı.

       Ölçüm A/B: gömme AÇIKken kompozit çıktı tuvalinde parlak (beyaz) piksel
       olmalı ve bunlar karenin ALT BEŞTE BİRİNDE yoğunlaşmalı; gömme KAPALIyken
       o tuval hiç boyutlandırılmamalı (kapalı özellik bellek de tüketmemeli —
       bu depoda bir kez 15,8 MB'lık ölü tampon olarak ölçüldü).

       Başsız tarayıcıda WebGL, SwiftShader ile açıldı; onsuz kompozit hiç
       kurulamıyordu ve bu yüzden yıllardır ölçüm dışıydı."""
    kirik = 0
    for gomme in (True, False):
        t = Tarayici()
        try:
            t.cagir('Page.enable')
            t.cagir('Emulation.setDeviceMetricsOverride', width=430, height=932,
                    deviceScaleFactor=2, mobile=True)
            t.cagir('Page.navigate', url=adres)
            time.sleep(2.5)
            try:
                t.js(KAPAT_ONB)
            except Exception:
                pass
            time.sleep(0.4)
            t.js("document.querySelector('#startCam').click()")
            time.sleep(4.5)
            t.js("[...document.querySelectorAll('.sw')].find(s=>s.dataset.t==='comp').click()")
            time.sleep(2.5)
            if gomme:
                t.js("[...document.querySelectorAll('.sw')].find(s=>s.dataset.t==='burnCaps').click()")
                time.sleep(1.2)
            t.js("document.querySelector('#recBtn').click()")
            time.sleep(3)
            r = None
            # ALTYAZI ANLIK: kelime okuma çizgisinden geçtiği SÜREDE çiziliyor.
            # Tek kare örneklemek kararsız sonuç veriyordu (aynı kod bir koşuda
            # 819 piksel, diğerinde 0). Doğru iddia "çekim boyunca bir noktada
            # gömülüyor mu" — o yüzden birkaç saniye ÖRNEKLENİYOR.
            for _ in range(12):
                r = js(t, """(() => {
                  const oc=document.querySelector('#compOut');
              if(!oc) return JSON.stringify({tuval:false});
              const x=oc.getContext('2d');
              if(oc.width<10) return JSON.stringify({tuval:true, en:oc.width, beyaz:0, altta:0});
              const d=x.getImageData(0,0,oc.width,oc.height).data;
              let beyaz=0, altta=0;
              for(let i=0;i<d.length;i+=4){
                if(d[i]+d[i+1]+d[i+2] > 690){
                  beyaz++;
                  if(Math.floor((i/4)/oc.width) > oc.height*0.6) altta++;
                }
              }
              return JSON.stringify({tuval:true, en:oc.width, boy:oc.height, beyaz:beyaz, altta:altta});
                })()""", 'kompozit çıktı')
                if r and r.get('beyaz', 0) >= 100:
                    break
                time.sleep(0.5)
            t.js("document.querySelector('#recBtn').click()")
            time.sleep(1)
            if gomme:
                if not r or r.get('beyaz', 0) < 100:
                    print('  ✗ altyazı videoya GÖMÜLMEDİ (parlak piksel %s)' %
                          (r.get('beyaz') if r else '?')); kirik += 1
                elif r['altta'] < r['beyaz'] * 0.6:
                    print('  ✗ gömülen altyazı alt şeritte değil (%d/%d)' %
                          (r['altta'], r['beyaz'])); kirik += 1
                else:
                    print('  ✓ altyazı videoya gömülüyor (%d parlak piksel, %d%% alt şeritte)' %
                          (r['beyaz'], round(100 * r['altta'] / r['beyaz'])))
            else:
                # 300x150 tuvalin DOKUNULMAMIŞ varsayılan boyutudur; ölçüt
                # "kompozit boyutuna ayrılmış mı" (640x480 gibi). İlk yazımda
                # eşiği 10 koymuştum ve dokunulmamış tuvali kusur sanmıştım.
                if r and r.get('en', 0) >= 640:
                    print('  ✗ gömme kapalıyken çıktı tuvali kompozit boyutuna ayrılmış (%sx%s)' %
                          (r.get('en'), r.get('boy'))); kirik += 1
                else:
                    print('  ✓ gömme kapalıyken çıktı tuvali ayrılmıyor (%sx%s, ölü tampon yok)' %
                          (r.get('en') if r else '?', r.get('boy') if r else '?'))
        finally:
            t.kapat()
    return kirik




def marka(adres):
    """MARKA KİTİ (ALT BANT) GERÇEKTEN VİDEOYA ÇİZİLİYOR MU — A/B.

       G.4'ün sözü: "ad ve unvan alt bantta videoya işleniyor". Bugüne kadar
       yalnız yerleşim hesabı ve kontrast kuralı ölçülüyordu; bandın gerçekten
       ÇİZİLDİĞİ hiç görülmemişti.

       ÖLÇÜM YÖNTEMİ DERSİ (2026-08-16): önce durumu `localStorage`a yazıp
       sayfayı yeniden yüklemeyi denedim ve marka HEP VARSAYILANA DÖNÜYORDU.
       Sebep üründe değildi: sayfadan ayrılırken çalışan kapanış kaydı
       (`pagehide` → `saveNow`) benim yazdığımın ÜSTÜNE eski durumu yazıyordu.
       Doğru yol arayüzü kullanmak — kullanıcının yaptığı da bu.

       Ölçüt: marka rengi (#00D47E) tonundaki pikseller çıktı tuvalinde
       görünmeli ve karenin ALT YARISINDA olmalı; marka kapalıyken çıktı
       tuvali hiç ayrılmamalı."""
    kirik = 0
    for acik in (True, False):
        t = Tarayici()
        try:
            t.cagir('Page.enable')
            t.cagir('Emulation.setDeviceMetricsOverride', width=430, height=932,
                    deviceScaleFactor=2, mobile=True)
            t.cagir('Page.navigate', url=adres)
            time.sleep(2.5)
            try:
                t.js(KAPAT_ONB)
            except Exception:
                pass
            time.sleep(0.4)
            t.js("document.querySelector('#startCam').click()")
            time.sleep(4.5)
            t.js("[...document.querySelectorAll('.sw')].find(s=>s.dataset.t==='comp').click()")
            time.sleep(2.0)
            if acik:
                t.js("""(() => {
                  const ad=document.querySelector('#markaAd'), un=document.querySelector('#markaUnvan');
                  const sw=document.querySelector('#markaBantSw');
                  if(!ad||!un||!sw) return 'alan yok';
                  ad.value='Erdal Kiziroglu'; ad.dispatchEvent(new Event('input',{bubbles:true}));
                  un.value='Kurucu'; un.dispatchEvent(new Event('input',{bubbles:true}));
                  if(!sw.classList.contains('on')) sw.click();
                  return 'kuruldu';
                })()""")
                time.sleep(1.2)
            t.js("(()=>{ const b=document.querySelector('#playBtn'); if(b) b.click(); })()")
            time.sleep(1.0)
            t.js("document.querySelector('#recBtn').click()")
            time.sleep(3.0)
            r = js(t, """(() => {
              const oc=document.querySelector('#compOut');
              if(!oc) return JSON.stringify({tuval:false});
              if(oc.width<10) return JSON.stringify({tuval:true, en:oc.width, boy:oc.height, bant:0, altta:0});
              const d=oc.getContext('2d').getImageData(0,0,oc.width,oc.height).data;
              let bant=0, altta=0;
              for(let i=0;i<d.length;i+=4){
                const r=d[i], g=d[i+1], b=d[i+2];
                if(g>150 && r<120 && b>70 && b<200){ bant++;
                  if(Math.floor((i/4)/oc.width) > oc.height*0.5) altta++; }
              }
              return JSON.stringify({tuval:true, en:oc.width, boy:oc.height, bant:bant, altta:altta});
            })()""", 'marka çıktısı')
            t.js("document.querySelector('#recBtn').click()")
            time.sleep(1)
            if acik:
                if not r or r.get('bant', 0) < 100:
                    print('  ✗ alt bant videoya ÇİZİLMEDİ (marka rengi piksel %s)' %
                          (r.get('bant') if r else '?')); kirik += 1
                elif r['altta'] < r['bant'] * 0.9:
                    print('  ✗ alt bant alt yarıda değil (%d/%d)' % (r['altta'], r['bant'])); kirik += 1
                else:
                    print('  ✓ alt bant videoya çiziliyor (%d piksel, %d%% alt yarıda)' %
                          (r['bant'], round(100 * r['altta'] / r['bant'])))
            else:
                if r and r.get('en', 0) >= 640:
                    print('  ✗ marka kapalıyken çıktı tuvali ayrılmış (%sx%s)' %
                          (r.get('en'), r.get('boy'))); kirik += 1
                else:
                    print('  ✓ marka kapalıyken çıktı tuvali ayrılmıyor')
        finally:
            t.kapat()
    return kirik


def yesil_y4m(yol, w=320, h=240, kare=20):
    """Düz YEŞİL sahte kamera görüntüsü (Y4M). Yeşil ekranı ölçmenin tek dürüst
       yolu, kameraya gerçekten yeşil bir perde göstermek."""
    # RGB(0,177,64) -> YUV yaklaşık (111, 105, 30)
    with open(yol, 'wb') as f:
        f.write(b'YUV4MPEG2 W%d H%d F30:1 Ip A1:1 C420\n' % (w, h))
        veri = bytes([111]) * (w * h) + bytes([105]) * (w * h // 4) + bytes([30]) * (w * h // 4)
        for _ in range(kare):
            f.write(b'FRAME\n')
            f.write(veri)
    return yol


def yesil_ekran(adres):
    """YEŞİL EKRAN A/B — kamera düz yeşil verirken chroma açık/kapalı ölçülüyor.

       Bu özellik bugüne kadar yalnız gölgelendirici kaynağı ve ayar sınırlarıyla
       ölçülüyordu; perdeyi gerçekten SİLİP SİLMEDİĞİ hiç görülmemişti.

       ÖLÇÜM ARACININ KUSURU BURADA ÇIKTI (2026-08-16): hazır görüntü dosyası
       verildiğinde `ekran.py` sahte CİHAZ bayrağını düşürüyordu ve
       `getUserMedia({video,audio})` tümden başarısız oluyordu — yani dosyayla
       yapılacak her ölçüm kamerasız koşacaktı. Onarıldı (ikisi birlikte).

       Okuma `#compOut` (2B tuval) üzerinden: WebGL varsayılan tamponu kare
       sunulduktan sonra boş dönüyor, oradan okumak yanıltıcı olurdu."""
    kirik = 0
    dizin = tempfile.mkdtemp(prefix='sufle-yesil-')
    y4m = yesil_y4m(os.path.join(dizin, 'yesil.y4m'))
    try:
        for chroma in (True, False):
            t = Tarayici(cekim=y4m)
            try:
                t.cagir('Page.enable')
                t.cagir('Emulation.setDeviceMetricsOverride', width=430, height=932,
                        deviceScaleFactor=2, mobile=True)
                t.cagir('Page.navigate', url=adres)
                time.sleep(2.5)
                try:
                    t.js(KAPAT_ONB)
                except Exception:
                    pass
                time.sleep(0.4)
                t.js("document.querySelector('#startCam').click()")
                time.sleep(4.5)
                t.js("[...document.querySelectorAll('.sw')].find(s=>s.dataset.t==='comp').click()")
                time.sleep(2.5)
                # Gömme açık: kompozit kare 2B tuvale kopyalanıyor, oradan okunabiliyor.
                t.js("[...document.querySelectorAll('.sw')].find(s=>s.dataset.t==='burnCaps').click()")
                time.sleep(1.5)
                if chroma:
                    t.js("[...document.querySelectorAll('.sw')].find(s=>s.dataset.t==='chroma').click()")
                    time.sleep(2.5)
                t.js("(()=>{ const b=document.querySelector('#playBtn'); if(b) b.click(); })()")
                time.sleep(1.0)
                t.js("document.querySelector('#recBtn').click()")
                time.sleep(3.0)
                r = js(t, """(() => {
                  const oc=document.querySelector('#compOut');
                  if(!oc || oc.width<10) return JSON.stringify({tuval:false});
                  const d=oc.getContext('2d').getImageData(0,0,oc.width,oc.height).data;
                  let yesil=0, koyu=0, n=0;
                  for(let i=0;i<d.length;i+=4){
                    const r=d[i], g=d[i+1], b=d[i+2]; n++;
                    if(g>110 && r<120 && b<120) yesil++;
                    if(r<70 && g<70 && b<80) koyu++;
                  }
                  return JSON.stringify({tuval:true, yesil:+(100*yesil/n).toFixed(1),
                                         koyu:+(100*koyu/n).toFixed(1)});
                })()""", 'yeşil ekran çıktısı')
                t.js("document.querySelector('#recBtn').click()")
                time.sleep(1)
                if not r or not r.get('tuval'):
                    print('  ✗ yeşil ekran ölçülemedi (kompozit çıktı yok)'); kirik += 1
                elif chroma:
                    if r['yesil'] > 5 or r['koyu'] < 50:
                        print('  ✗ yeşil perde SİLİNMEDİ (yeşil %%%s · arka plan %%%s)' %
                              (r['yesil'], r['koyu'])); kirik += 1
                    else:
                        print('  ✓ yeşil perde silinip arka plan geldi (yeşil %%%s → arka plan %%%s)' %
                              (r['yesil'], r['koyu']))
                else:
                    if r['yesil'] < 50:
                        print('  ✗ chroma kapalıyken görüntü yine de değişmiş (yeşil %%%s)' %
                              r['yesil']); kirik += 1
                    else:
                        print('  ✓ chroma kapalıyken görüntü olduğu gibi geçiyor (yeşil %%%s)' % r['yesil'])
            finally:
                t.kapat()
    finally:
        import shutil
        shutil.rmtree(dizin, ignore_errors=True)
    return kirik


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
