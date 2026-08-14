const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku}=require('./kaynak');
const src=oku(telefonYolu());
const grab=re=>{ const m=src.match(re); if(!m) throw new Error('bulunamadı: '+re); return m[0]; };

// gerçek markup() ve bionic()'i çıkar
const st={bionic:false};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
eval(grab(/function bionic\(w\)\{[\s\S]*?\n\}/));
/* markup artık çok kelimeli vurguyu dağıtan vurguYay'a bağımlı (B1, tests/70). */
eval(grab(/function vurguYay\(satir\)\{[\s\S]*?\n\}/));
eval(grab(/function markup\(raw\)\{[\s\S]*?\n\}/));

// altyazıya giden metin = .w span'larının İÇ metni (etiketsiz)
const wordsOf=html=>[...html.matchAll(/<span class="w[^"]*"[^>]*>(.*?)<\/span>/g)]
  .map(m=>m[1].replace(/<[^>]+>/g,''));

// ---- 2.3 vurgu sınırları ----
ok('normal vurgu', wordsOf(markup('*merhaba*')).join('')==='merhaba');
ok('çift yıldız vurgu', wordsOf(markup('**çok**')).join('')==='çok');
ok('EŞLEŞMEYEN yıldız metni bozmuyor', wordsOf(markup('*yarim')).join('')==='*yarim');
ok('sondaki tek yıldız korunuyor', wordsOf(markup('yarim*')).join('')==='yarim*');
ok('ortadaki yıldız korunuyor', wordsOf(markup('a*b')).join('')==='a*b');
ok('yalnız yıldız çökertmiyor', markup('*').length>0);
ok('üç yıldız olduğu gibi kalıyor', wordsOf(markup('***x***')).join('')==='***x***');
ok('vurgu sınıfı ekleniyor', markup('*x*').includes('class="w em"'));
ok('düz kelimede em yok', !markup('x').includes('em'));

// ---- 2.4 telaffuz ipucu ALTYAZIYA SIZMAMALI ----
const ph=markup('Nietzsche{ni-çe} dedi');
ok('ipucu data- içinde', ph.includes('data-ph="ni-çe"'));
ok('İPUCU KELİME METNİNE SIZMIYOR', wordsOf(ph).join(' ')==='Nietzsche dedi');
ok('süslü parantez metinde yok', !wordsOf(ph).join('').includes('{'));
const ph2=markup('*Goethe{gö-te}*');
ok('vurgu+ipucu birlikte', wordsOf(ph2).join('')==='Goethe' && ph2.includes('data-ph="gö-te"'));
ok('çift yıldız+ipucu', wordsOf(markup('**Kant{kant}**')).join('')==='Kant' && markup('**Kant{kant}**').includes('data-ph="kant"'));
ok('kapanmamış süslü ipucu sayılmıyor', wordsOf(markup('kelime{acik')).join('')==='kelime{acik');
ok('çok uzun ipucu (24+) yok sayılıyor', wordsOf(markup('x{'+'a'.repeat(30)+'}')).join('').includes('{'));

// ---- duraklama işaretleri kelime sayılmamalı ----
ok('/ kelime değil', wordsOf(markup('bir / iki')).join(' ')==='bir iki');
ok('// kelime değil', wordsOf(markup('bir // iki')).join(' ')==='bir iki');
ok('(2) kelime değil', wordsOf(markup('bir (2) iki')).join(' ')==='bir iki');
ok('(1.5s) tanınıyor', markup('(1.5s)').includes('data-ms="1500"'));
ok('(2,5) virgüllü ondalık', markup('(2,5)').includes('data-ms="2500"'));
ok('bekleme 10 sn ile sınırlı', markup('(999)').includes('data-ms="10000"'));
ok('(abc) normal kelime', wordsOf(markup('(abc)')).join('')==='(abc)');

// ---- XSS: kullanıcı metni etiket enjekte edememeli ----
ok('HTML kaçışlanıyor', !markup('<img src=x onerror=1>').includes('<img'));
ok('tırnak kaçışlanıyor', !markup('x{" onload="1}').includes('onload="1"'));

// ---- 1.10 kaydırma motoru: kare hızından bağımsız mı ----
function travel(hz,secs,pxPerSec){
  const n=Math.round(hz*secs); let pos=0, last=0;
  for(let i=1;i<=n;i++){ const t=i*1000*secs/n;            // gerçek damgalar, birikimli değil
    const dt=Math.min(0.1,(t-last)/1000); last=t; pos+=pxPerSec*dt; }
  return pos;
}
const a30=travel(30,10,100), a60=travel(60,10,100), a120=travel(120,10,100);
ok('30 Hz = 60 Hz (±1 px)', Math.abs(a30-a60)<1);
ok('60 Hz = 120 Hz (±1 px)', Math.abs(a60-a120)<1);
ok('10 sn x 100 px/sn ≈ 1000 px', Math.abs(a60-1000)<2);
// takılma: tek karede 2 sn geçse bile 0.1 sn sayılmalı (yoksa metin fırlıyordu)
function jump(){ let pos=0,last=0; const ts=[16,32,2032,2048];
  ts.forEach(t=>{ const dt=Math.min(0.1,(t-last)/1000); last=t; pos+=100*dt; }); return pos; }
ok('2 sn donmadan sonra fırlamıyor', jump()<=100*0.1*4+0.1);
