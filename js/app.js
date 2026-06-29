const charts=[];
const csvFileInput=document.getElementById("csvFile");
const sampleCsvLink=document.querySelector(".minta");
const dataActions=document.getElementById("dataActions");
const encryptDataButton=document.getElementById("encryptDataButton");
const downloadCsvButton=document.getElementById("downloadCsvButton");
const reportStatus=document.getElementById("reportStatus");
const reportPanel=document.getElementById("reportPanel");
const reportText=document.getElementById("reportText");
const copyReportButton=document.getElementById("copyReportButton");
const passwordModal=document.getElementById("passwordModal");
const passwordModalTitle=document.getElementById("passwordModalTitle");
const passwordModalText=document.getElementById("passwordModalText");
const passwordInput=document.getElementById("passwordInput");
const passwordRules=document.getElementById("passwordRules");
const passwordModalError=document.getElementById("passwordModalError");
const passwordCancelButton=document.getElementById("passwordCancelButton");
const passwordConfirmButton=document.getElementById("passwordConfirmButton");
const personDataBox=document.querySelector(".person-data-box");
const personDataDisplay=document.getElementById("personDataDisplay");
const personDataNote=document.getElementById("personDataNote");
const openPersonDataButton=document.getElementById("openPersonDataButton");
const bpProfileBox=document.querySelector(".bp-profile-box");
const bpProfileDisplay=document.getElementById("bpProfileDisplay");
const bpProfileNote=document.getElementById("bpProfileNote");
const openBpProfileButton=document.getElementById("openBpProfileButton");
const personDataModal=document.getElementById("personDataModal");
const personNicknameInput=document.getElementById("personNicknameInput");
const personSexInput=document.getElementById("personSexInput");
const personAgeInput=document.getElementById("personAgeInput");
const personDataCloseButton=document.getElementById("personDataCloseButton");
const personDataSaveButton=document.getElementById("personDataSaveButton");
const directDataEntryBox=document.querySelector(".direct-data-entry-box");
const directDataEntryStatus=document.getElementById("directDataEntryStatus");
const openDirectDataEntryButton=document.getElementById("openDirectDataEntryButton");
const directDataEntryModal=document.getElementById("directDataEntryModal");
const directDataEntryCloseXButton=document.getElementById("directDataEntryCloseXButton");
const directEntryDateInput=document.getElementById("directEntryDateInput");
const directEntryPrevDayButton=document.getElementById("directEntryPrevDayButton");
const directEntryNextDayButton=document.getElementById("directEntryNextDayButton");
const directEntryTodayButton=document.getElementById("directEntryTodayButton");
const directEntryDatePreview=document.getElementById("directEntryDatePreview");
const directEntryRows={
	REG:document.getElementById("directEntryRegRow"),
	DEL:document.getElementById("directEntryDelRow"),
	ESTE:document.getElementById("directEntryEsteRow")
};
const directDataEntryError=document.getElementById("directDataEntryError");
const directDataEntryRecordButton=document.getElementById("directDataEntryRecordButton");
const directDataEntrySaveUrlButton=document.getElementById("directDataEntrySaveUrlButton");
let directEntryBaselineValues=[];
let directEntryBaselineDateInputValue="";
let sampleCsvTimer;
let currentCsvText="";
let savedCsvText="";
let currentUrlMode="";
let currentReportMarkdown="";
let currentPersonData=null;
let hasUnsavedDirectData=false;
let extractOpenedFromUrl=false;
let chartScrubHandPreference="";
let automaticAbnormalitySdMultiplierValue=2;
const extractEventIds=new Set();
const extractEventRegistry=new Map();
const automaticAbnormalityRegistry=new Map();
const urlDataKey="adat";
const hbpmUnavailableText="Az irányelvi HBPM-jelentéshez az első nap kihagyása után legalább 3 értékelhető nap és legalább 12 reggeli/esti vérnyomásmérés szükséges. Ideális a 7 napos protokoll.";
const directCsvHeader=["Unnamed: 0","REG 1 SYS","REG 1 DIA","REG 1 P","REG 2 SYS","REG 2 DIA","REG 2 P","DÉL 1 SYS","DÉL 1 DIA","DÉL 1 P","DÉL 2 SYS","DÉL 2 DIA","DÉL 2 P","ESTE 1 SYS","ESTE 1 DIA","ESTE 1 P","ESTE 2 SYS","ESTE 2 DIA","ESTE 2 P"];
const directMeasurementGroups=[
	{label:"REG 1",slotKey:"REG",reading:1,start:1},
	{label:"REG 2",slotKey:"REG",reading:2,start:4},
	{label:"DÉL 1",slotKey:"DEL",reading:1,start:7},
	{label:"DÉL 2",slotKey:"DEL",reading:2,start:10},
	{label:"ESTE 1",slotKey:"ESTE",reading:1,start:13},
	{label:"ESTE 2",slotKey:"ESTE",reading:2,start:16}
];

const themePreferenceKey="vernyomas-theme";

function preferredDarkMode(){
	const saved=localStorage.getItem(themePreferenceKey);
	if(saved==="dark")return true;
	if(saved==="light")return false;
	return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches || false;
}

function applyThemePreference(){
	document.body.classList.toggle("dark",preferredDarkMode());
	updateThemeToggleButton();
	if(Array.isArray(charts)){
		charts.forEach(chart=>chart.update("none"));
	}
}

function updateThemeToggleButton(){
	const button=document.getElementById("themeToggleButton");
	if(!button)return;
	const isDark=document.body.classList.contains("dark");
	button.classList.toggle("is-dark",isDark);
	button.setAttribute("aria-pressed",isDark ? "true" : "false");
	button.title=isDark ? "Világos mód" : "Sötét mód";
	button.setAttribute("aria-label",button.title);
}

function setupThemeToggle(){
	applyThemePreference();

	let button=document.getElementById("themeToggleButton");
	if(!button){
		button=document.createElement("button");
		button.type="button";
		button.id="themeToggleButton";
		button.className="theme-toggle-button";
		button.innerHTML='<span class="theme-toggle-track"><span class="theme-toggle-knob"></span></span>';
		document.body.appendChild(button);
	}

	button.addEventListener("click",()=>{
		const nextDark=!document.body.classList.contains("dark");
		localStorage.setItem(themePreferenceKey,nextDark ? "dark" : "light");
		applyThemePreference();
	});
	updateThemeToggleButton();

	window.matchMedia?.("(prefers-color-scheme: dark)")?.addEventListener?.("change",()=>{
		if(!localStorage.getItem(themePreferenceKey)){
			applyThemePreference();
		}
	});
}

setupThemeToggle();

function getReportMode(){
	const declaredMode=document.documentElement.dataset.reportMode;
	if(declaredMode==="cardiology" || declaredMode==="gp")return declaredMode;
	const activeMode=document.querySelector(".mode-option.is-active");
	if(activeMode?.dataset.modeTarget==="kardiologusnak.html")return "cardiology";
	if(activeMode?.dataset.modeTarget==="index.html")return "gp";
	return window.location.pathname.includes("kardiologusnak.html") ? "cardiology" : "gp";
}

function reportModeLabel(){
	return getReportMode()==="cardiology" ? "Kardiológus-mód" : "Háziorvos-mód";
}

function setupModeSwitch(){
	document.querySelectorAll(".mode-option").forEach(button=>{
		button.addEventListener("click",()=>{
			const target=button.dataset.modeTarget;
			if(!target || button.classList.contains("is-active"))return;
			if(!persistPendingStateToUrl())return;

			const url=new URL(window.location.href);
			url.pathname=url.pathname.replace(/[^/]*$/,target);
			window.location.href=url.toString();
		});
	});
}

setupModeSwitch();

function setupTutorialClickForwarding(){
	document.querySelectorAll(".tutorial-box").forEach(tutorial=>{
		tutorial.addEventListener("click",event=>{
			if(event.target.closest?.("a"))return;
			const link=tutorial.querySelector("a");
			if(!link)return;
			link.click();
		});
	});
}

setupTutorialClickForwarding();

if(window.Chart?.Tooltip?.positioners){
	function legacyLeftOfPointTooltipPosition(items,eventPosition){
		const point=Chart.Tooltip.positioners.nearest.call(this,items,eventPosition);
		if(!point)return eventPosition;
		return {
			x:point.x-18,
			y:point.y,
			xAlign:"right",
			yAlign:"center"
		};
	}

	function detailTooltipRaw(items){
		const item=items?.[0];
		if(!item)return null;
		const chart=this.chart;
		const dataset=chart?.data?.datasets?.[item.datasetIndex];
		return dataset?.data?.[item.index] || item.element?.$context?.raw || null;
	}

	function detailTooltipDefaultRange(raw){
		const ranges=typeof chartDefaultYRanges==="object" ? chartDefaultYRanges : null;
		return ranges?.[raw?.measureKey] || null;
	}

	function detailTooltipValueRange(raw){
		if(!raw)return null;
		const min=Number.isFinite(raw.min) ? raw.min : Math.min(raw.first,raw.second,raw.avg);
		const max=Number.isFinite(raw.max) ? raw.max : Math.max(raw.first,raw.second,raw.avg);
		return Number.isFinite(min) && Number.isFinite(max) ? {min,max} : null;
	}

	function detailTooltipFixedY(tooltip,chartArea,placement){
		const halfHeight=Number.isFinite(tooltip?.height) && tooltip.height>0
			? tooltip.height/2
			: 44;
		const margin=8;
		return placement==="top"
			? chartArea.top+halfHeight+margin
			: chartArea.bottom-halfHeight-margin;
	}

	Chart.Tooltip.positioners.leftOfPoint=legacyLeftOfPointTooltipPosition;

	Chart.Tooltip.positioners.detailTooltipPositioner=function(items,eventPosition){
		const point=Chart.Tooltip.positioners.nearest.call(this,items,eventPosition);
		const chart=this.chart;
		const raw=detailTooltipRaw.call(this,items);
		const valueRange=detailTooltipValueRange(raw);
		const defaultRange=detailTooltipDefaultRange(raw);
		const chartArea=chart?.chartArea;
		const yScale=chart?.scales?.y;
		const fallback=()=>legacyLeftOfPointTooltipPosition.call(this,items,eventPosition);

		if(!point || !chartArea || !yScale || !valueRange || !defaultRange){
			return fallback();
		}

		if(valueRange.min<defaultRange.min || valueRange.max>defaultRange.max){
			return fallback();
		}

		const rangeTop=yScale.getPixelForValue(valueRange.max);
		const rangeBottom=yScale.getPixelForValue(valueRange.min);
		const spaceAbove=rangeTop-chartArea.top;
		const spaceBelow=chartArea.bottom-rangeBottom;

		if(spaceAbove>spaceBelow){
			return {
				x:point.x-18,
				y:detailTooltipFixedY(this,chartArea,"top"),
				xAlign:"right",
				yAlign:"center"
			};
		}else if(spaceBelow>spaceAbove){
			return {
				x:point.x-18,
				y:detailTooltipFixedY(this,chartArea,"bottom"),
				xAlign:"right",
				yAlign:"center"
			};
		}

		return fallback();
	};
}

function showSampleCsvLink(){
	sampleCsvLink.classList.add("is-visible");
	clearTimeout(sampleCsvTimer);
	sampleCsvTimer=setTimeout(()=>{
		sampleCsvLink.classList.remove("is-visible");
	},10000);
}

csvFileInput.addEventListener("mouseenter",showSampleCsvLink);
csvFileInput.addEventListener("focus",showSampleCsvLink);

csvFileInput.addEventListener("change",e=>{

	const file=e.target.files[0];
	if(!file)return;

	const reader=new FileReader();

	reader.onload=async()=>{
		const keepExtract=await confirmKeepExtractEventsForNewCsv();
		saveUploadedCsvToUrl(reader.result,{keepExtract});
	};

	reader.readAsText(file,"utf-8");
});

encryptDataButton.addEventListener("click",async()=>{
	if(!syncDirectEntryFieldsBeforePersistence({reloadSelectedDate:false}))return;
	if(!currentCsvText)return;

	try{
		const password=await requestPassword({
			title:"Adatok titkosítása",
			text:"Adj meg egy erős jelszót. A jelszó nem kerül mentésre, ezért a link későbbi megnyitásához pontosan erre lesz szükség.",
			confirmText:"Titkosítás",
			requireStrong:true
		});

		if(!password)return;

		setSourceStatus("Titkosítás folyamatban...");
		const encrypted=await encryptCsv(currentCsvText,password);
		putEncryptedCsvIntoUrl(encrypted);
	}catch(error){
		setSourceStatus("A titkosítás nem sikerült.");
		console.error(error);
	}
});

downloadCsvButton.addEventListener("click",async()=>{
	try{
		if(!syncDirectEntryFieldsBeforePersistence({reloadSelectedDate:false}))return;
		const csv=await getCsvForDownload();
		if(csv){
			downloadCsv(csv,buildCsvDownloadFilename());
		}
	}catch(error){
		setSourceStatus("A CSV letöltéséhez nem sikerült visszafejteni az adatokat.");
		console.error(error);
	}
});

copyReportButton.addEventListener("click",async()=>{
	if(!reportText.value)return;

	const originalText=copyReportButton.textContent;

	try{
		await navigator.clipboard.writeText(reportText.value);
		copyReportButton.textContent="Másolva";
		setTimeout(()=>{
			copyReportButton.textContent=originalText;
		},1600);
	}catch(error){
		reportText.focus();
		reportText.select();
	}
});

function normalizePersonData(personData){
	return {
		nickname:(personData?.nickname || "").trim(),
		sex:(personData?.sex || "").trim(),
		age:(personData?.age || "").replace(/\D/g,"").trim()
	};
}

function formatPersonData(personData){
	return [personData.nickname,personData.sex,personData.age].filter(Boolean).join(" – ");
}

function formatCsvDownloadTimestamp(date=new Date()){
	const pad=value=>String(value).padStart(2,"0");
	return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

function sanitizeFilenamePart(value){
	return String(value || "")
		.replace(/[<>:"/\\|?*\u0000-\u001f]/g,"-")
		.replace(/\s+/g," ")
		.trim();
}

function formatCsvDownloadPersonLabel(personData){
	const details=[];
	if(personData.sex){
		details.push(personData.sex);
	}
	if(personData.age){
		details.push(`(${personData.age})`);
	}

	if(personData.nickname && details.length){
		return `${personData.nickname}, ${details.join(" ")}`;
	}

	return personData.nickname || details.join(" ") || "vérnyomásnapló";
}

function buildCsvDownloadFilename(){
	const personLabel=sanitizeFilenamePart(formatCsvDownloadPersonLabel(normalizePersonData(currentPersonData)));
	const timestamp=formatCsvDownloadTimestamp();
	return `${personLabel} – vérnyomásnapló – ${timestamp}.csv`;
}

function renderPersonData(){
	if(!personDataBox || !personDataDisplay || !openPersonDataButton)return;

	const personData=normalizePersonData(currentPersonData);
	const displayText=formatPersonData(personData);

	personDataDisplay.textContent=displayText;
	personDataBox.classList.toggle("has-person-data",Boolean(displayText));
	openPersonDataButton.textContent=displayText ? "Becenév módosítása" : "Becenév megadása";

	if(personDataNote){
		personDataNote.hidden=Boolean(displayText);
	}
}

function openPersonDataModal(){
	if(!personDataModal || !personNicknameInput || !personSexInput || !personAgeInput)return;

	const personData=normalizePersonData(currentPersonData);
	personNicknameInput.value=personData.nickname;
	personSexInput.value=personData.sex;
	personAgeInput.value=personData.age;
	personDataModal.hidden=false;
	personNicknameInput.focus();
}

function closePersonDataModal(){
	if(personDataModal){
		personDataModal.hidden=true;
	}
}

function savePersonData(){
	const personData=normalizePersonData({
		nickname:personNicknameInput.value,
		sex:personSexInput.value,
		age:personAgeInput.value
	});
	const targetUrl=buildPersonDataUrl(personData);

	window.location.href=targetUrl;
	window.location.reload();
}

function setupPersonData(){
	if(!personDataBox)return;

	currentPersonData=getPersonDataFromUrl();
	renderPersonData();

	if(!personDataModal || !personNicknameInput || !personSexInput || !personAgeInput || !personDataCloseButton || !personDataSaveButton)return;

	openPersonDataButton.addEventListener("click",openPersonDataModal);
	personDataCloseButton.addEventListener("click",closePersonDataModal);
	personDataSaveButton.addEventListener("click",savePersonData);
	personAgeInput.addEventListener("input",()=>{
		personAgeInput.value=personAgeInput.value.replace(/\D/g,"");
	});
	personDataModal.addEventListener("click",event=>{
		if(event.target===personDataModal){
			closePersonDataModal();
		}
	});
	document.addEventListener("keydown",event=>{
		if(event.key==="Escape" && !personDataModal.hidden){
			closePersonDataModal();
		}
	});
}

setupPersonData();

function renderBpProfileUi(){
	if(!bpProfileBox)return;

	const {profile,targetRange}=getActiveBpThresholds();
	bpProfileDisplay.textContent=profile.label;
	bpProfileNote.textContent=formatBpTargetRangeText(targetRange);
	bpProfileBox.classList.toggle("has-bp-profile",true);
}

function bpProfileNumberInput(name,label,value,min,max){
	const normalizedValue=Number.isFinite(Number(value)) ? Math.round(Number(value)) : "";
	return `
		<label>
			${label}
			<input type="number" inputmode="numeric" name="${name}" min="${min}" max="${max}" step="1" value="${normalizedValue}">
		</label>
	`;
}

function activeBpProfileCustomValues(profileId){
	if(profileId==="custom" && getActiveBpProfile().id!=="custom"){
		const profile=BP_PROFILES.custom;
		return {
			diagnosticThresholds:profile.diagnosticThresholds,
			targetRange:profile.targetRange
		};
	}
	const {diagnosticThresholds,targetRange}=getActiveBpThresholds();
	return {diagnosticThresholds,targetRange};
}

function ensureBpProfileModal(){
	let modal=document.getElementById("bpProfileModal");
	if(modal)return modal;

	modal=document.createElement("div");
	modal.className="modal-backdrop";
	modal.id="bpProfileModal";
	modal.hidden=true;
	modal.innerHTML=`
		<div class="modal-panel bp-profile-modal-panel" role="dialog" aria-modal="true" aria-labelledby="bpProfileModalTitle">
			<button type="button" class="modal-x-button" id="bpProfileCloseXButton" aria-label="Bezárás">×</button>
			<h2 id="bpProfileModalTitle">Páciensprofil kiválasztása</h2>
			<p>Válaszd ki, milyen értelmezési kerettel készüljön a HBPM-jelentés és az automatikus analitika. Ha nem vagy biztos benne, hagyd így, az orvos később is módosíthatja. A módosítás a webcímben tárolódik, tehát érdemes ügyelni arra, hogy a páciens frissítse a webcímet a könyvjelzőjében.</p>
			<div class="bp-profile-card-list" id="bpProfileCardList"></div>
			<div class="bp-profile-custom-fields" id="bpProfileCustomFields" hidden></div>
			<p class="modal-error" id="bpProfileModalError"></p>
			<div class="modal-actions">
				<button type="button" class="secondary" id="bpProfileCancelButton">Mégsem</button>
				<button type="button" id="bpProfileSaveButton">Mentés és folytatás</button>
			</div>
		</div>
	`;
	document.body.appendChild(modal);

	const closeAsStandard=()=>{
		if(!hasUrlBpProfile()){
			saveBpProfile(defaultBpProfileId);
		}
		closeBpProfileModal();
	};

	modal.addEventListener("click",event=>{
		if(event.target===modal){
			closeAsStandard();
		}
		const card=event.target.closest?.(".bp-profile-card");
		if(card){
			selectBpProfileInModal(card.dataset.bpProfileId);
		}
	});
	modal.querySelector("#bpProfileCloseXButton").addEventListener("click",closeAsStandard);
	modal.querySelector("#bpProfileCancelButton").addEventListener("click",closeAsStandard);
	modal.querySelector("#bpProfileSaveButton").addEventListener("click",saveBpProfileFromModal);
	document.addEventListener("keydown",event=>{
		if(event.key==="Escape" && !modal.hidden){
			closeAsStandard();
		}
	});

	return modal;
}

function renderBpProfileCards(selectedProfileId){
	const modal=ensureBpProfileModal();
	const list=modal.querySelector("#bpProfileCardList");
	list.innerHTML=Object.values(BP_PROFILES).map(profile=>`
		<button type="button" class="bp-profile-card${profile.id===selectedProfileId ? " is-selected" : ""}" data-bp-profile-id="${profile.id}" aria-pressed="${profile.id===selectedProfileId ? "true" : "false"}">
			<strong>${profile.label}</strong>
			<span>${profile.description}</span>
		</button>
	`).join("");
}

function renderBpProfileCustomFields(profileId){
	const modal=ensureBpProfileModal();
	const fields=modal.querySelector("#bpProfileCustomFields");
	const values=activeBpProfileCustomValues(profileId);
	const target=values.targetRange;

	fields.hidden=profileId!=="custom";
	if(profileId!=="custom"){
		fields.innerHTML="";
		return;
	}

	fields.innerHTML=`
		<h3>Egyéni terápiás célzóna</h3>
		<p>A diagnosztikus HBPM-küszöbök változatlanok maradnak; itt az orvosi célzóna adható meg külön értelmezési rétegként.</p>
		<div class="bp-profile-custom-grid">
			${bpProfileNumberInput("sysMin","Cél SYS minimum",target.sysMin,70,240)}
			${bpProfileNumberInput("sysMax","Cél SYS maximum",target.sysMax,70,240)}
			${bpProfileNumberInput("diaMin","Cél DIA minimum",target.diaMin,40,140)}
			${bpProfileNumberInput("diaMax","Cél DIA maximum",target.diaMax,40,140)}
		</div>
	`;
}

function selectedBpProfileIdInModal(){
	return ensureBpProfileModal().dataset.selectedBpProfileId || getActiveBpProfile().id;
}

function selectBpProfileInModal(profileId){
	const normalizedProfileId=normalizeBpProfileId(profileId);
	const modal=ensureBpProfileModal();
	modal.dataset.selectedBpProfileId=normalizedProfileId;
	renderBpProfileCards(normalizedProfileId);
	renderBpProfileCustomFields(normalizedProfileId);
	modal.querySelector("#bpProfileModalError").textContent="";
}

function openBpProfileModal({startup=false}={}){
	const modal=ensureBpProfileModal();
	modal.dataset.startup=startup ? "1" : "0";
	selectBpProfileInModal(getActiveBpProfile().id);
	modal.hidden=false;
	modal.querySelector(".bp-profile-card.is-selected")?.focus();
}

function closeBpProfileModal(){
	const modal=document.getElementById("bpProfileModal");
	if(modal)modal.hidden=true;
}

function readBpProfileCustomValuesFromModal(){
	const modal=ensureBpProfileModal();
	const numberValue=name=>{
		const input=modal.querySelector(`#bpProfileCustomFields [name="${name}"]`);
		const value=String(input?.value || "").trim();
		if(!value)return null;
		const number=Number(value);
		return Number.isFinite(number) ? number : null;
	};

	return {
		diagnosticThresholds:BP_PROFILES.custom.diagnosticThresholds,
		targetRange:{
			sysMin:numberValue("sysMin"),
			sysMax:numberValue("sysMax"),
			diaMin:numberValue("diaMin"),
			diaMax:numberValue("diaMax")
		}
	};
}

function validateBpProfileCustomValues(values){
	const {targetRange:target}=values;
	const errors=[];
	const requireRange=(value,min,max,label)=>{
		if(value===null){
			errors.push(`${label} megadása kötelező.`);
		}else if(value<min || value>max){
			errors.push(`${label}: ${min}-${max} közötti érték szükséges.`);
		}
	};

	requireRange(target.sysMin,70,240,"Cél SYS minimum");
	requireRange(target.sysMax,70,240,"Cél SYS maximum");
	requireRange(target.diaMin,40,140,"Cél DIA minimum");
	requireRange(target.diaMax,40,140,"Cél DIA maximum");
	if(target.sysMin!==null && target.sysMax!==null && target.sysMin>=target.sysMax)errors.push("A cél SYS minimumnak kisebbnek kell lennie a maximumnál.");
	if(target.diaMin!==null && target.diaMax!==null && target.diaMin>=target.diaMax)errors.push("A cél DIA minimumnak kisebbnek kell lennie a maximumnál.");

	return errors;
}

function saveBpProfile(profileId,customValues=null){
	window.history.replaceState(null,"",buildBpProfileUrl(profileId,customValues));
	renderBpProfileUi();
	if(currentCsvText){
		parseCSV(currentCsvText);
	}
	updateExtractCounters();
}

function saveBpProfileFromModal(){
	const modal=ensureBpProfileModal();
	const profileId=selectedBpProfileIdInModal();
	let customValues=null;

	if(profileId==="custom"){
		customValues=readBpProfileCustomValuesFromModal();
		const errors=validateBpProfileCustomValues(customValues);
		if(errors.length){
			modal.querySelector("#bpProfileModalError").textContent=errors[0];
			return;
		}
	}

	saveBpProfile(profileId,customValues);
	closeBpProfileModal();
}

function setupBpProfile(){
	renderBpProfileUi();
	openBpProfileButton?.addEventListener("click",()=>openBpProfileModal());
}

setupBpProfile();

const directEntryInputs=[];

function todayDateInputValue(){
	const now=new Date();
	const year=now.getFullYear();
	const month=String(now.getMonth()+1).padStart(2,"0");
	const day=String(now.getDate()).padStart(2,"0");
	return `${year}-${month}-${day}`;
}

function directDateInputToDate(value){
	const match=String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if(!match)return null;
	return new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
}

function dateToDirectInputValue(date){
	if(!(date instanceof Date) || Number.isNaN(date.getTime()))return "";
	const year=date.getFullYear();
	const month=String(date.getMonth()+1).padStart(2,"0");
	const day=String(date.getDate()).padStart(2,"0");
	return `${year}-${month}-${day}`;
}

function shiftDirectDateInputValue(value,dayDelta){
	const date=directDateInputToDate(value || todayDateInputValue());
	if(!date)return todayDateInputValue();
	date.setDate(date.getDate()+dayDelta);
	const shifted=dateToDirectInputValue(date);
	return shifted>todayDateInputValue() ? todayDateInputValue() : shifted;
}

function directDateInputToCsvDate(value){
	const match=String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if(!match)return "";
	return `${match[1]}.${match[2]}.${match[3]}.`;
}

function csvDateToDirectInputValue(value){
	const match=String(value || "").trim().match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})\.?$/);
	if(!match)return "";
	return `${match[1]}-${match[2].padStart(2,"0")}-${match[3].padStart(2,"0")}`;
}

function normalizeDirectCsvDate(value){
	const match=String(value || "").trim().match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})\.?$/);
	if(!match)return String(value || "").trim();
	return `${match[1]}.${match[2].padStart(2,"0")}.${match[3].padStart(2,"0")}.`;
}

function renderDirectDatePreview(){
	if(!directEntryDatePreview || !directEntryDateInput)return;
	directEntryDatePreview.textContent=directDateInputToCsvDate(directEntryDateInput.value) || "Dátum";
}

function directInputValue(input){
	return String(input?.value || "").trim();
}

function directInputIsDirty(){
	return directEntryInputs.some((input,index)=>directInputValue(input)!==String(directEntryBaselineValues[index] || ""));
}

function directInputHasAnyValue(){
	return directEntryInputs.some(input=>directInputValue(input)!=="");
}

function setDirectDataEntryError(text=""){
	if(directDataEntryError){
		directDataEntryError.textContent=text;
	}
}

function clearDirectEntryInputs(){
	directEntryInputs.forEach(input=>{
		input.value="";
		input.closest("td")?.classList.remove("direct-entry-complete","direct-entry-partial");
	});
	directEntryBaselineValues=directEntryInputs.map(()=>"");
	setDirectDataEntryError("");
}

function renderDirectDataEntryStatus(){
	if(!directDataEntryBox)return;

	directDataEntryBox.classList.toggle("has-unsaved-direct-data",hasUnsavedDirectData);
	if(directDataEntryStatus){
		directDataEntryStatus.textContent=hasUnsavedDirectData
			? "Van webcímbe még nem mentett rögzített mérési adat."
			: "A betöltött CSV-adatokat kiegészíti; meglévő mérési adat nem módosítható.";
	}
}

function ensureDirectEntryInputs(){
	if(!directEntryRows.REG || !directEntryRows.DEL || !directEntryRows.ESTE || directEntryInputs.length)return;

	directMeasurementGroups.forEach(group=>{
		const row=directEntryRows[group.slotKey];
		if(!row)return;
		["SYS","DIA","P"].forEach(field=>{
			const cell=document.createElement("td");
			const input=document.createElement("input");
			input.type="number";
			input.inputMode="numeric";
			input.min=field==="SYS" ? "50" : field==="DIA" ? "30" : "30";
			input.max=field==="SYS" ? "300" : field==="DIA" ? "200" : "240";
			input.step="1";
			input.placeholder=field;
			input.dataset.group=group.label;
			input.dataset.field=field;
			input.dataset.index=String(group.start+({SYS:0,DIA:1,P:2}[field]));
			input.setAttribute("aria-label",`${group.label} ${field}`);
			input.addEventListener("input",()=>{
				input.value=input.value.replace(/[^\d]/g,"");
				updateDirectEntryGroupState(group.label);
				setDirectDataEntryError("");
			});
			cell.appendChild(input);
			row.appendChild(cell);
			directEntryInputs.push(input);
		});
	});
}

function directEntrySelectedCsvDate(){
	return directDateInputToCsvDate(directEntryDateInput?.value);
}

function directEntryTodayCsvDate(){
	return directDateInputToCsvDate(todayDateInputValue());
}

function directRowHasAnyValue(row){
	if(!row)return false;
	return directMeasurementGroups.some(group=>
		["SYS","DIA","P"].some(field=>{
			const index=group.start+({SYS:0,DIA:1,P:2}[field]);
			return String(row[index] || "").trim();
		})
	);
}

function directEntryDateIsEditable(){
	const csvDate=directEntrySelectedCsvDate();
	return directEntryDateIsEditableForCsvDate(csvDate);
}

function directEntryDateIsEditableForCsvDate(csvDate){
	if(!csvDate)return false;
	if(csvDate===directEntryTodayCsvDate())return true;
	return !directRowHasAnyValue(directSavedRowForDate(csvDate));
}

function directGroupInputs(groupLabel){
	return directEntryInputs.filter(input=>input.dataset.group===groupLabel);
}

function updateDirectEntryGroupState(groupLabel){
	const inputs=directGroupInputs(groupLabel);
	const values=inputs.map(directInputValue);
	const filledCount=values.filter(Boolean).length;
	const cells=inputs.map(input=>input.closest("td")).filter(Boolean);
	cells.forEach(cell=>{
		cell.classList.toggle("direct-entry-complete",filledCount===3);
		cell.classList.toggle("direct-entry-partial",filledCount>0 && filledCount<3);
	});
}

function getDirectCsvTable(){
	if(!currentCsvText.trim()){
		return {header:[...directCsvHeader],rows:[]};
	}

	const parsed=parseCsvTable(currentCsvText);
	const header=parsed.header.length ? parsed.header.map((value,index)=>index===0 ? String(value || "").replace(/^\uFEFF/,"") : value) : [...directCsvHeader];
	return {
		header:header.length>=directCsvHeader.length ? header : [...directCsvHeader],
		rows:parsed.rows.map(row=>{
			const next=[...row];
			while(next.length<directCsvHeader.length)next.push("");
			return next;
		})
	};
}

function directRowsForDate(rows,csvDate){
	return rows.filter(item=>normalizeDirectCsvDate(item[0])===csvDate);
}

function mergeDirectRows(rows){
	if(!rows.length)return null;
	const merged=[...rows[0]];
	for(const row of rows.slice(1)){
		for(let index=1;index<directCsvHeader.length;index++){
			if(!String(merged[index] || "").trim() && String(row[index] || "").trim()){
				merged[index]=row[index];
			}
		}
	}
	return merged;
}

function directRowForDate(csvDate){
	if(!csvDate)return null;
	const {rows}=getDirectCsvTable();
	return mergeDirectRows(directRowsForDate(rows,csvDate));
}

function directSavedRowForDate(csvDate){
	if(!csvDate || !savedCsvText.trim())return null;
	const parsed=parseCsvTable(savedCsvText);
	const rows=parsed.rows.map(row=>{
		const next=[...row];
		while(next.length<directCsvHeader.length)next.push("");
		return next;
	});
	return mergeDirectRows(directRowsForDate(rows,csvDate));
}

function loadDirectEntryValuesForSelectedDate(){
	ensureDirectEntryInputs();
	const csvDate=directEntrySelectedCsvDate();
	const row=directRowForDate(csvDate);
	const editable=directEntryDateIsEditable();
	const hasSavedData=directRowHasAnyValue(directSavedRowForDate(csvDate));
	directEntryBaselineDateInputValue=directEntryDateInput?.value || "";

	directEntryInputs.forEach((input,index)=>{
		input.value=row ? String(row[Number(input.dataset.index)] || "").trim() : "";
		input.disabled=!editable;
		input.closest("td")?.classList.toggle("is-readonly",!editable);
		directEntryBaselineValues[index]=input.value;
	});
	directMeasurementGroups.forEach(group=>updateDirectEntryGroupState(group.label));

	if(directDataEntryRecordButton){
		directDataEntryRecordButton.disabled=!editable;
	}
	if(directDataEntrySaveUrlButton){
		directDataEntrySaveUrlButton.disabled=!editable && !hasUnsavedDirectData;
	}
	if(directEntryDateInput){
		directEntryDateInput.max=todayDateInputValue();
	}
	updateDirectEntryDayStepButtons();

	setDirectDataEntryError(editable ? "" : hasSavedData ? "A kiválasztott napon már van webcímbe mentett adat; a meglévő mérési adatok itt nem módosíthatóak." : "");
}

function updateDirectEntryDayStepButtons(){
	if(directEntryPrevDayButton){
		directEntryPrevDayButton.disabled=!directEntryDateInput?.value;
	}
	if(directEntryNextDayButton){
		directEntryNextDayButton.disabled=!directEntryDateInput?.value || directEntryDateInput.value>=todayDateInputValue();
	}
}

function csvLineFromColumns(cols){
	return cols.map(value=>String(value ?? "")).join(",");
}

function serializeDirectCsvTable(header,rows){
	return [csvLineFromColumns(header),...rows.map(csvLineFromColumns)].join("\n");
}

function removeFutureCsvRows(text){
	if(!String(text || "").trim())return "";

	const {header,rows}=parseCsvTable(text);
	if(!header.length)return text;

	const today=todayDateInputValue();
	const filteredRows=rows.filter(row=>{
		const inputDate=csvDateToDirectInputValue(row[0]);
		return !inputDate || inputDate<=today;
	});

	return serializeDirectCsvTable(header,filteredRows);
}

function directEntryGroupsFromInputs(){
	return directMeasurementGroups.map(group=>{
		const values={};
		const baseline={};
		directGroupInputs(group.label).forEach(input=>{
			values[input.dataset.field]=directInputValue(input);
			baseline[input.dataset.field]=String(directEntryBaselineValues[directEntryInputs.indexOf(input)] || "");
		});
		return {...group,values,baseline};
	});
}

function validateDirectEntryGroups(groups){
	const changedGroups=groups.filter(group=>
		["SYS","DIA","P"].some(field=>String(group.values[field] || "")!==String(group.baseline[field] || ""))
	);
	if(!changedGroups.length){
		return {valid:false,message:"Nincs módosított mérési adat."};
	}

	for(const group of changedGroups){
		const missing=["SYS","DIA","P"].filter(field=>!group.values[field]);
		const hasAnyValue=["SYS","DIA","P"].some(field=>group.values[field]);
		if(hasAnyValue && missing.length){
			return {valid:false,message:`A(z) ${group.label} mérésnél a SYS, DIA és P mező együtt szükséges.`};
		}
		if(!hasAnyValue)continue;

		const sys=Number(group.values.SYS);
		const dia=Number(group.values.DIA);
		const pulse=Number(group.values.P);
		if(sys<50 || sys>300 || dia<30 || dia>200 || pulse<30 || pulse>240){
			return {valid:false,message:`A(z) ${group.label} mérés értékei szokatlan tartományban vannak. Ellenőrizd a beírt számokat.`};
		}
		if(dia>=sys){
			return {valid:false,message:`A(z) ${group.label} mérésnél a diasztolés érték nem lehet nagyobb vagy egyenlő a szisztolésnál.`};
		}
	}

	return {valid:true,changedGroups};
}

function rowHasDirectMeasurements(row){
	return directMeasurementGroups.some(group=>
		["SYS","DIA","P"].some(field=>{
			const index=group.start+({SYS:0,DIA:1,P:2}[field]);
			return String(row[index] || "").trim();
		})
	);
}

function recordDirectDataEntry({allowEmpty=false,dateInputValue=directEntryDateInput?.value,reloadSelectedDate=true}={}){
	ensureDirectEntryInputs();
	if(!directInputIsDirty()){
		if(allowEmpty)return true;
		setDirectDataEntryError("Nincs módosított mérési adat.");
		return false;
	}

	const csvDate=directDateInputToCsvDate(dateInputValue);
	if(!csvDate){
		setDirectDataEntryError("A dátum megadása szükséges.");
		directEntryDateInput?.focus();
		return false;
	}
	if(!directEntryDateIsEditableForCsvDate(csvDate)){
		setDirectDataEntryError("A kiválasztott napon már van webcímbe mentett adat; a meglévő mérési adatok itt nem módosíthatók.");
		return false;
	}

	const groups=directEntryGroupsFromInputs();
	const validation=validateDirectEntryGroups(groups);
	if(!validation.valid){
		setDirectDataEntryError(validation.message);
		return false;
	}

	const {header,rows}=getDirectCsvTable();
	const matchingRows=directRowsForDate(rows,csvDate);
	let row=mergeDirectRows(matchingRows);
	if(!row){
		row=Array(header.length).fill("");
		row[0]=csvDate;
		rows.push(row);
	}else if(matchingRows.length){
		Object.assign(matchingRows[0],row);
		row=matchingRows[0];
	}

	validation.changedGroups.forEach(group=>{
		["SYS","DIA","P"].forEach(field=>{
			const index=group.start+({SYS:0,DIA:1,P:2}[field]);
			row[index]=group.values[field];
		});
	});

	const filteredRows=rows.filter(item=>{
		if(normalizeDirectCsvDate(item[0])!==csvDate)return true;
		return item===row && rowHasDirectMeasurements(row);
	});
	filteredRows.sort((a,b)=>dateSortKey(a[0],0)-dateSortKey(b[0],0));
	currentCsvText=serializeDirectCsvTable(header,filteredRows);
	hasUnsavedDirectData=true;
	parseCSV(currentCsvText);
	setDataControls("plain");
	setSourceStatus("A közvetlenül rögzített mérési adatok még nincsenek a webcímbe mentve.");
	renderDirectDataEntryStatus();
	updateExtractCounters();
	if(reloadSelectedDate){
		loadDirectEntryValuesForSelectedDate();
	}
	return true;
}

function syncDirectEntryFieldsBeforePersistence({reloadSelectedDate=true}={}){
	if(!directDataEntryModal || directDataEntryModal.hidden || !directInputIsDirty())return true;

	return recordDirectDataEntry({
		dateInputValue:directEntryBaselineDateInputValue || directEntryDateInput?.value,
		reloadSelectedDate
	});
}

function persistCurrentCsvToUrl(){
	if(!currentCsvText)return false;

	setUrlData(encodePlainPayload(currentCsvText),"plain");
	savedCsvText=currentCsvText;
	hasUnsavedDirectData=false;
	renderDirectDataEntryStatus();
	return true;
}

function persistPendingStateToUrl(){
	if(!syncDirectEntryFieldsBeforePersistence({reloadSelectedDate:false}))return false;
	if(currentCsvText && hasUnsavedDirectData){
		persistCurrentCsvToUrl();
	}
	return true;
}

function saveCurrentUrlAndReload(){
	if(!persistPendingStateToUrl())return false;
	window.location.href=buildExtractUrl([...extractEventIds]);
	window.location.reload();
	return true;
}

function saveDirectDataEntryToUrl(){
	if(!syncDirectEntryFieldsBeforePersistence())return;
	if(!currentCsvText){
		setDirectDataEntryError("Nincs menthető mérési adat.");
		return;
	}
	saveCurrentUrlAndReload();
}

function closeDirectDataEntryModal({recordDirty=false}={}){
	if(!directDataEntryModal)return;

	if(directInputIsDirty()){
		if(recordDirty && !recordDirectDataEntry())return;
	}

	directDataEntryModal.hidden=true;
}

function openDirectDataEntryModal(){
	if(!directDataEntryModal || !directEntryDateInput)return;

	ensureDirectEntryInputs();
	if(!directEntryDateInput.value){
		directEntryDateInput.value=todayDateInputValue();
	}
	renderDirectDatePreview();
	loadDirectEntryValuesForSelectedDate();
	directDataEntryModal.hidden=false;
	directEntryDateInput.focus();
}

function handleDirectEntryDateChange(){
	const nextDateInputValue=directEntryDateInput.value;
	const previousDateInputValue=directEntryBaselineDateInputValue || todayDateInputValue();
	if(directInputIsDirty() && !recordDirectDataEntry({dateInputValue:previousDateInputValue,reloadSelectedDate:false})){
		directEntryDateInput.value=directEntryBaselineDateInputValue || todayDateInputValue();
		renderDirectDatePreview();
		updateDirectEntryDayStepButtons();
		return;
	}
	directEntryDateInput.value=nextDateInputValue;
	renderDirectDatePreview();
	loadDirectEntryValuesForSelectedDate();
}

function shiftDirectEntryDate(dayDelta){
	if(!directEntryDateInput)return;
	const nextValue=shiftDirectDateInputValue(directEntryDateInput.value,dayDelta);
	if(nextValue===directEntryDateInput.value)return;
	directEntryDateInput.value=nextValue;
	handleDirectEntryDateChange();
}

function detectClientPlatform(){
	const platform=String(navigator.userAgentData?.platform || navigator.platform || "").toLowerCase();
	const userAgent=String(navigator.userAgent || "").toLowerCase();
	if(platform.includes("mac") || platform.includes("iphone") || platform.includes("ipad") || platform.includes("ipod")){
		return "mac";
	}
	if(platform.includes("win")){
		return "windows";
	}
	if(platform.includes("linux") || userAgent.includes("linux")){
		return "linux";
	}
	return "windows";
}

function renderDirectEntryHotkeyHint(){
	const platform=detectClientPlatform();
	document.querySelectorAll("#mac, #winlinux").forEach(element=>{
		element.classList.remove("is-visible");
	});
	const hintId=platform==="mac" ? "mac" : "winlinux";
	document.getElementById(hintId)?.classList.add("is-visible");
}

function handleDirectEntryShortcut(event){
	if(directDataEntryModal?.hidden)return;
	const isPrevious=event.key==="ArrowLeft";
	const isNext=event.key==="ArrowRight";
	if(!isPrevious && !isNext)return;

	const platform=detectClientPlatform();
	const isMac=platform==="mac";
	const modifierOk=isMac ? (event.altKey || event.metaKey) : event.ctrlKey;
	if(!modifierOk || event.shiftKey || (isMac ? event.ctrlKey || (event.altKey && event.metaKey) : event.altKey || event.metaKey))return;

	event.preventDefault();
	shiftDirectEntryDate(isPrevious ? -1 : 1);
}

function setupDirectDataEntry(){
	renderDirectDataEntryStatus();
	ensureDirectEntryInputs();
	renderDirectDatePreview();
	renderDirectEntryHotkeyHint();

	if(!directDataEntryModal || !openDirectDataEntryButton)return;

	openDirectDataEntryButton.addEventListener("click",openDirectDataEntryModal);
	directDataEntryRecordButton?.addEventListener("click",()=>recordDirectDataEntry());
	directDataEntrySaveUrlButton?.addEventListener("click",saveDirectDataEntryToUrl);
	directDataEntryCloseXButton?.addEventListener("click",()=>closeDirectDataEntryModal({recordDirty:true}));
	directEntryTodayButton?.addEventListener("click",()=>{
		directEntryDateInput.value=todayDateInputValue();
		handleDirectEntryDateChange();
	});
	directEntryPrevDayButton?.addEventListener("click",()=>shiftDirectEntryDate(-1));
	directEntryNextDayButton?.addEventListener("click",()=>shiftDirectEntryDate(1));
	directEntryDateInput?.addEventListener("change",handleDirectEntryDateChange);
	document.addEventListener("keydown",handleDirectEntryShortcut);
	directDataEntryModal.addEventListener("click",event=>{
		if(event.target===directDataEntryModal){
			closeDirectDataEntryModal({recordDirty:true});
		}
	});
	document.addEventListener("keydown",event=>{
		if(event.key==="Enter" && !directDataEntryModal.hidden){
			event.preventDefault();
			recordDirectDataEntry();
			return;
		}
		if(event.key==="Escape" && !directDataEntryModal.hidden){
			closeDirectDataEntryModal({recordDirty:true});
		}
	});
}

setupDirectDataEntry();

document.addEventListener("click",event=>{
	if(event.target.closest?.("#openPersonDataButton")){
		openPersonDataModal();
	}
});

function isCardiologyMode(){
	return getReportMode()==="cardiology";
}

function registerChartEventMeta(meta){
	if(!meta?.eventId)return;

	extractEventRegistry.set(meta.eventId,{
		eventId:meta.eventId,
		chartId:meta.chartId,
		date:meta.date,
		partOfDay:meta.partOfDay,
		measureKey:meta.measureKey,
		x:meta.x
	});
}

function resetChartEventRegistry(){
	extractEventRegistry.clear();
	automaticAbnormalityRegistry.clear();
}

function resetAutomaticAbnormalityRegistry(){
	automaticAbnormalityRegistry.clear();
}

function getChartEventMeta(eventId){
	return extractEventRegistry.get(eventId);
}

function registerAutomaticAbnormality(abnormality){
	if(!abnormality?.eventId)return;
	const existing=automaticAbnormalityRegistry.get(abnormality.eventId) || [];
	if(!existing.some(item=>item.text===abnormality.text && item.indicator===abnormality.indicator)){
		existing.push(abnormality);
	}
	automaticAbnormalityRegistry.set(abnormality.eventId,existing);
}

function registerAutomaticAbnormalities(abnormalities){
	(abnormalities || []).forEach(registerAutomaticAbnormality);
}

function getAutomaticAbnormalitySdMultiplier(){
	return automaticAbnormalitySdMultiplierValue;
}

function formatSensitivityValue(value=automaticAbnormalitySdMultiplierValue){
	return Number(value).toFixed(1).replace(/\.0$/,"");
}

function syncSensitivityControls(){
	document.querySelectorAll(".sensitivity-slider").forEach(input=>{
		input.value=String(automaticAbnormalitySdMultiplierValue);
	});
	document.querySelectorAll(".sensitivity-value").forEach(output=>{
		output.textContent=formatSensitivityValue();
	});
}

function rebuildAutomaticAbnormalityRegistry(){
	resetAutomaticAbnormalityRegistry();
	if(currentCsvText && typeof buildAutomaticAbnormalitiesFromText==="function"){
		registerAutomaticAbnormalities(buildAutomaticAbnormalitiesFromText(currentCsvText));
	}
}

function redrawAutomaticAbnormalityIndicators(){
	if(!Array.isArray(charts))return;
	charts
		.filter(chart=>["sysChart","diaChart","pulseChart"].includes(chart.canvas?.id))
		.forEach(chart=>chart.draw());
}

function refreshAutomaticAbnormalityVisuals(){
	rebuildAutomaticAbnormalityRegistry();
	updateExtractCounters();
	redrawAutomaticAbnormalityIndicators();
}

function commitAutomaticAbnormalitySensitivity(){
	refreshAutomaticAbnormalityVisuals();
	if(currentCsvText){
		updateReportControls(currentCsvText);
	}
	if(!document.getElementById("extractModal")?.hidden){
		renderExtractModalList();
	}
}

function setAutomaticAbnormalitySdMultiplier(value,{commit=false}={}){
	const next=Math.min(3,Math.max(1.5,Number(value) || 2));
	automaticAbnormalitySdMultiplierValue=Number(next.toFixed(1));
	syncSensitivityControls();
	if(commit){
		commitAutomaticAbnormalitySensitivity();
	}else{
		refreshAutomaticAbnormalityVisuals();
	}
}

function handleSensitivitySliderInput(event){
	const slider=event.target.closest?.(".sensitivity-slider");
	if(!slider)return;
	setAutomaticAbnormalitySdMultiplier(slider.value,{commit:false});
}

function handleSensitivitySliderCommit(event){
	const slider=event.target.closest?.(".sensitivity-slider");
	if(!slider)return;
	setAutomaticAbnormalitySdMultiplier(slider.value,{commit:true});
}

document.addEventListener("input",handleSensitivitySliderInput);
document.addEventListener("change",handleSensitivitySliderCommit);
document.addEventListener("pointerup",handleSensitivitySliderCommit);
document.addEventListener("touchend",handleSensitivitySliderCommit,{passive:true});
document.addEventListener("keyup",event=>{
	if(["ArrowLeft","ArrowRight","Home","End","PageUp","PageDown"].includes(event.key)){
		handleSensitivitySliderCommit(event);
	}
});

function getAutomaticAbnormalitiesForEvent(eventId){
	return automaticAbnormalityRegistry.get(eventId) || [];
}

function getAutomaticAbnormalityReportLines(eventId){
	return getAutomaticAbnormalitiesForEvent(eventId).map(item=>item.text);
}

function getAutomaticAbnormalityEvents(chartId){
	return [...automaticAbnormalityRegistry.entries()]
		.filter(([,items])=>items.some(item=>item.chartId===chartId))
		.map(([eventId,items])=>{
			const chartItems=items.filter(entry=>entry.chartId===chartId);
			const item=chartItems[0] || items[0];
			const abnormalityTypes=[...new Set(chartItems.map(entry=>entry.type).filter(Boolean))];
			const markerType=abnormalityTypes.includes("clinical") ? "clinical" : "statistical";
			return {...item,eventId,abnormalityTypes,markerType};
		});
}

function getSelectedChartEvents(chartId){
	return [...extractEventIds]
		.map(eventId=>extractEventRegistry.get(eventId))
		.filter(meta=>meta?.chartId===chartId);
}

function selectedExtractCount(){
	return extractEventIds.size;
}

function selectedExtractCountForChart(chartId){
	return getSelectedChartEvents(chartId).length;
}

function isExtractEventSelected(eventId){
	return extractEventIds.has(eventId);
}

function initExtractEventsFromUrl(){
	extractEventIds.clear();
	getExtractIdsFromUrl().forEach(eventId=>extractEventIds.add(eventId));
}

initExtractEventsFromUrl();

function uniqueExtractIds(ids){
	return [...new Set(ids.filter(Boolean))];
}

function extractIdsEqual(a,b){
	if(a.length!==b.length)return false;
	return a.every((id,index)=>id===b[index]);
}

function isExtractListDirty(){
	return !extractIdsEqual(
		uniqueExtractIds(getExtractIdsFromUrl()),
		uniqueExtractIds([...extractEventIds])
	);
}

function hasPendingUrlSave(){
	return hasUnsavedDirectData || (isCardiologyMode() && isExtractListDirty());
}

function updateExtractModalSaveButton(){
	const saveButton=document.getElementById("extractSaveButton");
	if(!saveButton)return;

	const hasSaveableChanges=hasPendingUrlSave();
	saveButton.style.opacity=hasSaveableChanges ? "1" : "0.5";
	saveButton.disabled=!hasSaveableChanges;
	saveButton.tabIndex=hasSaveableChanges ? 0 : -1;
	saveButton.setAttribute("aria-disabled",hasSaveableChanges ? "false" : "true");
}

function eventExtractText(meta,index){
	if(!meta)return "";

	const text=buildDayMiniReportByDate(meta.date,meta.measureKey);
	if(!text)return "";
	const automaticLines=getAutomaticAbnormalityReportLines(meta.eventId);
	const automaticText=automaticLines.length
		? ["\n", "AUTOMATIKUS ABNORMALITÁS:", ...automaticLines].join("\n")
		: "";

	return [
		`#${index+1} ${meta.date} – ${meta.partOfDay} – ${meta.measureKey}`,
		`${text}${automaticText}`
	].join("\n");
}

function buildSelectedExtractText(){
	return [...extractEventIds]
		.map((eventId,index)=>eventExtractText(extractEventRegistry.get(eventId),index))
		.filter(Boolean)
		.join("\n\n---\n\n");
}

function updateExtractCounters(){
	const count=selectedExtractCount();

	document.querySelectorAll(".extract-counter-button").forEach(button=>{
		const chartCount=selectedExtractCountForChart(button.dataset.chartId);
		button.textContent=typeof chartExtractCounterText==="function"
			? chartExtractCounterText(count,chartCount)
			: `Megjelölt események: ${count}, itt ${chartCount}`;
		button.classList.toggle("has-items",count>0);
	});
	document.querySelectorAll(".chart-extract-actions").forEach(actions=>{
		actions.hidden=count===0;
	});

	const shouldShowSaveButton=hasPendingUrlSave();
	let saveButton=document.getElementById("saveExtractUrlButton");
	if(shouldShowSaveButton){
		if(!saveButton){
			saveButton=document.createElement("button");
			saveButton.type="button";
			saveButton.id="saveExtractUrlButton";
			saveButton.className="floating-save-button";
			saveButton.textContent="Mentés a webcímbe";
			saveButton.addEventListener("click",saveExtractUrlAndReload);
			document.body.appendChild(saveButton);
		}
	}else if(saveButton){
		saveButton.remove();
	}

	updateExtractModalSaveButton();
	charts.forEach(chart=>chart.update("none"));
}

function addExtractEvent(eventId){
	if(!eventId)return;

	extractEventIds.add(eventId);
	updateExtractCounters();
	renderExtractModalList();
}

function removeExtractEvent(eventId){
	extractEventIds.delete(eventId);
	updateExtractCounters();
	renderExtractModalList();
}

function clearExtractEvents(){
	extractEventIds.clear();
	updateExtractCounters();
	renderExtractModalList();
	closeExtractModal();
}

function saveExtractUrlAndReload(){
	saveCurrentUrlAndReload();
}

function ensureExtractModal(){
	let modal=document.getElementById("extractModal");
	if(modal)return modal;

	modal=document.createElement("div");
	modal.className="modal-backdrop";
	modal.id="extractModal";
	modal.hidden=true;
	modal.innerHTML=`
		<div class="modal-panel extract-modal-panel" role="dialog" aria-modal="true" aria-labelledby="extractModalTitle">
			<button type="button" class="modal-x-button" id="extractCloseXButton" aria-label="Bezárás">×</button>
			<h2 id="extractModalTitle">Megjelölt események</h2>
			<div class="extract-list" id="extractList"></div>
			<div class="extract-actions">
				<button type="button" class="secondary" id="copyExtractLinkButton">Link másolása</button>
				<button type="button" class="secondary" id="shareExtractLinkButton">Link megosztása</button>
				<button type="button" class="secondary" id="shareExtractTextButton">Eseményjegyzet megosztása</button>
				<button type="button" class="secondary danger" id="clearExtractButton">Teljes lista törlése</button>
				<button type="button" id="extractSaveButton">Mentés a webcímbe</button>
			</div>
			<p class="modal-warning">A webcímbe történő adatmentés után ne felejtsd el könyvjelzőben tárolni vagy ott frissíteni az új webcímet, vagy más módon menteni, megosztani, továbbküldeni azt, mivel a szerver nem tárol adatokat; <b>az adatokat a webcím tárolja.</b></p>
		</div>
	`;
	document.body.appendChild(modal);

	const close=()=>closeExtractModal();
	modal.addEventListener("click",event=>{
		if(event.target===modal)close();
	});
	modal.querySelector("#extractSaveButton").addEventListener("click",saveExtractUrlAndReload);
	modal.querySelector("#extractCloseXButton").addEventListener("click",close);
	modal.querySelector("#copyExtractLinkButton").addEventListener("click",copyExtractLink);
	modal.querySelector("#shareExtractLinkButton").addEventListener("click",shareExtractLink);
	modal.querySelector("#shareExtractTextButton").addEventListener("click",shareExtractText);
	modal.querySelector("#clearExtractButton").addEventListener("click",clearExtractEvents);
	document.addEventListener("keydown",event=>{
		if(event.key==="Escape" && !modal.hidden){
			closeExtractModal();
		}
	});

	return modal;
}

function openExtractModal(){
	const modal=ensureExtractModal();
	renderExtractModalList();
	updateExtractModalSaveButton();
	modal.hidden=false;
}

function closeExtractModal(){
	const modal=document.getElementById("extractModal");
	if(modal)modal.hidden=true;
}

function hasExtractInUrl(){
	return getFragmentParams().has("kivonat");
}

function removeExtractFromUrl(){
	const url=new URL(window.location.href);
	const fragmentParams=getFragmentParams();
	fragmentParams.delete("kivonat");
	url.hash=fragmentParams.toString();
	window.history.replaceState(null,"",url.toString());
	extractEventIds.clear();
}

function ensureKeepExtractModal(){
	let modal=document.getElementById("keepExtractModal");
	if(modal)return modal;

	modal=document.createElement("div");
	modal.className="modal-backdrop";
	modal.id="keepExtractModal";
	modal.hidden=true;
	modal.innerHTML=`
		<div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="keepExtractModalTitle">
			<h2 id="keepExtractModalTitle">Az eseményeket megőrizzük?</h2>
			<p>Az aktuális webcím korábbi megjelölt eseményeket tartalmaz. Új CSV betöltésekor ezek csak akkor maradjanak meg, ha ugyanahhoz a személyhez vagy adatsorhoz tartoznak.</p>
			<div class="modal-actions">
				<button type="button" class="secondary danger" id="discardExtractForNewCsvButton">Eldobás</button>
				<button type="button" id="keepExtractForNewCsvButton">Megőrzés</button>
			</div>
		</div>
	`;
	document.body.appendChild(modal);
	return modal;
}

function confirmKeepExtractEventsForNewCsv(){
	if(!hasExtractInUrl())return Promise.resolve(true);

	const modal=ensureKeepExtractModal();
	modal.hidden=false;

	return new Promise(resolve=>{
		const keepButton=modal.querySelector("#keepExtractForNewCsvButton");
		const discardButton=modal.querySelector("#discardExtractForNewCsvButton");

		const finish=keep=>{
			modal.hidden=true;
			keepButton.removeEventListener("click",keepHandler);
			discardButton.removeEventListener("click",discardHandler);
			resolve(keep);
		};
		const keepHandler=()=>finish(true);
		const discardHandler=()=>finish(false);

		keepButton.addEventListener("click",keepHandler);
		discardButton.addEventListener("click",discardHandler);
		keepButton.focus();
	});
}

function renderExtractModalList(){
	const list=document.getElementById("extractList");
	if(!list)return;

	const title=document.getElementById("extractModalTitle");
	if(title){
		title.textContent=`Megjelölt események: ${selectedExtractCount()}`;
	}

	if(!extractEventIds.size){
		list.innerHTML='<p class="extract-empty">Nincs megjelölt esemény.</p>';
		return;
	}

	list.innerHTML="";
	[...extractEventIds].forEach((eventId,index)=>{
		const meta=extractEventRegistry.get(eventId);
		const item=document.createElement("article");
		item.className="extract-item";
		item.dataset.eventId=eventId;

		const title=document.createElement("div");
		title.className="extract-item-title";
		title.textContent=meta
			? `#${index+1} ${meta.date} – ${meta.partOfDay} – ${meta.measureKey}`
			: `#${index+1} ${eventId}`;

		const pre=document.createElement("pre");
		pre.textContent=meta ? eventExtractText(meta,index).split("\n").slice(1).join("\n") : "Az eseményhez tartozó adat nem található.";

		const removeButton=document.createElement("button");
		removeButton.type="button";
		removeButton.className="secondary danger";
		removeButton.textContent="Eltávolítás";
		removeButton.addEventListener("click",()=>removeExtractEvent(eventId));

		item.append(title,pre,removeButton);
		attachSwipeToRemove(item,eventId);
		list.appendChild(item);
	});
}

function attachSwipeToRemove(item,eventId){
	let startX=0;
	let startY=0;

	item.addEventListener("pointerdown",event=>{
		startX=event.clientX;
		startY=event.clientY;
	});
	item.addEventListener("pointerup",event=>{
		const dx=event.clientX-startX;
		const dy=Math.abs(event.clientY-startY);
		if(dx<-70 && dy<40){
			removeExtractEvent(eventId);
		}
	});
}

async function copyExtractLink(){
	await writeTextToClipboard(buildExtractUrl([...extractEventIds]));
}

async function shareExtractLink(){
	const url=buildExtractUrl([...extractEventIds]);
	if(navigator.share){
		await navigator.share({title:"Megjelölt vérnyomásesemények",url});
	}else{
		await writeTextToClipboard(url);
	}
}

async function shareExtractText(){
	const text=buildSelectedExtractText();
	if(navigator.share){
		await navigator.share({title:"Megjelölt vérnyomásesemények",text});
	}else{
		await writeTextToClipboard(text);
	}
}

function setupExtractCounterButton(button){
	button.addEventListener("click",openExtractModal);
	updateExtractCounters();
}

document.addEventListener("click",event=>{
	const button=event.target.closest?.(".extract-counter-button");
	if(button){
		openExtractModal();
	}

	const actionButton=event.target.closest?.("[data-extract-action]");
	if(actionButton){
		handleExtractAction(actionButton.dataset.extractAction);
	}
});

function handleExtractAction(action){
	if(!selectedExtractCount())return;

	if(action==="copy-link"){
		copyExtractLink();
	}else if(action==="share-link"){
		shareExtractLink();
	}else if(action==="share-text"){
		shareExtractText();
	}else if(action==="save"){
		saveExtractUrlAndReload();
	}else if(action==="clear"){
		clearExtractEvents();
	}
}

function isTouchScrubAvailable(){
	return window.matchMedia?.("(hover: none), (pointer: coarse)")?.matches;
}

function setChartScrubHandPreference(hand){
	chartScrubHandPreference=hand;
	document.documentElement.dataset.scrubHand=hand;
}

function getChartScrubHandPreference(){
	return chartScrubHandPreference;
}

function showExtractModalFromUrlIfNeeded(){
	if(extractOpenedFromUrl || !extractEventIds.size || !isCardiologyMode())return;
	extractOpenedFromUrl=true;
	openExtractModal();
}

function testModeEnabled(){
	return getFragmentParams().get("testmode")==="1";
}

function loadCsvFromTestMode(){
	if(!testModeEnabled())return false;

	if(typeof testCsvData!=="string" || !testCsvData.trim()){
		setSourceStatus("Tesztüzemmód aktív, de a js/testdata.js nem tartalmaz betölthető testCsvData értéket.");
		return true;
	}

	currentCsvText=removeFutureCsvRows(testCsvData);
	savedCsvText=currentCsvText;
	hasUnsavedDirectData=false;
	parseCSV(currentCsvText);
	showExtractModalFromUrlIfNeeded();
	setDataControls("plain");
	renderDirectDataEntryStatus();
	updateExtractCounters();
	setSourceStatus("Tesztüzemmód aktív: a mérési adatok a js/testdata.js testCsvData változójából töltődtek be.");
	return true;
}

function putCsvIntoUrl(text,{keepExtract=true}={}){
	const sanitizedText=removeFutureCsvRows(text);
	currentCsvText=sanitizedText;
	if(!keepExtract){
		removeExtractFromUrl();
	}
	persistCurrentCsvToUrl();
	parseCSV(sanitizedText);
	showExtractModalFromUrlIfNeeded();
	setDataControls("plain");
	updateExtractCounters();
	setSourceStatus("A mérési adatok a webcímben vannak, de jelenleg nincsenek titkosítva. A webcím megosztás céljából továbbküldhető.");
}

function saveUploadedCsvToUrl(text,{keepExtract=true}={}){
	putCsvIntoUrl(text,{keepExtract});
}

function putEncryptedCsvIntoUrl(encrypted){
	setUrlData(encrypted,"encrypted");
	savedCsvText=currentCsvText;
	hasUnsavedDirectData=false;
	setDataControls("encrypted");
	renderDirectDataEntryStatus();
	updateExtractCounters();
	setSourceStatus("A mérési adatok titkosítva kerültek az URL-fragmentbe.");
}

function setSourceStatus(text){
	document.getElementById("sourceStatus").textContent=text;
}

function setDataControls(mode){
	if(!mode){
		dataActions.classList.remove("is-visible");
		return;
	}

	currentUrlMode=mode;
	dataActions.classList.add("is-visible");
	encryptDataButton.style.display=mode==="plain" ? "" : "none";
}

function supportsMouseChartDrag(){
	return window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches;
}

function chartScrollHasHorizontalOverflow(scroll,stage=scroll.querySelector(".chart-stage")){
	if(!stage)return false;
	return stage.getBoundingClientRect().width>scroll.getBoundingClientRect().width+1;
}

function updateChartScrollWidth(scroll){
	const dayCount=Number(scroll.dataset.dayCount);
	const mode=scroll.dataset.chartMode;
	const stage=scroll.querySelector(".chart-stage");
	const wrap=scroll.closest(".wrap");

	if(!dayCount || !mode || !stage || !wrap)return;

	const availableWidth=Math.max(320,wrap.clientWidth-36);
	const dayWidth=mode==="detailed" ? 58 : 52;
	const desiredWidth=Math.ceil(dayCount*dayWidth+90);
	const chartWidth=Math.max(availableWidth,desiredWidth);
	const keepRightEdge=typeof chartScrollIsAtRightEdge==="function" && chartScrollIsAtRightEdge(scroll);

	stage.style.width=`${chartWidth}px`;
	const scrollable=chartScrollHasHorizontalOverflow(scroll,stage);
	scroll.dataset.scrollable=scrollable ? "1" : "0";
	scroll.classList.toggle("is-scrollable",scrollable);
	if(!scrollable){
		scroll.scrollLeft=0;
	}else if(keepRightEdge && typeof alignChartScrollRight==="function"){
		alignChartScrollRight(scroll);
	}
}

function refreshChartDragScrollState(scroll,mouseDragAvailable=supportsMouseChartDrag()){
	updateChartScrollWidth(scroll);

	const canDrag=mouseDragAvailable && scroll.dataset.scrollable==="1";
	scroll.classList.toggle("can-drag",canDrag);

	let help=scroll.querySelector(".chart-scroll-help");
	if(canDrag){
		if(!help){
			help=document.createElement("div");
			help.className="chart-scroll-help";
			help.textContent="Ragadd meg egérrel a vízszintes görgetéshez.";
			scroll.appendChild(help);
		}
	}else{
		help?.remove();
		scroll.classList.remove("is-help-visible","is-dragging");
	}

	return canDrag;
}

function setupChartDragScrolling(root=document){
	const mouseDragAvailable=supportsMouseChartDrag();

	root.querySelectorAll(".chart-scroll").forEach(scroll=>{
		refreshChartDragScrollState(scroll,mouseDragAvailable);

		if(scroll.dataset.dragScrollReady)return;
		scroll.dataset.dragScrollReady="1";

		let dragging=false;
		let moved=false;
		let startX=0;
		let startScrollLeft=0;
		let helpTimer;

		scroll.addEventListener("mouseenter",()=>{
			if(!refreshChartDragScrollState(scroll))return;

			clearTimeout(helpTimer);
			scroll.classList.add("is-help-visible");
			helpTimer=setTimeout(()=>{
				scroll.classList.remove("is-help-visible");
			},2000);
		});

		scroll.addEventListener("mouseleave",()=>{
			clearTimeout(helpTimer);
			scroll.classList.remove("is-help-visible");
		});

		scroll.addEventListener("pointerdown",event=>{
			if(event.pointerType!=="mouse" || event.button!==0)return;
			if(!refreshChartDragScrollState(scroll))return;

			dragging=true;
			moved=false;
			startX=event.clientX;
			startScrollLeft=scroll.scrollLeft;
			scroll.classList.add("is-dragging");
			scroll.setPointerCapture?.(event.pointerId);
		});

		scroll.addEventListener("pointermove",event=>{
			if(!dragging)return;

			const dx=event.clientX-startX;
			if(Math.abs(dx)>3){
				moved=true;
			}

			if(moved){
				event.preventDefault();
				scroll.scrollLeft=startScrollLeft-dx;
			}
		});

		function endDrag(){
			if(!dragging)return;
			dragging=false;
			scroll.classList.remove("is-dragging");
		}

		scroll.addEventListener("pointerup",endDrag);
		scroll.addEventListener("pointercancel",endDrag);
		scroll.addEventListener("pointerleave",endDrag);

		scroll.addEventListener("click",event=>{
			if(!moved)return;

			event.preventDefault();
			event.stopPropagation();
			moved=false;
		},true);

		scroll.addEventListener("scroll",()=>{
			clearChartTransientUiForScroll(scroll);
		},{passive:true});

		if(typeof ResizeObserver==="function"){
			const stage=scroll.querySelector(".chart-stage");
			const wrap=scroll.closest(".wrap");
			let refreshFrame=0;
			const queueRefresh=()=>{
				cancelAnimationFrame(refreshFrame);
				refreshFrame=requestAnimationFrame(()=>{
					refreshFrame=0;
					refreshChartDragScrollState(scroll);
				});
			};
			const observer=new ResizeObserver(queueRefresh);
			observer.observe(scroll);
			stage && observer.observe(stage);
			wrap && observer.observe(wrap);
		}
	});

	setupChartScrubThumbs(root);
}

function setupChartScrubThumbs(root=document){
	root.querySelectorAll(".huvelykujj").forEach(thumb=>{
		if(thumb.dataset.scrubReady)return;
		thumb.dataset.scrubReady="1";
		thumb.addEventListener("pointerdown",startChartScrub);
		thumb.addEventListener("touchstart",event=>event.preventDefault(),{passive:false});
		["contextmenu","selectstart","dragstart"].forEach(type=>{
			thumb.addEventListener(type,event=>event.preventDefault());
		});
	});
}

function clearChartTransientUiForScroll(scroll){
	charts
		.filter(chart=>chart.canvas.closest(".chart-scroll")===scroll)
		.forEach(chart=>{
			if(chart.$touchScrubActive || chart.$scrubActive)return;

			chart.$extractAction=null;
			chart.setActiveElements([]);
			chart.tooltip?.setActiveElements([], {x:0,y:0});
			if(typeof updateDetailedChartScrubCursor==="function"){
				updateDetailedChartScrubCursor(chart);
			}
			chart.update("none");
		});
}

let activeScrubChart=null;
let activeScrubThumbPointerId=null;
let activeScrubThumb=null;

function startChartScrub(event){
	if(!isTouchScrubAvailable() || event.pointerType==="mouse")return;

	const thumb=event.currentTarget;
	const chart=charts.find(item=>item.canvas.id===thumb.dataset.chartId);
	if(!chart)return;

	event.preventDefault();
	activeScrubChart=chart;
	activeScrubThumbPointerId=event.pointerId;
	activeScrubThumb=thumb;
	chart.$touchScrubActive=true;
	chart.$touchScrubStationary=true;
	chart.$scrubActive=true;
	chart.$scrubX=chart.$scrubX ?? Math.max(chart.scales.x.min,Math.min(chart.scales.x.max,chart.scales.x.getValueForPixel(chart.chartArea.left)));
	setChartScrubHandPreference(thumb.dataset.hand);

	const wrap=thumb.closest(".wrap");
	wrap?.classList.add("is-scrubbing");
	thumb.classList.add("is-active");
	thumb.setPointerCapture?.(event.pointerId);
	chart.update("none");
}

document.addEventListener("pointermove",event=>{
	if(!activeScrubChart || !activeScrubChart.$touchScrubActive || event.pointerType==="mouse" || event.pointerId===activeScrubThumbPointerId)return;

	event.preventDefault();
	activeScrubChart.$touchScrubStationary=false;
	updateActiveChartScrubFromClientX(event.clientX);
},{passive:false});

document.addEventListener("pointerdown",event=>{
	if(!activeScrubChart?.$touchScrubActive || event.pointerType==="mouse" || event.pointerId===activeScrubThumbPointerId)return;
	if(!activeScrubChart.$touchScrubStationary || !activeScrubChart.$touchScrubRange?.eventId)return;

	if(!touchPointInActiveScrubBand(event.clientX,event.clientY))return;

	event.preventDefault();
	if(isExtractEventSelected(activeScrubChart.$touchScrubRange.eventId)){
		removeExtractEvent(activeScrubChart.$touchScrubRange.eventId);
		if(typeof refreshTouchScrubTooltip==="function"){
			refreshTouchScrubTooltip(activeScrubChart);
		}
		activeScrubChart.update("none");
		return;
	}
	addExtractEvent(activeScrubChart.$touchScrubRange.eventId);
	if(typeof refreshTouchScrubTooltip==="function"){
		refreshTouchScrubTooltip(activeScrubChart);
	}
	activeScrubChart.update("none");
},{passive:false});

document.addEventListener("pointerup",settleTouchScrubPointer);
document.addEventListener("pointercancel",settleTouchScrubPointer);
document.addEventListener("pointerup",endChartScrub);
document.addEventListener("pointercancel",endChartScrub);

function settleTouchScrubPointer(event){
	if(!activeScrubChart?.$touchScrubActive || event.pointerId===activeScrubThumbPointerId || event.pointerType==="mouse")return;

	event.preventDefault();
	activeScrubChart.$touchScrubStationary=true;
	if(typeof refreshTouchScrubTooltip==="function"){
		refreshTouchScrubTooltip(activeScrubChart);
		setTimeout(()=>{
			if(activeScrubChart?.$touchScrubActive){
				refreshTouchScrubTooltip(activeScrubChart);
			}
		},60);
	}
}

function chartCanvasEventFromClientPoint(chart,clientX,clientY){
	if(!chart?.canvas)return null;
	const canvasRect=chart.canvas.getBoundingClientRect();
	return {
		x:(clientX-canvasRect.left)*(chart.width/canvasRect.width),
		y:(clientY-canvasRect.top)*(chart.height/canvasRect.height)
	};
}

function touchPointInActiveScrubBand(clientX,clientY){
	const chart=activeScrubChart;
	if(!chart?.chartArea || !chart.scales?.x || !Number.isFinite(chart.$scrubX))return false;

	const chartEvent=chartCanvasEventFromClientPoint(chart,clientX,clientY);
	if(!chartEvent)return false;
	const {x,y}=chartEvent;
	if(y<chart.chartArea.top || y>chart.chartArea.bottom)return false;

	const px=chart.scales.x.getPixelForValue(chart.$scrubX);
	const width=typeof scrubBandWidth==="function" ? scrubBandWidth(chart) : 44;
	return Math.abs(x-px)<=width/2;
}

function endChartScrub(event){
	if(!activeScrubChart || event.pointerId!==activeScrubThumbPointerId)return;

	const chart=activeScrubChart;
	chart.$touchScrubActive=false;
	chart.$touchScrubRange=null;
	chart.$touchScrubStationary=false;
	chart.$scrubActive=false;
	chart.$scrubX=null;
	try{
		activeScrubThumb?.releasePointerCapture?.(activeScrubThumbPointerId);
	}catch(error){
		// A pointer capture megszűnhet magától is touch-cancel esetén.
	}
	chart.canvas.closest(".wrap")?.classList.remove("is-scrubbing");
	chart.canvas.closest(".wrap")?.querySelectorAll(".huvelykujj.is-active").forEach(thumb=>thumb.classList.remove("is-active"));
	if(typeof updateDetailedChartScrubCursor==="function"){
		updateDetailedChartScrubCursor(chart);
	}
	activeScrubChart=null;
	activeScrubThumbPointerId=null;
	activeScrubThumb=null;
	chart.update("none");
}

function updateActiveChartScrubFromClientX(clientX){
	const chart=activeScrubChart;
	if(!chart?.chartArea || !chart.scales?.x)return;

	const canvasRect=chart.canvas.getBoundingClientRect();
	const xPixel=(clientX-canvasRect.left)*(chart.width/canvasRect.width);
	const ranges=chart.options.plugins.rangeHoverPlugin?.ranges || [];
	const xValue=chart.scales.x.getValueForPixel(xPixel);
	const match=typeof findNearestRangeByX==="function"
		? findNearestRangeByX(ranges,xValue)
		: ranges.reduce((best,range)=>{
			const distance=Math.abs(range.x-xValue);
			return !best || distance<best.distance ? {range,distance} : best;
		},null)?.range;
	if(!match)return;

	if(typeof setDetailedChartScrubRange==="function"){
		setDetailedChartScrubRange(chart,match,{usePointerY:false,showScrubBand:true});
	}else{
		chart.$scrubX=match.x;
		chart.$extractAction=match;
		chart.$hoveredRange=`${match.key}:${match.x}`;
		chart.$rangeTooltipActive=false;

		const active=[{datasetIndex:match.avgDatasetIndex,index:match.pointIndex}];
		const dataset=chart.data.datasets[match.avgDatasetIndex];
		const raw=dataset?.data?.[match.pointIndex];
		const position=raw
			? {
				x:chart.scales.x.getPixelForValue(raw.x),
				y:chart.scales.y.getPixelForValue(raw.y)
			}
			: {x:xPixel,y:chart.chartArea.top+30};

		chart.setActiveElements(active,position);
		chart.tooltip?.setActiveElements(active,position);
	}
	chart.update("none");
}

async function loadCsvFromUrl(){
	if(loadCsvFromTestMode()){
		renderBpProfileUi();
		return;
	}

	const urlData=getUrlData();
	const {encoded,mode,source}=urlData;
	if(!encoded){
		renderBpProfileUi();
		if(shouldShowBpProfileModalOnStartup()){
			openBpProfileModal({startup:true});
		}
		return;
	}

	if(source==="query"){
		migrateQueryDataToHash(urlData);
	}

	try{
		if(mode==="encrypted"){
			setDataControls("encrypted");
			setSourceStatus("Titkosított mérési adatok vannak a webcímben. Add meg a jelszót a megnyitáshoz.");

			const password=await requestPassword({
				title:"Titkosított adatok megnyitása",
				text:"A linkben titkosított mérési adatok vannak. Add meg a jelszót a grafikonok megjelenítéséhez.",
				confirmText:"Megnyitás",
				requireStrong:false
			});

			if(!password)return;

			currentCsvText=removeFutureCsvRows(await decryptCsv(encoded,password));
			savedCsvText=currentCsvText;
			hasUnsavedDirectData=false;
			parseCSV(currentCsvText);
			showExtractModalFromUrlIfNeeded();
			renderDirectDataEntryStatus();
			updateExtractCounters();
			setSourceStatus("A mérési adatok a webcímben vannak, de nincsenek titkosítva. A webcím megosztás céljából továbbküldhető.");
			return;
		}

		currentCsvText=removeFutureCsvRows(urlData.csvText || decodeCsvFromUrl(encoded));
		savedCsvText=currentCsvText;
		hasUnsavedDirectData=false;
		parseCSV(currentCsvText);
		showExtractModalFromUrlIfNeeded();
		setDataControls("plain");
		renderDirectDataEntryStatus();
		updateExtractCounters();
		setSourceStatus("A mérési adatok a webcímben vannak, de jelenleg nincsenek titkosítva. A webcím megosztás céljából továbbküldhető.");
	}catch(error){
		setSourceStatus("A linkben kapott CSV-adat nem olvasható vagy a jelszó nem megfelelő.");
		console.error("A linkben kapott CSV-adat nem olvasható.",error);
	}
}

loadCsvFromUrl();

window.addEventListener("resize",()=>{
	setupChartDragScrolling();
});
