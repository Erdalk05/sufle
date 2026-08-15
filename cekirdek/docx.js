/* .docx OKUYUCU — SIFIR BAĞIMLILIK. İki kabuğa da derle.py gömer.

   NEDEN KENDİ ÇÖZÜCÜMÜZ: mammoth.js ~150 KB, "tek dosya sıfır bağımlılık"
   sözünü bozardı (disleksi fontunda ve ffmpeg.wasm'de verilen aynı karar).

   NEDEN MÜMKÜN: .docx bir ZIP ve içindeki word/document.xml düz XML. ZIP'in
   merkezi dizinini okumak ~40 satır; açma işini tarayıcının YERLEŞİK
   DecompressionStream("deflate-raw") API'si yapıyor — kütüphane değil,
   platformun kendisi. Ölçüldü (Chrome): 719 baytlık gerçek bir .docx okundu,
   Türkçe karakterler (ğüşıöç ĞÜŞİÖÇ) bozulmadan geldi.

   PDF BİLEREK YOK: doğru bir PDF metin çıkarıcısı font kodlamaları, CID
   eşlemeleri ve sıkıştırılmış akışlar yüzünden binlerce satır ve yine de
   çoğu dosyada yanlış sonuç verir. Kullanıcıya dürüst yol söyleniyor:
   PDF'i açıp metni kopyala, "📋 Yapıştır" ile getir. */
async function docxMetni(dosya){
  const bin=new Uint8Array(await dosya.arrayBuffer());
  const dv=new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  /* ZIP sonu kaydını SONDAN ara: dosya yorumu varsa kayıt en sonda olmaz. */
  let eocd=-1;
  for(let i=bin.length-22;i>=0 && i>bin.length-65558;i--){
    if(dv.getUint32(i,true)===0x06054b50){ eocd=i; break; }
  }
  if(eocd<0) throw new Error('zip degil');
  const adet=dv.getUint16(eocd+10,true), cdOfs=dv.getUint32(eocd+16,true);
  let p=cdOfs, hedef=null;
  for(let i=0;i<adet;i++){
    if(dv.getUint32(p,true)!==0x02014b50) throw new Error('bozuk dizin');
    const adUz=dv.getUint16(p+28,true), ek=dv.getUint16(p+30,true), yorum=dv.getUint16(p+32,true);
    const ad=new TextDecoder().decode(bin.subarray(p+46,p+46+adUz));
    if(ad==='word/document.xml')
      hedef={yerel:dv.getUint32(p+42,true), yontem:dv.getUint16(p+10,true), boyut:dv.getUint32(p+20,true)};
    p+=46+adUz+ek+yorum;
  }
  if(!hedef) throw new Error('document.xml yok');
  /* Veri konumu YEREL başlıktan okunur: merkezi dizindeki ek alan uzunluğu
     yerel başlıkla AYNI OLMAK ZORUNDA DEĞİL — burayı karıştırmak dosyayı
     birkaç bayt kaydırıp açmayı bozar. */
  const ln=dv.getUint16(hedef.yerel+26,true), le=dv.getUint16(hedef.yerel+28,true);
  const bas=hedef.yerel+30+ln+le;
  const ham=bin.subarray(bas, bas+hedef.boyut);
  let xml;
  if(hedef.yontem===0) xml=new TextDecoder().decode(ham);
  else if(hedef.yontem===8){
    if(typeof DecompressionStream!=='function') throw new Error('acma yok');
    const ds=new DecompressionStream('deflate-raw');
    xml=await new Response(new Blob([ham]).stream().pipeThrough(ds)).text();
  } else throw new Error('bilinmeyen sikistirma');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length) throw new Error('xml bozuk');
  const paras=[...doc.getElementsByTagName('w:p')].map(par=>{
    let s='';
    /* SIRAYI KORU: w:t, w:br ve w:tab belge sırasında gezilmeli. Yalnız w:t
       toplansaydı satır sonları yutulurdu — ilk ölçümde "Satırsonrası" diye
       birleşmiş çıktı, kusur oradan görüldü. */
    const gez=(d)=>{ for(const c of d.childNodes){
      if(c.nodeType!==1) continue;
      const ad=c.localName;
      if(ad==='t') s+=c.textContent;
      else if(ad==='br') s+='\n';
      else if(ad==='tab') s+=' ';
      else gez(c);
    } };
    gez(par);
    return s;
  });
  /* Boş paragraflar paragraf ayracına dönüşür; üçten fazla boş satır
     bırakmak sufle akışında kocaman boşluk demek. */
  return paras.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
