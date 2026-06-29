# HBPM küszöbprofil-rendszer és profilválasztó modal specifikáció

## Cél

A vérnyomásnapló webalkalmazás jelenlegi, fixen `135/85`, `180/110` és `<90/60` értékekre épülő HBPM-logikáját profilalapú küszöb- és célértékrendszerrel kell kiegészíteni.

Ez a specifikáció a projekt jelenlegi szerkezetéhez igazodik:

- nincs központi `appState` objektum;
- a mérési adat aktuális szövege a `currentCsvText` globális változóban él;
- az URL-state a hash fragmentben van, `URLSearchParams` formában;
- a mérési adat kulcsa a `urlDataKey`, jelenleg `"adat"`;
- a személyes adat kulcsa `"szemely"`;
- a kardiológiai kivonat kulcsa `"kivonat"`;
- a régi titkosítási mód kulcsa `"mod"`;
- a parse/encode URL-segítők a `js/data-url.js` fájlban vannak;
- a HBPM-statisztika és jelentés a `js/report.js` fájlban készül;
- a grafikonok a `js/charts.js` és `js/chart-plugins.js` fájlokban épülnek;
- az alkalmazásindítás és a UI-vezérlés fő helye a `js/app.js`.

Fontos alapelv:

- a diagnosztikus HBPM-küszöbök és a személyes/terápiás célzónák külön kezelendők;
- az alapértelmezett profil a jelenlegi működéssel azonos legyen;
- a profilválasztás nem diagnózis, hanem az automatikus elemzés értelmezési kerete;
- az orvosi döntés továbbra is orvosi kompetencia, az alkalmazás csak strukturált adatmegjelenítést és döntéstámogatást végez.

---

## Fájlba illesztés

A meglévő script-sorrend:

```html
<script src="js/utils.js?20260624"></script>
<script src="js/data-url.js?20260624"></script>
<script src="js/password-crypto.js?20260624"></script>
<script src="js/report.js?20260624"></script>
<script src="js/chart-plugins.js?20260624"></script>
<script src="js/charts.js?20260624"></script>
<script src="js/testdata.js?20260624"></script>
<script src="js/app.js?20260624"></script>
```

Javasolt új fájl:

```text
js/bp-profiles.js
```

Ezt a `js/data-url.js` után, de a `js/report.js` előtt kell betölteni mindkét HTML-ben (`index.html`, `kardiologusnak.html`):

```html
<script src="js/data-url.js?20260624"></script>
<script src="js/bp-profiles.js?20260624"></script>
<script src="js/password-crypto.js?20260624"></script>
```

Így a profilsegédek elérhetők lesznek a `js/report.js`, `js/chart-plugins.js`, `js/charts.js` és `js/app.js` számára is, globális függvényként, a projekt jelenlegi nem-modulos szerkezetéhez illeszkedve.

Nem javasolt új `app-state.js`, `bp-thresholds.js`, `hbpm-analysis.js` vagy `profile-modal.js` fájl bevezetése első körben, mert a projekt jelenleg nem ilyen moduláris felépítésű. Ha később nagyobb refaktor készül, ezek leválaszthatók.

---

## Profilkonfiguráció

### Központi konstansok

A `js/bp-profiles.js` fájlban:

```js
const bpProfileUrlKey="profil";
const bpProfileCustomUrlKey="profilEgyeni";
const defaultBpProfileId="standard_adult";

const BP_PROFILES={
	standard_adult:{
		id:"standard_adult",
		label:"Standard felnőtt",
		description:"Általános felnőtt HBPM-értékelés standard otthoni küszöbökkel.",
		diagnosticThresholds:{
			hbpmHighSys:135,
			hbpmHighDia:85,
			severeHighSys:180,
			severeHighDia:110,
			lowSys:90,
			lowDia:60
		},
		targetRange:{
			sysMin:null,
			sysMax:135,
			diaMin:null,
			diaMax:85
		},
		indicatorSensitivity:"standard",
		notes:"Az alapértelmezett, jelenlegi küszöblogika."
	},
	fit_elderly:{
		id:"fit_elderly",
		label:"Fitt idős páciens",
		description:"Önálló, jó funkcionális állapotú idős páciens, akinél a standard diagnosztikus küszöbök mellett szorosabb terápiás célzóna is releváns lehet.",
		diagnosticThresholds:{
			hbpmHighSys:135,
			hbpmHighDia:85,
			severeHighSys:180,
			severeHighDia:110,
			lowSys:90,
			lowDia:60
		},
		targetRange:{
			sysMin:120,
			sysMax:135,
			diaMin:70,
			diaMax:85
		},
		indicatorSensitivity:"standard",
		notes:"A diagnosztikus küszöbök nem változnak, de a terápiás célzóna külön rétegként megjelenhet."
	},
	frail_elderly:{
		id:"frail_elderly",
		label:"Törékeny idős páciens",
		description:"Idős, törékeny vagy elesésveszélyes páciens, akinél az alacsonyabb értékek és a túlkezelés jelei is fontosak lehetnek.",
		diagnosticThresholds:{
			hbpmHighSys:135,
			hbpmHighDia:85,
			severeHighSys:180,
			severeHighDia:110,
			lowSys:100,
			lowDia:60
		},
		targetRange:{
			sysMin:130,
			sysMax:150,
			diaMin:65,
			diaMax:90
		},
		indicatorSensitivity:"conservative",
		notes:"Hangsúlyosabb az alacsony vérnyomás, a nagy ingadozás és az elesésveszély szempontja."
	},
	dementia_or_cognitive_impairment:{
		id:"dementia_or_cognitive_impairment",
		label:"Demencia / kognitív érintettség",
		description:"Kognitív érintettséggel élő páciens, akinél a túl alacsony vérnyomás, a variabilitás és a mérési megbízhatóság külön figyelmet igényelhet.",
		diagnosticThresholds:{
			hbpmHighSys:135,
			hbpmHighDia:85,
			severeHighSys:180,
			severeHighDia:110,
			lowSys:100,
			lowDia:60
		},
		targetRange:{
			sysMin:130,
			sysMax:150,
			diaMin:65,
			diaMax:90
		},
		indicatorSensitivity:"conservative",
		notes:"Az automatikus elemzés külön jelezze, hogy az értelmezés orvosi egyéniesítést igényel."
	},
	custom:{
		id:"custom",
		label:"Egyéni célértékek",
		description:"A kezelőorvos által megadott vagy a felhasználó által rögzített egyéni célzónák.",
		diagnosticThresholds:{
			hbpmHighSys:135,
			hbpmHighDia:85,
			severeHighSys:180,
			severeHighDia:110,
			lowSys:90,
			lowDia:60
		},
		targetRange:{
			sysMin:null,
			sysMax:null,
			diaMin:null,
			diaMax:null
		},
		indicatorSensitivity:"custom",
		notes:"A custom profilnál külön űrlapmezőkben kell megadni a célértékeket."
	}
};
```

---

## Profil lekérése és URL-state

### Aktív profilazonosító

A projektben az URL fragmentet a `getFragmentParams()` adja vissza. Erre kell építeni:

```js
function normalizeBpProfileId(profileId){
	return BP_PROFILES[profileId] ? profileId : defaultBpProfileId;
}

function getBpProfileIdFromUrl(){
	return normalizeBpProfileId(getFragmentParams().get(bpProfileUrlKey));
}
```

Ha nincs `"profil"` kulcs a hash-ben, a visszatérési érték `"standard_adult"` legyen, de ez ne írjon automatikusan URL-t. Ez biztosítja, hogy a régi linkek változatlanul működjenek.

### Custom payload

A custom profil tömörített, base64url-kódolt JSON legyen, ugyanazzal a kódolással, amit a projekt már használ:

```js
function encodeBpProfileCustomPayload(values){
	return encodeTextForUrl(JSON.stringify({
		v:1,
		diagnosticThresholds:values.diagnosticThresholds || {},
		targetRange:values.targetRange || {}
	}));
}

function decodeBpProfileCustomPayload(encoded){
	if(!encoded)return null;
	const payload=JSON.parse(decodeTextFromUrl(encoded));
	if(payload.v!==1)return null;
	return {
		diagnosticThresholds:payload.diagnosticThresholds || {},
		targetRange:payload.targetRange || {}
	};
}

function getBpProfileCustomValuesFromUrl(){
	try{
		return decodeBpProfileCustomPayload(getFragmentParams().get(bpProfileCustomUrlKey));
	}catch(error){
		console.error("Az egyéni vérnyomásprofil nem olvasható.",error);
		return null;
	}
}
```

### Aktív profil és küszöbök

```js
function getActiveBpProfile(){
	const profileId=getBpProfileIdFromUrl();
	return BP_PROFILES[profileId] || BP_PROFILES[defaultBpProfileId];
}

function getActiveBpThresholds(){
	const profile=getActiveBpProfile();
	const customValues=profile.id==="custom" ? getBpProfileCustomValuesFromUrl() : null;

	return {
		profile,
		diagnosticThresholds:{
			...profile.diagnosticThresholds,
			...(customValues?.diagnosticThresholds || {})
		},
		targetRange:{
			...profile.targetRange,
			...(customValues?.targetRange || {})
		},
		indicatorSensitivity:profile.indicatorSensitivity
	};
}
```

### Profil mentése URL-be

Ne `updateUrlState(appState)` készüljön, mert ilyen függvény nincs. A meglévő URL-fragmentet kell módosítani úgy, hogy az `adat`, `szemely`, `kivonat`, `mod` és egyéb kulcsok megmaradjanak.

```js
function buildBpProfileUrl(profileId,customValues=null){
	const url=new URL(window.location.href);
	const fragmentParams=getFragmentParams();
	const normalizedProfileId=normalizeBpProfileId(profileId);

	fragmentParams.set(bpProfileUrlKey,normalizedProfileId);

	if(normalizedProfileId==="custom" && customValues){
		fragmentParams.set(bpProfileCustomUrlKey,encodeBpProfileCustomPayload(customValues));
	}else{
		fragmentParams.delete(bpProfileCustomUrlKey);
	}

	url.hash=fragmentParams.toString();
	return url.toString();
}

function saveBpProfile(profileId,customValues=null){
	window.history.replaceState(null,"",buildBpProfileUrl(profileId,customValues));
	renderBpProfileUi();
	rebuildAutomaticAbnormalityRegistry();
	if(currentCsvText){
		parseCSV(currentCsvText);
		updateReportControls(currentCsvText);
	}
}
```

Megjegyzés: a `parseCSV(currentCsvText)` hívás a grafikonokat újrarajzolja, az `updateReportControls(currentCsvText)` a jelentés státuszát és markdownját frissíti.

---

## Indulási logika

Nincs `initApp()` és nincs `parseStateFromUrl()`. A tényleges indulási pontok a `js/app.js` végén lévő URL/testmode betöltési logikához illesztendők, különösen:

- `testModeEnabled()`;
- `loadCsvFromTestMode()`;
- `getUrlData()`;
- `migrateQueryDataToHash(...)`;
- `parseCSV(...)`;
- `setDataControls(...)`;
- `renderDirectDataEntryStatus()`;
- `showExtractModalFromUrlIfNeeded()`.

A friss, üres állapot eldöntéséhez nem `appState.measurements`, hanem az URL-paraméterek vizsgálandók:

```js
function hasUrlCsvData(){
	const fragmentParams=getFragmentParams();
	const queryParams=new URLSearchParams(window.location.search);
	return Boolean(fragmentParams.get(urlDataKey) || queryParams.get("csv"));
}

function hasUrlBpProfile(){
	return Boolean(getFragmentParams().get(bpProfileUrlKey));
}

function shouldShowBpProfileModalOnStartup(){
	return !testModeEnabled() && !hasUrlCsvData() && !hasUrlBpProfile();
}
```

Automatikus modal csak akkor jelenjen meg, ha:

- nincs `#adat=...`;
- nincs `?csv=...` régi query adat;
- nincs `#profil=...`;
- nincs `#testmode=1`.

Ne jelenjen meg automatikusan, ha:

- megosztott CSV-linket nyitnak meg;
- titkosított linket nyitnak meg;
- kardiológiai kivonatos linket nyitnak meg;
- régi adatlinkben nincs profil, de van mérési adat.

Régi link esetén egyszerűen a `getActiveBpProfile()` fallbackje adja a standard profilt.

---

## Profilválasztó modal

### DOM és CSS nomenklatúra

A meglévő modal mintája:

- `.modal-backdrop`;
- `.modal-panel`;
- `.modal-x-button`;
- `.modal-error`;
- `.modal-actions`.

Az új modal id-jei és classai:

```html
<div class="modal-backdrop" id="bpProfileModal" hidden>
	<div class="modal-panel bp-profile-modal-panel" role="dialog" aria-modal="true" aria-labelledby="bpProfileModalTitle">
		<button type="button" class="modal-x-button" id="bpProfileCloseXButton" aria-label="Bezárás">×</button>
		<h2 id="bpProfileModalTitle">Páciensprofil kiválasztása</h2>
		<p>Válaszd ki, milyen értelmezési kerettel készüljön a HBPM-jelentés és az automatikus analitika.</p>
		<div class="bp-profile-card-list" id="bpProfileCardList"></div>
		<div class="bp-profile-custom-fields" id="bpProfileCustomFields" hidden></div>
		<p class="modal-error" id="bpProfileModalError"></p>
		<div class="modal-actions">
			<button type="button" class="secondary" id="bpProfileCancelButton">Mégsem</button>
			<button type="button" id="bpProfileSaveButton">Mentés és folytatás</button>
		</div>
	</div>
</div>
```

A modal létrehozható statikusan mindkét HTML-ben a `personDataModal` mellé, vagy dinamikusan `ensureBpProfileModal()` függvénnyel a `js/app.js`-ben. A projekt jelenlegi `ensureExtractModal()` mintája miatt a dinamikus létrehozás illeszkedik jobban.

### Profilkártyák

```html
<button type="button" class="bp-profile-card" data-bp-profile-id="standard_adult">
	<strong>Standard felnőtt</strong>
	<span>Általános HBPM-értékelés standard otthoni küszöbökkel.</span>
</button>
```

A custom mezők `name` attribútumai a konfigurációs kulcsokkal egyezzenek:

- `hbpmHighSys`;
- `hbpmHighDia`;
- `severeHighSys`;
- `severeHighDia`;
- `lowSys`;
- `lowDia`;
- `sysMin`;
- `sysMax`;
- `diaMin`;
- `diaMax`.

---

## Profilállapot megjelenítése

A meglévő felső importpanelben célszerű új dobozt hozzáadni a `person-data-box` és `data-actions-box` közé:

```html
<div class="bp-profile-box">
	<div class="bp-profile-label">Értékelési profil</div>
	<div class="bp-profile-display" id="bpProfileDisplay"></div>
	<p class="bp-profile-note" id="bpProfileNote"></p>
	<button type="button" id="openBpProfileButton">Profil módosítása</button>
</div>
```

A kapcsolódó `js/app.js` változók:

```js
const bpProfileBox=document.querySelector(".bp-profile-box");
const bpProfileDisplay=document.getElementById("bpProfileDisplay");
const bpProfileNote=document.getElementById("bpProfileNote");
const openBpProfileButton=document.getElementById("openBpProfileButton");
```

Render:

```js
function renderBpProfileUi(){
	const {profile,targetRange}=getActiveBpThresholds();
	if(bpProfileDisplay)bpProfileDisplay.textContent=profile.label;
	if(bpProfileNote){
		bpProfileNote.textContent=formatBpTargetRangeText(targetRange);
	}
}
```

---

## Bekötés a jelentésbe (`js/report.js`)

### Érintett függvények

A jelenlegi hardcoded küszöbök itt vannak:

- `calculateReportStats(text)`;
- `reportHbpmInterpretation(stats)`;
- `buildGpReportMarkdown(stats)`;
- `buildCardiologyReportMarkdown(stats)`;
- `automaticAbnormalityClinicalStatus(chartId,value,rawValues=[])`.

### `calculateReportStats(text)`

A függvény elején:

```js
const {diagnosticThresholds,targetRange,profile}=getActiveBpThresholds();
```

A visszatérési objektumba kerüljön be:

```js
bpProfile:profile,
bpDiagnosticThresholds:diagnosticThresholds,
bpTargetRange:targetRange,
```

A jelenlegi sorok:

```js
aboveDiagnosticThresholdCount:hbpmReadings.filter(reading=>reading.sys>=135 || reading.dia>=85).length,
veryHighCount:hbpmReadings.filter(reading=>reading.sys>=180 || reading.dia>=110).length,
lowCount:hbpmReadings.filter(reading=>reading.sys<90 || reading.dia<60).length,
hypertensiveEpisodeCount:reportMeasurementOccasionEpisodeCount(includedHbpmDays,reading=>reading.sys>=135 || reading.dia>=85),
hypotensiveEpisodeCount:reportMeasurementOccasionEpisodeCount(includedHbpmDays,reading=>reading.sys<90 || reading.dia<60),
```

profilfüggően:

```js
aboveDiagnosticThresholdCount:hbpmReadings.filter(reading=>reading.sys>=diagnosticThresholds.hbpmHighSys || reading.dia>=diagnosticThresholds.hbpmHighDia).length,
veryHighCount:hbpmReadings.filter(reading=>reading.sys>=diagnosticThresholds.severeHighSys || reading.dia>=diagnosticThresholds.severeHighDia).length,
lowCount:hbpmReadings.filter(reading=>reading.sys<diagnosticThresholds.lowSys || reading.dia<diagnosticThresholds.lowDia).length,
hypertensiveEpisodeCount:reportMeasurementOccasionEpisodeCount(includedHbpmDays,reading=>reading.sys>=diagnosticThresholds.hbpmHighSys || reading.dia>=diagnosticThresholds.hbpmHighDia),
hypotensiveEpisodeCount:reportMeasurementOccasionEpisodeCount(includedHbpmDays,reading=>reading.sys<diagnosticThresholds.lowSys || reading.dia<diagnosticThresholds.lowDia),
```

### `reportHbpmInterpretation(stats)`

A jelenlegi `135/85` szöveg helyett:

```js
function reportHbpmInterpretation(stats){
	if(!Number.isFinite(stats.hbpmSys) || !Number.isFinite(stats.hbpmDia))return "n/a";
	const thresholds=stats.bpDiagnosticThresholds || getActiveBpThresholds().diagnosticThresholds;
	const high=stats.hbpmSys>=thresholds.hbpmHighSys || stats.hbpmDia>=thresholds.hbpmHighDia;
	const thresholdText=`>=${thresholds.hbpmHighSys}/${thresholds.hbpmHighDia} Hgmm`;
	return high
		? `az otthoni diagnosztikus küszöböt eléri vagy meghaladja (${thresholdText}).`
		: `az otthoni diagnosztikus küszöb alatt van (<${thresholds.hbpmHighSys}/${thresholds.hbpmHighDia} Hgmm).`;
}
```

### Jelentésszöveg kiegészítése

Mindkét jelentésbe kerüljön:

```js
`Értékelési profil: ${stats.bpProfile?.label || getActiveBpProfile().label}`,
```

A fix szövegek:

- `135/85 Hgmm küszöb feletti egyedi mérések aránya`;
- `135/85 Hgmm küszöb feletti mérések aránya`;
- `SYS >=180 vagy DIA >=110 Hgmm`;
- `SYS <90 vagy DIA <60 Hgmm`.

Ezek a `stats.bpDiagnosticThresholds` értékeiből épüljenek.

---

## Bekötés az automatikus analitikába

A `js/report.js` automatikus abnormalitásai jelenleg vegyesen klinikai és statisztikai szabályok:

- `automaticAbnormalityClinicalStatus(chartId,value,rawValues=[])`;
- `buildAutomaticAbnormalitiesFromDays(days)`;
- `automaticAbnormalityAddVariability(...)`;
- `automaticAbnormalityAddDailyAmplitude(...)`;
- `automaticAbnormalityAddOutliers(...)`;
- `automaticAbnormalityAddBollinger(...)`;
- `automaticAbnormalityAddRsi(...)`.

A diagnosztikus klinikai besorolás profilfüggő legyen, de a statisztikai szabályok (`sd`, `cv`, `IQR`, Bollinger, RSI) maradhatnak változatlanok első implementációban.

`automaticAbnormalityClinicalStatus()` ne amerikai rendelői sávokat (`120/130/140`, `80/90`) használjon vérnyomásra, hanem az aktív HBPM-profil alacsony/magas/súlyos küszöbeit:

```js
function automaticAbnormalityClinicalStatus(chartId,value,rawValues=[]){
	const values=reportFiniteNumbers(rawValues).length ? reportFiniteNumbers(rawValues) : reportFiniteNumbers([value]);
	const thresholds=getActiveBpThresholds().diagnosticThresholds;
	if(!values.length)return {type:"statistical",label:"Statisztikai abnormalitás"};
	if(chartId==="sysChart"){
		const high=Math.max(...values);
		const low=Math.min(...values);
		if(high>=thresholds.severeHighSys)return {type:"clinical",label:"Súlyosan magas SYS-sáv"};
		if(high>=thresholds.hbpmHighSys)return {type:"clinical",label:"Otthoni küszöb feletti SYS-sáv"};
		if(low<thresholds.lowSys)return {type:"clinical",label:"Alacsony SYS-sáv"};
	}
	if(chartId==="diaChart"){
		const high=Math.max(...values);
		const low=Math.min(...values);
		if(high>=thresholds.severeHighDia)return {type:"clinical",label:"Súlyosan magas DIA-sáv"};
		if(high>=thresholds.hbpmHighDia)return {type:"clinical",label:"Otthoni küszöb feletti DIA-sáv"};
		if(low<thresholds.lowDia)return {type:"clinical",label:"Alacsony DIA-sáv"};
	}
	if(chartId==="pulseChart"){
		if(Math.max(...values)>=90)return {type:"clinical",label:"Emelkedett pulzussáv"};
	}
	return {type:"statistical",label:"Klinikai sávon kívüli statisztikai jelzés"};
}
```

A kardiológiai érzékenység slider továbbra is a meglévő `automaticAbnormalitySdMultiplierValue` változót használja. A profil `indicatorSensitivity` mezője első körben ne írja felül automatikusan a slider értékét; legfeljebb induló defaultként alkalmazható, ha nincs kézi módosítás.

---

## Bekötés a grafikonháttérbe

A klinikai sávok jelenlegi helye:

```js
// js/chart-plugins.js
const clinicalRanges={
	"Szisztolés":[
		{from:120,to:130,color:"rgba(255,70,70,.08)",label:"Emelkedett"},
		{from:130,to:140,color:"rgba(255,70,70,.14)",label:"1. HT"},
		{from:140,to:Infinity,color:"rgba(255,70,70,.22)",label:"2. HT"}
	],
	"Diasztolés":[
		{from:80,to:90,color:"rgba(255,70,70,.14)",label:"1. HT"},
		{from:90,to:Infinity,color:"rgba(255,70,70,.22)",label:"2. HT"}
	],
	"Pulzus":[
		{from:90,to:Infinity,color:"rgba(255,70,70,.10)",label:"90 felett"}
	]
};
```

Ezt statikus objektum helyett függvénnyé kell alakítani:

```js
function getClinicalRanges(){
	const {diagnosticThresholds,targetRange}=getActiveBpThresholds();
	return {
		"Szisztolés":[
			{from:0,to:diagnosticThresholds.lowSys,color:"rgba(70,130,255,.10)",label:"Alacsony"},
			...(Number.isFinite(targetRange.sysMin) && Number.isFinite(targetRange.sysMax)
				? [{from:targetRange.sysMin,to:targetRange.sysMax,color:"rgba(30,160,90,.10)",label:"Célzóna"}]
				: []),
			{from:diagnosticThresholds.hbpmHighSys,to:diagnosticThresholds.severeHighSys,color:"rgba(255,70,70,.14)",label:"Otthoni küszöb felett"},
			{from:diagnosticThresholds.severeHighSys,to:Infinity,color:"rgba(255,70,70,.22)",label:"Súlyosan magas"}
		],
		"Diasztolés":[
			{from:0,to:diagnosticThresholds.lowDia,color:"rgba(70,130,255,.10)",label:"Alacsony"},
			...(Number.isFinite(targetRange.diaMin) && Number.isFinite(targetRange.diaMax)
				? [{from:targetRange.diaMin,to:targetRange.diaMax,color:"rgba(30,160,90,.10)",label:"Célzóna"}]
				: []),
			{from:diagnosticThresholds.hbpmHighDia,to:diagnosticThresholds.severeHighDia,color:"rgba(255,70,70,.14)",label:"Otthoni küszöb felett"},
			{from:diagnosticThresholds.severeHighDia,to:Infinity,color:"rgba(255,70,70,.22)",label:"Súlyosan magas"}
		],
		"Pulzus":[
			{from:90,to:Infinity,color:"rgba(255,70,70,.10)",label:"90 felett"}
		]
	};
}
```

Ahol jelenleg `clinicalRanges[measureKey]` szerepel, ott `getClinicalRanges()[measureKey]` legyen.

---

## URL-kompatibilitás

Példák a tényleges projekt szerinti URL-fragmentre:

```text
#adat=...&profil=standard_adult
```

Titkosított adat mellett:

```text
#adat=...&mod=encrypted&profil=frail_elderly
```

Személyes adattal és kardiológiai kivonattal:

```text
#adat=...&szemely=...&kivonat=sysChart:12,diaChart:12&profil=fit_elderly
```

Custom profilnál:

```text
#adat=...&profil=custom&profilEgyeni=...
```

Régi linkek:

- ha nincs `profil`, a runtime fallback `standard_adult`;
- nem kell az URL-t automatikusan átírni;
- adat, személy és kivonat kulcsok nem veszhetnek el.

---

## Validáció

Custom mezők:

- SYS értékek: `70-240`;
- DIA értékek: `40-140`;
- `sysMin < sysMax`, ha mindkettő ki van töltve;
- `diaMin < diaMax`, ha mindkettő ki van töltve;
- `severeHighSys > hbpmHighSys`;
- `severeHighDia > hbpmHighDia`;
- `lowSys < hbpmHighSys`;
- `lowDia < hbpmHighDia`.

Hibás URL custom payload esetén:

- `console.error(...)`;
- fallback a profil default értékeire;
- a felület opcionálisan jelezheti: `Az egyéni profilbeállítás nem volt olvasható, ezért a standard értékek érvényesek.`

---

## Minimális implementációs sorrend

1. `js/bp-profiles.js` létrehozása a fenti konstansokkal és segédfüggvényekkel.
2. `index.html` és `kardiologusnak.html` script-sorrend kiegészítése `js/bp-profiles.js` betöltéssel.
3. `js/data-url.js` érintetlenül hagyása, a profil URL-kezelést az új fájlban a meglévő `getFragmentParams()`, `encodeTextForUrl()` és `decodeTextFromUrl()` függvényekre építeni.
4. `js/app.js` profilmodal és `bp-profile-box` renderelés hozzáadása.
5. Induláskor `shouldShowBpProfileModalOnStartup()` meghívása a meglévő URL/testmode inicializáció után.
6. `js/report.js` `calculateReportStats()`, `reportHbpmInterpretation()`, `buildGpReportMarkdown()` és `buildCardiologyReportMarkdown()` függvények profilfüggővé tétele.
7. `js/report.js` `automaticAbnormalityClinicalStatus()` küszöbeinek profilfüggővé tétele.
8. `js/chart-plugins.js` `clinicalRanges` objektumának `getClinicalRanges()` függvénnyé alakítása.
9. Profilváltáskor `parseCSV(currentCsvText)` és `updateReportControls(currentCsvText)` meghívása.
10. Régi linkek ellenőrzése: `#adat` van, `#profil` nincs, és a működés változatlanul `standard_adult`.

---

## Rövid klinikai figyelmeztető szöveg

```text
A kiválasztott profil az automatikus elemzés értelmezési keretét állítja be. A profil nem diagnózis, és nem helyettesíti az orvosi döntést. Egyéni célértékeket kizárólag kezelőorvosi javaslat alapján érdemes megadni.
```

---

## Végső elv

A profilrendszer ne írja felül észrevétlenül az orvosi küszöböket. Külön rétegként kezelje:

1. diagnosztikus HBPM-küszöbök;
2. profil vagy orvos szerinti célzóna;
3. statisztikai eltérés a személyes mintázattól;
4. biztonsági figyelmeztetések, például extrém magas vagy alacsony értékek.

Így ugyanaz az adat több szinten értelmezhető:

```text
Klinikailag küszöb felett van-e?
A páciens célzónájában van-e?
Szokatlan-e a saját korábbi mintázatához képest?
Van-e biztonsági szempontból kiemelendő érték?
```
