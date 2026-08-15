const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');

/* K7 — ODAK TUZAĞI: SAYFA AÇIKKEN SEKME ARKAYA KAÇIYOR MU:
   KAÇIYORDU. Perde (backdrop) fareyi durduruyor (`pointer-events:auto`)
   ama KLAVYEYİ hiç durdurmuyordu.

   ÖLÇÜLDÜ: hangi sayfa açık olursa olsun arkadaki 27 denetim Sekme ile
   geziliyordu ve içlerinde KAYIT DÜĞMESİ var. Klavye kullanan biri açık
   ayar sayfasının arkasındaki kayda ulaşıp Enter ile çekim başlatabiliyor,
   üstelik sufle sayfanın altında kalmış oluyordu. Sesli komut ve hazırlık
   düğmesi de aynı şekilde ulaşılabiliyordu.

   Aynı kusur SONUÇ EKRANI için de vardı: tam ekran örtü (z-index 40) ama
   arkasındaki denetimler yine Sekmeye açıktı — "bir yön kontrol edildi,
   tersi edilmedi" deseni.

   `inert` ana bölümleri hem odaktan hem ekran okuyucudan çıkarıyor. Kilit
   DURUMDAN türetiliyor (elle açılıp kapatılmıyor), böylece çağrı sırası ne
   olursa olsun takılı kalamıyor. Bildirim balonu KASTEN dışarıda: sebep
   mesajlarının duyurulduğu tek kanal o.

   K3 kapalı sayfaların içini sıradan çıkarmıştı; bu tur ARKAYI kapatıyor. */

/* ---------- KAYNAK DÜZEYİ ---------- */
ok('arka bölümler listesi var',
   /const ARKA_BOLUMLER=\['#stage','#bar','#lockOverlay','#intro','#result','#vHud'\];/.test(kod));
ok('kilit inert ile kuruluyor', /el\.setAttribute\('inert',''\)/.test(kod));
ok('kilit inert ile kaldırılıyor', /el\.removeAttribute\('inert'\)/.test(kod));
ok('kilit DURUMDAN türetiliyor (elle bayrak yok)', /function arkayiKilitle\(\)\{/.test(kod));
ok('üstteki yüzey sayfa mı sonuç mu diye karar veriliyor',
   /const ustYuzey = anySheet\(\) \? 'sayfa' : \(sonuc \? '#result' : null\);/.test(kod));
ok('bildirim balonu listeye ALINMAMIŞ (duyurular sussun istemiyoruz)',
   !/ARKA_BOLUMLER=\[[^\]]*#toast/.test(kod));

/* Dört çağrı yerinin dördü de bağlı olmalı — biri unutulursa kilit takılır. */
ok('sayfa açılınca kilit tazeleniyor', /\$\(id\)\.classList\.add\('open'\); body\.classList\.add\('sheeting'\);\s*\n\s*arkayiKilitle\(\);/.test(kod));
ok('sayfa kapanınca kilit tazeleniyor', /body\.classList\.remove\('sheeting'\); arkayiKilitle\(\);/.test(kod));
ok('sonuç ekranı açılınca kilit tazeleniyor', /\$\('#result'\)\.classList\.add\('open'\); arkayiKilitle\(\);/.test(kod));
ok('sonuç ekranı kapanınca kilit tazeleniyor', /\$\('#result'\)\.classList\.remove\('open'\); arkayiKilitle\(\);/.test(kod));

/* ---------- GERÇEK İŞLEVİ KOŞTUR ---------- */
const mKilit=kod.match(/const ARKA_BOLUMLER=[\s\S]*?\n\}/);
ok('kilit işlevi çıkarılabildi', !!mKilit);
if(!mKilit) return;

function tezgah({sayfaAcik=false, sonucAcik=false}={}){
  return new Function('__d', `
    const durum={};
    const yap=sel=>({ sel, nitelik:{},
      setAttribute(a,v){ this.nitelik[a]=v; },
      removeAttribute(a){ delete this.nitelik[a]; },
      classList:{ _s:new Set(__d.sonuc&&sel==='#result'?['open']:[]),
        contains(x){ return this._s.has(x); } } });
    for(const sel of ['#stage','#bar','#lockOverlay','#intro','#result','#vHud']) durum[sel]=yap(sel);
    const $=sel=>durum[sel]||null;
    const anySheet=()=>__d.sayfa;
    ${mKilit[0]}
    arkayiKilitle();
    const kilitli={}; for(const k in durum) kilitli[k]=durum[k].nitelik.inert!==undefined;
    return kilitli;
  `)({sayfa:sayfaAcik, sonuc:sonucAcik});
}
{
  const r=tezgah({sayfaAcik:false, sonucAcik:false});
  ok('hiçbir şey açık değilken hiçbir bölüm kilitli değil',
     Object.values(r).every(v=>v===false));
}
{
  const r=tezgah({sayfaAcik:true});
  ok('sayfa açıkken sahne kilitli', r['#stage']===true);
  ok('sayfa açıkken alt çubuk kilitli (kayıt düğmesi orada)', r['#bar']===true);
  ok('sayfa açıkken sonuç ekranı da kilitli', r['#result']===true);
  ok('sayfa açıkken kilit ekranı ve tanıtım da kilitli',
     r['#lockOverlay']===true && r['#intro']===true);
  ok('sayfa açıkken ses göstergesi de kilitli', r['#vHud']===true);
  ok('sayfa açıkken ALTI bölümün altısı da kilitli',
     Object.values(r).filter(Boolean).length===6);
}
{
  const r=tezgah({sonucAcik:true});
  ok('sonuç ekranı açıkken arka kilitli', r['#stage']===true && r['#bar']===true);
  ok('sonuç ekranının KENDİSİ kilitli değil (kullanılabilir kalmalı)', r['#result']===false);
}
{
  /* İkisi birdenken sayfa üstte: sonuç ekranı da kilitlenmeli. */
  const r=tezgah({sayfaAcik:true, sonucAcik:true});
  ok('sayfa sonuç ekranının üstündeyken sonuç da kilitli', r['#result']===true);
  ok('bu durumda arka yine kilitli', r['#stage']===true);
}
{
  /* KİLİT TAKILI KALMAMALI: aç-kapa döngüsü sonunda her şey serbest. */
  const acik=tezgah({sayfaAcik:true, sonucAcik:true});
  const kapali=tezgah({sayfaAcik:false, sonucAcik:false});
  ok('aç-kapa sonrası hiçbir bölüm kilitli kalmıyor',
     Object.values(acik).some(Boolean) && Object.values(kapali).every(v=>v===false));
}

/* ---------- ARKADA KAÇ DENETİM VARDI (ÖLÇÜM) ---------- */
{
  /* 106 ile aynı düzeltme: <body>'den SONRAKİ ilk <script>. F.6'da head
     içine JSON-LD eklenince eski varsayım kesiti boşalttı. */
  const govde=tel.slice(tel.indexOf('<body'), tel.indexOf('<script', tel.indexOf('<body')));
  const re=/<(button|input|textarea|select|a)\b[^>]*>/gi; const hepsi=[]; let m;
  while((m=re.exec(govde))){
    const et=m[0];
    if(/type="hidden"/.test(et) || /class="hidden"/.test(et)) continue;
    if(m[1]==='a' && !/href=/.test(et)) continue;
    hepsi.push({id:(et.match(/id="([^"]+)"/)||[,''])[1], poz:m.index});
  }
  const sre=/<div (?:class="sheet"[^>]*id="([^"]+)"|id="([^"]+)"[^>]*class="sheet")/g; const sf=[]; let s;
  while((s=sre.exec(govde))){
    let d=1,i=sre.lastIndex; const et=/<div\b[^>]*>|<\/div>/g; et.lastIndex=i; let e;
    while(d>0&&(e=et.exec(govde))){ if(e[0]==='</div>') d--; else d++; i=et.lastIndex; }
    sf.push({id:s[1]||s[2], bas:s.index, son:i});
  }
  const arka=hepsi.filter(h=>!sf.some(x=>h.poz>=x.bas && h.poz<x.son));
  console.log('   sayfa açıkken arkada duran denetim: '+arka.length);
  ok('arkada gerçekten denetim var ('+arka.length+') — kilit boşuna değil', arka.length>=20);
  /* En tehlikelisi: kayıt düğmesi. Arkada olduğu kilitleniyor. */
  const idler=arka.map(x=>x.id);
  for(const kritik of ['recBtn','voiceBtn','readyBtn','settingsBtn'])
    ok('arkada duran kritik denetim kapsanıyor: '+kritik, idler.includes(kritik));
  /* Bunların hepsi kilitlenen bölümlerin içinde mi — kapsam boşluğu kalmasın. */
  const bolumAralik=[];
  for(const sel of ['stage','bar','lockOverlay','intro','result','vHud']){
    const i=govde.indexOf('id="'+sel+'"');
    if(i<0) continue;
    let bas=govde.lastIndexOf('<div', i), d=1, j=govde.indexOf('>', i)+1;
    const et=/<div\b[^>]*>|<\/div>/g; et.lastIndex=j; let e;
    while(d>0 && (e=et.exec(govde))){ if(e[0]==='</div>') d--; else d++; j=et.lastIndex; }
    bolumAralik.push({sel, bas, son:j});
  }
  const kapsanmayan=arka.filter(h=>!bolumAralik.some(b=>h.poz>=b.bas && h.poz<b.son));
  ok('arkadaki denetimlerin HEPSİ kilitlenen bölümlerin içinde'+
     (kapsanmayan.length?' — dışarıda: '+kapsanmayan.map(x=>x.id||'(idsiz)').join(', '):''),
     kapsanmayan.length===0);
}

/* ---------- PERDE FAREYİ ZATEN DURDURUYORDU ---------- */
ok('perde fareyi durduruyor (klavye eksikti)', /body\.sheeting #backdrop\{opacity:1;pointer-events:auto\}/.test(tel));
ok('Escape hâlâ çıkış yolu', /if\(e\.key==='Escape'\)\{ closeSheets\(\); return; \}/.test(kod));
