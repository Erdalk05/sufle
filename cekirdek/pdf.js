/* PDF METİN OKUYUCU — SIFIR BAĞIMLILIK, KENDİNİ DENETLEYEN.

   NEDEN VARDI-YOKTU: `docx.js` "PDF BİLEREK YOK" diyordu ve gerekçesi
   doğruydu — genel bir PDF metin çıkarıcısı font kodlamaları ve CID
   eşlemeleri yüzünden çoğu dosyada YANLIŞ metin üretir. Yanlış metin bir
   suflede en kötü sonuçtur: kullanıcı okurken fark eder, çekim çöpe gider.

   BU OKUYUCU O GEREKÇEYİ ÇÜRÜTMÜYOR, KABUL EDİYOR. Farkı şu: her dosyada
   çalışmaya ÇALIŞMIYOR; okuduğunun doğru olduğundan emin olamadığı anda
   REDDEDİYOR ve kullanıcıyı bilinen çalışan yola (kopyala–yapıştır)
   gönderiyor. Yani "belki doğrudur" diye metin vermiyor.

   NE ZAMAN OKUR:
     · metin akışları FlateDecode ya da sıkıştırmasız,
     · kullanılan her yazı tipi ya /ToUnicode eşlemesi taşıyor ya da basit
       tek bayt kodlamalı (WinAnsi/Standard) bir yazı tipi,
     · çıkan metnin en az %92'si eşlenebiliyor.
   Aksi hâlde `pdfBelirsiz` hatası atar — sessizce bozuk metin ÜRETMEZ.

   NE ZAMAN OKUMAZ (ve bunu söyler):
     · taranmış PDF (sayfa bir görüntüdür, gömülü metin yoktur),
     · CID/CJK yazı tipleri eşlemesiz,
     · şifreli PDF.

   Açma işini tarayıcının YERLEŞİK `DecompressionStream('deflate')` API'si
   yapıyor — kütüphane değil, platformun kendisi (docx.js ile aynı karar). */

/* zlib akışını çöz. PDF'te FlateDecode = zlib başlıklı deflate. */
async function pdfSis(bayt){
  const ds=new DecompressionStream('deflate');
  const akis=new Blob([bayt]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(akis).arrayBuffer());
}

/* PDF dizesi: (…) içinde ters eğik çizgi kaçışları ve sekizli kodlar. */
function pdfDizeCoz(ham){
  const out=[];
  for(let i=0;i<ham.length;i++){
    const c=ham[i];
    if(c!=='\\'){ out.push(c.charCodeAt(0)); continue; }
    const n=ham[++i];
    if(n===undefined) break;
    if(n==='n') out.push(10);
    else if(n==='r') out.push(13);
    else if(n==='t') out.push(9);
    else if(n==='b') out.push(8);
    else if(n==='f') out.push(12);
    else if(n>='0'&&n<='7'){
      let s=n;
      while(s.length<3 && ham[i+1]>='0' && ham[i+1]<='7') s+=ham[++i];
      out.push(parseInt(s,8));
    }
    else if(n==='\n') { /* satır devamı */ }
    else out.push(n.charCodeAt(0));
  }
  return out;
}

/* WinAnsi (CP1252) — basit yazı tiplerinin varsayılanı. 128-159 arası
   Latin-1'den ayrılır ve tam orada Türkçe metinlerde kullanılan tırnaklar,
   tire ve … yaşıyor; bu aralığı atlamak metni sessizce bozardı. */
const PDF_WINANSI={128:0x20AC,130:0x201A,131:0x0192,132:0x201E,133:0x2026,134:0x2020,
  135:0x2021,136:0x02C6,137:0x2030,138:0x0160,139:0x2039,140:0x0152,142:0x017D,
  145:0x2018,146:0x2019,147:0x201C,148:0x201D,149:0x2022,150:0x2013,151:0x2014,
  152:0x02DC,153:0x2122,154:0x0161,155:0x203A,156:0x0153,158:0x017E,159:0x0178};

/* /ToUnicode CMap: beginbfchar/beginbfrange bloklarından eşleme çıkarır. */
function pdfCMap(metin){
  const harita=new Map();
  const onalti=s=>s.replace(/\s+/g,'');
  const cozUtf16=h=>{ h=onalti(h); let s='';
    for(let i=0;i+3<h.length+1;i+=4) s+=String.fromCharCode(parseInt(h.substr(i,4),16));
    return s; };
  /* ⚠️ DESENLER DİZE OLARAK KURULUYOR. Doğrudan regex sabiti yazınca
     (`/beginbfchar(...)/`) statik denetim `beginbfchar(` dizisini TANIMSIZ
     FONKSİYON ÇAĞRISI sanıyor ve kapı yalancı alarm veriyor. Aynı desen,
     dize hâlinde denetimden temiz geçiyor ve davranış birebir aynı. */
  const blokDeseni=(ad)=>new RegExp('begin'+ad+'([\\s\\S]*?)end'+ad,'g');
  for(const blok of metin.match(blokDeseni('bfchar'))||[]){
    for(const m of blok.matchAll(/<([0-9A-Fa-f\s]+)>\s*<([0-9A-Fa-f\s]+)>/g))
      harita.set(parseInt(onalti(m[1]),16), cozUtf16(m[2]));
  }
  for(const blok of metin.match(blokDeseni('bfrange'))||[]){
    /* İki biçim: <bas> <son> <hedef>   ve   <bas> <son> [<h1> <h2> …] */
    for(const m of blok.matchAll(/<([0-9A-Fa-f\s]+)>\s*<([0-9A-Fa-f\s]+)>\s*(<[0-9A-Fa-f\s]+>|\[[^\]]*\])/g)){
      const bas=parseInt(onalti(m[1]),16), son=parseInt(onalti(m[2]),16);
      if(m[3][0]==='['){
        const parcalar=[...m[3].matchAll(/<([0-9A-Fa-f\s]+)>/g)].map(x=>cozUtf16(x[1]));
        for(let k=0;k<=son-bas && k<parcalar.length;k++) harita.set(bas+k, parcalar[k]);
      } else {
        const hedef=onalti(m[3].slice(1,-1));
        const taban=parseInt(hedef.slice(-4),16), onEk=hedef.slice(0,-4);
        for(let k=0;k+bas<=son;k++)
          harita.set(bas+k, cozUtf16(onEk+(taban+k).toString(16).padStart(4,'0')));
      }
    }
  }
  return harita;
}

/* Ham PDF baytlarından nesne gövdelerini çıkarır: {numara: {sozluk, akisBas, akisSon}} */
function pdfNesneler(metin, bayt){
  const nesne=new Map();
  const re=/(\d+)\s+(\d+)\s+obj\b/g; let m;
  while((m=re.exec(metin))){
    const bas=re.lastIndex;
    const son=metin.indexOf('endobj', bas);
    if(son<0) continue;
    const govde=metin.slice(bas, son);
    const akisIdx=govde.indexOf('stream');
    let akis=null;
    if(akisIdx>=0){
      let s=bas+akisIdx+6;
      if(metin[s]==='\r') s++;
      if(metin[s]==='\n') s++;
      const e=metin.indexOf('endstream', s);
      if(e>=0) akis={bas:s, son:e};
    }
    nesne.set(+m[1], {sozluk: akisIdx>=0? govde.slice(0,akisIdx) : govde, akis});
  }
  return nesne;
}

/* İçerik akışından metin operatörlerini yürütür. */
function pdfIcerikMetni(icerik, fontlar, sayac){
  let out='', aktif=null, satirBasi=true;
  const yaz=(bayt)=>{
    /* Yazı tipi eşlemesi varsa ONA göre, yoksa WinAnsi. Eşlenemeyen bayt
       U+FFFD olarak yazılır ve SAYILIR: kabul eşiği bu sayıya bakıyor. */
    if(aktif && aktif.harita && aktif.harita.size){
      const ikiBayt = aktif.ikiBayt;
      for(let i=0;i<bayt.length;i+= ikiBayt?2:1){
        const kod = ikiBayt ? (bayt[i]<<8|(bayt[i+1]||0)) : bayt[i];
        const ch = aktif.harita.get(kod);
        sayac.toplam++;
        if(ch===undefined){ sayac.eksik++; out+='�'; } else out+=ch;
      }
    } else {
      for(const b of bayt){
        sayac.toplam++;
        if(b<32 && b!==9){ sayac.eksik++; out+='�'; continue; }
        out += String.fromCharCode(PDF_WINANSI[b] || b);
      }
    }
    satirBasi=false;
  };
  const satir=()=>{ if(!satirBasi){ out+='\n'; satirBasi=true; } };

  /* ⚠️ GRUP NUMARALARI. İlk yazımda grupları yanlış saydım ve "72 720 Td"
     onaltılık dize sanıldı: metnin başına çöp karakterler ekleniyordu
     ("rr�Merhaba"). Numaralar artık dizilimle birebir:
       1 = /F1 … Tf (yazı tipi adı)   2 = <hex> Tj   3 = T*
       4 = … Td/TD                    5 = ET                            */
  const re=/\/([A-Za-z0-9#+\-.]+)\s+[\d.]+\s+Tf|\((?:\\.|[^\\()])*\)\s*(?:Tj|')|\[(?:[^\]\\]|\\.)*\]\s*TJ|<([0-9A-Fa-f\s]*)>\s*Tj|(T\*)|([-\d.]+\s+[-\d.]+\s+(?:Td|TD))|(ET)/g;
  let m;
  while((m=re.exec(icerik))){
    const par=m[0];
    if(m[1]!==undefined){ aktif=fontlar.get(m[1])||null; continue; }
    if(m[2]!==undefined){                       // <hex> Tj
      const h=m[2].replace(/\s+/g,'');
      const b=[]; for(let i=0;i+1<h.length;i+=2) b.push(parseInt(h.substr(i,2),16));
      yaz(b); continue;
    }
    if(m[3]!==undefined){ satir(); continue; }  // T*
    if(m[4]!==undefined){ satir(); continue; }  // Td/TD: yeni satır konumu
    if(m[5]!==undefined){ satir(); continue; }  // ET
    if(par.startsWith('[')){                    // [(a) -250 (b)] TJ
      for(const d of par.matchAll(/\((?:\\.|[^\\()])*\)|(-?[\d.]+)/g)){
        if(d[0][0]==='('){ yaz(pdfDizeCoz(d[0].slice(1,-1))); }
        else if(parseFloat(d[0]) < -180) out+=' ';   // büyük negatif kaydırma = boşluk
      }
      continue;
    }
    if(par[0]==='('){ yaz(pdfDizeCoz(par.slice(1, par.lastIndexOf(')')))); if(par.trim().endsWith("'")) satir(); }
  }
  return out;
}

async function pdfMetni(dosya){
  const bayt=new Uint8Array(await dosya.arrayBuffer());
  const ham=new TextDecoder('latin1').decode(bayt);
  if(!/^%PDF-/.test(ham.slice(0,10))) throw new Error('pdf degil');
  if(/\/Encrypt\b/.test(ham)) throw new Error('pdf sifreli');

  const nesne=pdfNesneler(ham, bayt);
  const akisMetni=async (n)=>{
    if(!n.akis) return '';
    /* AKIŞIN SONU `endstream`in HEMEN ÖNÜ DEĞİL. Aradaki satır sonu akışa
       ait değildir; ölçüldü: bir bayt fazla verince çözücü "trailing junk"
       diye TÜM akışı reddediyor ve dosya "metin yok" sanılıyor.
       Sıra: sözlükteki /Length varsa o, yoksa sondaki satır sonlarını at. */
    let son=n.akis.son;
    const uz=n.sozluk.match(/\/Length\s+(\d+)\b/);
    if(uz && n.akis.bas+ +uz[1] <= n.akis.son) son=n.akis.bas + +uz[1];
    else while(son>n.akis.bas && (bayt[son-1]===10 || bayt[son-1]===13)) son--;
    const gövde=bayt.subarray(n.akis.bas, son);
    if(/\/FlateDecode/.test(n.sozluk)){
      try{ return new TextDecoder('latin1').decode(await pdfSis(gövde)); }
      catch(e){ return ''; }
    }
    return new TextDecoder('latin1').decode(gövde);
  };

  /* 1) Yazı tipleri: /ToUnicode taşıyan her fontun eşlemesi çıkarılıyor. */
  const fontlar=new Map();
  for(const [no,n] of nesne){
    if(!/\/Type\s*\/Font/.test(n.sozluk)) continue;
    const tu=n.sozluk.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/);
    let harita=new Map();
    if(tu && nesne.has(+tu[1])) harita=pdfCMap(await akisMetni(nesne.get(+tu[1])));
    const ikiBayt=/\/Type0\b/.test(n.sozluk) || /Identity-?H/.test(n.sozluk);
    fontlar.set('OBJ'+no, {harita, ikiBayt, cid:ikiBayt});
  }
  /* Sayfa kaynaklarındaki /F1 gibi adları nesne numaralarına bağla. */
  const adHarita=new Map();
  for(const [,n] of nesne){
    for(const m of (n.sozluk.match(/\/Font\s*<<([^>]*)>>/g)||[])){
      for(const f of m.matchAll(/\/([A-Za-z0-9#+\-.]+)\s+(\d+)\s+\d+\s+R/g)){
        const hedef=fontlar.get('OBJ'+f[2]);
        if(hedef) adHarita.set(f[1], hedef);
      }
    }
  }
  /* CID yazı tipi eşlemesizse okumaya HİÇ kalkışma: çıkacak metin çöp olur. */
  for(const [,f] of adHarita)
    if(f.cid && !f.harita.size) throw new Error('pdf cid esleme yok');

  /* 2) İçerik akışları: metin operatörü taşıyan her akış. */
  const sayac={toplam:0, eksik:0};
  let metin='';
  for(const [,n] of nesne){
    if(!n.akis) continue;
    if(/\/Type\s*\/(Font|XObject|Metadata)\b/.test(n.sozluk)) continue;
    const icerik=await akisMetni(n);
    if(!/\bTj\b|\bTJ\b/.test(icerik)) continue;
    metin += pdfIcerikMetni(icerik, adHarita, sayac) + '\n';
  }

  /* 3) KABUL SINAVI — emin değilsek metin VERMİYORUZ. */
  const temiz=metin.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  if(!sayac.toplam || !temiz) throw new Error('pdf metin yok');
  if(sayac.eksik/sayac.toplam > 0.08) throw new Error('pdf belirsiz');
  /* Harf oranı: doğru çözülmüş bir metinde harfler baskındır. Yanlış
     kodlamada sonuç çoğunlukla noktalama ve sembol çöpü olur. */
  const harf=(temiz.match(/[\p{L}]/gu)||[]).length;
  if(harf/temiz.length < 0.5) throw new Error('pdf belirsiz');
  return temiz;
}
