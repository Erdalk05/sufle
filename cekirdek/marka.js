/* MARKA KİTİ — logo, marka rengi, alt bant. TEK KAYNAK (G.4).

   NEDEN: BIGVU marka kitini (logo + marka renkleri + alt bant) EN PAHALI
   katmana kilitlemiş; teleprompter.com sunmuyor. Bizde ücretsiz olması
   doğrudan bir rekabet silahı. Hesap çekirdekte çünkü iki kabuk da aynı
   yerleşimi çizmek zorunda: logosu telefonda sağ üstte, masaüstünde biraz
   kaymış duran bir ürün "marka tutarlılığı" satamaz.

   KURAL — MARKA RENGİ OKUNURLUĞU BOZAMAZ: kullanıcı sarı da seçebilir,
   lacivert de. Bandın üstündeki yazının rengi seçilen renge göre HESAPLANIR
   (WCAG bağıl parlaklık), elle yazılmaz. */

/* Logo/bant kenar boşluğu: platform arayüzleri (Reels ölçüm çubuğu, YouTube
   başlığı) kadrajın kenarını yiyor. Oranlar kısa kenara göre. */
const MARKA_KENAR = 0.045;
const MARKA_KONUMLAR = ['sagUst','solUst','sagAlt','solAlt'];

/* Logonun çizileceği dikdörtgen. ORAN KORUNUR: sıkıştırılmış logo, marka
   kitinin var olma sebebini bozar. `yuzde` kadrajın KISA kenarına göre. */
function logoKutusu(W, H, konum, yuzde, gorselW, gorselH){
  const w=+W||0, h=+H||0, gw=+gorselW||0, gh=+gorselH||0;
  if(w<=0 || h<=0 || gw<=0 || gh<=0) return null;
  const kisa=Math.min(w,h);
  const hedefW=kisa*Math.max(0.03, Math.min(0.35, (+yuzde||12)/100));
  const olcek=hedefW/gw;
  const lw=hedefW, lh=gh*olcek;
  const m=kisa*MARKA_KENAR;
  const sag = w-m-lw, sol = m;
  const ust = m, alt = h-m-lh;
  const k = MARKA_KONUMLAR.indexOf(konum)>=0 ? konum : 'sagUst';
  const x = (k==='sagUst'||k==='sagAlt') ? sag : sol;
  const y = (k==='sagUst'||k==='solUst') ? ust : alt;
  return {x, y, w:lw, h:lh};
}

/* WCAG bağıl parlaklık. Marka renginin üstüne beyaz mı siyah mı yazılacağı
   TAHMİN EDİLMEZ, hesaplanır: hangi seçenek daha yüksek kontrast veriyorsa o. */
function bagilParlaklik(hex){
  const s=String(hex||'').replace('#','');
  const t = s.length===3 ? s.split('').map(c=>c+c).join('') : s;
  if(!/^[0-9a-fA-F]{6}$/.test(t)) return null;
  const n=parseInt(t,16);
  const f=v=>{ v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
  return 0.2126*f((n>>16)&255) + 0.7152*f((n>>8)&255) + 0.0722*f(n&255);
}
function kontrastOrani(a, b){
  const x=bagilParlaklik(a), y=bagilParlaklik(b);
  if(x===null || y===null) return null;
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
function okunurMetin(hex){
  const beyaz=kontrastOrani(hex,'#ffffff'), siyah=kontrastOrani(hex,'#111111');
  if(beyaz===null || siyah===null) return '#ffffff';
  return beyaz>=siyah ? '#ffffff' : '#111111';
}

/* Alt bant (lower third): ad + unvan. Sol altta, marka renginde ince bir
   şerit ve onun sağında metin. Yükseklik puntodan türetiliyor ki 4K ile
   1080p aynı görünsün. */
function altBantKutusu(W, H, punto, satir){
  const w=+W||0, h=+H||0;
  if(w<=0 || h<=0) return null;
  const p=Math.max(8, +punto||Math.round(Math.min(w,h)*0.045));
  const n=Math.max(1, Math.min(2, +satir||2));
  const ic=p*0.55;
  const yukseklik=p*(n===2 ? 2.35 : 1.6) + ic;
  const m=Math.min(w,h)*MARKA_KENAR;
  return {x:m, y:h-m-yukseklik, w:Math.min(w-m*2, p*16), h:yukseklik,
          punto:p, ic, seritW:Math.max(3, p*0.14)};
}

/* Dosya kabulü. İki ayrı sınır var ve ikisi de kullanıcıya AÇIKÇA söylenir:
   ÇOK BÜYÜK dosya (belleği patlatır) ve DESTEKLENMEYEN tür. Bu deponun
   ölçülmüş dersi: 12 MP fotoğrafta tepe 51 MB, 48 MPde 202 MB — logo için
   o kadar büyük bir dosya zaten anlamsız. */
const MARKA_LOGO_MAX = 8*1024*1024;
function markaDosyaKabul(tur, boyut){
  const t=String(tur||'');
  if(!/^image\//.test(t)) return {ok:false, sebep:'tur'};
  if((+boyut||0) > MARKA_LOGO_MAX) return {ok:false, sebep:'boyut'};
  return {ok:true, sebep:null};
}

/* Marka katmanı çizilecek mi: logo ya da alt bant varsa. Ayar açık ama
   içerik boşsa çizilecek bir şey yoktur — "açık ama hiçbir şey olmuyor"
   sınıfına düşmemek için bunu tek yerden soruyoruz. */
function markaAktif(m){
  if(!m) return false;
  return !!m.logo || (!!m.bant && !!(String(m.ad||'').trim() || String(m.unvan||'').trim()));
}
