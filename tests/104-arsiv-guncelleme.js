const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');

/* J1 — ARŞİVE YAZARKEN VİDEO KOPYALANIYOR MU (M1-P1 DERSİ):
   Çekimi ARŞİVLERKEN kopya yok — blob doğrudan veriliyor. Ama küçük bir
   alanı GÜNCELLERKEN kaydın tamamı gidip geliyordu ve bu daha ağır bir
   kusuru saklıyordu: KAYIP GÜNCELLEME.

   Eski `dbGuncelle` iki AYRI işlemdi: önce kaydın tamamı okunuyor (video
   alanı dahil), sonra tamamı geri yazılıyordu. Yıldıza basıp hemen not
   yazdığında ikisi de aynı ESKİ kaydı okuyor ve üst üste yazıyor.

   ÖLÇÜLDÜ (iki güncelleme aynı anda):
     yıldız + not  -> yıldız SESSİZCE KAYBOLUYOR
     çift dokunuş  -> sonuç tümüyle belirsiz
   Liste depodan okuduğu için yıldız ekranda da geri sönüyor; kullanıcı
   uygulamayı hatalı sanıyor, oysa kaydettiği şey gerçekten gitmiş.

   Artık tek bir okuma-yazma işleminde imleçle güncelleniyor: kayıt
   işlemden hiç çıkmıyor ve oku-değiştir-yaz bölünemez. */

/* ---------- ARŞİVE YAZMA: KOPYA YOK ---------- */
ok('çekim arşive doğrudan veriliyor (kopya çıkarılmıyor)',
   /dbPut\(\{id:curTakeId,blob:lastBlob,type:lastBlob\.type,size:lastBlob\.size/.test(kod));
ok('blob için arrayBuffer/slice çağrılmıyor',
   !/lastBlob\.arrayBuffer\(\)/.test(kod) && !/lastBlob\.slice\(/.test(kod));
ok('yazma askıda kalırsa süre koruması var', /\}, 15000, false, 'dbPut'\);/.test(kod));
/* Uyarı 2026-08-17'de SEBEBE GÖRE seçilir oldu (depo dolu / depo kapalı);
   sınanan iddia değişmedi: başarısızlıkta çekim elde kalır ve kullanıcıya
   söylenir. */
ok('arşivleme başarısızsa çekim yine elde kalıyor ve söyleniyor',
   /if\(!ok\)\{ curTakeId=null; toast\(m\(depoSebep==='kapali'\?'archFailKapali':'archFail'\)\); \}/.test(kod));

/* ---------- GÜNCELLEME TEK İŞLEMDE Mİ ---------- */
const m=kod.match(/async function dbGuncelle\(id, degis\)\{[\s\S]*?\n\}/);
ok('dbGuncelle çıkarılabildi', !!m);
if(!m) return;
const g=m[0];
ok('tek bir okuma-yazma işlemi açılıyor', /const tx=d\.transaction\('takes','readwrite'\);/.test(g));
ok('kayıt imleçle güncelleniyor (işlemden çıkmıyor)', /openCursor\(id\)/.test(g) && /c\.update\(c\.value\)/.test(g));
ok('artık ayrı bir okuma çağrısı yapılmıyor', !/dbGetir\(/.test(g));
ok('artık ayrı bir yazma çağrısı yapılmıyor', !/dbPut\(/.test(g));
ok('kayıt yoksa yenisi YARATILMIYOR', /if\(!c\)\{ bitir\(false\); return; \}/.test(g));
ok('askıda kalma koruması duruyor', /\}, 15000, false, 'dbGuncelle'\);/.test(g));
ok('iptal ve hata ayrı ayrı yakalanıyor', /tx\.onerror=/.test(g) && /tx\.onabort=/.test(g));
ok('sonuç işlem TAMAMLANINCA bildiriliyor (yarım yazma başarı sayılmasın)',
   /tx\.oncomplete=\(\)=>bitir\(bulundu\);/.test(g));

/* ---------- GERÇEK KODU KOŞTUR ---------- */
function tezgah(kayitlar){
  return new Function('__k', `
    const iz=[];
    const depo=__k;
    let siradaki=[];
    /* Sahte IndexedDB: readwrite işlemleri SIRAYLA koşuyor (gerçek
       davranış budur), readonly olanlar hemen. Böylece atomikliğin
       gerçekten korunup korunmadığı görülüyor. */
    let kilit=Promise.resolve();
    const openDB=async()=>({
      transaction(ad, mod){
        const tx={ oncomplete:null, onerror:null, onabort:null };
        const islem={
          openCursor(id){
            const q={onsuccess:null,onerror:null,result:null};
            const cal=()=>{
              const rec=depo[id];
              if(!rec){ q.result=null; q.onsuccess&&q.onsuccess(); return; }
              q.result={ value:rec, update(v){ depo[id]=v; iz.push('yazildi:'+JSON.stringify({fav:v.fav,not:v.not,title:v.title})); } };
              q.onsuccess&&q.onsuccess();
            };
            if(mod==='readwrite'){
              kilit=kilit.then(()=>new Promise(r=>setTimeout(()=>{ cal(); tx.oncomplete&&tx.oncomplete(); r(); },0)));
            } else setTimeout(()=>{ cal(); tx.oncomplete&&tx.oncomplete(); },0);
            return q;
          },
          get(id){ const q={onsuccess:null,onerror:null,result:null};
            setTimeout(()=>{ q.result=depo[id]?JSON.parse(JSON.stringify(depo[id])):null; q.onsuccess&&q.onsuccess(); },0);
            return q; },
          put(rec){ setTimeout(()=>{ depo[rec.id]=rec; tx.oncomplete&&tx.oncomplete(); },0); return {}; }
        };
        tx.objectStore=()=>islem;
        return tx;
      }
    });
    const logErr=(w,e)=>iz.push('hata:'+w);
    ${kod.match(/function sozZamanAsimi\(kur, ms, dusus, nerede\)\{[\s\S]*?\n\}/)[0]}
    ${g}
    return { dbGuncelle, depo, iz };
  `)(kayitlar);
}
const YENI=()=>({ t1:{id:'t1', fav:false, not:'', title:'Cekim', blob:'VIDEO_2GB'} });

(async()=>{
  {
    const t=tezgah(YENI());
    const r=await t.dbGuncelle('t1',{fav:true});
    ok('tek güncelleme çalışıyor', r===true && t.depo.t1.fav===true);
    ok('diğer alanlara dokunulmuyor', t.depo.t1.title==='Cekim' && t.depo.t1.not==='');
    ok('video alanı yerinde duruyor', t.depo.t1.blob==='VIDEO_2GB');
  }
  {
    /* ASIL SINAV: iki güncelleme aynı anda. İkisi de kalmalı. */
    const t=tezgah(YENI());
    await Promise.all([ t.dbGuncelle('t1',{fav:true}), t.dbGuncelle('t1',{not:'en iyi cekim'}) ]);
    ok('yıldız KAYBOLMUYOR (eskiden kayboluyordu)', t.depo.t1.fav===true);
    ok('not da kaydediliyor', t.depo.t1.not==='en iyi cekim');
    ok('ikisi birden korunuyor', t.depo.t1.fav===true && t.depo.t1.not==='en iyi cekim');
  }
  {
    /* Üç güncelleme: yıldız, not, ad — hiçbiri düşmemeli. */
    const t=tezgah(YENI());
    await Promise.all([ t.dbGuncelle('t1',{fav:true}),
                        t.dbGuncelle('t1',{not:'nefis'}),
                        t.dbGuncelle('t1',{title:'Tanitim'}) ]);
    ok('üç güncelleme birden korunuyor',
       t.depo.t1.fav===true && t.depo.t1.not==='nefis' && t.depo.t1.title==='Tanitim');
    ok('video yine yerinde', t.depo.t1.blob==='VIDEO_2GB');
  }
  {
    /* Çift dokunuş: son basış geçerli olmalı, sonuç belirsiz kalmamalı. */
    const t=tezgah(YENI());
    await t.dbGuncelle('t1',{fav:true});
    await t.dbGuncelle('t1',{fav:false});
    ok('çift dokunuşta son durum geçerli', t.depo.t1.fav===false);
  }
  {
    const t=tezgah(YENI());
    const r=await t.dbGuncelle('yok-boyle-bir-id',{fav:true});
    ok('olmayan kayıt için false dönüyor', r===false);
    ok('olmayan kayıt için yeni kayıt YARATILMIYOR', t.depo['yok-boyle-bir-id']===undefined);
    ok('var olan kayıt bozulmuyor', t.depo.t1.fav===false);
  }
  {
    /* Yazma sayısı: her güncelleme TEK yazma yapmalı. */
    const t=tezgah(YENI());
    await t.dbGuncelle('t1',{fav:true});
    ok('bir güncelleme = bir yazma', t.iz.filter(x=>/^yazildi:/.test(x)).length===1);
  }

  /* ---------- ÇAĞIRAN YERLER ---------- */
  ok('yıldız güncellemesi yalnız o alanı gönderiyor',
     /it\.fav=!it\.fav; await dbGuncelle\(it\.id,\{fav:it\.fav\}\);/.test(kod));
  ok('not güncellemesi yalnız o alanı gönderiyor', /await dbGuncelle\(it\.id,\{not:it\.not\}\);/.test(kod));
  ok('ad güncellemesi yalnız o alanı gönderiyor', /await dbGuncelle\(it\.id,\{title:it\.title\}\);/.test(kod));
  ok('not 140 karakterle sınırlı', /it\.not=n\.trim\(\)\.slice\(0,140\)/.test(kod));
  ok('ad 60 karakterle sınırlı', /it\.title=ad\.trim\(\)\.slice\(0,60\)/.test(kod));
  /* Liste depodan okuyor: kaybolan güncelleme ekrana da yansıyordu. */
  ok('liste depodan okuyor (kaybın görünür olmasının sebebi)',
     /const list=sortTakes\(await dbListe\(\)\)/.test(kod));
  ok('liste blobları taşımıyor', /videoVar/.test(kod));
})();
