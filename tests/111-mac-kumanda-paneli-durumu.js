const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {macYolu,oku, macMetni}=require('./kaynak');
const mac=macMetni();
const macKod=mac.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
/* ÇIKARIM İÇİN SATIR YORUMLARI AYIKLANMAZ: bu fonksiyonda
   `location.protocol+'//'+host` var ve kaba ayıklayıcı o dizeyi yorum
   sanıp satırı ortadan kesiyor — çıkarılan metin bozuk çıkıyordu.
   Kaynak düzeyi iddialarda `macKod` yeterli; KOŞTURULACAK kodu ham
   biçimden al. */
const macHam=mac.replace(/\/\*[\s\S]*?\*\//g,'');

/* L9 — MAC SUNUCUSU OLMADAN AÇILINCA KUMANDA PANELİ NET Mİ:
   `file://` durumu NETTİ (hipotez çürüdü) — mesaj varsayılan olarak
   görünür durumda duruyor, kumandanın hiç çalışmayacağını ve ne
   yapılacağını söylüyor.

   AMA TERSİ ANLATILMIYORDU. Sayfa http ile açılmış olabilir ve sufle
   sunucusu yine de cevap vermiyor olabilir: başka bir sunucudan servis
   edilmişse ya da sunucu öldükten sonra önbellekten açılmışsa. O durumda
   `/info` cevapsız kalıyor, kod sessizce `location.host`a düşüyor ve
   panel ÇALIŞMAYACAK bir adres gösteriyordu. QR de 404 alıp sessizce
   kayboluyordu; kullanıcı adresi telefona elle yazıyor, sayfa açılmıyor
   ve sebebi hiçbir yerde yazmıyor.

   Windows kopyasında bu EN OLASI durum: orada `.command` sunucusu yok.
   E9/E10 ile aynı sınıf — ölü adresi çalışıyormuş gibi göstermek.
   "Bir yön kontrol edildi, tersi edilmedi." */

/* ---------- ÜÇ DURUM DA KAYNAKTA VAR MI ---------- */
ok('file:// durumunda hiç kurulmuyor', /if\(!location\.protocol\.startsWith\('http'\)\) return;/.test(macKod));
/* Desen BİÇİME değil DAVRANIŞA bağlı: eskiden markup birebir eşleşiyordu
   (`<div id="remoteOff" class="rb-note">`) ve A.2d'de data-i18n eklenince
   kırıldı — oysa kullanıcı için hiçbir şey değişmemişti. İddia şu: remoteOff
   diye bir öge var ve varsayılan olarak GİZLİ DEĞİL. */
ok('kapalı mesajı VARSAYILAN olarak görünür (file:// yolunda gösterilmesi gerekmiyor)',
   /<div\b[^>]*\bid="remoteOff"[^>]*>/.test(mac) && !/id="remoteOff"[^>]*display:none/.test(mac));
ok('açık bölüm varsayılan olarak gizli', /<div id="remoteOn" style="display:none">/.test(mac));
ok('file:// mesajı sebebi söylüyor', /tarayıcı file:\/\/ modunda sunucuya bağlanamaz/.test(mac));
ok('file:// mesajı ne yapılacağını söylüyor', /Teleprompter Sunucu\.command/.test(mac));

/* ---------- ASIL BULGU: SUNUCU CEVAPSIZ ---------- */
ok('bilgi isteği başarılı mı diye bakılıyor', /if\(r\.ok\) bilgi=await r\.json\(\);/.test(macKod));
ok('cevapsızsa panel açılmıyor', /if\(!bilgi\)\{/.test(macKod));
ok('cevapsızsa sebep yazılıyor', /Sufle sunucusu cevap vermiyor/.test(mac));
ok('cevapsızsa ne yapılacağı yazılıyor', /çift tıkla ve sayfayı yenile/.test(mac));
ok('cevapsızsa açık bölüm gizleniyor', /\$\('#remoteOn'\)\.style\.display='none';\s*\n\s*return;/.test(macKod));
ok('cevapsızsa ölü adres HİÇ gösterilmiyor',
   macKod.indexOf('if(!bilgi){') < macKod.indexOf("$('#remoteUrl').textContent=host"));
/* Wi-Fi adresi bulunamama durumu da duruyor (E9 ile aynı kural). */
ok('yerel adres kontrolü duruyor', /const yerelMi = \/\^\(localhost\|127\\\.\|\\\[\?::1\\\]\?\)\/i\.test\(host\);/.test(macKod));
ok('yerel adreste QR üretilmiyor', /if\(yerelMi\)\{[\s\S]*?img\.style\.display='none';/.test(macKod));

/* ---------- GERÇEK KURULUMU KOŞTUR ---------- */
const m=macHam.match(/async function setupRemote\(\)\{[\s\S]*?\n  \}/);
ok('setupRemote çıkarılabildi', !!m);
if(!m) return;

function kos({protokol='https:', host='192.168.1.5:8443', infoOk=true, ip='192.168.1.5', port=8443}={}){
  return new Function('__d', `
    const iz=[]; const oge={};
    const yap=id=>({ id, style:{display:''}, _html:'', _text:'',
      set innerHTML(v){ this._html=v; }, get innerHTML(){ return this._html; },
      set textContent(v){ this._text=v; }, get textContent(){ return this._text; },
      classList:{ add:()=>{}, remove:()=>{} } });
    for(const id of ['#remoteOff','#remoteOn','#qrImg','#remoteUrl','#connDot']) oge[id]=yap(id);
    oge['#remoteOn'].style.display='none';
    const $=s=>oge[s]||null;
    const location={ protocol:__d.protokol, host:__d.host };
    const fetch=async(u)=>{ iz.push('istek:'+u);
      if(!__d.infoOk) throw new Error('bagli degil');
      return { ok:true, json:async()=>({ip:__d.ip, port:__d.port}) }; };
    const toast=t=>iz.push('mesaj:'+t);
    const encodeURIComponent=x=>x;
    class EventSource{ constructor(u){ iz.push('akis:'+u); } }
    ${m[0]}
    return setupRemote().then(()=>({
      iz,
      kapaliGorunur: oge['#remoteOff'].style.display!=='none',
      kapaliMetin:   oge['#remoteOff'].innerHTML,
      acikGorunur:   oge['#remoteOn'].style.display==='block',
      adres:         oge['#remoteUrl'].textContent,
      qr:            oge['#qrImg'].src||'',
    }));
  `)({protokol, host, infoOk, ip, port});
}

(async()=>{
  {
    const r=await kos({protokol:'file:'});
    ok('file:// hiç kurulum yapmıyor', r.iz.length===0);
    ok('file:// kapalı mesajı yerinde duruyor', r.kapaliGorunur===true);
    ok('file:// açık bölüm gizli kalıyor', r.acikGorunur===false);
    ok('file:// hiç adres gösterilmiyor', !r.adres);
  }
  {
    const r=await kos({infoOk:false});
    ok('sunucu cevapsızken kapalı mesaj gösteriliyor', r.kapaliGorunur===true);
    ok('sunucu cevapsızken sebep yazılıyor', /Sufle sunucusu cevap vermiyor/.test(r.kapaliMetin));
    ok('sunucu cevapsızken çözüm yazılıyor', /Teleprompter Sunucu/.test(r.kapaliMetin));
    ok('sunucu cevapsızken açık bölüm gizli', r.acikGorunur===false);
    ok('sunucu cevapsızken ÖLÜ ADRES gösterilmiyor', !r.adres);
    ok('sunucu cevapsızken QR üretilmiyor', !r.qr);
    ok('sunucu cevapsızken olay akışı da kurulmuyor', !r.iz.some(x=>/^akis:/.test(x)));
  }
  {
    const r=await kos({});
    ok('sunucu çalışırken panel açılıyor', r.acikGorunur===true);
    ok('sunucu çalışırken kapalı mesaj gizleniyor', r.kapaliGorunur===false);
    ok('adres sunucunun bildirdiği Wi-Fi adresinden kuruluyor', r.adres==='192.168.1.5:8443/remote');
    ok('QR o adrese üretiliyor', /qr\?d=https:\/\/192\.168\.1\.5:8443\/remote/.test(r.qr));
    ok('olay akışı kuruluyor', r.iz.some(x=>x==='akis:/events'));
  }
  {
    /* Sunucu 127.0.0.1 bildiriyorsa (Wi-Fi yok) QR ÜRETİLMEMELİ — E9 kuralı. */
    const r=await kos({ip:'127.0.0.1', host:'127.0.0.1:8443'});
    ok('Wi-Fi adresi yokken adres yerine sebep yazılıyor', r.adres==='Wi-Fi adresi bulunamadı');
    ok('Wi-Fi adresi yokken QR üretilmiyor', !r.qr);
    ok('Wi-Fi adresi yokken kullanıcı uyarılıyor', r.iz.some(x=>/Wi-Fi adresi bulunamadı/.test(x)));
    ok('Wi-Fi adresi yokken olay akışı da kurulmuyor', !r.iz.some(x=>/^akis:/.test(x)));
  }
  {
    /* Sunucu bilgi veriyor ama localhostta ise: yine QR yok. */
    const r=await kos({ip:'', host:'localhost:8443'});
    ok('localhost sunucuda QR üretilmiyor', !r.qr);
    ok('localhost sunucuda sebep yazılıyor', r.adres==='Wi-Fi adresi bulunamadı');
  }
})();
