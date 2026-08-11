const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku}=require('./kaynak');
const src=oku(macYolu());
const grab=re=>{ const m=src.match(re); if(!m) throw new Error('bulunamadı'); return m[0]; };
eval(grab(/function fmtClock\(s\)\{[\s\S]*?padStart\(2,'0'\); \}/));
eval(grab(/function readyChecks\(\)\{[\s\S]*?\n  \}/));

let stream,state,ERRLOG=[],EDIT='';
const $=()=>({value:EDIT});
const countWords=t=>t.split(/\s+/).filter(Boolean).length;
let GA=0; const gazeAngle=()=>GA;
const run=()=>readyChecks();
const lv=r=>r.map(x=>x[0]).join(',');

state={speed:140};
stream=null; EDIT=''; GA=0;
ok('kamera+metin yoksa iki engel', run().filter(x=>x[0]==='bad').length===2);

stream={getVideoTracks:()=>[{getSettings:()=>({width:1920,height:1080})}],getAudioTracks:()=>[]};
EDIT='bir iki üç dört beş'; GA=0;
let r=run();
ok('mikrofon yoksa engel', r.some(x=>x[0]==='bad'&&x[1].includes('Mikrofon')));
ok('çözünürlük gösteriliyor', r.some(x=>x[2]==='1920×1080'));

stream.getAudioTracks=()=>[{}];
GA=3;  ok('iyi açıda hiç engel yok', run().every(x=>x[0]==='ok'));
GA=7;  ok('sınır açıda uyarı', run().some(x=>x[0]==='warn'&&x[1].includes('Bakış')));
GA=12; ok('kötü açıda engel', run().some(x=>x[0]==='bad'&&x[1].includes('Bakış')));

GA=0; ERRLOG=[{},{}];
ok('hata varsa uyarıyor', run().some(x=>x[0]==='warn'&&x[1].includes('hata')));
ERRLOG=[];
ok('süre hesabı doğru', run().some(x=>x[2]&&x[2].includes('5 kelime')));
state={speed:140}; EDIT='kelime '.repeat(140).trim();
ok('140 kelime 140wpm = ~01:00', run().some(x=>x[2]&&x[2].includes('01:00')));
ok('saat biçimi', fmtClock(0)==='00:00' && fmtClock(65)==='01:05' && fmtClock(3599)==='59:59');
ok('negatif süre çökertmiyor', fmtClock(-5)==='00:00');
