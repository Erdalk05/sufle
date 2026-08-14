const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* J2 — YILDIZ/NOT DEĞİŞİNCE TÜM KAYIT (VİDEO DAHİL) OKUNUP YAZILIYORDU.

   İki ayrı maliyet ölçüldü, ikisi de koddan:
   1) LİSTE HER VİDEOYU BELLEĞE ÇEKİYORDU. `dbAll` `getAll()` kullanıyordu;
      IndexedDB o çağrıda kayıtların TAMAMINI, yani her `blob`u döndürür.
      Oysa `renderTakes` yalnız üstveri gösteriyor: ad, tarih, süre, boyut,
      ses rozeti, not, yıldız. Yirmi çekimlik bir arşiv 100 MBlık videolarla
      2 GB okumak demekti — ve bu, listeyi her açışta DEĞİL yalnızca; her
      yıldıza dokunuşta, her yeniden adlandırmada, her not düzenlemesinde
      `renderTakes` yeniden çağrıldığı için TEKRAR TEKRAR.
      M1-P1de yayın paketinde kapatılan sınıfın aynısı.
   2) ÜSTVERİ YAZIMI TÜM KAYDI GERİ YAZIYORDU: `it.fav=!it.fav; dbPut(it)`
      videoyu da içeren nesneyi yazıyordu.

   Çözüm: liste imleçle YALNIZ üstveri okuyor (`dbListe`), video yalnız
   oynat/paylaş anında ve TEK kayıt için getiriliyor (`dbGetir`).
   Üstveri güncellemesi oku-değiştir-yaz (`dbGuncelle`) — çünkü artık listede
   blob yok ve o kayıtları doğrudan yazmak VİDEOYU SİLERDİ. Bu testin en
   önemli iddiası da bu: güncelleme videoyu düşürmüyor. */

const parca=(re,ad)=>{ const m=kod.match(re); ok('çıkarılabildi: '+ad, !!m); return m&&m[0]; };
const sListe=parca(/async function dbListe\(\)\{[\s\S]*?\n\}/,'dbListe');
const sGetir=parca(/async function dbGetir\(id\)\{[\s\S]*?\n\}/,'dbGetir');
const sGunc =parca(/async function dbGuncelle\(id, degis\)\{[\s\S]*?\n\}/,'dbGuncelle');
if(!sListe || !sGetir || !sGunc) return;

/* ---------- SAHTE IndexedDB ---------- */
function depoKur(kayitlar){
  return {
    veri: kayitlar.map(k=>({...k})),
    okumaSayisi: 0, blobOkumaSayisi: 0,
  };
}
function calistir(depo, betik){
  return new Function('__d','__iz', `
    const logErr=()=>{};
    const sozZamanAsimi=(f)=>new Promise(r=>f(r));
    const openDB=async()=>({
      transaction(){ return { objectStore(){ return {
        /* J1: dbGuncelle artık ANAHTARLI imleçle güncelliyor (tek işlemde
           oku-değiştir-yaz). Tezgâh iki kullanımı da tanımalı: anahtarsız
           çağrı listeyi geziyor, anahtarlı çağrı tek kaydı açıp update
           veriyor. Ayrıca sonuç hem q.result hem olay nesnesinden okunabilir
           olmalı — iki çağıran iki ayrı biçim kullanıyor. */
        openCursor(anahtar){
          const q={};
          setTimeout(()=>{
            if(anahtar!==undefined){
              const kayit=__d.veri.find(x=>x.id===anahtar);
              if(!kayit){ q.result=null; q.onsuccess&&q.onsuccess({target:{result:null}}); return; }
              __d.okumaSayisi++;
              if(kayit.blob) __d.blobOkumaSayisi++;
              q.result={ value:kayit,
                update(v){ const i=__d.veri.findIndex(x=>x.id===anahtar);
                  __d.veri[i]=v; __iz.push('yazildi:'+anahtar); } };
              q.onsuccess&&q.onsuccess({target:{result:q.result}});
              return;
            }
            let i=0;
            const ilerle=()=>{
              if(i>=__d.veri.length){ q.result=null; q.onsuccess({target:{result:null}}); return; }
              const kayit=__d.veri[i++];
              __d.okumaSayisi++;
              if(kayit.blob) __d.blobOkumaSayisi++;   // imleç kaydın TAMAMINI verir
              q.result={value:kayit, continue:ilerle};
              q.onsuccess({target:{result:q.result}});
            };
            ilerle();
          },0);
          return q;
        },
        get(id){ const q={}; setTimeout(()=>{ const k=__d.veri.find(x=>x.id===id);
          if(k && k.blob) __d.blobOkumaSayisi++;
          q.result=k?{...k}:undefined; q.onsuccess(); },0); return q; },
        put(rec){ const i=__d.veri.findIndex(x=>x.id===rec.id);
          if(i>=0) __d.veri[i]={...rec}; else __d.veri.push({...rec}); __iz.push('yazildi:'+rec.id); },
      }; }, set oncomplete(f){ setTimeout(f,0); }, set onerror(f){}, set onabort(f){} }; },
    });
    const dbPut=async(rec)=>{ const d=await openDB(); const tx=d.transaction();
      tx.objectStore().put(rec); return new Promise(r=>{ tx.oncomplete=()=>r(true); }); };
    ${sListe}
    ${sGetir}
    ${sGunc}
    return (async()=>{ ${betik} })();
  `)(depo, depo.iz=[]);
}

/* ---------- 1) LİSTE VİDEO OKUMUYOR ---------- */
{
  const depo=depoKur([
    {id:1, title:'bir', created:3, dur:10, size:100, fav:false, blob:'VIDEO-1'},
    {id:2, title:'iki', created:2, dur:20, size:200, fav:true,  blob:'VIDEO-2'},
    {id:3, title:'uc',  created:1, dur:30, size:300, fav:false, blob:'VIDEO-3'},
  ]);
  return calistir(depo,'return await dbListe();').then(liste=>{
    ok('liste bütün kayıtları veriyor', liste.length===3);
    ok('listede HİÇBİR video taşınmıyor', liste.every(x=>x.blob===undefined));
    ok('üstveri eksiksiz geliyor',
       liste.every(x=>x.title!=null && x.created!=null && x.dur!=null && x.size!=null));
    ok('videosu olan kayıt işaretleniyor', liste.every(x=>x.videoVar===true));
    /* Yıldızlılar üstte, sonra yeniden eskiye — eski sıralama korunmalı. */
    ok('yıldızlı çekim başa alınıyor', liste[0].id===2);
    ok('gerisi yeniden eskiye sıralı', liste[1].id===1 && liste[2].id===3);
    return devam();
  });
}

function devam(){
  /* ---------- 2) ÜSTVERİ GÜNCELLEMESİ VİDEOYU DÜŞÜRMÜYOR ----------
     Bu testin en kritik iddiası. Listedeki kayıtlarda blob yok; onları
     doğrudan yazmak videoyu siler ve kullanıcı çekimini KAYBEDER. */
  const depo=depoKur([{id:7, title:'eski', fav:false, not:'', created:1, blob:'VIDEO-7'}]);
  return calistir(depo, `
    await dbGuncelle(7,{fav:true});
    await dbGuncelle(7,{not:'guzel oldu'});
    await dbGuncelle(7,{title:'yeni ad'});
    return __d.veri[0];
  `).then(kayit=>{
    ok('yıldız yazıldı', kayit.fav===true);
    ok('not yazıldı', kayit.not==='guzel oldu');
    ok('ad yazıldı', kayit.title==='yeni ad');
    ok('VİDEO YERİNDE DURUYOR (en kritik iddia)', kayit.blob==='VIDEO-7');
    ok('diğer alanlar korunuyor', kayit.created===1);

    /* Olmayan kayıt: sessizce yeni kayıt YARATMAMALI, yoksa silinmiş bir
       çekim üstverisiyle geri doğar ve arşivde videosuz hayalet kalır. */
    const bos=depoKur([]);
    return calistir(bos,'return {sonuc: await dbGuncelle(99,{fav:true}), adet: __d.veri.length};');
  }).then(r=>{
    ok('olmayan kayıt güncellenmiyor', r.sonuc===false);
    ok('olmayan kayıt için hayalet yaratılmıyor', r.adet===0);
    return devam2();
  });
}

function devam2(){
  /* ---------- 3) TEK KAYIT GETİRME ---------- */
  const depo=depoKur([
    {id:1, title:'bir', created:1, blob:'VIDEO-1'},
    {id:2, title:'iki', created:2, blob:'VIDEO-2'},
  ]);
  return calistir(depo, `
    const a=await dbGetir(2);
    const yok=await dbGetir(404);
    return {a, yok, blobOkuma:__d.blobOkumaSayisi};
  `).then(r=>{
    ok('tek kayıt videosuyla geliyor', r.a && r.a.blob==='VIDEO-2');
    ok('yalnız BİR video okundu (diğerine dokunulmadı)', r.blobOkuma===1);
    ok('olmayan kayıt null dönüyor', r.yok===null);
    return kaynakDuzeyi();
  });
}

function kaynakDuzeyi(){
  /* ---------- KAYNAK DÜZEYİ: YOLLAR DOĞRU FONKSİYONA BAĞLI ---------- */
  ok('liste üstveriden besleniyor', /sortTakes\(await dbListe\(\)\)/.test(kod));
  ok('yıldız oku-değiştir-yaz ile yazılıyor', /it\.fav=!it\.fav; await dbGuncelle\(it\.id,\{fav:it\.fav\}\)/.test(kod));
  ok('not oku-değiştir-yaz ile yazılıyor', /await dbGuncelle\(it\.id,\{not:it\.not\}\)/.test(kod));
  ok('ad oku-değiştir-yaz ile yazılıyor', /await dbGuncelle\(it\.id,\{title:it\.title\}\)/.test(kod));
  /* Liste kaydını doğrudan yazmak videoyu silerdi — hiçbir yerde kalmamalı. */
  ok('liste kaydı doğrudan dbPut edilmiyor', !/await dbPut\(it\)/.test(kod));
  ok('oynatma videoyu tek kayıt olarak getiriyor',
     /\[data-a="play"\][\s\S]{0,200}const tam=await dbGetir\(it\.id\)/.test(kod));
  ok('paylaşma da öyle',
     /\[data-a="share"\][\s\S]{0,200}const tam=await dbGetir\(it\.id\)/.test(kod));
  /* Kayıt arada silinmiş olabilir (başka sekme, toplu silme): sessiz kalma. */
  ok('video bulunamazsa kullanıcıya söyleniyor', (kod.match(/toast\(m\('takeGone'\)\)/g)||[]).length===2);
  ok('mesaj iki dilde', (tel.match(/takeGone:'/g)||[]).length===2);
  ok('toplu silme de üstveriyle yetiniyor',
     (kod.match(/const all=await dbListe\(\), kill=all\.filter\(x=>!x\.fav\);/g)||[]).length===2);
  /* getAll yalnız video taşımayan bir depoda meşru olurdu; burada değil. */
  ok('arşiv artık getAll kullanmıyor', !/objectStore\('takes'\)\.getAll\(\)/.test(kod));
  ok('imleçle okuma yapılıyor', /openCursor\(\)/.test(kod));
  ok('okuma zaman aşımıyla korunuyor',
     /'dbListe'\)/.test(kod) && /'dbGetir'\)/.test(kod));
}
