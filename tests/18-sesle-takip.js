const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
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
eval(cikar(jsHam,/function wordEq\([^)]*\)\{[\s\S]*?\n\}/,'wordEq'));
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
ok('3 sn kayıptan sonra geniş arama açılıyor', /kayipSure>3000/.test(mv));
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
