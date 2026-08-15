const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku, macMetni}=require('./kaynak');
const src=macMetni();
const grab=re=>{ const m=src.match(re); if(!m) throw new Error('bulunamadı'); return m[0]; };
eval(grab(/  function liveCue\(\)\{[\s\S]*?\n  \}/));
eval(grab(/  function wrapLines\(measure,txt,maxW\)\{[\s\S]*?\n  \}/));

// --- liveCue: cümle başından okunan kelimeye kadar, en fazla 7 kelime geri ---
let words=[], activeIdx=-1;
const set=(arr,i)=>{ words=arr.map(t=>({textContent:t})); activeIdx=i; };
set(['Merhaba','dünya.','Bugün','hava','çok','güzel'],5);
ok('cümle başından başlıyor', liveCue()==='Bugün hava çok güzel');
set(['Merhaba','dünya.','Bugün'],2);
ok('nokta sınırı doğru', liveCue()==='Bugün');
set(['a','b','c','d','e','f','g','h','i','j'],9);
ok('en fazla 8 kelime gösteriyor', liveCue().split(' ').length<=8);
set([],-1); ok('boş metinde çökmüyor', liveCue()==='');
set(['tek'],0); ok('tek kelime', liveCue()==='tek');
set(['Bitti!','Yeni'],1); ok('ünlem de cümle sonu', liveCue()==='Yeni');
set(['Soru?','Yeni'],1); ok('soru işareti de', liveCue()==='Yeni');
set(['Alıntı."','Yeni'],1); ok('tırnaklı nokta da', liveCue()==='Yeni');
activeIdx=-1; ok('okuma başlamadıysa boş', liveCue()==='');

// --- Mac wrapLines telefonla aynı davranmalı ---
const M=s=>s.length*10;
ok('Mac sarma = telefon sarma', JSON.stringify(wrapLines(M,'bir iki uc dort',80))==='["bir iki","uc dort"]');
const u=wrapLines(M,'elektroansefalografi',100);
ok('Mac uzun kelime bölünüyor', u.length>1 && u.every(l=>M(l)<=100) && u.join('')==='elektroansefalografi');
ok('Mac boş metin', JSON.stringify(wrapLines(M,'',100))==='[""]');

// --- ön-koşul kapısı: serbest oranda kırpma yok ---
function gate(k,val,fmt,crop){
  const st={fmt,crop}; const cropOn=()=>st.crop!==false && st.fmt!=='free';
  if((k==='burnCaps'||k==='chroma') && val && !cropOn()){
    if(st.fmt==='free') st.fmt='9:16';
    st.crop=true;
  }
  return st;
}
ok('serbest oran 9:16 yapılıyor', gate('burnCaps',true,'free',true).fmt==='9:16');
ok('kırpma açılıyor', gate('burnCaps',true,'9:16',false).crop===true);
ok('zaten uygunsa dokunmuyor', JSON.stringify(gate('burnCaps',true,'9:16',true))==='{"fmt":"9:16","crop":true}');
ok('kapatırken dokunmuyor', gate('burnCaps',false,'free',false).fmt==='free');
ok('ilgisiz anahtara dokunmuyor', gate('safe',true,'free',false).fmt==='free');

// ---------- MAC DÜŞMANCA TARAMA BULGULARI (v6.8) ----------
const macSrc=macMetni();
// Kayıt sürerken gömme kapatılırsa akış donmuş kareye düşüyordu.
ok('kayıt boyunca boru hattı kilitleniyor', /if\(\(burnOn\(\)\|\|capLocked\)&&cropCv\)/.test(macSrc));
ok('kilit kayıt kaynağı seçilirken kuruluyor', /capLocked=\(srcCv===capOut\)/.test(macSrc));
ok('kilit kırpma bitince çözülüyor', /capOut=null, capLocked=false|capOut=null; capLocked=false/.test(macSrc));
ok('kilit değişkeni tanımlı', /let capOut=null, capLocked=false;/.test(macSrc));
// Ses kısıtları artık açıkça isteniyor (tarayıcı varsayılanına bırakılmıyordu).
ok('gürültü bastırma açıkça isteniyor', /noiseSuppression:true/.test(macSrc));
ok('yankı engelleme açıkça isteniyor', /echoCancellation:true/.test(macSrc));
ok('otomatik kazanç açıkça isteniyor', /autoGainControl:true/.test(macSrc));
// YANLIŞ POZİTİF olarak doğrulandı: editör her tuşta senkronlanıyor,
// beforeunload'ın ayrıca syncEditorToState çağırmasına gerek yok.
ok('editör her tuşta durumla senkron', /\$\('#editor'\)\.addEventListener\('input',\(\)=>\{ syncEditorToState\(\)/.test(macSrc));

// ---------- MAC ESKİ KOD TARAMASI (v7.2) ----------
// Dördü de telefonda düzeltilmiş ama Mac'e TAŞINMAMIŞ hatalardı.
// Örüntü: bir platformdaki düzeltme diğerine kendiliğinden geçmiyor.
const m2=macMetni();
ok('MediaRecorder.onerror bağlı', /recorder\.onerror=ev=>/.test(m2));
ok('kayıt ölümü kullanıcıya söyleniyor', /Kayıt yarıda kesildi/.test(m2));
ok('Blob üretilince chunks bırakılıyor', /lastBlob=new Blob\(chunks[\s\S]{0,90}?\n\s*chunks=\[\];/.test(m2));
ok('senaryo silme iki aşamalı onay istiyor', /if\(silBekle!==id\)\{/.test(m2));
ok('onay 4 sn sonra düşüyor', /setTimeout\(\(\)=>\{ silBekle=null; renderScripts\(\); \},4000\)/.test(m2));
ok('silinen senaryo çöp kutusuna gidiyor', /state\.cop=\(state\.cop\|\|\[\]\)\.concat/.test(m2));
ok('çöp kutusu 5 ile sınırlı', /\.slice\(-5\)/.test(m2));
ok('geri getirme fonksiyonu TANIMLI', /function copGeriAl\(\)\{/.test(m2));
ok('geri getirme düğmesi bağlı', /\$\('#undoDelBtn'\)\.onclick=copGeriAl/.test(m2));
ok('onay beklerken düğme farklı görünüyor', /silBekle===s\.id\?'⚠︎':'×'/.test(m2));
ok('kayıt sürerken senaryo değiştirilemiyor',
   /if\(recorder && recorder\.state==='recording'\)\{ toast\('Kayıt sürerken senaryo değiştirilemez/.test(m2));

// Denetimin kör noktası: parantezsiz olay işleyicisi ataması.
// copGeriAl atanmıştı ama tanımlı değildi; ne denetim ne node --check gördü.
const den=require('fs').readFileSync(require('path').join(__dirname,'..','denetim.py'),'utf8');
ok('denetim artık işleyici atamasını da kontrol ediyor', /olay işleyicisi tanımsız/.test(den));
ok('addEventListener biçimi de kapsanıyor', /addEventListener\\\(\[\^,\]\+/.test(den) || den.includes('addEventListener'));
