/* KLİP ÖNERİSİ — "Auto-Shorts" karşılığı, YAPAY ZEKÂ YOK (G.6).

   BIGVU uzun videodan kısa klipleri buluttaki modelle çıkarıyor. Bizde o
   veriye zaten sahibiz ve TAHMİN GEREKMİYOR: `cekimAltyazi` her kelimenin
   okuma çizgisinden geçtiği anı taşıyor, senaryo bölüm başlıklarını ve
   vurgu işaretlerini zaten söylüyor. Yani kesim noktaları ÖLÇÜLÜ, sonuç da
   açıklanabilir.

   ÜÇ DÜRÜSTLÜK SINIRI — hepsi test tarafından tutuluyor:
   ① BAŞLIK UYDURULMAZ. Klibin adı senaryodan birebir alınır (bölüm başlığı
      ya da klibin ilk cümlesi). "İzleyiciyi yakalayan giriş" gibi bir cümle
      üretmek, ölçmediğimiz bir şeyi biliyormuş gibi konuşmak olurdu.
   ② HER KLİP SEBEBİNİ TAŞIR: hangi ölçüme dayanarak önerildiği yazılıdır.
   ③ KESİM KELİMENİN ORTASINA DÜŞMEZ. Sınırlar cümle sonlarına oturur;
      oturmuyorsa klip önerilmez — yarım cümleyle biten bir klip, izleyiciye
      "bir şey eksik" hissi verir ve paylaşılmaz. */

const KLIP_EN_AZ = 15;      // saniye — bundan kısa klip sosyal videoda tutmaz
const KLIP_EN_COK = 60;     // saniye — Shorts/Reels üst sınırı
const KLIP_SAYI = 3;

/* Cümle sonu: nokta/ünlem/soru + kapanış tırnak/parantez. Kısaltmalar
   (vb. Dr. T.C.) burada BİLEREK ele alınmıyor — altyazı bölmesinde ayrı bir
   kısaltma listesi var ve klip sınırı için fazladan bir cümle sonu kaçırmak
   zararsız, YANLIŞ yerde kesmek zararlıdır. */
function klipCumleSonu(kelime){
  return /[.!?…]["')\]]?$/.test(String(kelime||''));
}

/* Vurgu işareti: senaryodaki (2) beklemesi ya da *vurgu* yıldızları.
   Kelime metni suflede işaretler ayıklanmış hâlde gelebildiği için ham
   senaryo satırı da sorulabiliyor. */
function klipVurguMu(kelime){
  const s=String(kelime||'');
  return /^\(\d+(?:[.,]\d+)?s?\)$/.test(s) || /\*/.test(s);
}

/* Klip önerileri.
   `kelimeler`: [{s, ln, t}] — s metin, ln satır no, t saniye (null olabilir)
   `ayar`: {basliklar:{satirNo:'Bölüm adı'}, enAz, enCok, sayi, sure}

   Yöntem (tamamen açıklanabilir, rastgelelik yok):
     1. Zamanı olan kelimeler alınır; zaman damgası olmayan çekimde klip
        önerilmez (sufle akmamış demektir).
     2. Aday başlangıçlar: bölüm başlığının ilk kelimesi + çekimin başı.
     3. Her adaydan ileri gidilerek EN AZ süreyi geçen ilk CÜMLE SONU aranır;
        üst sınırı aşarsa aday düşer.
     4. Adaylar çakışmayacak şekilde puanına göre seçilir. */
function klipOnerileri(kelimeler, ayar){
  const a=ayar||{};
  const enAz=+a.enAz||KLIP_EN_AZ, enCok=+a.enCok||KLIP_EN_COK, sayi=+a.sayi||KLIP_SAYI;
  const basliklar=a.basliklar||{};
  const k=(kelimeler||[]).filter(w=>w && typeof w.t==='number' && isFinite(w.t));
  if(k.length<2) return [];

  const adaylar=[];
  const bolumBasi={};                     // satır no → o satırın ilk kelime indeksi
  for(let i=0;i<k.length;i++){
    const ln=k[i].ln;
    if(bolumBasi[ln]===undefined) bolumBasi[ln]=i;
  }
  const baslangiclar=new Set([0]);
  for(const satir of Object.keys(basliklar)){
    const i=bolumBasi[satir];
    if(i!==undefined) baslangiclar.add(i);
  }
  /* Cümle sonlarının HEMEN ARDI da aday: bölüm işareti olmayan senaryoda
     tek aday (çekimin başı) kalırdı ve özellik boş dönerdi. */
  for(let i=0;i<k.length-1;i++) if(klipCumleSonu(k[i].s)) baslangiclar.add(i+1);

  for(const bas of baslangiclar){
    const t0=k[bas].t;
    let bit=-1;
    for(let j=bas+1;j<k.length;j++){
      const sure=k[j].t-t0;
      if(sure>enCok) break;
      if(sure>=enAz && klipCumleSonu(k[j].s)){ bit=j; break; }
    }
    if(bit<0) continue;
    const sure=k[bit].t-t0;
    let vurgu=0;
    for(let j=bas;j<=bit;j++) if(klipVurguMu(k[j].s)) vurgu++;
    const bolumAdi=basliklar[k[bas].ln];
    /* SEBEP ÖLÇÜME DAYANIR — sıralama da bu: bölüm başı en güçlü sinyal
       (yazar orada yeni bir konuya geçtiğini kendi söylemiş), sonra vurgu
       yoğunluğu, sonra çekimin açılışı. */
    const sebep = bolumAdi ? 'bolum' : (vurgu>0 ? 'vurgu' : (bas===0 ? 'acilis' : 'cumle'));
    const puan = (bolumAdi?100:0) + vurgu*10 + (bas===0?5:0) + Math.min(10, sure/10);
    /* BAŞLIK UYDURULMAZ: bölüm adı varsa o, yoksa klibin ilk kelimeleri. */
    const ilkler=[]; for(let j=bas;j<=bit && ilkler.length<7;j++) ilkler.push(k[j].s);
    adaylar.push({
      bas:t0, bit:k[bit].t, sure,
      ilkKelime:bas, sonKelime:bit,
      sebep, vurgu, baslik: bolumAdi || ilkler.join(' '),
      baslikKaynak: bolumAdi ? 'bolum' : 'metin', puan
    });
  }
  adaylar.sort((x,y)=>y.puan-x.puan);
  const secilen=[];
  for(const c of adaylar){
    if(secilen.length>=sayi) break;
    /* ÇAKIŞMA YOK: aynı anı iki klipte önermek, kullanıcıya iki kez aynı
       videoyu kestirmek demektir. */
    if(secilen.some(s=>c.bas < s.bit && c.bit > s.bas)) continue;
    secilen.push(c);
  }
  return secilen.sort((x,y)=>x.bas-y.bas);
}
