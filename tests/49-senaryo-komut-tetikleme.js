const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const {cekirdekOku}=require('./kaynak');
const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* SENARYONUN KENDİSİ SESLİ KOMUT TETİKLİYOR
   Komut kalıbı "tetik kelimesi + komut". 🎤 açıkken bu ikiliyi OKUMAK komutu
   çalıştırıyor — komut, konuşma akışından ayırt edilmiyor.

   Ölçüldü (gerçek takeCommands ile):
     "Bu sufle kaydet demek"        → rec   → toggleRec() → ÇEKİM BİTİYOR
     "prompter stop dediğimde"      → pause
   Kendi tetik kelimesi "hazir" ayarlıyken:
     "her şey hazır dur bakalım"    → pause
     "hazır kaydet dedim"           → rec   → ÇEKİM BİTİYOR

   "kaydet" en pahalısı: çekim cümlenin ortasında bitiyor ve kullanıcı bunu
   ancak sonradan fark ediyor. Kendi tetik kelimesini ayarlayanlarda risk daha
   büyük — uygulamanın kendi örnek metni "örn: hazir" ve o sıradan bir kelime.

   Çözüm: çekimden ÖNCE söyle. Hazırlık kontrolü zaten git/gitme kararının yeri
   ve kalıbı ENGEL (bad) sayıyor, çünkü bedeli çekimin tamamı. */

/* ---------- RİSK GERÇEK Mİ: gerçek komut çözücüyle ölç ---------- */
const komutParcalari=[
  cikar(kod,/const WAKE=\{[\s\S]*?\};/,'WAKE'),
  cikar(kod,/const VCMD=\{[\s\S]*?\n\};/,'VCMD'),
  cikar(kod,/const TAIL=\{[^}]*\};/,'TAIL'),
  cikar(kod,/function takeCommands\(toks\)\{[\s\S]*?\n\}/,'takeCommands'),
].join('\n');
const trNorm=s=>s.toLowerCase().replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i')
                 .replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u').replace(/[^a-z ]/g,'');
function tetiklenen(cumle, wake=''){
  const cikti=[];
  const tc=new Function('runVoiceCmd','userWake',komutParcalari+'; return takeCommands;')(c=>cikti.push(c), wake);
  tc(trNorm(cumle).split(/\s+/).filter(Boolean));
  return cikti;
}
ok('senaryodaki "sufle kaydet" gerçekten kayıt komutu tetikliyor',
   tetiklenen('Bu sufle kaydet demek').includes('rec'));
ok('"prompter stop" da tetikliyor', tetiklenen('prompter stop dediğimde').includes('pause'));
ok('kendi tetik kelimesiyle sıradan cümle tetikliyor',
   tetiklenen('her şey hazır dur bakalım','hazir').includes('pause'));
ok('sıradan cümle boşuna tetiklemiyor', tetiklenen('normal bir cümle burada').length === 0);
ok('tetik kelimesi tek başına tetiklemiyor', tetiklenen('sufle uygulaması güzel').length === 0);

/* ---------- UYARI: kalıp bulunuyor mu ---------- */
const kk=cikar(kod,/function komutKaliplari\(\)\{[\s\S]*?\n\}/,'komutKaliplari');
function kaliplar(metin, {voiceCmd=true, wake=''}={}){
  return new Function('__m','__v','__w', `
    const st={voiceCmd:__v};
    const active=()=>__m==null?null:{text:__m};
    const duzMetin=t=>t;
    const norm=s=>String(s||'').toLowerCase()
      .replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i')
      .replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u').replace(/[^a-z ]/g,'');
    const userWake=__w;
    ${cikar(kod,/const WAKE=\{[\s\S]*?\};/,'WAKE')}
    ${cikar(kod,/const VCMD=\{[\s\S]*?\n\};/,'VCMD')}
    ${kk}
    return komutKaliplari();
  `)(metin, voiceCmd, wake);
}
ok('metindeki komut kalıbı bulunuyor',
   kaliplar('Bu sufle kaydet demek').includes('sufle kaydet'));
ok('kendi tetik kelimesiyle kurulan kalıp da bulunuyor',
   kaliplar('her şey hazır dur bakalım',{wake:'hazir'}).includes('hazir dur'));
ok('temiz metinde kalıp bulunmuyor', kaliplar('bugün hava çok güzel').length === 0);
ok('tetik kelimesi komutsuz geçerse kalıp sayılmıyor',
   kaliplar('sufle uygulaması güzel').length === 0);
ok('aynı kalıp iki kez geçse tek kez bildiriliyor',
   kaliplar('sufle kaydet ve yine sufle kaydet').length === 1);
/* Sesli komut KAPALIYSA risk yok — gereksiz engel çıkarmamalı. */
ok('sesli komut kapalıyken uyarı çıkmıyor',
   kaliplar('Bu sufle kaydet demek',{voiceCmd:false}).length === 0);
ok('senaryo yokken çökmüyor', kaliplar(null).length === 0);
/* Kalıp arama DÜZ metin üzerinden olmalı: işaretler kelimeleri bölerse
   "sufle *kaydet*" gibi bir yazım gözden kaçardı. */
ok('düz metin üzerinden aranıyor (işaretler kalıbı gizlemiyor)',
   /norm\(duzMetin\(/.test(kk));

/* ---------- HAZIRLIK KONTROLÜNDE GÖRÜNÜYOR MU ---------- */
const ready=cikar(kod,/function readyChecks\(\)\{[\s\S]*?\n\}/,'readyChecks');
ok('hazırlık kontrolü kalıpları soruyor', /const kal=komutKaliplari\(\);/.test(ready));
/* Çıkarım çökerse ADI OLAN iddialar görülsün — tek yığın izi bütün satır
   kontrollerini yutmasın. */
/* v9.34: cümle sözlüğe taşındı, satır artık `t('rcKomut')` çağırıyor.
   Tezgâh GERÇEK sözlüğü yüklüyor — sahte metin uydursaydı sözlükten silinen
   bir anahtar burada sessizce geçerdi. Yorumda ters tırnak yok: aşağıdaki
   şablon dizesinin içine giriyor. */
const SOZ=cekirdekOku('sozluk.js','SUFLE_SOZLUK').replace(/\/\*[\s\S]*?\*\//g,'');
const komutSatiri=(ready.match(/const kal=komutKaliplari\(\);[\s\S]*?rcKomutD'\),\{k:kal\[0\]\}\)\}\);/)||[])[0];
function satir(kaliplarListe){
  if(!komutSatiri) return null;
  const out=new Function('__k', `
    const out=[]; const L='tr';
    ${SOZ}
    const t=(k)=>I18N[L][k];
    const yz=(m,d)=>{ for(const x in (d||{})) m=m.split('{'+x+'}').join(d[x]); return m; };
    const komutKaliplari=()=>__k;
    ${komutSatiri}
    return out;
  `)(kaliplarListe);
  return out[0]||null;
}
{
  const r=satir(['sufle kaydet']);
  ok('kalıp varken ENGEL sayılıyor (bedeli çekimin tamamı)', r && r.lv==='bad');
  ok('hangi ifade olduğu yazıyor', /sufle kaydet/.test(r.d));
  ok('ne yapacağı söyleniyor', /Sesli komutu kapat|cümleyi değiştir/.test(r.d));
  ok('sonucun ne olduğu söyleniyor (çekimi durdurabilir)', /durdurabilir/.test(r.d));
}
ok('kalıp yokken satır hiç eklenmiyor', satir([]) === null);

/* ---------- KOMUT MOTORU BOZULMADI ---------- */
ok('komut yine metinden ayıklanıyor (suflede tekrar okunmasın)',
   /out\.push\(toks\[i\]\)/.test(cikar(kod,/function takeCommands\(toks\)\{[\s\S]*?\n\}/,'takeCommands')));
ok('art arda komutlar 900 ms ile sınırlanıyor',
   /now-lastCmdAt<900/.test(cikar(kod,/function runVoiceCmd\(c\)\{[\s\S]*?\n\}/,'runVoiceCmd')));
ok('"kaydet" komutu gerçekten kaydı açıp kapatıyor (uyarının gerekçesi)',
   /c==='rec'\) toggleRec\(\)/.test(kod));
