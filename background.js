/**
*
* Background.js receives the search page URL from main.js and attempts to open it
*
* Code adapted from https://github.com/sparkmuse/RateMyFIU/blob/master/background.js
*
**/

/* Run main.js only if RateMyOakland toolbar icon is clicked */
chrome.browserAction.onClicked.addListener(function(tab) {
   chrome.tabs.executeScript(null, {file: "main.js"});
});

chrome.runtime.onMessage.addListener(
    function(request, sender, callback) {
        if (request.action === "xhttp") {
            var xhttp = new XMLHttpRequest();
            var method = request.method ? request.method.toUpperCase() : 'GET';

            xhttp.onload = function() {
                console.log("Loaded URl: " + request.url);
                console.log("Professor: " + request.professor);
                callback({
                    response: xhttp.responseText,
                    searchPageURL: request.link,
                    professorIndex: request.index,
                    professorNames: request.professorNames
                });
            };
            xhttp.onerror = function() {
                console.log("error");
                callback();
            };
            console.log("Attempting to open URL: " + request.url);
            xhttp.open(method, request.url, true);
            if (method === "POST") {
                xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            }
            xhttp.send(request.data);
            return true;
        }
    }
);