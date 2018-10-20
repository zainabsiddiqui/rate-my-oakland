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
function runScript() {

    professors.exits = function(name) {
        return this.hasOwnProperty(name);
    };

    var schoolName = encodeURI("Oakland university");

    var professorIndex = 0;
    var currentProfessorNames;

    while (professorName !== "undefined") {

        currentProfessorNames = getProfessorNames(professorIndex);

        if (isValidName(professorName)) {
            triesCount = 0;
            getProfessorSearchPage(professorIndex, currentProfessorNames, schoolName);
        } else {
            //TODO: Future Implementation.
            professors.professorName = {};
            professors.professorName.professorRating = "N/A";
        }

        professorIndex++;
    }
}
function isValidName(name) {

    return (professorName !== "Staff" &&
        professorName !== "undefined" &&
        professorName !== "TBA .");
}
function getProfessorNames(indexOfProfessor) {
    try {
        names = document.getElementById("ptifrmtgtframe").contentWindow.document.getElementById(professorMethodClass + indexOfProfessor).innerHTML;

        names = names.split(",");

        // Add last names to the list.
        var maxNames = names.length;
        for (var i = 0; i < maxNames; i++) {
            var lastName = getLastName(names[i]);
            names.push(lastName);
        }
        return names;

    } catch (err) {
        professorName = "undefined";
    }
}
function getProfessorSearchPage(professorIndex, currentProfessorNames, schoolName) {

    var message = {
        method: "POST",
        action: "xhttp",
        url: "http://www.ratemyprofessors.com/search.jsp?queryBy=teacherName&schoolName=" + schoolName + "&queryoption=HEADER&query=" + currentProfessorNames[0] + "&facetSearch=true",
        data: "",
        link: searchPageURL,
        index: professorIndex,
        professorNames: currentProfessorNames
    };

    chrome.runtime.sendMessage(message, getProfessorSearchPageCallback);
}
function getProfessorSearchPageCallback(response) {

    var responseText = response.response;

    var resultsTest = responseText.indexOf("Your search didn't return any results.");


    if (foundResult(responseText)) {

        var htmlDoc = getDOMFromString(responseText);

        var professorClass = htmlDoc.getElementsByClassName("listing PROFESSOR")[0].getElementsByTagName("a")[0];
        searchPageURL = "http://www.ratemyprofessors.com" + professorClass.getAttribute("href");

        getProfessorRating(response.professorIndex, searchPageURL);

    } else if(triesCount < response.professorNames.length) {

        getProfessorSearchPage(response.professorIndex, response.professorNames[triesCount], encodeURI("Oakland university"));
        triesCount++;
    }
}





