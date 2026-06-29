// Chart color palettes. Dark-mode curve/ribbon colors can be fine-tuned here.
const lightTimeColors={
	reg:{
		line:"rgba(25,90,210,1)",
		soft:"rgba(25,90,210,.05)",
		softHover:"rgba(25,90,210,.28)",
		faint:"rgba(25,90,210,.35)"
	},
	del:{
		line:"rgba(0,135,165,1)",
		soft:"rgba(0,135,165,.05)",
		softHover:"rgba(0,135,165,.28)",
		faint:"rgba(0,135,165,.35)"
	},
	este:{
		line:"rgba(105,80,205,1)",
		soft:"rgba(105,80,205,.05)",
		softHover:"rgba(105,80,205,.28)",
		faint:"rgba(105,80,205,.35)"
	}
};

const darkTimeColors={
	reg:{
		line:"rgba(88,155,255,1)",
		soft:"rgba(88,155,255,.10)",
		softHover:"rgba(88,155,255,.34)",
		faint:"rgba(88,155,255,.48)"
	},
	del:{
		line:"rgba(54,205,225,1)",
		soft:"rgba(54,205,225,.10)",
		softHover:"rgba(54,205,225,.34)",
		faint:"rgba(54,205,225,.48)"
	},
	este:{
		line:"rgba(172,145,255,1)",
		soft:"rgba(172,145,255,.10)",
		softHover:"rgba(172,145,255,.34)",
		faint:"rgba(172,145,255,.48)"
	}
};

const lightDailyColors={
	"Szisztolés":"rgba(25,90,210,1)",
	"Diasztolés":"rgba(0,135,165,1)",
	"Pulzus":"rgba(105,80,205,1)"
};

const darkDailyColors={
	"Szisztolés":"rgba(88,155,255,1)",
	"Diasztolés":"rgba(54,205,225,1)",
	"Pulzus":"rgba(172,145,255,1)"
};

function chartDarkModeActive(){
	return document.body?.classList?.contains("dark");
}

function chartTimeColor(slotKey,tone){
	const palette=chartDarkModeActive() ? darkTimeColors : lightTimeColors;
	const fallback=lightTimeColors[slotKey]?.[tone] || "rgba(25,90,210,.35)";
	return palette[slotKey]?.[tone] || fallback;
}

function chartDailyColor(rangeTitle){
	const palette=chartDarkModeActive() ? darkDailyColors : lightDailyColors;
	return palette[rangeTitle] || lightDailyColors[rangeTitle] || "rgba(25,90,210,1)";
}

// Ezek a klinikai háttérsávok szándékosan itt vannak egyben,
// hogy a színek és határok később könnyen finomhangolhatók legyenek.
function getClinicalRanges(){
	const {diagnosticThresholds,targetRange}=typeof getActiveBpThresholds==="function"
		? getActiveBpThresholds()
		: {
			diagnosticThresholds:{hbpmHighSys:135,hbpmHighDia:85,severeHighSys:180,severeHighDia:110,lowSys:90,lowDia:60},
			targetRange:{sysMin:null,sysMax:null,diaMin:null,diaMax:null}
		};
	const targetSysRange=Number.isFinite(Number(targetRange.sysMin)) && Number.isFinite(Number(targetRange.sysMax))
		? [{from:Number(targetRange.sysMin),to:Number(targetRange.sysMax),color:"rgba(30,160,90,.10)",label:"Célzóna"}]
		: [];
	const targetDiaRange=Number.isFinite(Number(targetRange.diaMin)) && Number.isFinite(Number(targetRange.diaMax))
		? [{from:Number(targetRange.diaMin),to:Number(targetRange.diaMax),color:"rgba(30,160,90,.10)",label:"Célzóna"}]
		: [];

	return {
		"Szisztolés":[
			{from:0,to:diagnosticThresholds.lowSys,color:"rgba(70,130,255,.10)",label:"Alacsony"},
			...targetSysRange,
			{from:diagnosticThresholds.hbpmHighSys,to:diagnosticThresholds.severeHighSys,color:"rgba(255,70,70,.14)",label:"Otthoni küszöb felett"},
			{from:diagnosticThresholds.severeHighSys,to:Infinity,color:"rgba(255,70,70,.22)",label:"Súlyosan magas"}
		],
		"Diasztolés":[
			{from:0,to:diagnosticThresholds.lowDia,color:"rgba(70,130,255,.10)",label:"Alacsony"},
			...targetDiaRange,
			{from:diagnosticThresholds.hbpmHighDia,to:diagnosticThresholds.severeHighDia,color:"rgba(255,70,70,.14)",label:"Otthoni küszöb felett"},
			{from:diagnosticThresholds.severeHighDia,to:Infinity,color:"rgba(255,70,70,.22)",label:"Súlyosan magas"}
		],
		"Pulzus":[
			{from:90,to:100,color:"rgba(255,180,70,.10)",label:"Emelkedett"},
			{from:100,to:Infinity,color:"rgba(255,70,70,.14)",label:"100 felett"}
		]
	};
}

function chartIndicatorColor(role,alpha){
	const colors={
		blue:[31,95,209],
		red:[210,40,32],
		orange:[245,190,25],
		orangeStroke:[220,165,0]
	};
	const rgb=colors[role] || colors.blue;
	return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

function drawAutomaticAbnormalityMarker(ctx,meta,px,chartArea){
	const marker=meta.markerType==="clinical" ? "K" : "S";
	const y=chartArea.top+22;
	const radius=13;

	ctx.save();
	ctx.textAlign="center";
	ctx.textBaseline="middle";
	ctx.font="20px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
	ctx.fillStyle=document.body?.classList?.contains("dark")
		? "rgba(3,10,22,.70)"
		: "rgba(255,255,255,.72)";
	ctx.strokeStyle=chartIndicatorColor("orangeStroke",.62);
	ctx.lineWidth=1.4;
	ctx.beginPath();
	ctx.arc(px,y,radius,0,Math.PI*2);
	ctx.fill();
	ctx.stroke();
	ctx.shadowColor=chartIndicatorColor("orangeStroke",.34);
	ctx.shadowBlur=6;
	ctx.fillStyle=chartIndicatorColor("orangeStroke",.92);
	ctx.fillText(marker,px,y+1);
	ctx.restore();
}

const clinicalZonePlugin={
	id:"clinicalZonePlugin",
	beforeDatasetsDraw(chart,args,options){
		const {ctx,chartArea,scales}=chart;
		const y=scales.y;
		if(!chartArea || !y || !options?.ranges)return;

		ctx.save();
		options.ranges.forEach(range=>{
			const from=Math.max(range.from,y.min);
			const to=Math.min(range.to,y.max);
			if(to<=y.min || from>=y.max)return;

			const top=y.getPixelForValue(to);
			const bottom=y.getPixelForValue(from);
			ctx.fillStyle=range.color;
			ctx.fillRect(chartArea.left,top,chartArea.right-chartArea.left,bottom-top);
		});
		ctx.restore();
	}
};

const dateLabelPlugin={
	id:"dateLabelPlugin",
	afterEvent(chart,args){
		const event=args.event;
		const {chartArea,width,height}=chart;
		if(event.type!=="click" || !chartArea)return;
		if(event.x<chartArea.left || event.x>chartArea.right)return;
		if(event.y<=chartArea.bottom || event.y>height)return;

		const nextMode=(getChartDateLabelMode()+1)%3;
		setAllChartDateLabelModes(nextMode);
		args.changed=true;
	}
};

const daySeparatorPlugin={
	id:"daySeparatorPlugin",
	beforeDatasetsDraw(chart){
		const {ctx,chartArea,scales}=chart;
		const x=scales.x;
		if(!chartArea || !x)return;

		const dayCount=chart.options.plugins.daySeparatorPlugin.dayCount;

		ctx.save();
		ctx.strokeStyle=document.body?.classList?.contains("dark")
			? "rgba(255,255,255,.16)"
			: "rgba(40,50,65,.20)";
		ctx.lineWidth=1.5;

		for(let day=1;day<dayCount;day++){
			const px=x.getPixelForValue(day*3-.5);
			ctx.beginPath();
			ctx.moveTo(px,chartArea.top);
			ctx.lineTo(px,chartArea.bottom);
			ctx.stroke();
		}

		ctx.restore();
	}
};

const rangeHoverPlugin={
	id:"rangeHoverPlugin",
	afterEvent(chart,args){
		const event=args.event;
		if(event.type!=="mousemove" && event.type!=="mouseout" && event.type!=="touchmove")return;
		if(event.type==="touchmove" && chart.$touchScrubActive)return;

		const {chartArea,scales}=chart;
		const previous=chart.$hoveredRange;
		const desktopHoverScrub=event.type==="mousemove" && isDesktopChartCopyMode();

		if(chart.$touchScrubActive && event.type==="mouseout"){
			return;
		}

		if(event.type==="mouseout" || !chartArea || event.x<chartArea.left || event.x>chartArea.right || event.y<chartArea.top || event.y>chartArea.bottom){
			clearDetailedChartHoverScrub(chart,event);
		}else{
			const xValue=scales.x.getValueForPixel(event.x);
			const ranges=chart.options.plugins.rangeHoverPlugin.ranges;
			const hoverRange=findNearestRangeByX(ranges,xValue);

			if(desktopHoverScrub && hoverRange){
				setDetailedChartScrubRange(chart,hoverRange,{event,usePointerY:false,showScrubBand:true});
			}else{
				handleEmptyDetailedChartHover(chart,event,hoverRange);
				chart.$hoveredRange=null;
				chart.$rangeTooltipActive=false;
				chart.setActiveElements([]);
				chart.tooltip?.setActiveElements([], {x:event.x,y:event.y});
				updateDetailedChartScrubCursor(chart,event);
			}
		}

		if(previous!==chart.$hoveredRange){
			args.changed=true;
		}
	}
};

function findNearestRangeByX(ranges,xValue){
	return ranges.reduce((best,range)=>{
		const distance=Math.abs(range.x-xValue);
		return !best || distance<best.distance ? {range,distance} : best;
	},null)?.range || null;
}

function clearDetailedChartHoverScrub(chart,event){
	if(!chart.$touchScrubActive){
		chart.$scrubActive=false;
		chart.$scrubX=null;
	}
	chart.$hoveredRange=null;
	chart.$rangeTooltipActive=false;
	chart.$extractAction=null;
	chart.setActiveElements([]);
	chart.tooltip?.setActiveElements([], event ? {x:event.x,y:event.y} : {x:0,y:0});
	updateDetailedChartScrubCursor(chart,event);
}

function setDetailedChartScrubRange(chart,range,options={}){
	if(!range)return;

	chart.$scrubActive=options.showScrubBand!==false;
	chart.$scrubX=range.x;
	if(chart.$touchScrubActive){
		chart.$touchScrubRange=range;
	}
	chart.$hoveredRange=`${range.key}:${range.x}`;
	chart.$rangeTooltipActive=false;

	if(typeof isCardiologyMode==="function" && isCardiologyMode()){
		chart.$extractAction=range;
	}else{
		chart.$extractAction=null;
	}

	const activationEvent=options.usePointerY===false ? null : options.event;
	activateRangePoint(chart,range,activationEvent);
	updateDetailedChartScrubCursor(chart,options.event);
}

function refreshTouchScrubTooltip(chart){
	if(!chart?.$touchScrubActive || !chart.$touchScrubRange)return false;

	const range=chart.$touchScrubRange;
	chart.$scrubActive=true;
	chart.$scrubX=range.x;
	chart.$hoveredRange=`${range.key}:${range.x}`;
	chart.$rangeTooltipActive=false;

	if(typeof isCardiologyMode==="function" && isCardiologyMode()){
		chart.$extractAction=range;
	}

	activateRangePoint(chart,range,null);
	updateDetailedChartScrubCursor(chart);
	chart.update("none");
	return true;
}

function handleEmptyDetailedChartHover(chart,event,range){
	// Reserved for future day-level hover behavior when the pointer is not on a measurement point.
}

const detailedChartCopyPlugin={
	id:"detailedChartCopyPlugin",
	afterEvent(chart,args){
		const event=args.event;
		if(event.type==="contextmenu"){
			preventChartContextMenu(event);
		}
		const desktopCopyMode=isDesktopChartCopyMode();
		const copyEvent=desktopCopyMode ? "contextmenu" : "click";
		if(event.type!==copyEvent)return;
		if(typeof isCardiologyMode==="function" && isCardiologyMode())return;

		const {chartArea,scales}=chart;
		if(!chartArea || event.x<chartArea.left || event.x>chartArea.right || event.y<chartArea.top || event.y>chartArea.bottom)return;

		const ranges=chart.options.plugins.rangeHoverPlugin?.ranges;
		if(!ranges)return;

		const match=findDetailedEventMatch(chart,event);

		if(!match?.date)return;

			copyDayMiniReport(match.date,match.measureKey).then(success=>{
				showChartCopyNotice(chart,success,event);
			});
	},
	afterDraw(chart){
		const notice=chart.$copyNotice;
		if(!notice || notice.until<Date.now())return;

		const {ctx,chartArea}=chart;
		if(!chartArea)return;

		ctx.save();
		ctx.font="12px -apple-system, BlinkMacSystemFont, sans-serif";
		ctx.textBaseline="middle";

		const paddingX=10;
		const height=28;
		const radius=6;
		const width=Math.ceil(ctx.measureText(notice.text).width)+paddingX*2;
		const position=copyNoticePosition(chart,notice,width,height);
		const {x,y}=position;

		ctx.shadowColor="rgba(0,0,0,.18)";
		ctx.shadowBlur=8;
		ctx.shadowOffsetY=2;
		ctx.fillStyle=notice.success ? "rgba(23,102,58,.94)" : "rgba(150,35,25,.94)";
		ctx.beginPath();
		if(ctx.roundRect){
			ctx.roundRect(x,y,width,height,radius);
		}else{
			ctx.moveTo(x+radius,y);
			ctx.lineTo(x+width-radius,y);
			ctx.quadraticCurveTo(x+width,y,x+width,y+radius);
			ctx.lineTo(x+width,y+height-radius);
			ctx.quadraticCurveTo(x+width,y+height,x+width-radius,y+height);
			ctx.lineTo(x+radius,y+height);
			ctx.quadraticCurveTo(x,y+height,x,y+height-radius);
			ctx.lineTo(x,y+radius);
			ctx.quadraticCurveTo(x,y,x+radius,y);
		}
		ctx.fill();

		ctx.shadowColor="transparent";
		ctx.fillStyle="white";
		ctx.fillText(notice.text,x+paddingX,y+height/2);
		ctx.restore();
	}
};

function isDesktopChartCopyMode(){
	if(typeof supportsMouseChartDrag==="function"){
		return supportsMouseChartDrag();
	}

	return window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches;
}

function copiedNotificationVerticalOffset(){
	const element=document.getElementById("copiedNotificationVerticalOffset");
	if(!element)return -30;

	const top=Number.parseFloat(getComputedStyle(element).top);
	return Number.isFinite(top) ? top : -30;
}

function copyNoticePosition(chart,notice,width,height){
	const {chartArea}=chart;
	const fallbackX=chartArea.right-width-10;
	const fallbackY=chartArea.top+10;

	if(!notice.pointer || !Number.isFinite(notice.pointer.x) || !Number.isFinite(notice.pointer.y)){
		return {x:fallbackX,y:fallbackY};
	}

	const x=Math.max(chartArea.left+4,Math.min(notice.pointer.x-width/2,chartArea.right-width-4));
	const y=Math.max(chartArea.top+4,Math.min(notice.pointer.y+copiedNotificationVerticalOffset(),chartArea.bottom-height-4));
	return {x,y};
}

function showChartCopyNotice(chart,success=true,event){
	clearTimeout(chart.$copyNoticeTimer);
	chart.$copyNotice={
		text:success ? "Adatok másolva." : "Másolás sikertelen.",
		success,
		pointer:event ? {x:event.x,y:event.y} : null,
		until:Date.now()+1000
	};
	chart.update("none");
	chart.$copyNoticeTimer=setTimeout(()=>{
		chart.$copyNotice=null;
		chart.update("none");
	},1000);
}

function detailedPointValue(point){
	return Number.isFinite(point.actualValue) ? point.actualValue : point.y;
}

function findDetailedEventMatch(chart,event){
	const ranges=chart.options.plugins.rangeHoverPlugin?.ranges;
	if(!ranges)return null;

	if(chart.$extractAction?.eventId)return chart.$extractAction;

	return findNearestRangeByX(ranges,chart.scales.x.getValueForPixel(event.x));
}

function rangePointTargets(range){
	return [
		{datasetIndex:range.minDatasetIndex,index:range.pointIndex,value:range.min,type:"minimum"},
		{datasetIndex:range.avgDatasetIndex,index:range.pointIndex,value:range.avg,type:"átlag"},
		{datasetIndex:range.maxDatasetIndex,index:range.pointIndex,value:range.max,type:"maximum"}
	].filter(target=>Number.isInteger(target.datasetIndex) && Number.isInteger(target.index) && Number.isFinite(target.value));
}

function nearestRangePointTarget(chart,range,event){
	const targets=rangePointTargets(range);
	if(!targets.length)return null;
	if(!event || !Number.isFinite(event.y)){
		return targets.find(target=>target.type==="átlag") || targets[0];
	}

	return targets.reduce((best,target)=>{
		const distance=Math.abs(chart.scales.y.getPixelForValue(target.value)-event.y);
		return !best || distance<best.distance ? {...target,distance} : best;
	},null);
}

function activateRangePoint(chart,range,event){
	const target=nearestRangePointTarget(chart,range,event);
	if(!target)return;

	const dataset=chart.data.datasets[target.datasetIndex];
	const raw=dataset?.data?.[target.index];
	if(!raw)return;

	const value=detailedPointValue(raw);
	const position={
		x:chart.scales.x.getPixelForValue(raw.x),
		y:chart.scales.y.getPixelForValue(value)
	};
	const active=[{datasetIndex:target.datasetIndex,index:target.index}];
	chart.setActiveElements(active,position);
	chart.tooltip?.setActiveElements(active,position);
}

function activatePointForEvent(chart,match,event){
	if(!match?.eventId)return;

	const range=chart.options.plugins.rangeHoverPlugin?.ranges?.find(item=>item.eventId===match.eventId);
	if(range){
		activateRangePoint(chart,range,event);
	}
}

function scrubBandWidth(chart){
	const scales=chart.scales;
	if(!scales?.x)return 0;

	const step=Math.abs(scales.x.getPixelForValue(1)-scales.x.getPixelForValue(0));
	const baseWidth=Math.max(12,Math.min(32,step*.76));
	if(chart.$touchScrubActive && chart.$touchScrubStationary){
		return Math.max(baseWidth,Math.min(58,baseWidth*2.2));
	}
	return baseWidth;
}

function eventInActiveScrubBand(chart,event){
	if(!chart.$scrubActive || !Number.isFinite(chart.$scrubX) || !chart.scales?.x || !chart.chartArea)return false;
	if(event.y<chart.chartArea.top || event.y>chart.chartArea.bottom)return false;

	const px=chart.scales.x.getPixelForValue(chart.$scrubX);
	return Math.abs(event.x-px)<=scrubBandWidth(chart)/2;
}

function updateDetailedChartScrubCursor(chart,event){
	if(!chart?.canvas)return;

	const canAdd=typeof isCardiologyMode==="function" &&
		isCardiologyMode() &&
		chart.$scrubActive &&
		chart.$extractAction?.eventId &&
		(!event || eventInActiveScrubBand(chart,event)) &&
		!(typeof isExtractEventSelected==="function" && isExtractEventSelected(chart.$extractAction.eventId));
	chart.canvas.style.cursor=canAdd ? "copy" : "";
}

function preventChartContextMenu(event){
	event.native?.preventDefault?.();
	event.native?.stopPropagation?.();
}

const extractSelectionPlugin={
	id:"extractSelectionPlugin",
	afterEvent(chart,args){
		if(typeof isCardiologyMode!=="function" || !isCardiologyMode())return;

		const event=args.event;
		if(event.type==="touchmove" && chart.$touchScrubActive){
			return;
		}

		if(event.type!=="mousemove" && event.type!=="click" && event.type!=="touchstart" && event.type!=="contextmenu")return;
		const isHover=event.type==="mousemove";
		const isTouchScrubAdd=event.type==="touchstart" && chart.$touchScrubActive;
		if(event.type==="click" && chart.$touchScrubActive)return;
		const isContextAdd=event.type==="contextmenu";
		if(isContextAdd){
			preventChartContextMenu(event);
		}

		const {chartArea,scales}=chart;
		if(!chartArea)return;

		if(isHover){
			const match=findDetailedEventMatch(chart,event);
			if(match?.eventId){
				chart.$extractAction=match;
			}else{
				chart.$extractAction=null;
			}
			updateDetailedChartScrubCursor(chart,event);
			args.changed=true;
			return;
		}

		const directMatch=isContextAdd ? findDetailedEventMatch(chart,event) : null;
		const canToggleEvent=isTouchScrubAdd
			? eventInActiveScrubBand(chart,event)
			: Boolean(directMatch?.eventId);
		if(
			(isContextAdd || isTouchScrubAdd) &&
			canToggleEvent &&
			(chart.$touchScrubRange?.eventId || chart.$extractAction?.eventId || directMatch?.eventId || findDetailedEventMatch(chart,event)?.eventId)
		){
			const match=isContextAdd && directMatch?.eventId
				? directMatch
				: isTouchScrubAdd && chart.$touchScrubRange?.eventId
				? chart.$touchScrubRange
				: chart.$extractAction?.eventId ? chart.$extractAction : directMatch?.eventId ? directMatch : findDetailedEventMatch(chart,event);
			if(typeof isExtractEventSelected==="function" && isExtractEventSelected(match.eventId)){
				removeExtractEvent(match.eventId);
			}else{
				addExtractEvent(match.eventId);
			}
			if(!chart.$touchScrubActive){
				chart.$extractAction=null;
			}
			updateDetailedChartScrubCursor(chart,event);
			args.changed=true;
			return;
		}

		if(isTouchScrubAdd){
			refreshTouchScrubTooltip(chart);
			args.changed=true;
			return;
		}

		chart.$extractAction=null;

		if(!chartArea || event.x<chartArea.left || event.x>chartArea.right || event.y<chartArea.top || event.y>chartArea.bottom)return;

		const match=findDetailedEventMatch(chart,event);
		if(!match?.eventId){
			args.changed=true;
			return;
		}

		activatePointForEvent(chart,match,event);
		chart.$extractAction=match;

		args.changed=true;
	},
	beforeDatasetsDraw(chart){
		if(typeof getSelectedChartEvents!=="function")return;

		const automatic=typeof getAutomaticAbnormalityEvents==="function"
			? getAutomaticAbnormalityEvents(chart.canvas.id)
			: [];
		chart.$automaticAbnormalityXs=automatic.map(meta=>meta.x);
		chart.$automaticAbnormalityEvents=automatic;
		const selected=getSelectedChartEvents(chart.canvas.id);
		if(!selected.length && !automatic.length)return;

		const {ctx,chartArea,scales}=chart;
		if(!chartArea || !scales?.x)return;

		const step=Math.abs(scales.x.getPixelForValue(1)-scales.x.getPixelForValue(0));
		const width=Math.max(12,Math.min(32,step*.76));

		ctx.save();
		automatic.forEach(meta=>{
			const px=scales.x.getPixelForValue(meta.x);
			ctx.fillStyle=chartIndicatorColor("orange",.24);
			ctx.fillRect(px-width/2,chartArea.top,width,chartArea.bottom-chartArea.top);
			ctx.strokeStyle=chartIndicatorColor("orangeStroke",.78);
			ctx.lineWidth=3;
			ctx.beginPath();
			ctx.moveTo(px,chartArea.top);
			ctx.lineTo(px,chartArea.bottom);
			ctx.stroke();
		});
		selected.forEach(meta=>{
			const px=scales.x.getPixelForValue(meta.x);
			ctx.fillStyle=chartIndicatorColor("red",.22);
			ctx.fillRect(px-width/2,chartArea.top,width,chartArea.bottom-chartArea.top);
			ctx.strokeStyle=chartIndicatorColor("red",.7);
			ctx.lineWidth=3;
			ctx.beginPath();
			ctx.moveTo(px,chartArea.top);
			ctx.lineTo(px,chartArea.bottom);
			ctx.stroke();
		});
		automatic.forEach(meta=>{
			drawAutomaticAbnormalityMarker(ctx,meta,scales.x.getPixelForValue(meta.x),chartArea);
		});
		ctx.restore();
	},
	afterDraw(chart){
		const {ctx,chartArea,scales}=chart;
		if(!chartArea || !scales?.x)return;

		if(chart.$scrubActive && Number.isFinite(chart.$scrubX)){
			const px=scales.x.getPixelForValue(chart.$scrubX);
			const width=scrubBandWidth(chart);

			ctx.save();
			ctx.fillStyle=chartIndicatorColor("blue",.18);
			ctx.fillRect(px-width/2,chartArea.top,width,chartArea.bottom-chartArea.top);
			ctx.strokeStyle=chartIndicatorColor("blue",.55);
			ctx.lineWidth=3;
			ctx.beginPath();
			ctx.moveTo(px,chartArea.top);
			ctx.lineTo(px,chartArea.bottom);
			ctx.stroke();
			ctx.restore();
		}
	}
};

function updateChartScrub(chart,event,args){
	const {chartArea,scales}=chart;
	if(!chartArea || event.x<chartArea.left || event.x>chartArea.right)return;

	const ranges=chart.options.plugins.rangeHoverPlugin?.ranges || [];
	const xValue=scales.x.getValueForPixel(event.x);
	const match=findNearestRangeByX(ranges,xValue);
	if(!match)return;

	setDetailedChartScrubRange(chart,match,{event,usePointerY:true,showScrubBand:true});
	args.changed=true;
}

function drawValueLabel(ctx,text,x,y,options={}){
	const paddingX=7;
	const height=22;
	const radius=5;
	const arrowSize=6;
	const arrow=options.arrow || "none";
	const fontSize=options.fontSize || 12;
	ctx.font=`${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
	const width=Math.ceil(ctx.measureText(text).width)+paddingX*2;
	const boxX=arrow==="left" ? x+arrowSize : arrow==="right" ? x-arrowSize-width : x;
	const top=y-height/2;

	ctx.beginPath();
	if(arrow==="left"){
		ctx.moveTo(x,y);
		ctx.lineTo(boxX, y-arrowSize);
		ctx.lineTo(boxX, y+arrowSize);
		ctx.closePath();
	}

	if(arrow==="right"){
		ctx.moveTo(x,y);
		ctx.lineTo(boxX+width, y-arrowSize);
		ctx.lineTo(boxX+width, y+arrowSize);
		ctx.closePath();
	}

	if(ctx.roundRect){
		ctx.roundRect(boxX,top,width,height,radius);
	}else{
		ctx.moveTo(boxX+radius,top);
		ctx.lineTo(boxX+width-radius,top);
		ctx.quadraticCurveTo(boxX+width,top,boxX+width,top+radius);
		ctx.lineTo(boxX+width,top+height-radius);
		ctx.quadraticCurveTo(boxX+width,top+height,boxX+width-radius,top+height);
		ctx.lineTo(boxX+radius,top+height);
		ctx.quadraticCurveTo(boxX,top+height,boxX,top+height-radius);
		ctx.lineTo(boxX,top+radius);
		ctx.quadraticCurveTo(boxX,top,boxX+radius,top);
	}
	ctx.fillStyle="rgba(20,30,45,.88)";
	ctx.fill();
	ctx.fillStyle="white";
	ctx.textBaseline="middle";
	ctx.fillText(text,boxX+paddingX,y);
}

function drawPointValueLabel(ctx,text,pointX,pointY,placement,chartArea){
	const paddingX=7;
	const height=22;
	const radius=5;
	const arrowSize=6;
	ctx.font="12px -apple-system, BlinkMacSystemFont, sans-serif";
	const width=Math.ceil(ctx.measureText(text).width)+paddingX*2;
	const x=Math.max(chartArea.left+4,Math.min(pointX-width/2,chartArea.right-width-4));
	const top=placement==="above" ? pointY-height-arrowSize-6 : pointY+arrowSize+6;
	const y=placement==="above"
		? Math.max(chartArea.top+4,top)
		: Math.min(chartArea.bottom-height-4,top);
	const arrowBaseY=placement==="above" ? y+height : y;
	const arrowTipY=placement==="above" ? arrowBaseY+arrowSize : arrowBaseY-arrowSize;
	const arrowX=Math.max(x+10,Math.min(pointX,x+width-10));

	ctx.beginPath();
	if(placement==="above"){
		ctx.moveTo(arrowX,arrowTipY);
		ctx.lineTo(arrowX-arrowSize,arrowBaseY);
		ctx.lineTo(arrowX+arrowSize,arrowBaseY);
	}else{
		ctx.moveTo(arrowX,arrowTipY);
		ctx.lineTo(arrowX-arrowSize,arrowBaseY);
		ctx.lineTo(arrowX+arrowSize,arrowBaseY);
	}
	ctx.closePath();

	if(ctx.roundRect){
		ctx.roundRect(x,y,width,height,radius);
	}else{
		ctx.moveTo(x+radius,y);
		ctx.lineTo(x+width-radius,y);
		ctx.quadraticCurveTo(x+width,y,x+width,y+radius);
		ctx.lineTo(x+width,y+height-radius);
		ctx.quadraticCurveTo(x+width,y+height,x+width-radius,y+height);
		ctx.lineTo(x+radius,y+height);
		ctx.quadraticCurveTo(x,y+height,x,y+height-radius);
		ctx.lineTo(x,y+radius);
		ctx.quadraticCurveTo(x,y,x+radius,y);
	}

	ctx.fillStyle="rgba(20,30,45,.88)";
	ctx.fill();
	ctx.fillStyle="white";
	ctx.textBaseline="middle";
	ctx.fillText(text,x+paddingX,y+height/2);
}

const valueLabelsPlugin={
	id:"valueLabelsPlugin",
	afterDraw(chart){
		const active=chart.getActiveElements().find(item=>{
			const dataset=chart.data.datasets[item.datasetIndex];
			const raw=dataset?.data?.[item.index];
			return raw?.eventId && raw.valueType!=="szalag";
		});
		if(!active)return;

		const dataset=chart.data.datasets[active.datasetIndex];
		const raw=dataset.data[active.index];
		if(!raw)return;

		const {ctx,chartArea,scales}=chart;
		const x=scales.x.getPixelForValue(raw.x)+14;
		const delta=Math.abs(raw.first-raw.second);
		const labels=[
			{value:raw.first,y:scales.y.getPixelForValue(raw.first),type:"first"},
			{value:raw.avg,y:scales.y.getPixelForValue(raw.avg),type:"avg"},
			{value:raw.second,y:scales.y.getPixelForValue(raw.second),type:"second"}
		].sort((a,b)=>a.y-b.y);

		if(Math.abs(labels[0].y-labels[2].y)<52){
			const center=(labels[0].y+labels[2].y)/2;
			labels.forEach((label,index)=>{
				label.y=center+(index-1)*26;
			});
		}

		ctx.save();
		ctx.shadowColor="rgba(0,0,0,.18)";
		ctx.shadowBlur=8;
		ctx.shadowOffsetY=2;
		const labelX=Math.min(x,chartArea.right-48);
		labels.forEach(label=>{
			const text=label.type==="avg"
				? `${fmt(label.value)} – Δ: ${fmt(delta)}`
				: fmt(label.value);
			drawValueLabel(ctx,text,labelX,label.y,{arrow:"left"});
		});
		ctx.restore();
	}
};

const dailyValueLabelsPlugin={
	id:"dailyValueLabelsPlugin",
	afterDraw(chart){
		const {ctx,chartArea}=chart;
		const dataset=chart.data.datasets[0];
		if(!dataset || !chartArea)return;

		const meta=chart.getDatasetMeta(0);

		ctx.save();
		ctx.shadowColor="rgba(0,0,0,.16)";
		ctx.shadowBlur=7;
		ctx.shadowOffsetY=2;

		meta.data.forEach((element,index)=>{
			const point=element.$context?.raw || dataset.data[index];
			if(!point || !Number.isFinite(point.y))return;

			const {x:pointX,y:pointY}=element.getProps(["x","y"],false);
			let placement=index%2===0 ? "above" : "below";

			if(pointY-chartArea.top<34){
				placement="below";
			}

			if(chartArea.bottom-pointY<34){
				placement="above";
			}

			drawPointValueLabel(ctx,fmt(point.y),pointX,pointY,placement,chartArea);
		});

		ctx.restore();
	}
};

const ribbonFillPlugin={
	id:"ribbonFillPlugin",
	beforeDatasetsDraw(chart,args,options){
		if(!options?.slots)return;

		const focusedKey=chart.$hoveredRange?.split(":")[0];

		Object.keys(options.slots).forEach(key=>{
			const slot=options.slots[key];
			const color=focusedKey===key ? chartTimeColor(key,"softHover") : chartTimeColor(key,"soft");
			if(!slot || !color)return;

			drawRibbonBand(chart,slot,color);
		});
	}
};

const measurementRangeLinePlugin={
	id:"measurementRangeLinePlugin",
	beforeDatasetsDraw(chart,args,options){
		const ranges=options?.ranges || [];
		const {ctx,chartArea,scales}=chart;
		if(!ranges.length || !chartArea || !scales?.x || !scales?.y)return;

		const lineWidth=typeof extremeValueLineWidth==="number" ? extremeValueLineWidth : 7;
		ctx.save();
		ctx.lineCap="round";
		ctx.lineWidth=lineWidth;
		ranges.forEach(range=>{
			if(!Number.isFinite(range.x) || !Number.isFinite(range.min) || !Number.isFinite(range.max))return;

			const x=scales.x.getPixelForValue(range.x);
			const y1=scales.y.getPixelForValue(range.min);
			const y2=scales.y.getPixelForValue(range.max);
			ctx.strokeStyle=chartTimeColor(range.key,"faint");
			ctx.beginPath();
			ctx.moveTo(x,y1);
			ctx.lineTo(x,y2);
			ctx.stroke();
		});
		ctx.restore();
	}
};

function drawRibbonBand(chart,slot,color){
	const {ctx}=chart;
	const upperElements=getRibbonDatasetElements(chart,slot.upperDatasetIndex);
	const lowerElements=getRibbonDatasetElements(chart,slot.lowerDatasetIndex);

	ctx.save();
	ctx.beginPath();

	if(upperElements.length && lowerElements.length){
		drawRibbonElementEdge(ctx,upperElements,true,false);
		drawRibbonElementEdge(ctx,lowerElements.slice().reverse(),false,true);
	}

	ctx.closePath();
	ctx.fillStyle=color;
	ctx.fill();
	ctx.restore();
}

function getRibbonDatasetElements(chart,datasetIndex){
	if(!Number.isInteger(datasetIndex))return [];
	const meta=chart.getDatasetMeta(datasetIndex);
	return meta?.data?.filter(element=>!element.skip) || [];
}

function drawRibbonElementEdge(ctx,elements,moveToFirst=false,reversed=false){
	if(!elements.length)return;
	const first=elements[0];

	if(moveToFirst){
		ctx.moveTo(first.x,first.y);
	}else{
		ctx.lineTo(first.x,first.y);
	}

	for(let index=1;index<elements.length;index++){
		const previous=elements[index-1];
		const current=elements[index];
		const control1=reversed
			? {x:previous.cp1x,y:previous.cp1y}
			: {x:previous.cp2x,y:previous.cp2y};
		const control2=reversed
			? {x:current.cp2x,y:current.cp2y}
			: {x:current.cp1x,y:current.cp1y};

		if(
			Number.isFinite(control1.x) &&
			Number.isFinite(control1.y) &&
			Number.isFinite(control2.x) &&
			Number.isFinite(control2.y)
		){
			ctx.bezierCurveTo(control1.x,control1.y,control2.x,control2.y,current.x,current.y);
		}else{
			ctx.lineTo(current.x,current.y);
		}
	}
}
