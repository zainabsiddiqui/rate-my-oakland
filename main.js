/**
* 
* RateMyOakland - A Google Chrome extension
*
* Created by Zainab Siddiqui, Ian Ray, Audrey Nguyen, Ariana Lee, and Karen Feun
*
* This file is where all the magic happens.
*
**/

var currentProfessorName = ""; // This is the name of the professor currently being searched for
var rmpSearchURL = ""; // This is the URL being used to search for a certain professor
var professorRating = ""; // This is the numeric rating for a certain professor

var professors = {}; // This houses the professors searched for already

var triesCount;

var professorMethodClass = "email"; // This is the class attribute used in OU's registration system to designate professor names


// This fires the listener function below if any change is detected on the page
var timeout = null;
document.addEventListener("DOMSubtreeModified",
	function() {
		if(timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeOut(listener, 1000);
	}, false); 


// This function runs the main script if it detects OU's class search page
function listener() {
    resetValues();
    if(detectClassSearchPage()) {
    	runScript();
	}
}

// This function resets our global variables
function resetValues() {
    currentProfessorName = "";
    ratingsPageURL = "";
    rmpSearchURL = "";
    professorRating = "";
}


// This returns true if the user is on the OU class search page
function detectClassSearchPage() {
    try {
        var classSearchMethod = document.window.frameElement.contentWindow.document.getElementById(professorMethodClass + 0).innerHTML;

        if (classSearchMethod !== undefined) {
            return true; // Class search page has been detected
        }
    } catch (classSearchErr) {
        console.log("There was an error");
    }

    return false; // Class search page has not been found
}

// This is the main function: it grabs the professor names on the page and the search page for each professor
function runScript() {

    professors.exits = function(name) {
        return this.hasOwnProperty(name);
    };

    var schoolName = encodeURI("oakland university");

    var professorIndex = 0;
    var professorsOnPage;

    while (currentProfessorName !== "undefined") {

        professorsOnPage = grabProfessorNames(professorIndex);

        if (isValidName(currentProfessorName)) {
        	// Professor name found is valid and can be searched for
            triesCount = 0;
            grabProfessorSearchPage(professorIndex, professorsOnPage, schoolName);
        } else {
            // No valid professor name = no rating
            professors.currentProfessorName = {};
            professors.currentProfessorName.professorRating = "N/A";
        }

        professorIndex++;
    }
}

// This function returns true if there is a professor listed/if the professor listed is undefined or not yet announced
function isValidName(name) {
    return (currentProfessorName !== "Staff" &&
        currentProfessorName !== "undefined" &&
        currentProfessorName !== "TBA .");
}

// This function grabs professor names from the class search webpage HTML
function grabProfessorNames(professorIndex) {
    try {
        names = document.window.frameElement.contentWindow.document.getElementById(professorMethodClass + professorIndex).innerHTML;

        names = names.split(",");

        // Add last names to the list
        var maxNames = names.length;
        for (var i = 0; i < maxNames; i++) {
            var lastName = getLastName(names[i]);
            names.push(lastName);
        }
        return names;

    } catch (err) {
        currentProfessorName = "undefined";
    }
}

// This method interacts with background.js to retrieve the search page needed to find the rating for a professor
function grabProfessorSearchPage(professorIndex, professorsOnPage, schoolName) {

    var message = {
        method: "POST",
        action: "xhttp",
        url: "http://www.ratemyprofessors.com/search.jsp?queryBy=teacherName&schoolName=" + schoolName + "&queryoption=HEADER&query=" + professorsOnPage[0] + "&facetSearch=true",
        data: "",
        link: rmpSearchURL,
        index: professorIndex,
        professorNames: professorsOnPage
    };

    chrome.runtime.sendMessage(message, getProfessorSearchPageCallback);
}

// This function processes the response gotten from background.js
function grabProfessorSearchPageCallback(response) {

    var responseText = response.response;
    var resultsTest = responseText.indexOf("Your search didn't return any results.");


    if (foundResult(responseText)) {
        var htmlDoc = getDOMFromString(responseText);
        var professorClass = htmlDoc.getElementsByClassName("listing PROFESSOR")[0].getElementsByTagName("a")[0];
        rmpSearchURL = "http://www.ratemyprofessors.com" + professorClass.getAttribute("href");
        grabProfessorRating(response.professorIndex, rmpSearchURL);

    } else if(triesCount < response.professorNames.length) {
        grabProfessorSearchPage(response.professorIndex, response.professorNames[triesCount], encodeURI("oakland university"));
        triesCount++;
    }
}





