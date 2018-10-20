/**
* 
* RateMyOakland - A Google Chrome extension
*
* Created by Zainab Siddiqui, Ian Ray, Audrey Nguyen, Ariana Lee, and Karen Feun
*
* This file is where all the magic happens.
*
**/
var professorName = "";
var searchPageURL = "";
var professorRating = "";

var professors = {};

var triesCount;

var professorMethodClass = "email";


var timeout = null;
document.addEventListener("DOMSubtreeModified",
	function() {
		if(timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeOut(listener, 1000);
	}, false); 

function listener() {
    resetValues();
    if (getUserMethod()) {
        runScript();
    }
}