#!/usr/bin/env python3
"""Kasıtlı bozma turu — testin AYIRT ETTİĞİNİ tekrarlanabilir biçimde kanıtlar.

Bu depoda kural şu: yeni test yazınca kodu kasıtlı boz, test kırılmalı.
Kural işliyordu ama BİR KEREYE MAHSUS: bozmalar geçici betiklerdi, kanıt
yalnız commit mesajlarında kaldı. Yarın biri o testi gevşetirse kimse
fark etmez. Bu betik o turu kalıcı kılıyor.

Her kayıt: hangi testin, hangi kaynakta, hangi TEK satırı değişince
kırılması gerektiği. Betik sırayla:
  1) değişikliğin GERÇEKTEN indiğini doğrular (tam bir kez eşleşmeli) —
     bu gece iki kez yanlış bloğa bozma uygulayıp yanılmıştım
  2) bozuk kopyayı geçici dosyaya yazar
  3) testi o kopyaya karşı koşturur
  4) test GEÇERSE kırmızı verir: bozma ayırt edilmiyor demektir

Kullanım:  python3 bozma.py            (hepsi)
           python3 bozma.py 104        (yalnız adı 104 ile başlayanlar)
"""
import json, os, re, shutil, subprocess, sys, tempfile

REPO = os.path.dirname(os.path.abspath(__file__))
KAYIT = os.path.join(REPO, 'tests', 'bozmalar.json')
KAYNAK = {
    'telefon': (os.path.join(REPO, 'index.html'), 'SUFLE_TELEFON'),
    'mac': (os.path.join(REPO, 'mac', 'Teleprompter Pro.html'), 'SUFLE_MAC'),
    # Çekirdek modülleri de bozulabilmeli: kabuklara GÖMÜLDÜKLERİ için
    # bir jeton hatası iki platformu birden vurur, yani en pahalı sınıf.
    'jeton': (os.path.join(REPO, 'cekirdek', 'jetonlar.css'), 'SUFLE_JETON'),
    'sozluk': (os.path.join(REPO, 'cekirdek', 'sozluk.js'), 'SUFLE_SOZLUK'),
    'docx': (os.path.join(REPO, 'cekirdek', 'docx.js'), 'SUFLE_DOCX'),
    # Mağaza metni de bozulabilmeli: abartma engelinin gerçekten
    # çalıştığı ancak metne olmayan bir özellik yazılarak kanıtlanır.
    'magaza': (os.path.join(REPO, 'MAGAZA.md'), 'SUFLE_MAGAZA'),
    # Vitrin sayfası da: kullanıcının uygulamayı açmadan ÖNCE okuduğu
    # sözler burada; abartma engeli ancak abartarak kanıtlanır.
    'vitrin': (os.path.join(REPO, 'tanitim.html'), 'SUFLE_VITRIN'),
}


def kos(kayitlar, suzgec=None):
    gecti = kirik = atlandi = 0
    for k in kayitlar:
        ad = k['ad']
        if suzgec and not k['test'].startswith(suzgec):
            continue
        yol, degisken = KAYNAK[k['kaynak']]
        if not os.path.exists(yol):
            print('  — %s: kaynak yok, atlandı' % ad); atlandi += 1; continue
        ham = open(yol, encoding='utf-8').read()
        n = ham.count(k['bul'])
        # BOZMANIN İNDİĞİNİ ÖNCE DOĞRULA. İnmezse test elbette geçer ve
        # "bozma yakalanmadı" diye yanlış bir sonuç çıkarırız.
        if n != 1:
            print('  ✗ %s: hedef metin %d kez bulundu (1 olmalı) — bozma inmedi' % (ad, n))
            kirik += 1
            continue
        with tempfile.TemporaryDirectory() as td:
            kopya = os.path.join(td, os.path.basename(yol))
            open(kopya, 'w', encoding='utf-8').write(ham.replace(k['bul'], k['koy'], 1))
            cev = dict(os.environ); cev[degisken] = kopya
            r = subprocess.run(['node', os.path.join(REPO, 'tests', k['test'])],
                               capture_output=True, env=cev)
        if r.returncode == 0:
            print('  ✗ %s: bozma YAKALANMADI (%s geçti)' % (ad, k['test']))
            kirik += 1
        else:
            print('  ✓ %s → %s kırıldı' % (ad, k['test']))
            gecti += 1
    return gecti, kirik, atlandi


def main(argv):
    if not os.path.exists(KAYIT):
        print('  ✗ bozma kaydı yok: %s' % KAYIT)
        return 1
    kayitlar = json.load(open(KAYIT, encoding='utf-8'))
    if not kayitlar:
        print('  ✗ bozma kaydı boş — hiçbir şey ölçülmedi')
        return 1
    suzgec = argv[0] if argv else None
    gecti, kirik, atlandi = kos(kayitlar, suzgec)
    kapsanan = len({k['test'] for k in kayitlar})
    print('  %d bozma kanıtlandı, %d kırık, %d atlandı · kanıtlı test dosyası: %d'
          % (gecti, kirik, atlandi, kapsanan))
    # KANITLI TEST SAYISI DÜŞMEMELİ. Bir bozma kaydını silmek en kolay
    # "kapıyı yeşile boyama" yolu olurdu; taban onu engelliyor. Diğer
    # kapılarla aynı desen: yalnız YUKARI gider.
    if suzgec is None:
        tb = os.path.join(REPO, 'tests', 'bozma-taban.json')
        eski = 0
        if os.path.exists(tb):
            try: eski = json.load(open(tb, encoding='utf-8')).get('kanitli', 0)
            except Exception: eski = 0
        if kapsanan < eski:
            print('  ✗ kanıtlı test dosyası DÜŞTÜ: %d → %d' % (eski, kapsanan))
            kirik += 1
        elif not kirik:
            json.dump({'kanitli': max(eski, kapsanan)}, open(tb, 'w', encoding='utf-8'),
                      ensure_ascii=False, indent=1)
    return 1 if kirik else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
