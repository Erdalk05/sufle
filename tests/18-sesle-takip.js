const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
const src=oku(telefonYolu());
const jsHam=src.match(/<script>([\s\S]*)<\/script>/)[1];
const kod = t => t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(?<!:)\/\/[^\n]*/g,'');
const js=kod(jsHam);
const L='tr';

/* SESLE TAKİP — Erdal "tam olarak çalışmıyor" dedi.
   Eşleştirme algoritmasını üç gerçekçi tanıma deseniyle sınadım: sağlamdı.
   Asıl kusur KURTARMADAYDI: arama penceresi vptr'ye bağlıydı, kullanıcı
   pencerenin dışına çıkınca (paragraf atlama, doğaçlama, başa dönme)
   BİR DAHA ASLA bulunamıyordu. Sufle orada kalıyordu. */

eval(cikar(jsHam,/const FOLD=\{[^}]*\};/,'FOLD').replace('const','var'));
eval(cikar(jsHam,/function norm\(x\)\{[\s\S]*?FOLD\[c\]\|\|c\); \}/,'norm'));
// wordEq artık Türkçe yardımcılarına dayanıyor (v8.4) — onları da çıkar
eval(cikar(jsHam,/function yumusat\(x\)\{[^\n]*\}/,'yumusat'));
eval(cikar(jsHam,/function ortakOnek\(a,b\)\{[\s\S]*?\n\}/,'ortakOnek'));
eval(cikar(jsHam,/function birHata\(a,b\)\{[\s\S]*?\n\}/,'birHata'));
eval(cikar(jsHam,/function wordEq\(nw,tok\)\{[\s\S]*?\n\}/,'wordEq'));
eval(cikar(js,/const WIN_BACK=\d+, WIN_FWD=\d+, MAX_JUMP=\d+;?/,'sabitler').replace('const','var'));

const metin=('bir iki üç dört beş altı yedi sekiz dokuz on onbir oniki onüç ondört onbeş '+
 'onaltı onyedi onsekiz ondokuz yirmi yirmibir yirmiiki yirmiüç yirmidört yirmibeş '+
 'yirmialtı yirmiyedi yirmisekiz yirmidokuz otuz otuzbir otuziki otuzüç otuzdört otuzbeş '+
 'otuzaltı otuzyedi otuzsekiz otuzdokuz kırk kırkbir kırkiki kırküç kırkdört kırkbeş '+
 'kırkaltı kırkyedi kırksekiz kırkdokuz elli').split(/\s+/);
const normWords=metin.map((w,i)=>({i,n:norm(w)})).filter(x=>x.n);
function ara(vptr,recent,genis){
  const lo=genis?0:Math.max(0,vptr-WIN_BACK), hi=genis?normWords.length:Math.min(normWords.length,vptr+WIN_FWD);
  let bestK=-1,best=0;
  for(let k=lo;k<hi;k++){ let sc=0;
    for(let j=0;j<recent.length;j++){ const wi=k-(recent.length-1-j);
      if(wi<0||wi>=normWords.length) continue;
      if(wordEq(normWords[wi].n,recent[j])) sc+=(j===recent.length-1?1.6:1); }
    if(sc>best){best=sc;bestK=k;} }
  return {bestK,best};
}
const uc = (...w) => w.map(norm);

// ---- KURTARMA ----
ok('paragraf atlayan kullanıcı dar pencerede KAYIP', ara(5,uc('kırkbeş','kırkaltı','kırkyedi'),false).best<2.6);
ok('geniş aramada BULUNUYOR', ara(5,uc('kırkbeş','kırkaltı','kırkyedi'),true).best>=2.6);
ok('geniş arama DOĞRU yeri buluyor',
   normWords[ara(5,uc('kırkbeş','kırkaltı','kırkyedi'),true).bestK].n===norm('kırkyedi'));
ok('başa dönen kullanıcı dar pencerede kayıp', ara(40,uc('bir','iki','üç'),false).best<2.6);
ok('başa dönen geniş aramada bulunuyor', ara(40,uc('bir','iki','üç'),true).best>=2.6);
ok('normal okumada dar pencere zaten yetiyor', ara(5,uc('altı','yedi','sekiz'),false).best>=2.6);

// ---- KODDA GERÇEKTEN VAR MI ----
const mv=kod(cikar(jsHam,/function matchVoice\(spoken\)\{[\s\S]*?\n\}/,'matchVoice'));
// v8.6: 3 sn takılı kalmak fazla uzundu (Erdal: 'okumama rağmen ilerlemiyor')
ok('kısa süre sonra geniş arama açılıyor', /kayipSure>1200/.test(mv));
ok('eşik 2 sn altında (takılma hissi olmasın)',
   parseInt((mv.match(/kayipSure>(\d+)/)||[])[1],10) <= 2000);
ok('geniş aramada pencere tüm metin', /genis \? 0 : Math\.max\(0,vptr-WIN_BACK\)/.test(mv));
ok('geniş aramada sıçrama sınırı uygulanmıyor', /bestK-vptr>MAX_JUMP && !genis/.test(mv));
ok('sıçrama yutma KALICI değil (3 denemede kabul)', /if\(\+\+jumpSwallow<3\) return;/.test(mv));
ok('başarılı eşleşmede sayaç sıfırlanıyor', /else jumpSwallow=0;/.test(mv));

// ---- CANLI ŞERİT ----
ok('takip şeridi var', /id="vHud"/.test(src));
ok('şerit ne duyduğunu gösteriyor', /vHudDuydu/.test(src));
ok('şerit eşleşti/bulamadım ayrımı yapıyor',
   /durum==='ok' \? \(L==='tr'\?'✓ takip'/.test(src) && /durum==='kayip' \? \(L==='tr'\?'✕ bulamadım'/.test(src));
ok('şerit metindeki yeri yüzdeyle gösteriyor', /Math\.round\(yer\/toplam\*100\)/.test(js));
ok('geniş arama şeritte işaretleniyor', /genis\?' ⟳':''/.test(js));
ok('takip kapanınca şerit gizleniyor', /\$\('#vHud'\) && \$\('#vHud'\)\.classList\.add\('hidden'\)/.test(js));
ok('ölü sayaç bırakılmadı', !/genisArama/.test(js));

// ---- SIÇRAMA YUTMA DAVRANIŞI ----
function yutma(mesafeler){
  let vptr=0, sw=0, kabul=0;
  mesafeler.forEach(d=>{ if(d>MAX_JUMP){ if(++sw<3) return; sw=0; } else sw=0;
    vptr+=d; kabul++; });
  return {vptr,kabul};
}
ok('normal ilerlemede yutma yok', yutma([3,4,2,5]).kabul===4);
ok('sürekli büyük sıçramada kilitlenmiyor', yutma([20,20,20,20,20,20]).kabul>=2);
ok('tek büyük sıçrama yutuluyor', yutma([20]).kabul===0);

// ---------- OKUMA ÇİZGİSİ HİZASI (v8.3, gerçek tarayıcıda ölçüldü) ----------
// Vurgulanan kelime şeridin ORTASINA değil ÜST KENARINA düşüyordu: bir satırdaki
// tüm kelimeler aynı merkezi paylaştığı için "merkezi çizginin üstünde kalan son
// kelime" seçimi hep bir satır yukarısını işaretliyordu. Ölçüm: çizgi 206 px,
// vurgu 139 px — tam bir satır sapma.
eval(cikar(jsHam,/function yakinIdx\(y\)\{[\s\S]*?\n\}/,'yakinIdx'));
let wordTops=[];
const kur = t => { wordTops=t; };

kur([50,50,50, 120,120,120, 190,190,190, 260,260,260]);   // 4 satır, satır aralığı 70
ok('çizgi satır merkezindeyse o satır', wordTops[yakinIdx(120)]===120);
ok('çizgi satırın hemen altındaysa AYNI satır', wordTops[yakinIdx(130)]===120);
ok('çizgi bir sonrakine daha yakınsa SONRAKİ satır', wordTops[yakinIdx(160)]===190);
ok('tam ortada kalırsa aşağıyı seçmiyor (kararlı)', wordTops[yakinIdx(155)]===120);
ok('ilk satırdan önce ilk satırı seçiyor', wordTops[yakinIdx(10)]===50);
ok('son satırdan sonra son satırda kalıyor', wordIdxSon());
function wordIdxSon(){ return wordTops[yakinIdx(9999)]===260; }
ok('boş metinde -1 dönüyor', (kur([]), yakinIdx(100)===-1));

// ESKİ davranışın gerçekten sapma ürettiğini göster
function eskiIdx(y){
  let lo=0,hi=wordTops.length-1,idx=-1;
  while(lo<=hi){const mid=(lo+hi)>>1; if(wordTops[mid]<=y){idx=mid;lo=mid+1;}else hi=mid-1;}
  return idx;
}
kur([50,50,50, 120,120,120, 190,190,190, 260,260,260]);
const cizgi=185;
ok('ESKİ seçim bir satır yukarıda kalıyordu', wordTops[eskiIdx(cizgi)]===120);
ok('YENİ seçim çizgiye oturuyor', wordTops[yakinIdx(cizgi)]===190);
ok('yeni sapma eskisinden küçük',
   Math.abs(wordTops[yakinIdx(cizgi)]-cizgi) < Math.abs(wordTops[eskiIdx(cizgi)]-cizgi));

// ---------- TEK KELİME AMA BENZERSİZ (v8.7) ----------
// Erdal: "kelimenin okunuşuna göre bazen takip bazen bulamadım diyor".
// Eşik 2.6 İKİ kelimenin birden tutmasını şart koşuyordu; önceki kelime
// tanınmadığında tek kelime tutuyor ve reddediliyordu.
// Ölçüm (önceki kelime tanınmamış senaryosu): kabul %66 → %93, ek yanlış 0.
ok('benzersizlik kuralı kodda', /best>=1\.6 && best<2\.6 && ikinci<best\*0\.6/.test(mv));
ok('ikinci en iyi skor izleniyor', /else if\(score>ikinci\) ikinci=score;/.test(mv));
ok('ikinci skor doğru güncelleniyor', /if\(score>best\)\{ ikinci=best; best=score; bestK=k; \}/.test(mv));
// davranış: benzersizlik gerçekten ayırt ediyor mu
function kabul(best, ikinci){
  if(best>=2.6) return 'eski-kural';
  if(best>=1.6 && ikinci<best*0.6) return 'benzersiz';
  return 'red';
}
ok('iki kelime tutarsa zaten kabul', kabul(2.6,0)==='eski-kural');
ok('tek kelime + rakipsiz → kabul', kabul(1.6,0)==='benzersiz');
ok('tek kelime + rakipsiz (zayıf rakip) → kabul', kabul(1.6,0.9)==='benzersiz');
ok('tek kelime + GÜÇLÜ rakip → RED (belirsiz)', kabul(1.6,1.0)==='red');
ok('tek kelime + eşit rakip → RED', kabul(1.6,1.6)==='red');
ok('zayıf eşleşme yine reddediliyor', kabul(1.0,0)==='red');
ok('hiç eşleşme yoksa red', kabul(0,0)==='red');

// ---------- GÖRÜNÜR PENCERE GENİŞLETİLDİ ----------
ok('telefon penceresi ~6 satır', /root\.style\.setProperty\('--bandOut',\(half\+26\)/.test(src));
ok('eski dar pencere kalmadı (telefon)', !/\(half\+7\)\.toFixed/.test(src));
const macSrc2=oku(macYolu());
ok('Mac penceresi de genişletildi', /setProperty\('--bandOut',\(half\+26\)/.test(macSrc2));
ok('eski dar pencere kalmadı (Mac)', !/\(half\+8\)\.toFixed/.test(macSrc2));
ok('iki platform aynı genişlikte',
   /\(half\+26\)/.test(src) && /\(half\+26\)/.test(macSrc2));
