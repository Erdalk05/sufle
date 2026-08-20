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


def olcek():
    """Tipografi ölçeğinin adımları — TEK KAYNAK `cekirdek/jetonlar.css`.

    Burada ikinci bir liste tutmak, ölçek değişince nöbetçinin sessizce
    ESKİ ölçeği savunması demek olurdu; bu depoda kopyanın bedeli ölçüldü."""
    import re as _re
    css = open(os.path.join(REPO, 'cekirdek', 'jetonlar.css'), encoding='utf-8').read()
    adim = sorted({int(m) for m in _re.findall(r'--tx-[a-z0-9]+\s*:\s*(\d+)px', css)})
    if len(adim) < 5:
        raise RuntimeError('tipografi ölçeği okunamadı (%d adım) — ölçmeyen denetim' % len(adim))
    return adim

# Ölçülecek durumlar: kabuk + o kabukta açılacak yüzey.
# Yalnız ilk ekranı ölçmek, ayar sayfalarındaki yüzlerce etiketi kaçırırdı.
DURUMLAR = [
    ('telefon-giris',    TELEFON, 430, 932, 3, ''),
    ('telefon-ayarlar',  TELEFON, 430, 932, 3,
     KAPAT_ONB + "document.querySelector('#startNoCam').click();"
                 "document.querySelector('#settingsBtn').click();"),
    # EN DAR GERÇEKÇİ TELEFON (2026-08-20). Kapı 430 ve 360 pxi ölçüyordu;
    # 320 px (iPhone SE 1. nesil, bölünmüş ekran, yakınlaştırılmış tarayıcı)
    # hiç ölçülmüyordu ve orada kart özeti kesiliyordu — kartın kapalıyken
    # TEK işi o değeri göstermek. Ölçülmeyen genişlik, denetlenmemiş
    # genişliktir; aynı ders masaüstünde 1152 pxte alınmıştı.
    ('telefon-dar-ayarlar', TELEFON, 320, 568, 3,
     KAPAT_ONB + "document.querySelector('#startNoCam').click();"
                 "document.querySelector('#settingsBtn').click();"),
    # v9.29 CANLI AYAR YÜZEYİ: kamerasız Ayarlar ölçümü cam paneli hiç
    # çalıştırmaz. Gerçek kamera akışı açılır, ardından panelin çizilmiş
    # metin/denetim kontrastı ayrıca ölçülür. Kamera karesi değişken olduğu
    # için kamera üstündeki metinler aracın dürüstlük sınırı gereği atlanır;
    # panelin kendi koyu yüzeyi ise gerçek alfa bileşimiyle ölçülür.
    ('telefon-canli-ayarlar', TELEFON, 430, 932, 3,
     KAPAT_ONB + "document.querySelector('#startCam').click();"),
    # v9.33 HIZLI ERİŞİM: sahnenin üstünde duran cam panel. Kamerasız kipte
    # ölçülüyor çünkü sorumuz panelin KENDİ yüzeyi — karo etiketleri çevrili
    # mi, adı var mı, cam zeminde kontrastı yetiyor mu. Kamera karesi
    # değişken olduğu için aracın dürüstlük sınırı gereği zaten atlanırdı.
    ('telefon-hizli',    TELEFON, 430, 932, 3,
     KAPAT_ONB + "document.querySelector('#startNoCam').click();"),
    ('telefon-senaryo',  TELEFON, 430, 932, 3,
     KAPAT_ONB + "document.querySelector('#startNoCam').click();"
                 "document.querySelector('#scriptsBtn').click();"),
    # AYARLARIN ÜÇ SEKMESİ — 2026-08-15'e kadar HİÇ ölçülmüyordu. Yalnız açılış
    # sekmesi (Okuma) ölçülüyordu; Görünüm, Kamera ve Diğer sekmelerindeki
    # yüzlerce etiket ve ON kaydırıcı denetim dışındaydı. "Adsız öge" kuralı
    # ilk koşuda tam da bu üç sekmede 10 kusur buldu (16'nın 10'u buradaydı).
    ('telefon-gorunum',  TELEFON, 430, 932, 3,
     KAPAT_ONB + "document.querySelector('#startNoCam').click();"
                 "document.querySelector('#settingsBtn').click();"
                 "document.querySelector('[data-tab=look]').click();"),
    ('telefon-kamera',   TELEFON, 430, 932, 3,
     KAPAT_ONB + "document.querySelector('#startNoCam').click();"
                 "document.querySelector('#settingsBtn').click();"
                 "document.querySelector('[data-tab=cam]').click();"),
    ('telefon-diger',    TELEFON, 430, 932, 3,
     KAPAT_ONB + "document.querySelector('#startNoCam').click();"
                 "document.querySelector('#settingsBtn').click();"
                 "document.querySelector('[data-tab=more]').click();"),
    ('mac-pencere',      MAC,    1440, 900, 2,
     "(document.querySelector('#newsX')||{click(){}}).click();"),
    # Mac'in sürüm penceresi #bilgiKapat ile kapanıyor; yalnız #newsX'e
    # basmak pencereyi AÇIK bırakıyordu ve ana ekran hiç ölçülmüyordu —
    # ölçmeyen denetim. İki durum da ölçülüyor.
    ('mac-ana',          MAC,    1440, 900, 2,
     "(document.querySelector('#newsX')||{click(){}}).click();"
     "(document.querySelector('#bilgiKapat')||{click(){}}).click();"),
    # DAR MASAÜSTÜ PENCERESİ (2026-08-20). Mac YALNIZ 1440 pxte ölçülüyordu
    # ve tam bu yüzden bir kusur bir gün boyunca görünmedi: üst çubuk
    # sarmıyordu, düğmeler pencerenin sağ DIŞINA düşüyor ve ulaşılamıyordu.
    # 1440'ta hepsi sığdığı için kapı yeşildi. 1152 px sıradan bir MacBook
    # penceresi; ölçülmeyen genişlik, denetlenmemiş genişliktir.
    ('mac-dar',          MAC,    1152, 760, 2,
     "(document.querySelector('#newsX')||{click(){}}).click();"
     "(document.querySelector('#bilgiKapat')||{click(){}}).click();"),
    # ÇEKİM SONRASI SONUÇ EKRANI — T49'a kadar HİÇ ölçülmemişti. Kullanıcının
    # her çekimden sonra gördüğü yüzey burası (prova raporu, budama, paylaş)
    # ve kontrastı da çevirisi de denetim dışındaydı: kapının kör noktası.
    # Kısa bir çekim yapılıp sonuç ekranı açılıyor.
    ('telefon-sonuc',    TELEFON, 430, 932, 3,
     KAPAT_ONB + "document.querySelector('#startCam').click();"),
    # KOMPOZİT KUTUSU — 2026-08-16 gecesine kadar HİÇ ölçülmüyordu ve o gece
    # eklenen yüzeylerin ÇOĞU orada: altyazı görünüm kartları, vurgu
    # animasyonu, marka kiti (logo/renk/ad/unvan) ve müzik yatağı. Kutu
    # `display:none` ile kapalı durduğu için Kamera sekmesini açmak yetmiyor;
    # kompozit ve altyazı gömme AÇIK olmalı. Kapının kendi kör noktası:
    # ölçülmeyen yüzey, denetlenmemiş yüzeydir.
    ('telefon-kompozit', TELEFON, 430, 932, 3,
     KAPAT_ONB + "document.querySelector('#startCam').click();"),
]

# Sonuç ekranı iki aşamalı: kamera akmadan kayıt başlatmak anlamsız.
SONRA = {
    'telefon-canli-ayarlar': (
        "const bek=async(k,ms)=>{const t0=Date.now();"
        " while(Date.now()-t0<ms){if(k())return true;"
        " await new Promise(r=>setTimeout(r,150));}return false;};"
        " if(!await bek(()=>!!(document.querySelector('#cam')||{}).srcObject"
        "   && document.body.classList.contains('cam'),30000))"
        "   throw new Error('kamera canlı ayarlar için hazır olmadı');"
        " document.querySelector('#settingsBtn').click();"
        " if(!await bek(()=>document.body.classList.contains('ayarCanli'),5000))"
        "   throw new Error('canlı ayar kipi açılmadı');"),
    # ⚠️ SABİT SÜRE DEĞİL, DURUM BEKLENİYOR (2026-08-17). Eskiden "tıkla,
    # 4 sn bekle, tıkla" idi: makine yüklüyken kayıt o an henüz başlamamış
    # oluyor, ikinci tıklama kaydı BAŞLATIYOR ve sonuç ekranı hiç açılmıyor.
    # Kapı o zaman ürün kusursuzken çöküyordu (bu gece oldu: kontrast adımı
    # "hedef duruma varılmadı" diye patladı). Kapının çekim ölçümünde
    # düzeltilen tuzağın aynısı — makine hızına bağlı ölçüm.
    'telefon-sonuc': ("const b=document.querySelector('#recBtn');"
                      " const bek=async(k,ms)=>{const t0=Date.now();"
                      "   while(Date.now()-t0<ms){ if(k()) return true;"
                      "     await new Promise(r=>setTimeout(r,150)); } return false; };"
                      " if(!await bek(()=>!!(document.querySelector('#cam')||{}).srcObject"
                      "   && document.querySelector('#intro').classList.contains('hidden')"
                      "   && !b.classList.contains('kapali'), 30000))"
                      "   throw new Error('kamera kayıt için hazır olmadı');"
                      " b.click();"
                      " if(!await bek(()=>document.body.classList.contains('rec'), 30000))"
                      "   throw new Error('kayıt başlamadı');"
                      " await new Promise(r=>setTimeout(r,3000));"
                      " b.click();"
                      " if(!await bek(()=>document.querySelector('#result').classList.contains('open'), 30000))"
                      "   throw new Error('sonuç ekranı açılmadı');"),
    # Kompozit kutusu ancak kamera aktıktan sonra açılabiliyor (ensureComp
    # kamera ister). Sonra ayarlar → Kamera sekmesi → kompozit ve gömme.
    # NEDEN ANAHTARA BASMIYORUZ: kompozit WebGL istiyor, başsız tarayıcı ise
    # GPU olmadan koşuyor; anahtar basılsa bile `startComp()` başarısız olup
    # ayarı geri alıyor (ölçüldü: sınıf 'sw' kalıyor, kutu display:none).
    # Bu turun sorusu boru hattı DEĞİL, o kutudaki ETİKETLER: çevrilmiş mi,
    # adı var mı, kontrastı yeterli mi. O yüzden kutu doğrudan görünür
    # kılınıyor ve sınır bu yorumda yazılı — ölçtüğümüzü olduğundan fazla
    # göstermemek için.
    'telefon-hizli': (
        "await new Promise(r=>setTimeout(r,400));"
        " document.querySelector('#hizliBtn').click();"
        " await new Promise(r=>setTimeout(r,300));"),
    'telefon-kompozit': (
        "document.querySelector('#settingsBtn').click();"
        " await new Promise(r=>setTimeout(r,400));"
        # v9.36 KATMANLI AYARLAR: kompozit kartı UZMAN kartıdır ve Temel
        # düzeyde çizilmiyor. Kullanıcı da ona ancak Gelişmiş'e geçerek
        # ulaşıyor; ölçüm o yolu izlemezse kartı hiç bulamaz. Kapı bunu
        # ilk koşuşta yakaladı — yani katmanlama gerçekten çiziliyor.
        " const dz=document.querySelector('#duzeySeg [data-duzey=ileri]');"
        " if(dz) dz.click();"
        " await new Promise(r=>setTimeout(r,300));"
        " document.querySelector('[data-tab=cam]').click();"
        " await new Promise(r=>setTimeout(r,300));"
        " const ac=el=>{ if(!el) return; el.classList.remove('hidden');"
        "   el.style.setProperty('display','block','important');"
        "   el.style.setProperty('opacity','1','important');"
        "   el.style.setProperty('pointer-events','auto','important'); };"
        " ac(document.querySelector('#compBox'));"
        " ac(document.querySelector('#burnDeps'));"
        " await new Promise(r=>setTimeout(r,600));"),
}

# Hangi durum hangi hedefe varmalı. Beklemesiz bir kurulum, ölçümü boş
# ekranda yapma riski demek ("ölçmeyen denetim").
BEKLE = {
    'telefon-canli-ayarlar': (
        "document.querySelector('#sheet').classList.contains('open') && "
        "document.body.classList.contains('ayarCanli')"),
    'telefon-sonuc': ("(()=>{const r=document.querySelector('#result'),"
                        "v=document.querySelector('#resultVid');return r.classList.contains('open')"
                        " && r.scrollTop===0 && v.getBoundingClientRect().height>=260;})()"),
    # Kompozit kutusu gerçekten açıldı mı: kutu görünür VE tema kartları
    # çizilmiş olmalı. Yalnız "kutu var" demek, boş kart şeridini ölçmek olurdu.
    # Panel gerçekten AÇIK ve karolar çizilmiş olmalı. "Düğme var" demek
    # kapalı paneli ölçmek olurdu — ölçmeyen denetim.
    'telefon-hizli': ("(()=>{const p=document.querySelector('#hizliPanel');"
                      "return !!p && !!p.offsetParent"
                      " && p.querySelectorAll('.hkaro').length>=5"
                      " && p.getBoundingClientRect().width>0;})()"),
    'telefon-kompozit': ("(()=>{const k=document.querySelector('#capTemaKart');"
                         "return !!k && !!k.offsetParent && k.querySelectorAll('.kart').length>0;})()"),
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
  /* ERİŞİLEBİLİR AD — ölçülen şey RENK değil AD.
     kontrast.py bugüne kadar "okunuyor mu" sorusunu yanıtlıyordu; "ne olduğu
     duyuluyor mu" sorusunu kimse sormuyordu. Ölçüldü (2026-08-15): ayarların
     dört sekmesinde 16 kaydırıcının 16'sının da adı yoktu — ekran okuyucu
     hepsini "kaydırıcı, %50" diye okuyordu. Hız, okuma çizgisi, yazı boyutu,
     satır aralığı, filtre miktarı ve ses işleme ayarları birbirinden
     ayrılamıyordu. Statik denetim bunu göremez: ad, `for`/`aria-label`/etiket
     metni/yer tutucu zincirinden ÇALIŞMA ZAMANINDA hesaplanır.
     Ölçüt kaba ama dürüst: görünür ve etkileşimli, hesaplanan adı BOŞ. */
  const adHesapla = el =>
       (el.getAttribute('aria-label') || '').trim()
    || (el.getAttribute('title') || '').trim()
    || (el.getAttribute('aria-labelledby') ? '[labelledby]' : '')
    || (el.labels && el.labels.length
          ? [...el.labels].map(l => l.textContent.trim()).join('|') : '')
    || (el.getAttribute('placeholder') || '').trim()
    || (el.textContent || '').replace(/\s+/g, ' ').trim();
  const adsiz = [];
  for (const el of document.querySelectorAll(
      'button,[role="button"],[role="switch"],a[href],input,select,textarea,[tabindex]')) {
    const s = getComputedStyle(el), b = el.getBoundingClientRect();
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    if (b.width < 1 || b.height < 1) continue;
    if (!adHesapla(el)) adsiz.push(el.id ? '#' + el.id : yol(el));
  }

  /* KIRPILAN KART ÖZETİ (2026-08-17 akşamı eklendi — KAPININ KÖR NOKTASIYDI).
     Ayar kartı kapalıyken o anki DEĞERİ yazar; bütün varlık sebebi budur.
     Bütçe karakterle ölçülüyordu, yer ise pikselle belirleniyor: başlığı uzun
     iki kartta özet üç noktayla kesiliyor ve değer HİÇ okunmuyordu
     ("Okuma çizgi…", "Altyazı kay…"). Kapı yalnız "başlık iki satıra
     düşmesin" diyordu — o doğruydu, bedeli özet ödüyordu. Kaynak düzeyi bir
     test bunu göremez; yalnız çizilmiş ekran gösterir. Ölçüt MUTLAK: 0. */
  const kirpik = [];
  for (const o of document.querySelectorAll('.grup > summary > .ozet')) {
    if (!o.getClientRects().length) continue;
    const t = (o.textContent || '').trim();
    if (!t) continue;
    if (o.scrollWidth > o.clientWidth + 1) {
      const b = o.parentElement.querySelector('span[data-i18n]');
      kirpik.push(((b ? b.textContent.trim() : '?') + ' → "' + t + '"'
                   + ' (' + Math.round(o.clientWidth) + '/' + Math.round(o.scrollWidth) + 'px)'));
    }
  }

  /* TİPOGRAFİK RİTİM — ÇİZİLMİŞ boy ölçekte mi (2026-08-20).
     `tests/201` KAYNAKTAKİ sabitleri kovalıyor; burada ölçülen SONUÇ:
     bir yerde satır içi `style` ya da JS ile ölçek dışı bir boy geri
     gelirse kaynak temiz görünürken ekran bozulur. İki nöbetçi birlikte
     ölçüt: biri yazılanı, diğeri çizileni tutuyor.
     Ölçek Python tarafından `cekirdek/jetonlar.css`ten okunup gömülüyor —
     burada ikinci bir kopya tutmak, ölçeği değiştirince nöbetçinin sessizce
     eski ölçeği savunması demek olurdu. */
  const OLCEK = __OLCEK__;
  const KULLANICI = new Set(['div.ln','span.w','div.t','#editor','#text','#title','#introSenAd']);
  const ritim = [];
  for (const el of document.querySelectorAll('*')) {
    const kendiMetin = [...el.childNodes]
      .filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!kendiMetin) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    if (parseFloat(s.opacity) < 0.05) continue;
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;
    /* KULLANICININ KENDİ METNİ ÖLÇEK DIŞIDIR — sufle boyunu kullanıcı
       kendi ayarlıyor, düzenleyici kutusu iOS zum kuralına bağlı. */
    const ad = el.id ? '#' + el.id
      : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0];
    if (KULLANICI.has(ad) || el.closest('#scroller,#editor,#text,#count')) continue;
    const px = Math.round(parseFloat(s.fontSize) * 10) / 10;
    if (!OLCEK.includes(px))
      ritim.push({ yol: yol(el), px, metin: kendiMetin.slice(0, 28) });
  }

  /* KESİLEN METİN — GENEL TARAMA (2026-08-20).
     Yukarıdaki `kirpik` yalnız telefonun ayar kartı özetine bakıyordu.
     Aynı sınıf masaüstünde de vardı ve hiçbir kapı görmüyordu: durum
     çubuğundaki cihaz/yetenek satırı (MP4 ✓ · Kırpma ✓ · Sesle takip ✓)
     1440 pxte 395 pikselin 377si kadar çiziliyor, sonu üç noktaya
     gidiyordu — yani satırın SEBEBİ olan son yetenekler hiç okunmuyordu.
     Ölçüt: içeriği kutusuna sığmayan VE taşmayı gizleyen her metin ögesi. */
  const kesik = [];
  for (const el of document.querySelectorAll('*')) {
    const kendiMetin = [...el.childNodes]
      .filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!kendiMetin) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    if (parseFloat(s.opacity) < 0.05) continue;
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;
    /* KULLANICININ KENDİ METNİ MEŞRU OLARAK KISALIR: senaryo başlığı,
       sufle satırı ve düzenleyici. Kullanıcı adını kendi koyuyor ve
       listede kısalması beklenen davranış. Muafiyet DAR tutuluyor. */
    if (el.closest('#scroller,#editor,#text,#prompt,.scriptItem,#scriptList,#senList')) continue;
    const gizli = /hidden|clip/.test(s.overflowX + ' ' + s.overflow) || s.textOverflow === 'ellipsis';
    /* ① KESİK — taşma gizli ve içerik YATAYDA sığmıyor: metnin sonu hiç
       okunmuyor. Yalnız yatay ölçülüyor; dikeyde satır yüksekliği
       yuvarlamaları bir-iki piksel gürültü üretiyor ve dedektörü yalancı
       yapıyor (ölçüldü). */
    if (gizli && el.scrollWidth > el.clientWidth + 1) {
      kesik.push({ yol: yol(el), metin: kendiMetin.slice(0, 34), tur: 'kesik',
                   olcu: Math.round(el.clientWidth) + '/' + Math.round(el.scrollWidth) });
      continue;
    }
    /* ② TAŞAN — metin KENDİ KUTUSUNUN dışına boyanıyor. Bunu `scrollWidth`
       ile ölçmek çalışmıyor (taşma görünürken tarayıcı kutuyu büyütmüyor);
       METNİN KENDİ çizim dikdörtgeni ölçülüyor.
       NEDEN VAR: 2026-08-20'de cihaz satırının kırpmasını kaldırdım ama
       `white-space:normal` kuralı ÖZGÜLLÜK yüzünden kaybetti; satır sarmak
       yerine kutusunun dışına taşıp komşusuna bindi. Yalnız ① arayan bir
       dedektör o düzeltmeyi "başarılı" diye onaylıyordu — aracın kendi
       kör noktası. */
    if (!gizli && s.display !== 'inline') {
      const r = document.createRange();
      r.selectNodeContents(el);
      const t = r.getBoundingClientRect();
      if (t.width > 0 && (t.right > b.right + 1 || t.left < b.left - 1))
        kesik.push({ yol: yol(el), metin: kendiMetin.slice(0, 34), tur: 'taşan',
                     olcu: Math.round(b.width) + '/' + Math.round(t.width) });
    }
  }

  /* EKRANIN DIŞINA DÜŞEN ÇUBUK ÖGESİ — ULAŞILAMAYAN DÜĞME (2026-08-20).

     ÖLÇÜLDÜ: masaüstü üst çubuğu `flex-wrap` taşımıyordu ve satırı sabit
     56 px idi; düğmeler pencerenin SAĞ DIŞINA düşüyor, sayfa yatay da
     kaymadığı için onlara HİÇBİR YOLLA ulaşılamıyordu.
       1440 px  "Senaryolar · Otomatik yedekten dön · Tam Ekran · Sade" dışarıda
       1000 px  aynısı
        900 px  ÇEKİMLERİM de dışarıda — arşive ulaşmanın tek yolu
     820 pxin altında `flex-wrap` zaten vardı; kör nokta tam da sıradan bir
     MacBook penceresiydi (821–1900 px).

     ⚠️ KAPSAM BİLEREK DAR: yalnız ÇUBUKLAR taranıyor. Ekranın dışında
     duran her öge kusur değil — yan paneller kapalıyken kasıtlı olarak
     dışarı ötelenir (`translateX`). Çubuklarda ise dışarıda kalan bir
     düğme her zaman ulaşılamaz demektir. Geniş tarama yapmak dedektörü
     yalancı yapardı; dar tarama gerçek kusuru kaçırmıyor. */
  const CUBUK = '#topbar,#statusbar,#bar,#hud,#speedCtl';
  const ulasilmaz = [];
  for (const kap of document.querySelectorAll(CUBUK)) {
    const ks = getComputedStyle(kap);
    if (ks.display === 'none' || ks.visibility === 'hidden') continue;
    for (const el of kap.querySelectorAll('button,a[href],[role="button"],input,select')) {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      const b = el.getBoundingClientRect();
      if (b.width < 1 || b.height < 1) continue;
      if (b.left > innerWidth - 1 || b.right < 1 || b.top > innerHeight - 1 || b.bottom < 1)
        ulasilmaz.push({ yol: yol(el), metin: (el.textContent || '').trim().slice(0, 24),
                         kutu: Math.round(b.left) + '..' + Math.round(b.right) + '/' + innerWidth });
    }
  }

  return JSON.stringify({ olculen, ihlal, atlanan, eylem, adsiz, kirpik, ritim, kesik, ulasilmaz });
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
# `#introSenAd` 2026-08-17'de eklendi: giriş ekranındaki çip KULLANICININ
# senaryo adını yazıyor. Dil TR iken kurulmuş bir senaryo İngilizce arayüzde
# de kendi adıyla görünür — bu doğrudur, kullanıcının verisi çevrilmez. Araç
# bunu "çevrilmemiş arayüz" sayınca kapı kırmızıya döndü; yani Türkçe adlı
# senaryosu olan HER İngilizce kullanıcı kapıyı kırmızı yapardı. Muafiyetin
# bedeli: adı olmayan senaryonun yerine yazılan metin (Başlıksız senaryo /
# Untitled script) artık burada ölçülmüyor — onu tests/169 kilitliyor.
# `button.bolumJeton` 2026-08-17'de eklendi: senaryolar panelindeki bölüm
# jetonu KULLANICININ kendi `# başlık` satırını yazıyor ("Kayıt", "Giriş").
# İngilizce arayüzde de aynı kalması doğrudur. Jetona sınıf verilmesinin
# sebebi de bu: sınıfsızken anahtarı `button.` oluyordu ve o anahtarı
# sınıfsız BÜTÜN düğmeler paylaşıyordu — araç raporda başka bir düğmenin
# metnini gösteriyordu. Muafiyet böylece DAR: yalnız bu jeton.
# Jetonun yanındaki "↺ işaretleri sıfırla" düğmesi muaf DEĞİL, çünkü o
# gerçek arayüz metni ve çevrilmesi gerekiyor.
KULLANICI_METNI = {'div.ln', 'span.w', 'div.t', '#editor', '#text', '#title',
                   '#introSenAd', 'button.bolumJeton'}

# GEÇİCİ BİLDİRİM MUAF. Toast 2,2 saniye yaşıyor ve bir sonraki tetiklenmede
# ZATEN güncel dilde yazılıyor; uçuştaki bir bildirimi dil değişiminde yeniden
# çizmek anlamsız (kullanıcı o an okuduğu cümlenin ortasında dil değiştirmez).
# Muafiyet DAR: yalnız bu tek öge. Genişletmek kusur saklamak olur.
GECICI = {'#toast'}

# DİL ADI KENDİ DİLİNDE YAZILIR — çevrilmemesi DOĞRU, kusur değil.
# Sesle takip dili seçicisi (`#vlSeg`) "Türkçe / English / Deutsch" diyor;
# İngilizce arayüzde "Turkish" yazmak yaygın uygulamanın tersi olurdu
# (kullanıcı kendi dilini kendi dilinde arar). Muafiyet METNE bağlı, YOLA
# değil: yol muafiyeti (`button.on`) bütün seçili segment düğmelerini
# kapatır ve gerçek kusurları da gizlerdi.
# Listede yalnız Türkçe harf taşıyan ad var; diğerleri zaten hiç tetiklemez.
DIL_ADI = {'Türkçe'}


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
            # HEDEF DURUM YOKLANIR, VARSAYILMAZ — ama hedef duruma göre.
            # Eskiden burada TEK bir bekleme vardı (sonuç ekranı) ve
            # SONRA sözlüğüne ikinci bir durum eklenince o bekleme yanlış
            # yerde patlıyordu: kurulum doğruydu, denetim yanlış şeyi
            # bekliyordu. Her durumun kendi hedefi var.
            hedef = BEKLE.get(ad)
            if hedef:
                for _ in range(40):
                    if t.js(hedef):
                        break
                    time.sleep(0.5)
                else:
                    raise RuntimeError('%s: hedef duruma varılmadı (%s)' % (ad, hedef[:60]))
            time.sleep(1.0)
        sonuc = json.loads(t.js(OLC.replace('__OLCEK__', json.dumps(olcek()))))
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
            and v not in DIL_ADI
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
        adsiz = r.get('adsiz', [])
        print('%-18s ölçülen %4d · ihlal %2d · eylem %d · çevrilmemiş %d · adsız %d%s'
              % (ad, r['olculen'], n, len(r['eylem']), d, len(adsiz),
                 ('  (atlanan ' + atl + ')') if atl else ''))
        # ADSIZ ÖGE MUTLAK KURALDIR, TABANA GÖRE DEĞİL. Taban karşılaştırması
        # "arttı mı" der ve bugünkü 0'ı korur; ama burada doğru sayı 0'dır ve
        # ölçüldüğünde 0'a indirildi. Taban kullanmak, ileride birinin tabanı
        # yükseltip kusuru kalıcılaştırmasına izin verirdi.
        yeni[ad + '~adsiz'] = len(adsiz)
        if adsiz:
            print('   ⛔ erişilebilir adı olmayan %d etkileşimli öge: %s'
                  % (len(adsiz), ' · '.join(adsiz[:10])))
            kirmizi = True
        # KIRPILAN ÖZET DE MUTLAK KURAL, tabana göre değil: doğru sayı 0 ve
        # ölçüldüğünde 0'a indirildi. Taban kullanmak, birinin tabanı yükseltip
        # kusuru kalıcılaştırmasına izin verirdi (adsız öge ile aynı gerekçe).
        kirpik = r.get('kirpik', [])
        yeni[ad + '~kirpik'] = len(kirpik)
        if kirpik:
            print('   ⛔ üç noktayla kesilen %d kart özeti (değer okunmuyor):' % len(kirpik))
            for x in kirpik[:8]:
                print('      ✂ %s' % x)
            kirmizi = True
        # ULAŞILAMAYAN ÇUBUK DÜĞMESİ — MUTLAK KURAL. Ekranın dışına düşen
        # bir düğme, olmayan bir düğmedir; "arttı mı" diye sormak anlamsız.
        ulasilmaz = r.get('ulasilmaz', [])
        yeni[ad + '~ulasilmaz'] = len(ulasilmaz)
        if ulasilmaz:
            print('   ⛔ ekranın dışına düşen %d çubuk düğmesi (ulaşılamaz):' % len(ulasilmaz))
            for x in ulasilmaz[:8]:
                print('      ⇥ %-22s %s  "%s"' % (x['yol'], x['kutu'], x['metin']))
            kirmizi = True
        # KESİLEN METİN — MUTLAK KURAL, tabana göre değil. Kırpılan kart
        # özetiyle aynı gerekçe: bir metnin varlık sebebi okunmasıdır ve
        # ölçüldüğünde sayı 0'a indirildi. Taban kullanmak, birinin tabanı
        # yükseltip kusuru kalıcılaştırmasına izin verirdi.
        kesik = r.get('kesik', [])
        yeni[ad + '~kesik'] = len(kesik)
        if kesik:
            print('   ⛔ kutusuna sığmayan %d metin (kesik = sonu okunmuyor · taşan = komşuya biniyor):'
                  % len(kesik))
            for x in kesik[:8]:
                print('      ✂ %-6s %-24s %s  "%s"' % (x.get('tur','?'), x['yol'], x['olcu'], x['metin']))
            kirmizi = True
        # TİPOGRAFİK RİTİM — taban ratchetı (mutlak 0 DEĞİL): ölçek dışı
        # kalan tek tük yüzey olabilir ve onları zorla taşımak düzeni
        # bozabilir. Ölçüt yön: her sürümde DAHA AZ, asla daha çok.
        ritim = r.get('ritim', [])
        yeni[ad + '~ritim'] = len(ritim)
        eskiR = taban.get(ad + '~ritim')
        if eskiR is not None and len(ritim) > eskiR:
            print('   ⛔ ölçek dışı yazı boyu ARTTI: %d → %d' % (eskiR, len(ritim)))
            kirmizi = True
        for x in ritim[:6]:
            print('   ↕ %-28s %spx  "%s"' % (x['yol'], x['px'], x['metin']))
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
