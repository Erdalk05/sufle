const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* SESLE TAKİP DİLİ — İKİ AYRI KUSUR
   1) sr.lang YALNIZ startVoice içinde okunuyor. Sesle takip AÇIKKEN dili
      değiştirmek eskiden hiçbir şey yapmıyordu: düğme yeni dile geçiyor,
      tanıyıcı eski dilde dinlemeye devam ediyordu. Kullanıcı için bu
      "sesle takip bozuldu" demek ve sebebi hiçbir yerde görünmüyor.
      "Ayar değişti ama uygulanmadı" sınıfı (bkz. F4, G11, H11).
   2) İkinci sürüm genelde BAŞKA BİR DİLDE. Sürüm değiştirince tanıma dili
      olduğu yerde kalıyordu, yani ikinci sürümde özellik hiç çalışmıyordu.

   KARAR (D3): dili metinden TAHMİN ETMİYORUZ. Uygulama bir sürümün hangi
   dilde olduğunu bilmiyor — sürüm etiketi bu yüzden dil adı değil, 1/2.
   Tahmin yanlış olursa sessizce bozar. Bunun yerine kullanıcının o sürüm
   için seçtiği dil HATIRLANIYOR (s.dil / s.dil2, metinle birlikte takas
   ediliyor) ve sürüm ya da senaryo değişince geri getiriliyor. */

/* ---------- KAYNAK DÜZEYİ: PARÇALAR YERİNDE Mİ ---------- */
const mSes=kod.match(/function sesDiliUygula\(dil, duyur\)\{[\s\S]*?\n\}/);
ok('sesDiliUygula tanımlı', !!mSes);
const mSurum=kod.match(/function surumDegistir\(\)\{[\s\S]*?\n\}/);
ok('surumDegistir tanımlı', !!mSurum);
if(!mSes || !mSurum) return;

ok('tanıma dili durumdan okunuyor (yeniden başlatmanın gerekçesi)',
   /sr=new SR\(\); sr\.lang=st\.voiceLang;/.test(kod));
ok('dil değişince çalışan tanıyıcı yeniden başlatılıyor',
   /if\(voiceOn\)\{\s*stopVoice\(\);\s*startVoice\(\);\s*\}/.test(mSes[0]));
ok('sürüm takasında dil de takas ediliyor', /s\.dil=s\.dil2\|\|''/.test(mSurum[0]) && /s\.dil2=dl\|\|''/.test(mSurum[0]));
ok('sürüm değişince dil geri getiriliyor', /sesDiliUygula\(s\.dil,true\)/.test(mSurum[0]));
ok('senaryo değişince de dil geri getiriliyor', /sesDiliUygula\(active\(\)\.dil,true\)/.test(kod));
ok('dil seçimi aktif senaryoya yazılıyor', /s\.dil=b\.dataset\.vl/.test(kod));
ok('kullanıcıya hangi dile geçildiği söyleniyor', /vlSet:'[^']+/.test(tel));
/* MSG değerinin İÇİNDE `kelime: ` geçerse denetim onu sahte bir MSG anahtarı
   sanıyor (dili / language diye iki hayalet anahtar bildirdi). İki nokta bu
   yüzden mesajda değil, birleştirmede duruyor. Kural kapıda kalsın. */
ok('bildirim değeri sahte anahtar üretmiyor', !/vlSet:'[^']*:\s*'/.test(tel));
ok('iki nokta birleştirmede veriliyor', /m\('vlSet'\)\+': '\+dilAdi\(dil\)/.test(tel));
ok('bildirim iki dilde', (tel.match(/vlSet:'/g)||[]).length===2);

/* ---------- sesDiliUygula GERÇEKTEN NE YAPIYOR ---------- */
function dilKos({simdiki, yeni, voiceOn, duyur}){
  const iz=[];
  return new Function('__iz','__s','__y','__v','__d', `
    const st={voiceLang:__s};
    let voiceOn=__v;
    const apply=()=>__iz.push('apply');
    const save=()=>__iz.push('save');
    const stopVoice=()=>__iz.push('stop');
    const startVoice=()=>__iz.push('start');
    const toast=x=>__iz.push('toast:'+x);
    const m=x=>x;
    const $=()=>({textContent:'DİLADI'});
    ${cikar(kod,/function dilAdi\(dil\)\{[\s\S]*?\n\}/,'dilAdi')}
    ${mSes[0]}
    const sonuc=sesDiliUygula(__y,__d);
    __iz.sonuc=sonuc; __iz.dil=st.voiceLang;
    return __iz;
  `)(iz, simdiki, yeni, voiceOn, duyur);
}
{
  const iz=dilKos({simdiki:'tr-TR', yeni:'en-US', voiceOn:true, duyur:true});
  ok('dil değişince durum güncelleniyor', iz.dil==='en-US');
  ok('sesle takip açıkken tanıyıcı DURDURULUYOR', iz.includes('stop'));
  ok('sesle takip açıkken tanıyıcı YENİDEN BAŞLATILIYOR', iz.includes('start'));
  ok('yeniden başlatma sırası doğru (önce dur, sonra başlat)',
     iz.indexOf('stop')>=0 && iz.indexOf('stop')<iz.indexOf('start'));
  /* Sıra kritik: dil ÖNCE yazılmazsa startVoice eski dili okur. */
  ok('dil, yeniden başlatmadan ÖNCE yazılıyor',
     iz.indexOf('apply')<iz.indexOf('start'));
  ok('değişiklik diske yazılıyor', iz.includes('save'));
  ok('kullanıcıya bildiriliyor', iz.some(x=>/^toast:vlSet/.test(x)));
  ok('bildirim dil ADINI içeriyor', iz.some(x=>/DİLADI/.test(x)));
}
{
  const iz=dilKos({simdiki:'tr-TR', yeni:'en-US', voiceOn:false, duyur:true});
  ok('sesle takip kapalıyken tanıyıcı başlatılmıyor', !iz.includes('start'));
  ok('sesle takip kapalıyken durum yine de güncelleniyor', iz.dil==='en-US');
}
{
  /* AYNI DİL: ikinci sürümü de aynı dilde yazan kullanıcıda her geçişte
     tanıyıcıyı kesip yeniden başlatmak, sesle takibi boşuna kör eder. */
  const iz=dilKos({simdiki:'tr-TR', yeni:'tr-TR', voiceOn:true, duyur:true});
  ok('dil zaten aynıysa tanıyıcıya DOKUNULMUYOR', !iz.includes('stop') && !iz.includes('start'));
  ok('dil zaten aynıysa gereksiz bildirim yok', !iz.some(x=>/toast/.test(x)));
  ok('dil zaten aynıysa false dönüyor (çağıran save edebilsin)', iz.sonuc===false);
}
{
  /* ESKİ KAYIT: 9.5 öncesi senaryolarda dil alanı YOK. */
  const iz=dilKos({simdiki:'tr-TR', yeni:undefined, voiceOn:true, duyur:true});
  ok('dil alanı olmayan eski senaryo dili SIFIRLAMIYOR', iz.dil==='tr-TR');
  ok('eski senaryoda tanıyıcı boşuna yeniden başlatılmıyor', !iz.includes('start'));
  const bos=dilKos({simdiki:'tr-TR', yeni:'', voiceOn:true, duyur:true});
  ok('boş dil alanı da güvenli', bos.dil==='tr-TR' && !bos.includes('start'));
}

/* ---------- SÜRÜM TAKASI: DİL GERÇEKTEN GİDİP GELİYOR MU ----------
   Gerçek surumDegistir koşturuluyor; takas iki yönde de sınanıyor. */
function surumKos(senaryo, baslangicDil){
  const iz=[];
  return new Function('__iz','__s','__d', `
    const st={voiceLang:__d};
    const s=__s;
    let voiceOn=false, maxPos=9999, rec=null;
    const active=()=>s;
    const toast=x=>__iz.push('toast:'+x);
    const m=x=>x;
    const ikinciSurumVar=()=>!!(s.text2||'').trim();
    const rememberPos=()=>{}, pullEditor=()=>{}, save=()=>{};
    const fillEditor=()=>{}, renderScripts=()=>{}, buildContent=()=>{}, reset=()=>{};
    const setPos=()=>{}, syncVoicePtr=()=>{}, surumRozeti=()=>{}, apply=()=>{};
    const stopVoice=()=>{}, startVoice=()=>{};
    const $=()=>({textContent:'DİLADI'});
    ${cikar(kod,/function dilAdi\(dil\)\{[\s\S]*?\n\}/,'dilAdi')}
    ${mSes[0]}
    ${mSurum[0]}
    surumDegistir();
    __iz.dil=st.voiceLang; __iz.s=s;
    return __iz;
  `)(iz, senaryo, baslangicDil);
}
{
  const s={id:'a', text:'merhaba dunya', text2:'hello world', dil:'tr-TR', dil2:'en-US', surum2:false};
  const r1=surumKos(s,'tr-TR');
  ok('2. sürüme geçince metin değişiyor', r1.s.text==='hello world');
  ok('2. sürüme geçince tanıma dili de değişiyor', r1.dil==='en-US');
  ok('2. sürümün dili aktif alana taşındı', r1.s.dil==='en-US');
  ok('1. sürümün dili saklandı', r1.s.dil2==='tr-TR');
  ok('dil değişimi kullanıcıya bildiriliyor', r1.some(x=>/^toast:vlSet/.test(x)));

  const r2=surumKos(r1.s,'en-US');
  ok('geri dönünce metin de geri geliyor', r2.s.text==='merhaba dunya');
  ok('geri dönünce dil de geri geliyor (gidiş-dönüş kayıpsız)', r2.dil==='tr-TR');
  ok('gidiş-dönüş sonunda alanlar başlangıçtaki gibi',
     r2.s.dil==='tr-TR' && r2.s.dil2==='en-US');
}
{
  /* GERİYE UYUMLULUK: 9.5 öncesi iki dilli senaryoda dil alanı hiç yok.
     Takas onu boş bırakmalı ve st.voiceLang'a DOKUNMAMALI — yoksa
     kullanıcının seçtiği dil sürüm değiştirdiği anda kaybolur. */
  const eski={id:'b', text:'birinci', text2:'ikinci', surum2:false};
  const r=surumKos(eski,'de-DE');
  ok('eski senaryoda sürüm geçişi dili değiştirmiyor', r.dil==='de-DE');
  ok('eski senaryoda dil alanı boş string kalıyor (undefined değil)',
     r.s.dil==='' && r.s.dil2==='');
  ok('eski senaryoda gereksiz bildirim yok', !r.some(x=>/^toast:vlSet/.test(x)));
  ok('eski senaryoda metin takası yine çalışıyor', r.s.text==='ikinci');
}
{
  /* YALNIZ BİR SÜRÜME DİL SEÇİLMİŞ: ikinciye geçince dil korunmalı,
     dönünce birincinin dili geri gelmeli. */
  const s={id:'c', text:'bir', text2:'iki', dil:'ar-SA', surum2:false};
  const r1=surumKos(s,'ar-SA');
  ok('dilsiz sürüme geçince dil olduğu gibi kalıyor', r1.dil==='ar-SA');
  const r2=surumKos(r1.s,'ar-SA');
  ok('dilli sürüme dönünce dil hâlâ doğru', r2.dil==='ar-SA' && r2.s.dil==='ar-SA');
}

/* ---------- DİL LİSTESİ VE ADLAR ---------- */
const seg=(tel.match(/<div class="seg" id="vlSeg">[\s\S]*?<\/div>/)||[''])[0];
ok('dört dil sunuluyor', (seg.match(/data-vl="/g)||[]).length===4);
ok('varsayılan dil Türkçe', /voiceLang:'tr-TR'/.test(kod));
ok('dil adı düğmeden okunuyor (ikinci bir liste tutulmuyor)',
   /\$\('#vlSeg button\[data-vl="'\+dil\+'"\]'\)/.test(kod));
