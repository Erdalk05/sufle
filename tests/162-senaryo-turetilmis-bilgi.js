const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,blokKes,cekirdekOku}=require('./kaynak');
const telHam=oku(telefonYolu()), macHam=oku(macYolu());
const yorumsuz=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const tel=yorumsuz(telHam), mac=yorumsuz(macHam);
const CEK=cekirdekOku('senaryo.js','SUFLE_SENARYO');

/* G.8 — SENARYO LİSTESİNDE TÜRETİLMİŞ BİLGİ.

   BIGVU'nun içerik planlayıcısı senaryolara DURUM tutuyor (çekilecek/çekildi/
   yayınlandı). Ölçüm o modülün büyük kısmının bizde zaten var olduğunu
   gösterdi: `s.up` her senaryoda tutuluyordu ama gösterilmiyordu, çekim arşivi
   de her çekime senaryonun BAŞLIĞINI yazıyor.

   Karar: yeni durum alanı TUTULMADI, bilgi TÜRETİLDİ. Tutulan durum bakım
   ister ve güncellenmezse yalan söyler; türetilen bilgi söyleyemez.

   Bu test kararın dört kabul ölçütünü kilitliyor — hepsi "yanlış bilgi
   göstermektense hiç gösterme" ilkesinin ayrı bir yüzü. */

const c=(()=>new Function(CEK+'\nreturn {cekimSayilari, senaryoBilgi};')())();

/* ---------- 1) SAYIM: BAŞLIKTAN, BAŞLIKSIZ ÇEKİM SAYILMAZ ---------- */
{
  const {cekimSayilari}=c;
  const t=cekimSayilari([{title:'Tanıtım'},{title:'Tanıtım'},{title:'Ders 1'},
                         {title:''},{title:null},{}]);
  ok('sayım tablosu üretiliyor', t instanceof Map);
  ok('aynı başlıklı çekimler toplanıyor', t.get('Tanıtım')===2);
  ok('tek çekim de sayılıyor', t.get('Ders 1')===1);
  ok('başlıksız çekim kimseye bağlanmıyor', !t.has('') && t.size===2);
  /* Başlıktaki boşluk kullanıcı için fark değil: "Ders 1 " ile "Ders 1" aynı. */
  ok('baştaki/sondaki boşluk aynı senaryo sayılıyor',
     cekimSayilari([{title:' Ders 1 '},{title:'Ders 1'}]).get('Ders 1')===2);
  /* OKUNAMADI ile SIFIR AYRI ŞEY: arşiv okunamazsa null döner ve arayüz
     hiçbir şey yazmaz. Boş dizi ise gerçekten "hiç çekim yok" demektir. */
  ok('liste verilmezse null (bilmiyorum)', cekimSayilari(null)===null);
  ok('liste bozuksa null', cekimSayilari('x')===null);
  ok('boş arşiv null DEĞİL (biliyoruz: hiç çekim yok)',
     cekimSayilari([]) instanceof Map && cekimSayilari([]).size===0);
}

/* ---------- 2) ESKİ KAYIT BOZULMUYOR (kabul ölçütü ①) ---------- */
{
  const {senaryoBilgi, cekimSayilari}=c;
  const sayilar=cekimSayilari([{title:'Tanıtım'},{title:'Tanıtım'}]);
  /* ESKİ SENARYODA `up` ALANI YOK. Orada 0 okuyup tarihe çevirmek
     "01.01.1970" yazdırırdı — bu deponun 6 numaralı hata sınıfı. */
  ok('up yoksa tarih yazılmıyor', senaryoBilgi({title:'Tanıtım'}, sayilar).ts===null);
  ok('up sıfırsa tarih yazılmıyor', senaryoBilgi({title:'x', up:0}, sayilar).ts===null);
  ok('up sayı değilse tarih yazılmıyor', senaryoBilgi({title:'x', up:'dün'}, sayilar).ts===null);
  ok('up sonsuzsa tarih yazılmıyor', senaryoBilgi({title:'x', up:Infinity}, sayilar).ts===null);
  ok('gerçek damga geçiyor', senaryoBilgi({title:'x', up:1700000000000}, sayilar).ts===1700000000000);
  ok('senaryo nesnesi yoksa çökmüyor', senaryoBilgi(null, sayilar).ts===null);
}

/* ---------- 3) BİLMEDİĞİNİ YAZMIYOR (kabul ölçütü ③ ve ④) ---------- */
{
  const {senaryoBilgi, cekimSayilari}=c;
  const sayilar=cekimSayilari([{title:'Tanıtım'},{title:'Tanıtım'},{title:'Ders 1'}]);
  ok('çekim sayısı gösteriliyor', senaryoBilgi({title:'Tanıtım'}, sayilar).cekim===2);
  /* SIFIR ÇEKİM YAZILMAZ: her satıra "0 çekim" koymak gürültü, bilgi değil. */
  ok('hiç çekilmemiş senaryoda sayı yazılmıyor',
     senaryoBilgi({title:'Yeni'}, sayilar).cekim===null);
  /* ARŞİV OKUNAMADI: burada 0 yazmak "hiç çekmedin" iddiası olurdu ve YANLIŞ
     bir iddia. Bilmediğimizi söylemiyoruz, hiç yazmıyoruz. */
  ok('arşiv okunamadıysa sayı yazılmıyor', senaryoBilgi({title:'Tanıtım'}, null).cekim===null);
  ok('başlıksız senaryoda sayı yazılmıyor', senaryoBilgi({title:''}, sayilar).cekim===null);
  ok('arşiv okunamasa bile tarih yazılabiliyor (iki bilgi bağımsız)',
     senaryoBilgi({title:'Tanıtım', up:123}, null).ts===123);
}

/* ---------- 4) İKİ KABUK AYNI KURALI ÇALIŞTIRIYOR ---------- */
for(const [ad,kod,ham] of [['telefon',tel,telHam],['masaüstü',mac,macHam]]){
  ok(ad+': çekirdek çağrılıyor', /senaryoBilgi\(s, cekimSayaci\)/.test(kod));
  ok(ad+': sayım çekirdekten', /cekimSayilari\(await (db|mdb)Liste\(\)\)/.test(kod));
  /* KABUL ÖLÇÜTÜ ②: liste her çizimde depoya gitmez — sayım önbellekte. */
  const ciz=blokKes(kod,'function renderScripts()')||'';
  ok(ad+': renderScripts çıkarılabildi', ciz.length>0);
  ok(ad+': liste çizerken depoya gidilmiyor', !/dbListe\(|mdbListe\(/.test(ciz));
  ok(ad+': null bilgi yazılmıyor (tarih)', /bg\.ts!=null/.test(kod));
  ok(ad+': null bilgi yazılmıyor (çekim)', /bg\.cekim!=null/.test(kod));
  /* Okuma başarısız olursa sayaç NULL olmalı; eski sayımı ekranda bırakmak
     kullanıcıya bayat sayı gösterirdi. */
  const taze=blokKes(kod,'async function cekimSayilariniTazele()')||'';
  ok(ad+': tazeleme çıkarılabildi', taze.length>0);
  ok(ad+': okuma hatası sayacı boşaltıyor', /catch\(e\)\{[^}]*cekimSayaci=null/.test(taze));
  ok(ad+': hata günlüğe yazılıyor', /logErr\('cekimSay'/.test(taze));
  ok(ad+': tazeleme sonunda liste yeniden çiziliyor', /renderScripts\(\)/.test(taze));
  /* Metinler çeviriden gelmeli — jargon ve tek dilli metin bu depoda kusur. */
  ok(ad+': tarih metni sözlükten', /t\('scSonDeg'\)/.test(kod));
  ok(ad+': çekim metni sözlükten', /t\('scCekim'\)/.test(kod));
  ok(ad+': tarih kullanıcının diline göre biçimleniyor',
     /toLocaleDateString\(L==='tr'\?'tr-TR':'en-US'\)/.test(kod));
}

/* ---------- 5) SAYIM NE ZAMAN TAZELENİYOR ---------- */
{
  /* Telefonda pano açılırken okunuyor: kullanıcı listeyi görmeden önce. */
  ok('telefon: senaryo panosu açılınca sayım tazeleniyor',
     /openSheet\('#scriptsSheet'\); cekimSayilariniTazele\(\);/.test(tel));
  /* Yeni çekim arşivlenince sayım BAYAT olur; telefonda sayaç düşürülüyor,
     Macte arşive alma kullanıcı eylemi olduğu için hemen tazeleniyor. */
  ok('telefon: yeni çekim sayımı bayatlatıyor', /if\(ok\) cekimSayaci=null;/.test(tel));
  ok('masaüstü: arşive alınca sayım tazeleniyor', /if\(ok\) cekimSayilariniTazele\(\);/.test(mac));
  ok('masaüstü: açılışta bir kez okunuyor',
     /updateStats\(\);\s*\n\s*cekimSayilariniTazele\(\);/.test(mac));
}

/* ---------- 6) SÖZLÜK ---------- */
{
  const sozluk=cekirdekOku('sozluk.js','SUFLE_SOZLUK');
  for(const k of ['scCekim','scSonDeg']){
    const bul=[...sozluk.matchAll(new RegExp(k+":'([^']*)'",'g'))].map(m=>m[1]);
    ok('sözlükte '+k+' iki dilde', bul.length===2);
    ok('sözlükte '+k+' çevrilmiş', bul.length===2 && bul[0]!==bul[1]);
    ok('sözlükte '+k+' yer tutucusu duruyor', bul.every(v=>/\{[nt]\}/.test(v)));
  }
}

/* ---------- 7) YENİ DURUM ALANI TUTULMUYOR (kararın kendisi) ---------- */
{
  /* Karar buysa kodda da öyle olmalı: senaryoya `durum`/`yayin` gibi bir alan
     eklendiği gün bu iddia düşer ve karar yeniden tartışılır. */
  for(const [ad,kod] of [['telefon',tel],['masaüstü',mac]]){
    ok(ad+': senaryoya durum alanı yazılmıyor', !/s\.(durum|status|yayin|published)\s*=/.test(kod));
  }
  ok('çekirdek yalnız TÜRETİYOR (yazma yok)', !/=\s*Date\.now\(\)/.test(CEK));
}
