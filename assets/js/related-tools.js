// XAVERT Related Tools

document.addEventListener("DOMContentLoaded",function(){

const section=document.querySelector(".related-tools");

if(!section){
return;
}

const links=section.querySelectorAll("a");

links.forEach(function(link){

link.setAttribute("rel","noopener");

});

});
