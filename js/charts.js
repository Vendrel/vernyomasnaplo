let currentDateLabelMode=1;

function chartExtractCounterText(totalCount,chartCount){
	const mode=document.documentElement.dataset.reportMode;
	const chartCountText=totalCount>0 ? `, itt ${chartCount}` : "";
	return mode==="gp"
		? `Kardiológus által megjelölt események: ${totalCount}${chartCountText}`
		: `Események: ${totalCount}${chartCountText}`;
}

const extremeValueLineWidth=7;

// Alapértelmezett Y-tengely tartományok: ezeket finomhangolhatod, ha a normál
// vérnyomás- vagy pulzusingadozás vizuális súlyát később módosítani szeretnéd.
// A Chart.js suggestedMin/suggestedMax értékként kapja meg őket, ezért a skála
// automatikusan szélesebbre nyílik, ha egy ténylegesen mért érték kilóg.
const chartDefaultYRanges={
	"Szisztolés":{min:80,max:200},
	"Diasztolés":{min:50,max:120},
	"Pulzus":{min:40,max:140}
};

function chartDefaultYScale(measureKey){
	const range=chartDefaultYRanges[measureKey];
	return range
		? {suggestedMin:range.min,suggestedMax:range.max}
		: {};
}

function chartScrollMaxLeft(scroll){
	return Math.max(0,scroll.scrollWidth-scroll.clientWidth);
}

function chartScrollIsAtRightEdge(scroll){
	return chartScrollMaxLeft(scroll)-scroll.scrollLeft<=2;
}

function alignChartScrollRight(scroll){
	scroll.scrollLeft=chartScrollMaxLeft(scroll);
}

function queueAlignChartScrollRight(scroll){
	requestAnimationFrame(()=>alignChartScrollRight(scroll));
}

function prepareChartCanvas(id,dayCount,mode,title=""){
	const canvas=document.getElementById(id);
	const wrap=canvas.closest(".wrap");
	let scroll=canvas.closest(".chart-scroll");
	let stage=canvas.parentElement?.classList?.contains("chart-stage") ? canvas.parentElement : null;

	if(!canvas.dataset.contextMenuPrevented){
		canvas.dataset.contextMenuPrevented="1";
		canvas.addEventListener("contextmenu",event=>{
			event.preventDefault();
			event.stopPropagation();
		});
	}

	if(!scroll || !stage){
		scroll=document.createElement("div");
		scroll.className="chart-scroll";
		stage=document.createElement("div");
		stage.className="chart-stage";
		canvas.parentNode.insertBefore(scroll,canvas);
		scroll.appendChild(stage);
		stage.appendChild(canvas);
	}

	if(mode==="detailed"){
		let toolbar=wrap.querySelector(`.chart-toolbar[data-chart-id="${id}"]`);
		if(!toolbar){
			toolbar=document.createElement("div");
			toolbar.className="chart-toolbar";
			toolbar.dataset.chartId=id;

			const button=document.createElement("button");
			button.type="button";
			button.className="extract-counter-button secondary";
			button.dataset.chartId=id;
			button.textContent=chartExtractCounterText(0,0);
			toolbar.appendChild(button);

			if(document.documentElement.dataset.reportMode==="cardiology"){
				const sensitivity=document.createElement("label");
				sensitivity.className="sensitivity-control";
				sensitivity.innerHTML=[
					'<span class="sensitivity-label">Tolerancia:</span>',
					'<input class="sensitivity-slider" type="range" min="1.5" max="3" step="0.1" value="2" aria-label="Automatikus Stdev-elemzés érzékenysége">',
					'<span class="sensitivity-value">2</span>'
				].join("");
				toolbar.appendChild(sensitivity);
			}

			const actions=document.createElement("div");
			actions.className="chart-extract-actions";
			actions.hidden=true;
			[
				{action:"copy-link",icon:"content_copy",title:"Link másolása"},
				{action:"share-link",icon:"ios_share",title:"Link megosztása"},
				{action:"share-text",icon:"text_snippet",title:"Szöveges kivonat megosztása"},
				{action:"save",icon:"save",title:"Mentés"},
				{action:"clear",icon:"delete",title:"Teljes lista törlése",danger:true}
			].forEach(item=>{
				const actionButton=document.createElement("button");
				actionButton.type="button";
				actionButton.className=`chart-action-button secondary${item.danger ? " danger" : ""}`;
				actionButton.dataset.extractAction=item.action;
				actionButton.title=item.title;
				actionButton.setAttribute("aria-label",item.title);
				const icon=document.createElement("span");
				icon.className="material-symbols-rounded chart-action-icon";
				icon.setAttribute("aria-hidden","true");
				icon.textContent=item.icon;
				actionButton.appendChild(icon);
				actions.appendChild(actionButton);
			});
			toolbar.appendChild(actions);

			wrap.insertBefore(toolbar,scroll);
			if(typeof setupExtractCounterButton==="function"){
				setupExtractCounterButton(button);
			}
			if(typeof syncSensitivityControls==="function"){
				syncSensitivityControls();
			}
		}
	}

	if(title){
		let titleElement=wrap.querySelector(`.chart-html-title[data-chart-id="${id}"]`);
		if(!titleElement){
			titleElement=document.createElement("h2");
			titleElement.className="chart-html-title";
			titleElement.dataset.chartId=id;
			wrap.insertBefore(titleElement,scroll);
		}
		titleElement.textContent=title;
	}

	const availableWidth=Math.max(320,wrap.clientWidth-36);
	const dayWidth=mode==="detailed" ? 58 : 52;
	const desiredWidth=Math.ceil(dayCount*dayWidth+90);
	const chartWidth=Math.max(availableWidth,desiredWidth);
	const scrollable=chartWidth>availableWidth+8;

	scroll.dataset.dayCount=String(dayCount);
	scroll.dataset.chartMode=mode;
	scroll.dataset.scrollable=scrollable ? "1" : "0";
	stage.style.width=`${chartWidth}px`;
	scroll.classList.toggle("is-scrollable",scrollable);
	if(typeof setupChartDragScrolling==="function"){
		setupChartDragScrolling(wrap);
	}
	if(scrollable){
		queueAlignChartScrollRight(scroll);
	}

	return canvas;
}

function chartCopyActionLabel(){
	if(typeof supportsMouseChartDrag==="function" && supportsMouseChartDrag()){
		return "Jobbkattintás";
	}

	return "Rábökés";
}

function chartBpPulseFmt(summary,includePulse=false){
	if(!summary || !Number.isFinite(summary.sys) || !Number.isFinite(summary.dia))return "n/a";
	const bp=`${Math.round(summary.sys)}/${Math.round(summary.dia)}`;
	if(!includePulse)return bp;
	return Number.isFinite(summary.pulse)
		? `${bp} P${Math.round(summary.pulse)}`
		: `${bp} Pn/a`;
}

function chartBpWithUnitPulseFmt(summary){
	if(!summary || !Number.isFinite(summary.sys) || !Number.isFinite(summary.dia))return "n/a";
	const bp=`${Math.round(summary.sys)}/${Math.round(summary.dia)} Hgmm`;
	return Number.isFinite(summary.pulse)
		? `${bp}, P${Math.round(summary.pulse)}`
		: `${bp}, Pn/a`;
}

function chartSlotSummary(daySummary,name){
	return daySummary?.slots?.find(slot=>slot.name===name);
}

function chartSignedBpDelta(sys,dia){
	if(!Number.isFinite(sys) || !Number.isFinite(dia))return "n/a";
	const sysText=`${sys>0 ? "+" : ""}${sys}`;
	const diaText=`${dia>0 ? "+" : ""}${dia}`;
	return `${sysText}/${diaText}`;
}

function cardiologyPairDelta(raw,unit){
	if(Number.isFinite(raw.first) && Number.isFinite(raw.second))return `${fmt(Math.abs(raw.first-raw.second))} ${unit}`;

	const pair=raw.pairSummary;
	const field=raw.measureKey==="Diasztolés" ? "dia" : raw.measureKey==="Pulzus" ? "pulse" : "sys";
	const fallbackDelta=pair && Number.isFinite(pair.first?.[field]) && Number.isFinite(pair.second?.[field])
		? Math.abs(pair.first[field]-pair.second[field])
		: NaN;
	if(Number.isFinite(fallbackDelta))return `${fmt(fallbackDelta)} ${unit}`;
	return "n/a";
}

function cardiologyDetailedTooltipLines(raw,unit){
	const daySummary=raw.daySummary;
	const morning=chartSlotSummary(daySummary,"Reggel");
	const noon=chartSlotSummary(daySummary,"Dél");
	const evening=chartSlotSummary(daySummary,"Este");
	const morningEveningDelta=morning && evening
		? chartSignedBpDelta(
			Math.round(morning.sys)-Math.round(evening.sys),
			Math.round(morning.dia)-Math.round(evening.dia)
		)
		: "n/a";
	const pairDelta=cardiologyPairDelta(raw,unit);

	const lines=[
		`[] ${chartCopyActionLabel()} → Eseménylistára []`,
		`Napi átlag: ${chartBpPulseFmt(daySummary,true)}`,
		`Reggeli átlag: ${chartBpPulseFmt(morning)}`,
		`Déli átlag: ${chartBpPulseFmt(noon)}`,
		`Esti átlag: ${chartBpPulseFmt(evening)}`,
		`Reggel–este Δ: ${morningEveningDelta}`,
		`Méréspár-Δ: ${pairDelta}`
	];
	const automaticLines=typeof getAutomaticAbnormalityReportLines==="function"
		? getAutomaticAbnormalityReportLines(raw.eventId)
		: [];
	return automaticLines.length
		? [...lines,"[][][] Autoanalitika [][][]",...automaticLines]
		: lines;
}

function cardiologyPulseTooltipLines(raw){
	const daySummary=raw.daySummary;
	const morning=chartSlotSummary(daySummary,"Reggel");
	const noon=chartSlotSummary(daySummary,"Dél");
	const evening=chartSlotSummary(daySummary,"Este");
	const pulseValues=(daySummary?.slots || []).flatMap(slot=>[
		slot.pair?.first?.pulse,
		slot.pair?.second?.pulse
	]).filter(Number.isFinite);
	const pulseRange=pulseValues.length
		? `${Math.round(Math.min(...pulseValues))}–${Math.round(Math.max(...pulseValues))}`
		: "n/a";

	const lines=[
		`[] ${chartCopyActionLabel()} → Eseménylistára []`,
		`Napi pulzusátlag: ${Number.isFinite(daySummary?.pulse) ? Math.round(daySummary.pulse) : "n/a"}`,
		`Reggel: ${Number.isFinite(morning?.pulse) ? Math.round(morning.pulse) : "n/a"}`,
		`Dél: ${Number.isFinite(noon?.pulse) ? Math.round(noon.pulse) : "n/a"}`,
		`Este: ${Number.isFinite(evening?.pulse) ? Math.round(evening.pulse) : "n/a"}`,
		`Pulzustartomány: ${pulseRange}`
	];
	const automaticLines=typeof getAutomaticAbnormalityReportLines==="function"
		? getAutomaticAbnormalityReportLines(raw.eventId)
		: [];
	return automaticLines.length
		? [...lines,"[][][] Autoanalitika [][][]",...automaticLines]
		: lines;
}

function gpBloodPressureTooltipLines(raw,unit){
	const daySummary=raw.daySummary;
	const morning=chartSlotSummary(daySummary,"Reggel");
	const evening=chartSlotSummary(daySummary,"Este");
	const pairDelta=cardiologyPairDelta(raw,unit);

	return [
		`[] ${chartCopyActionLabel()} → Adatok Vágólapra []`,
		`Napi átlag: ${chartBpWithUnitPulseFmt(daySummary)}`,
		`Reggeli átlag: ${chartBpPulseFmt(morning)} Hgmm`,
		`Esti átlag: ${chartBpPulseFmt(evening)} Hgmm`,
		`Δ: ${pairDelta}`
	];
}

function chartDevicePixelRatio(){
	return 2;
}

function chartGridColor(alpha){
	return document.body?.classList?.contains("dark")
		? `rgba(255,255,255,${alpha})`
		: `rgba(45,55,75,${alpha})`;
}

function parseCSV(text){

	charts.forEach(c=>c.destroy());
	charts.length=0;
	if(typeof resetChartEventRegistry==="function"){
		resetChartEventRegistry();
	}
	updateReportControls(text);

	const reader=createMeasurementReader(text);
	const {rows,slots}=reader;

	const sys=[];
	const dia=[];
	const pulse=[];
	const sysDaily=[];
	const diaDaily=[];
	const pulseDaily=[];

	rows.forEach((cols,dayIndex)=>{

		const date=cols[0];
			const dayValues={
				sys:[],
				dia:[],
				pulse:[]
			};
			const slotSummaries=[];

			slots.forEach(slot=>{
				const sysAverage=average(
					reader.getValue(cols,slot,0,"SYS"),
					reader.getValue(cols,slot,1,"SYS")
				);
				const diaAverage=average(
					reader.getValue(cols,slot,0,"DIA"),
					reader.getValue(cols,slot,1,"DIA")
				);
				const pulseAverage=average(
					reader.getValue(cols,slot,0,"P"),
					reader.getValue(cols,slot,1,"P")
				);
				dayValues.sys.push(sysAverage);
				dayValues.dia.push(diaAverage);
				dayValues.pulse.push(pulseAverage);
				slotSummaries.push({
					name:slot.name,
					sys:sysAverage,
					dia:diaAverage,
					pulse:pulseAverage,
					pair:{
						first:{
							sys:reader.getValue(cols,slot,0,"SYS"),
							dia:reader.getValue(cols,slot,0,"DIA"),
							pulse:reader.getValue(cols,slot,0,"P")
						},
						second:{
							sys:reader.getValue(cols,slot,1,"SYS"),
							dia:reader.getValue(cols,slot,1,"DIA"),
							pulse:reader.getValue(cols,slot,1,"P")
						}
					}
				});
			});
			const daySummary={
				sys:mean(dayValues.sys),
				dia:mean(dayValues.dia),
				pulse:mean(dayValues.pulse),
				slots:slotSummaries
			};

		slots.forEach((slot,slotIndex)=>{

			const x=dayIndex*3+slotIndex;

				sys.push({
					x,
					date,
					dayIndex,
					partOfDay:slot.name,
					shortPartOfDay:slot.short,
					dayAverage:mean(dayValues.sys),
					daySummary,
					pairSummary:slotSummaries[slotIndex]?.pair,
					a:reader.getValue(cols,slot,0,"SYS"),
					b:reader.getValue(cols,slot,1,"SYS")
				});

				dia.push({
					x,
					date,
					dayIndex,
					partOfDay:slot.name,
					shortPartOfDay:slot.short,
					dayAverage:mean(dayValues.dia),
					daySummary,
					pairSummary:slotSummaries[slotIndex]?.pair,
					a:reader.getValue(cols,slot,0,"DIA"),
					b:reader.getValue(cols,slot,1,"DIA")
				});

				pulse.push({
					x,
					date,
					dayIndex,
					partOfDay:slot.name,
					shortPartOfDay:slot.short,
					dayAverage:mean(dayValues.pulse),
					daySummary,
					pairSummary:slotSummaries[slotIndex]?.pair,
					a:reader.getValue(cols,slot,0,"P"),
					b:reader.getValue(cols,slot,1,"P")
				});
		});

		sysDaily.push({x:dayIndex,y:mean(dayValues.sys),date});
		diaDaily.push({x:dayIndex,y:mean(dayValues.dia),date});
		pulseDaily.push({x:dayIndex,y:mean(dayValues.pulse),date});
	});

	if(typeof registerAutomaticAbnormalities==="function" && typeof buildAutomaticAbnormalitiesFromText==="function"){
		registerAutomaticAbnormalities(buildAutomaticAbnormalitiesFromText(text));
	}

	draw("sysChart","RÉSZLETES SZISZTOLÉS",sys);
	draw("diaChart","RÉSZLETES DIASZTOLÉS",dia);
	draw("pulseChart","RÉSZLETES PULZUS",pulse);
	drawDaily("sysDailyChart","SZISZTOLÉS NAPI ÁTLAG",sysDaily,"Szisztolés");
	drawDaily("diaDailyChart","DIASZTOLÉS NAPI ÁTLAG",diaDaily,"Diasztolés");
	drawDaily("pulseDailyChart","PULZUS NAPI ÁTLAG",pulseDaily,"Pulzus");
}

function parseChartDateParts(date){
	const match=String(date).match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?$/);
	if(!match){
		return {
			day:String(date),
			monthDay:String(date)
		};
	}

	return {
		day:String(Number(match[3])),
		monthDay:`${match[2].padStart(2,"0")}.${match[3].padStart(2,"0")}`
	};
}

function chartDateLabel(date,mode){
	const parts=parseChartDateParts(date);
	return mode===0 ? parts.day : parts.monthDay;
}

function chartTickRotation(mode){
	return mode===2 ? 90 : 0;
}

function getChartDateLabelMode(){
	return currentDateLabelMode;
}

function setChartDateLabelMode(chart,mode){
	chart.$dateLabelMode=mode;
	const rotation=chartTickRotation(mode);
	chart.options.scales.x.ticks.minRotation=rotation;
	chart.options.scales.x.ticks.maxRotation=rotation;
	chart.update("none");
}

function setAllChartDateLabelModes(mode){
	currentDateLabelMode=mode;
	charts.forEach(chart=>{
		setChartDateLabelMode(chart,mode);
	});
}

function detailedTickLabel(data,value,mode){
	if(!Number.isInteger(value) || value<0 || value>=data.length)return "";
	const item=data[value];
	const isDateSlot=value%3===1;
	if(!isDateSlot)return "";
	return chartDateLabel(item.date,mode);
}

function dailyTickLabel(data,value,mode){
	if(!Number.isInteger(value) || value<0 || value>=data.length)return "";
	return chartDateLabel(data[value].date,mode);
}

function chartMeasureKey(title){
	if(String(title).includes("SZISZTOLÉS"))return "Szisztolés";
	if(String(title).includes("DIASZTOLÉS"))return "Diasztolés";
	if(String(title).includes("PULZUS"))return "Pulzus";
	return title;
}

function draw(id,title,data){

	const datasets=[];
	const dayCount=Math.ceil(data.length/3);
	const hoverRanges=[];
	const measureKey=chartMeasureKey(title);
	const minVisibleBand=measureKey==="Pulzus" ? 1 : .8;

	const slots={
		reg:{label:"Reggel",avg:[],min:[],max:[]},
		del:{label:"Dél",avg:[],min:[],max:[]},
		este:{label:"Este",avg:[],min:[],max:[]}
	};

	data.forEach((d,index)=>{

		const min=Math.min(d.a,d.b);
		const max=Math.max(d.a,d.b);
		const avg=average(d.a,d.b);
		const visualPadding=max-min===0 ? minVisibleBand/2 : 0;
		const visualMin=min-visualPadding;
		const visualMax=max+visualPadding;
		const slotKey=index%3===0 ? "reg" : index%3===1 ? "del" : "este";
		const slot=slots[slotKey];

		const meta={
			eventId:`${id}:${d.x}`,
			chartId:id,
			x:d.x,
			date:d.date,
			partOfDay:d.partOfDay,
			shortPartOfDay:d.shortPartOfDay,
			slotKey,
				measure:title,
				measureKey,
				first:d.a,
				second:d.b,
				min,
				max,
				avg,
				dayAverage:d.dayAverage,
				daySummary:d.daySummary,
				pairSummary:d.pairSummary
			};
		if(typeof registerChartEventMeta==="function"){
			registerChartEventMeta(meta);
		}

		datasets.push({
			label:`${d.partOfDay} mérési tartomány`,
			data:[
				{...meta,y:visualMin,actualValue:min,valueType:"minimum"},
				{...meta,y:visualMax,actualValue:max,valueType:"maximum"}
			],
			showLine:true,
			borderColor:()=>chartTimeColor(slotKey,"faint"),
			pointRadius:0,
			borderWidth:0,
			tension:.2,
			spanGaps:true
		});

		slot.avg.push({...meta,y:avg,valueType:"átlag"});
		slot.min.push({...meta,y:visualMin,actualValue:min,valueType:"minimum"});
		slot.max.push({...meta,y:visualMax,actualValue:max,valueType:"maximum"});
			hoverRanges.push({
				...meta,
				key:slotKey,
				x:d.x,
				date:d.date,
				measureKey,
				min:visualMin,
				max:visualMax,
				pointIndex:slot.min.length-1
			});
	});

	function band(key){
		const slot=slots[key];
		const upperDatasetIndex=datasets.length;
		slot.upperDatasetIndex=upperDatasetIndex;
		hoverRanges
			.filter(range=>range.key===key)
			.forEach(range=>{
				range.maxDatasetIndex=upperDatasetIndex;
			});

		datasets.push({
			label:`${slot.label} felső szélsőérték`,
			data:slot.max,
			showLine:true,
			borderColor:()=>chartTimeColor(key,"faint"),
			pointRadius:0,
			pointHoverRadius:6,
			pointHitRadius:8,
			borderWidth:1.5,
			fill:false,
			tension:.2,
			spanGaps:true
		});

		const lowerDatasetIndex=datasets.length;
		slot.lowerDatasetIndex=lowerDatasetIndex;
		hoverRanges
			.filter(range=>range.key===key)
			.forEach(range=>{
				range.minDatasetIndex=lowerDatasetIndex;
			});

		datasets.push({
			label:`${slot.label} szalag`,
			data:slot.min,
			showLine:true,
			borderColor:()=>chartTimeColor(key,"faint"),
			backgroundColor:"transparent",
			pointRadius:0,
			pointHoverRadius:6,
			pointHitRadius:8,
			borderWidth:1.5,
			fill:false,
			tension:.2,
			spanGaps:true
		});
	}

	band("reg");
	band("del");
	band("este");

	Object.keys(slots).forEach(key=>{
		const slot=slots[key];
		const avgDatasetIndex=datasets.length;

		hoverRanges
			.filter(range=>range.key===key)
			.forEach(range=>{
				range.avgDatasetIndex=avgDatasetIndex;
			});

		datasets.push({
			label:`${slot.label} átlag`,
			data:slot.avg,
			showLine:true,
			borderColor:()=>chartTimeColor(key,"line"),
			pointRadius:3.5,
			pointHoverRadius:6,
			pointBackgroundColor:()=>chartTimeColor(key,"line"),
			pointBorderColor:"white",
			pointBorderWidth:1,
			borderWidth:2.5,
			tension:.2,
			spanGaps:true
		});
	});

	const unit=measureKey==="Pulzus" ? "/perc" : "Hgmm";
	const canvas=prepareChartCanvas(id,dayCount,"detailed",title);

	const chart=new Chart(
		canvas,
		{
			type:"scatter",

			data:{datasets},
			plugins:[clinicalZonePlugin,dateLabelPlugin,daySeparatorPlugin,ribbonFillPlugin,measurementRangeLinePlugin,rangeHoverPlugin,extractSelectionPlugin,detailedChartCopyPlugin,valueLabelsPlugin],

			options:{
				responsive:true,
				maintainAspectRatio:false,
				devicePixelRatio:chartDevicePixelRatio(),
				events:["mousemove","mouseout","click","contextmenu"],
				interaction:{
					mode:"nearest",
					intersect:true
				},

				plugins:{
					legend:{
						display:false
					},
					title:{
						display:false
					},
					tooltip:{
						animation:{
							duration:0
						},
						position:"detailTooltipPositioner",
						filter:item=>Boolean(item.raw?.eventId) && item.raw.valueType!=="szalag",
							callbacks:{
								title:items=>{
									if(!items.length)return "";
									const raw=items[0].raw;
									return `${raw.date} - ${raw.partOfDay}`;
								},
								label:item=>{
									if(!item?.raw)return "";
									const raw=item.raw;
									if(typeof getReportMode==="function" && getReportMode()==="cardiology"){
										if(measureKey==="Pulzus"){
											return cardiologyPulseTooltipLines(raw);
										}
										return cardiologyDetailedTooltipLines(raw,unit);
									}
									if(measureKey!=="Pulzus"){
										return gpBloodPressureTooltipLines(raw,unit);
									}
									const lines=[
										`[] ${chartCopyActionLabel()} → Adatok Vágólapra []`,
										`Napi átlag: ${fmt(raw.dayAverage)} ${unit}`,
										`Δ: ${fmt(Math.abs(raw.first-raw.second))} ${unit}`
								];
								return lines;
							}
						}
					},
					clinicalZonePlugin:{
						ranges:getClinicalRanges()[measureKey]
					},
					ribbonFillPlugin:{
						slots
					},
					measurementRangeLinePlugin:{
						ranges:hoverRanges
					},
					daySeparatorPlugin:{
						dayCount
					},
					rangeHoverPlugin:{
						ranges:hoverRanges
					}
				},

				scales:{ // A reggel/dél/este mérésoszlopokat jelző függőleges gridvonalakat és az Y-tengely értékeit a chart-ra vízszintesen rádrótozó vízszintes gridvonalak opacity-értéke.
					x:{
						type:"linear",
						min:-1.05,
						max:data.length-.65,
						grid:{
							color:()=>chartGridColor(.04)
						},
						ticks:{
							stepSize:1,
							callback:function(value){
								return detailedTickLabel(data,value,getChartDateLabelMode());
							},
							autoSkip:false,
							maxRotation:0,
							minRotation:0
						}
					},
					y:{
						...chartDefaultYScale(measureKey),
						grid:{
							color:()=>chartGridColor(.10)
						}
					}
				}
			}
		}
	);

	setChartDateLabelMode(chart,currentDateLabelMode);
	charts.push(chart);
	if(typeof updateExtractCounters==="function"){
		updateExtractCounters();
	}
}

function drawDaily(id,title,data,rangeTitle){
	const canvas=prepareChartCanvas(id,data.length,"daily",title);

	const chart=new Chart(
		canvas,
		{
			type:"scatter",

			data:{
				datasets:[{
					label:title,
					data,
					parsing:false,
					showLine:true,
					borderColor:()=>chartDailyColor(rangeTitle),
					backgroundColor:()=>chartDailyColor(rangeTitle),
					pointRadius:4,
					pointHoverRadius:6,
					pointBorderColor:"white",
					pointBorderWidth:1,
					borderWidth:2.5,
					tension:.2
				}]
			},
			plugins:[clinicalZonePlugin,dateLabelPlugin,dailyValueLabelsPlugin],

			options:{
				responsive:true,
				maintainAspectRatio:false,
				devicePixelRatio:chartDevicePixelRatio(),
				interaction:{
					mode:"nearest",
					intersect:false
				},

				plugins:{
					legend:{
						display:false
					},
					title:{
						display:false
					},
					tooltip:{
						enabled:false
					},
					clinicalZonePlugin:{
						ranges:getClinicalRanges()[rangeTitle]
					}
				},

				scales:{
					x:{
						type:"linear",
						min:-.25,
						max:data.length-.75,
						grid:{
							color:()=>chartGridColor(.14)
						},
						ticks:{
							stepSize:1,
							callback:function(value){
								return dailyTickLabel(data,value,getChartDateLabelMode());
							},
							autoSkip:false,
							maxRotation:0,
							minRotation:0
						}
					},
					y:{
						...chartDefaultYScale(rangeTitle),
						grid:{
							color:()=>chartGridColor(.16)
						}
					}
				}
			}
		}
	);

	setChartDateLabelMode(chart,currentDateLabelMode);
	charts.push(chart);
}
