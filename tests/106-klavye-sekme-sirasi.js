const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());

/* K3 — KLAVYE İLE TAM GEZİNME: SEKME SIRASI MANTIKLI MI:
   DEĞİLDİ — ve sebebi sıralama değil, GİZLENMEYEN SAYFALARDI.

   Kapalı sayfa ekranın dışına ötelenmişti (`transform:translateY(110%)`)
   ama GİZLENMİYORDU. İçindeki düğmeler, kaydırıcılar ve yazı kutuları
   klavyeyle hâlâ odaklanabiliyordu.

   ÖLÇÜLDÜ: sayfada 202 odaklanabilir öge var ve 172si sayfaların içinde.
   Yani ana ekranda Sekmeye basan biri GÖRÜNMEYEN denetimlerin arasında
   dolaşıyor; odak halkası ekranın hiçbir yerinde görünmüyor, kullanıcı
   odağın nereye gittiğini bilmiyor.

   Sayfa açıkken de aynı sorunun öbür yüzü vardı — içindeki ilk denetime
   ulaşmak için önündeki her şeyi geçmek gerekiyordu:
     Çekimlerim sayfası    -> 163 Sekme
     kumanda paneli        -> 168 Sekme
     sürüm notu            -> 185 Sekme
     yardım                -> 186 Sekme

   `visibility:hidden` içeriği sekme sırasından tümüyle çıkarıyor. Ana
   ekranda gezilen öge 202den 30a indi. Kapanış animasyonu bozulmuyor:
   görünürlük geçişine 0,3 saniye gecikme kondu.

   NOT: odağın açık sayfa İÇİNDE tutulması (odak tuzağı) ayrı bir iş —
   K7 olarak duruyor. Bu tur yalnız görünmeyen ögeleri sıradan çıkarıyor. */

const govde=tel.slice(tel.indexOf('<body'), tel.indexOf('<script'));

/* ---------- ODAKLANABİLİR ÖGELERİ ÇIKAR ---------- */
function odaklanabilir(html){
  const re=/<(button|input|textarea|select|a)\b[^>]*>/gi;
  const out=[]; let m;
  while((m=re.exec(html))){
    const et=m[0];
    if(/type="hidden"/.test(et)) continue;
    if(m[1]==='a' && !/href=/.test(et)) continue;
    out.push({tag:m[1], id:(et.match(/id="([^"]+)"/)||[,''])[1], poz:m.index});
  }
  return out;
}
function sayfalar(html){
  const out=[]; const re=/<div class="sheet"[^>]*id="([^"]+)"/g; let s;
  while((s=re.exec(html))){
    let d=1, i=re.lastIndex;
    const et=/<div\b[^>]*>|<\/div>/g; et.lastIndex=i; let e;
    while(d>0 && (e=et.exec(html))){ if(e[0]==='</div>') d--; else d++; i=et.lastIndex; }
    out.push({id:s[1], bas:s.index, son:i});
  }
  return out;
}
const hepsi=odaklanabilir(govde), sf=sayfalar(govde);
ok('odaklanabilir ögeler bulundu ('+hepsi.length+')', hepsi.length>100);
ok('sayfalar bulundu ('+sf.length+')', sf.length>=6);

/* ---------- KAPALI SAYFALAR SEKME SIRASINDAN ÇIKMIŞ MI ---------- */
{
  /* CSS kuralları: kapalı gizli, açık görünür. */
  const kural=sec=>{
    const m=tel.match(new RegExp('(?:^|\\})\\s*'+sec.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{([^}]*)\\}','g'));
    return (m||[]).join(' ');
  };
  const kapali=(tel.match(/\.sheet\{[^}]*\}/g)||[]).join(' ');
  const acik=(tel.match(/\.sheet\.open\{[^}]*\}/g)||[]).join(' ');
  ok('kapalı sayfa gizleniyor', /visibility:hidden/.test(kapali));
  ok('açık sayfa görünüyor', /visibility:visible/.test(acik));
  /* Gizleme ile ötelemenin İKİSİ birden olmalı: yalnız öteleme sekmeyi
     durdurmuyor, yalnız gizleme animasyonu bozuyor. */
  ok('öteleme de duruyor (animasyon)', /transform:translateY\(110%\)/.test(kapali));
  ok('açılınca öteleme sıfırlanıyor', /transform:translateY\(0\)/.test(acik));
  /* Kapanış animasyonu görünsün diye görünürlük GECİKMELİ kapanıyor. */
  ok('kapanışta görünürlük 0,3 sn gecikiyor (animasyon kesilmesin)',
     /visibility 0s linear \.3s/.test(kapali));
  ok('açılışta gecikme yok (hemen görünsün)', /visibility 0s\}/.test(acik) || /visibility 0s[^a-z]/.test(acik));
}
{
  const icinde=hepsi.filter(h=>sf.some(x=>h.poz>=x.bas && h.poz<x.son));
  const disinda=hepsi.filter(h=>!sf.some(x=>h.poz>=x.bas && h.poz<x.son));
  console.log('   sayfa içinde '+icinde.length+' · ana ekranda '+disinda.length);
  ok('ögelerin çoğu sayfaların içinde ('+icinde.length+'/'+hepsi.length+')', icinde.length>hepsi.length/2);
  /* ASIL İDDİA: ana ekranda gezilecek öge sayısı makul olmalı. */
  ok('ana ekranda gezilen öge 40ın altında ('+disinda.length+')', disinda.length<40);
  ok('ana ekranda yine de denetim var (hepsi gizlenmemiş)', disinda.length>10);
}

/* ---------- SEKME SIRASI DOM SIRASI (yapay tabindex yok) ---------- */
{
  const pozitif=(tel.match(/tabindex="([1-9]\d*)"/g)||[]);
  ok('pozitif tabindex kullanılmıyor (sırayı bozar)', pozitif.length===0);
  /* Anahtarlara tabindex JS ile veriliyor: sıfır olmalı, sırayı bozmasın. */
  ok('anahtarlara verilen tabindex sıfır', /s\.setAttribute\('tabindex','0'\)/.test(tel));
  ok('odak halkası görünür (odak nereye gitti belli olsun)',
     /\[tabindex\]:focus-visible\{outline:3px solid/.test(tel));
}

/* ---------- SAYFA İÇİ SIRA MANTIKLI MI ---------- */
{
  /* Ayar sayfasında sekme düğmeleri, içerikten ÖNCE gelmeli: kullanıcı
     önce hangi pano olduğunu seçer, sonra içinde gezer. */
  const ayar=sf.find(x=>x.id==='sheet');
  ok('ayar sayfası bulundu', !!ayar);
  if(ayar){
    const ic=govde.slice(ayar.bas, ayar.son);
    const sekmeler=ic.indexOf('class="tabs"');
    const ilkPano=ic.indexOf('class="tab');
    ok('sekme düğmeleri panolardan önce geliyor', sekmeler>=0 && sekmeler<ic.indexOf('id="tab-cam"'));
    /* Arama kutusu PANOLARDAN önce gelmeli: 55 denetim arasında aranan
       şeye ulaşmanın en kısa yolu. (Sekme düğmelerinin ARDINDAN gelmesi
       doğru — önce hangi pano, sonra arama. İlk yazışımda "sekmelerden de
       önce olmalı" diye ölçmüştüm; öyle bir gerekçe yok, kod haklıydı.) */
    const arama=ic.indexOf('id="setFind"');
    ok('ayar araması panolardan önce', arama>=0 && arama<ic.indexOf('id="tab-cam"'));
    ok('ayar araması sayfanın ilk üçte birinde', arama>=0 && arama<ic.length/3);
  }
}
{
  /* Kapatma düğmesi her sayfada BULUNMALI — klavyeyle çıkış yolu. */
  for(const x of sf){
    const ic=govde.slice(x.bas, x.son);
    const kapat=/<button[^>]*id="[^"]*[Xx]"/.test(ic) || /aria-label="[^"]*[Kk]apat/.test(ic) ||
                /class="[^"]*x[^"]*"/.test(ic);
    ok(x.id+': kapatma yolu var', kapat);
  }
  /* Escape her sayfayı kapatıyor — asıl klavye çıkışı bu. */
  ok('Escape sayfaları kapatıyor', /if\(e\.key==='Escape'\)\{ closeSheets\(\); return; \}/.test(tel));
  /* Sıra TUŞ İŞLEYİCİSİ İÇİNDE ölçülmeli: `anySheet()` dosyanın çok
     yukarısında ayrıca TANIMLANIYOR ve dosya genelinde arayınca desen o
     tanıma takılıyor. İlk yazışımda tam bunu yaptım ve test yanlış kırmızı
     verdi — kod doğruydu. */
  const mTus=tel.match(/if\(tag==='textarea'\|\|tag==='input'\)\{ yazidaYutuldu=true; return; \}[\s\S]*?ACTIONS\[act\]\(\); flashKey/);
  ok('tuş işleyicisi çıkarılabildi', !!mTus);
  ok('Escape sayfa açıkken tuşların sufleyi sürmesinden ÖNCE ele alınıyor',
     !!mTus && mTus[0].indexOf("if(e.key==='Escape')") < mTus[0].indexOf('if(anySheet()) return;'));
  ok('sayfa açıkken tuşlar sufleyi sürmüyor', !!mTus && /if\(anySheet\(\)\) return;/.test(mTus[0]));
}

/* ---------- GÖRÜNMEYEN BAŞKA ÖGE KALDI MI ---------- */
{
  /* `hidden` sınıfı gerçekten gizliyor mu — yoksa aynı tuzağın ikizi olur. */
  /* Desen GERÇEK kurala bağlı olmalı ve YALNIZ CSS bloğunda aranmalı.
     İki kez tökezledim: (1) `#intro.hidden{display:none}` da var, gevşek
     desen ona takıldı; (2) kuralı ANLATAN bir yorum satırı da aynı metni
     içeriyor, desen bu kez ona takıldı. Stil bloğunu ayırıp orada ara. */
  const stil=tel.slice(tel.indexOf('<style'), tel.indexOf('</style>'));
  ok('hidden sınıfı display none ile gizliyor', /\n\s*\.hidden\{display:none!important\}/.test(stil));
  /* Dosya seçiciler görünmez ama odaklanabilir olmamalı. */
  const gizliGirdiler=(govde.match(/<input[^>]*class="hidden"[^>]*>/g)||[]);
  ok('gizli dosya seçicileri hidden sınıfıyla kapalı ('+gizliGirdiler.length+')', gizliGirdiler.length>=2);
}
