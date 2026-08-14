const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');

/* G10 — KOMPOZİT + YAYIN PAKETİ BİRLİKTE: VİDEO TÜRÜ DOĞRU MU:
   TÜR DOĞRU (hipotez çürüdü) — ama aynı birleşimde BAŞKA bir çelişki çıktı.

   TÜR ZİNCİRİ ÖLÇÜLDÜ ve tutarlı: çekim türü `rec.mimeType`ten alınıyor,
   kodek eki ayıklanıyor, dört ayrı yer (sonuç ekranı, Fotoğraflara kaydet,
   Dosyalara indir, yayın paketi) aynı kuralı kullanıyor. Kompozit açıkken
   kayıt tuvalden besleniyor ama tür yine kaydedicinin kendi bildirdiği tür
   olduğu için ayrışma yok. Bu tur onu kilitliyor.

   ASIL BULGU — ÇİFT ALTYAZI: altyazı videoya GÖMÜLÜ çekildiğinde
   (kompozit + altyazı gömme) pakette hem yakılmış altyazılı video hem
   ayrı `altyazi.srt` bulunuyordu ve hiçbir yerde yazmıyordu. İkisini
   birden platforma yükleyen kişi ekranda İKİ KAT altyazı görüyor ve
   sebebini anlayamıyor.

   Dosya atılmadı (yeniden kurguda ve arşivde işe yarıyor); yayın notu
   artık durumu söylüyor. Gömülü olup olmadığı ÇEKİM ANINDA damgalanıyor
   (C1 dersi: anahtar çekimden sonra değişebilir, videonun içindekiler
   değişmez). */

/* ---------- TÜR ZİNCİRİ ---------- */
const mPick=kod.match(/function pickMime\(\)\{[\s\S]*?\n\}/);
ok('pickMime çıkarılabildi', !!mPick);
if(!mPick) return;
{
  /* Gerçek pickMimei koştur: hangi türler destekleniyorsa ne seçiyor. */
  function sec(destek){
    return new Function('__d', `
      const IS_WK=__d.wk;
      const window={ MediaRecorder:{ isTypeSupported:t=>__d.destek.indexOf(t)>=0 } };
      const MediaRecorder=window.MediaRecorder;
      ${mPick[0]}
      return pickMime();
    `)({destek, wk:!!destek.wk});
  }
  const hepsi=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4',
               'video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  ok('her şey destekleniyorsa MP4 seçiliyor', /^video\/mp4/.test(sec(hepsi)));
  ok('yalnız webm varsa webm seçiliyor', /^video\/webm/.test(sec(['video/webm;codecs=vp9,opus','video/webm'])));
  ok('hiçbiri desteklenmiyorsa boş dönüyor (tarayıcı kendi seçsin)', sec([])==='');
  const wk=['video/mp4','video/webm']; wk.wk=true;
  ok('iPhonede MP4 seçiliyor', sec(wk)==='video/mp4');
}

/* Uzantı kararı: TEK kural, dört yerde aynı. */
{
  const kararlar=(kod.match(/\.type[^\n]{0,20}indexOf\('mp4'\)>=0/g)||[]);
  ok('uzantı kararı en az dört yerde var ('+kararlar.length+')', kararlar.length>=4);
  ok('paket doğru uzantıyı yazıyor',
     /const dosyalar=\[\{ ad:taban\+\(mp4\?'\.mp4':'\.webm'\), veri:lastBlob \}\];/.test(kod));
  ok('Fotoğraflara kaydet aynı kuralı kullanıyor',
     /const isMp4=lastBlob\.type\.indexOf\('mp4'\)>=0;\s*const ext=isMp4\?'mp4':'webm';/.test(kod));
  ok('sonuç ekranı türü okunur biçimde gösteriyor',
     /const fmt=\(blob\.type\.indexOf\('mp4'\)>=0\)\?'MP4':/.test(kod));
}
{
  /* Türün kaynağı kaydedicinin KENDİ bildirdiği tür olmalı — kompozit
     açıkken de aynı yerden geliyor, o yüzden ayrışma yok. */
  ok('çekim türü kaydediciden alınıyor',
     /lastBlob=new Blob\(chunks,\{type:\(rec\.mimeType\|\|'video\/mp4'\)\.split\(';'\)\[0\]\}\);/.test(kod));
  /* Kodek eki ayıklanmalı: yoksa uzantı yine doğru çıkar ama tür dizesi
     dosya adına ve paylaşıma kirli gider. */
  const tur=t=>(t||'video/mp4').split(';')[0];
  ok('kodek eki ayıklanıyor', tur('video/mp4;codecs=avc1.42E01E,mp4a.40.2')==='video/mp4');
  ok('webm kodeği de ayıklanıyor', tur('video/webm;codecs=vp9,opus')==='video/webm');
  ok('tür boşsa MP4a düşülüyor (iOS Videoyu Kaydet seçeneği için)', tur('')==='video/mp4');
  /* Uzantı eşlemesi her türde doğru olmalı. */
  const ext=t=>t.indexOf('mp4')>=0?'mp4':'webm';
  for(const [t,e] of [['video/mp4','mp4'],['video/webm','webm'],['','webm']])
    ok('uzantı eşlemesi: "'+t+'" -> .'+e, ext(t)===e);
}
{
  /* Kompozit kayıt kaynağı: gömme açıkken çıktı tuvali, değilse GL tuvali. */
  ok('kompozit açıkken kayıt tuvalden besleniyor',
     /if\(st\.comp && comp\.on\)\{\s*const cs=compRecStream\(\);/.test(kod));
  ok('kompozit kurulamazsa sessizce ham akışa dönülüyor ve söyleniyor',
     /if\(cs\)\{ src=cs; usedComp=true; \} else toast\(m\('compFallback'\)\);/.test(kod));
  ok('altyazı gömülüyse çıktı tuvalinden kaydediliyor',
     /const src=st\.burnCaps\?\$\('#compOut'\):comp\.cv;/.test(kod));
}

/* ---------- ASIL BULGU: ÇİFT ALTYAZI ---------- */
ok('gömülü altyazı durumu ÇEKİM ANINDA damgalanıyor', /burn:usedComp && !!st\.burnCaps,/.test(kod));
ok('damga yalnız kompozit gerçekten kullanıldıysa doğru olabiliyor',
   /burn:usedComp &&/.test(kod));
ok('paket altyazı dosyasını hâlâ veriyor (yeniden kurgu için)',
   /dosyalar\.push\(\{ad:'altyazi\.srt', veri:enc\.encode\(srtText\(\)\)\}\)/.test(kod));

const mNot=kod.match(/function yayinNotu\(\)\{[\s\S]*?\n\}/);
ok('yayinNotu çıkarılabildi', !!mNot);
if(!mNot) return;
ok('yayın notu gömülü altyazı durumunu okuyor', /lastPath && lastPath\.burn \?/.test(mNot[0]));
ok('uyarı iki dilde',
   /ALTYAZI VİDEOYA GÖMÜLÜ ÇEKİLDİ/.test(tel) && /CAPTIONS ARE BURNED INTO THE VIDEO/.test(tel));
ok('uyarı ne YAPMAMASI gerektiğini söylüyor', /PLATFORMA AYRICA YÜKLEME/.test(tel));
ok('dosyanın neden durduğu da yazıyor', /yeniden kurgu ve arşiv için duruyor/.test(tel));

{
  /* Gerçek yayinNotunu koştur: uyarı yalnız gerektiğinde çıkmalı. */
  function not(lp){
    return new Function('__lp', `
      const lastPath=__lp; const L='tr'; const lastDur=42;
      const cekimSenaryo={text:'# Baslik\\nBir cumle. Iki cumle.'};
      const active=()=>cekimSenaryo;
      const duzMetin=x=>x.replace(/^#{1,3}\\s*/gm,'');
      const clock=s=>String(s);
      const Date2=Date;
      ${mNot[0]}
      return yayinNotu();
    `)(lp);
  }
  const gomulu=not({comp:true, burn:true});
  ok('gömülü çekildiyse uyarı ÇIKIYOR', /ALTYAZI VİDEOYA GÖMÜLÜ/.test(gomulu));
  ok('gömülü çekildiyse ne yapılmayacağı yazıyor', /PLATFORMA AYRICA YÜKLEME/.test(gomulu));
  const gomusuz=not({comp:true, burn:false});
  ok('gömülü DEĞİLSE uyarı çıkmıyor (boşuna korkutma)', !/GÖMÜLÜ/.test(gomusuz));
  const kompozitsiz=not({comp:false, burn:false});
  ok('kompozit yokken uyarı çıkmıyor', !/GÖMÜLÜ/.test(kompozitsiz));
  ok('lastPath hiç yokken çökmüyor', typeof not(null)==='string' && !/GÖMÜLÜ/.test(not(null)));
  /* Notun asıl işi bozulmamalı. */
  ok('not başlığı yerinde', /SUFLE YAYIN NOTU/.test(gomulu));
  ok('süre ve kelime bilgisi yerinde', /Süre: /.test(gomulu) && /Kelime: /.test(gomulu));
  ok('başlık adayları yerinde', /BAŞLIK ADAYLARI/.test(gomulu) && /1\) Baslik/.test(gomulu));
  ok('yapay zekâ kullanılmadığı notu en sonda',
     gomulu.trimEnd().endsWith('yapay zekâ kullanılmadı.'));
}
