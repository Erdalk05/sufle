---
description: Sufle CTO döngüsü — sıradaki işi seç, kanıtla, düzelt, testle kilitle, commit et
---

Sufle (`~/Desktop/.sufle-deploy`) CTO döngüsü. `CLAUDE.md`'deki kuralları uygula.

**Her turda:**

1. `TaskList`'ten tamamlanmamış **en yüksek öncelikli** maddeyi seç.
   Backlog boşsa yeni bir denetim merceği aç ve bulguları `TaskCreate` ile ekle.
2. İlgili akışı **uçtan uca** incele: kullanıcı girdisi → ekran → işlem → veri → sonuç.
3. Kök nedeni **koddan kanıtla**. Hipotez çürürse onu da rapora yaz — çürüyen hipotez de bilgidir.
4. Mevcut mimariyi koruyan **en küçük** çözümü uygula.
5. Regresyon testi ekle ve **ayırt ettiğini kanıtla**: kodu kasıtlı boz, test kırılmalı.
   - Bozmayı **hedef bloğa** uygula (aynı desen başka yerde olabilir)
   - Geçici kopya + `SUFLE_TELEFON` / `SUFLE_MAC` kullan, çalışma ağacına dokunma
   - **Her testten sonra çıkış koduna bak** — "HATA yok" testin çöktüğünü gizler
6. `python3 denetim.py index.html "mac/Teleprompter Pro.html"` → `node --check` → `./kapi.sh`
7. Aynaları eşitle (`CLAUDE.md`'deki tablo), commit et.
8. Kısa durum raporu: ne yapıldı · kullanıcıya faydası · hangi bozulmalar yakalanıyor · sıradaki madde.

**Durma noktaları** — bunları yapma, sor:
`git push` · yayın · `.son-yayin`'i yayından önce yazma · `*.pem` · geri döndürülemez işlem

$ARGUMENTS
