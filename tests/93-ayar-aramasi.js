const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* K1 — AYAR ARAMASI BÜTÜN AYARLARI BULUYOR MU: BULUYOR (ölçüldü).

   Ayarlar sayfası dört panoya bölünmüş ve içinde 55 denetim var (anahtar,
   kaydırıcı, segment). Arama, panoların ÜST DÜZEY çocukları üzerinde metin
   eşleştiriyor — ama bir kaydırıcının kendi metni YOKTUR: etiketi ayrı bir
   kardeş. O yüzden asıl soru "etiket bulunuyor mu" değil, DENETİMİN KENDİSİ
   görünür oluyor mu.

   Kural şu: eşleşen ögeden sonraki kardeşler, bir sonraki `.row` etiketine
   kadar açılıyor. Böylece etiket eşleşince ona ait denetim de açılıyor.
   Ölçülen sınır durumu: okuma çizgisi kaydırıcısının etiketi İKİ kardeş
   geride (etiket → boş uyarı bloğu → kaydırıcı) ve kural onu da açıyor.

   Bu test gerçek `searchSettings`i gerçek sayfa yapısıyla koşturuyor:
   her denetim için etiketinden bir kelime aranıyor ve denetimin GÖRÜNÜR
   olduğu sınanıyor. Ürün kodu değişmedi. */

const mSearch=kod.match(/function searchSettings\(\)\{[\s\S]*?\n\}/);
ok('searchSettings çıkarılabildi', !!mSearch);
if(!mSearch) return;
/* norm KOPYALANMAZ, kaynaktan çıkarılır: Türkçe harf katlaması (ç->c, ı->i)
   aramanın kalbi. İlk yazışımda sahte bir norm yazdım ve "cizgi" araması
   "çizgisi" ile eşleşmedi — kendi tezgâhım yanlış kırmızı verdi. */
const mNorm=kod.match(/function norm\(x\)\{[\s\S]*?FOLD\[c\]\|\|c\); \}/);
ok('norm çıkarılabildi', !!mNorm);
const mFold=kod.match(/const FOLD=\{[^}]*\};/);
ok('FOLD tablosu çıkarılabildi', !!mFold);
if(!mNorm || !mFold) return;

/* ---------- SAYFA YAPISINI ÇIKAR ---------- */
function panolariCikar(html){
  const panolar=[]; const re=/<div class="tab(?: [^"]*)?"[^>]*>/g; let m;
  while((m=re.exec(html))){
    let d=1, i=re.lastIndex; const bas=i;
    const et=/<div\b[^>]*>|<\/div>/g; et.lastIndex=i; let e;
    while(d>0 && (e=et.exec(html))){ if(e[0]==='</div>') d--; else d++; i=et.lastIndex; }
    panolar.push(html.slice(bas, i-6));
  }
  return panolar;
}
function cocuklar(pano){
  const out=[]; let i=0;
  while(i<pano.length){
    const m=/<(\w+)\b[^>]*?(\/?)>/g; m.lastIndex=i;
    const t=m.exec(pano); if(!t) break;
    if(t[2]==='/' || /^(input|br|img|hr)$/.test(t[1])){ out.push(pano.slice(t.index,m.lastIndex)); i=m.lastIndex; continue; }
    let d=1, j=m.lastIndex;
    const et=new RegExp('<'+t[1]+'\\b[^>]*>|<\\/'+t[1]+'>','g'); et.lastIndex=j; let e;
    while(d>0 && (e=et.exec(pano))){ if(e[0].startsWith('</')) d--; else d++; j=et.lastIndex; }
    out.push(pano.slice(t.index,j)); i=j;
  }
  return out.filter(x=>x.trim());
}
const metin=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

const sheet=tel.slice(tel.indexOf('id="sheet"'), tel.indexOf('id="scriptsSheet"'));
const hamPanolar=panolariCikar(sheet);
ok('ayar panoları çıkarılabildi ('+hamPanolar.length+' pano)', hamPanolar.length>=4);

/* Sahte DOM: yalnız aramanın dokunduğu özellikler. */
function sayfaKur(){
  const yap=h=>{
    const sinif=(h.match(/class="([^"]*)"/)||[,''])[1].split(/\s+/).filter(Boolean);
    return { html:h, textContent:metin(h), style:{display:''},
      classList:{ _s:new Set(sinif),
        contains(x){ return this._s.has(x); },
        add(x){ this._s.add(x); }, remove(x){ this._s.delete(x); } } };
  };
  const panes=hamPanolar.map(p=>{
    const ch=cocuklar(p).map(yap);
    return { children:ch, style:{display:''} };
  });
  return panes;
}
function ara(sorgu, once){
  /* `once` verilirse AYNI sayfa üzerinde ikinci bir arama yapılır. Temizleme
     ancak önce bir şey gizlenmişse anlamlıdır; her çağrıda taze sayfa kurmak
     o iddiayı ayırt edilemez kılıyordu (kasıtlı bozma turunda ölçüldü). */
  const panes=once ? once.panes : sayfaKur();
  const cikti=once ? once.cikti : {style:{display:''}, textContent:''};
  const tabsBtn=[{style:{display:''}},{style:{display:''}}];
  new Function('__p','__q','__out','__tabs', `
    const L='tr';
    ${mFold[0]}
    ${mNorm[0]}
    const el={ '#setFind':{value:__q}, '#setFindOut':__out,
               '#sheet':{ querySelectorAll:()=>__p } };
    const $=k=>el[k];
    const $$=()=>__tabs;
    ${mSearch[0]}
    searchSettings();
  `)(panes, sorgu, cikti, tabsBtn);
  return {panes, cikti};
}
const gorunur=el=>el.style.display!=='none';

/* ---------- HER DENETİM BULUNUYOR MU ---------- */
{
  /* Denetimleri ve onları tarif eden en yakın ÖNCEKİ etiketi eşle. */
  const hedefler=[];
  hamPanolar.forEach((p,pi)=>{
    const c=cocuklar(p);
    let sonEtiket='';
    c.forEach((h,ci)=>{
      const t=metin(h);
      if(/class="row"/.test(h) && t) sonEtiket=t;
      const idm=h.match(/<input[^>]*type="range"[^>]*id="(\w+)"/) ||
                h.match(/<div class="seg" id="(\w+)"/);
      if(idm) hedefler.push({pano:pi, sira:ci, id:idm[1], etiket:sonEtiket||t});
      else if(/data-t="/.test(h) && t) hedefler.push({pano:pi, sira:ci, id:(h.match(/data-t="(\w+)"/)||[,''])[1], etiket:t});
    });
  });
  ok('denetimler bulundu ('+hedefler.length+' adet)', hedefler.length>=45);
  const etiketsiz=hedefler.filter(h=>!h.etiket);
  ok('her denetimin tarif eden bir metni var'+(etiketsiz.length?' — eksik: '+etiketsiz.map(x=>x.id):''), etiketsiz.length===0);

  /* Etiketten ayırt edici bir kelime seç ve ara. */
  const kelime=s=>{
    const k=s.replace(/[0-9.,]/g,' ').split(/\s+/).filter(w=>w.length>4 && /^[\p{L}]+$/u.test(w));
    return k[0]||null;
  };
  let denenen=0, bulunamayan=[];
  for(const h of hedefler){
    const w=kelime(h.etiket); if(!w) continue;
    denenen++;
    const {panes}=ara(w);
    const el=panes[h.pano].children[h.sira];
    if(!el || !gorunur(el)) bulunamayan.push(h.id+' ("'+w+'")');
  }
  ok(denenen+' denetimin hepsi etiketiyle aranınca GÖRÜNÜR oluyor'+
     (bulunamayan.length?' — bulunamayan: '+bulunamayan.slice(0,5).join(', '):''),
     bulunamayan.length===0);
}

/* ---------- SINIR DURUMU: ETİKETİ İKİ KARDEŞ GERİDE OLAN KAYDIRICI ---------- */
{
  /* Okuma çizgisi: etiket -> boş uyarı bloğu -> kaydırıcı. Kural bir sonraki
     `.row`a kadar açtığı için aradaki boş blok onu engellemiyor. */
  /* DESEN ÖZNİTELİK SIRASINA BAĞLI OLMASIN. Eski hâli `<label data-i18n=`
     diye tam sıra istiyordu; kaydırıcılara erişilebilir ad için `for=`
     eklenince (2026-08-15) bu iddia yapı hiç değişmediği hâlde kırmızıya
     döndü. Sınanan şey SIRA değil YAPI: etiket → boş uyarı bloğu → kaydırıcı. */
  ok('okuma çizgisi kaydırıcısının etiketi iki kardeş geride',
     /class="row"><label[^>]*data-i18n="eyeLine"[\s\S]{0,200}?id="eyeUyari"[\s\S]{0,80}?id="eye"/.test(tel));
  const {panes}=ara('cizgi');
  let bulundu=false;
  panes.forEach(p=>p.children.forEach(c=>{ if(/id="eye"/.test(c.html) && gorunur(c)) bulundu=true; }));
  ok('araya boş blok girse de kaydırıcı açılıyor', bulundu);
}

/* ---------- ARAMA DAVRANIŞI ---------- */
{
  const {panes,cikti}=ara('kamera');
  ok('eşleşme bulununca sayı bildiriliyor', /ayar bulundu/.test(cikti.textContent));
  ok('eşleşmeyen ögeler gizleniyor',
     panes.some(p=>p.children.some(c=>c.style.display==='none')));
  /* ÖNCE ara, SONRA temizle — aynı sayfada. */
  const kirli=ara('kamera');
  ok('arama gerçekten bir şeyleri gizledi (temizleme sınavının ön koşulu)',
     kirli.panes.some(p=>p.children.some(c=>c.style.display==='none')));
  const bos=ara('', kirli);
  ok('arama temizlenince her şey geri geliyor',
     bos.panes.every(p=>p.children.every(c=>c.style.display==='')));
  ok('arama temizlenince panolar da geri geliyor',
     bos.panes.every(p=>p.style.display!=='none'));
  ok('arama temizlenince sonuç satırı gizleniyor', bos.cikti.style.display==='none');
  const yok=ara('zzzyokboylebirsey');
  ok('eşleşme yoksa söyleniyor', /Eşleşen ayar yok/.test(yok.cikti.textContent));
  ok('eşleşme yoksa panolar gizleniyor', yok.panes.every(p=>p.style.display==='none'));
  /* Sonuç satırı GÖRÜNÜR olmalı: yoksa kullanıcı hiç geri bildirim almaz. */
  ok('sonuç satırı arama sırasında görünür', yok.cikti.style.display==='');
  ok('eşleşme varken de görünür', ara('kamera').cikti.style.display==='');
}
{
  /* Aramada sekme sınırı olmamalı: aradığın ayar başka sekmedeyse de çıkmalı. */
  ok('arama sırasında sekme düğmeleri gizleniyor',
     /\$\$\('#sheet \.tabs button'\)\.forEach\(b=>b\.style\.display='none'\)/.test(kod));
  ok('arama temizlenince sekmeler geri geliyor',
     /\$\$\('#sheet \.tabs button'\)\.forEach\(b=>b\.style\.display=''\)/.test(kod));
}

/* ---------- KAYNAK DÜZEYİ: İKİ KURAL DURUYOR MU ---------- */
ok('gizli bloklar için ayrı sınıf kullanılıyor (satır içi stil yetmiyor)',
   /el\.classList\.contains\('hidden'\)\) el\.classList\.add\('aramaAcik'\)/.test(kod));
ok('aramaAcik sınıfı sayfada tanımlı', /\.aramaAcik/.test(tel));
/* Araya satır sonu yorumu giriyor; `kod` yalnız blok yorumlarını atıyor. */
ok('eşleşen etiketten sonraki denetimler açılıyor',
   /for\(let j=i\+1;j<c\.length;j\+\+\)\{[\s\S]{0,80}?if\(c\[j\]\.classList\.contains\('row'\)\) break;/.test(kod));
ok('denetimden önceki etiket de açılıyor',
   /const onceki=c\[i-1\];[\s\S]{0,120}?contains\('row'\)\) ac\(onceki\)/.test(kod));
