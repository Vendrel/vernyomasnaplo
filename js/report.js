function buildMeasurementDays(text){
	const reader=createMeasurementReader(text);
	const {rows,slots}=reader;
	const dayMap=new Map();

	rows.forEach((cols,rowIndex)=>{
		const date=String(cols[0] || "").trim();
		if(!date)return;

		if(!dayMap.has(date)){
				dayMap.set(date,{
					date,
					firstRowIndex:rowIndex,
					slots:[],
					hbpmReadings:[],
					hbpmPulse:[],
					fullSys:[],
					fullDia:[],
					fullPulse:[]
				});
		}

		const day=dayMap.get(date);

		slots.forEach(slot=>{
			const slotReadings=[];

			for(let reading=0;reading<2;reading++){
				const sys=reader.getValue(cols,slot,reading,"SYS");
				const dia=reader.getValue(cols,slot,reading,"DIA");
				const pulse=reader.getValue(cols,slot,reading,"P");

				slotReadings.push({sys,dia,pulse});

				if(Number.isFinite(sys))day.fullSys.push(sys);
				if(Number.isFinite(dia))day.fullDia.push(dia);
				if(Number.isFinite(pulse))day.fullPulse.push(pulse);

				if(slot.hbpm && Number.isFinite(sys) && Number.isFinite(dia)){
					day.hbpmReadings.push({sys,dia,pulse,slot:slot.name,date,readingIndex:reading});
				}

				if(slot.hbpm && Number.isFinite(pulse)){
					day.hbpmPulse.push(pulse);
				}
			}

			day.slots.push({
				name:slot.name,
				readings:slotReadings
			});
		});
	});

	return Array.from(dayMap.values())
		.sort((a,b)=>dateSortKey(a.date,a.firstRowIndex)-dateSortKey(b.date,b.firstRowIndex));
}

function reportFiniteNumbers(values){
	return values
		.map(value=>Number(value))
		.filter(value=>Number.isFinite(value));
}

function reportStandardDeviation(values){
	const finiteValues=reportFiniteNumbers(values);
	if(finiteValues.length<2)return NaN;
	const averageValue=mean(finiteValues);
	const variance=finiteValues.reduce((sum,value)=>sum+(value-averageValue)**2,0)/(finiteValues.length-1);
	return Math.sqrt(variance);
}

function reportCoefficientOfVariation(values){
	const averageValue=mean(values);
	const standardDeviation=reportStandardDeviation(values);
	if(!Number.isFinite(averageValue) || averageValue===0 || !Number.isFinite(standardDeviation))return NaN;
	return standardDeviation/averageValue*100;
}

function reportPercentile(values,percentile){
	const finiteValues=reportFiniteNumbers(values).sort((a,b)=>a-b);
	if(!finiteValues.length)return NaN;
	if(finiteValues.length===1)return finiteValues[0];
	const position=(finiteValues.length-1)*percentile;
	const lowerIndex=Math.floor(position);
	const upperIndex=Math.ceil(position);
	const weight=position-lowerIndex;
	return finiteValues[lowerIndex]*(1-weight)+finiteValues[upperIndex]*weight;
}

function reportDateToDayNumber(date,fallbackIndex){
	const match=String(date).match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?$/);
	if(!match)return fallbackIndex;
	return Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]))/86400000;
}

function reportSlotTimeOffset(reading){
	const slotOffset=reading.slot==="Reggel" ? 0.25 : reading.slot==="Este" ? 0.75 : 0.5;
	return slotOffset+(reading.readingIndex || 0)*0.02;
}

function buildTimedHbpmReadings(days){
	const firstDayNumber=days.length ? reportDateToDayNumber(days[0].date,0) : 0;
	return days.flatMap((day,dayIndex)=>{
		const dayNumber=reportDateToDayNumber(day.date,dayIndex)-firstDayNumber;
		return day.hbpmReadings.map(reading=>({
			...reading,
			time:dayNumber+reportSlotTimeOffset(reading)
		}));
	});
}

function reportLinearRegressionSlope(points,valueKey){
	const finitePoints=points
		.map(point=>({x:Number(point.time),y:Number(point[valueKey])}))
		.filter(point=>Number.isFinite(point.x) && Number.isFinite(point.y));
	if(finitePoints.length<2)return NaN;
	const xMean=mean(finitePoints.map(point=>point.x));
	const yMean=mean(finitePoints.map(point=>point.y));
	const denominator=finitePoints.reduce((sum,point)=>sum+(point.x-xMean)**2,0);
	if(denominator===0)return NaN;
	return finitePoints.reduce((sum,point)=>sum+(point.x-xMean)*(point.y-yMean),0)/denominator;
}

function reportMaxDailyRange(days,key){
	const ranges=days
		.map(day=>day.hbpmReadings.map(reading=>reading[key]).filter(Number.isFinite))
		.filter(values=>values.length>=2)
		.map(values=>Math.max(...values)-Math.min(...values));
	return ranges.length ? Math.max(...ranges) : NaN;
}

function reportMeasurementOccasionEpisodeCount(days,predicate){
	return days.reduce((count,day)=>{
		const groupedBySlot=day.hbpmReadings.reduce((groups,reading)=>{
			if(!groups.has(reading.slot)){
				groups.set(reading.slot,[]);
			}
			groups.get(reading.slot).push(reading);
			return groups;
		},new Map());

		return count+Array.from(groupedBySlot.values()).filter(readings=>
			readings.some(predicate)
		).length;
	},0);
}

function reportOutlierIndexes(values){
	const finiteValues=reportFiniteNumbers(values);
	if(finiteValues.length<4)return new Set();
	const averageValue=mean(finiteValues);
	const standardDeviation=reportStandardDeviation(finiteValues);
	const q1=reportPercentile(finiteValues,0.25);
	const q3=reportPercentile(finiteValues,0.75);
	const iqr=q3-q1;
	const lowerFence=q1-1.5*iqr;
	const upperFence=q3+1.5*iqr;
	const outlierIndexes=new Set();

	values.forEach((rawValue,index)=>{
		const value=Number(rawValue);
		if(!Number.isFinite(value))return;
		const zScore=standardDeviation>0 ? Math.abs((value-averageValue)/standardDeviation) : 0;
		const iqrOutlier=iqr>0 && (value<lowerFence || value>upperFence);
		if(zScore>2 || iqrOutlier){
			outlierIndexes.add(index);
		}
	});

	return outlierIndexes;
}

function automaticAbnormalityClinicalStatus(chartId,value,rawValues=[]){
	const values=reportFiniteNumbers(rawValues).length ? reportFiniteNumbers(rawValues) : reportFiniteNumbers([value]);
	const thresholds=typeof getActiveBpThresholds==="function"
		? getActiveBpThresholds().diagnosticThresholds
		: {hbpmHighSys:135,hbpmHighDia:85,severeHighSys:180,severeHighDia:110,lowSys:90,lowDia:60};
	if(!values.length)return {type:"statistical",label:"Statisztikai abnormalitás"};
	if(chartId==="sysChart"){
		const high=Math.max(...values);
		const low=Math.min(...values);
		if(high>=thresholds.severeHighSys)return {type:"clinical",label:"Súlyosan magas SYS-sáv"};
		if(high>=thresholds.hbpmHighSys)return {type:"clinical",label:"Egyedi mérés otthoni küszöb feletti SYS-sávban"};
		if(low<thresholds.lowSys)return {type:"clinical",label:"Egyedi mérés alacsony SYS-sávban"};
	}
	if(chartId==="diaChart"){
		const high=Math.max(...values);
		const low=Math.min(...values);
		if(high>=thresholds.severeHighDia)return {type:"clinical",label:"Súlyosan magas DIA-sáv"};
		if(high>=thresholds.hbpmHighDia)return {type:"clinical",label:"Egyedi mérés otthoni küszöb feletti DIA-sávban"};
		if(low<thresholds.lowDia)return {type:"clinical",label:"Egyedi mérés alacsony DIA-sávban"};
	}
	if(chartId==="pulseChart"){
		if(Math.max(...values)>=100)return {type:"clinical",label:"Tachycardia-tartományú pulzussáv"};
		if(Math.max(...values)>=90)return {type:"clinical",label:"Emelkedett pulzussáv"};
	}
	return {type:"statistical",label:"Klinikai sávon kívüli statisztikai jelzés"};
}

function automaticAbnormalityPrefix(type){
	return type==="clinical" ? "🅺" : "🆂";
}

function automaticAbnormalityText(abnormality,logic,type){
	return `${automaticAbnormalityPrefix(type)} ${abnormality}; ${logic}`;
}

function automaticAbnormalityMake(chartId,x,date,partOfDay,measureKey,value,rawValues,rawReadings,abnormality,logic,indicator,evidence=null){
	const status=automaticAbnormalityClinicalStatus(chartId,value,rawValues);
	return {
		eventId:`${chartId}:${x}`,
		chartId,
		x,
		date,
		partOfDay,
		measureKey,
		value,
		rawValues,
		rawReadings,
		type:status.type,
		clinicalLabel:status.label,
		indicator,
		abnormality,
		logic,
		evidence,
		text:automaticAbnormalityText(abnormality,logic,status.type)
	};
}

function automaticAbnormalitySeriesFromDays(days){
	const series={
		sysChart:[],
		diaChart:[],
		pulseChart:[]
	};

	days.forEach((day,dayIndex)=>{
		day.slots.forEach((slot,slotIndex)=>{
			const x=dayIndex*3+slotIndex;
			const avg=miniReportSlotAverage(slot);
			const rawReadings=slot.readings || [];
			series.sysChart.push({x,date:day.date,partOfDay:slot.name,measureKey:"Szisztolés",value:avg.sys,rawValues:rawReadings.map(reading=>reading.sys),rawReadings});
			series.diaChart.push({x,date:day.date,partOfDay:slot.name,measureKey:"Diasztolés",value:avg.dia,rawValues:rawReadings.map(reading=>reading.dia),rawReadings});
			series.pulseChart.push({x,date:day.date,partOfDay:slot.name,measureKey:"Pulzus",value:avg.pulse,rawValues:rawReadings.map(reading=>reading.pulse),rawReadings});
		});
	});

	return series;
}

function automaticAbnormalityFinitePoints(points){
	return points.filter(point=>Number.isFinite(point.value));
}

function automaticAbnormalityMostDeviantPoint(points){
	const finitePoints=automaticAbnormalityFinitePoints(points);
	if(!finitePoints.length)return null;
	const averageValue=mean(finitePoints.map(point=>point.value));
	return finitePoints.reduce((best,point)=>{
		const distance=Math.abs(point.value-averageValue);
		return !best || distance>best.distance ? {point,distance} : best;
	},null)?.point || null;
}

function automaticAbnormalityPushAtPoint(results,point,chartId,abnormality,logic,indicator,evidence=null){
	if(!point)return;
	results.push(automaticAbnormalityMake(
		chartId,
		point.x,
		point.date,
		point.partOfDay,
		point.measureKey,
		point.value,
		point.rawValues,
		point.rawReadings,
		abnormality,
		logic,
		indicator,
		evidence
	));
}

function automaticAbnormalityAddVariability(results,series,chartId,indicator,thresholds){
	const points=automaticAbnormalityFinitePoints(series[chartId] || []);
	if(points.length<2)return;
	const values=points.map(point=>point.value);
	const sd=reportStandardDeviation(values);
	const cv=reportCoefficientOfVariation(values);
	const point=automaticAbnormalityMostDeviantPoint(points);

	thresholds.sd.forEach(rule=>{
		if(sd>rule.limit){
			automaticAbnormalityPushAtPoint(results,point,chartId,rule.abnormality,rule.logic,indicator);
		}
	});
	thresholds.cv.forEach(rule=>{
		if(cv>rule.limit){
			automaticAbnormalityPushAtPoint(results,point,chartId,rule.abnormality,rule.logic,"Variációs együttható");
		}
	});
}

function automaticAbnormalityAddDailyAmplitude(results,series,chartId,rules){
	const byDay=new Map();
	automaticAbnormalityFinitePoints(series[chartId] || []).forEach(point=>{
		if(!byDay.has(point.date)){
			byDay.set(point.date,[]);
		}
		byDay.get(point.date).push(point);
	});

	byDay.forEach(points=>{
		if(points.length<2)return;
		const minPoint=points.reduce((best,point)=>point.value<best.value ? point : best,points[0]);
		const maxPoint=points.reduce((best,point)=>point.value>best.value ? point : best,points[0]);
		const amplitude=maxPoint.value-minPoint.value;
		rules.forEach(rule=>{
			if(amplitude>rule.limit){
				automaticAbnormalityPushAtPoint(results,maxPoint,chartId,rule.abnormality,rule.logic,rule.indicator);
				automaticAbnormalityPushAtPoint(results,minPoint,chartId,rule.abnormality,rule.logic,rule.indicator);
			}
		});
	});
}

function automaticAbnormalityAddDailyPeaks(results,series){
	const byDay=new Map();
	automaticAbnormalityFinitePoints(series.sysChart || []).forEach(point=>{
		if(!byDay.has(point.date)){
			byDay.set(point.date,new Map());
		}
		byDay.get(point.date).set(point.partOfDay,point);
	});

	byDay.forEach(slots=>{
		const morning=slots.get("Reggel");
		const noon=slots.get("Dél");
		const evening=slots.get("Este");
		if(!morning || !noon || !evening)return;

		if(noon.value>morning.value+10 && noon.value>evening.value+10){
			automaticAbnormalityPushAtPoint(results,noon,"sysChart","Déli csúcs","Dél > reggel +10 és dél > este +10","Délutáni emelkedés",automaticAbnormalityDailyPeakEvidence(morning,noon,evening));
		}
		if(evening.value>morning.value+10 && evening.value>noon.value+10){
			automaticAbnormalityPushAtPoint(results,evening,"sysChart","Esti csúcs","Este > reggel +10 és este > dél +10","Esti emelkedés",automaticAbnormalityDailyPeakEvidence(morning,noon,evening));
		}
		if(morning.value>noon.value+10 && morning.value>evening.value+10){
			automaticAbnormalityPushAtPoint(results,morning,"sysChart","Reggeli csúcs","Reggel > dél +10 és reggel > este +10","Reggeli csúcs",automaticAbnormalityDailyPeakEvidence(morning,noon,evening));
		}
	});
}

function automaticAbnormalityDailyPeakEvidence(morning,noon,evening){
	return {
		type:"dailyPeak",
		morning:morning.value,
		noon:noon.value,
		evening:evening.value
	};
}

function automaticAbnormalityAddOutliers(results,series,chartId,rules){
	const points=automaticAbnormalityFinitePoints(series[chartId] || []);
	if(points.length<4)return;
	const values=points.map(point=>point.value);
	const averageValue=mean(values);
	const sd=reportStandardDeviation(values);
	if(!Number.isFinite(averageValue) || !Number.isFinite(sd) || sd<=0)return;

	points.forEach(point=>{
		rules.forEach(rule=>{
			const distance=rule.absolute ? Math.abs(point.value-averageValue) : point.value-averageValue;
			if(distance>rule.sd*sd){
				automaticAbnormalityPushAtPoint(results,point,chartId,rule.abnormality,rule.logic,rule.indicator,{
					type:"outlier",
					average:averageValue,
					sd,
					difference:point.value-averageValue
				});
			}
		});
	});
}

function automaticAbnormalitySdMultiplier(){
	const value=typeof getAutomaticAbnormalitySdMultiplier==="function"
		? Number(getAutomaticAbnormalitySdMultiplier())
		: 2;
	return Number.isFinite(value) ? value : 2;
}

function automaticAbnormalityRollingWindow(points,index,size=20){
	const start=Math.max(0,index-size);
	return points.slice(start,index).map(point=>point.value).filter(Number.isFinite);
}

function automaticAbnormalityAddBollinger(results,series,chartId,rules){
	const points=series[chartId] || [];
	points.forEach((point,index)=>{
		if(!Number.isFinite(point.value))return;
		const windowValues=automaticAbnormalityRollingWindow(points,index,20);
		if(windowValues.length<5)return;
		const ma=mean(windowValues);
		const sd=reportStandardDeviation(windowValues);
		if(!Number.isFinite(ma) || !Number.isFinite(sd) || sd<=0)return;

		rules.forEach(rule=>{
			const multiplier=Number.isFinite(rule.sd) ? rule.sd : automaticAbnormalitySdMultiplier();
			const boundary=ma+(rule.direction==="upper" ? multiplier*sd : -multiplier*sd);
			if((rule.direction==="upper" && point.value>boundary) || (rule.direction==="lower" && point.value<boundary)){
				automaticAbnormalityPushAtPoint(results,point,chartId,rule.abnormality,rule.logic,rule.indicator,{
					type:"bollinger",
					ma,
					sd,
					boundary,
					multiplier,
					direction:rule.direction
				});
			}
		});
	});
}

function automaticAbnormalityRsi(values,period=14){
	if(values.length<=period)return NaN;
	let gains=0;
	let losses=0;
	for(let index=values.length-period;index<values.length;index++){
		const delta=values[index]-values[index-1];
		if(delta>0){
			gains+=delta;
		}else{
			losses-=delta;
		}
	}
	if(losses===0)return gains>0 ? 100 : 50;
	const rs=gains/losses;
	return 100-(100/(1+rs));
}

function automaticAbnormalityAddRsi(results,series,chartId,measureLabel){
	const points=series[chartId] || [];
	points.forEach((point,index)=>{
		if(!Number.isFinite(point.value))return;
		const values=points.slice(0,index+1).map(item=>item.value).filter(Number.isFinite);
		const rsi=automaticAbnormalityRsi(values,14);
		if(rsi>70){
			automaticAbnormalityPushAtPoint(results,point,chartId,`${measureLabel} RSI-túlvett jelzés`,`RSI14 > 70`,"RSI");
		}
		if(rsi<30){
			automaticAbnormalityPushAtPoint(results,point,chartId,`${measureLabel} RSI-túladott jelzés`,`RSI14 < 30`,"RSI");
		}
	});
}

function buildAutomaticAbnormalitiesFromDays(days){
	const series=automaticAbnormalitySeriesFromDays(days);
	const results=[];
	const cvRules=[
		{limit:10,abnormality:"Emelkedett relatív variabilitás",logic:"CV >10%"},
		{limit:15,abnormality:"Jelentős relatív variabilitás",logic:"CV >15%"}
	];

	automaticAbnormalityAddVariability(results,series,"sysChart","SYS szórás",{
		sd:[
			{limit:10,abnormality:"Fokozott SYS-variabilitás",logic:"SD >10 Hgmm"},
			{limit:15,abnormality:"Jelentős SYS-variabilitás",logic:"SD >15 Hgmm"}
		],
		cv:cvRules
	});
	automaticAbnormalityAddVariability(results,series,"diaChart","DIA szórás",{
		sd:[
			{limit:8,abnormality:"Fokozott DIA-variabilitás",logic:"SD >8 Hgmm"},
			{limit:12,abnormality:"Jelentős DIA-variabilitás",logic:"SD >12 Hgmm"}
		],
		cv:cvRules
	});
	automaticAbnormalityAddDailyAmplitude(results,series,"sysChart",[
		{limit:25,abnormality:"Fokozott napi SYS-ingadozás",logic:"max SYS - min SYS >25",indicator:"Napi SYS-amplitúdó"},
		{limit:40,abnormality:"Jelentős napi SYS-ingadozás",logic:">40",indicator:"Napi SYS-amplitúdó"}
	]);
	automaticAbnormalityAddDailyAmplitude(results,series,"diaChart",[
		{limit:15,abnormality:"Fokozott napi DIA-ingadozás",logic:">15",indicator:"Napi DIA-amplitúdó"}
	]);
	automaticAbnormalityAddDailyPeaks(results,series);
	const sdMultiplier=automaticAbnormalitySdMultiplier();
	const sdLogic=(label,absolute=false)=>absolute
		? `abszolút eltérés > ${sdMultiplier}SD a globális átlagtól`
		: `${label} > globális átlag + ${sdMultiplier}SD`;
	automaticAbnormalityAddOutliers(results,series,"sysChart",[
		{sd:sdMultiplier,abnormality:"Szokatlanul magas SYS",logic:sdLogic("SYS"),indicator:"SYS outlier"},
		{sd:3,abnormality:"Extrém SYS-érték",logic:"SYS > globális átlag + 3SD",indicator:"SYS-outlier"}
	]);
	automaticAbnormalityAddOutliers(results,series,"diaChart",[
		{sd:sdMultiplier,abnormality:"Szokatlanul magas DIA",logic:sdLogic("DIA"),indicator:"DIA-outlier"}
	]);
	automaticAbnormalityAddOutliers(results,series,"pulseChart",[
		{sd:sdMultiplier,abnormality:"Szokatlan pulzus",logic:sdLogic("Pulzus",true),indicator:"Pulzus-outlier",absolute:true}
	]);
	const bollingerLogic=(label,direction)=>`${label} ${direction==="upper" ? ">" : "<"} MA20 ${direction==="upper" ? "+" : "-"} ${sdMultiplier}SD`;
	automaticAbnormalityAddBollinger(results,series,"sysChart",[
		{direction:"upper",abnormality:"Szokatlanul magas SYS",logic:bollingerLogic("SYS","upper"),indicator:"SYS Bollinger"},
		{direction:"lower",abnormality:"Szokatlanul alacsony SYS",logic:bollingerLogic("SYS","lower"),indicator:"SYS Bollinger"}
	]);
	automaticAbnormalityAddBollinger(results,series,"diaChart",[
		{direction:"upper",abnormality:"Szokatlanul magas DIA",logic:bollingerLogic("DIA","upper"),indicator:"DIA Bollinger"}
	]);
	automaticAbnormalityAddRsi(results,series,"sysChart","SYS");
	automaticAbnormalityAddRsi(results,series,"diaChart","DIA");
	automaticAbnormalityAddRsi(results,series,"pulseChart","Pulzus");

	return results;
}

function buildAutomaticAbnormalitiesFromText(text){
	if(!text)return [];
	return buildAutomaticAbnormalitiesFromDays(buildMeasurementDays(text));
}

function automaticAbnormalityTrend(abnormalities){
	const items=(abnormalities || []).filter(item=>Number.isFinite(item.x));
	if(!items.length)return "nem értékelhető";
	const maxX=Math.max(...items.map(item=>item.x));
	if(maxX<19)return "nem értékelhető";
	const counts=Array.from({length:maxX+1},()=>0);
	items.forEach(item=>{
		counts[item.x]+=1;
	});
	const rolling=[];
	for(let index=19;index<counts.length;index++){
		const window=counts.slice(index-19,index+1);
		rolling.push(mean(window));
	}
	if(rolling.length<2)return "nem értékelhető";
	const first=rolling[0];
	const last=rolling[rolling.length-1];
	const delta=last-first;
	if(delta>0.15)return "növekvő";
	if(delta<-0.15)return "csökkenő";
	return "stabil";
}

function automaticAbnormalityReportLines(abnormalities,type){
	const filtered=(abnormalities || []).filter(item=>item.type===type);
	const label=type==="clinical" ? "klinikai" : "statisztikai";
	if(!filtered.length)return [`Nincs automatikusan jelzett ${label} abnormalitás.`];
	return filtered.map(item=>{
		const clinicalText=item.type==="clinical" ? ` (${item.clinicalLabel})` : "";
		return `${formatMiniReportDate(item.date)} - ${item.partOfDay} - ${item.measureKey}: ${item.text}; ${automaticAbnormalityValueText(item)}${clinicalText}`;
	});
}

function automaticAbnormalityValueText(item){
	const unit=item.measureKey==="Pulzus" ? "/perc" : "Hgmm";
	const separator=unit.startsWith("/") ? "" : " ";
	const rawValues=reportFiniteNumbers(item.rawValues || []);
	const evidenceText=automaticAbnormalityEvidenceText(item,unit,separator);
	const averageText=Number.isFinite(item.value)
		? `${item.measureKey}-átlag: ${fmt(item.value)}${separator}${unit}`
		: "átlag: n/a";
	if(item.measureKey==="Szisztolés" || item.measureKey==="Diasztolés"){
		const bpPairs=automaticAbnormalityBpPairText(item.rawReadings || []);
		const base=bpPairs ? `Mért vérnyomások: ${bpPairs} (${averageText})` : `Érték: ${averageText}`;
		return evidenceText ? `${base}; ${evidenceText}` : base;
	}
	if(!rawValues.length)return evidenceText ? `Érték: ${averageText}; ${evidenceText}` : `Érték: ${averageText}`;
	const readingsText=rawValues
		.map(value=>`${fmt(value)}${separator}${unit}`)
		.join(", ");
	const base=`Értékek: ${readingsText} (${averageText})`;
	return evidenceText ? `${base}; ${evidenceText}` : base;
}

function automaticAbnormalityBpPairText(readings){
	const pairs=(readings || [])
		.filter(reading=>Number.isFinite(reading?.sys) || Number.isFinite(reading?.dia))
		.map(reading=>{
			const sys=Number.isFinite(reading.sys) ? fmt(reading.sys) : "n/a";
			const dia=Number.isFinite(reading.dia) ? fmt(reading.dia) : "n/a";
			const pulse=Number.isFinite(reading.pulse) ? `, P${fmt(reading.pulse)}` : "";
			return `${sys}/${dia} Hgmm${pulse}`;
		});
	return pairs.join(", ");
}

function automaticAbnormalityEvidenceText(item,unit,separator){
	const evidence=item.evidence;
	if(!evidence)return "";
	if(evidence.type==="dailyPeak"){
		return `Összevetés: reggel ${fmt(evidence.morning)}${separator}${unit}, dél ${fmt(evidence.noon)}${separator}${unit}, este ${fmt(evidence.evening)}${separator}${unit}`;
	}
	if(evidence.type==="outlier"){
		const difference=automaticAbnormalitySignedUnit(evidence.difference,unit);
		return `Referencia: globális átlag ${fmt(evidence.average)}${separator}${unit}, SD ${fmt(evidence.sd)}${separator}${unit}, eltérés ${difference}`;
	}
	if(evidence.type==="bollinger"){
		return `Referencia: MA20 ${fmt(evidence.ma)}${separator}${unit}, SD20 ${fmt(evidence.sd)}${separator}${unit}, ${evidence.direction==="upper" ? "felső" : "alsó"} határ ${fmt(evidence.boundary)}${separator}${unit}`;
	}
	return "";
}

function automaticAbnormalitySignedUnit(value,unit){
	if(!Number.isFinite(value))return "n/a";
	const separator=String(unit).startsWith("/") ? "" : " ";
	return `${value>0 ? "+" : ""}${fmt(value)}${separator}${unit}`;
}

function automaticAbnormalityReportSection(abnormalities,type){
	const title=type==="clinical" ? "🅺 Klinikai abnormalitások" : "🆂 Statisztikai abnormalitások";
	const trendSubject=type==="clinical" ? "klinikai" : "statisztikai";
	const filtered=(abnormalities || []).filter(item=>item.type===type);
	const lines=[title];
	if(filtered.length){
		lines.push(`A ${trendSubject} abnormalitások trendje ${automaticAbnormalityTrend(filtered)}.`);
	}
	lines.push(...automaticAbnormalityReportLines(abnormalities,type));
	return lines;
}

function calculateReportStats(text){
	const days=buildMeasurementDays(text);
	const hbpmDays=days.filter(day=>day.hbpmReadings.length>0);
	const includedHbpmDays=hbpmDays.slice(1);
	const hbpmReadings=includedHbpmDays.flatMap(day=>day.hbpmReadings);
	const hbpmPulse=hbpmReadings
		.map(reading=>reading.pulse)
		.filter(Number.isFinite);
	const fullSys=days.flatMap(day=>day.fullSys);
	const fullDia=days.flatMap(day=>day.fullDia);
	const fullPulse=days.flatMap(day=>day.fullPulse);
	const morningReadings=hbpmReadings.filter(reading=>reading.slot==="Reggel");
	const eveningReadings=hbpmReadings.filter(reading=>reading.slot==="Este");
	const firstSevenDays=hbpmDays.slice(0,7);
	const lastSevenDays=hbpmDays.slice(-7);
	const firstSevenReadings=firstSevenDays.flatMap(day=>day.hbpmReadings);
	const lastSevenReadings=lastSevenDays.flatMap(day=>day.hbpmReadings);
	const canCreate=includedHbpmDays.length>=3 && hbpmReadings.length>=12;
	const trendStatus=hbpmDays.length>=14 ? "full" : hbpmDays.length>=8 ? "preliminary" : "unavailable";
	const trendWindowsOverlap=trendStatus==="preliminary";
	const trendCanCompare=trendStatus!=="unavailable" && firstSevenReadings.length>0 && lastSevenReadings.length>0;
	const timedHbpmReadings=buildTimedHbpmReadings(includedHbpmDays);
	const hbpmSysValues=hbpmReadings.map(reading=>reading.sys);
	const hbpmDiaValues=hbpmReadings.map(reading=>reading.dia);
	const sysOutlierIndexes=reportOutlierIndexes(hbpmSysValues);
	const diaOutlierIndexes=reportOutlierIndexes(hbpmDiaValues);
	const outlierCount=hbpmReadings.filter((reading,index)=>
		sysOutlierIndexes.has(index) || diaOutlierIndexes.has(index)
	).length;
	const bpThresholds=typeof getActiveBpThresholds==="function"
		? getActiveBpThresholds()
		: {
			profile:{id:"standard_adult",label:"Standard felnőtt"},
			diagnosticThresholds:{hbpmHighSys:135,hbpmHighDia:85,severeHighSys:180,severeHighDia:110,lowSys:90,lowDia:60},
			targetRange:{sysMin:null,sysMax:null,diaMin:null,diaMax:null}
		};
	const diagnosticThresholds=bpThresholds.diagnosticThresholds;
	const targetRange=bpThresholds.targetRange;
	const isAboveDiagnosticThreshold=reading=>reading.sys>=diagnosticThresholds.hbpmHighSys || reading.dia>=diagnosticThresholds.hbpmHighDia;
	const isVeryHigh=reading=>reading.sys>=diagnosticThresholds.severeHighSys || reading.dia>=diagnosticThresholds.severeHighDia;
	const isLow=reading=>reading.sys<diagnosticThresholds.lowSys || reading.dia<diagnosticThresholds.lowDia;
	const finiteTargetValue=value=>{
		const number=Number(value);
		return value!==null && value!==undefined && value!=="" && Number.isFinite(number) ? number : null;
	};
	const targetLimits={
		sysMin:finiteTargetValue(targetRange.sysMin),
		sysMax:finiteTargetValue(targetRange.sysMax),
		diaMin:finiteTargetValue(targetRange.diaMin),
		diaMax:finiteTargetValue(targetRange.diaMax)
	};
	const hasTargetRange=Object.values(targetLimits).some(value=>value!==null);
	const isBelowTargetRange=reading=>
		(targetLimits.sysMin!==null && reading.sys<targetLimits.sysMin)
		|| (targetLimits.diaMin!==null && reading.dia<targetLimits.diaMin);
	const isAboveTargetRange=reading=>
		(targetLimits.sysMax!==null && reading.sys>targetLimits.sysMax)
		|| (targetLimits.diaMax!==null && reading.dia>targetLimits.diaMax);
	const isOutsideTargetRange=reading=>isBelowTargetRange(reading) || isAboveTargetRange(reading);

	return {
		days,
		hbpmDays,
		includedHbpmDays,
		hbpmReadings,
		hbpmPulse,
		fullSys,
		fullDia,
		fullPulse,
		morningReadings,
		eveningReadings,
		firstSevenDays,
		lastSevenDays,
		firstSevenReadings,
		lastSevenReadings,
		timedHbpmReadings,
		canCreate,
		trendStatus,
		trendWindowsOverlap,
		trendCanCompare,
		bpProfile:bpThresholds.profile,
		bpDiagnosticThresholds:diagnosticThresholds,
		bpTargetRange:targetRange,
		hbpmSys:canCreate ? mean(hbpmSysValues) : NaN,
		hbpmDia:canCreate ? mean(hbpmDiaValues) : NaN,
		morningSys:morningReadings.length ? mean(morningReadings.map(reading=>reading.sys)) : NaN,
		morningDia:morningReadings.length ? mean(morningReadings.map(reading=>reading.dia)) : NaN,
		eveningSys:eveningReadings.length ? mean(eveningReadings.map(reading=>reading.sys)) : NaN,
		eveningDia:eveningReadings.length ? mean(eveningReadings.map(reading=>reading.dia)) : NaN,
		hbpmPulseAvg:hbpmPulse.length ? mean(hbpmPulse) : NaN,
		hbpmPulseMin:hbpmPulse.length ? Math.min(...hbpmPulse) : NaN,
		hbpmPulseMax:hbpmPulse.length ? Math.max(...hbpmPulse) : NaN,
		hbpmSysMin:hbpmReadings.length ? Math.min(...hbpmSysValues) : NaN,
		hbpmSysMax:hbpmReadings.length ? Math.max(...hbpmSysValues) : NaN,
		hbpmDiaMin:hbpmReadings.length ? Math.min(...hbpmDiaValues) : NaN,
		hbpmDiaMax:hbpmReadings.length ? Math.max(...hbpmDiaValues) : NaN,
		aboveDiagnosticThresholdCount:hbpmReadings.filter(isAboveDiagnosticThreshold).length,
		veryHighCount:hbpmReadings.filter(isVeryHigh).length,
		lowCount:hbpmReadings.filter(isLow).length,
		hasTargetRange,
		targetRangeBelowCount:hasTargetRange ? hbpmReadings.filter(isBelowTargetRange).length : 0,
		targetRangeAboveCount:hasTargetRange ? hbpmReadings.filter(isAboveTargetRange).length : 0,
		targetRangeOutOfRangeCount:hasTargetRange ? hbpmReadings.filter(isOutsideTargetRange).length : 0,
		hypertensiveEpisodeCount:reportMeasurementOccasionEpisodeCount(includedHbpmDays,isAboveDiagnosticThreshold),
		hypotensiveEpisodeCount:reportMeasurementOccasionEpisodeCount(includedHbpmDays,isLow),
		sysSd:reportStandardDeviation(hbpmSysValues),
		diaSd:reportStandardDeviation(hbpmDiaValues),
		pulseSd:reportStandardDeviation(hbpmPulse),
		sysCv:reportCoefficientOfVariation(hbpmSysValues),
		diaCv:reportCoefficientOfVariation(hbpmDiaValues),
		morningEveningSysDiff:mean(morningReadings.map(reading=>reading.sys))-mean(eveningReadings.map(reading=>reading.sys)),
		morningEveningDiaDiff:mean(morningReadings.map(reading=>reading.dia))-mean(eveningReadings.map(reading=>reading.dia)),
		maxDailySysRange:reportMaxDailyRange(includedHbpmDays,"sys"),
		maxDailyDiaRange:reportMaxDailyRange(includedHbpmDays,"dia"),
		sysP95:reportPercentile(hbpmSysValues,0.95),
		diaP95:reportPercentile(hbpmDiaValues,0.95),
		sysRegressionSlope:reportLinearRegressionSlope(timedHbpmReadings,"sys"),
		diaRegressionSlope:reportLinearRegressionSlope(timedHbpmReadings,"dia"),
		pulseRegressionSlope:reportLinearRegressionSlope(timedHbpmReadings,"pulse"),
		outlierCount,
		autoAbnormalities:buildAutomaticAbnormalitiesFromDays(days),
		firstSevenSys:firstSevenReadings.length ? mean(firstSevenReadings.map(reading=>reading.sys)) : NaN,
		firstSevenDia:firstSevenReadings.length ? mean(firstSevenReadings.map(reading=>reading.dia)) : NaN,
		lastSevenSys:lastSevenReadings.length ? mean(lastSevenReadings.map(reading=>reading.sys)) : NaN,
		lastSevenDia:lastSevenReadings.length ? mean(lastSevenReadings.map(reading=>reading.dia)) : NaN,
		fullSysAvg:fullSys.length ? mean(fullSys) : NaN,
		fullDiaAvg:fullDia.length ? mean(fullDia) : NaN,
		fullPulseAvg:fullPulse.length ? mean(fullPulse) : NaN
	};
}

function reportBpFmt(sys,dia){
	if(!Number.isFinite(sys) || !Number.isFinite(dia))return "n/a";
	return `${Math.round(sys)}/${Math.round(dia)} Hgmm`;
}

function reportRangeFmt(min,max,unit){
	if(!Number.isFinite(min) || !Number.isFinite(max))return "n/a";
	const separator=String(unit).startsWith("/") ? "" : " ";
	return `${Math.round(min)}–${Math.round(max)}${separator}${unit}`;
}

function reportPercent(numerator,denominator){
	return denominator ? `${Math.round(numerator/denominator*100)}%` : "n/a";
}

function reportSignedChange(value){
	if(!Number.isFinite(value))return "n/a";
	const rounded=Math.round(value);
	return `${rounded>0 ? "+" : ""}${rounded} Hgmm`;
}

function trendText(stats,sysChange,diaChange){
	if(stats.trendStatus==="unavailable")return "nem értékelhető: 7 napnyi vagy kevesebb HBPM-adat mellett érdemi idősoros trend nem állapítható meg";
	if(!Number.isFinite(sysChange) || !Number.isFinite(diaChange))return "nem megítélhető";
	const strongest=Math.abs(sysChange)>=Math.abs(diaChange) ? sysChange : diaChange;
	let direction="lényegében változatlan";
	if(strongest>=5){
		direction="emelkedő";
	}else if(strongest>=2){
		direction="enyhén emelkedő";
	}else if(strongest<=-5){
		direction="csökkenő";
	}else if(strongest<=-2){
		direction="enyhén csökkenő";
	}

	if(stats.trendStatus==="preliminary"){
		return `előzetes trend: ${direction}; a 8-13 napos adatmennyiség jelzésértékű, de nem teljes trendértékelés.`;
	}

	return direction;
}

function measurementActivityText(stats){
	if(!stats.canCreate)return "nem megfelelő";
	if(stats.includedHbpmDays.length>=14)return "bőséges, hosszabb otthoni vérnyomásnapló alapján";
	if(stats.hbpmDays.length>=7)return "ideális, teljes 7-napos HBPM-protokoll alapján";
	return "minimálisan értékelhető, nem teljes 7-napos protokoll alapján";
}

function cardiologyMeasurementComplianceText(stats){
	if(!stats.canCreate)return "nem megfelelő.";
	if(stats.includedHbpmDays.length>=14)return "megfelelő, bőséges adatmennyiség.";
	if(stats.hbpmDays.length>=7)return "megfelelő, teljes 7-napos HBPM-protokoll.";
	return "minimálisan megfelelő.";
}

function reportPulseAverage(value){
	return Number.isFinite(value) ? `${Math.round(value)}/perc` : "n/a";
}

function reportDiagnosticThresholdText(stats){
	const thresholds=stats.bpDiagnosticThresholds || getActiveBpThresholds().diagnosticThresholds;
	return `${thresholds.hbpmHighSys}/${thresholds.hbpmHighDia} Hgmm`;
}

function reportSevereThresholdText(stats){
	const thresholds=stats.bpDiagnosticThresholds || getActiveBpThresholds().diagnosticThresholds;
	return `SYS >=${thresholds.severeHighSys} vagy DIA >=${thresholds.severeHighDia} Hgmm`;
}

function reportLowThresholdText(stats){
	const thresholds=stats.bpDiagnosticThresholds || getActiveBpThresholds().diagnosticThresholds;
	return `SYS <${thresholds.lowSys} vagy DIA <${thresholds.lowDia} Hgmm`;
}

function reportTargetRangePercentLines(stats,scopeLabel="mérések"){
	if(!stats.hasTargetRange){
		return [];
	}

	return [
		`Célzóna alatti ${scopeLabel} aránya: ${reportPercent(stats.targetRangeBelowCount,stats.hbpmReadings.length)}`,
		`Célzóna feletti ${scopeLabel} aránya: ${reportPercent(stats.targetRangeAboveCount,stats.hbpmReadings.length)}`,
		`Célzónán kívüli ${scopeLabel} aránya összesen: ${reportPercent(stats.targetRangeOutOfRangeCount,stats.hbpmReadings.length)}`
	];
}

function reportProfileInterpretationNote(stats){
	const profileId=stats.bpProfile?.id || getActiveBpProfile().id;
	if(profileId==="frail_elderly" || profileId==="dementia_or_cognitive_impairment"){
		return "Profilmegjegyzés: a célzóna biztonsági/tolerálhatósági értelmezési keret, nem önálló kezelési javaslat; diagnosztikus küszöb feletti, de célzónán belüli érték is előfordulhat.";
	}
	if(profileId==="fit_elderly"){
		return "Profilmegjegyzés: a célzóna terápiás kontrollkeret; célzónán kívüli érték nem automatikusan kóros, hanem klinikai kontextust igényel.";
	}
	if(profileId==="custom"){
		return "Profilmegjegyzés: az egyéni célzóna kezelőorvosi keretként értelmezendő; a diagnosztikus HBPM-küszöb ettől külön réteg.";
	}
	return "Profilmegjegyzés: külön terápiás célzóna nincs megadva; a standard profil diagnosztikus HBPM-küszöböket használ.";
}

function reportRoundedUnit(value,unit){
	if(!Number.isFinite(value))return "n/a";
	const separator=String(unit).startsWith("/") ? "" : " ";
	return `${Math.round(value)}${separator}${unit}`;
}

function reportOneDecimalPercent(value){
	return Number.isFinite(value) ? `${value.toFixed(1)}%` : "n/a";
}

function reportSlope(value,unit){
	if(!Number.isFinite(value))return "n/a";
	const rounded=value.toFixed(2);
	const separator=String(unit).startsWith("/") ? "" : " ";
	return `${value>0 ? "+" : ""}${rounded}${separator}${unit}`;
}

function regressionTrendText(slope){
	if(!Number.isFinite(slope))return "nem megítélhető.";
	if(slope>1.0)return "Jelentősen emelkedő.";
	if(slope>=0.3)return "Enyhén emelkedő.";
	if(slope<-1.0)return "Jelentősen csökkenő.";
	if(slope<=-0.3)return "Enyhén csökkenő.";
	return "Stabil.";
}

function reportHbpmInterpretation(stats){
	if(!Number.isFinite(stats.hbpmSys) || !Number.isFinite(stats.hbpmDia))return "n/a";
	const thresholds=stats.bpDiagnosticThresholds || getActiveBpThresholds().diagnosticThresholds;
	return stats.hbpmSys>=thresholds.hbpmHighSys || stats.hbpmDia>=thresholds.hbpmHighDia
		? `az otthoni diagnosztikus küszöböt eléri vagy meghaladja (>=${reportDiagnosticThresholdText(stats)}).`
		: `az otthoni diagnosztikus küszöb alatt van (<${reportDiagnosticThresholdText(stats)}).`;
}

function reportDataQualityText(stats){
	const discardedText=stats.hbpmDays.length
		? `Az első HBPM-nap kihagyva (${formatMiniReportDate(stats.hbpmDays[0].date)}).`
		: "Nincs kihagyható első HBPM-nap.";
	const base=`${measurementActivityText(stats)}. ${discardedText} Értékelve: ${stats.includedHbpmDays.length} nap, ${stats.hbpmReadings.length} reggeli/esti mérés.`;

	if(!stats.canCreate){
		return `${base} Irányelvi HBPM-átlaghoz az első nap kihagyása után legalább 3 nap és 12 értékelhető reggeli/esti mérés szükséges.`;
	}

	if(stats.trendStatus==="full"){
		return `${base} A teljes HBPM-napló 14 vagy több napot tartalmaz, ezért az első és utolsó 7 nap alapján teljes trendértékelés adható.`;
	}

	if(stats.trendStatus==="preliminary"){
		return `${base} 8-13 HBPM-nap alapján csak előzetes trend jelezhető; ez nem helyettesíti a 14 vagy több napos, teljes trendértékelést.`;
	}

	if(stats.hbpmDays.length>=7){
		return `${base} A 7-napos HBPM-protokoll az átlag megítéléséhez megfelelő lehet, de trendértékeléshez túl rövid.`;
	}

	return `${base} Klinikai döntéshez értékelhető minimum, de a teljes 7-napos protokollnál gyengébb adatminőség.`;
}

function reportTrendLines(stats,sysChange,diaChange){
	if(stats.trendStatus==="unavailable"){
		return [
			"Trend nem értékelhető.",
			"Trend: 7 napnyi vagy kevesebb HBPM-adat mellett érdemi idősoros trend nem állapítható meg."
		];
	}

	const lines=[
		`Első 7 HBPM-nap átlaga: ${reportBpFmt(stats.firstSevenSys,stats.firstSevenDia)}`,
		`Utolsó 7 HBPM-nap átlaga: ${reportBpFmt(stats.lastSevenSys,stats.lastSevenDia)}`,
		`Utolsó 7 nap átlagos SYS változása: ${reportSignedChange(sysChange)}`,
		`Utolsó 7 nap átlagos DIA változása: ${reportSignedChange(diaChange)}`,
		`Trend: ${trendText(stats,sysChange,diaChange)}`
	];

	if(stats.trendStatus==="preliminary"){
		lines.push("A két 7-napos ablak átfed, ezért ez csak előzetes, jelzésértékű trend.");
	}else{
		lines.push("Az első és utolsó 7-napos ablak nem fed át; az adatmennyiség teljes trendértékelésre alkalmas.");
	}

	return lines;
}

function cardiologyTrendLines(stats){
	if(stats.trendStatus==="unavailable"){
		return [
			"Trend nem értékelhető.",
			"Trend (SYS): n/a - 7 napnyi vagy kevesebb HBPM-adat mellett nem adható szakmailag megbízható trend.",
			"Trend (DIA): n/a - 7 napnyi vagy kevesebb HBPM-adat mellett nem adható szakmailag megbízható trend.",
			"Trend (pulzus): n/a - 7 napnyi vagy kevesebb HBPM-adat mellett nem adható szakmailag megbízható trend."
		];
	}

	const prefix=stats.trendStatus==="preliminary"
		? "Előzetes trend"
		: "Teljes trendértékelés";
	const note=stats.trendStatus==="preliminary"
		? "8-13 HBPM-nap alapján jelzésértékű; az első és utolsó 7 nap átfed, ezért klinikailag óvatosan értelmezendő."
		: "14 vagy több HBPM-nap alapján, egymást nem átfedő első és utolsó 7 nap mellett értelmezhető.";

	return [
		`Trendértékelés: ${prefix}`,
		`Trend megjegyzés: ${note}`,
		`Trend (SYS): ${regressionTrendText(stats.sysRegressionSlope)} (${reportSlope(stats.sysRegressionSlope,"Hgmm/nap")})`,
		`Trend (DIA): ${regressionTrendText(stats.diaRegressionSlope)} (${reportSlope(stats.diaRegressionSlope,"Hgmm/nap")})`,
		`Trend (pulzus): ${regressionTrendText(stats.pulseRegressionSlope)} (${reportSlope(stats.pulseRegressionSlope,"/perc/nap")})`
	];
}

function buildUnavailableReportStatusText(stats){
	return `HBPM-jelentéshez nincs elég adat: az első nap kihagyása után ${stats.includedHbpmDays.length} értékelhető nap és ${stats.hbpmReadings.length} reggeli/esti mérés marad. Legalább 3 értékelhető nap és 12 mérés szükséges; ideális a 7-napos protokoll.`;
}

function buildGpReportMarkdown(stats){
	const sysChange=stats.lastSevenSys-stats.firstSevenSys;
	const diaChange=stats.lastSevenDia-stats.firstSevenDia;
	const lines=[
		"HBPM-jelentés",
		"",
		`Értékelési profil: ${stats.bpProfile?.label || getActiveBpProfile().label}`,
		`HBPM-átlag: ${reportBpFmt(stats.hbpmSys,stats.hbpmDia)}`,
		`HBPM-értelmezés: ${reportHbpmInterpretation(stats)}`,
		`Reggeli átlag: ${reportBpFmt(stats.morningSys,stats.morningDia)}`,
		`Esti átlag: ${reportBpFmt(stats.eveningSys,stats.eveningDia)}`,
		`Átlagos pulzus: ${reportPulseAverage(stats.hbpmPulseAvg)}`,
		"",
		`Adatminőség: ${reportDataQualityText(stats)}`,
		`${reportDiagnosticThresholdText(stats)} küszöb feletti egyedi mérések aránya: ${reportPercent(stats.aboveDiagnosticThresholdCount,stats.hbpmReadings.length)}`,
		...reportTargetRangePercentLines(stats,"egyedi mérések"),
		reportProfileInterpretationNote(stats),
		"",
		`Pulzustartomány: ${reportRangeFmt(stats.hbpmPulseMin,stats.hbpmPulseMax,"/perc")}`,
		`Szisztolés vérnyomás tartománya: ${reportRangeFmt(stats.hbpmSysMin,stats.hbpmSysMax,"Hgmm")}`,
		`Diasztolés vérnyomás tartománya: ${reportRangeFmt(stats.hbpmDiaMin,stats.hbpmDiaMax,"Hgmm")}`,
		"",
		...reportTrendLines(stats,sysChange,diaChange),
		"",
		`Kiemelendő magas otthoni értékek (${reportSevereThresholdText(stats)}): ${stats.veryHighCount} alkalom`,
		`Kiemelendő alacsony otthoni értékek (${reportLowThresholdText(stats)}): ${stats.lowCount} alkalom`,
		`Mérési aktivitás: ${measurementActivityText(stats)}`
	];

	return lines.join("\n");
}

function buildCardiologyReportMarkdown(stats){
	const lines=[
		"RÉSZLETES HBPM-ELEMZÉS",
		"",
		`Értékelési profil: ${stats.bpProfile?.label || getActiveBpProfile().label}`,
		`Diagnosztikus HBPM-küszöb: ${reportDiagnosticThresholdText(stats)}`,
		formatBpTargetRangeText(stats.bpTargetRange),
		reportProfileInterpretationNote(stats),
		"",
		`Értékelhető mérések száma: ${stats.hbpmReadings.length}`,
		`${reportDiagnosticThresholdText(stats)} küszöb feletti mérések aránya: ${reportPercent(stats.aboveDiagnosticThresholdCount,stats.hbpmReadings.length)}`,
		...reportTargetRangePercentLines(stats,"mérések"),
		"",
		`HBPM-átlag: ${reportBpFmt(stats.hbpmSys,stats.hbpmDia)}`,
		`Átlagos pulzus: ${reportPulseAverage(stats.hbpmPulseAvg)}`,
		`Pulzus szórása: ${reportRoundedUnit(stats.pulseSd,"/perc")}`,
		"",
		`SYS szórás: ${reportRoundedUnit(stats.sysSd,"Hgmm")}`,
		`DIA szórás: ${reportRoundedUnit(stats.diaSd,"Hgmm")}`,
		`SYS variációs együttható: ${reportOneDecimalPercent(stats.sysCv)}`,
		`DIA variációs együttható: ${reportOneDecimalPercent(stats.diaCv)}`,
		"",
		`Átlagos reggel–este SYS különbség: ${reportSignedChange(stats.morningEveningSysDiff)}`,
		`Átlagos reggel–este DIA különbség: ${reportSignedChange(stats.morningEveningDiaDiff)}`,
		"",
		`Legnagyobb egyetlen napi SYS ingadozás: ${reportRoundedUnit(stats.maxDailySysRange,"Hgmm")}`,
		`Legnagyobb egyetlen napi DIA ingadozás: ${reportRoundedUnit(stats.maxDailyDiaRange,"Hgmm")}`,
		"",
		`95. percentilis SYS: ${reportRoundedUnit(stats.sysP95,"Hgmm")}`,
		`95. percentilis DIA: ${reportRoundedUnit(stats.diaP95,"Hgmm")}`,
		`Maximum SYS: ${reportRoundedUnit(stats.hbpmSysMax,"Hgmm")}`,
		`Maximum DIA: ${reportRoundedUnit(stats.hbpmDiaMax,"Hgmm")}`,
		`Minimum SYS: ${reportRoundedUnit(stats.hbpmSysMin,"Hgmm")}`,
		`Minimum DIA: ${reportRoundedUnit(stats.hbpmDiaMin,"Hgmm")}`,
		"",
		`Magas vérnyomású epizódok: ${stats.hypertensiveEpisodeCount}`,
		`Hipotenzív epizódok: ${stats.hypotensiveEpisodeCount}`,
		"",
		...cardiologyTrendLines(stats),
		"",
		`Kiugró értékek száma: ${stats.outlierCount}`,
		"",
		`Mérési megfelelőség: ${cardiologyMeasurementComplianceText(stats)}`,
		"",
		`Adatminőség megjegyzés: ${reportDataQualityText(stats)}`,
		"",
		"[][][] Automatikus elemzésen alapuló Abnormalitás-jelentés [][][]",
		...automaticAbnormalityReportSection(stats.autoAbnormalities,"clinical"),
		"",
		...automaticAbnormalityReportSection(stats.autoAbnormalities,"statistical")
	];

	return lines.join("\n");
}

function buildReportMarkdown(stats){
	return typeof getReportMode==="function" && getReportMode()==="cardiology"
		? buildCardiologyReportMarkdown(stats)
		: buildGpReportMarkdown(stats);
}

function buildReportStatusText(stats){
	if(!stats.canCreate)return buildUnavailableReportStatusText(stats);
	return `Adatminőség: ${reportDataQualityText(stats)}`;
}

function formatMiniReportDate(date){
	return reportDate(date);
}

function formatMiniReportReading(reading){
	const parts=[];

	if(Number.isFinite(reading.sys) && Number.isFinite(reading.dia)){
		parts.push(`${fmt(reading.sys)}/${fmt(reading.dia)}`);
	}

	if(Number.isFinite(reading.pulse)){
		parts.push(`P${fmt(reading.pulse)}`);
	}

	return parts.join(" ");
}

function miniReportAverage(values){
	return values.length ? mean(values) : NaN;
}

function miniReportBpPulseFmt(reading){
	const bp=Number.isFinite(reading.sys) && Number.isFinite(reading.dia)
		? `${Math.round(reading.sys)}/${Math.round(reading.dia)} Hgmm`
		: "n/a";
	const pulse=Number.isFinite(reading.pulse)
		? `P${Math.round(reading.pulse)}/perc`
		: "Pn/a";
	return `${bp}, ${pulse}`;
}

function miniReportSlotAverage(slot){
	const readings=slot.readings || [];
	return {
		sys:miniReportAverage(readings.map(reading=>reading.sys).filter(Number.isFinite)),
		dia:miniReportAverage(readings.map(reading=>reading.dia).filter(Number.isFinite)),
		pulse:miniReportAverage(readings.map(reading=>reading.pulse).filter(Number.isFinite))
	};
}

function miniReportSlotByName(day,name){
	return day.slots.find(slot=>slot.name===name);
}

function miniReportMeasurementList(slot){
	const readings=(slot?.readings || [])
		.map(reading=>formatMiniReportReading(reading))
		.filter(Boolean);
	return readings.length ? readings.join("; ") : "n/a";
}

function miniReportMultilineMeasurementList(slot){
	const readings=(slot?.readings || [])
		.map(reading=>formatMiniReportReading(reading))
		.filter(Boolean);
	return readings.length ? readings : ["n/a"];
}

function miniReportSignedBpDiffFmt(sys,dia){
	if(!Number.isFinite(sys) || !Number.isFinite(dia))return "n/a";
	const roundedSys=sys;
	const roundedDia=dia;
	const sysText=`${roundedSys>0 ? "+" : ""}${roundedSys}`;
	const diaText=`${roundedDia>0 ? "+" : ""}${roundedDia}`;
	return `${sysText}/${diaText} Hgmm`;
}

function miniReportRoundedAverageDifference(firstAverage,secondAverage,key){
	if(!Number.isFinite(firstAverage[key]) || !Number.isFinite(secondAverage[key]))return NaN;
	return Math.round(firstAverage[key])-Math.round(secondAverage[key]);
}

function buildGpDayMiniReport(day){
	const lines=[
		formatMiniReportDate(day.date),
		"",
		"Napi átlag:",
		formatMiniReportReading({
			sys:miniReportAverage(day.fullSys),
			dia:miniReportAverage(day.fullDia),
			pulse:miniReportAverage(day.fullPulse)
		}),
		""
	];

	day.slots.forEach((slot,slotIndex)=>{
		if(slotIndex>0){
			lines.push("");
		}

		lines.push(`${slot.name}:`);
		slot.readings.forEach(reading=>{
			const line=formatMiniReportReading(reading);
			if(line){
				lines.push(line);
			}
		});
	});

	return lines.join("\n");
}

function buildCardiologyDayMiniReport(day){
	const morningSlot=miniReportSlotByName(day,"Reggel");
	const noonSlot=miniReportSlotByName(day,"Dél");
	const eveningSlot=miniReportSlotByName(day,"Este");
	const morningAverage=miniReportSlotAverage(morningSlot || {readings:[]});
	const eveningAverage=miniReportSlotAverage(eveningSlot || {readings:[]});
	const sysDifference=miniReportRoundedAverageDifference(morningAverage,eveningAverage,"sys");
	const diaDifference=miniReportRoundedAverageDifference(morningAverage,eveningAverage,"dia");
	const lines=[
		`${formatMiniReportDate(day.date)} – NAPI RÉSZLET`,
		"",
		`Napi átlag: ${miniReportBpPulseFmt({
			sys:miniReportAverage(day.fullSys),
			dia:miniReportAverage(day.fullDia),
			pulse:miniReportAverage(day.fullPulse)
		})}`,
		`Reggeli átlag: ${miniReportBpPulseFmt(morningAverage)}`,
		`Déli átlag: ${miniReportBpPulseFmt(miniReportSlotAverage(noonSlot || {readings:[]}))}`,
		`Esti átlag: ${miniReportBpPulseFmt(eveningAverage)}`,
		`Reggel–este különbség: ${miniReportSignedBpDiffFmt(sysDifference,diaDifference)}`,
		"",
		"MÉRÉSEK:",
		`Reggel: ${miniReportMeasurementList(morningSlot)}`,
		`Dél: ${miniReportMeasurementList(noonSlot)}`,
		`Este: ${miniReportMeasurementList(eveningSlot)}`
	];

	return lines.join("\n");
}

function miniReportPulseAverageLine(label,slot){
	const averageValue=slot
		? miniReportSlotAverage(slot).pulse
		: miniReportAverage([]);
	return `${label}: ${Number.isFinite(averageValue) ? Math.round(averageValue) : "n/a"}/perc`;
}

function buildCardiologyPulseDayMiniReport(day){
	const morningSlot=miniReportSlotByName(day,"Reggel");
	const noonSlot=miniReportSlotByName(day,"Dél");
	const eveningSlot=miniReportSlotByName(day,"Este");
	const pulseValues=day.fullPulse.filter(Number.isFinite);
	const pulseRange=pulseValues.length
		? `${Math.round(Math.min(...pulseValues))}–${Math.round(Math.max(...pulseValues))}/perc`
		: "n/a";
	const lines=[
		formatMiniReportDate(day.date),
		"",
		"PULZUS",
		`Napi átlag: ${Number.isFinite(miniReportAverage(day.fullPulse)) ? Math.round(miniReportAverage(day.fullPulse)) : "n/a"}/perc`,
		miniReportPulseAverageLine("Reggeli átlag",morningSlot),
		miniReportPulseAverageLine("Déli átlag",noonSlot),
		miniReportPulseAverageLine("Esti átlag",eveningSlot),
		`Tartomány: ${pulseRange}`,
		"",
		"KAPCSOLÓDÓ MÉRÉSEK:",
		"Reggel:",
		...miniReportMultilineMeasurementList(morningSlot),
		"",
		"Dél:",
		...miniReportMultilineMeasurementList(noonSlot),
		"",
		"Este:",
		...miniReportMultilineMeasurementList(eveningSlot)
	];

	return lines.join("\n");
}

function buildDayMiniReport(day,measureKey){
	if(typeof getReportMode==="function" && getReportMode()==="cardiology" && measureKey==="Pulzus"){
		return buildCardiologyPulseDayMiniReport(day);
	}

	return typeof getReportMode==="function" && getReportMode()==="cardiology"
		? buildCardiologyDayMiniReport(day)
		: buildGpDayMiniReport(day);
}

function buildDayMiniReportByDate(date,measureKey){
	if(!currentCsvText || !date)return "";

	const day=buildMeasurementDays(currentCsvText)
		.find(item=>item.date===date);

	return day ? buildDayMiniReport(day,measureKey) : "";
}

async function copyDayMiniReport(date,measureKey){
	if(!currentCsvText || !date)return false;

	const text=buildDayMiniReportByDate(date,measureKey);
	if(!text)return false;

	if(await writeTextToClipboard(text)){
		showMiniReportCopiedNotice(date);
		return true;
	}

	showMiniReportCopiedNotice(date,false);
	return false;
}

async function writeTextToClipboard(text){
	if(navigator.clipboard?.writeText){
		try{
			await navigator.clipboard.writeText(text);
			return true;
		}catch(error){
			console.warn("A modern Vágólap API nem elérhető, tartalék másolási mód következik.",error);
		}
	}

	const textarea=document.createElement("textarea");
	textarea.value=text;
	textarea.setAttribute("readonly","");
	textarea.style.position="fixed";
	textarea.style.left="-9999px";
	textarea.style.top="0";
	document.body.appendChild(textarea);
	textarea.select();

	try{
		return document.execCommand("copy");
	}catch(error){
		console.error("A napi adatkivonat másolása nem sikerült.",error);
		return false;
	}finally{
		document.body.removeChild(textarea);
	}
}

let miniReportNoticeTimer;

function showMiniReportCopiedNotice(date,success=true){
	clearTimeout(miniReportNoticeTimer);
	reportStatus.classList.add("is-visible","is-copy-notice");
	reportStatus.textContent=success
		? `A(z) ${formatMiniReportDate(date)} napi adatkivonata a Vágólapra került.`
		: "A napi adatkivonatot nem sikerült a Vágólapra másolni.";

	miniReportNoticeTimer=setTimeout(()=>{
		reportStatus.classList.remove("is-copy-notice");
		if(currentCsvText){
			const stats=calculateReportStats(currentCsvText);
			reportStatus.textContent=buildReportStatusText(stats);
		}
	},2200);
}

function updateReportControls(text){
	const stats=calculateReportStats(text);
	reportStatus.classList.add("is-visible");

	if(!stats.canCreate){
		currentReportMarkdown="";
		reportText.value="";
		reportPanel.classList.remove("is-visible");
		reportStatus.textContent=buildReportStatusText(stats);
		return;
	}

	currentReportMarkdown=buildReportMarkdown(stats);
	reportText.value=currentReportMarkdown;
	reportPanel.classList.add("is-visible");
	reportStatus.textContent=buildReportStatusText(stats);
}
