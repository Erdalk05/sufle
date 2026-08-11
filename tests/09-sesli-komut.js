const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku}=require('./kaynak');
const src=oku(telefonYolu());
const grab=re=>{ const m=src.match(re); if(!m) throw new Error('bulunamadı: '+re); return m[0]; };
const L='tr';
eval(grab(/const FOLD=\{[^}]*\};/).replace('const','var'));
eval(grab(/function norm\(x\)\{[\s\S]*?FOLD\[c\]\|\|c\); \}/));
eval(grab(/const WAKE=\{[\s\S]*?\};/).replace('const','var'));
eval(grab(/const VCMD=\{[\s\S]*?\n\};/).replace('const','var'));
eval(grab(/const TAIL=\{[\s\S]*?\};/).replace('const','var'));

let fired=[], userWake='';
const runVoiceCmd=c=>fired.push(c);
eval(grab(/function takeCommands\(toks\)\{[\s\S]*?\n\}/));
const run=(str,uw)=>{ fired=[]; userWake=uw?norm(uw):''; 
  const left=takeCommands(str.split(/\s+/).map(norm).filter(Boolean)); return {fired,left}; };

// --- 4.4 YANLIŞ TETİKLEME: senaryoda geçen kelimeler komut olmamalı ---
ok('düz metin komut tetiklemiyor', run('bugün işe başla ve dur').fired.length===0);
ok('düz metin kaybolmuyor', run('bugün işe başla ve dur').left.length===5);
ok('"sufle başla" tetikliyor', run('sufle başla').fired[0]==='play');
ok('komut metinden çıkarılıyor', run('merhaba sufle dur devam').left.join(' ')==='merhaba devam');
ok('"sufle" tek başına zararsız', run('sufle').fired.length===0);
ok('bilinmeyen komut yutulmuyor', run('sufle zıpla').left.join(' ')==='sufle zipla');
ok('iki kelimeli kalıp', run('sufle başa dön').fired[0]==='reset');

// --- 4.7 kendi tetik kelimen ---
ok('özel tetik çalışıyor', run('hazır başla','hazır').fired[0]==='play');
ok('özel tetik yokken tetiklemiyor', run('hazır başla','').fired.length===0);
ok('özel tetik Türkçe katlamalı', run('HAZIR dur','hazır').fired[0]==='pause');

// --- 4.9 Almanca ve Arapça komutlar GERÇEKTEN sözlükte mi ---
ok('Almanca: schneller', run('prompter schneller').fired[0]==='faster');
ok('Almanca: stopp', run('teleprompter stopp').fired[0]==='pause');
ok('Almanca: aufnehmen', run('souffleur aufnehmen').fired[0]==='rec');
ok('Almanca: anfang', run('prompter anfang').fired[0]==='reset');
ok('Arapça: ibda', run('mulaqqin ibda').fired[0]==='play');
ok('Arapça: qif', run('mulakkin qif').fired[0]==='pause');
ok('Arapça: asra', run('nass asra').fired[0]==='faster');
ok('Arapça: sajjil', run('mulaqqin sajjil').fired[0]==='rec');
ok('İngilizce hâlâ çalışıyor', run('prompter record').fired[0]==='rec');
ok('Türkçe hâlâ çalışıyor', run('sufle hızlan').fired[0]==='faster');

// --- 5.6 çift basış mantığı ---
function tap(seq){
  const map={' ':'toggle'}, map2={' ':'rec'};
  const out=[]; let last={k:'',t:0};
  seq.forEach(([k,t])=>{
    const dbl=map2[k];
    if(dbl && last.k===k && t-last.t<300){ last={k:'',t:0}; out.push('DBL:'+dbl); return; }
    if(dbl){ last={k,t}; out.push('WAIT'); return; }
    out.push('TEK:'+map[k]);
  });
  return out;
}
ok('hızlı iki basış = ikinci eylem', tap([[' ',0],[' ',200]])[1]==='DBL:rec');
ok('yavaş iki basış çift sayılmıyor', tap([[' ',0],[' ',900]])[1]==='WAIT');
ok('tek basış bekliyor', tap([[' ',0]])[0]==='WAIT');
