(()=>{function e(){console.log("Loading flashcards..."),chrome.storage.local.get("vocabList",(function(e){console.log("Vocab data:",e);var n=e.vocabList||[],t=document.getElementById("vocab-container");t&&(0!==n.length?(t.innerHTML="",n.reverse().forEach((function(e,n){var o,a;console.log("Processing flashcard entry:",e);var i=document.createElement("div");i.className="yomisaver-vocab-entry",i.innerHTML='\n                <div class="vocab-header">\n                    <input type="checkbox" class="select-flashcard" data-index="'.concat(n,'">\n                    <div class="word-info">\n                        <h3>').concat(e.word,"</h3>\n                        ").concat(e.reading?'<p class="reading">'.concat(e.reading,"</p>"):"",'\n                    </div>\n                    <button class="delete-vocab" title="Delete flashcard">\n                        <svg viewBox="0 0 24 24" width="16" height="16">\n                            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>\n                        </svg>\n                    </button>\n                </div>\n                ').concat((null===(o=e.wordInfo)||void 0===o||null===(o=o.meanings)||void 0===o?void 0:o.map((function(e){return'<div class="meaning">'.concat(e.definitions.join("; "),"</div>")})).join(""))||"","\n                ").concat(null!==(a=e.wordInfo)&&void 0!==a&&null!==(a=a.jlpt)&&void 0!==a&&a.length?'<div class="jlpt">'.concat(e.wordInfo.jlpt.join(", ").toUpperCase(),"</div>"):"","\n            "),i.querySelector(".delete-vocab").addEventListener("click",(function(){chrome.storage.local.get("vocabList",(function(e){var o=e.vocabList.filter((function(e,t){return t!==n}));chrome.storage.local.set({vocabList:o},(function(){i.remove(),0===o.length&&(t.innerHTML='<p class="yomisaver-coming-soon">No flashcards saved yet!</p>')}))}))})),t.appendChild(i)}))):t.innerHTML='<p class="yomisaver-coming-soon">No flashcards saved yet!</p>')}))}function n(){chrome.storage.local.get("vocabList",(function(e){var n=e.vocabList||[],t=Array.from(document.querySelectorAll(".select-flashcard:checked")).map((function(e){return parseInt(e.dataset.index)})).map((function(e){return n[e]}));if(0!==t.length){var o=t.map((function(e){var n,t,o,a=e.word,i="\n                ".concat(e.reading?"<div>Reading: ".concat(e.reading,"</div>"):"","\n                ").concat((null===(n=e.wordInfo)||void 0===n||null===(n=n.meanings)||void 0===n?void 0:n.map((function(e){return"<div>Definition: ".concat(e.definitions.join("; "),"</div>")})).join(""))||"","\n                ").concat(null!==(t=e.wordInfo)&&void 0!==t&&null!==(t=t.jlpt)&&void 0!==t&&t.length?"<div>JLPT: ".concat(e.wordInfo.jlpt.join(", ").toUpperCase(),"</div>"):"","\n            ").trim().replace(/\n\s+/g," "),c=(null===(o=e.wordInfo)||void 0===o||null===(o=o.jlpt)||void 0===o?void 0:o.join(" "))||"";return"".concat(a,"\t").concat(i,"\t").concat(c)})).join("\n"),a=new Blob([o],{type:"text/tab-separated-values"}),i=URL.createObjectURL(a),c=document.createElement("a");c.href=i,c.download="flashcards.txt",document.body.appendChild(c),c.click(),document.body.removeChild(c),URL.revokeObjectURL(i)}else alert("No flashcards selected for export.")}))}document.addEventListener("DOMContentLoaded",(function(){function t(e){console.log(e);var n=document.getElementById("debug");n&&(n.textContent+=e+"\n")}console.log("Popup script loaded"),document.querySelectorAll(".yomisaver-tab-content:not(#flashcards)").forEach((function(e){e.classList.add("hidden")})),document.querySelectorAll(".yomisaver-tab").forEach((function(e){t("Found tab: "+e.dataset.tab),e.addEventListener("click",(function(){t("Tab clicked: "+e.dataset.tab),!document.getElementById("acknowledgements").classList.contains("hidden")&&(document.getElementById("acknowledgements").classList.add("hidden"),document.getElementById("settings").classList.remove("hidden")),document.querySelectorAll(".yomisaver-tab-content").forEach((function(e){e.classList.remove("active"),e.classList.add("hidden")})),document.querySelectorAll(".yomisaver-tab").forEach((function(e){e.classList.remove("active")}));var n=e.dataset.tab,o=document.getElementById(n);o.classList.remove("hidden"),o.classList.add("active"),e.classList.add("active")}))})),e();var o=document.getElementById("popupSize"),a=document.getElementById("fontSize");function i(e){var n=e/100;chrome.tabs.query({active:!0,currentWindow:!0},(function(e){chrome.tabs.sendMessage(e[0].id,{action:"updatePopupSize",size:n})}))}function c(e){var n=e/100;chrome.tabs.query({active:!0,currentWindow:!0},(function(e){chrome.tabs.sendMessage(e[0].id,{action:"updateFontSize",size:n})}))}o.addEventListener("input",(function(e){i(e.target.value)})),a.addEventListener("input",(function(e){c(e.target.value)})),o.addEventListener("change",(function(e){chrome.storage.sync.set({popupSize:e.target.value})})),a.addEventListener("change",(function(e){chrome.storage.sync.set({fontSize:e.target.value})}));var d=document.getElementById("toggleFurigana");d.addEventListener("click",(function(){chrome.storage.sync.get("furiganaVisible",(function(e){var n=!e.furiganaVisible;chrome.storage.sync.set({furiganaVisible:n},(function(){d.textContent=n?"Hide Furigana":"Show Furigana",chrome.tabs.query({active:!0,currentWindow:!0},(function(e){chrome.tabs.sendMessage(e[0].id,{action:"toggleFurigana",visible:n})}))}))}))})),chrome.storage.sync.get(["popupSize","fontSize","furiganaVisible"],(function(e){e.popupSize&&(o.value=e.popupSize,i(e.popupSize)),e.fontSize&&(a.value=e.fontSize,c(e.fontSize)),void 0!==e.furiganaVisible&&(d.textContent=e.furiganaVisible?"Hide Furigana":"Show Furigana",chrome.tabs.query({active:!0,currentWindow:!0},(function(n){chrome.tabs.sendMessage(n[0].id,{action:"toggleFurigana",visible:e.furiganaVisible})})))})),document.getElementById("export-flashcards").addEventListener("click",n),document.getElementById("showAcknowledgements").addEventListener("click",(function(e){e.stopPropagation();var n=document.getElementById("settings"),t=document.getElementById("acknowledgements");n.classList.add("hidden"),t.classList.remove("hidden"),t.classList.add("active")})),document.getElementById("backToSettings").addEventListener("click",(function(e){e.stopPropagation();var n=document.getElementById("settings"),t=document.getElementById("acknowledgements");t.classList.add("hidden"),t.classList.remove("active"),n.classList.remove("hidden"),n.classList.add("active")}))})),chrome.runtime.onMessage.addListener((function(n){"vocabUpdated"===n.action&&e()})),chrome.runtime.onMessage.addListener((function(e){"toggleFurigana"===e.action&&document.querySelectorAll("rt").forEach((function(n){n.style.display=e.visible?"block":"none"}))})),document.addEventListener("DOMContentLoaded",(function(){e();var n=document.getElementById("showAcknowledgements"),t=document.getElementById("backToSettings"),o=document.getElementById("settings"),a=document.getElementById("acknowledgements");n&&t&&o&&a&&(n.addEventListener("click",(function(){o.classList.add("hidden"),a.classList.remove("hidden")})),t.addEventListener("click",(function(){a.classList.add("hidden"),o.classList.remove("hidden")})))}))})();
//# sourceMappingURL=popup.bundle.js.map