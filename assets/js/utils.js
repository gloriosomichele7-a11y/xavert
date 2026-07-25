// XAVERT Utilities

function xavertCopyText(text,successMessage="Copied."){

if(!text){
return false;
}

if(!navigator.clipboard || typeof navigator.clipboard.writeText!=="function"){

if(typeof showMessage==="function"){
showMessage("Copy is not supported in this browser.","error");
}else if(typeof showToast==="function"){
showToast("Copy is not supported in this browser.","error");
}

return false;
}

navigator.clipboard.writeText(text)
.then(function(){

if(typeof showMessage==="function"){
showMessage(successMessage,"success");
}else if(typeof showToast==="function"){
showToast(successMessage,"success");
}

})
.catch(function(){

if(typeof showMessage==="function"){
showMessage("Copy failed.","error");
}else if(typeof showToast==="function"){
showToast("Copy failed.","error");
}

});

return true;

}
