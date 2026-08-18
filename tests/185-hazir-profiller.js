const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path'), vm=require('vm');
const REPO=path.join(__dirname,'..');
const telYolu=process.env.SUFLE_TELEFON || path.join(REPO,'index.html');
const tel=fs.readFileSync(telYolu,'utf8');

/* Yol haritası P2: hazır kurulumlar eğitim, Reels, YouTube, satış, haber ve
   beam-splitter kullanımını tek dokunuşla güvenli başlangıç değerine getirir.
   Kullanıcının sonradan ayar değiştirmesi serbesttir; profil bir kilit değil,
   yalnız Object.assign ile uygulanan başlangıç takımıdır. */
const BEKLENEN=['egitim','reels','youtube','satis','haber','beam'];
const dugmeler=[...tel.matchAll(/<button data-pf="([^"]+)"/g)].map(m=>m[1]);
ok('yol haritasındaki altı hazır profil görünür',
   BEKLENEN.every(k=>dugmeler.includes(k)) && new Set(dugmeler).size===6);

for(const [anahtar,etiket] of [
  ['pfEdu','Eğitim'],['pfReels','Reels'],['pfYT','YouTube'],
  ['pfSales','Satış'],['pfNews','Haber'],['pfBeam','Cam rig']]){
  ok(etiket+' Türkçe sözlüğe bağlı', new RegExp("data-i18n=\""+anahtar+"\"").test(tel));
  ok(etiket+' İngilizce karşılığı var', new RegExp(anahtar+":'[^']+'").test(tel));
}

const govde=(tel.match(/const PROF=\{([\s\S]*?)\n\};\n\$\$\('#profSeg button'/)||[])[1];
ok('profil veri takımı ayrıştırılabildi', !!govde);
let PROF={};
if(govde) PROF=vm.runInNewContext('({'+govde+'})');
ok('altı profil veri takımında da var', BEKLENEN.every(k=>PROF[k]));

const MODLAR=new Set(['free','reels','story','post','shorts','video']);
ok('her profil gerçek bir çekim moduna bağlı',
   BEKLENEN.every(k=>MODLAR.has(PROF[k].mode)));
ok('YouTube var olmayan yt moduna düşmüyor', PROF.youtube && PROF.youtube.mode==='video');
ok('dikey profiller 9:16 kullanıyor',
   PROF.reels.asp==='9:16' && PROF.satis.asp==='9:16');
ok('yatay profiller 16:9 kullanıyor',
   PROF.egitim.asp==='16:9' && PROF.youtube.asp==='16:9' && PROF.haber.asp==='16:9');
ok('bütün hızlar doğal konuşma aralığında',
   BEKLENEN.every(k=>PROF[k].wpm>=120 && PROF[k].wpm<=160));
ok('bütün profiller göz hattı kararını açıkça taşır',
   BEKLENEN.every(k=>typeof PROF[k].eyeLine==='boolean'));
ok('bütün profiller önceki ayna ayarını açıkça sıfırlar ya da kurar',
   BEKLENEN.every(k=>typeof PROF[k].mirrorText==='boolean'));
ok('yalnız beam-splitter yazıyı aynalar',
   PROF.beam.mirrorText===true && BEKLENEN.filter(k=>k!=='beam').every(k=>PROF[k].mirrorText===false));
ok('beam-splitter serbest oranda çalışır',
   PROF.beam.mode==='free' && PROF.beam.asp==='none');
ok('profil mekanizması ayarları kilitlemeden topluca uygular',
   /Object\.assign\(st,p\)/.test(tel) && !/st\.profileLock/.test(tel));
ok('profil sonrası görünüm, kayıt ve istatistikler birlikte tazelenir',
   /applyMode\(st\.mode,false\); apply\(\); save\(\); buildContent\(\); updateStats\(\); renderScripts\(\)/.test(tel));
