// XAVERT Utilities

function showMessage(text,type="info"){

if(!text){
return;
}

let toast=document.getElementById("xavert-toast");

if(!toast){

toast=document.createElement("div");
toast.id="xavert-toast";
toast.setAttribute("role","status");
toast.setAttribute("aria-live","polite");
toast.setAttribute("aria-atomic","true");

document.body.appendChild(toast);

}

toast.textContent=text;
toast.className="xavert-toast xavert-toast-" + type;
toast.hidden=false;

clearTimeout(showMessage.timer);

showMessage.timer=setTimeout(function(){

toast.hidden=true;
toast.textContent="";
toast.className="xavert-toast";

},2200);

}


function xavertCopyText(text,successMessage="Copied."){

if(!text){
showMessage("Nothing to copy.","error");
return false;
}

if(
!navigator.clipboard ||
typeof navigator.clipboard.writeText!=="function"
){

showMessage(
"Copy is not supported in this browser.",
"error"
);

return false;
}

navigator.clipboard.writeText(text)
.then(function(){

showMessage(successMessage,"success");

})
.catch(function(){

showMessage("Copy failed.","error");

});

return true;

}
