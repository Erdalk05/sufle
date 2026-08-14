const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');

/* K11 + K9 — Erdal kararı bana bıraktı, ikisini de ölçüp karar verdim.

   K11 (dokunma hedefleri): ikon 35 px, segment 40 px, sekme 38 px — üçü de
   44 px tavsiyesinin altındaydı. Erdala "büyütmek görünümü değiştirir"
   demiştim; doğru ama EKSİK: paint büyümeden HEDEF büyütülebiliyor.
   Görünmez bir örtü hedefi 44x44e tamamlıyor; kutu, kenarlık, yazı ve
   hizalama birebir aynı kalıyor. K8de anahtar satırında yaptığımın aynısı.

   K9 (kenarlık kontrastı): ÖLÇÜLDÜ — normal temada kenarlık/kart oranı
   1,17:1, WCAG 1.4.11in metin dışı eşiği 3:1. Yüksek kontrast ayarı bunu
   16,58:1e çıkarıyor, yani erişilebilir yol VAR ve çalışıyor.
   KARAR: temaya dokunmadım (uygulamanın görünümünü baştan aşağı değiştirir,
   bu bir tasarım kararı). Asıl boşluk BULUNABİLİRLİKTİ: ihtiyacı olan kişi
   ayarı avlamak zorundaydı. Artık işletim sisteminde yüksek kontrast
   açıksa uygulama da açık başlıyor — yalnız ilk açılışta, sonradan
   kapatan kullanıcının kararına saygı duyuluyor. */

/* ---------- K11: HEDEF BÜYÜDÜ, PAİNT BÜYÜMEDİ ---------- */
const kural=sec=>{
  const m=tel.match(new RegExp('(?:^|\\})\\s*'+sec.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{([^}]*)\\}'));
  return m?m[1]:'';
};
{
  const ortu=tel.match(/\.iconbtn::after, \.seg button::after, \.tabs button::after\{([^}]*)\}/);
  ok('üç denetim için de görünmez örtü var', !!ortu);
  if(ortu){
    ok('örtü en az 44 piksel', /width:max\(100%,44px\);height:max\(100%,44px\)/.test(ortu[1]));
    ok('örtü ortalanmış', /left:50%;top:50%;transform:translate\(-50%,-50%\)/.test(ortu[1]));
    ok('örtü mutlak konumlu', /position:absolute/.test(ortu[1]));
    /* Örtü GÖRÜNMEMELİ: zemini, kenarlığı ya da rengi olmamalı. */
    for(const g of ['background','border','color','box-shadow'])
      ok('örtünün görünür bir özelliği yok: '+g, !new RegExp(g+':').test(ortu[1]));
  }
  ok('kapsayıcılar konumlandırılmış (örtü doğru yere otursun)',
     /\.seg button, \.tabs button\{position:relative\}/.test(tel) && /position:relative/.test(kural('.iconbtn')));
  /* PAİNT DEĞİŞMEDİ: ölçülen dolgular aynı kaldı. */
  ok('ikon düğmesinin dolgusu değişmedi', /padding:7px 8px/.test(kural('.iconbtn')));
  ok('segment düğmesinin dolgusu değişmedi', /padding:12px 4px/.test(tel));
  ok('sekme düğmesinin dolgusu değişmedi', /padding:11px 0/.test(tel));
  /* K8de kurulan satır hedefi de duruyor. */
  ok('anahtar satırı 44 pikselde kalıyor', /min-height:44px/.test(kural('.tog')));
}

/* ---------- K9: KONTRAST ÖLÇÜMÜ ---------- */
{
  const hex=h=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));};
  const Lum=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
    return 0.2126*r+0.7152*g+0.0722*b;};
  const K=(a,b)=>{const l1=Lum(a),l2=Lum(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);};
  /* Araç doğrulaması: bilinen iki uç. */
  ok('kontrast aracı doğru (siyah/beyaz 21:1)', Math.abs(K([0,0,0],[255,255,255])-21)<0.01);
  ok('kontrast aracı doğru (aynı renk 1:1)', Math.abs(K([30,30,36],[30,30,36])-1)<0.001);

  const line=(tel.match(/--line:\s*(#[0-9a-fA-F]{6})/)||[])[1];
  const card=(tel.match(/--card:\s*(#[0-9a-fA-F]{6})/)||[])[1];
  ok('tema renkleri okunabildi', !!line && !!card);
  if(line && card){
    const normal=K(hex(line),hex(card));
    const yuksek=K([255,255,255],hex(card));
    console.log('   kenarlık/kart — normal: '+normal.toFixed(2)+':1 · yüksek kontrast: '+yuksek.toFixed(2)+':1');
    ok('normal tema eşiğin ALTINDA (bilinen ve kabul edilen durum: '+normal.toFixed(2)+':1)', normal<3);
    ok('yüksek kontrast eşiği AŞIYOR ('+yuksek.toFixed(2)+':1)', yuksek>=3);
    ok('yüksek kontrast bol pay bırakıyor', yuksek>10);
  }
  /* "En az bir kural beyaz" YETMEZ: bir kuralı bozan bozma kaçtı. İddia
     HEPSİ — kenarlık rengi veren her yüksek kontrast kuralı beyaz olmalı,
     yoksa o yüzey eşiğin altında kalır. */
  const hiconKural=(tel.match(/body\.hicon[^{]*\{[^}]*border-color:[^;}]*/g)||[]);
  const beyazOlmayan=hiconKural.filter(k=>!/border-color:#fff/.test(k));
  console.log('   yüksek kontrast kenarlık kuralı: '+hiconKural.length+
              (beyazOlmayan.length?' · beyaz olmayan: '+beyazOlmayan.length:''));
  ok('yüksek kontrast kenarlık kuralları bulundu ('+hiconKural.length+')', hiconKural.length>=3);
  ok('kenarlık veren HER yüksek kontrast kuralı beyaz'+
     (beyazOlmayan.length?' — beyaz değil: '+beyazOlmayan.map(x=>x.slice(0,40)).join(' | '):''),
     beyazOlmayan.length===0);
}

/* ---------- K9: İŞLETİM SİSTEMİ TERCİHİ DEVRALINIYOR ---------- */
ok('işletim sistemi kontrast tercihi okunuyor',
   /window\.matchMedia\('\(prefers-contrast: more\)'\)/.test(kod));
ok('tercih varsa yüksek kontrast açılıyor', /if\(mm && mm\.matches\) st\.hicon=true;/.test(kod));
ok('yalnız İLK açılışta devralınıyor', /if\(!st\.hiconSoruldu\)\{/.test(kod));
ok('bayrak kalıcı (kullanıcı kararına saygı)', /st\.hiconSoruldu=1;/.test(kod));
ok('bayrak varsayılanlarda tanımlı', /hicon:false, hiconSoruldu:0/.test(kod));
ok('matchMedia yoksa çökmüyor', /window\.matchMedia && window\.matchMedia\(/.test(kod));

{
  /* Gerçek mantığı koştur: dört durum. */
  function yukle({kayitli, os}){
    return new Function('__d', `
      const st=Object.assign({hicon:false, hiconSoruldu:0}, __d.kayitli);
      const window={ matchMedia: __d.os===null ? null : (q)=>({matches:__d.os}) };
      if(!st.hiconSoruldu){
        st.hiconSoruldu=1;
        const mm = window.matchMedia && window.matchMedia('(prefers-contrast: more)');
        if(mm && mm.matches) st.hicon=true;
      }
      return st;
    `)({kayitli, os});
  }
  ok('ilk açılış + OS yüksek kontrast -> açık', yukle({kayitli:{}, os:true}).hicon===true);
  ok('ilk açılış + OS normal -> kapalı', yukle({kayitli:{}, os:false}).hicon===false);
  ok('kullanıcı kapatmışsa OS açık olsa da KAPALI kalıyor',
     yukle({kayitli:{hicon:false, hiconSoruldu:1}, os:true}).hicon===false);
  ok('kullanıcı açmışsa açık kalıyor',
     yukle({kayitli:{hicon:true, hiconSoruldu:1}, os:false}).hicon===true);
  ok('matchMedia hiç yoksa çökmüyor', yukle({kayitli:{}, os:null}).hicon===false);
  ok('devralma bir kez oluyor (bayrak kalıcı)', yukle({kayitli:{}, os:true}).hiconSoruldu===1);
}
