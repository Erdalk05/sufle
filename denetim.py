#!/usr/bin/env python3
"""Sufle statik denetim — her sürümde koşturulacak.
Yakaladıkları: yinelenen id · eksik DOM ögesi · sözlükte olmayan metin anahtarı ·
TR/EN farkı · TANIMSIZ FONKSİYON ÇAĞRISI (bu sonuncusu kayıt düğmesini kıracaktı)."""
import re, sys, collections

BUILTIN = set("""if for while switch catch return typeof function new delete void yield await async
String Number Math JSON Array Object Boolean Promise Date RegExp Set Map WeakMap Symbol Error
parseInt parseFloat isFinite isNaN encodeURIComponent decodeURIComponent escape unescape
setTimeout setInterval clearTimeout clearInterval requestAnimationFrame cancelAnimationFrame
fetch alert confirm prompt URL URLSearchParams Blob File FileReader FormData Image Audio Event
MediaRecorder MediaStream MediaStreamTrack AudioContext EventSource Headers Response Request
DataTransfer PointerEvent KeyboardEvent MouseEvent CustomEvent IntersectionObserver
ResizeObserver MutationObserver TextDecoder TextEncoder Uint8Array Uint8ClampedArray
Float32Array Int32Array ArrayBuffer DOMParser Notification Worker indexedDB localStorage
sessionStorage document window navigator location history performance screen console
speechSynthesis SpeechRecognition webkitSpeechRecognition""".split())

def audit(path, msg_var="const MSG", i18n_var="const I18N"):
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
    code = re.sub(r"(?m)^\s*//.*$", "", code)
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
    taban = 16 if is_mac else 23
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
        parts = re.split(r"\n\s*en:\{", m.group(1))
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

    if is_mac:
        return problems      # Mac tek dilli: yalnız sözlük ve data-i18n kontrolleri geçersiz

    mt, me = keys(msg_var); it, ie = keys(i18n_var)
    if mt ^ me: problems.append(("MSG TR/EN farkı", sorted(mt ^ me)))
    if (it ^ ie) - {"camera"}: problems.append(("I18N TR/EN farkı", sorted((it ^ ie) - {"camera"})))
    mc = set(re.findall(r"\bm\('([A-Za-z0-9]+)'\)", js))
    tc = set(re.findall(r"\bt\('([A-Za-z0-9]+)'\)", js))
    if mc - mt: problems.append(("MSG'de olmayan m() anahtarı", sorted(mc - mt)))
    if tc - it: problems.append(("I18N'de olmayan t() anahtarı", sorted(tc - it)))
    d = set(re.findall(r'data-i18n="([^"]+)"', html))
    if d - it: problems.append(("I18N'de olmayan data-i18n", sorted(d - it)))
    dp = set(re.findall(r'data-i18n-ph="([^"]+)"', html))
    if dp - it: problems.append(("I18N'de olmayan data-i18n-ph", sorted(dp - it)))

    return problems

if __name__ == "__main__":
    bad = 0
    for path in sys.argv[1:]:
        print("=" * 8, path.split("/")[-1], "=" * 8)
        pr = audit(path)
        if not pr:
            print("  temiz ✓")
        for name, items in pr:
            bad += 1
            print("  ✗", name + ":", ", ".join(map(str, items))[:300])
    sys.exit(1 if bad else 0)
