const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const kod=oku(telefonYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* UYUMLULUK PANELİ GERÇEĞİ SÖYLÜYOR MU
   Panel her satırda "bu cihazda çalışır / çalışmaz" diyor. Kullanıcı buna
   bakıp iş akışını seçiyor; yanlış söylerse ya boşuna deniyor ya da çalışan
   bir yolu hiç denemiyor. En pahalı sınıf: özelliğin KENDİ kapısı ile panelin
   kuralı ayrışırsa panel sessizce yalan söylüyor.

   BULUNAN SAPMA — uygulama içi kesme:
     panel:        !!document.createElement('video').captureStream
     gerçek kapı:  canTrim() = !!(v && (v.captureStream||v.mozCaptureStream))
   Firefox'ta video.captureStream yok ama mozCaptureStream VAR. Ölçüldü:
     Chrome/Safari  panel=true   kapı=true
     Firefox        panel=FALSE  kapı=TRUE   <-- çalışan özelliğe "yok" deniyordu
     destek yok     panel=false  kapı=false
   Yani Firefox kullanıcısı uygulama içinde kesebilecekken "bu cihaz
   desteklemiyor" okuyup daha zahmetli yola gönderiliyordu.

   Çözüm: panel kendi kuralını yazmasın, KAPININ KENDİSİNİ çağırsın. */

const rapor = cikar(kod, /function deviceReport\(\)\{[\s\S]*?\n\}/, 'deviceReport');

/* ---------- HER SATIR GERÇEK KAPIYI ÇAĞIRIYOR MU ---------- */
ok('kesme satırı gerçek kapıyı çağırıyor (canTrim)', /'In-app trimming', canTrim\(\)/.test(rapor));
ok('panel kesme için kendi kuralını yazmıyor',
   !/document\.createElement\('video'\)\.captureStream/.test(rapor));
ok('kompozit satırı canComposite kullanıyor', /'Composite \+ green screen', canComposite\(\)/.test(rapor));
ok('duraklatma satırı canPauseRec kullanıyor', /'Pause recording', canPauseRec\(\)/.test(rapor));
ok('paylaşma satırı canShareFiles kullanıyor', /'File sharing', canShareFiles\(\)/.test(rapor));

/* ---------- KAPILAR PANELDEKİ İDDİAYI GERÇEKTEN KARŞILIYOR MU ---------- */
const canTrim=new Function('$',cikar(kod,/function canTrim\(\)\{[^\n]*\}/,'canTrim')+'; return canTrim;');
{
  const dene=v=>canTrim(()=>v)();
  ok('Chrome/Safari: kesme var', dene({captureStream:()=>{}}) === true);
  ok('Firefox: mozCaptureStream de kabul ediliyor', dene({mozCaptureStream:()=>{}}) === true);
  ok('hiçbiri yoksa kesme yok', dene({}) === false);
  ok('öge hiç yoksa çökmüyor', canTrim(()=>null)() === false);
}

/* Kompozit kapısı ile panelin kuralı AYNI koşulları istemeli. */
const startComp=cikar(kod,/function startComp\(\)\{[\s\S]*?\n\}/,'startComp');
const canComposite=cikar(kod,/function canComposite\(\)\{[\s\S]*?\n\}/,'canComposite');
ok('kompozit: her ikisi de captureStream istiyor',
   /captureStream/.test(startComp) && /captureStream/.test(canComposite));
ok('kompozit: her ikisi de webgl istiyor',
   /getContext\('webgl'/.test(startComp) && /getContext\('webgl'\)/.test(canComposite));

/* MP4 satırı, kayıtta gerçekten denenen MP4 adaylarını sınamalı; panel daha dar
   sınarsa çalışan cihaza "MP4 yok" der. */
const pickMime=cikar(kod,/function pickMime\(\)\{[\s\S]*?\n\}/,'pickMime');
for(const aday of ["video/mp4", "video/mp4;codecs=avc1.42E01E,mp4a.40.2"]){
  ok('MP4 adayı hem panelde hem kayıtta sınanıyor — '+aday,
     rapor.includes(aday) && pickMime.includes(aday));
}
ok('panel, kayıtta hiç denenmeyen bir MP4 adayı uydurmuyor',
   (rapor.match(/video\/mp4[^']*/g)||[]).every(x=>pickMime.includes(x)));

/* ---------- PANEL BOŞ SATIR ÜRETMİYOR ----------
   Her satırın adı, İngilizcesi ve durumu olmalı; eksik olan sessizce boş
   görünürdü. */
const satirlar=[...rapor.matchAll(/\['([^']+)','([^']+)',/g)];
ok('panelde satırlar var', satirlar.length >= 10);
ok('her satırın iki dilde adı var', satirlar.every(m=>m[1].trim() && m[2].trim()));

/* Çalışmayan her satır NE YAPILACAĞINI söylemeli — "✕" tek başına çaresizlik.
   Titreşim satırı bilinçli olarak boş (yapılacak bir şey yok). */
const oneriler=[...rapor.matchAll(/\['[^']+','[^']+',[^,]+(?:\([^)]*\))?,\s*'([^']*)'\]/g)].map(m=>m[1]);
ok('satırların hemen hepsi çözüm öneriyor',
   oneriler.filter(x=>x.trim()).length >= satirlar.length-2);

/* ---------- PANEL GERÇEKTEN ÇİZİLİYOR MU ----------
   "Yazıldı ama hiçbir yere bağlı değil" sınıfı bu depoda birden çok kez çıktı. */
ok('panel bir yerde çiziliyor', /function renderDevice\(\)/.test(kod));
ok('çizim raporu kullanıyor', /const rows=deviceReport\(\);/.test(cikar(kod,/function renderDevice\(\)\{[\s\S]*?\n\}/,'renderDevice')));
ok('çalışmayan satırda öneri gösteriliyor',
   /!ok&&r\[3\]\?'<div class="s">'\+esc\(r\[3\]\)/.test(kod));
