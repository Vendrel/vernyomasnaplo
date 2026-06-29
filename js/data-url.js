function encodeCsvForUrl(text){
	const bytes=new TextEncoder().encode(text);
	return bytesToBase64Url(bytes);
}

function encodeTextForUrl(text){
	return encodeCsvForUrl(text);
}

function bytesToBase64Url(bytes){
	let binary="";

	for(let i=0;i<bytes.length;i+=32768){
		binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
	}

	return btoa(binary)
		.replace(/\+/g,"-")
		.replace(/\//g,"_")
		.replace(/=+$/,"");
}

function decodeCsvFromUrl(value){
	const bytes=base64UrlToBytes(value);
	return new TextDecoder().decode(bytes);
}

function decodeTextFromUrl(value){
	return decodeCsvFromUrl(value);
}

function base64UrlToBytes(value){
	let base64=value
		.replace(/-/g,"+")
		.replace(/_/g,"/");

	while(base64.length%4){
		base64+="=";
	}

	const binary=atob(base64);
	return Uint8Array.from(binary,char=>char.charCodeAt(0));
}

function getFragmentParams(){
	return new URLSearchParams(window.location.hash.replace(/^#/,""));
}

function encodePersonPayload(personData){
	return encodeTextForUrl(JSON.stringify({
		v:1,
		nickname:personData.nickname || "",
		sex:personData.sex || "",
		age:personData.age || ""
	}));
}

function decodePersonPayload(encoded){
	if(!encoded)return null;

	const payload=JSON.parse(decodeTextFromUrl(encoded));
	return {
		nickname:String(payload.nickname || ""),
		sex:String(payload.sex || ""),
		age:String(payload.age || "")
	};
}

function getPersonDataFromUrl(){
	try{
		return decodePersonPayload(getFragmentParams().get("szemely"));
	}catch(error){
		console.error("A személyes azonosítóadat nem olvasható.",error);
		return null;
	}
}

function buildPersonDataUrl(personData){
	const url=new URL(window.location.href);
	const fragmentParams=getFragmentParams();
	const hasPersonData=personData.nickname || personData.sex || personData.age;

	if(hasPersonData){
		fragmentParams.set("szemely",encodePersonPayload(personData));
	}else{
		fragmentParams.delete("szemely");
	}

	url.hash=fragmentParams.toString();
	return url.toString();
}

function getExtractIdsFromUrl(){
	const value=getFragmentParams().get("kivonat");
	if(!value)return [];

	return value
		.split(",")
		.map(item=>item.trim())
		.filter(Boolean);
}

function buildExtractUrl(eventIds){
	const url=new URL(window.location.href);
	const fragmentParams=getFragmentParams();
	const ids=[...new Set(eventIds)].filter(Boolean);

	if(ids.length){
		fragmentParams.set("kivonat",ids.join(","));
	}else{
		fragmentParams.delete("kivonat");
	}

	url.hash=fragmentParams.toString();
	return url.toString();
}

function encodePlainPayload(text){
	return encodeCsvForUrl(JSON.stringify({
		v:1,
		mode:"plain",
		data:encodeCsvForUrl(text)
	}));
}

function readUrlPayload(encoded,explicitMode){
	try{
		const payload=JSON.parse(decodeCsvFromUrl(encoded));

		if(payload.mode==="plain" && payload.data){
			return {
				encoded,
				mode:"plain",
				csvText:decodeCsvFromUrl(payload.data)
			};
		}

		if(payload.mode==="encrypted" || (payload.alg==="AES-GCM" && payload.data)){
			return {
				encoded,
				mode:"encrypted",
				csvText:""
			};
		}
	}catch(error){
		// Régi linkformátum: az adat közvetlenül a base64url-kódolt CSV.
	}

	return {
		encoded,
		mode:explicitMode || "plain",
		csvText:explicitMode==="encrypted" ? "" : decodeCsvFromUrl(encoded)
	};
}

function getUrlData(){
	const fragmentParams=getFragmentParams();
	const hashData=fragmentParams.get(urlDataKey);

	if(hashData){
		return {
			...readUrlPayload(hashData,fragmentParams.get("mod")),
			source:"hash"
		};
	}

	const queryParams=new URLSearchParams(window.location.search);
	const queryData=queryParams.get("csv");

	if(queryData){
		return {
			...readUrlPayload(queryData,queryParams.get("csvMode")),
			source:"query"
		};
	}

	return {
		encoded:"",
		mode:"",
		source:""
	};
}

function setUrlData(encoded,mode){
	const url=new URL(window.location.href);
	url.searchParams.delete("csv");
	url.searchParams.delete("csvMode");

	const fragmentParams=getFragmentParams();
	fragmentParams.set(urlDataKey,encoded);
	url.hash=fragmentParams.toString();

	window.history.replaceState(null,"",url.toString());
}

function migrateQueryDataToHash({encoded,mode,csvText}){
	setUrlData(mode==="plain" ? encodePlainPayload(csvText) : encoded,mode);
}
