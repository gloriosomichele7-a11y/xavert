// XAVERT Utilities

function xavertCopyText(text,successMessage="Copied."){

if(!text){
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
