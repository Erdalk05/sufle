const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {repoOku,esnek,telefonYolu,oku}=require('./kaynak');

/* ÇOK DAR EKRANDA KART DEĞERİ (2026-08-20).

   Bir kart kapalıyken TEK işi o anki DEĞERİ göstermektir ("1080p · Dengeli",
   "6/8 açık"). Depo bunun için mutlak bir kural tutuyor: kesilen kart özeti
   sayısı 0. Ama kural yalnız 430 ve 360 pikselde ölçülüyordu.

   ÖLÇÜLDÜ (gerçek tarayıcı, 320 px — iPhone SE 1. nesil, bölünmüş ekran,
   yakınlaştırılmış tarayıcı): "Okuma yardımcıları" başlığı 142 px alıyor,
   özete 51 pikselin yalnız 22'si kalıyor ve "6/8 açık" üç noktaya gidiyordu.
   Yani kart kapalıyken hiçbir şey söylemiyordu.

   Aynı ders masaüstünde 1152 pikselde alınmıştı: **ölçülmeyen genişlik,
   denetlenmemiş genişliktir.**

   ÇÖZÜM KISALTMAK DEĞİL, İKİNCİ SATIR: 340 pikselin altında özet kendi
   satırına iniyor; başlık da özet de tam okunuyor. Kısaltmak, kartın
   varlık sebebini yok etmek olurdu. */

const tel=esnek(oku(telefonYolu()));
const K=repoOku('kontrast.py','SUFLE_KONTRAST');

/* ---------- 1) DAR EKRAN KURALI ---------- */
{
  const mq=tel.match(/@media \(max-width:340px\)\{[\s\S]{0,400}?\n  \}/);
  ok('çok dar ekran kuralı var', !!mq);
  const b=mq?mq[0]:'';
  ok('özet satırı kırılabiliyor', /\.grup>summary\{flex-wrap:wrap\}/.test(b));
  ok('özet kendi satırına iniyor (tam genişlik)', /flex-basis:100%/.test(b));
  /* `order` olmadan ok işareti üçüncü satıra düşerdi; özet en sona alınıyor. */
  ok('ok işareti birinci satırda kalıyor (özet en sonda)', /order:1/.test(b));
}
/* ---------- 2) GENİŞ EKRANDAKİ KURAL BOZULMADI ----------
   360-430 pikselde kural "başlık kırılmaz, özet kısalır" ve bu ÖLÇÜLMÜŞ bir
   karardı: ikon kutucuğu satırdan 42 px alınca başlık iki satıra düşüyordu. */
ok('başlık hâlâ kırılmıyor', /\.grup>summary>span\[data-i18n\]\{flex:0 0 auto;white-space:nowrap\}/.test(tel));
ok('özet geniş ekranda hâlâ tek satır', /\.grup>summary \.ozet\{[^}]*white-space:nowrap/.test(tel));
ok('özet geniş ekranda satırın yarısını geçmiyor',
   /\.grup>summary \.ozet\{[^}]*max-width:46%/.test(tel));

/* ---------- 3) EN DAR GENİŞLİK GERÇEKTEN ÖLÇÜLÜYOR ----------
   Nöbetçi, o genişlik gezilmezse ölü kalır — bu gece iki kez böyle oldu
   (masaüstü yalnız 1440 pxte, telefon yalnız 430/360 pxte ölçülüyordu). */
{
  const gen=[...K.matchAll(/\(\s*'telefon[a-z-]*',?\s*TELEFON,\s*(\d+),/g)].map(m=>+m[1]);
  ok('telefon yüzeyleri sayılabildi ('+[...new Set(gen)].join('/')+')', gen.length>=3);
  ok('en dar gerçekçi telefon genişliği ölçülüyor (≤320 px)', gen.some(x=>x<=320));
  ok('kesilen kart özeti hâlâ MUTLAK kural', /üç noktayla kesilen %d kart özeti/.test(K));
}
