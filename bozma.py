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
    # ÖLÇÜLDÜ (2026-08-16): mesaj sözlükleri ve ikon seti KAYNAK tablosunda HİÇ
    # yoktu, yani kullanıcıya gösterilen bütün uyarı metinleri bozma turunun
    # dışındaydı — bir testin o metinleri gerçekten ölçüp ölçmediği hiç
    # kanıtlanamıyordu. `tests/115` artık çekirdeğin her dosyasını burada arıyor.
    'mesajlar': (os.path.join(REPO, 'cekirdek', 'mesajlar.js'), 'SUFLE_MESAJ'),
    'mac_mesajlar': (os.path.join(REPO, 'cekirdek', 'mac-mesajlar.js'), 'SUFLE_MACMESAJ'),
    'ikonlar': (os.path.join(REPO, 'cekirdek', 'ikonlar.html'), 'SUFLE_IKON'),
    'docx': (os.path.join(REPO, 'cekirdek', 'docx.js'), 'SUFLE_DOCX'),
    # PDF okuyucu: kabul sınavı (eşleme yoksa metin verme) buradadır ve
    # gevşetilirse kullanıcıya SESSİZCE çöp sufle metni gider.
    'pdf': (os.path.join(REPO, 'cekirdek', 'pdf.js'), 'SUFLE_PDF'),
    'oniz': (os.path.join(REPO, 'cekirdek', 'oniz.js'), 'SUFLE_ONIZ'),
    # Işık denetçisinin eşikleri: gevşerse kullanıcı KÖTÜ IŞIKTA çekmeye
    # "iyi görünüyor ✓" onayıyla devam eder — sessiz yanlış sonuç sınıfı.
    # İki kabukta da gömülü olduğu için tek bozma iki platformu birden vurur.
    'isik': (os.path.join(REPO, 'cekirdek', 'isik.js'), 'SUFLE_ISIK'),
    # Perde rengi ölçümünün TEK RENK eşiği: gevşerse iki platform da
    # sessizce yanlış anahtar yazar ve yeşil ekran hiç tutmaz.
    'kroma': (os.path.join(REPO, 'cekirdek', 'kroma.js'), 'SUFLE_KROMA'),
    # Prova hesabı İKİ kabukta da gömülü: çekirdeği bozmak ikisini birden
    # vurur, yani en pahalı sınıf.
    'prova': (os.path.join(REPO, 'cekirdek', 'prova.js'), 'SUFLE_PROVA'),
    'kumanda': (os.path.join(REPO, 'cekirdek', 'kumanda.js'), 'SUFLE_KUMANDA'),
    'metin': (os.path.join(REPO, 'cekirdek', 'metin.js'), 'SUFLE_METIN'),
    'zorlanma': (os.path.join(REPO, 'cekirdek', 'zorlanma.js'), 'SUFLE_ZORLANMA'),
    # G.2 — altyazı tema tablosu iki kabukta da gömülü; okunurluk kuralı
    # burada yaşıyor, yani bozulabilmesi şart.
    'altyazi': (os.path.join(REPO, 'cekirdek', 'altyazi.js'), 'SUFLE_ALTYAZI'),
    'tempo': (os.path.join(REPO, 'cekirdek', 'tempo.js'), 'SUFLE_TEMPO'),
    # Kaydırma pürüzsüzlüğünün eğrisi. İki kabukta da gömülü: burada bir
    # gevşeme her paragraf sonunda GÖRÜNÜR takılma demek ve hiçbir ekran
    # görüntüsü bunu göstermez — yalnız zaman ekseninde ölçülür.
    'akis': (os.path.join(REPO, 'cekirdek', 'akis.js'), 'SUFLE_AKIS'),
    'marka': (os.path.join(REPO, 'cekirdek', 'marka.js'), 'SUFLE_MARKA'),
    'klip': (os.path.join(REPO, 'cekirdek', 'klip.js'), 'SUFLE_KLIP'),
    'muzik': (os.path.join(REPO, 'cekirdek', 'muzik.js'), 'SUFLE_MUZIK'),
    'yon': (os.path.join(REPO, 'cekirdek', 'yon.js'), 'SUFLE_YON'),
    'senaryo': (os.path.join(REPO, 'cekirdek', 'senaryo.js'), 'SUFLE_SENARYO'),
    'etiket': (os.path.join(REPO, 'cekirdek', 'etiket.js'), 'SUFLE_ETIKET'),
    'kamera': (os.path.join(REPO, 'cekirdek', 'kamera.js'), 'SUFLE_KAMERA'),
    'guzellik': (os.path.join(REPO, 'cekirdek', 'guzellik-glsl.js'), 'SUFLE_GUZELLIK'),
    # Kapının kendi betiği de bozulabilmeli: kapsam kapısının etkisiz
    # kaldığı bir gece ancak böyle yakalanır.
    'kapsam': (os.path.join(REPO, 'kapsam.py'), 'SUFLE_KAPSAM'),
    # Yol-tarifi dedektörü burada yaşıyor (v9.32). Tabloya EKLENMEZSE
    # `denetim.py`ye inen hiçbir bozma testlere ulaşmaz — bu deponun dört kez
    # çıkan kör noktası (env desteksiz okuma).
    'denetim': (os.path.join(REPO, 'denetim.py'), 'SUFLE_DENETIM'),
    # Derleme sırası ve TEST TEZGÂHI da bozulabilmeli. Tezgâh yarım blok
    # çıkardığında test kırmızı vermez, YANLIŞ ÖLÇER — bu deponun en pahalı
    # sınıfı (2026-08-16da `duzMetin` üstünde ölçüldü).
    'derle': (os.path.join(REPO, 'derle.py'), 'SUFLE_DERLE'),
    'tezgah': (os.path.join(REPO, 'tests', 'kaynak.js'), 'SUFLE_TEZGAH'),
    'tekrar_taban': (os.path.join(REPO, 'tests', 'tekrar-taban.json'), 'SUFLE_TEKRAR'),
    # Mağaza metni de bozulabilmeli: abartma engelinin gerçekten
    # çalıştığı ancak metne olmayan bir özellik yazılarak kanıtlanır.
    'magaza': (os.path.join(REPO, 'MAGAZA.md'), 'SUFLE_MAGAZA'),
    # Teknik ölçüm belgesi de bozulabilmeli: mağaza kabuğunu bloke eden
    # iddia burada yaşıyor, çürütüldüğü de burada yazılı.
    'magaza_teknik': (os.path.join(REPO, 'MAGAZA_TEKNIK.md'), 'SUFLE_MAGAZA_TEKNIK'),
    'fiyat': (os.path.join(REPO, 'FIYATLANDIRMA.md'), 'SUFLE_FIYAT'),
    # KAPI ARACININ KENDİSİ de bozulabilmeli: `kontrast.py` çizilmiş arayüzü
    # ölçen tek yer. Kuralı gevşetilirse (adsız öge kuralını tabana bağlamak,
    # ölçülen durumları silmek) kapı sessizce silahsızlanır — bu deponun
    # `tests/113` ile bir kez yakaladığı sınıf.
    'kontrast': (os.path.join(REPO, 'kontrast.py'), 'SUFLE_KONTRAST'),
    # Çekim akışı ölçümü de kapının bir aracı: gevşetilirse zincir sessizce
    # ölçülmez olur (kontrast.py ile aynı sınıf).
    'kayit_olcum': (os.path.join(REPO, 'kayit.py'), 'SUFLE_KAYIT_OLCUM'),
    # VAAT KİLİDİNİN İKİ AYAĞI. Gizlilik belgesi kullanıcıya verilen SÖZ,
    # service worker ise çevrimdışı çalışmayı sağlayan tek ağ katmanı:
    # ikisi de sessizce gevşetilebilir ve ikisi de vaadi doğrudan bozar.
    'gizlilik': (os.path.join(REPO, 'GIZLILIK.md'), 'SUFLE_GIZLILIK'),
    # Deneme kılavuzu ve canlı duman betiği: elden dağıtımın iki dayanağı.
    'deneme': (os.path.join(REPO, 'DENEME.md'), 'SUFLE_DENEME'),
    'canli': (os.path.join(REPO, 'canli.py'), 'SUFLE_CANLI'),
    'kapi': (os.path.join(REPO, 'kapi.sh'), 'SUFLE_KAPI'),
    # Çizilmiş arayüzü ölçen araç: kontrast, erişilebilir ad, çevrilmemiş
    # metin ve tipografik ritim onun içinde yaşıyor. Bir pası sessizce
    # silmek kapıyı yeşil bırakır — ölçmeyen kapı, kapı değildir.
    'kontrast': (os.path.join(REPO, 'kontrast.py'), 'SUFLE_KONTRAST'),
    'manifest': (os.path.join(REPO, 'manifest.json'), 'SUFLE_MANIFEST'),
    # Mağaza kabuğu: Apple hesabı gelene kadar tek koruma bu üç dosya.
    'kabuk_plist': (os.path.join(REPO, 'ios-kabuk', 'Kabuk-Info.plist'), 'SUFLE_KABUK_PLIST'),
    'kabuk_swift': (os.path.join(REPO, 'ios-kabuk', 'kabuk.swift'), 'SUFLE_KABUK_SWIFT'),
    'kabuk_betik': (os.path.join(REPO, 'ios-kabuk', 'kabuk-derle.sh'), 'SUFLE_KABUK_BETIK'),
    'kabuk_olcum': (os.path.join(REPO, 'ios-kabuk', 'olcum-kabuk.html'), 'SUFLE_KABUK_OLCUM'),
    'sw': (os.path.join(REPO, 'sw.js'), 'SUFLE_SW'),
    # Mac yerel sunucusu: kumanda ve uzak önizleme yolunun tamamı burada.
    'sunucu': (os.path.join(REPO, 'mac', 'teleprompter_server.py'), 'SUFLE_SUNUCU'),
    'iphone_sunucu': (os.path.join(REPO, 'yerel-sunucu', 'iphone_server.py'), 'SUFLE_IPHONE_SUNUCU'),
    # Rekabet ölçümü de bozulabilmeli: "sunucu işletmek istiyor muyuz?"
    # kararının dayandığı sayılar burada yaşıyor ve bir denetim belgesinin
    # en tehlikeli hâli, ölçmediğini ölçmüş gibi sunmasıdır.
    'rekabet': (os.path.join(REPO, 'belgeler', 'REKABET_30_OLCULDU.md'), 'SUFLE_REKABET'),
    # Sabah raporu da bozulabilir bir kaynak (2026-08-17): rapor kapısı
    # "rapor gerçekte ne olduysa onu söylüyor mu" diye ölçüyor ve bu iddianın
    # kendisi kanıtlanmalı. Kanıtsız kapı, kapı değildir.
    'rapor': (os.path.join(REPO, 'SABAH_RAPORU.md'), 'SUFLE_RAPOR'),
    'matris': (os.path.join(REPO, 'GUVENILIRLIK_MATRISI.md'), 'SUFLE_MATRIS'),
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
