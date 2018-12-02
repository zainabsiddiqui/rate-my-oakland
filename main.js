/**
* 
* RateMyOakland - A Google Chrome extension
*
* This file is where all the magic happens.
*
**/

var professorName = ""; // This is the name of the professor currently being searched for
var rmpSearchURL = ""; // This is the URL being used to search for a certain professor
var professorRating = ""; // This is the numeric rating for a certain professor

var numTries;

var wouldTakeAgain = ""; // This is the percentage of people who would take the professor again
var difficultyRating = ""; // This is a professor's difficulty rating
var recentReview = ""; // This is a professor's most recent review
var className = ""; // This holds the class the professor's most recent review was regarding
var professorRetrieval; // This is the variable that contains the HTML element where professor name is in the table

var numRatings = ""; // This is the number of ratings a professor's RMP page has
var fullName = ""; // This holds the professor's name as it is listed in RMP
var title = ""; // This holds the professor's position and department
var topThreeTags = [];

listener();

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
    professorRetrieval = "";
    wouldTakeAgain = "";
    difficultyRating = "";
    recentReview = "";
    numRatings = "";
    fullName = "";
    title = "";
    className = "";
    topThreeTags = [];
}


// This returns true if the user is on the OU class search page
function detectClassSearchPage() {
    try {
    	// This finds the HTML tag that houses instructor listings on the class search page
        var classSearchMethod = document.querySelector(".instructor-col");

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

    var schoolName = encodeURI("oakland university");

    professorIndex = 0;

    var namesExtracted = document.querySelectorAll(".email");


     while (professorName !== undefined) {

        var currentProfessorNames = grabProfessorNames(professorIndex, namesExtracted);


        if(currentProfessorNames == undefined) {
        	break;
        }



        if (isValidName(currentProfessorNames)) {
            numTries = 0;
            grabProfessorSearchPage(professorIndex, currentProfessorNames, schoolName);
            if(currentProfessorNames == undefined) {
            	break;
            }

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
function grabProfessorNames(professorIndex, namesExtracted) {
    try {

        // var namesCells = document.querySelectorAll("*[data-property='instructor']");


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
        var professorClass = htmlDoc.getElementsByClassName("listing PROFESSOR")[0].getElementsByTagName("a")[0];
        rmpSearchURL = "http://www.ratemyprofessors.com" + professorClass.getAttribute("href");
        grabProfessorRating(response.professorIndex, rmpSearchURL);

    } else if(numTries < response.professorNames.length) {
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

    grabProfessorInfo(htmlDoc, response);
    
}

function grabProfessorInfo(htmlDoc, response) {
    var gradeElements = htmlDoc.getElementsByClassName("grade");
    var tags = htmlDoc.getElementsByClassName("tag-box-choosetags");


    if (!isNaN(gradeElements[0].innerHTML)) {
        professorRating = gradeElements[0].innerHTML;

        wouldTakeAgain = gradeElements[1].innerHTML.replace(/^\s+|\s+$|\s+(?=\s)/g, "");

        difficultyRating = gradeElements[2].innerHTML.replace(/^\s+|\s+$|\s+(?=\s)/g, "");

        recentReview = htmlDoc.getElementsByClassName("commentsParagraph")[0].innerHTML.replace(/^\s+|\s+$|\s+(?=\s)/g, "");

        className = htmlDoc.getElementsByClassName("response")[0].innerHTML;

        numRatings = htmlDoc.getElementsByClassName("rating-count")[0].innerHTML.replace(/\D/g, "");

        fullName = (htmlDoc.getElementsByClassName("pfname")[0].innerHTML + " " + htmlDoc.getElementsByClassName("plname")[0].innerHTML).trim();

        title = htmlDoc.getElementsByClassName("result-title")[0].innerHTML;
        title = title.substring(0, title.indexOf("<br>"));

        firstTag = tags[0].innerHTML.toLowerCase();
        secondTag = tags[1].innerHTML.toLowerCase();
        thirdTag = tags[2].innerHTML.toLowerCase();
        topThreeTags = [firstTag.substring(0, firstTag.indexOf("<b>")).trim(), secondTag.substring(0, secondTag.indexOf("<b>")).trim(), 
            thirdTag.substring(0, thirdTag.indexOf("<b>")).trim()];
        console.log(topThreeTags[0]);
    }

    professorRetrieval = document.querySelectorAll("*[data-content='Instructor']")[response.professorIndex];

    while(!professorRetrieval.hasChildNodes()) {
        professorRetrieval = document.querySelectorAll("*[data-content='Instructor']")[response.professorIndex++];
    }

    addRatingToPage(professorRetrieval, professorRating, wouldTakeAgain, difficultyRating, recentReview, 
        className, response.searchPageURL, numRatings, fullName, title, topThreeTags);
}

function getDOMFromString(textHTML) {

    var tempDiv = document.createElement("div");
    tempDiv.innerHTML = textHTML.replace(/<script(.|\s)*?\/script>/g, "");

    return tempDiv;
}

function addRatingToPage(professorRetrieval, ProfessorRating, WouldTakeAgain, DifficultyRating, RecentReview, 
    ClassName, SearchPageURL, NumRatings, FullName, Title, TopTags) {
    var span = document.createElement("span"); // Created to separate professor name and score in the HTML
    var link = document.createElement("a");
    var professorRatingTextNode = document.createTextNode(ProfessorRating); // The text with the professor rating
    var circle = document.createElement("span");

    span.setAttribute("title", "<h3 class = 'more-info'>" + FullName + " (" + NumRatings + " Ratings)</h3><br /><p class = 'title'>" + Title +
        "</p><hr>Would Take Again: <strong class = 'percentage'>" + wouldTakeAgain  +
        "</strong>, Difficulty Rating: <strong class = 'difficulty'>" + difficultyRating + 
        "</strong><hr><span class><strong>Tags:</strong></span> <span class = 'black'>" + TopTags[0] + "</span>  <span class = 'black'>" + TopTags[1] 
        + "</span> <span class = 'black'>" + TopTags[2] + "</span><hr><strong>Most Recent Review:</strong><br /><blockquote>" 
        + recentReview + "<cite>" +"Student who took " + ClassName + "</cite></blockquote>");


     if (ProfessorRating >= 1.0 && ProfessorRating < 2) {
        span.style["background-color"] = "#B22222"; // red = bad
        span.style.border = "0px solid";
    } else if (ProfessorRating >= 2.0 && ProfessorRating < 3) {
        span.style["background-color"] = "#B22222"; // red = bad
        span.style.border = "0px solid";
    } else if (ProfessorRating >= 3.0 && ProfessorRating < 4) {
        span.style["background-color"] = "#FF8C00"; // yellow/orange = okay
        span.style.border = "0px solid";
    } else if (ProfessorRating >= 4 && ProfessorRating <= 5) {
        span.style["background-color"] = "#006400"; // green = good
        span.style.border = "0px solid";
    }


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

