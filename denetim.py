#!/usr/bin/env python3
"""Sufle statik denetim — her sürümde koşturulacak.
Yakaladıkları: yinelenen id · eksik DOM ögesi · sözlükte olmayan metin anahtarı ·
TR/EN farkı · TANIMSIZ FONKSİYON ÇAĞRISI (bu sonuncusu kayıt düğmesini kıracaktı)."""
import re, sys, collections

BUILTIN = set("""if for while switch catch return typeof function new delete void yield await async
String Number Math JSON Array Object Boolean Promise Date RegExp Set Map WeakMap Symbol Error
parseInt parseFloat isFinite isNaN encodeURIComponent decodeURIComponent escape unescape
setTimeout setInterval clearTimeout clearInterval requestAnimationFrame cancelAnimationFrame
getComputedStyle matchMedia structuredClone queueMicrotask
fetch alert confirm prompt URL URLSearchParams Blob File FileReader FormData Image Audio Event
MediaRecorder MediaStream MediaStreamTrack AudioContext EventSource Headers Response Request
DataTransfer PointerEvent KeyboardEvent MouseEvent CustomEvent IntersectionObserver
ResizeObserver MutationObserver TextDecoder TextEncoder Uint8Array Uint8ClampedArray
Uint16Array Uint32Array Int8Array Int16Array Float64Array DataView
Float32Array Int32Array ArrayBuffer DOMParser Notification Worker indexedDB localStorage
sessionStorage document window navigator location history performance screen console
speechSynthesis SpeechRecognition webkitSpeechRecognition
DecompressionStream CompressionStream""".split())
# DecompressionStream: D.1'de .docx okumak için kullanıldı. TARAYICININ KENDİ
# API'si (Chrome 103+, Safari 16.4+, Firefox 113+), kütüphane DEĞİL — zaten
# .docx'i sıfır bağımlılıkla okuyabilmemizin tek sebebi bu. Kod tarafında
# `typeof DecompressionStream!=='function'` ile ayrıca korunuyor, yani
# desteklemeyen tarayıcıda sessizce patlamıyor, açıkça hata veriyor.

def _satir_yorumunu_at(line):
    """Satırdaki // yorumunu atar ama TIRNAK İÇİNDEKİNE dokunmaz.

    Düz regex iki yönden de yanılıyordu:
      · yalnız satır başındakini atmak  -> yorumun son kelimesi kod sanılıyor
      · her // sonrasını atmak          -> metindeki "/ // (2)" dizeyi kesiyor
    Soldan tarayıp tırnak durumunu izliyoruz; kaçışlı karakter atlanıyor,
    "https://" gibi şema ayracı korunuyor.
    """
    tek = cift = False
    i, n = 0, len(line)
    while i < n:
        ch = line[i]
        if ch == "\\":
            i += 2
            continue
        if ch == "'" and not cift:
            tek = not tek
        elif ch == '"' and not tek:
            cift = not cift
        elif ch == "/" and i + 1 < n and line[i+1] == "/" and not tek and not cift:
            if i > 0 and line[i-1] == ":":      # https:// — yorum değil
                i += 2
                continue
            return line[:i]
        i += 1
    return line


def kullanilan_anahtarlar(path):
    """Bir kabuğun KULLANDIĞI I18N anahtarları: t('x'), data-i18n, data-i18n-ph.

    A.2b'den beri sözlük iki kabuk arasında ORTAK (cekirdek/sozluk.js). Ölü
    anahtar denetimi tek dosyaya bakarsa YALAN söyler: Mac'in kullandığı
    anahtar telefonda ölü görünür ve tersi. İlk koşuşta 35 sahte "ölü anahtar"
    tam bu yüzden çıktı. Kullanım BÜTÜN kabuklardan toplanmalı."""
    src = open(path, encoding="utf-8").read()
    html = re.sub(r"<script.*?</script>", "", src, flags=re.S)
    bloklar = re.findall(r"<script>(.*?)</script>", src, re.S)
    js = bloklar[-1] if bloklar else ""
    # data-i18n-title ve data-aria DE kullanımdır. A.2c'de eklendiler ve bu
    # satır güncellenmeyince 21 anahtar "hiç kullanılmıyor" diye bağırdı;
    # oysa hepsi Mac işaretlemesinde bağlıydı. Dedektörün kendi kör noktası.
    # Anahtarı saklayan yardımcı (bkz. tc toplayıcısındaki not) BURADA DA
    # sayılmalı: yalnız orada sayılırsa anahtar kendi kabuğunda görünür ama
    # ORTAK sözlüğü paylaşan diğer kabukta "ölü" bildirilir.
    yardimci = set()
    for a, b in re.findall(r"\bbilgiGosterK\('([A-Za-z0-9]+)'\s*,\s*'([A-Za-z0-9]+)'\)", js):
        yardimci.add(a); yardimci.add(b)
    # KOŞUM SIRASINDA BAĞLANAN BAŞLIK DA KULLANIMDIR (2026-08-17).
    # Ayar kartları KART_BOLUM tablosuna göre kutulara dağıtılıyor ve bölüm
    # başlığı `bas.dataset.i18n=etiket` ile bağlanıyor — yani anahtar HTML'de
    # `data-i18n="..."` olarak hiç görünmüyor, tabloda dizge olarak duruyor.
    # Dedektör tabloyu görmeyince sekiz başlığı "hiç kullanılmıyor" diye
    # bildirdi; oysa sekizi de ekranda yazıyor. Bu, `bilgiGosterK` ve
    # `data-i18n-etiket` ile aynı sınıfın üçüncü örneği: dedektörün kör
    # noktası, gerçek olmayan kusuru bildirip güvenilirliğini yiyor.
    # Kapsam DAR: yalnız bu tablonun içindeki dizgeler.
    tablo = re.search(r"const KART_BOLUM=\{(.*?)\n\};", js, re.S)
    if tablo:
        yardimci |= set(re.findall(r"'([A-Za-z0-9]+)'", tablo.group(1)))
    # DÖRDÜNCÜ ÖRNEK (2026-08-19): ışık denetçisinin cümleleri sözlüğe taşındı
    # ve modül anahtarı `isikYaz(tt,'anahtar')` ile okuyor. Bu satır olmasaydı
    # 18 anahtar birden "hiç kullanılmıyor" diye bağırırdı. Ortak şekil hep
    # aynı: ANAHTARI SAKLAYAN YARDIMCI. Yeni bir yardımcı yazan herkesin bu
    # listeye de bakması gerekiyor — dedektörün kendi kör noktası burada.
    yardimci |= set(re.findall(r"\bisikYaz\(\s*\w+\s*,\s*'([A-Za-z0-9]+)'", js))
    return (yardimci | set(re.findall(r"\bt\('([A-Za-z0-9]+)'\)", js))
            | set(re.findall(r'data-i18n="([^"]+)"', html))
            | set(re.findall(r'data-i18n-ph="([^"]+)"', html))
            | set(re.findall(r'data-i18n-title="([^"]+)"', html))
            # data-i18n-etiket: çekim çubuğu düğmelerinin görünen adı (2026-08-17).
            # Bu satır eklenmeseydi beş anahtar "hiç kullanılmıyor" diye
            # bağırırdı; A.2c'de data-i18n-title ile birebir aynı hata olmuştu.
            | set(re.findall(r'data-i18n-etiket="([^"]+)"', html))
            | set(re.findall(r'data-aria="([^"]+)"', html)))


def audit(path, msg_var="const MSG", i18n_var="const I18N", genel_kullanim=None):
    """Telefon (index.html) ve Mac (Teleprompter Pro.html) dosyalarını denetler.
    Mac sürümünde durum `state.x`, telefonda `st.x`; sözlük yok. Farkları burada
    ayırıyoruz — Mac bugüne kadar hiç tam denetimden geçmemişti."""
    src = open(path, encoding="utf-8").read()
    is_mac = "Teleprompter Pro" in path or "teleprompter_pro_v1" in src
    js = re.findall(r"<script>(.*?)</script>", src, re.S)[-1]
    html = re.sub(r"<script.*?</script>", "", src, flags=re.S)
    problems = []

    ids = re.findall(r'\bid="([^"]+)"', html)
    dup = [k for k, v in collections.Counter(ids).items() if v > 1]
    if dup: problems.append(("yinelenen DOM id", dup))

    used = set(re.findall(r"\$\('#([A-Za-z0-9_-]+)'\)", js))
    dynamic = {"padTop", "padBot", "diffClear", "quotaKv", "eyeLineWrap",
               "sbErr", "sbVer", "readyBtn", "takesBtn", "scExport", "scImport"}   # JS'in kendi ürettiği ögeler
    miss = sorted(u for u in used if u not in ids and u not in dynamic)
    if miss: problems.append(("HTML'de olmayan #id", miss))

    # tanımsız fonksiyon çağrısı
    defs = set(re.findall(r"function\s+([A-Za-z_$][\w$]*)\s*\(", js))
    # çok bildirimli const/let listeleri dahil:  const a=..., b=x=>..., c=function(){}
    for decl in re.findall(r"(?:const|let|var)\s+([^;\n]+)", js):
        for part in decl.split(","):
            m = re.match(r"\s*([A-Za-z_$][\w$]*)\s*=\s*(?:function|async|\(|[A-Za-z_$][\w$]*\s*=>)", part)
            if m: defs.add(m.group(1))
    # fonksiyon/ok parametreleri de "tanımlı" sayılır
    for sig in re.findall(r"function[^(]*\(([^)]*)\)", js) + re.findall(r"\(([^()]*)\)\s*=>", js):
        for prm in sig.split(","):
            prm = prm.strip().split("=")[0].strip()
            if re.fullmatch(r"[A-Za-z_$][\w$]*", prm or ""): defs.add(prm)
    for prm in re.findall(r"(?<![\w$.])([A-Za-z_$][\w$]*)\s*=>", js): defs.add(prm)
    # yorumları ve metinleri at — kaçışlı apostrof içeren metinler sızıyordu
    code = re.sub(r"/\*.*?\*/", "", js, flags=re.S)
    # SATIR SONU YORUMLARI DA AT. Eskiden yalnız satır BAŞINDAKİ // atılıyordu;
    # `f();   // ... çıkış yolu burada duruyor` gibi bir satırın ardından
    # `(function(){` gelince yorumun son kelimesi "duruyor(" diye okunup
    # tanımsız fonksiyon çağrısı sanılıyordu — iki kez yalancı alarm verdi.
    # AMA düz regex de yetmiyor: METİN İÇİNDEKİ // yorum sanılıyor. Sürüm
    # notundaki "/ // (2) duraklama işaretleri" ifadesi dizeyi ortadan kesti,
    # tırnak dengesi bozuldu ve bu kez Türkçe cümleler koda karıştı. Yani
    # dedektörü onarırken dedektöre yeni bir yalancı alarm ekledim.
    # Çözüm: satırı soldan tarayıp yalnız TIRNAK DIŞINDAKİ // sonrasını at.
    code = "\n".join(_satir_yorumunu_at(l) for l in code.split("\n"))
    code = re.sub(r"'(?:\\.|[^'\\\n])*'", "''", code)
    code = re.sub(r'"(?:\\.|[^"\\\n])*"', "''", code)
    code = re.sub(r"`(?:\\.|[^`\\])*`", "''", code, flags=re.S)
    calls = set(re.findall(r"(?<![.\w$])([a-zA-Z_$][\w$]*)\s*\(", code))
    undef = sorted(c for c in calls - defs - BUILTIN if len(c) > 2)
    if undef: problems.append(("tanımsız olabilir (fonksiyon çağrısı)", undef))

    # KÖR NOKTA (2026-08-11'de yakalandı): olay işleyicisi ATAMA biçiminde
    # yazılınca parantez yok, üstteki kontrol göremiyor:
    #     $('#x').onclick = benimFonksiyonum;      <-- tanımsız olsa bile sessiz
    # Bu depoda gerçekten oldu: copGeriAl atanmıştı ama tanımlanmamıştı; ne
    # denetim ne node --check yakaladı, yalnız düğmeye basınca patlardı.
    handlers = set(re.findall(r"\.on[a-z]+\s*=\s*([A-Za-z_$][\w$]*)\s*[;,)\n]", code))
    handlers |= set(re.findall(r"addEventListener\([^,]+,\s*([A-Za-z_$][\w$]*)\s*[,)]", code))
    h_undef = sorted(h for h in handlers - defs - BUILTIN
                     if len(h) > 2 and h not in ("null", "true", "false", "undefined"))
    if h_undef:
        problems.append(("olay işleyicisi tanımsız (parantezsiz atama)", h_undef))

    # ÖLÜ AYAR: HTML'de anahtarı var (data-t="x") ama JS onu hiç OKUMUYOR (st.x geçmiyor)
    # -> kullanıcı açıyor, hiçbir şey olmuyor, hiçbir şey de yazmıyor. Bu depoda 3 kez çıktı.
    onek = "state" if is_mac else "st"
    togs = set(re.findall(r'data-t="([A-Za-z0-9_]+)"', html))
    dead = sorted(t for t in togs if not re.search(r"\b%s\.%s\b" % (onek, re.escape(t)), js))
    if dead: problems.append(("ölü ayar (JS hiç okumuyor)", dead))

    # SESSİZ YUTULAN İSTİSNA: catch bloğu tamamen boş -> hata kaybolur, özellik sessizce ölür
    # Taban 23: hepsi tek tek gözden geçirildi (vibrate/close/revokeObjectURL gibi zararsız
    # temizlik çağrıları). ARTIŞ = gözden geçirilmemiş yeni sessiz yutma demektir.
    empty_catch = len(re.findall(r"catch\s*\([^)]*\)\s*\{\s*\}", js))
    # 2026-08-14: her iki tarafta da BİR artırıldı. Eklenen catch'ler toast
    # çağrılarının etrafında (kota dolunca bildirim) — arayüz yıkılırken toast
    # patlayabilir ve o an asıl iş kaydetmeyi bildirmek. Hemen altındaki
    # mevcut catch(_){} ile aynı gerekçe.
    # 25 (telefon): L7de eklenen `eskiHatalariGeriYukle` bozuk kaydı sessizce
    # atlıyor — günlüğün kendisi yüzünden uygulama açılmamasından iyidir.
    # 18 (Mac): aynı işlev oraya da taşındı (parite).
    taban = 18 if is_mac else 25
    if empty_catch > taban:
        problems.append(("boş catch tabanın üstünde (yeni sessiz yutma?)", [empty_catch, "taban %d" % taban]))

    # DURUM ZİNCİRİ (2026-08-13'te eklendi). Ölü ayar dedektörü "HTML'de anahtar
    # var, JS okumuyor" diyor; bu ise durumun kendi zincirini iki yönde ölçüyor:
    #   A) st.x OKUNUYOR ama ne varsayılanda var ne de bir yerde atanıyor
    #      -> her zaman undefined; ona bağlı özellik kalıcı olarak KAPALI,
    #         hiçbir hata da vermiyor
    #   B) varsayılanda var ama hiçbir yerde OKUNMUYOR
    #      -> diske yazılıp duran ama kimsenin bakmadığı alan (T8'de üç tane çıktı)
    def durum_anahtarlari(kod):
        m = re.search(r"\bDEF(?:AULT)?\s*=\s*\{", kod)
        if not m:
            return None
        bas = kod.index("{", m.start())
        derin, son = 0, None
        for j in range(bas, len(kod)):
            if kod[j] == "{": derin += 1
            elif kod[j] == "}":
                derin -= 1
                if derin == 0:
                    son = j; break
        if son is None:
            return None
        govde = kod[bas + 1:son]
        # YALNIZ 1. DÜZEY: scripts:[{id,title,text}] gibi iç içe nesnelerin
        # anahtarları ayar sanılıyordu (ilk denememde üç yanlış pozitif verdi).
        anahtar, d = set(), 0
        for mm in re.finditer(r"[{\[\]}]|([A-Za-z_$][\w$]*)\s*:", govde):
            g = mm.group(0)
            if g in "{[": d += 1
            elif g in "}]": d -= 1
            elif d == 0 and mm.group(1): anahtar.add(mm.group(1))
        return anahtar

    varsayilan = durum_anahtarlari(code)
    if varsayilan:
        okunan = set(re.findall(r"\b%s\.([A-Za-z_$][\w$]*)" % onek, code))
        yazilan = set(re.findall(r"\b%s\.([A-Za-z_$][\w$]*)\s*(?:=[^=]|\+\+|--|\+=|-=)" % onek, code))
        hayalet = sorted(okunan - yazilan - varsayilan)
        if hayalet:
            problems.append(("durum alanı okunuyor ama hiç yazılmıyor", hayalet))
        okunmayan = sorted(varsayilan - okunan)
        if okunmayan:
            problems.append(("kayıtlı ayar hiç okunmuyor", okunmayan))

    def keys(var):
        m = re.search(var + r"=\{(.*?)\n\};", js, re.S)
        if not m: return set(), set()
        # DİZE İÇERİĞİNİ MASKELE. Anahtar deseni `ad:'` biçimini arıyor; bir
        # DEĞERİN İÇİNDE iki nokta varsa (ör. '...şu adrese girin:') desen
        # "girin" diye olmayan bir anahtar uyduruyordu ve "TR/EN farkı" diye
        # sahte bir hata veriyordu. 2026-08-14'te tam bu oldu: TR'de "girin",
        # EN'de "address". Maskeleme çapayı ('...') bozmadan içeriği siliyor.
        # ÖNCE YORUMLARI AT. Sözlükteki açıklama yorumlarında Türkçe kesme
        # işareti geçiyor ("Mac’in", "FAZ B’ye"); maskeleyici onları dize
        # başlangıcı sanıp GERÇEK KODU yutuyordu ve 7 anahtar birden
        # kayboldu. CLAUDE.md’deki kesme işareti tuzağının kardeşi.
        govde = re.sub(r"/\*.*?\*/", " ", m.group(1), flags=re.S)
        # İKİ tırnak türü de tek geçişte: sözlükte "📁 Dosyalar'a Kaydet" gibi
        # çift tırnaklı ve İÇİNDE kesme işareti olan değerler var. Yalnız tek
        # tırnağı maskelemek o kesmeyi dize başlangıcı sanıp sonraki 7 anahtarı
        # yutuyordu. Tek desen, alternation ile ikisini birden yakalıyor.
        govde = re.sub(r"'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"", "'\u00a7'", govde)
        parts = re.split(r"\n\s*en:\{", govde)
        kk = lambda b: set(re.findall(r"""(?:^|[,{\s])([a-zA-Z][a-zA-Z0-9]*)\s*:\s*['"]""", b))
        return kk(parts[0]), (kk(parts[1]) if len(parts) > 1 else set())

    # ERİŞİLEBİLİRLİK: yalnız simge içeren düğmenin adı yoksa ekran okuyucu "düğme" der
    # "Adsız" = metninde HİÇBİR harf/rakam yok (yalnız emoji/simge). Her yazı sistemi sayılır:
    # "1080p", "9:16", "العربية" adlıdır; "✕", "▶︎/⏸", "−" adsızdır.
    # KÖR NOKTA (2026-08-13'te yakalandı): bu blok `if is_mac: return` satırının
    # ALTINDAYDI, yani Mac dosyası erişilebilirlik denetiminden HİÇ geçmiyordu.
    # Gerekçe "Mac tek dilli" idi ama bu kontrolün dille ilgisi yok — yanlış
    # tarafa gruplanmıştı. Koşturulunca Mac'te 5 adsız düğme çıktı.
    # title= sayılmıyor: dokunmatikte hiç okunmaz, ekran okuyucularda tutarsız.
    nameless = []
    for attrs, txt in re.findall(r'<button([^>]*)>(.*?)</button>', html, re.S):
        if 'aria-label' in attrs:
            continue
        if any(ch.isalnum() for ch in re.sub(r'<[^>]+>', '', txt)):
            continue
        mid = re.search(r'id="([^"]+)"', attrs)
        nameless.append(mid.group(1) if mid else attrs.strip()[:24])
    if nameless:
        problems.append(("adsız simge düğmesi (ekran okuyucu)", nameless))

    # TANIMLI AMA HİÇ ANILMAYAN FONKSİYON (2026-08-13'te eklendi).
    # "Tanımsız çağrı" kontrolünün tersi. Ölçüt ÇAĞRI DEĞİL, ANILMA: fonksiyon
    # adı tanımı dışında hiçbir yerde geçmiyorsa ölüdür.
    #   İlk yazımım iki kez yanlıştı ve ikisi de sessizce işe yaramaz kılıyordu:
    #   1) `function ad(` deseninin kendisi "çağrı" sayılıyordu, yani her
    #      fonksiyon kendini çağırmış görünüyor ve HİÇBİR ŞEY yakalanmıyordu.
    #   2) Yalnız çağrı/atama sayınca ARGÜMAN olarak geçirilenler (tick,
    #      verCmp, easeLoop…) ölü sanıldı — sekiz yanlış pozitif.
    #   Üç senaryoda ölçüldü: gerçekten ölü → yakalanıyor · yalnız atanan →
    #   yakalanmıyor · yalnız argüman olarak geçen → yakalanmıyor.
    govde = re.sub(r"function\s+([A-Za-z_$][\w$]*)\s*\(", "function(", code)
    olu_fn = []
    for ad in sorted(defs & set(re.findall(r"function\s+([A-Za-z_$][\w$]*)\s*\(", code))):
        desen = r"(?<![.\w$])" + re.escape(ad) + r"(?![\w$])"
        if not re.search(desen, govde) and not re.search(desen, html):
            olu_fn.append(ad)
    if olu_fn:
        problems.append(("tanımlı ama hiç anılmayan fonksiyon", olu_fn))

    # ⚠️ BU MUAFİYET BİR KÖR NOKTAYDI (2026-08-17). Gerekçesi "Mac tek dilli"
    # idi ve ARTIK DOĞRU DEĞİL: Mac'te de I18N/MMSG sözlükleri tr+en taşıyor
    # ve `L` ile dil değişiyor. Muafiyet yüzünden Mac dosyasında SÖZLÜKTE
    # OLMAYAN dört anahtar (takeDelAsk, takeDelType, takeDelWord,
    # takeDelCancel) kapıdan sessizce geçti; uygulamada düğmede çevirinin
    # yerine anahtar adı yazacaktı. Telefonda aynı kusur ilk koşuda yakalanır,
    # çünkü orada denetim koşuyordu — muafiyetin kendisi kusuru gizledi.
    # Mac'in sözlük değişkenleri başka adlarda: MMSG (m) ve I18N (t).
    if is_mac:
        msg_var, i18n_var = "const MMSG", "const I18N"

    mt, me = keys(msg_var); it, ie = keys(i18n_var)
    if mt ^ me: problems.append(("MSG TR/EN farkı", sorted(mt ^ me)))
    if (it ^ ie) - {"camera"}: problems.append(("I18N TR/EN farkı", sorted((it ^ ie) - {"camera"})))
    # YORUMLARI AT: Mac kaynağında sözlüğün NASIL kullanılacağını anlatan bir
    # yorum `t('x')` örneği veriyor ve dedektör bunu gerçek çağrı sanıp
    # "I18N'de olmayan anahtar: x" diye var olmayan bir kusur bildirdi.
    kod_y = re.sub(r"/\*.*?\*/", " ", js, flags=re.S)
    mc = set(re.findall(r"\bm\('([A-Za-z0-9]+)'\)", kod_y))
    tc = set(re.findall(r"\bt\('([A-Za-z0-9]+)'\)", kod_y))
    # KOŞULLU ANAHTAR SEÇİMİ DE KULLANIMDIR (2026-08-17). Arşiv hatasının
    # sebebine göre metin seçilirken `m(kapali?'archWarnKapali':'archWarnTxt')`
    # yazıldı ve denetim ÜÇ anahtarı birden "hiç kullanılmıyor" saydı — oysa
    # üçü de kaynakta harfi harfine duruyor. Ölçmeyen denetim, olmayan kusuru
    # bildirir ve gerçek kusurun yanında güvenilirliğini yitirir.
    # Yalnız SEÇENEK konumundaki (?: iki yanındaki) dizgeler sayılıyor.
    # İlk yazımda çağrının içindeki BÜTÜN dizgeleri anahtar saymıştım ve
    # koşulun kendisindeki karşılaştırma dizgesi ('kapali') de anahtar
    # sanıldı; denetim olmayan bir anahtarı "sözlükte yok" diye bildirdi.
    # Ayrıca m() ve t() ayrı sözlükler: birinin anahtarını diğerine yazmak
    # yine sahte kusur üretiyordu.
    for fn, kume in (('m', mc), ('t', tc)):
        for cagri in re.findall(r"\b%s\(([^()]*\?[^()]*)\)" % fn, js):
            for a, b in re.findall(r"\?\s*'([A-Za-z0-9]+)'\s*:\s*'([A-Za-z0-9]+)'", cagri):
                kume.add(a); kume.add(b)
    # ANAHTARI SAKLAYAN YARDIMCILAR. Mac'in kip penceresi dil değişince
    # yeniden çizilebilsin diye anahtarları SAKLIYOR ve sonra t() ile
    # çözüyor: `bilgiGosterK('mDlgWelcome','mDlgWelcomeBody')`. Bu biçim
    # görülmezse anahtarlar "hiç kullanılmıyor" sanılır ve denetim gerçek
    # olmayan bir ölü anahtar bildirir (Tur 42'de tam bu oldu). Liste DAR
    # tutuluyor: her yardımcıyı buraya yazmak denetimi kör eder.
    for a, b in re.findall(r"\bbilgiGosterK\('([A-Za-z0-9]+)'\s*,\s*'([A-Za-z0-9]+)'\)", js):
        tc.add(a); tc.add(b)
    if mc - mt: problems.append(("MSG'de olmayan m() anahtarı", sorted(mc - mt)))
    if tc - it: problems.append(("I18N'de olmayan t() anahtarı", sorted(tc - it)))

    # SÖZLÜKTE VAR AMA HİÇ KULLANILMAYAN ANAHTAR (2026-08-13'te eklendi).
    # Üstteki kontroller tersini yakalıyordu: çağrılıp sözlükte olmayan anahtar.
    # Bu yön de aynı sınıfın parçası — yazılmış ama okunmayan metin. İlk
    # koşuşta dördü çıktı ve DÖRDÜ DE eskimiş kopyaydı: resultHint'in söylediğini
    # saveHint, trimInPhotos'unkini trimSteps söylüyor (ikisi de bağlı).
    # Ölü metin zararsız görünür ama çeviri yükü yaratır ve "bu neden
    # görünmüyor?" diye aranan zamanı yer.
    # Not: m()/t() yalnız sabit dizgeyle çağrılıyor (değişkenle çağrı yok,
    # kontrol edildi) — olmasaydı bu denetim yanlış pozitif üretirdi.
    # `bilgiGoster(t(bAnahtar), t(mAnahtar))` ANAHTARI SAKLAYAN YARDIMCININ
    # gövdesi: anahtarlar `bilgiGosterK('a','b')` çağrılarından geliyor ve
    # yukarıda zaten sayılıyor. Bu iki adı dışarıda bırakmazsak uyarı sürekli
    # yanar ve "ölü anahtar denetimi güvenilmez" diyerek gerçek bir denetimi
    # sürekli kapalı tutar — dedektörü kör eden şey, dedektörün kendisidir.
    kod_d = re.sub(r"\b[mt]\(\s*[bm]Anahtar\s*\)", " ", code)
    if re.search(r"\bm\(\s*[A-Za-z_$][\w$]*\s*\)", kod_d) or re.search(r"\bt\(\s*[A-Za-z_$][\w$]*\s*\)", kod_d):
        problems.append(("sözlük anahtarı değişkenle çağrılıyor — ölü anahtar denetimi güvenilmez", ["m()/t()"]))
    else:
        olu_msg = sorted(mt - mc)
        if olu_msg: problems.append(("MSG'de tanımlı ama hiç kullanılmayan anahtar", olu_msg))

    d = set(re.findall(r'data-i18n="([^"]+)"', html))
    if d - it: problems.append(("I18N'de olmayan data-i18n", sorted(d - it)))
    dp = set(re.findall(r'data-i18n-ph="([^"]+)"', html))
    if dp - it: problems.append(("I18N'de olmayan data-i18n-ph", sorted(dp - it)))
    # Ölü anahtar: BÜTÜN kabuklarda kullanılmayan. Tek dosyaya bakmak sözlük
    # ortaklaştıktan sonra yalan söylüyordu (bkz. kullanilan_anahtarlar).
    kullanim = (tc | d | dp) | (genel_kullanim or set())
    olu_i18n = sorted(it - kullanim)
    if olu_i18n: problems.append(("I18N'de tanımlı ama hiç kullanılmayan anahtar", olu_i18n))

    problems += yol_tarifi_denetimi(src, js)
    problems += jest_vaadi_denetimi(src, js, genel_kullanim)
    problems += ios_onek_denetimi(src)

    return problems


# ==========================================================================
# iOS'UN ÖNEK İSTEDİĞİ CSS ÖZELLİKLERİ — ÖNEKSİZ YAZILAN KURAL SESSİZCE ÖLÜR
#
# ÖLÇÜLDÜ 2026-08-18: telefon kabuğunda 18 `backdrop-filter` kuralının yalnız
# 4'ünde `-webkit-` öneki vardı. iOS Safari öneksiz kuralı UYGULAMIYOR ve hata
# da vermiyor — v9.29'da yayınlanan "kamera açıkken cam ayar paneli" Erdal'ın
# iPhone'unda hiç cam görünmedi, panel düz opak kaldı. Kusur ancak GERÇEK
# CİHAZDA görülüyordu: Chrome'da (kapının çizilmiş arayüz adımı dahil) her şey
# doğru çiziliyor, çünkü Chrome öneksizi destekliyor.
#
# Bu, deponun "sessiz ölü özellik" sınıfının CSS tarafı: ayar açılıyor,
# hiçbir şey olmuyor, sebep hiçbir yerde yazmıyor.
#
# Kural: aşağıdaki özelliklerden biri yazıldıysa AYNI satırda (ya da hemen
# üstünde) `-webkit-` önekli hâli de bulunmalı. Öneki fazladan yazmanın
# bedeli yok; eksik yazmanın bedeli görünmeyen bir özellik.
# ==========================================================================
IOS_ONEK_ISTER = ("backdrop-filter", "mask-image", "user-select", "box-decoration-break")


def ios_onek_denetimi(src):
    css_bloklari = re.findall(r"<style>(.*?)</style>", src, re.S) or [src]
    eksik = []
    for css in css_bloklari:
        satirlar = css.split("\n")
        for i, satir in enumerate(satirlar):
            for ozellik in IOS_ONEK_ISTER:
                # `-webkit-backdrop-filter` kendisi eşleşmesin diye önüne bak.
                if not re.search(r"(?<![-\w])" + ozellik + r"\s*:", satir):
                    continue
                komsu = " ".join(satirlar[max(0, i - 1):i + 2])
                if "-webkit-" + ozellik not in komsu:
                    eksik.append(ozellik + " @ " + satir.strip()[:90])
    if eksik:
        return [("iOS'ta sessizce çalışmayacak öneksiz CSS", eksik)]
    return []


# ==========================================================================
# ARAYÜZ METNİNDEKİ YOL TARİFİ GERÇEKTEN VAR MI?
#
# Bu depoda AYNI SINIF ÜÇ KEZ ÇIKTI ve üçünde de kullanıcı var olmayan bir
# yere gönderildi:
#   · depo dolunca "Çekimlerim bölümünden eski çekimleri sil" deniyordu, oysa
#     senaryolar başka bir depoda — bütün çekimleri silmek işe yaramıyordu;
#   · kamera izni reddedilince "Ayarlar → Safari → Kamera" deniyordu, Android
#     telefonda Safari diye bir şey yok;
#   · v9.31'de rozet "okuduğun yeri parmakla göster" diyordu ve karşılığı yoktu.
#
# Ortak nokta: METİN BİR VAAT EDİYOR, kod onu tutmuyor. Tek tek düzeltmek
# yerine dedektöre çeviriyoruz (deponun çalışma kuralı).
#
# Ölçüt DAR TUTULDU — bilerek. Yalnız KENDİ arayüzümüze ait yol tarifleri
# denetleniyor: ilk parçası kendi üst yüzeylerimizden biri olan `A → B → C`
# zincirleri. İşletim sistemi tarifleri ("iOS Ayarlar → Safari → Mikrofon")
# kapsam dışı: onların doğruluğunu bu depo bilemez, kapsama alsak dedektör
# sürekli yalancı kırmızı verir ve susturulurdu.
# ==========================================================================

# Kendi üst yüzeylerimiz. Bir tarif bunlardan biriyle başlıyorsa BİZİM
# yolumuzdur ve her parçası arayüzde bir etiket olarak bulunmalıdır.
KOKLER = {"Ayarlar", "Settings", "Senaryolar", "Scripts",
          "Çekimlerim", "My takes"}
# İşletim sistemi/tarayıcı adları: bu parça geçtiği anda tarif bizden çıkar.
DIS_DUNYA = {"safari", "chrome", "edge", "firefox", "ios", "android",
             "fotoğraflar", "photos", "dosyalar", "files", "finder",
             "sistem", "system"}


def _sozluk_degerleri(js):
    """Sözlüklerdeki GÖRÜNEN metinler. Anahtar değil değer gerekiyor: tarifin
    parçaları kullanıcının okuduğu etiketlerdir."""
    return [m.group(1) for m in re.finditer(r"[A-Za-z_$][\w$]*:'((?:[^'\\]|\\.)*)'", js)]


def _etiket_kumesi(i18n_metinleri):
    """Arayüzde GÖRÜNEN bütün etiket metinleri, karşılaştırma için sadeleşmiş."""
    k = set()
    for v in i18n_metinleri:
        s = re.sub(r"<[^>]+>", " ", v)          # <b> gibi biçim etiketleri
        s = re.sub(r"[^\w\s]", " ", s, flags=re.U)   # emoji, ok, noktalama
        s = re.sub(r"\s+", " ", s).strip().lower()
        if s:
            k.add(s)
    return k


def yol_tarifi_denetimi(src, js):
    """`Ayarlar → Diğer → Cihaz uyumluluğu` gibi tariflerin her parçası var mı?"""
    degerler = _sozluk_degerleri(js)
    if not degerler:
        return []
    etiketler_tum = _etiket_kumesi(degerler)
    bulunmayan = []
    # PENCERE DEĞİL TAM DİZE. İlk yazışta tarifi sabit karakter penceresiyle
    # çekiyordum; son parça kesilince dedektör KENDİ kusuru yüzünden yalancı
    # kırmızı veriyordu ("switch" diye bir etiket yok — çünkü cümlenin
    # tamamı okunmamıştı). Aracın gösterdiği kusur, aracın kendi kusuruydu;
    # bu deponun bilinen tuzağı. Artık her metin BÜTÜN hâlinde okunuyor. 
    metinler = [m.group(1) for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'", src)]
    metinler += [m.group(1) for m in re.finditer(r'"((?:[^"\\\n]|\\.)*)"', src)]
    metinler += re.findall(r">([^<>\n]{3,300})<", src)
    for ham0 in [x for x in metinler if "→" in x]:
        # Biçim etiketleri (<b>…</b>) tarifin parçasını ikiye bölüyordu.
        ham = re.sub(r"<[^>]+>", " ", ham0)
        # 🔴 TARİFİN KENDİSİ ETİKET SAYILAMAZ (2026-08-19). Tarif metni
        # sözlüğe taşınınca kendi değeri de "arayüz etiketi" kümesine giriyor
        # ve `icerir` denetimi tarifi KENDİ İÇİNDE bulup geçiriyordu — yani
        # bir tarifi sözlüğe koymak onu sessizce denetim dışı bırakıyordu.
        # Ölçüldü: `srAudFix` taşınınca iki kasıtlı bozma birden inmez oldu.
        # Karşılaştırma kümesinden tarifin kendi metni çıkarılıyor.
        kendi = _etiket_kumesi([ham0, ham])
        etiketler = etiketler_tum - kendi
        parcalar = [x.strip(" .,:;()") for x in ham.split("→")]
        parcalar = [x for x in parcalar if x]
        if len(parcalar) < 2:
            continue
        # YER TUTUCULU TARİF DOĞRULANAMAZ (2026-08-19). Metin sözlüğe taşındığında
        # değişken parça `{t}` olarak duruyor (ör. tarayıcı adı) ve gerçek değeri
        # ancak çalışma anında biliniyor. Dedektör onu "var olmayan bir yer" sayıp
        # YALANCI KIRMIZI veriyordu; ölçemediği bir şeyi kusur bildirmek, aracın
        # kendi kusuru olur. Yer tutucu taşıyan tarif atlanıyor ve bu SINIR
        # burada yazılı — sessizce geçmek ile ölçmek arasındaki fark budur.
        if any("{" in p and "}" in p for p in parcalar):
            continue
        kok = parcalar[0].split()[-1] if parcalar[0].split() else ""
        if kok not in KOKLER:
            continue                      # bizim yolumuz değil
        def _ilk(p):
            k = re.sub(r"[^\w]", "", p.split()[0], flags=re.U).lower() if p.split() else ""
            return k
        if any(_ilk(p) in DIS_DUNYA for p in parcalar[1:]):
            continue                      # tarif işletim sistemine çıkıyor
        for p in parcalar[1:]:
            sade = re.sub(r"[^\w\s]", " ", p, flags=re.U)
            sade = re.sub(r"\s+", " ", sade).strip().lower()
            if not sade:
                continue
            # Cümlenin devamı olabilir ("… bölümünden açabilirsin"): tarifin
            # SON parçasında yalnız ilk birkaç kelime hedeftir.
            # HEDEF CÜMLENİN İÇİNDE HERHANGİ BİR YERDE olabilir:
            # "switch \"Enable composite\" off" tarifinde etiket ortada.
            # Baştan-önek aramak bunu kaçırıyordu (dedektörün ikinci kendi
            # kusuru). Kısa etiketler ("Sol", "Aa") tesadüfen eşleşmesin diye
            # yalnız 4 harften uzun etiketler ve TAM KELİME sınırıyla.
            kelimeler = sade.split()
            adaylar = {sade}
            for n in range(1, min(5, len(kelimeler)) + 1):
                onek = " ".join(kelimeler[:n])
                # TEK KELİMELİK KISA ÖNEK KABUL EDİLMİYOR. "Ses Ayarları"
                # diye var olmayan bir bölüm yazıldığında ilk kelime "Ses"
                # gerçek bir bölüm adı olduğu için tarif geçip gidiyordu —
                # ölçüldü, kasıtlı bozma inmiyordu. Tek kelimelik önek en az
                # 5 harf olmalı; daha kısası ancak çok kelimeli önekle geçer.
                if n == 1 and len(onek) < 5:
                    continue
                adaylar.add(onek)
            icerir = any(
                len(e) >= 4 and re.search(r"(?<!\w)" + re.escape(e) + r"(?!\w)", sade)
                for e in etiketler
            )
            # …ve TERSİ de geçerli: tarif etiketin kısaltılmış hâlini yazmış
            # olabilir. "Güvenli ses modu" gerçek etiketin ("Güvenli ses modu
            # (iPhone için önerilir)") başlangıcıdır — kullanıcı onu bulur.
            kisaltilmis = any(
                len(p2) >= 5 and any(e.startswith(p2) for e in etiketler)
                for p2 in adaylar
            )
            if not (adaylar & etiketler) and not icerir and not kisaltilmis:
                bulunmayan.append(ham.strip() + "  ⟶  bulunamayan parça: " + p)
                break
    if bulunmayan:
        return [("arayüz metni var olmayan bir yere gönderiyor", bulunmayan)]
    return []



# --------------------------------------------------------------------------
# JEST VAADİ DEDEKTÖRÜ (2026-08-19)
#
# Deponun v9.31'de adı konan ama yazılmayan dedektörü: **arayüz metni bir
# HAREKET vaat ediyor, kodda karşılığı yok.** "Ölü ayar"ın metin tarafı.
# O gün iki vaka çıkmıştı — sesli takip rozeti "okuduğun yeri parmakla göster"
# diyordu ama tek dokunuş yolu hiç yazılmamıştı; aynı boşluk Mac'te de vardı.
# Bugün üçüncüsü çıktı: masaüstünde beyaz ayarı ipucu "otomatiğe dönmek için
# sürgüye çift dokun" diyordu, `dblclick` işleyicisi YOKTU.
#
# ÖLÇÜT SEÇİMİ — neden yalnız NADİR hareketler:
#   "dokun/tap" her ekranda var; onu aramak her kabukta hep yeşil verir, yani
#   ölçmeyen bir kapı olurdu. Ayırt eden hareketler nadir olanlar: çift
#   dokunuş, sürükleme, basılı tutma, iki parmak, sallama. Bunlardan birini
#   VAAT EDEN bir metin varsa, o kabukta karşılığı da OLMALI.
#
# İKİ YANLIŞ ALARM KAYNAĞI ve kapatılışları:
#   1) `threshold` içindeki "hold" gibi kelime PARÇALARI  → sınır (\b) şart.
#   2) İŞLETİM SİSTEMİ hareketleri ("HTML dosyasına çift tıklayarak açtıysan",
#      "Fotoğraflar'da kırp") bizim arayüzümüzün vaadi değil → bunlar için
#      dar bir bağlam listesi var.
#   3) O kabukta KULLANILMAYAN sözlük anahtarı hiçbir şey vaat etmez; ortak
#      sözlükte telefona özgü anahtarlar duruyor. Yalnız kullanılan anahtarlar
#      ölçülüyor — `kullanilan_anahtarlar` zaten bu bilgiyi topluyor.

JESTLER = {
    "çift dokunuş": (
        r"(?:\bçift (?:dokun|bas|tıkla)|\bdouble[- ]?(?:tap|click|press))",
        r"dblclick|ondblclick|ciftDokunus|doubleTap|sonDokunusZamani",
    ),
    "sürükleme": (
        r"(?:\bsürükle|\bparmakla kaydır|\bdrag\b|\bswipe\b)",
        r"touchmove|pointermove|onmousemove|dragstart",
    ),
    "basılı tutma": (
        r"(?:\bbasılı tut|\buzun bas|\blong[- ]press|\bpress and hold\b)",
        r"uzunBas|longPress|basiliTut",
    ),
    "iki parmak": (
        r"(?:\biki parmak|\bpinch\b|\bkıstır)",
        r"touches\.length|gesturechange",
    ),
    "sallama": (r"(?:\bsalla\b|\bsarsarak\b|\bshake\b)", r"devicemotion"),
}

# Bizim arayüzümüzün değil, İŞLETİM SİSTEMİNİN hareketi. Dar tutuluyor:
# geniş bir muafiyet listesi dedektörü sessizce kapatır.
JEST_MUAF = (
    r"dosyasına çift tıkla", r"double-click", r"Double-click",
    r"masaüstünde çift tıkla",
)


def jest_vaadi_denetimi(src, js, kullanilan):
    """Metin bir hareket vaat ediyorsa, o kabukta karşılığı var mı?"""
    sonuc = []
    for ad, (vaat, karsilik) in JESTLER.items():
        vaat_edenler = []
        for m in re.finditer(r"([A-Za-z_$][\w$]*):'((?:[^'\\]|\\.)*)'", js):
            anahtar, deger = m.group(1), m.group(2)
            # Bu kabukta hiç kullanılmayan anahtar hiçbir şey vaat etmez.
            if kullanilan is not None and anahtar not in kullanilan:
                continue
            if any(re.search(mu, deger) for mu in JEST_MUAF):
                continue
            if re.search(vaat, deger, re.I):
                vaat_edenler.append(anahtar)
        if vaat_edenler and not re.search(karsilik, src, re.I):
            sonuc.append(
                ("arayüz metni karşılığı olmayan bir hareket vaat ediyor (%s)" % ad,
                 sorted(set(vaat_edenler))))
    return sonuc

if __name__ == "__main__":
    bad = 0
    # 1. GEÇİŞ: kullanımı bütün kabuklardan topla. 2. geçişte denetle.
    yollar = sys.argv[1:]
    genel = set()
    for path in yollar:
        try:
            genel |= kullanilan_anahtarlar(path)
        except Exception as e:
            print("  ✗ kullanım taranamadı:", path, e)
            bad += 1
    for path in yollar:
        print("=" * 8, path.split("/")[-1], "=" * 8)
        pr = audit(path, genel_kullanim=genel)
        if not pr:
            print("  temiz ✓")
        for name, items in pr:
            bad += 1
            print("  ✗", name + ":", ", ".join(map(str, items))[:300])
    sys.exit(1 if bad else 0)
