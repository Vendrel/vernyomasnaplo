# Vérnyomásnapló-grafikon és HBPM-jelentés

Ingyenes, böngészőben futó magyar nyelvű vérnyomásnapló webapp otthoni vérnyomásmérések megjelenítésére, HBPM-jelentés készítésére és előzetes automatikus analitikára.

A projekt célja, hogy a páciens által vezetett vérnyomásnapló gyorsan áttekinthető legyen háziorvosnak és kardiológusnak is: CSV-ből vagy kézi adatbevitelből grafikonokat rajzol, összefoglaló jelentést készít, és kiemeli a figyelmet érdemlő mintázatokat. A kardiológusok fejlesztett funkcionalitás kapnak: akár tableten is az ujjukkal szkennelhetik a grafikont, megjelölhetnek kardiológiai eseményeket, amelyekből egyre bővülő jelentésszöveg készül, ezt másolhatják (pl. ambuláns lap, kezelési terv dokumentációjába), tárolhatják, továbbküldhetik.

## Fő funkciók

- CSV-alapú vérnyomásnapló betöltése. Minta-CSV és táblázatsablon rendelkezésre áll.
- Közvetlen kézi adatbevitel a böngészőben.
- Reggeli, déli és esti mérési párok kezelése.
- Szisztolés, diasztolés és pulzusgrafikonok napi-átlag és részletes nézetben. Az átlagszámítás, amit a füzetkék használata esetén kézzel kellett eddig elvégezni, természetes alapfunkció.
- Háziorvos-mód rövidebb HBPM-összefoglalóval.
- Kardiológus-mód részletesebb variabilitási, trend- és abnormalitás-előelemzéssel. Ezek sárga indikációk a grafikonon, 🄺 klinikai és 🅂 statisztikai események megkülönböztetésével).
- HBPM-jelentés másolása vágólapra, ambuláns lap gyors lezárásához, páciensenkénti időráfordítás csökkentéséhez.
- Páciensazonosító adatok opcionális megadása: becenév, biológiai nem, életkor.
- Értékelési profilok: standard felnőtt, fitt idős, törékeny idős, demencia/kognitív érintettség, valamint egyéni célzóna.
- Adatok mentése URL-fragmentbe, opcionális böngészőoldali titkosítással. Nincs szerveroldali adattárolás, nincs adatküldés a szervernek, nincs GDPR-vonatkozás.
- CSV letöltése az aktuális adatokból.
- Sötét és világos megjelenés.

## Kipróbálás

A projekt statikus HTML/CSS/JavaScript alkalmazás. Nincs szükség build lépésre vagy szerveroldali backend fejlesztésre. (Mondhatni akár egy a sarokba helyezett régi telefonról is futtatható, a fő terhelés kliensoldalon érvényesül.)

Helyi kipróbáláshoz nyisd meg az `index.html` fájlt böngészőben, vagy indíts egy egyszerű statikus webszervert a projekt könyvtárából:

```bash
python3 -m http.server 8000
```

Ezután:

- háziorvos-mód: `http://localhost:8000/index.html`
- kardiológus-mód: `http://localhost:8000/kardiologusnak.html`

Az alkalmazás külső CDN-ről tölti be a Chart.js-t, valamint a Google Material Symbols betűkészletet. Offline vagy teljesen önálló terjesztéshez ezeket érdemes lokálisan vendorizálni.

## Használat röviden

1. Válassz értékelési profilt, ha az alapértelmezett standard felnőtt profil nem megfelelő.
2. Tölts be egy CSV-fájlt, vagy kezdd el kézzel rögzíteni a méréseket.
3. Add meg opcionálisan a páciens-azonosítóadatait: becenév, nem, életkor. Az orvos számára praktikus.
4. Nézd át a napi és részletes grafikonokat.
5. Másold ki a HBPM-jelentést a vágólapra.
6. Szükség esetén mentsd az adatokat az URL-be, vagy töltsd le CSV-ként. !!!FONTOS!!! Minden adat elvész, amit nem rögzítettél az URL-be (keresd a "Mentés a webcímbe" gombokat), és ha az URL-t nem tároltad könyvjelzőben, vagy nem küldted el valakinek.)

## CSV-formátum

Lásd a minta-CSV-t.

A `REG` a reggeli, a `DÉL` a déli, az `ESTE` az esti mérést jelenti. Egy napszakhoz két mérés tartozhat; a grafikonok ezek átlagával is dolgoznak.

A HBPM-jelentés irányelvi része a reggeli és esti mérésekre épül. A déli mérések a teljesebb grafikus és analitikai áttekintést segítik.

A projekt tartalmaz egy `szivbeteg-vernyomas-minta.csv` fájlt, valamint egy `csvgenerator.html` segédoldalt mintaadatok generálására.

## HBPM-jelentés és analitika

Az alkalmazás az első HBPM-nap kihagyása után legalább 3 értékelhető napot és legalább 12 reggeli/esti vérnyomásmérést vár a jelentéshez. Ideális esetben 7 napos HBPM-protokollal érdemes dolgozni.

A háziorvos-mód többek között ezeket adja:

- HBPM-átlag és értelmezés.
- Reggeli és esti átlag.
- Átlagos pulzus.
- Adatminőség.
- Küszöb feletti egyedi mérések aránya.
- Kiemelendő magas vagy alacsony otthoni értékek száma.
- Mérési aktivitás.

A kardiológus-mód részletesebb elemzést ad, például:

- szórás és variációs együttható,
- reggel-este különbség,
- napi ingadozás,
- percentilisek, minimumok és maximumok,
- hipertenzív és hipotenzív epizódok,
- trendjelzés,
- automatikusan jelzett klinikai és statisztikai abnormalitások.

Az automatikus analitika előszűrésre és áttekintésre szolgál. Nem diagnózis, és nem helyettesíti az orvosi értelmezést.

## Adatvédelem

Az alkalmazás alapvetően kliensoldali: a bevitt vagy betöltött vérnyomásadatokat a böngésző dolgozza fel.

Fontos tudnivalók:

- Nincs saját backend vagy adatbázis.
- A CSV-adatok betöltés után a böngészőben kerülnek feldolgozásra.
- Az adatok URL-fragmentbe menthetők, így könyvjelzőként vagy megosztott linkként továbbvihetők.
- Az URL-be mentett adat opcionálisan titkosítható.
- A titkosítás AES-GCM algoritmust és PBKDF2-SHA-256 kulcsszármaztatást használ. Nem feltörhetetlen, de az adat jellegéhez képest overkill.
- A jelszót az alkalmazás nem tárolja. Ha elveszted, elveszett a naplód, így lokálisan érdemes lehet rendszeresen CSV-t letölteni.

Figyelem: ha az adatokat titkosítás nélkül URL-be mented, akkor maga a link hordozza a mérési adatokat. Ilyen linket csak tudatosan ossz meg!

## Projektstruktúra

```text
.
├── index.html                 # Háziorvos-mód
├── kardiologusnak.html        # Kardiológus-mód
├── csvgenerator.html          # Minta-CSV generátor
├── style.css                  # Megjelenés
├── js/
│   ├── app.js                 # Fő alkalmazáslogika
│   ├── charts.js              # Chart.js grafikonok és CSV-feldolgozás
│   ├── report.js              # HBPM-jelentés és automatikus analitika
│   ├── bp-profiles.js         # Értékelési profilok és célzónák
│   ├── data-url.js            # URL-alapú adatmentés
│   ├── password-crypto.js     # Böngészőoldali titkosítás
│   ├── chart-plugins.js       # Egyedi Chart.js pluginek
│   ├── testdata.js            # Teszt/mintaadat funkciók
│   └── utils.js               # Közös segédfüggvények
├── favicon/                   # Ikonok és webmanifest
└── szivbeteg-vernyomas-minta.csv
```

## Fejlesztés

A projekt jelenleg framework nélküli statikus webapp. A legfontosabb fejlesztési pontok:

- `js/app.js`: UI-állapot, módváltás, kézi adatbevitel, URL-mentés.
- `js/charts.js`: CSV parsing és grafikonadatok előállítása.
- `js/report.js`: HBPM-statisztikák, jelentésszöveg, abnormalitáslogika.
- `js/bp-profiles.js`: értékelési profilok és célzóna-kezelés.
- `style.css`: teljes vizuális rendszer.

Kódmódosítás után érdemes legalább ezeket végignézni:

- CSV betöltés mintaadatokkal
- Kézi adatbevitel új napra
- Háziorvos/kardiológus módváltás
- Jelentés másolása
- URL-be mentés és visszatöltés
- Titkosított URL létrehozása és visszafejtése
- Mobil és desktop nézet
– Tablet-funkcionalitás (hüvelykujj)

## Orvosi felelősségi megjegyzés

Ez az alkalmazás egészségügyi adatok rendszerezését és előzetes áttekintését segíti. Nem orvostechnikai eszköz, nem diagnosztikai döntéshozó rendszer, és nem helyettesíti az orvosi konzultációt.

Sürgős vagy riasztó tünetek, illetve kiugróan magas vagy alacsony vérnyomásértékek esetén nem az alkalmazás értelmezésére kell hagyatkozni, hanem megfelelő egészségügyi segítséget kell kérni.

## Licenc

A projekt GPL v3 licenc alatt publikálható és használható. Ez azt jelenti, hogy a forráskód szabadon tanulmányozható, módosítható és továbbterjeszthető a GPL v3 feltételei szerint.

Ha valaki a projektből vagy annak módosított változatából zárt, prémium vagy más üzleti terméket szeretne készíteni, amelyhez a GPL v3 feltételei nem illeszkednek, egyedi kereskedelmi licencelésről lehet egyeztetni a projekt szerzőjével. vargaendre gmail

