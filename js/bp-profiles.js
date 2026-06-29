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
			sysMax:null,
			diaMin:null,
			diaMax:null
		},
		indicatorSensitivity:"standard",
		notes:"Az alapértelmezett, jelenlegi diagnosztikus HBPM-küszöblogika külön terápiás célzóna nélkül."
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
		description:"Kezelőorvos által megadott egyéni terápiás célzóna; a diagnosztikus HBPM-küszöbök változatlanok maradnak.",
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
		notes:"A custom profilnál célzónát kell megadni; diagnosztikus küszöböt csak szakmai felülvizsgálattal szabadna módosítani."
	}
};

function normalizeBpProfileId(profileId){
	return BP_PROFILES[profileId] ? profileId : defaultBpProfileId;
}

function getBpProfileIdFromUrl(){
	return normalizeBpProfileId(getFragmentParams().get(bpProfileUrlKey));
}

function encodeBpProfileCustomPayload(values){
	return encodeTextForUrl(JSON.stringify({
		v:1,
		targetRange:values?.targetRange || {}
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

function finiteBpProfileNumber(value){
	if(value===null || value===undefined || value==="")return null;
	const number=Number(value);
	return Number.isFinite(number) ? number : null;
}

function cleanBpThresholdValues(values){
	const cleaned={};
	Object.entries(values || {}).forEach(([key,value])=>{
		const number=finiteBpProfileNumber(value);
		if(number!==null)cleaned[key]=number;
	});
	return cleaned;
}

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
			...profile.diagnosticThresholds
		},
		targetRange:{
			...profile.targetRange,
			...cleanBpThresholdValues(customValues?.targetRange)
		},
		indicatorSensitivity:profile.indicatorSensitivity
	};
}

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

function hasUrlBpProfile(){
	return Boolean(getFragmentParams().get(bpProfileUrlKey));
}

function hasUrlCsvData(){
	const fragmentParams=getFragmentParams();
	const queryParams=new URLSearchParams(window.location.search);
	return Boolean(fragmentParams.get(urlDataKey) || queryParams.get("csv"));
}

function shouldShowBpProfileModalOnStartup(){
	return typeof testModeEnabled==="function" && testModeEnabled()
		? false
		: !hasUrlCsvData() && !hasUrlBpProfile();
}

function formatBpRangeValue(value){
	const number=finiteBpProfileNumber(value);
	return number!==null ? String(Math.round(number)) : "";
}

function formatBpTargetRangeText(targetRange){
	const sysMin=formatBpRangeValue(targetRange?.sysMin);
	const sysMax=formatBpRangeValue(targetRange?.sysMax);
	const diaMin=formatBpRangeValue(targetRange?.diaMin);
	const diaMax=formatBpRangeValue(targetRange?.diaMax);
	if(!sysMin && !sysMax && !diaMin && !diaMax)return "Nincs külön célzóna megadva.";
	return `Célzóna: SYS ${sysMin || "-"}-${sysMax || "-"}, DIA ${diaMin || "-"}-${diaMax || "-"} Hgmm`;
}

function hasBpTargetRange(targetRange){
	return Number.isFinite(finiteBpProfileNumber(targetRange?.sysMin))
		|| Number.isFinite(finiteBpProfileNumber(targetRange?.sysMax))
		|| Number.isFinite(finiteBpProfileNumber(targetRange?.diaMin))
		|| Number.isFinite(finiteBpProfileNumber(targetRange?.diaMax));
}

function bpThresholdText(thresholds,keySys,keyDia,operator=""){
	return `${operator}${thresholds[keySys]}/${thresholds[keyDia]} Hgmm`;
}
