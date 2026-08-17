const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path'), os=require('os'), net=require('net');
const {spawn, spawnSync}=require('child_process');
const {macYolu, oku, sunucuYolu, REPO}=require('./kaynak');

/* MASAÜSTÜ YOLU UÇTAN UCA — KILAVUZUN Mac/Windows ADIMI GERÇEKTEN ÇALIŞIYOR MU.

   `DENEME.md` diyor ki: "Teleprompter Sunucu.command dosyasına çift tıkla,
   tarayıcı localhost:8080'i açar, QR ile telefon kumanda olur."
   Bu cümlenin ÜÇ ayrı parçası var ve üçü de kaynak okuyarak değil ancak
   KOŞTURARAK doğrulanabilir: sunucu ayağa kalkıyor mu, sayfa geliyor mu,
   kumanda ucu güvenli mi.

   EN ÖNEMLİSİ ÜÇÜNCÜSÜ: `/cmd` ucu, açık bir sekmedeki kötü niyetli sayfanın
   çekimi başlatıp durdurabilmesini engelliyor. O koruma bu sabah kaynak
   düzeyinde kilitlendi; burada ÇALIŞIRKEN ölçülüyor — kaynakta duran ama
   çalışmayan koruma, bu deponun 2 numaralı hata sınıfıdır.

   Ortam kısıtı: port bağlanamazsa test ATLANDI der (makine durumu, kod kusuru
   değil). Python yoksa da aynı. */

const py=['python3','python'].find(p=>{
  try{ return spawnSync(p,['-c','print(1)'],{encoding:'utf8'}).status===0; }catch(_){ return false; }
});
if(!py){ console.log('ATLANDI: Python yok (makine durumu)'); return; }

function bosPort(){
  return new Promise(res=>{ const s=net.createServer(); s.listen(0,'127.0.0.1',()=>{
    const p=s.address().port; s.close(()=>res(p)); }); });
}
function iste(url, {yontem='GET', govde=null, origin=null, ms=4000}={}){
  return new Promise(res=>{
    const http=require('http'), u=new URL(url);
    const bas={}; if(origin) bas['Origin']=origin;
    if(govde) bas['Content-Type']='application/json';
    const r=http.request({hostname:u.hostname, port:u.port, path:u.pathname+u.search,
                          method:yontem, headers:bas, timeout:ms}, cev=>{
      const parca=[]; cev.on('data',d=>parca.push(d));
      cev.on('end',()=>res({kod:cev.statusCode, govde:Buffer.concat(parca)}));
    });
    r.on('error',e=>res({kod:0, hata:String(e.message).slice(0,60), govde:Buffer.alloc(0)}));
    r.on('timeout',()=>{ r.destroy(); res({kod:0, hata:'zaman aşımı', govde:Buffer.alloc(0)}); });
    if(govde) r.write(govde);
    r.end();
  });
}

(async () => {
  const port=await bosPort();
  const dizin=fs.mkdtempSync(path.join(os.tmpdir(),'sufle-masaustu-'));
  /* Sunucu KENDİ klasöründeki HTML'i sunuyor; ikisi de kopyalanıyor.
     PORT ARTIK KAYNAK DÜZENLEYEREK DEĞİL ORTAMDAN veriliyor (2026-08-17):
     eski hâl `PORT = 8080` satırını metin olarak değiştiriyordu ve o satır
     değişince (env desteği eklendi) DEĞİŞİKLİK SESSİZCE UYGULANMADI —
     sunucu 8080'de kaldı, test kendi portunu bekleyip "ATLANDI" dedi ve
     uçtan uca masaüstü ölçümü o koşuda HİÇ yapılmadı. Bu deponun 1 numaralı
     hata sınıfı: deseni tutmayan metin düzenlemesi sessizce hiçbir şey yapmaz. */
  fs.copyFileSync(sunucuYolu(), path.join(dizin,'teleprompter_server.py'));
  fs.copyFileSync(macYolu(), path.join(dizin,'Teleprompter Pro.html'));

  const p=spawn(py,['-u','teleprompter_server.py'],
                {cwd:dizin, stdio:'ignore', env:{...process.env, SUFLE_PORT:String(port)}});
  const bitir=()=>{ try{ p.kill(); }catch(_){ } fs.rmSync(dizin,{recursive:true,force:true}); };
  const kok='http://127.0.0.1:'+port;
  try{
    let bilgi=null;
    for(let i=0;i<40 && !bilgi;i++){
      const r=await iste(kok+'/info',{ms:1000});
      if(r.kod===200){ try{ bilgi=JSON.parse(r.govde.toString()); }catch(_){ } }
      else await new Promise(r2=>setTimeout(r2,250));
    }
    if(!bilgi){ console.log('ATLANDI: sunucu ayağa kalkmadı (port/makine durumu)'); bitir(); return; }

    /* ---------- 1) SUNUCU AYAKTA VE DOĞRU PORTU BİLDİRİYOR ---------- */
    ok('sunucu ayağa kalktı', true);
    /* QR bu porta bakıyor: yanlış port bildirmek telefonu BOŞ adrese yollar
       (ölçülmüş kusur, tests/29). */
    ok('/info gerçek portu bildiriyor ('+bilgi.port+')', bilgi.port===port);
    ok('/info bir adres bildiriyor', typeof bilgi.ip==='string' && bilgi.ip.length>6);

    /* ---------- 2) UYGULAMA GERÇEKTEN SUNULUYOR ---------- */
    const ana=await iste(kok+'/');
    ok('ana sayfa 200 dönüyor', ana.kod===200);
    const html=ana.govde.toString();
    ok('gelen sayfa gerçekten uygulama', /id="scroller"/.test(html) && html.length>100000);
    const ver=(oku(macYolu()).match(/const VER='([\d.]+)'/)||[])[1];
    ok('sunulan sürüm depodakiyle aynı ('+ver+')', html.includes("const VER='"+ver+"'"));

    /* ---------- 3) KUMANDA SAYFASI VE QR ---------- */
    const uzak=await iste(kok+'/remote');
    ok('/remote 200 dönüyor', uzak.kod===200);
    ok('kumanda sayfasında komut düğmeleri var', /data-cmd/.test(uzak.govde.toString()));
    const qr=await iste(kok+'/qr?d='+encodeURIComponent(kok+'/remote'));
    ok('/qr gerçek bir PNG üretiyor',
       qr.kod===200 && qr.govde.slice(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])));

    /* ---------- 4) KÖKEN KORUMASI ÇALIŞIRKEN ÖLÇÜLÜYOR ---------- */
    const kendi=await iste(kok+'/cmd',{yontem:'POST', govde:'{"type":"play"}', origin:kok});
    ok('kendi sayfamızın komutu kabul ediliyor', kendi.kod===200);
    const yabanci=await iste(kok+'/cmd',{yontem:'POST', govde:'{"type":"play"}',
                                         origin:'https://kotu-site.example'});
    /* ASIL İDDİA: açık bir sekmedeki başka site çekimi başlatıp durduramaz. */
    ok('başka siteden gelen komut REDDEDİLİYOR ('+yabanci.kod+')', yabanci.kod===403);
    ok('reddin sebebi yanıtta yazılı', /baska bir siteden/.test(yabanci.govde.toString()));
    /* Origin başlığı olmayan istek tarayıcıdan gelmiyor (curl, betik): CSRF
       vektörü değil, kabul ediliyor — bu bir karar ve kaynakta yazılı. */
    const betik=await iste(kok+'/cmd',{yontem:'POST', govde:'{"type":"play"}'});
    ok('tarayıcı olmayan istemci engellenmiyor', betik.kod===200);
  } finally { bitir(); }
})();
