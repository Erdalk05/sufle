#!/usr/bin/env python3
"""Çekirdek gömücü — `cekirdek/` içindeki tek kaynağı iki kabuğun İÇİNE yazar.

NEDEN GÖMME, ayrı dosya değil (ölçüldü, 2026-08-14):
  `<script type="module">` + `import` file:// altında YÜKLENMİYOR ve bunu
  SESSİZCE yapıyor — Chrome headless ile sınandı, ekranda boş uygulama kalıyor.
  Mac kullanıcısı HTML'e çift tıkladığında adres file:// olur. Ayrıca ürünün
  kimliği "tek dosya, sıfır bağımlılık": kullanıcı tek HTML'i kopyalayabilmeli.
  Bu yüzden kaynak modüllerde yaşar, ÇIKTI tek dosya kalır.

GÖMMENİN BİLİNEN BEDELİ — BAYAT ÇIKTI:
  Kaynak değişip çıktı yenilenmezse ikisi ayrışır ve kimse fark etmez. Erdal'ın
  diğer depolarında bu iki kez pahalıya patladı ("Turbo bayat-dist", "Vercel
  bayat-dist"): kapı yeşil görünürken yayınlanan kod eskiydi. O yüzden bu betik
  yalnız yazmıyor, DENETLEYEBİLİYOR: `--denetle` çıktıyı yeniden üretip
  diff alır, fark varsa sıfırdan farklı çıkış kodu döner. kapi.sh bunu koşuyor,
  yani bayat çıktı yayına gidemez.

İŞARETLEYİCİ SÖZLEŞMESİ — kabukların içinde:
    /* ==CEKIRDEK:ad== */   ... üretilen içerik ...   /* ==/CEKIRDEK:ad== */
  İşaretleyiciler ELLE konur (bir kez), aradaki her şey ÜRETİLİR. Aradaki
  içeriği elle düzenlersen bir sonraki derlemede kaybolur — bu yüzden üretilen
  blok kendi başına "elle düzenleme" uyarısı taşır.

Kullanım:
    python3 derle.py            # çıktıları yaz
    python3 derle.py --denetle  # yazma, yalnız bayat mı diye bak (kapı adımı)
"""
import os
import re
import sys

REPO = os.path.dirname(os.path.abspath(__file__))
CEKIRDEK = os.path.join(REPO, 'cekirdek')

# Hangi modül hangi kabuğa gömülecek. Bir modül iki kabukta da olabilir —
# "tek kaynak" tam olarak bu demek.
PLAN = [
    # (modül dosyası, gömüleceği kabuklar)
    # Vitrin sayfası da AYNI jetonları kullanır: renkler tek kaynaktan
    # gelmezse tanıtım ile ürün zamanla birbirinden ayrılır ve kimse
    # fark etmez.
    ('jetonlar.css', ['index.html', 'mac/Teleprompter Pro.html', 'tanitim.html']),
    # A.2b'den beri Mac de sözlüğü KULLANIYOR (85 data-i18n), o yüzden
    # ona da gömülüyor. Daha önce yalnız telefondaydı: kullanılmayan 250
    # satır ölü kod olurdu ve denetim.py haklı olarak bağırırdı.
    ('sozluk.js', ['index.html', 'mac/Teleprompter Pro.html']),
    # Mesajlar YALNIZ telefonda: Mac bugün m() kullanmıyor. Gömseydim
    # telefona özgü metinler ('Ayarlar → Safari') Mac dosyasına sızardı.
    ('mesajlar.js', ['index.html']),
    # B.2 — Mac krom düğmeleri de SVG ikona geçti (Tur 41); ikon seti artık
    # iki kabukta da gömülü. Aynı 4 ikon, aynı çizim: platformlar arası
    # tutarlılık tek dosyadan geliyor.
    ('ikonlar.html', ['index.html', 'mac/Teleprompter Pro.html']),
    # .docx okuyucu iki kabukta da kullanılıyor (D.1).
    ('docx.js', ['index.html', 'mac/Teleprompter Pro.html']),
    # E.4 prova raporu hesabı İKİ kabukta da aynı olmalı: telefonda düzeltilip
    # Mac'te unutulan bir eşik, iki platformun farklı sayı göstermesi demek.
    ('prova.js', ['index.html', 'mac/Teleprompter Pro.html']),
    # Kumanda eşleme KURALLARI iki kabukta da aynı olmalı; varsayılan
    # TABLO kabuğa özeldir ve çekirdekte değil (D.3).
    # Saf metin araçları: iki kabukta SÜRÜKLENMİŞ kopyalardı ve `cleanText`
    # gerçekten farklı iş yapıyordu (telefonda görünmez karakter temizliği
    # YOKTU). Tek kaynak (A.3'ün taşınabilir parçası).
    ('metin.js', ['index.html', 'mac/Teleprompter Pro.html']),
    ('kumanda.js', ['index.html', 'mac/Teleprompter Pro.html']),
    # Zorlanma haritası: prova raporunun tamamlayıcısı, hesabı ortak.
    ('zorlanma.js', ['index.html', 'mac/Teleprompter Pro.html']),
    # Mac mesajları YALNIZ Mac'te: telefonunkini gömmek telefona özgü
    # metin sızdırmıştı (tests/52). Kabuk kullandığını gömer.
    ('mac-mesajlar.js', ['mac/Teleprompter Pro.html']),
]

BASLIK = ('/* ÜRETİLDİ — ELLE DÜZENLEME. Kaynak: cekirdek/{ad}\n'
          '   Değişiklik oraya yazılır, sonra: python3 derle.py\n'
          '   (kapı bayat çıktıyı yakalar, elle düzenlemen sessizce kaybolur) */')


def isaret(ad):
    # HTML gövdesine gömülen modül CSS-yorum işaretleyicisi TAŞIYAMAZ:
    # /* */ orada yorum değil GÖRÜNÜR METİN olur. .html modülü HTML yorumu alır.
    if ad.endswith('.html'):
        return (f'<!-- ==CEKIRDEK:{ad}== -->', f'<!-- ==/CEKIRDEK:{ad}== -->')
    return (f'/* ==CEKIRDEK:{ad}== */', f'/* ==/CEKIRDEK:{ad}== */')


def uret(ad):
    """Modülün gömülecek hâli: başlık + içerik."""
    with open(os.path.join(CEKIRDEK, ad), encoding='utf-8') as f:
        govde = f.read().strip()
    b = BASLIK.format(ad=ad)
    if ad.endswith('.html'):
        b = '<!-- ' + b.replace('/* ', '').replace(' */', '') + ' -->'
    return b + '\n' + govde


def yerlestir(kabuk_metni, ad, icerik, kabuk_yolu):
    """İşaretleyiciler arasını değiştir. İşaretleyici yoksa AÇIKÇA hata ver.

    Sessizce atlamak en tehlikelisi olurdu: derleme "başarılı" der, kabuk
    hiç güncellenmez, kapı da diff görmediği için yeşil kalır."""
    ac, kapa = isaret(ad)
    if ac not in kabuk_metni or kapa not in kabuk_metni:
        raise SystemExit(
            f'⛔ {kabuk_yolu}: "{ad}" için işaretleyici yok.\n'
            f'   Kabuğun içine bir kez şunu koy:\n     {ac}\n     {kapa}')
    desen = re.compile(re.escape(ac) + r'.*?' + re.escape(kapa), re.S)
    if len(desen.findall(kabuk_metni)) != 1:
        raise SystemExit(f'⛔ {kabuk_yolu}: "{ad}" işaretleyicisi 1 kez olmalı.')
    # sub yerine lambda: içerikteki \g gibi kaçış dizileri yorumlanmasın.
    return desen.sub(lambda _: ac + '\n' + icerik + '\n' + kapa, kabuk_metni)


def calis(denetle):
    bayat, yazilan = [], []
    for ad, kabuklar in PLAN:
        icerik = uret(ad)
        for k in kabuklar:
            yol = os.path.join(REPO, k)
            with open(yol, encoding='utf-8') as f:
                eski = f.read()
            yeni = yerlestir(eski, ad, icerik, k)
            if yeni == eski:
                continue
            if denetle:
                bayat.append(f'{k} ← cekirdek/{ad}')
            else:
                with open(yol, 'w', encoding='utf-8') as f:
                    f.write(yeni)
                yazilan.append(f'{k} ← cekirdek/{ad}')

    if denetle:
        if bayat:
            print('⛔ BAYAT ÇIKTI — kaynak değişmiş, kabuk yenilenmemiş:')
            for b in bayat:
                print('   ', b)
            print('   Çözüm: python3 derle.py')
            return 1
        print(f'✓ çıktı güncel ({sum(len(k) for _, k in PLAN)} gömme noktası)')
        return 0

    if yazilan:
        for y in yazilan:
            print('✓ yazıldı:', y)
    else:
        print('✓ değişiklik yok, çıktı zaten güncel')
    return 0


if __name__ == '__main__':
    sys.exit(calis('--denetle' in sys.argv))
