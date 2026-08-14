const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, macYolu, oku, cikar}=require('./kaynak.js');

/* B.4 — ODAK MODU: kayıtta kabuk kaybolur, DOKUNUŞLA GERİ GELİR.

   DÜZELTİLEN TUZAK: "Kayıtta düğmeleri gizle" ayarı açıkken hideUI tüm alt
   çubuğu pointer-events:none yapıyordu ve kaydı DURDURACAK düğme o çubukta.
   Geri getirme yoktu; kullanıcının tek çıkışı sesli komuttu. Bu yüzden ayar
   varsayılan KAPALI tutulmuştu — tuzak kapanınca varsayılan açıldı
   (Elgato/Teleprompter.com kalıbı: çekimde sahne temiz).

   TARAYICIDA KANITLANDI: kayıt+gizli durumda sahneye dokunuş kabuğu getiriyor
   (dokunusla_geldi:true), 4 sn dokunulmazsa kayıt sürüyorsa yeniden gizleniyor.
   Burada aynı sözleşmenin kaynak düzeyi iddiaları kilitleniyor. */

const tel = oku(telefonYolu());
const kod = (tel.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];

/* ---------- GERİ GETİRME VAR VE DOĞRU YERDE ---------- */
{
  const f = cikar(kod, /function peekUI\(\)\{[\s\S]*?\n\}/, 'peekUI');
  ok('peekUI yalnız gizliyken iş yapıyor', /if\(!body\.classList\.contains\('hideUI'\)\) return false;/.test(f));
  ok('peekUI kabuğu gösteriyor', /body\.classList\.remove\('hideUI'\)/.test(f));
  /* Yeniden gizleme İKİ koşula bağlı: ayar hâlâ açık VE kayıt sürüyor.
     Koşulsuz gizleseydi kayıt bittikten sonra da kabuk kaybolurdu. */
  ok('yeniden gizleme ayar + kayıt koşuluna bağlı',
     /st\.hideUI && body\.classList\.contains\('rec'\)/.test(f));

  /* SIRA KRİTİK: peekUI çağrısı sürükleme/kilit mantığından ÖNCE olmalı —
     ilk dokunuş eylem değil GÖSTERME. Ama anySheet'ten SONRA: sayfa açıkken
     sahne dokunuşu zaten işlenmiyor. indexOf ile sıra ölçmeden önce üçünün
     de VAR olduğunu doğrula (CLAUDE.md: -1 tuzağı). */
  const h = cikar(kod, /stage\.addEventListener\('pointerdown',e=>\{[\s\S]*?\},\{passive:true\}\);/, 'stage pointerdown');
  const iSheet = h.indexOf('anySheet()'), iPeek = h.indexOf('peekUI()'), iLock = h.indexOf("contains('locked')");
  ok('işleyicide üç kapı da var', iSheet >= 0 && iPeek >= 0 && iLock >= 0);
  ok('sıra: sayfa → GÖSTER → kilit', iSheet < iPeek && iPeek < iLock);
  ok('ilk dokunuş eylemi yutuyor (return)', /if\(peekUI\(\)\) return;/.test(h));
}

/* ---------- VARSAYILAN AÇIK, ESKİYE DOKUNMADAN ---------- */
{
  ok('odak modu varsayılan AÇIK (hideUI:true)', /hideUI:true,/.test(kod));
  /* Eski kullanıcının kaydında alan zaten yazılı — DEF yalnız yeni kurulum.
     Bu iddia davranışı değil o gerekçenin belgede durmasını kilitliyor:
     gerekçesiz varsayılan değişimi bir sonraki denetimde "neden?" doğurur. */
  ok('varsayılan değişiminin gerekçesi kodda yazılı',
     /eski kullanıcının kaydında alan zaten yazılı/i.test(kod));
}

/* ---------- TUZAĞIN KENDİSİ YERİNDE (CSS sözleşmesi) ---------- */
{
  /* Gizliyken çubuk gerçekten dokunulmaz olmalı — peekUI'nin varlık sebebi.
     Bu kural gevşerse (yalnız opacity kalırsa) görünmez düğmelere yanlışlıkla
     basılır; sıkılaşırsa zaten peekUI kurtarıyor. */
  ok('hideUI çubuğu dokunulmaz yapıyor (peekUI bunun panzehiri)',
     /body\.hideUI #hud,body\.hideUI #bar,body\.hideUI #progress\{opacity:0;pointer-events:none\}/.test(tel));
  ok('kayıt göstergesi gizlenMİYOR (kayıtta olduğun belli olmalı)',
     /body\.hideUI #recDot,body\.hideUI #recFrame\{opacity:1\}/.test(tel));
}

/* ---------- MAC: KAYITTA PANELLER KENDİLİĞİNDEN KAPANIR ---------- */
{
  const mac = oku(macYolu());
  const mkod = (mac.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];
  const basla = cikar(mkod, /recorder\.start\(1000\);[\s\S]*?togglePlay\(\);/, 'startRec kuyruğu');
  /* SIRA da iddia: önce ESKİ durum saklanır, SONRA full eklenir. Ters sıra
     fullOncesi'yi hep true yapar ve geri dönüş hiç çalışmaz — özellik
     sessizce yarım kalır. */
  const iSakla = basla.indexOf("fullOncesi=app.classList.contains('full')");
  const iEkle  = basla.indexOf("app.classList.add('full')");
  ok('Mac: kayıt başlarken önceki düzen saklanıyor', iSakla >= 0);
  ok('Mac: kayıt başlarken paneller kapanıyor', iEkle >= 0);
  ok('Mac: sıra doğru (önce sakla, sonra kapat)', iSakla >= 0 && iEkle > iSakla);
  const dur = cikar(mkod, /function stopRec\(\)\{[\s\S]*?\n  \}/, 'stopRec');
  ok('Mac: kayıt bitince yalnız GEREKİYORSA geri açılıyor',
     /if\(!fullOncesi\) app\.classList\.remove\('full'\)/.test(dur));
}
