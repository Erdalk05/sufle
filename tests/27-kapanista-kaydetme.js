const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());
const mac=oku(macYolu());

/* KAPANIŞTA KAYDETME
   Telefonun save()'i 120 ms geciktirilmiş. pagehide ve visibilitychange→hidden
   olayları rememberPos() çağırıyordu, o da save() çağırıyordu — yani sayfa
   kapanırken bir ZAMANLAYICI kuruluyordu. Sayfa o anda dondurulur ya da
   sonlandırılır; zamanlayıcı hiç ateşlenmez. iPhone'da uygulamayı yukarı
   kaydırıp kapatmak tam olarak bunu yapar.

   Sonuç: "kaldığın yer" TAM DA VAR OLDUĞU senaryoda çalışmıyordu; ayrıca
   kapanmadan önceki 120 ms içindeki her düzenleme kayboluyordu.

   Mac'te aynı akış doğruydu: save() senkron ve beforeunload'da yazıyor.
   Yani telefonun performans için eklenmiş debounce'u özelliği kırmıştı.

   Testin ayırt edici kurgusu: kapanış yolunu koşturup setTimeout'un
   ÇAĞRILIP ÇAĞRILMADIĞINA bakıyoruz. Zamanlayıcı kuruluyorsa yazım
   gerçekleşmemiş demektir — geri kalan her şey doğru görünse bile. */

/* ---------- KAPANIŞ YOLU GERÇEKTEN SENKRON YAZIYOR MU ---------- */
function kapanisiKos(){
  const izler = [];
  const kur = new Function('__iz', `
    let saveT=null, lsFullWarned=false, saveNowSayisi=0;
    const LS='sufle';
    const st={ scripts:[{id:'a',pos:0}], activeId:'a' };
    let pos=1234;
    const localStorage={ setItem:()=>__iz.push('yazildi') };
    const autoBackup=()=>{};
    const toast=()=>{};
    const active=()=>st.scripts[0];
    const clearTimeout=()=>{};
    const setTimeout=()=>{ __iz.push('ZAMANLAYICI'); return 1; };
    ${cikar(tel, /function saveNow\(\)\{[\s\S]*?\n\}/, 'saveNow')}
    ${cikar(tel, /function save\(\)\{[^\n]*\}/, 'save')}
    ${cikar(tel, /function rememberPos\(\)\{[^\n]*\}/, 'rememberPos')}
    ${cikar(tel, /function kapanistaYaz\(\)\{[^\n]*\}/, 'kapanistaYaz')}
    kapanistaYaz();
    return st.scripts[0].pos;
  `);
  const yazilanPos = kur(izler);
  return { izler, yazilanPos };
}

/* DİKKAT — asıl garanti bu: tezgâhtaki sahte setTimeout geri çağrıyı ASLA
   çalıştırmıyor. Yani aşağıdaki "yazildi" izi ancak SENKRON bir yazımla
   oluşabilir. Eski kodda kapanış yolunda yalnız zamanlayıcı kurulurdu ve bu
   iz hiç görünmezdi.
   "Hiç zamanlayıcı kurulmasın" diye ölçmüyoruz: rememberPos içindeki save()
   bir zamanlayıcı kuruyor, saveNow onu hemen iptal edip yazıyor. Bu ölçüt
   uygulama ayrıntısı olurdu; önemli olan yazımın zamanlayıcıya BAĞLI olmaması. */
const k = kapanisiKos();
ok('kapanışta diske GERÇEKTEN yazılıyor (hiçbir zamanlayıcı çalışmadan)',
   k.izler.includes('yazildi'));
ok('kapanışta önce konum hesaplanıyor, sonra yazılıyor', k.yazilanPos === 1234);
ok('yazım kapanış yolunda zamanlayıcıdan SONRA gelmiyor (sıra: iptal + yaz)',
   k.izler.indexOf('yazildi') === k.izler.length - 1);

/* ---------- NORMAL KULLANIMDA DEBOUNCE KORUNUYOR MU ----------
   Kapanışı düzeltirken debounce'u tümden atmak da yanlış olurdu: hız
   düğmesine basılı tutmak her tuş yinelemesinde 1,4 MB'a varan durumu
   diske yazdırırdı. */
function normalKullanim(){
  const izler = [];
  const kur = new Function('__iz', `
    let saveT=null, lsFullWarned=false;
    const LS='sufle'; const st={};
    const localStorage={ setItem:()=>__iz.push('yazildi') };
    const autoBackup=()=>{}; const toast=()=>{};
    const clearTimeout=()=>{};
    const setTimeout=(f,ms)=>{ __iz.push('ZAMANLAYICI '+ms); return 1; };
    ${cikar(tel, /function saveNow\(\)\{[\s\S]*?\n\}/, 'saveNow')}
    ${cikar(tel, /function save\(\)\{[^\n]*\}/, 'save')}
    save();
  `);
  kur(izler);
  return izler;
}
const n = normalKullanim();
ok('normal save() hemen yazmıyor (debounce duruyor)', !n.includes('yazildi'));
ok('normal save() zamanlayıcı kuruyor', n.some(x => /^ZAMANLAYICI/.test(x)));
const gecikme = parseInt((n.find(x => /^ZAMANLAYICI/.test(x))||'').split(' ')[1], 10);
ok('debounce gecikmesi makul (50-500 ms, ölçülen '+gecikme+')', gecikme >= 50 && gecikme <= 500);

/* ---------- KAYNAK DÜZEYİ: KAPANIŞ OLAYLARI DOĞRU YERE BAĞLI ---------- */
const kod = tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(?<!:)\/\/[^\n]*/g,'');
ok('pagehide kapanış yazıcısına bağlı',
   /addEventListener\('pagehide',\s*kapanistaYaz\)/.test(kod));
ok('sayfa gizlenince de yazılıyor (iOS arka plana atma)',
   /visibilityState==='hidden'\)\s*kapanistaYaz\(\)/.test(kod));
ok('kapanış yolu artık doğrudan rememberPos\'a bağlı DEĞİL',
   !/addEventListener\('pagehide',\s*rememberPos\)/.test(kod));
ok('saveNow senkron: gövdesinde setTimeout yok',
   !/setTimeout/.test(cikar(tel, /function saveNow\(\)\{[\s\S]*?\n\}/, 'saveNow')));

/* ---------- MAC ZATEN DOĞRUYDU — ÖYLE KALSIN ----------
   Mac'in save()'i senkron; oraya bir debounce eklenirse telefonun bu hatası
   Mac'e taşınmış olur. */
const macKod = mac.replace(/\/\*[\s\S]*?\*\//g,'');
/* Mac save() artık tek satır değil: kota dolunca istisna fırlatıyordu, try/catch
   eklendi (bkz. tests/67). Korunan iddia aynı — HEMEN yazıyor, geciktirmiyor;
   çünkü kapanış yolunda geciktirilmiş yazım hiç koşmaz. */
const macSave = cikar(macKod, /function save\(\)\{[\s\S]*?\n  \}/, 'Mac save');
ok('Mac save() senkron (debounce eklenmemiş)', !/setTimeout/.test(macSave));
ok('Mac save() kota hatasını yutmuyor, söylüyor', /Depo dolu/.test(macSave));
ok('Mac kapanışta konumu yazıyor',
   /addEventListener\('beforeunload'[\s\S]{0,80}?rememberPos\(\)/.test(macKod));

/* ---------- KOTA HATASI HÂLÂ GÖRÜNÜR ----------
   Yazımı ayrı bir fonksiyona taşırken kota uyarısının düşmesi, "kaydettim
   sanıp kaydetmeme" hatasını geri getirirdi (v5.8'de kapatılmıştı). */
const saveNowSrc = cikar(tel, /function saveNow\(\)\{[\s\S]*?\n\}/, 'saveNow');
/* GEVŞEK İDDİA TUZAĞI: önce yalnız /lsFull/ arıyordum ve kasıtlı bozma
   turunda kaçırdım — uyarı satırı silinince bile try bloğundaki
   `lsFullWarned=false` eşleşmeye devam ediyordu. Aranacak şey kullanıcıya
   GÖSTERİLEN uyarının kendisi. */
ok('kota dolduğunda kullanıcı hâlâ uyarılıyor',
   /toast\(m\('lsFull'\)\)/.test(saveNowSrc));
ok('kota hatası sessizce yutulmuyor (catch boş değil)',
   /catch\s*\(e\)\s*\{[\s\S]*?toast[\s\S]*?\}/.test(saveNowSrc));
ok('otomatik yedek hâlâ alınıyor', /autoBackup\(\)/.test(saveNowSrc));
