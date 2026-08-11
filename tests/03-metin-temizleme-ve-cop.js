const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };

// ---- index.html'den ÇIKARILAN gerçek fonksiyonlar ----
const {telefonYolu,macYolu,oku}=require('./kaynak');
const src=oku(telefonYolu());
const grab=re=>{ const m=src.match(re); if(!m) throw new Error('bulunamadı: '+re); return m[0]; };
eval(grab(/function stripInvisible\(x\)\{[\s\S]*?\n\}/));
eval(grab(/function firstLineTitle\(txt\)\{[\s\S]*?\n\}/));
eval(grab(/function resNote\(\)\{[\s\S]*?\n\}/).replace('const v=(vTrack&&vTrack.getSettings)?vTrack.getSettings():{};','const v=VT;'));

// --- görünmez karakter temizliği ---
ok('sıfır genişlik siliniyor', stripInvisible('mer​haba')==='merhaba');
ok('BOM siliniyor', stripInvisible('﻿baş')==='baş');
ok('NBSP normal boşluğa dönüyor', stripInvisible('a b')==='a b');
ok('akıllı tırnak düzleşiyor', stripInvisible('“bu” ‘o’')==='"bu" \'o\'');
ok('CRLF tek satır sonu', stripInvisible('a\r\nb\rc')==='a\nb\nc');
ok('TÜRKÇE HARFLERE DOKUNMUYOR', stripInvisible('İĞÜŞÖÇığüşöç')==='İĞÜŞÖÇığüşöç');
ok('normal metni bozmuyor', stripInvisible('Merhaba, *dünya*! # başlık (2)')==='Merhaba, *dünya*! # başlık (2)');
ok('emoji korunuyor', stripInvisible('bak 🎬 çekim')==='bak 🎬 çekim');

// --- başlık üretimi ---
ok('ilk satırdan başlık', firstLineTitle('Merhaba dünya\nikinci')==='Merhaba dünya');
ok('# işareti atılıyor', firstLineTitle('## Giriş bölümü\nmetin')==='Giriş bölümü');
ok('boş satırlar atlanıyor', firstLineTitle('\n\n  \nAsıl başlık')==='Asıl başlık');
ok('tek harf başlık sayılmıyor', firstLineTitle('a\nGerçek başlık')==='Gerçek başlık');
ok('boş metinde boş dönüyor', firstLineTitle('')==='' && firstLineTitle('   ')==='');
ok('40 karakterle sınırlı', firstLineTitle('x'.repeat(90)).length===40);

// --- çözünürlük düşüşü notu ---
let VT;
const L='tr';
VT={width:3840,height:2160}; const st={quality:'4k'};
global.st=st; global.L=L;
const note=(q,w,h)=>{ st.quality=q; VT={width:w,height:h}; return resNote(); };
ok('4K istenip 4K alındıysa not yok', note('4k',3840,2160)==='');
ok('4K istenip 1080 alındıysa uyarıyor', note('4k',1920,1080).includes('cihaz'));
ok('1080 istenip 1080 alındıysa not yok', note('1080',1920,1080)==='');
ok('720 istenip 720 alındıysa not yok', note('720',1280,720)==='');
ok('ölçüm yoksa sessiz', note('4k',0,0)==='');

// --- silme geri alma: çöp kutusu 5 ile sınırlı, sıra doğru mu ---
let S={trash:[]};
const del=name=>{ S.trash=(S.trash||[]).concat([{title:name}]).slice(-5); };
['a','b','c','d','e','f','g'].forEach(del);
ok('çöp kutusu 5 ile sınırlı', S.trash.length===5);
ok('en eskiler düşmüş', S.trash[0].title==='c' && S.trash[4].title==='g');
const restored=S.trash.pop();
ok('geri getirme en son sileni veriyor', restored.title==='g' && S.trash.length===4);
