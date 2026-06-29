function average(a,b){
	return mean([a,b]);
}

function mean(values){
	const finiteValues=values
		.map(value=>Number(value))
		.filter(value=>Number.isFinite(value));
	return finiteValues.length
		? finiteValues.reduce((sum,value)=>sum+value,0)/finiteValues.length
		: NaN;
}

function fmt(value){
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function reportFmt(value){
	return Number(value).toFixed(1);
}

function parseNumber(value){
	if(value===undefined || value===null)return NaN;
	const text=String(value).trim().replace(",",".");
	if(text==="")return NaN;
	const number=Number(text);
	return Number.isFinite(number) ? number : NaN;
}

function parseCsvRows(text){
	const rows=text
		.trim()
		.split(/\r?\n/)
		.map(r=>r.split(","));

	rows.shift();
	return rows.filter(cols=>cols.length>1 && cols.some(col=>String(col).trim()!==""));
}

function parseCsvTable(text){
	const rows=text
		.trim()
		.split(/\r?\n/)
		.map(r=>r.split(","));

	const header=rows.shift() || [];
	const dataRows=rows.filter(cols=>cols.length>1 && cols.some(col=>String(col).trim()!==""));
	return {header,rows:dataRows};
}

const measurementSlots=[
	{name:"Reggel", short:"", key:"REG", hbpm:true, start:1},
	{name:"Dél", short:"", key:"DEL", hbpm:false, start:7},
	{name:"Este", short:"", key:"ESTE", hbpm:true, start:13}
];

function normalizeCsvHeader(value){
	return String(value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g,"")
		.toUpperCase()
		.replace(/\s+/g," ")
		.trim();
}

function findCsvColumn(header,slotKey,reading,field){
	const expected=`${slotKey} ${reading} ${field}`;
	return header.findIndex(col=>normalizeCsvHeader(col)===expected);
}

function createMeasurementReader(text){
	const {header,rows}=parseCsvTable(text);
	const fields=["SYS","DIA","P"];
	const slots=measurementSlots.map(slot=>{
		const readings=[1,2].map(reading=>{
			const columns={};
			fields.forEach(field=>{
				columns[field]=findCsvColumn(header,slot.key,reading,field);
			});
			return columns;
		});

		return {...slot,readings};
	});

	function fallbackIndex(slot,readingIndex,field){
		const fieldOffset={SYS:0,DIA:1,P:2}[field];
		return slot.start+readingIndex*3+fieldOffset;
	}

	function getValue(cols,slot,readingIndex,field){
		const index=slot.readings?.[readingIndex]?.[field];
		const resolvedIndex=index>=0 ? index : fallbackIndex(slot,readingIndex,field);
		return parseNumber(cols[resolvedIndex]);
	}

	function rowHasMeasurements(cols){
		return slots.some(slot=>[0,1].some(readingIndex=>
			fields.some(field=>Number.isFinite(getValue(cols,slot,readingIndex,field)))
		));
	}

	const measurementRows=[];
	for(const cols of rows){
		if(!String(cols[0] || "").trim())continue;
		if(!rowHasMeasurements(cols))continue;
		measurementRows.push(cols);
	}

	return {header,rows:measurementRows,slots,getValue,rowHasMeasurements};
}

function dateSortKey(date,index){
	const match=String(date).match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?$/);
	if(!match)return index;
	return Number(`${match[1]}${match[2].padStart(2,"0")}${match[3].padStart(2,"0")}`);
}

function reportDate(date){
	return String(date).trim().replace(/\.$/,"");
}

function formatDateRange(days){
	if(!days.length)return "";
	const first=reportDate(days[0].date);
	const last=reportDate(days[days.length-1].date);
	return first===last ? first : `${first}–${last}`;
}
