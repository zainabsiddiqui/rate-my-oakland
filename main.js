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
var professorRetrieval;
var listenerTries = 0;
var wouldTakeAgain = "";
var difficultyRating = "";
var recentReview = "";

var professorMethodClass = "instructor-col"; // This is the class attribute used in OU's registration system to designate professor names


// This fires the listener function below if any change is detected on the page
var timeout = null;
document.addEventListener("keyup", checkKey); 

function checkKey(e) {
    var key = e.which || e.keyCode;
    if (key === 38) {
        if(timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(listener, 1000);
    } 
}

// This function runs the main script if it detects OU's class search page
function listener() {
    console.log("Listener tries: " + ++listenerTries);
    resetValues();
    if(detectClassSearchPage()) {
        console.log("hoo");
    	runScript();
        console.log("ha");
	}
    console.log("whoa");
}

// This function resets our global variables
function resetValues() {
    professorName = "";
    ratingsPageURL = "";
    rmpSearchURL = "";
    professorRating = "";
    difficultyRating = "";
    wouldTakeAgain = "";
    recentReview = "";
}


// This returns true if the user is on the OU class search page
function detectClassSearchPage() {
    try {
    	// This finds the HTML tag that houses instructor listings on the class search page
        var classSearchMethod = document.querySelector(".instructor-col");
        console.log(classSearchMethod);

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

    professorIndex = 0;
    // var numberOfProfessors = document.querySelector('.KeyTable').getAttribute('summary').match(/\d+/).pop();

    // while(professorIndex < numberOfProfessors) {
    // 	currentProfessorNames = grabProfessorNames(professorIndex);
    // 	console.log(currentProfessorNames);
    // 	professorIndex++;
    // }

     while (professorName !== undefined) {

        var currentProfessorNames = grabProfessorNames(professorIndex);


        if(currentProfessorNames == undefined) {
        	break;
        }



        if (isValidName(currentProfessorNames)) {
            triesCount = 0;
            grabProfessorSearchPage(professorIndex, currentProfessorNames, schoolName);
            if(currentProfessorNames == undefined) {
            	break;
            }

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
    return (name !== "Staff" &&
        name !== "undefined" &&
        name !== "TBA" &&
        name !== "TBD" &&
        name !== "");
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
        url: "http://www.ratemyprofessors.com/search.jsp?queryBy=teacherName&schoolName=" + schoolName + "&queryoption=HEADER&query=" + currentProfessorNames.replace(/\s/g,'+') + "&facetSearch=true",
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

    if (foundResult(responseText)) {
        console.log(foundResult(responseText));
        var htmlDoc = getDOMFromString(responseText);
        var numOfResults = htmlDoc.getElementsByClassName("result-count")[0].innerHTML.match(/[0-9]+(?!.*[0-9])/);
        console.log(numOfResults);
        var professorClass = htmlDoc.getElementsByClassName("listing PROFESSOR")[0].getElementsByTagName("a")[0];
        rmpSearchURL = "http://www.ratemyprofessors.com" + professorClass.getAttribute("href");
        grabProfessorRating(response.professorIndex, rmpSearchURL);

    } else if(triesCount < response.professorNames.length) {
        // grabProfessorSearchPage(response.professorIndex, response.professorNames[triesCount], encodeURI("oakland university"));
        // triesCount++;
        return;
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


    chrome.runtime.sendMessage(message, grabProfessorRatingCallback);


}

function grabProfessorRatingCallback(response) {

    var responseText = response.response;
    var htmlDoc = getDOMFromString(responseText);

    var gradeElements = htmlDoc.getElementsByClassName("grade");
    var className = "";


    if (!isNaN(gradeElements[0].innerHTML)) {
        professorRating = gradeElements[0].innerHTML;
        wouldTakeAgain = gradeElements[1].innerHTML.replace(/^\s+|\s+$|\s+(?=\s)/g, "");
        difficultyRating = gradeElements[2].innerHTML.replace(/^\s+|\s+$|\s+(?=\s)/g, "");
        recentReview = htmlDoc.getElementsByClassName("commentsParagraph")[0].innerHTML.replace(/^\s+|\s+$|\s+(?=\s)/g, "");
        className = htmlDoc.getElementsByClassName("response")[0].innerHTML;
    }



    // while(!document.querySelectorAll("*[data-content='Instructor']")[response.professorIndex].hasChildNodes()) {
    //     response.professorIndex++;
    // }

	professorRetrieval = document.querySelectorAll("*[data-content='Instructor']")[response.professorIndex];

    while(!professorRetrieval.hasChildNodes()) {
        professorRetrieval = document.querySelectorAll("*[data-content='Instructor']")[++response.professorIndex];
    }


    addRatingToPage(professorRetrieval, professorRating, wouldTakeAgain, difficultyRating, recentReview, 
        className, response.searchPageURL);

    
}

function getDOMFromString(textHTML) {

    var tempDiv = document.createElement("div");
    tempDiv.innerHTML = textHTML.replace(/<script(.|\s)*?\/script>/g, "");

    return tempDiv;
}

function addRatingToPage(professorRetrieval, ProfessorRating, WouldTakeAgain, DifficultyRating, RecentReview, ClassName, SearchPageURL) {
    var span = document.createElement("span"); // Created to separate professor name and score in the HTML
    var link = document.createElement("a");
    var professorRatingTextNode = document.createTextNode(ProfessorRating); // The text with the professor rating

    if (ProfessorRating < 3.0) {
        span.style["background-color"] = "#B22222"; // red = bad
        span.style.border = "0px solid"
    } else if (ProfessorRating >= 3.0 && ProfessorRating < 4) {
        span.style["background-color"] = "#FF8C00"; // yellow/orange = okay
        span.style.border = "0px solid"
    } else if (ProfessorRating >= 4 && ProfessorRating <= 5) {
        span.style["background-color"] = "#006400"; // green = good
        span.style.border = "0px solid"

    }

    span.setAttribute("title", "<strong>Would Take Again:</strong> " + wouldTakeAgain  +
        "<br /><strong>Difficulty Rating:</strong> " + difficultyRating + "<br /><strong>Most Recent Review</strong> (for " + ClassName + "): " + recentReview);
    $(span).tooltip({
        content: function() {
            return $(this).attr('title');
        },
        classes: {
            "ui-tooltip": "tooltip"
        }
    });


    // style the rating before adding
    span.style["border-radius"] = "2px";
    link.style.color = "white";
    span.style["margin-top"] = "2px";
    span.style.padding = "2px";
    span.style.display = "block";
    span.style.float = "left";
    span.style.clear = "left";
    link.style["text-decoration"] = "none";


    link.setAttribute("href", SearchPageURL); // make the link
    link.target = "_blank"; // open a new tab when clicked


    // append everything together
  	link.appendChild(professorRatingTextNode);
	span.appendChild(link);
	professorRetrieval.appendChild(span);

}

