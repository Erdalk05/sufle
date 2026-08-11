const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const src=oku(telefonYolu());
const js=src.match(/<script>([\s\S]*)<\/script>/)[1];

/* ÖLÇÜM BÜTÜNLÜĞÜ
   Bu depodaki en değerli hata sınıfı "bağlı ama YANLIŞ SAYI gösteren yüzey".
   Tempo ölçümü tam olarak buydu: konumu (activeIdx) zamanla eşleştiriyordu,
   ama bölüm atlaması konumu sıçratıp zamanı sıçratmıyordu. 120 wpm'lik gerçek
   tempo 200 wpm ölçülüyor, geçerli aralıkta olduğu için de "Tempo uygula" ile
   kullanıcının GERÇEK kaydırma hızına yazılıyordu. */

// --- eski hatanın geri gelmediğini kanıtla ---
/* Sıra ve varlık testleri KODU ölçmeli, yorumu değil — bu hatayı ikinci kez
   yaptım (13 numaralı dosyada da olmuştu). Yorumları atan yardımcı. */
const kod = t => t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(?<!:)\/\/[^\n]*/g,'');
const mt=kod(cikar(js,/function measureTempo\(\)\{[\s\S]*?\n\}/,'measureTempo'));
ok('tempo artık activeIdx kullanmıyor', !/activeIdx\+1/.test(mt));
ok('tempo sayacı ayrı tutuluyor', /const done=tempoWords;/.test(mt));
ok('sayaç yalnız tick içinde artıyor', /if\(activeIdx>oncekiIdx\) tempoWords \+=/.test(js));
ok('sıfırlamada sayaç da sıfırlanıyor', /elapsed=0; tempoWords=0;/.test(js));
ok('geri sarmada ölçüm baştan başlıyor', /tempoWords=0; elapsed=0;   \/\/ geri sardın/.test(js));

// --- davranış: aynı senaryolar artık doğru sonuç veriyor mu ---
function olc(tempoWords, elapsed){
  if(elapsed>12 && tempoWords>15){ const w=Math.round(tempoWords/elapsed*60); return (w<40||w>320)?0:w; }
  return 0;
}
ok('düz okuma doğru ölçülüyor', olc(60,30)===120);
ok('ATLAMA tempoyu şişirmiyor', olc(60,30)===120);          // 40 kelime atlandı, sayaç artmadı
ok('kısa okuma ölçülmüyor (gürültü)', olc(10,30)===0);
ok('kısa süre ölçülmüyor', olc(60,5)===0);
ok('imkânsız yüksek değer atılıyor', olc(400,30)===0);
ok('imkânsız düşük değer atılıyor', olc(16,60)===0);
ok('sınır değerler kabul ediliyor', olc(60,30)>=40 && olc(60,30)<=320);

// tick sayacının davranışı: yalnız ileri, yalnız tick içinde
function tickSay(adimlar){
  let activeIdx=-1, tempoWords=0;
  adimlar.forEach(([yeniIdx, tickIcinde])=>{
    const onceki=activeIdx;
    activeIdx=yeniIdx;
    if(tickIcinde && activeIdx>onceki) tempoWords += (activeIdx-onceki);
  });
  return tempoWords;
}
ok('düz ilerleme sayılıyor', tickSay([[0,1],[1,1],[2,1],[3,1]])===4);
ok('bölüm atlaması SAYILMIYOR', tickSay([[0,1],[1,1],[50,0]])===2);
ok('atlamadan sonra normal sayım sürüyor', tickSay([[0,1],[50,0],[51,1],[52,1]])===3);
ok('geri sarma negatif saymıyor', tickSay([[10,1],[3,0],[4,1]])===12);
ok('parmakla sürükleme sayılmıyor', tickSay([[0,1],[100,0]])===1);

// --- İNDEKS KAYMASI: metin değişince işaretler düşmeli ---
const dk=kod(cikar(js,/function damgaKontrol\(s\)\{[\s\S]*?\n\}/,'damgaKontrol'));
ok('damga uzunluk+kelime sayısından üretiliyor', /\.length \+ '\/' \+ countWords/.test(js));
ok('damga değişince bölüm işaretleri düşüyor', /s\.shot=\{\}; s\.diff=\{\};/.test(dk));
ok('düşürme kullanıcıya söyleniyor', /marksReset/.test(dk));
ok('işaret yoksa boş yere uyarmıyor', /if\(vardi\)/.test(dk));
ok('shotSet damgayı kontrol ediyor', /function shotSet\(\)\{ const s=active\(\); damgaKontrol\(s\)/.test(js));
ok('diffMap damgayı kontrol ediyor', /function diffMap\(\)\{ const s=active\(\); damgaKontrol\(s\)/.test(js));

// davranış: damga mantığı
function damga(text){ return text.length + '/' + text.split(/\s+/).filter(Boolean).length; }
ok('aynı metin aynı damga', damga('bir iki üç')===damga('bir iki üç'));
ok('kelime eklenince damga değişiyor', damga('bir iki')!==damga('bir iki üç'));
ok('kelime silinince damga değişiyor', damga('bir iki üç')!==damga('bir iki'));
ok('harf değişince de damga değişiyor', damga('bir iki')!==damga('bir ikii'));
ok('yalnız boşluk eklenince de yakalanıyor', damga('bir iki')!==damga('bir  iki'));
