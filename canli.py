#!/usr/bin/env python3
"""CANLI DUMAN TESTİ — yayınlanan sürümü GERÇEK tarayıcıda açar ve ölçer.

   NEDEN VAR: kapı depodaki dosyayı ölçüyor, kullanıcı ise CANLI adresi
   açıyor. Aradaki fark bu depoda iki kez yaşandı (yayın gecikmesi, bayat
   service worker). Sürüm etiketini karşılaştırmak yetmez — uygulamanın
   gerçekten AÇILDIĞINI, konsola hata basmadığını ve ana yüzeylerin
   çalıştığını görmek gerekiyor.

   Erdal ve yakınları cihazlarında denemeden önce bu betik koşuyor:
   "bende çalışmadı" ile "kodda yok" arasındaki farkı önceden ayırıyor.

   Kullanım:
     python3 canli.py                     # canlı adres
     python3 canli.py file:///.../index.html
"""
import json
import os
import re
import sys
import time

from ekran import Tarayici, KAPAT_ONB

CANLI = 'https://erdalk05.github.io/sufle/'

# Ölçülen genişlikler: iPhone 14 Pro (430), küçük Android (360), masaüstü.
GENISLIKLER = [('telefon', 430, 932), ('küçük telefon', 360, 800), ('masaüstü', 1440, 900)]

# Kullanıcının ilk beş dakikada dokunduğu yüzeyler. Her biri AÇILMALI.
PANOLAR = [
    ('ayarlar', '#settingsBtn', '#sheet'),
    ('senaryolar', '#scriptsBtn', '#scriptsSheet'),
    ('çekime hazır mıyım', '#readyBtn', '#ready'),
]


def beklenen_surum():
    """Canlı sayfanın eşleşmesi gereken kanon sürümü depodan oku."""
    yol = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
    with open(yol, encoding='utf-8') as f:
        eslesme = re.search(r"VER='([\d.]+)'", f.read())
    if not eslesme:
        raise RuntimeError('index.html içinde VER okunamadı')
    return eslesme.group(1)


def olcum_sorunlari(sonuc, beklenen):
    """Tek genişliğin yanlış-yeşil vermesine yol açacak kusurları döndür."""
    sorunlar = []
    if sonuc.get('surum') != beklenen:
        sorunlar.append('sürüm %s, beklenen %s' % (sonuc.get('surum') or 'YOK', beklenen))
    if not sonuc.get('suflePaneli'):
        sorunlar.append('sufle paneli yok')
    if not sonuc.get('metinVar'):
        sorunlar.append('sufle metni yok')
    if sonuc.get('tasma'):
        sorunlar.append('yatay taşma var')
    if sonuc.get('hatalar', 0):
        sorunlar.append('%d çalışma zamanı hatası' % sonuc['hatalar'])
    if sonuc.get('gizliDugme', 0):
        sorunlar.append('%d sıfır genişlikli görünür düğme' % sonuc['gizliDugme'])
    if any(r != 'açıldı' for _, r in sonuc.get('panolar', [])):
        sorunlar.append('açılmayan ana pano var')
    return sorunlar


def olc(adres, genislik, yukseklik):
    t = Tarayici()
    try:
        t.cagir('Page.enable')
        t.cagir('Runtime.enable')
        t.cagir('Emulation.setDeviceMetricsOverride', width=genislik, height=yukseklik,
                deviceScaleFactor=2, mobile=genislik < 500)
        t.cagir('Page.navigate', url=adres)
        time.sleep(3.0)
        try:
            t.js(KAPAT_ONB)
        except Exception:
            pass
        time.sleep(0.6)
        sonuc = t.js("""(() => {
          const o = {};
          o.surum = (document.documentElement.innerHTML.match(/VER='([\\d.]+)'/) || [])[1] || null;
          o.suflePaneli = !!document.querySelector('#scroller');
          o.metinVar = (document.querySelector('#scroller') || {textContent: ''})
                         .textContent.trim().length > 0;
          o.hatalar = (window.__ERR__ || []).length;
          o.tasma = document.documentElement.scrollWidth > window.innerWidth + 1;
          o.gizliDugme = [...document.querySelectorAll('button')]
            .filter(b => b.offsetParent !== null && b.getBoundingClientRect().width < 1).length;
          return JSON.stringify(o);
        })()""")
        cikti = json.loads(sonuc)

        # Panolar gerçekten açılıyor mu (tıklayıp bakıyoruz, varlığına değil).
        acilan = []
        for ad, dugme, pano in PANOLAR:
            try:
                r = t.js("""(() => {
                  const b = document.querySelector('%s'); if (!b) return 'düğme yok';
                  b.click();
                  const p = document.querySelector('%s'); if (!p) return 'pano yok';
                  const g = getComputedStyle(p);
                  const acik = p.classList.contains('open') ||
                               (g.display !== 'none' && g.visibility !== 'hidden' && +g.opacity > 0.1);
                  if (acik) { const x = p.querySelector('.x, [data-a="close"]'); if (x) x.click(); }
                  return acik ? 'açıldı' : 'AÇILMADI';
                })()""" % (dugme, pano))
            except Exception as e:
                r = 'HATA: ' + str(e)[:60]
            acilan.append((ad, r))
            time.sleep(0.4)
        cikti['panolar'] = acilan
        return cikti
    finally:
        t.kapat()


def main(argv):
    adres = argv[0] if argv else CANLI
    beklenen = beklenen_surum()
    print('ölçülen adres:', adres)
    print('beklenen sürüm:', beklenen)
    kirik = 0
    for ad, w, h in GENISLIKLER:
        s = olc(adres, w, h)
        panolar = ' · '.join('%s:%s' % (a, r) for a, r in s['panolar'])
        print('%-14s %4dpx · sürüm %-6s · sufle %s · metin %s · taşma %s · hata %d' % (
            ad, w, s['surum'], 'var' if s['suflePaneli'] else 'YOK',
            'var' if s['metinVar'] else 'YOK', 'VAR' if s['tasma'] else 'yok', s['hatalar']))
        print('               %s' % panolar)
        sorunlar = olcum_sorunlari(s, beklenen)
        if sorunlar:
            kirik += 1
            print('               ⛔ ' + ' · '.join(sorunlar))
    print()
    print('✅ canlı duman testi temiz' if not kirik else '⛔ CANLI KIRIK — %d ölçümde sorun' % kirik)
    return 1 if kirik else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
