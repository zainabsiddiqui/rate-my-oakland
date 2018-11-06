/**
* 
* RateMyOakland - A Google Chrome extension
*
* Created by Zainab Siddiqui, Ian Ray, Audrey Nguyen, Ariana Lee, and Karen Feun
*
* This file is where all the magic happens.
*
**/

var professorName = ""; // This is the name of the professor currently being searched for
var rmpSearchURL = ""; // This is the URL being used to search for a certain professor
var professorRating = ""; // This is the numeric rating for a certain professor

var professors = {}; // This houses the professors searched for already

var triesCount;

var professorMethodClass = "instructor-col"; // This is the class attribute used in OU's registration system to designate professor names


// This fires the listener function below if any change is detected on the page
var timeout = null;
document.addEventListener("DOMSubtreeModified",
	function() {
		if(timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(listener, 1000);
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
    professorName = "";
    ratingsPageURL = "";
    rmpSearchURL = "";
    professorRating = "";
}


// This returns true if the user is on the OU class search page
function detectClassSearchPage() {
    try {
    	// This finds the HTML tag that houses instructor listings on the class search page
        var classSearchMethod = document.querySelector('.instructor-col');

        if (classSearchMethod != undefined) {
        	console.log("OMG YAY!");
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
    var numberOfProfessors = document.querySelector('.KeyTable').getAttribute('summary').match(/\d+/).pop();
    var all = "";


    // while(professorIndex < numberOfProfessors) {
    // 	currentProfessorNames = grabProfessorNames(professorIndex);
    // 	console.log(currentProfessorNames);
    // 	professorIndex++;
    // }

     while (professorName !== undefined) {

        currentProfessorNames = grabProfessorNames(professorIndex);

        if(currentProfessorNames == undefined) {
        	break;
        }

        console.log(currentProfessorNames);

        if (isValidName(professorName)) {
            triesCount = 0;
            grabProfessorSearchPage(professorIndex, currentProfessorNames, schoolName);
        } else {
            //TODO: Future Implementation.
            professors.professorName = {};
            professors.professorName.professorRating = "N/A";
        }

        professorIndex++;
    }

   }

// This function returns true if there is a professor listed/if the professor listed is undefined or not yet announced
function isValidName(name) {
    return (professorName !== "Staff" &&
        professorName !== "undefined" &&
        professorName !== "TBA" &&
        professorName !== "TBD");
}

// This function grabs professor names from the class search webpage HTML
function grabProfessorNames(professorIndex) {
    try {

        var namesExtracted = document.querySelectorAll('.email');

        var names = [];

        for(var i = 0; i < namesExtracted.length; i++) {
        	names[i] = namesExtracted[i].innerText.replace(/ *\([^)]*\) */g, " ");
        }

        // Add last names to the list
        // var maxNames = names.length;
        // for (var i = 0; i < maxNames; i++) {
        //     var lastName = getLastName(names[i]);
        //     names[i].push(lastName);
        // }

        professorName = names[professorIndex];

        return professorName;

    } catch (err) {
        professorName = undefined;
    }
}

// This method interacts with background.js to retrieve the search page needed to find the rating for a professor
function grabProfessorSearchPage(professorIndex, currentProfessorNames, schoolName) {

    var message = {
        method: "POST",
        action: "xhttp",
        url: "http://www.ratemyprofessors.com/search.jsp?queryBy=teacherName&schoolName=" + schoolName + "&queryoption=HEADER&query=" + currentProfessorNames + "&facetSearch=true",
        data: "",
        link: rmpSearchURL,
        index: professorIndex,
        professorNames: currentProfessorNames
    };


    chrome.runtime.sendMessage(message, grabProfessorSearchPageCallback);
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

// Only if we have found a result for the professor do we do anything
function foundResult(text) {
    return (text.indexOf("Your search didn't return any results.") == -1);
}

function grabProfessorRating(professorIndex, SearchPageURL) {

    var message = {
        method: "POST",
        action: "xhttp",
        url: rmpSearchURL,
        data: "",
        link: SearchPageURL,
        index: professorIndex

    };

    console.log(rmpSearchURL);

    chrome.runtime.sendMessage(message, grabProfessorRatingCallback);
}

function grabProfessorRatingCallback(response) {

    var responseText = response.response;
    var htmlDoc = getDOMFromString(responseText);

    console.log(professorName);

    if (!isNaN(htmlDoc.getElementsByClassName("grade")[0].innerHTML)) {
        professorRating = htmlDoc.getElementsByClassName("grade")[0].innerHTML;
    }

	var professorRetrieval = document.querySelectorAll('.email')[response.professorIndex];

    addRatingToPage(professorRetrieval, professorRating, response.rmpSearchURL);
}

function getDOMFromString(textHTML) {

    var tempDiv = document.createElement("div");
    tempDiv.innerHTML = textHTML.replace(/<script(.|\s)*?\/script>/g, "");

    return tempDiv;
}

function addRatingToPage(professorRetrieval, ProfessorRating, SearchPageURL) {

    var span = document.createElement("span"); // Created to separate professor name and score in the HTML
    var link = document.createElement("a");
    var newline = document.createTextNode(" "); // Create a space between professor name and rating
    var professorRatingTextNode = document.createTextNode(ProfessorRating); // The text with the professor rating

    if (ProfessorRating < 3.5) {
        link.style.color = "#8A0808"; // red = bad
    } else if (ProfessorRating >= 3.5 && ProfessorRating < 4) {
        link.style.color = "#FFBF00"; // yellow/orange = okay
    } else if (ProfessorRating >= 4 && ProfessorRating <= 5) {
        link.style.color = "#298A08"; // green = good
    }

    span.style.fontWeight = "bold"; // bold it
    span.style["white-space"] = "nowrap";

    link.href = SearchPageURL; // make the link
    link.target = "_blank"; // open a new tab when clicked

    // append everything together
    link.appendChild(professorRatingTextNode);
    span.appendChild(newline);
    span.appendChild(link);
    professorRetrieval.appendChild(span);
}

//     var comp = fullName.split(" ");

//     if (comp.length == 1) {
//         return comp[0]; //Case for Doe
//     } else if (comp.length == 2) {
//         return comp[1]; //case for John Doe
//     } else if (comp.length == 3) {
//         return comp[2]; //case for John M. Doe
//     }
// }




