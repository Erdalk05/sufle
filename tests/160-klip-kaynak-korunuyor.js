const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,blokKes,cekirdekOku}=require('./kaynak');
const telHam=oku(telefonYolu()), macHam=oku(macYolu());
const yorumsuz=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const tel=yorumsuz(telHam), mac=yorumsuz(macHam);

/* KLİP ÖNERİSİ KESİMDEN SONRA DA YAŞASIN.

   REKABET TURUNDA ÖLÇÜLDÜ (2026-08-16): G.6 üç klip öneriyor, kullanıcı
   birini seçiyor, "Kes ve uygula" diyor — ve telefonda `doTrim` içinde
   `if(curTakeId) await dbDel(curTakeId);` satırı KAYNAK ÇEKİMİ SİLİYORDU.
   Yani üç öneriden ikisi ilk kesimde ULAŞILAMAZ oluyordu; üstelik sessizce,
   çünkü silinen şey kullanıcıya hiç söylenmiyordu. Macte silme yoktu ama
   kaynak bellekte EZİLİYORDU, sonuç aynı.

   Bu, deponun 2 numaralı hata sınıfının tam örneği: özellik tam da
   gerektiği anda çalışmıyor. Üç klip önerip birinden sonrasını imkânsız
   kılmak, hiç önermemekten daha kötüdür — kullanıcı kaybettiğini de bilmez.

   Onarım: klip YENİ çekim olarak arşivleniyor, kaynak duruyor ve
   "↩ Tam çekim" düğmesiyle geri dönülüyor. Silme kullanıcının kararı. */

/* ---------- 1) KESME KAYNAĞI SİLMİYOR (telefon) ---------- */
{
  const govde=blokKes(tel,'async function doTrim()');
  ok('doTrim çıkarılabildi', !!govde);
  if(govde){
    /* ASIL İDDİA: kesme yolunda ARŞİVDEN SİLME yok. */
    ok('telefon: kesme arşivden silmiyor', !/dbDel\(/.test(govde));
    ok('telefon: kaynak çekim bellekte saklanıyor',
       /kesKaynak=\{blob:lastBlob/.test(govde));
    /* Kaynak SAKLANMADAN üstüne yazılırsa dönüş yolu boşa çıkar: sıra önemli. */
    ok('telefon: kaynak, üstüne yazılmadan önce saklanıyor',
       govde.indexOf('kesKaynak={blob:lastBlob') < govde.indexOf('lastBlob=nb'));
    ok('telefon: klip yeni çekim olarak arşivleniyor', /await autoSaveTake\(\)/.test(govde));
    /* Kaynağın KİMLİĞİ de saklanmalı: dönünce arşivdeki aynı kayda dönülsün,
       yoksa "tam çekim" ikinci bir kopya olarak yazılırdı. */
    ok('telefon: kaynağın arşiv kimliği de saklanıyor', /id:curTakeId/.test(govde));
  }
}

/* ---------- 2) KESME KAYNAĞI EZMİYOR (masaüstü) ---------- */
{
  const govde=blokKes(mac,'async function trimUygula()');
  ok('trimUygula çıkarılabildi', !!govde);
  if(govde){
    ok('masaüstü: kaynak çekim saklanıyor', /kesKaynak=\{blob:lastBlob\}/.test(govde));
    ok('masaüstü: kaynak, üstüne yazılmadan önce saklanıyor',
       govde.indexOf('kesKaynak={blob:lastBlob}') < govde.indexOf('lastBlob=nb'));
    ok('masaüstü: boş çıktı korumasi duruyor', /nb\.size<1000/.test(govde));
  }
}

/* ---------- 3) DÖNÜŞ YOLU GERÇEKTEN ÇALIŞIYOR ---------- */
/* Kaynak davranışını SİMÜLE ediyoruz: kaynak koddan çıkarılan dönüş
   işleyicisi sahte ortamda koşuyor. Yalnız desen aramak, "lastBlob=..."
   satırını yanlış değişkene bağlayan bir bozmayı geçirirdi. */
for(const [ad,kod,imza,goster] of [
  ['telefon', tel, "$('#kaynakBtn').onclick=()=>{", 'showResult(lastBlob)'],
  ['masaüstü', mac, "$('#rrKaynak').onclick=()=>{", 'showResult()']]){
  const bas=kod.indexOf(imza);
  ok(ad+': dönüş işleyicisi bulundu', bas>=0);
  if(bas<0) continue;
  /* Süslü parantez sayarak gövdeyi çıkar (regex ilk `}` da durur). */
  let i=kod.indexOf('{', bas+imza.length-1), d=0, son=-1;
  for(let j=i;j<kod.length;j++){
    if(kod[j]==='{') d++;
    else if(kod[j]==='}'){ d--; if(d===0){ son=j; break; } }
  }
  ok(ad+': dönüş gövdesi çıkarılabildi', son>0);
  if(son<0) continue;
  const govde=kod.slice(i+1, son);
  ok(ad+': dönüşte sonuç ekranı yenileniyor', govde.indexOf(goster)>=0);

  const kur=(kaynakVar)=>{
    const iz=[];
    const durum={ lastBlob:{ad:'klip'}, lastDur:3, curTakeId:'klipId',
                  kesKaynak: kaynakVar?{blob:{ad:'tam'}, dur:42, id:'kaynakId'}:null };
    const f=new Function('D','iz',
      'let {lastBlob,lastDur,curTakeId,kesKaynak}=D;'+
      "const $=()=>({});const showResult=(b)=>iz.push('goster:'+((b&&b.ad)||(lastBlob&&lastBlob.ad)));"+
      "const toast=(x)=>iz.push('toast:'+x); const m=(k)=>k;"+
      govde+
      ';D.lastBlob=lastBlob; D.lastDur=lastDur; D.curTakeId=curTakeId; D.kesKaynak=kesKaynak;');
    f(durum, iz);
    return {durum, iz};
  };

  {
    const {durum, iz}=kur(true);
    ok(ad+': dönüşte tam çekim geri geliyor', durum.lastBlob && durum.lastBlob.ad==='tam');
    ok(ad+': dönüş sonrası kaynak boşaltılıyor', durum.kesKaynak===null);
    ok(ad+': sonuç ekranı tam çekimle çiziliyor', iz.some(x=>x==='goster:tam'));
    /* SEBEP SÖYLENMELİ: sessiz dönüş, kullanıcıya klibin kaybolduğunu
       düşündürür. Klip arşivde duruyor ve bunu söyleyen bir bildirim var. */
    ok(ad+': dönüş kullanıcıya bildiriliyor', iz.some(x=>x==='toast:kaynakGeri'));
  }
  {
    /* Kaynak yokken düğmeye basmak HİÇBİR ŞEY yapmamalı: yoksa klip
       `undefined` ile ezilir ve çekim tümden kaybolur. */
    const {durum, iz}=kur(false);
    ok(ad+': kaynak yokken klip korunuyor', durum.lastBlob && durum.lastBlob.ad==='klip');
    ok(ad+': kaynak yokken ekran yenilenmiyor', iz.length===0);
  }
}

/* ---------- 4) DÜĞME YALNIZ KESİMDEN SONRA GÖRÜNÜYOR ---------- */
{
  ok('telefon: dönüş düğmesi varsayılan gizli',
     /id="kaynakBtn"[^>]*style="display:none"/.test(telHam));
  ok('masaüstü: dönüş düğmesi varsayılan gizli',
     /id="rrKaynak"[^>]*style="display:none"/.test(macHam));
  ok('telefon: görünürlük kaynağa bağlı',
     /\$\('#kaynakBtn'\)\.style\.display = kesKaynak \? '' : 'none'/.test(tel));
  ok('masaüstü: görünürlük kaynağa bağlı',
     /kb\.style\.display = kesKaynak \? '' : 'none'/.test(mac));
  /* Çekim kapanınca kaynak da düşmeli: kapanmış bir çekimin kaynağını
     tutmak, sonraki çekimde yanlış videoya dönüş demek olurdu. */
  const kapat=blokKes(tel,'function closeResult()')||'';
  ok('telefon: çekim kapanınca kaynak boşalıyor', /kesKaynak=null/.test(kapat));
}

/* ---------- 5) ÜÇ KLİP ZİNCİRİ AYAKTA ---------- */
{
  /* Öneri → budama kutusu → kesim → dönüş zincirinin ilk halkası da
     durmalı; kopan bir halka bu testi anlamsız kılar. */
  const sec=blokKes(tel,'function klipSec(')||'';
  ok('klip seçimi budama kutusunu dolduruyor', /trimA/.test(sec) && /trimB/.test(sec));
  ok('klip önerisi üç klip öneriyor', /KLIP_SAYI = 3/.test(cekirdekOku('klip.js','SUFLE_KLIP')));
  /* Metinler iki dilde olmalı ve kesim mesajı artık "kaynak duruyor" demeli:
     davranış değiştiyse mesaj da değişmeli, yoksa kullanıcı eski kuralı sanır. */
  const mesajlar=cekirdekOku('mesajlar.js','SUFLE_MESAJ');
  for(const k of ['kaynakGeri','trimDone']){
    const bul=[...mesajlar.matchAll(new RegExp(k+":'([^']*)'",'g'))].map(x=>x[1]);
    ok('mesaj '+k+' iki dilde', bul.length===2);
    ok('mesaj '+k+' çevrilmiş', bul.length===2 && bul[0]!==bul[1]);
  }
  ok('kesim mesajı kaynağın durduğunu söylüyor',
     /trimDone:'[^']*arşivde duruyor/.test(mesajlar));
  const sozluk=cekirdekOku('sozluk.js','SUFLE_SOZLUK');
  const dug=[...sozluk.matchAll(/kaynakBtn:'([^']*)'/g)].map(x=>x[1]);
  ok('düğme adı iki dilde', dug.length===2 && dug[0]!==dug[1]);
}
