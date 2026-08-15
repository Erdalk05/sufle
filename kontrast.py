#!/usr/bin/env python3
"""kontrast.py — ÇİZİLMİŞ arayüz denetimi: kontrast · tek eylem · dil.

Neden ayrı araç: `tests/121` jeton dosyasındaki renk ÇİFTLERİNİ hesaplıyor,
ama bir jetonun hangi zeminin üstünde kullanıldığını kaynaktan bilmek mümkün
değil. Gerçek soru "bu metin, ARDINDAKİ zeminin üstünde okunuyor mu" ve buna
ancak tarayıcı cevap verebilir. B.8'de "tarayıcı-tabanlı ölçüm gerekir" diye
ertelenen kalem buydu; `ekran.py` ile o tezgâh kurulunca engel kalktı.

ÖLÇÜT WCAG 2.1 1.4.3 (AA):
  normal metin 4,5:1 · büyük metin (>=24px, ya da >=18.66px + kalın) 3:1

DÜRÜSTLÜK SINIRLARI — ölçemediğini ölçmüş gibi yapmaz:
  · Kamera görüntüsünün ya da bir görselin üstündeki metin ATLANIR: zemin her
    kareyi değiştirir, tek bir oran yalan olur. (Sufle bu metinleri zaten
    gölge/kontur ile koruyor, ayrı bir tasarım kararı.)
  · Saydam zeminler ARDI ARDINA harmanlanır (alfa bileşimi); tek bir üst
    öge bakıp "zemin bu" demek yanlış sonuç verir.
  · Görünmeyen (display:none, görünür alanı sıfır, opacity:0) ögeler atlanır.
  · Yalnız GERÇEK metin düğümü taşıyan ögeler ölçülür; sarmalayıcı kutuların
    rengi kullanıcıya görünmez.

Kullanım:
  python3 kontrast.py              # iki kabuk, taban dosyasına karşı
  python3 kontrast.py --yaz        # ölçüleni yeni taban olarak yaz
"""

import json
import os
import sys
import time

REPO = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, REPO)
from ekran import Tarayici, TELEFON, MAC, KAPAT_ONB          # noqa: E402

TABAN = os.path.join(REPO, 'tests', 'kontrast-taban.json')

# Ölçülecek durumlar: kabuk + o kabukta açılacak yüzey.
# Yalnız ilk ekranı ölçmek, ayar sayfalarındaki yüzlerce etiketi kaçırırdı.
DURUMLAR = [
    ('telefon-giris',    TELEFON, 430, 932, 3, ''),
    ('telefon-ayarlar',  TELEFON, 430, 932, 3,
     KAPAT_ONB + "document.querySelector('#startNoCam').click();"
                 "document.querySelector('#settingsBtn').click();"),
    ('telefon-senaryo',  TELEFON, 430, 932, 3,
     KAPAT_ONB + "document.querySelector('#startNoCam').click();"
                 "document.querySelector('#scriptsBtn').click();"),
    ('mac-pencere',      MAC,    1440, 900, 2,
     "(document.querySelector('#newsX')||{click(){}}).click();"),
    # Mac'in sürüm penceresi #bilgiKapat ile kapanıyor; yalnız #newsX'e
    # basmak pencereyi AÇIK bırakıyordu ve ana ekran hiç ölçülmüyordu —
    # ölçmeyen denetim. İki durum da ölçülüyor.
    ('mac-ana',          MAC,    1440, 900, 2,
     "(document.querySelector('#newsX')||{click(){}}).click();"
     "(document.querySelector('#bilgiKapat')||{click(){}}).click();"),
    # ÇEKİM SONRASI SONUÇ EKRANI — T49'a kadar HİÇ ölçülmemişti. Kullanıcının
    # her çekimden sonra gördüğü yüzey burası (prova raporu, budama, paylaş)
    # ve kontrastı da çevirisi de denetim dışındaydı: kapının kör noktası.
    # Kısa bir çekim yapılıp sonuç ekranı açılıyor.
    ('telefon-sonuc',    TELEFON, 430, 932, 3,
     KAPAT_ONB + "document.querySelector('#startCam').click();"),
]

# Sonuç ekranı iki aşamalı: kamera akmadan kayıt başlatmak anlamsız.
SONRA = {
    'telefon-sonuc': ("const b=document.querySelector('#recBtn'); b.click();"
                      " await new Promise(r=>setTimeout(r,4000)); b.click();"
                      " await new Promise(r=>setTimeout(r,3500));"),
}

# Tarayıcıda koşan ölçüm. Tek parça JS: her tur için ayrı ayrı gönderilir.
OLC = r"""
(() => {
  const SEFFAF = c => !c || c === 'transparent' || /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(c);
  const ayir = c => {
    const m = (c || '').match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map(s => parseFloat(s));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  /* Alfa bileşimi: üstteki yarı saydam rengi alttakinin üstüne koyar. */
  const bindir = (ust, alt) => ({
    r: ust.r * ust.a + alt.r * (1 - ust.a),
    g: ust.g * ust.a + alt.g * (1 - ust.a),
    b: ust.b * ust.a + alt.b * (1 - ust.a),
    a: 1,
  });
  const kanal = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const parlaklik = c => 0.2126 * kanal(c.r) + 0.7152 * kanal(c.g) + 0.0722 * kanal(c.b);
  const oran = (a, b) => {
    const l1 = parlaklik(a), l2 = parlaklik(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  /* Zemin: ögeden yukarı çıkılır, saydam olmayan ilk renge kadar hepsi
     bindirilir. Yol üzerinde görsel/gradyan/video varsa ÖLÇÜLEMEZ denir —
     tek bir oran orada yalan olurdu. */
  const zemin = el => {
    let yigin = [], e = el;
    while (e && e !== document.documentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage && s.backgroundImage !== 'none') return { olcusuz: 'görsel/gradyan' };
      if (e.tagName === 'VIDEO' || e.tagName === 'CANVAS') return { olcusuz: e.tagName.toLowerCase() };
      const c = ayir(s.backgroundColor);
      if (c && !SEFFAF(s.backgroundColor)) {
        yigin.push(c);
        if (c.a >= 0.999) break;
      }
      e = e.parentElement;
    }
    const kok = ayir(getComputedStyle(document.documentElement).backgroundColor);
    let alt = (kok && kok.a >= 0.999) ? kok : { r: 255, g: 255, b: 255, a: 1 };
    for (let i = yigin.length - 1; i >= 0; i--) alt = bindir(yigin[i], alt);
    return { renk: alt };
  };

  const yol = el => {
    if (el.id) return '#' + el.id;
    const c = (typeof el.className === 'string' && el.className.trim())
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    const ust = el.parentElement && el.parentElement.id ? '#' + el.parentElement.id + ' > ' : '';
    return ust + el.tagName.toLowerCase() + c;
  };

  const ihlal = [], atlanan = {};
  let olculen = 0;
  for (const el of document.querySelectorAll('*')) {
    /* Yalnız KENDİ metni olan ögeler: sarmalayıcının rengi görünmez. */
    const kendiMetin = [...el.childNodes]
      .filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!kendiMetin) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    /* DEVRE DIŞI BİLEŞENLER MUAF — WCAG 2.1 1.4.3 bunu açıkça yazıyor
       ("inactive user interface component ... no contrast requirement").
       İlk koşuda araç Mac'in kayıt düğmesini 1,86 ile ihlal saydı; oysa
       düğme kamera açılmadığı için `disabled` ve opacity .45 ile soluk —
       yani kasıtlı olarak "şimdi kullanılamaz" diyor. Bunu ihlal saymak,
       ölçen aracın kendisinin yalan söylemesi olurdu ve gerçek kusuru
       gürültüye gömerdi. */
    if (el.closest('[disabled],[aria-disabled="true"],fieldset:disabled')) {
      atlanan['devre dışı'] = (atlanan['devre dışı'] || 0) + 1; continue;
    }
    if (parseFloat(s.opacity) < 0.05) { atlanan.saydam = (atlanan.saydam || 0) + 1; continue; }
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;

    const on = ayir(s.color);
    if (!on) continue;
    const z = zemin(el);
    if (z.olcusuz) { atlanan[z.olcusuz] = (atlanan[z.olcusuz] || 0) + 1; continue; }

    /* Metnin kendi saydamlığı zemine karışır: opacity:.6 beyaz, koyu zeminde
       gerçekte gri görünür. Bunu saymamak kusuru gizlerdi. */
    const opa = parseFloat(s.opacity);
    const onEtkin = bindir({ r: on.r, g: on.g, b: on.b, a: on.a * (isNaN(opa) ? 1 : opa) }, z.renk);

    const px = parseFloat(s.fontSize);
    const kalin = parseInt(s.fontWeight, 10) >= 700;
    const buyuk = px >= 24 || (px >= 18.66 && kalin);
    const esik = buyuk ? 3 : 4.5;
    const o = oran(onEtkin, z.renk);
    olculen++;
    if (o < esik - 0.005) {
      ihlal.push({ yol: yol(el), metin: kendiMetin.slice(0, 40), oran: +o.toFixed(2),
                   esik, px: +px.toFixed(1), kalin });
    }
  }
  /* B.1 — EKRANDA TEK ASIL EYLEM. `jetonlar.css` bu kuralı kendisi yazıyor
     ("--r-action ... asıl eylem, ekranda TEK olmalı") ama hiçbir yer onu
     denetlemiyordu. Ölçtüm: Mac ana ekranda 9, telefon girişte 3 dolu yeşil
     aynı anda görünüyordu ve üçü farklı şey söylüyordu (eylem, seçili sekme,
     açık anahtar). Kullanıcı hangisinin eylem olduğunu ayırt edemez.
     Sayılan şey: DÜĞME biçimli, TAM OPAK marka yeşili dolgu. Tonal dolgu
     (rgba .16) seçili durumdur, sayılmaz. Anahtarlar da sayılmaz: pill+topuz
     biçimi düğmeden ayrıdır ve orada dolu yeşil yerleşik bir alışkanlık. */
  const eylem = [];
  for (const el of document.querySelectorAll('button,a,[role="button"]')) {
    const s = getComputedStyle(el), b = el.getBoundingClientRect();
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    if (parseFloat(s.opacity) < 0.1) continue;
    if (b.width < 2 || b.height < 2 || b.bottom < 0 || b.top > innerHeight) continue;
    /* ÖRTÜLEN ÖGE RAKİP DEĞİLDİR. Karşılama sayfası açıkken `#startCam`
       perdenin ARKASINDA kalıyor ve araç onu ikinci bir eylem sanıp kırmızı
       verdi — oysa kullanıcı o an yalnız sayfanın kendi düğmesini görüyor.
       Gerçek örtüşme sınanıyor: ögenin merkezinde en üstte duran şey kendisi
       (ya da çocuğu) değilse, o öge kapalıdır. */
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const ust = document.elementFromPoint(cx, cy);
    if (!ust || !(el === ust || el.contains(ust))) { continue; }
    const bg = s.backgroundColor;
    if (bg.includes('0, 212, 126') && !/rgba\([^)]*0\.\d/.test(bg))
      eylem.push((el.id ? '#' + el.id : '.' + String(el.className).split(' ')[0])
                 + ' "' + el.textContent.trim().slice(0, 18) + '"');
  }
  return JSON.stringify({ olculen, ihlal, atlanan, eylem });
})()
"""


TOPLA = r"""
(() => {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;
    const kendi = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim())
      .map(n => n.textContent.trim()).join(' ');
    const ad = el.id ? '#' + el.id
      : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0];
    if (kendi) out.push([ad, kendi.slice(0, 70)]);
    if (el.title) out.push([ad + '@title', el.title.slice(0, 70)]);
    const al = el.getAttribute('aria-label'); if (al) out.push([ad + '@aria', al.slice(0, 70)]);
    if (el.placeholder) out.push([ad + '@ph', el.placeholder.slice(0, 70)]);
  }
  return JSON.stringify(out);
})()
"""

TR_HARF = 'çğışöüÇĞİŞÖÜ'

# KULLANICININ KENDİ METNİ — çevrilmemesi DOĞRU. Bunlar senaryo içeriğini
# çizen ögeler: sufle satırı, kelime span'ı, senaryo başlığı ve Mac'in
# düzenleyicisi. Liste dar tutuluyor; genişletmek kusur saklamak olur.
KULLANICI_METNI = {'div.ln', 'span.w', 'div.t', '#editor', '#text', '#title'}

# GEÇİCİ BİLDİRİM MUAF. Toast 2,2 saniye yaşıyor ve bir sonraki tetiklenmede
# ZATEN güncel dilde yazılıyor; uçuştaki bir bildirimi dil değişiminde yeniden
# çizmek anlamsız (kullanıcı o an okuduğu cümlenin ortasında dil değiştirmez).
# Muafiyet DAR: yalnız bu tek öge. Genişletmek kusur saklamak olur.
GECICI = {'#toast'}


def olc(ad, url, w, h, dsf, kur):
    t = Tarayici()
    try:
        t.ws.s.settimeout(120)
        t.cagir('Emulation.setDeviceMetricsOverride', width=w, height=h,
                deviceScaleFactor=dsf, mobile=(w < 800))
        t.cagir('Page.navigate', url=url)
        time.sleep(3.0)
        gercek = t.js('document.documentElement.clientWidth')
        if gercek != w:
            raise RuntimeError('%s: %d px istendi, %d ölçüldü' % (ad, w, gercek))
        if kur:
            t.js(kur)
            time.sleep(1.5)
        if ad in SONRA:
            t.js('(async()=>{%s})()' % SONRA[ad])
            # Kayıt + işleme: sonuç ekranı açılana kadar YOKLA, sabit bekleme
            # yetersiz kalırsa boş ekran ölçerdik ("ölçmeyen denetim").
            for _ in range(40):
                if t.js("getComputedStyle(document.querySelector('#result'))"
                        ".display!=='none'"):
                    break
                time.sleep(0.5)
            else:
                raise RuntimeError('%s: sonuç ekranı açılmadı' % ad)
            time.sleep(1.0)
        sonuc = json.loads(t.js(OLC))
        # DİL DENETİMİ: aynı yüzeyi TR ve EN çizip karşılaştır. Bu, kaynak
        # düzeyi kapsam sayısının GÖREMEDİĞİ şeyi görür — çalışma zamanında
        # yazılan etiketler (Tur 41-42'de altı gerçek kusur buradan çıktı:
        # düğme metni sabit Türkçeydi, ipucu hiç çevrilmiyordu, anahtar adı
        # bir kez yazılıp dil değişince eski dilde kalıyordu).
        tr = json.loads(t.js(TOPLA))
        t.js("(document.querySelector('#langSwitch button[data-lang=en]')"
             "||{click(){}}).click()")
        time.sleep(1.2)
        en = {k: v for k, v in json.loads(t.js(TOPLA))}
        sonuc['dil'] = [
            [k, v] for k, v in tr
            if en.get(k) == v and any(c in v for c in TR_HARF)
            and k.split('@')[0] not in KULLANICI_METNI
            and k.split('@')[0] not in GECICI
        ]
        sonuc['metinSayisi'] = len(tr)
        return sonuc
    finally:
        t.kapat()


def main():
    yaz = '--yaz' in sys.argv
    taban = {}
    if os.path.exists(TABAN):
        taban = json.load(open(TABAN, encoding='utf-8'))

    yeni, kirmizi = {}, False
    for ad, url, w, h, dsf, kur in DURUMLAR:
        r = olc(ad, url, w, h, dsf, kur)
        n = len(r['ihlal'])
        yeni[ad] = n
        atl = ' · '.join('%s:%d' % (k, v) for k, v in sorted(r['atlanan'].items()))
        d = len(r['dil'])
        print('%-18s ölçülen %4d · ihlal %2d · eylem %d · çevrilmemiş %d%s'
              % (ad, r['olculen'], n, len(r['eylem']), d,
                 ('  (atlanan ' + atl + ')') if atl else ''))
        for k, v in r['dil'][:8]:
            print('   ⚠ %-26s "%s"' % (k, v))
        yeni[ad + '~dil'] = d
        # Ölçmeyen denetim olmasın: dil karşılaştırması gerçekten metin gördü mü?
        if r.get('metinSayisi', 0) < 20:
            print('   ⛔ dil denetimi yalnız %d metin gördü — ölçmüyor' % r.get('metinSayisi', 0))
            kirmizi = True
        eskiD = taban.get(ad + '~dil')
        if eskiD is not None and d > eskiD:
            print('   ⛔ çevrilmemiş metin ARTTI: %d → %d' % (eskiD, d))
            kirmizi = True
        # ÖLÇMEYEN DENETİM OLMASIN: hiç metin ölçülmediyse "0 ihlal" yalandır.
        if r['olculen'] < 5:
            print('   ⛔ yalnız %d metin ölçüldü — denetim bir şey ölçmüyor' % r['olculen'])
            kirmizi = True
        for i in r['ihlal'][:12]:
            print('   ✗ %-28s %5.2f < %.1f  %spx%s  "%s"'
                  % (i['yol'], i['oran'], i['esik'], i['px'],
                     ' kalın' if i['kalin'] else '', i['metin']))
        e = len(r['eylem'])
        yeni[ad + '~eylem'] = e
        eskiE = taban.get(ad + '~eylem')
        # İKİ KURAL BİRDEN. Yalnız ">1" bakmak yetmiyordu: ayar sayfası bir kip
        # penceresi olduğu için arkadaki her şey örtülü kalıyor ve sekme dolu
        # yeşile döndüğünde sayı 0'dan 1'e çıkıyor, "TEK olmalı" kuralı bunu
        # yakalamıyordu. Taban karşılaştırması o gerilemeyi de kapatıyor.
        if e > 1:
            print('   ⛔ ekranda %d dolu eylem düğmesi — TEK olmalı: %s'
                  % (e, ' · '.join(r['eylem'])))
            kirmizi = True
        elif eskiE is not None and e > eskiE:
            print('   ⛔ dolu eylem düğmesi ARTTI: %d → %d (%s)'
                  % (eskiE, e, ' · '.join(r['eylem'])))
            kirmizi = True
        eski = taban.get(ad)
        if eski is not None and n > eski:
            print('   ⛔ ihlal ARTTI: %d → %d' % (eski, n))
            kirmizi = True

    if yaz:
        json.dump(yeni, open(TABAN, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('\ntaban yazıldı:', TABAN)
        return 0
    if not taban:
        print('\n⚠️ taban yok — `python3 kontrast.py --yaz` ile kur')
        return 1
    print('\n%s' % ('⛔ KONTRAST KIRMIZI' if kirmizi else '✅ kontrast: ihlal artmadı'))
    return 1 if kirmizi else 0


if __name__ == '__main__':
    sys.exit(main())
