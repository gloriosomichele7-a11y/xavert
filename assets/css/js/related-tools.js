// XAVERT Related Tools

const relatedToolsData={
"barcode-generator.html":[
{
title:"QR Generator",
description:"Create QR codes for links, text and digital content.",
url:"qr-generator.html"
},
{
title:"Image Toolkit",
description:"Edit, optimize and convert images directly in your browser.",
url:"image-toolkit.html"
},
{
title:"URL Toolkit",
description:"Encode, decode and inspect URLs quickly.",
url:"url-toolkit.html"
},
{
title:"Base64 Toolkit",
description:"Encode and decode Base64 data securely in your browser.",
url:"base64-toolkit.html"
}
]
};

function renderRelatedTools(){

const container=document.getElementById("relatedTools");

if(!container){
return;
}

const currentPage=window.location.pathname.split("/").pop();
const tools=relatedToolsData[currentPage];

if(!tools || !tools.length){
container.style.display="none";
return;
}

container.innerHTML=`
<h2>Related Tools</h2>
<div class="related-grid">
${tools.map(function(tool){
return `
<div class="related-card">
<h3>${tool.title}</h3>
<p>${tool.description}</p>
<a href="${tool.url}">Open Tool</a>
</div>
`;
}).join("")}
</div>
`;

}

renderRelatedTools();
