function passwordChecks(password){
	const digitCount=(password.match(/\d/g) || []).length;

	return [
		{label:"Legalább 16 karakter", ok:password.length>=16},
		{label:"Legalább 1 nagybetű", ok:/[A-ZÁÉÍÓÖŐÚÜŰ]/.test(password)},
		{label:"Legalább 2 számjegy", ok:digitCount>=2},
		{label:"Legalább 1 speciális karakter ezek közül: # ! ? : ; , .", ok:/[#!?:;,.]/.test(password)}
	];
}

function isStrongPassword(password){
	return passwordChecks(password).every(check=>check.ok);
}

function updatePasswordRules(requireStrong){
	if(!requireStrong){
		passwordRules.innerHTML="<li>A jelszó kis- és nagybetűérzékeny.</li>";
		passwordConfirmButton.disabled=passwordInput.value.length===0;
		return;
	}

	const checks=passwordChecks(passwordInput.value);
	passwordRules.innerHTML=checks
		.map(check=>`<li class="${check.ok ? "is-ok" : ""}">${check.label}</li>`)
		.join("");
	passwordConfirmButton.disabled=!checks.every(check=>check.ok);
}

function requestPassword({title,text,confirmText,requireStrong}){
	return new Promise(resolve=>{
		passwordModalTitle.textContent=title;
		passwordModalText.textContent=text;
		passwordInput.value="";
		passwordModalError.textContent=requireStrong ? "Minimális követelmény: erős jelszó." : "";
		passwordConfirmButton.textContent=confirmText;
		passwordModal.hidden=false;
		passwordInput.focus();

		const cleanup=()=>{
			passwordInput.removeEventListener("input",onInput);
			passwordCancelButton.removeEventListener("click",onCancel);
			passwordConfirmButton.removeEventListener("click",onConfirm);
			passwordModal.removeEventListener("keydown",onKeydown);
			passwordModal.hidden=true;
		};

		const onInput=()=>{
			updatePasswordRules(requireStrong);
			if(requireStrong){
				passwordModalError.textContent=isStrongPassword(passwordInput.value) ? "A jelszókövetelmény teljesül." : "Minimális követelmény: erős jelszó.";
			}
		};

		const onCancel=()=>{
			cleanup();
			resolve("");
		};

		const onConfirm=()=>{
			if(requireStrong && !isStrongPassword(passwordInput.value)){
				passwordModalError.textContent="A jelszó még nem felel meg minden követelménynek.";
				return;
			}

			if(!passwordInput.value){
				passwordModalError.textContent="Add meg a jelszót.";
				return;
			}

			const password=passwordInput.value;
			cleanup();
			resolve(password);
		};

		const onKeydown=event=>{
			if(event.key==="Escape"){
				onCancel();
			}

			if(event.key==="Enter" && !passwordConfirmButton.disabled){
				onConfirm();
			}
		};

		passwordInput.addEventListener("input",onInput);
		passwordCancelButton.addEventListener("click",onCancel);
		passwordConfirmButton.addEventListener("click",onConfirm);
		passwordModal.addEventListener("keydown",onKeydown);
		updatePasswordRules(requireStrong);
	});
}

async function deriveKey(password,salt,iterations){
	const passwordBytes=new TextEncoder().encode(password);
	const baseKey=await crypto.subtle.importKey(
		"raw",
		passwordBytes,
		{name:"PBKDF2"},
		false,
		["deriveKey"]
	);

	return crypto.subtle.deriveKey(
		{
			name:"PBKDF2",
			salt,
			iterations,
			hash:"SHA-256"
		},
		baseKey,
		{name:"AES-GCM",length:256},
		false,
		["encrypt","decrypt"]
	);
}

async function encryptCsv(text,password){
	const iterations=250000;
	const salt=crypto.getRandomValues(new Uint8Array(16));
	const iv=crypto.getRandomValues(new Uint8Array(12));
	const key=await deriveKey(password,salt,iterations);
	const encrypted=await crypto.subtle.encrypt(
		{name:"AES-GCM",iv},
		key,
		new TextEncoder().encode(text)
	);

	const payload={
		v:1,
		mode:"encrypted",
		alg:"AES-GCM",
		kdf:"PBKDF2-SHA-256",
		iterations,
		salt:bytesToBase64Url(salt),
		iv:bytesToBase64Url(iv),
		data:bytesToBase64Url(new Uint8Array(encrypted))
	};

	return encodeCsvForUrl(JSON.stringify(payload));
}

async function decryptCsv(encoded,password){
	const payload=JSON.parse(decodeCsvFromUrl(encoded));
	const salt=base64UrlToBytes(payload.salt);
	const iv=base64UrlToBytes(payload.iv);
	const data=base64UrlToBytes(payload.data);
	const key=await deriveKey(password,salt,payload.iterations);
	const decrypted=await crypto.subtle.decrypt(
		{name:"AES-GCM",iv},
		key,
		data
	);

	return new TextDecoder().decode(decrypted);
}

async function getCsvForDownload(){
	const {encoded,mode,csvText}=getUrlData();

	if(currentCsvText && typeof hasUnsavedDirectData!=="undefined" && hasUnsavedDirectData){
		return currentCsvText;
	}

	if(mode==="encrypted"){
		const password=await requestPassword({
			title:"CSV letöltése",
			text:"A CSV visszanyeréséhez add meg újra a titkosított URL jelszavát.",
			confirmText:"Letöltés",
			requireStrong:false
		});

		return password ? decryptCsv(encoded,password) : "";
	}

	return currentCsvText || csvText || (encoded ? decodeCsvFromUrl(encoded) : "");
}

function downloadCsv(text,filename="vernyomas-adatok.csv"){
	const blob=new Blob([text],{type:"text/csv;charset=utf-8"});
	const link=document.createElement("a");
	link.href=URL.createObjectURL(blob);
	link.download=filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(link.href);
}
