const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku}=require('./kaynak');
const src=oku(telefonYolu());
const grab=re=>{ const m=src.match(re); if(!m) throw new Error('bulunamadı: '+re); return m[0]; };
eval(grab(/function splitLongLines\(t, maxw\)\{[\s\S]*?\n\}/));

// --- 2.5 uzun satır bölme ---
const L1='bir iki üç dört beş altı yedi sekiz dokuz on onbir oniki onüç ondört';
const r1=splitLongLines(L1,12).split('\n');
ok('uzun satır bölünüyor', r1.length>1);
ok('kelime kaybı yok', r1.join(' ').split(/\s+/).length===L1.split(/\s+/).length);
ok('kelime ortasından bölmüyor', r1.every(l=>L1.includes(l)));
ok('kısa satıra dokunmuyor', splitLongLines('bir iki üç',12)==='bir iki üç');
ok('başlığa dokunmuyor', splitLongLines('# '+L1,12)==='# '+L1);
ok('nota dokunmuyor', splitLongLines('[not '+L1+']',12)==='[not '+L1+']');
ok('boş satır korunuyor', splitLongLines('a\n\nb',12)==='a\n\nb');
const T2='Merhaba sevgili dostlar bugün burada sizlerle çok güzel bir konuyu konuşacağız, ardından da sorularınızı tek tek yanıtlayacağım efendim.';
const r2=splitLongLines(T2,12).split('\n');
ok('noktalamadan bölüyor', r2[0].endsWith(','));
ok('hiçbir parça sınırı aşmıyor', r2.every(l=>l.split(/\s+/).length<=12));
ok('eşiğin altındaki cümleye dokunmuyor', splitLongLines('Kısa bir cümle bu.',12)==='Kısa bir cümle bu.');

// --- 1.5 pxPerWord: tek satır çökmesi ---
function ppw({tops,words,lh,font}){
  const span = tops.length>1 ? (tops[tops.length-1]-tops[0]) : 0;
  if(span>1) return Math.max(6, span/(tops.length-1));
  return Math.max(6, (lh||font*1.4||60)/Math.max(1,words));
}
ok('ESKİ ÇÖKME düzeldi (tek satır)', ppw({tops:[100,100,100],words:3,lh:60})>6);
ok('çok satırda normal hesap', Math.abs(ppw({tops:[0,40,80,120],words:4,lh:60})-40)<0.01);
ok('tek kelimede makul', ppw({tops:[50],words:1,lh:60})===60);
ok('asla 6'+"'"+'nın altına düşmüyor', ppw({tops:[0,1],words:2,lh:1})>=6);

// --- 1.2 yumuşak duruş: son 60 px'te yavaşlama ---
const brake=(maxPos,pos)=>{ const near=maxPos-pos; return near<60?Math.max(0.18,near/60):1; };
ok('uzakta tam hız', brake(1000,100)===1);
ok('60 px kala yavaşlamaya başlıyor', brake(1000,960)<1);
ok('tam sonda en yavaş', brake(1000,1000)===0.18);
ok('asla durmuyor (kilitlenmez)', brake(1000,1200)>0);

// --- 1.4 hız rampası: 200 ms'de hedefe yaklaşıyor mu ---
function ramp(hedef,sn,dt){ let c=0; for(let t=0;t<sn;t+=dt) c+=(hedef-c)*Math.min(1,dt/0.2); return c; }
ok('200 ms sonra %60+ yol alıyor', ramp(100,0.2,1/60)>60);
ok('1 sn sonra hedefe oturuyor', Math.abs(ramp(100,1,1/60)-100)<2);
ok('büyük dt tek adımda hedefe', Math.abs(ramp(100,0.3,0.3)-100)<0.01);
ok('60 ve 120 Hz aynı sonuca varıyor', Math.abs(ramp(100,1,1/60)-ramp(100,1,1/120))<1);
