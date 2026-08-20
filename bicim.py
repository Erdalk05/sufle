#!/usr/bin/env python3
"""bicim.py — BİÇİME KİLİTLENMİŞ TESTLERİ SİSTEMATİK BULUR.

NEDEN VAR (ölçülmüş, tekrarlayan ve bu depodaki EN PAHALI test kusuru):
  Bir test kodun BİÇİMİNE kilitlenince davranış hiç değişmediği hâlde kapı
  kırmızıya döner. `CLAUDE.md` 2026-08-14 gecesinden beş vakayı tablo hâlinde
  yazıyor; 19/20 Ağustos gecesinde beş tane daha çıktı (17, 48, 74, 78, 148).
  Her seferinde tek tek bulundu — yani "sistematik tarama hâlâ yok" maddesi
  (`EKSIKLER` F2) açıktı. Bu araç o taramadır.

YÖNTEM — DAVRANIŞI DEĞİŞTİRMEYEN YENİDEN BİÇİMLENDİRME:
  Kabuğun YALNIZ `<script>` bölgelerinde, dize / yorum / düzenli ifade
  DIŞINDA kalan her `,` ve `;` işaretinden sonra bir boşluk eklenir.
  JavaScript için bu dönüşüm anlamı korur: eklenen boşluk yalnız
  belirteçlerin arasına girer. Kullanıcının gördüğü hiçbir metin
  değişmez — dizelerin içi maskelenip korunuyor.

  Sonra bütün testler bu kopyaya karşı koşturulur. KIRILAN HER TEST,
  davranış hiç değişmediği hâlde kırılmıştır; yani kodun BİÇİMİNE bakıyordur.

DÜRÜSTLÜK SINIRI — araç "biçime bakan her testi" bulmaz, yalnız NOKTALAMA
  ARALIĞINA duyarlı olanları bulur. Girinti, satır sonu ya da değişken adına
  kilitlenmiş bir test buradan geçebilir. Bulduğu her vaka gerçektir; hiç
  bulamaması "temiz" demek değildir. Bunu yazmak zorundayız, yoksa araç
  ölçmediğini ölçmüş gibi görünür.

Kullanım:
    python3 bicim.py            # tara, tabana karşı karşılaştır
    python3 bicim.py --yaz      # ölçüleni yeni taban olarak yaz
    python3 bicim.py --liste    # yalnız dönüşümü uygula, dosyaları bırak
"""
import json
import os
import re
import subprocess
import sys
import tempfile

REPO = os.path.dirname(os.path.abspath(__file__))
TABAN = os.path.join(REPO, 'tests', 'bicim-taban.json')
KABUK = [
    ('SUFLE_TELEFON', os.path.join(REPO, 'index.html')),
    ('SUFLE_MAC', os.path.join(REPO, 'mac', 'Teleprompter Pro.html')),
]


def maske(kod):
    """Dize / yorum / düzenli ifade İÇERİĞİNİ boşlukla değiştirir; uzunluk korunur.

    `tests/kaynak.js` içindeki `dizeSil` ile aynı iş — orada da sebebi aynı:
    kaba bir tarayıcı, kaynaktaki `location.protocol+'//'+host` gibi bir
    dizeyi yorum sanıp satırı ortadan kesiyor.
    """
    out = list(kod)
    bos = ' \t\n\r'

    def desen_mi(j):
        k = j - 1
        while k >= 0 and kod[k] in bos:
            k -= 1
        if k < 0:
            return True
        return not re.match(r'[A-Za-z0-9_$)\]]', kod[k])

    def sil(a, b):
        for k in range(a, min(b, len(out))):
            if out[k] != '\n':
                out[k] = ' '

    j = 0
    n = len(kod)
    while j < n:
        c = kod[j]
        if c == '/' and j + 1 < n and kod[j + 1] == '/':
            e = kod.find('\n', j)
            e = n if e < 0 else e
            sil(j, e); j = e; continue
        if c == '/' and j + 1 < n and kod[j + 1] == '*':
            e = kod.find('*/', j)
            e = n if e < 0 else e + 2
            sil(j, e); j = e; continue
        if c in '"\'`':
            tir = c
            k = j + 1
            while k < n:
                if kod[k] == '\\':
                    k += 2; continue
                if kod[k] == tir:
                    break
                k += 1
            sil(j + 1, k); j = k + 1; continue
        if c == '/' and desen_mi(j):
            k = j + 1
            sinif = False
            bitti = False
            while k < n:
                if kod[k] == '\\':
                    k += 2; continue
                if kod[k] == '[':
                    sinif = True
                elif kod[k] == ']':
                    sinif = False
                elif kod[k] == '\n':
                    break
                elif kod[k] == '/' and not sinif:
                    bitti = True
                    break
                k += 1
            if bitti:
                sil(j + 1, k); j = k + 1; continue
        j += 1
    return ''.join(out)


def yeniden_bicimle(ham):
    """Yalnız <script> bölgelerinde, dize dışındaki `,` ve `;`den sonra boşluk."""
    parcalar = []
    son = 0
    degisen = 0
    for m in re.finditer(r'<script[^>]*>(.*?)</script>', ham, re.S):
        kod = m.group(1)
        mk = maske(kod)
        yeni = []
        for i, ch in enumerate(kod):
            yeni.append(ch)
            if mk[i] in ',;' and i + 1 < len(kod) and kod[i + 1] not in ' \t\n\r':
                yeni.append(' ')
                degisen += 1
        parcalar.append(ham[son:m.start(1)])
        parcalar.append(''.join(yeni))
        son = m.end(1)
    parcalar.append(ham[son:])
    return ''.join(parcalar), degisen


def testler():
    d = os.path.join(REPO, 'tests')
    return [f for f in sorted(os.listdir(d)) if re.match(r'^\d{2,}-.*\.js$', f)]


def main(argv):
    yaz = '--yaz' in argv
    with tempfile.TemporaryDirectory() as td:
        cev = dict(os.environ)
        toplam = 0
        for degisken, yol in KABUK:
            ham = open(yol, encoding='utf-8').read()
            yeni, n = yeniden_bicimle(ham)
            toplam += n
            if yeni == ham:
                print('  ✗ %s: dönüşüm HİÇBİR ŞEY değiştirmedi — araç ölçmüyor' % os.path.basename(yol))
                return 1
            kopya = os.path.join(td, os.path.basename(yol))
            open(kopya, 'w', encoding='utf-8').write(yeni)
            cev[degisken] = kopya
            print('  · %-24s %d noktalama aralığı eklendi' % (os.path.basename(yol), n))
        if toplam < 500:
            print('  ✗ yalnız %d değişiklik — dönüşüm yeterince geniş değil' % toplam)
            return 1
        # İKİ SINIF AYRILIYOR — sayı yoksa anlamsız olurdu.
        #
        # ÇIKARIM: test gerçek fonksiyonu kaynaktan bulup KOŞTURUYOR ve
        #   desen artık eşleşmiyor. Bu, "kopya test yazma, gerçeğini koştur"
        #   disiplininin BEDELİ; testin iddiası doğru, adresi kırılgan.
        #   Bunu kusur saymak, doğru disiplini cezalandırmak olurdu.
        # İDDİA: kod bulundu, KOŞTU ve iddia yine de düştü. Davranış hiç
        #   değişmediğine göre iddia davranışa değil BİÇİME bakıyor.
        #   Deponun tablo hâlinde yazdığı pahalı sınıf tam olarak budur.
        #
        # Ratchet YALNIZ ikinci sınıfa uygulanıyor. Birincisi bilgi olarak
        # basılıyor; ölçüp saklamak, ölçmemekten iyidir.
        CIKARIM = re.compile(r'çıkarılabildi|bulunamadı|çıkarılamadı|okunabildi')
        kirik, cikarim = [], []
        for f in testler():
            r = subprocess.run(['node', os.path.join(REPO, 'tests', f)],
                               capture_output=True, env=cev, timeout=120)
            if r.returncode == 0:
                continue
            cikti = (r.stdout or b'').decode('utf-8', 'replace')
            satir = [x for x in cikti.split('\n') if x.startswith('✗')]
            # Hiç satır yoksa test ÇÖKMÜŞTÜR (tezgâh kurulamadı) — çıkarım sınıfı.
            if not satir or all(CIKARIM.search(x) for x in satir):
                cikarim.append(f)
                print('  · %-42s çıkarım deseni (adres kırılgan)' % f)
            else:
                kirik.append((f, satir[:3]))
                print('  ✗ %-42s İDDİA BİÇİME KİLİTLİ' % f)
                for x in satir[:3]:
                    print('      %s' % x)
    print('\n  %d dosyada İDDİA biçime kilitli · %d dosyada yalnız çıkarım deseni'
          ' · %d dosya tarandı' % (len(kirik), len(cikarim), len(testler())))
    yeni_taban = {'kilitli': len(kirik), 'dosyalar': [f for f, _ in kirik],
                  'cikarim': len(cikarim)}
    if yaz:
        json.dump(yeni_taban, open(TABAN, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('  taban yazıldı:', TABAN)
        return 0
    if not os.path.exists(TABAN):
        print('  ⚠️ taban yok — `python3 bicim.py --yaz` ile kur')
        return 1
    eski = json.load(open(TABAN, encoding='utf-8'))
    if len(kirik) > eski.get('kilitli', 0):
        print('  ⛔ biçime kilitli test ARTTI: %d → %d' % (eski.get('kilitli', 0), len(kirik)))
        return 1
    print('  ✅ biçime kilitli test artmadı (taban %d)' % eski.get('kilitli', 0))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
