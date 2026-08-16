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
import sys
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
            print('  ✗ hata günlüğü boş değil (%s kayıt)' % son['hata']); kirik += 1
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
            time.sleep(5)
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


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
