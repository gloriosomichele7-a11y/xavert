// XAVERT Utilities

function xavertCopyText(text,successMessage="Copied."){

if(!text){
return false;
}

if(!navigator.clipboard || typeof navigator.clipboard.writeText!=="function"){
if(typeof showToast==="function"){
showToast("Copy is not supported in this browser.","error");
}
return false;
}

navigator.clipboard.writeText(text)
.then(function(){
if(typeof showToast==="function"){
showToast(successMessage,"success");
}
})
.catch(function(){
if(typeof showToast==="function"){
showToast("Copy failed.","error");
}
});

return true;

}
