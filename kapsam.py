#!/usr/bin/env python3
"""Fonksiyon kapsamı kapısı — testlerin HİÇ ANMADIĞI fonksiyonları sayar.

NEDEN "kapsanmayan sayısı", yüzde ya da kapsanan sayısı değil:
  · Yüzde yanıltır: kapsanmayan bir fonksiyonu SİLMEK yüzdeyi yükseltir,
    yani kapsam iyileşmemişken iyileşmiş görünür.
  · Kapsanan sayısı da yanıltır: kapsanan bir fonksiyonu silmek sayıyı
    düşürür ve kapı BOŞUNA kırmızıya döner.
  · Kapsanmayan sayısı ikisinde de doğru davranır: yeni ve testsiz bir
    fonksiyon eklemek onu ARTIRIR (kırmızı), testsiz bir fonksiyonu
    silmek ya da test yazmak AZALTIR (taban sıkışır).

Ölçüt ÇAĞRI değil ANILMA: fonksiyon adı herhangi bir test dosyasında
geçiyorsa kapsanmış sayılır. Kaba ama dürüst — denetim.py'deki ölü
fonksiyon kontrolüyle aynı ölçüt, orada gerekçesi ölçülerek seçilmişti.

Kullanım:  python3 kapsam.py index.html "mac/Teleprompter Pro.html"
Çıkış kodu 0 = kapsam korundu ya da iyileşti.
"""
import json, os, re, sys

REPO = os.path.dirname(os.path.abspath(__file__))
TABAN_YOL = os.path.join(REPO, 'tests', 'kapsam.json')


def fonksiyonlar(yol):
    ham = open(yol, encoding='utf-8').read()
    kod = re.sub(r'/\*.*?\*/', '', ham, flags=re.S)
    return sorted(set(re.findall(r'function\s+([A-Za-z_$][\w$]*)\s*\(', kod)))


def test_metni():
    d = os.path.join(REPO, 'tests')
    parcalar = []
    for f in sorted(os.listdir(d)):
        if re.match(r'^\d{2,}-.*\.js$', f):
            parcalar.append(open(os.path.join(d, f), encoding='utf-8').read())
    return '\n'.join(parcalar), len(parcalar)


def main(yollar):
    metin, dosya_sayisi = test_metni()
    # Test dosyası hiç bulunamadıysa HER ŞEY kapsanmamış görünür ve kapı
    # anlamsız bir kırmızı verir. Bu, ölçmeyen kapı sınıfının ta kendisi.
    if dosya_sayisi < 10:
        print('  ✗ test dosyası bulunamadı (%d) — kapsam ölçülemedi' % dosya_sayisi)
        return 1

    taban = {}
    if os.path.exists(TABAN_YOL):
        try:
            taban = json.load(open(TABAN_YOL, encoding='utf-8'))
        except Exception:
            taban = {}

    kirmizi = False
    yeni = dict(taban)
    for yol in yollar:
        if not os.path.exists(yol):
            print('  — %s yok, atlandı' % yol)
            continue
        ad = os.path.basename(yol)
        fns = fonksiyonlar(yol)
        if not fns:
            print('  ✗ %s: hiç fonksiyon bulunamadı — desen bozulmuş olabilir' % ad)
            kirmizi = True
            continue
        acik = [f for f in fns
                if not re.search(r'(?<![\w$])' + re.escape(f) + r'(?![\w$])', metin)]
        n = len(acik)
        eski = taban.get(ad)
        # İNANILMAZ TABAN = TABANSIZLIK. Taban fonksiyon sayısından büyükse
        # `n > eski` hiçbir zaman doğru olamaz, yani kapı o dosya için
        # fiilen KAPALIDIR. Bu teorik değil: tests/113 bilerek 999 yazıp
        # geri koyuyor ve o değer bir kez DEPOYA SIZDI (2026-08-16 denetim
        # turunda bulundu) — telefon kapsamı o commit boyunca korumasızdı.
        # Böyle bir taban sessizce kabul edilmez; ölçülen değere çekilir ve
        # durum RAPORLANIR.
        if eski is not None and eski > len(fns):
            print('  ⚠ %s: taban inanılmaz (%d > %d fonksiyon) — ölçülen değere '
                  'çekiliyor, kapı o ana kadar korumasızdı' % (ad, eski, len(fns)))
            # Fonksiyon sayısına çekiliyor, None'a DEĞİL: None "ilk kez
            # yazılıyor" demek ve sıkışmayı raporlamayı susturur; oysa burada
            # gerçekten bir sıkışma oluyor ve görünmesi gerekiyor.
            eski = len(fns)
        yuzde = round((len(fns) - n) / len(fns) * 100)
        durum = '%s: %d/%d kapsanıyor (%%%d) · kapsanmayan %d' % (ad, len(fns) - n, len(fns), yuzde, n)
        if eski is None:
            print('  · %s — taban ilk kez yazılıyor' % durum)
        elif n > eski:
            print('  ✗ %s — KAPSAM DÜŞTÜ (taban %d)' % (durum, eski))
            print('     yeni kapsanmayanlar: %s' % ', '.join(acik[:12]))
            kirmizi = True
        else:
            if n < eski:
                print('  ✓ %s — taban sıkışıyor (%d → %d)' % (durum, eski, n))
            else:
                print('  ✓ %s' % durum)
        yeni[ad] = n if eski is None else min(eski, n)

    if not kirmizi:
        try:
            json.dump(yeni, open(TABAN_YOL, 'w', encoding='utf-8'),
                      ensure_ascii=False, indent=1, sort_keys=True)
        except Exception as e:
            print('  ✗ taban yazılamadı: %s' % e)
            return 1
    return 1 if kirmizi else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
