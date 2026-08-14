#!/usr/bin/env python3
"""Platform farkı çıkarıcı — telefonda olup Mac'te olmayan (ve tersi) YÜZEYLERİ listeler.

NEDEN fonksiyon adı DEĞİL de DOM yüzeyi:
  CLAUDE.md 7. hata sınıfı: "grep sayımı kanıt değil". İki dosya aynı işi
  farklı adlandırıyor (`st.` / `state.`, telefonda i18n anahtarı, Mac'te
  gömülü Türkçe). Fonksiyon adlarını karşılaştıran bir araç bu yüzden
  yüzlerce sahte fark üretir ve okunmaz hâle gelir.

  DOM id'leri ise iki dosyada da aynı sözleşmeyi kullanıyor (playBtn, camBtn,
  recBtn...) çünkü ikisi de aynı üründen türedi. Bir özellik bir platformda
  varsa, ona ait bir DÜĞME ya da GİRDİ vardır. Ölçüt bu: kullanıcının
  dokunabildiği yüzey.

  id yeniden adlandırılmışsa id karşılaştırması onu "fark" sanır; bu yüzden
  ikinci ölçüt: o id'nin ÖGESİNİN GÖRÜNÜR ETİKETİ karşı platformda var mı.
  Etiket varsa özellik vardır, yalnız id'si değişmiştir — fark SAYILMAZ.

  ⚠️ İlk yazımda bu kurtarma ölçütü id DİZESİNİ karşı tarafın etiketleriyle
  karşılaştırıyordu. id'ler İngilizce camelCase (`pipBtn`), etiketler Türkçe
  ("Yüzen Sufle") olduğu için eşleşme MATEMATİKSEL OLARAK imkânsızdı: ölçüt
  hiç ateşlenmiyor, araç "0 şüpheli" diyerek doğru çalıştığını sanıyordu.
  Ayırt etmeyen ölçüt değersizdir — `--kanit` bunu artık kanıtlıyor.

⚠️ ARACIN BİLİNEN SINIRI — çıktısı hipotezdir, kanıt değil:
  İşaretlemedeki etiket ÇALIŞMA ZAMANINDA değişebilir. Mac'te
  `<button id="rrDownload">⬇︎ İndir (.webm)</button>` duruyor ve araç bunu
  "Mac hâlâ webm veriyor" diye okutuyor; oysa satır 1875 etiketi gerçek
  uzantıyla yeniden yazıyor. Her farkı koda bakarak doğrula.

Kullanım:
    python3 fark.py                  # özet
    python3 fark.py --tam            # her yüzeyi tek tek listele
    python3 fark.py --kanit          # ölçüt ayırt ediyor mu (iki vaka)
"""
import html
import os
import re
import sys

REPO = os.path.dirname(os.path.abspath(__file__))
TELEFON = os.path.join(REPO, 'index.html')
MAC = os.path.join(REPO, 'mac', 'Teleprompter Pro.html')

# Yüzey saymayan id'ler: düzen kabı, ölçüm hedefi, salt-görsel öge.
# Bunlar kullanıcının DOKUNDUĞU şey değil; farkları anlamlı bilgi taşımıyor.
GOZARDI = re.compile(
    r'^(wrap|root|app|main|body|page|cont|container|box|panel|pane|row|col|'
    r'grid|list|sheet|overlay|mask|shim|spacer|sizer|probe|meas|canvas|cv|'
    r'ctx|tmp|test|dbg|debug)\d*$', re.I)


def govde(yol):
    """<script> ve <style> bloklarını atıp yalnız işaretlemeyi döndür.

    Betik içindeki `id="x"` benzeri dizeler yüzey değildir (çalışma zamanında
    üretilen düğüm olabilir ama ölçüt "işaretlemede duran yüzey" olarak
    seçildi — ikisini karıştırmak sayıyı şişirir)."""
    s = open(yol, encoding='utf-8').read()
    s = re.sub(r'<script\b.*?</script>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<style\b.*?</style>', ' ', s, flags=re.S | re.I)
    return s


def idler(kaynak):
    """YALNIZ etkileşimli ögelerin id'leri.

    Başta her id toplanıyordu ve çıktı okunmaz hâldeydi: `topbar`, `stageWrap`,
    `fontV` gibi düzen kabı ve sayı göstergesi 285 farkın çoğunu üretiyordu —
    hiçbiri özellik değil. Belgenin kendi ölçütü "kullanıcının DOKUNDUĞU
    yüzey" diyordu; kod bunu yapmıyordu. Ölçüt iddiaya uyduruldu."""
    out = set()
    for m in re.finditer(
            r'<(button|input|select|textarea|a|details|summary)\b[^>]*\bid="([A-Za-z][\w-]*)"',
            kaynak, re.I):
        i = m.group(2)
        if not GOZARDI.match(i):
            out.add(i)
    return out


def normal(s):
    """Etiketi karşılaştırılabilir hâle getir: emoji, noktalama, boşluk dışarı.

    Emoji ATILIR çünkü iki platform aynı işlevi farklı emojiyle etiketliyor
    (Mac '● Kaydet', telefon '●'). Emoji tutulsaydı her etiket fark sayılırdı."""
    s = html.unescape(s)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = ''.join(c for c in s if c.isalnum() or c.isspace() or c in 'ğüşıöçĞÜŞİÖÇ')
    return re.sub(r'\s+', ' ', s).strip().lower()


def etiketler(kaynak):
    """Kullanıcının GÖRDÜĞÜ metinler: düğme/başlık/özet/etiket + title/aria."""
    out = set()
    for m in re.finditer(
            r'<(button|summary|label|h[1-4]|option|legend)\b[^>]*>(.*?)</\1>',
            kaynak, re.S | re.I):
        t = normal(m.group(2))
        if len(t) >= 2:
            out.add(t)
    for m in re.finditer(r'\b(?:title|aria-label|placeholder)="([^"]{2,})"', kaynak):
        t = normal(m.group(1))
        if len(t) >= 2:
            out.add(t)
    return out


def id_etiket(kaynak):
    """id -> o ögenin kullanıcıya görünen etiketi (yoksa boş).

    Kurtarma ölçütünün taşıyıcısı: id değişmiş ama etiket duruyorsa özellik
    vardır. Etiket ögenin içeriğinden, yoksa title/aria-label/placeholder'dan
    alınır — düğmenin yalnız emoji taşıdığı yerlerde tek okunur ad odur."""
    harita = {}
    desen = re.compile(
        r'<(\w+)\b([^>]*\bid="([A-Za-z][\w-]*)"[^>]*)>(.*?)</\1>', re.S | re.I)
    for m in desen.finditer(kaynak):
        etiket_id, oz, iid, ic = m.group(3), m.group(2), m.group(3), m.group(4)
        t = normal(ic)
        if len(t) < 2:
            a = re.search(r'\b(?:title|aria-label|placeholder)="([^"]{2,})"', oz)
            t = normal(a.group(1)) if a else ''
        # Kapsayıcı ögede tüm alt metin toplanır ve devasa olur; ad değil o.
        if len(t) > 60:
            a = re.search(r'\b(?:title|aria-label|placeholder)="([^"]{2,})"', oz)
            t = normal(a.group(1)) if a else ''
        if t:
            harita[iid] = t
    # Kendi kendine kapanan ögeler (<input id=x placeholder=...>) yukarıdaki
    # desene takılmaz; onları ayrıca topla.
    for m in re.finditer(
            r'<(?:input|img|source)\b([^>]*\bid="([A-Za-z][\w-]*)"[^>]*)>', kaynak, re.I):
        iid = m.group(2)
        if iid in harita:
            continue
        a = re.search(r'\b(?:title|aria-label|placeholder)="([^"]{2,})"', m.group(1))
        if a:
            harita[iid] = normal(a.group(1))
    return harita


def ayir(kaynak_idler, hedef_idler, kaynak_etiket, hedef_etiketleri):
    """id farklarını GERÇEK eksik / yalnız-yeniden-adlandırılmış diye ayır."""
    gercek, adlandirma = [], []
    for i in sorted(kaynak_idler - hedef_idler):
        et = kaynak_etiket.get(i, '')
        if et and et in hedef_etiketleri:
            adlandirma.append((i, et))
        else:
            gercek.append((i, et))
    return gercek, adlandirma


def kanit():
    """Kurtarma ölçütü GERÇEKTEN ayırt ediyor mu — kasıtlı iki vaka.

    CLAUDE.md: yeni ölçüt yazınca ayırt ettiğini kanıtla. İlk yazımdaki ölü
    ölçüt tam da bu adım atlandığı için 0 döndürüp doğru görünüyordu."""
    tg, mg = govde(TELEFON), govde(MAC)
    te, me = etiketler(tg), etiketler(mg)
    tel_et, mac_et = id_etiket(tg), id_etiket(mg)

    ortak_etiket = None
    for i, et in mac_et.items():
        if i not in idler(tg) and et in te:
            ortak_etiket = (i, et)
            break
    a = ayir({'uydurmaXyz'}, set(), {'uydurmaXyz': 'kesinlikle olmayan etiket'}, te)
    print("kanıt 1 · karşılıksız etiket GERÇEK fark sayılmalı :",
          "GEÇTİ" if a[0] and not a[1] else "KIRIK")
    if ortak_etiket:
        i, et = ortak_etiket
        b = ayir({i}, set(), {i: et}, te)
        print(f"kanıt 2 · etiketi karşıda duran id kurtarılmalı ({i} = '{et}') :",
              "GEÇTİ" if b[1] and not b[0] else "KIRIK")
    else:
        print("kanıt 2 · ATLANDI: yeniden adlandırılmış tek örnek bulunamadı")
    print(f"(telefon {len(tel_et)} id'nin etiketi çözüldü · Mac {len(mac_et)})")
    return 0


def main():
    if '--kanit' in sys.argv:
        return kanit()
    tam = '--tam' in sys.argv
    tg, mg = govde(TELEFON), govde(MAC)
    ti, mi = idler(tg), idler(mg)
    te, me = etiketler(tg), etiketler(mg)
    tel_et, mac_et = id_etiket(tg), id_etiket(mg)

    mac_yok, mac_ad = ayir(ti, mi, tel_et, me)
    tel_yok, tel_ad = ayir(mi, ti, mac_et, te)

    print(f"telefon yüzey: {len(ti)} id · {len(te)} etiket")
    print(f"Mac yüzey    : {len(mi)} id · {len(me)} etiket")
    print(f"ortak id     : {len(ti & mi)}")
    print()
    print(f"⬅ TELEFONDA VAR, MAC'TE YOK : {len(mac_yok)}")
    print(f"➡ MAC'TE VAR, TELEFONDA YOK : {len(tel_yok)}")
    print(f"~ etiketi karşıda duran, yalnız id'si farklı (fark SAYILMADI): "
          f"{len(mac_ad) + len(tel_ad)}")

    if tam:
        print("\n--- telefonda var, Mac'te yok ---")
        for i, et in mac_yok:
            print(f"  {i:26} {et}")
        print("\n--- Mac'te var, telefonda yok ---")
        for i, et in tel_yok:
            print(f"  {i:26} {et}")
        print("\n--- yalnız ad farkı (özellik iki tarafta da var) ---")
        for i, et in mac_ad + tel_ad:
            print(f"  {i:26} {et}")
    else:
        print("\n(tek tek görmek için: python3 fark.py --tam · ölçüt kanıtı: --kanit)")

    return 0


if __name__ == '__main__':
    sys.exit(main())
