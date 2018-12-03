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

var wouldTakeAgain = ""; // This is the percentage of people who would take the professor again
var difficultyRating = ""; // This is a professor's difficulty rating
var recentReview = ""; // This is a professor's most recent review
var className = ""; // This holds the class the professor's most recent review was regarding
var professorRetrieval; // This is the variable that contains the HTML element where professor name is in the table

var numRatings = ""; // This is the number of student ratings a professor's RMP page has
var fullName = ""; // This holds the professor's name as it is listed in RMP
var title = ""; // This holds the professor's position and department
var topThreeTags = []; // This holds the top three tags for a professor

listener();

/* This function runs the main script if it detects OU's class search page */
function listener() {
        resetValues();
        if(detectClassSearchPage()) {
            runScript();
        }
}

/* This function resets our global variables */
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


/* This returns true if the user is on the OU class search page */
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

/* This is the main function: it grabs the professor names on the page and the search page for each professor, which gets the rating */
function runScript() {

    var schoolName = encodeURI("oakland university");

    var professorIndex = 0;

    // Grab all the cells from the results table
    var namesCells = document.querySelectorAll("*[data-content='Instructor']");

    // Convert to array
    var cellsArray = Array.prototype.slice.call(namesCells);
    var removed = [];

    // Keep a record of the cells in the table which have multiple professors or no professor at all
    for(var i = 0; i < cellsArray.length; i++) {
        if(cellsArray[i].children.length > 2 | !cellsArray[i].hasChildNodes()) {
            cellsArray[i] = null;
            removed.push(i);
        } 
    }

    var currentProfessorNames;


    // Loop until we've gotten through all of the cells in the instructor column
     while (professorIndex < cellsArray.length) {

        if(removed.length > 0) {
            // If the current cell is at one of the forbidden indices, we go to the next
            if(removed.includes(professorIndex)) {
                professorIndex++;
                continue;
            } 
        }

        // Grab the name in the current cell
        currentProfessorNames = grabProfessorNames(professorIndex, cellsArray);


        if(currentProfessorNames == undefined) {
            break;
        }


        if (isValidName(currentProfessorNames)) {

            // Grab the RMP search page for the professor
            grabProfessorSearchPage(professorIndex, currentProfessorNames, schoolName);

            if(currentProfessorNames == undefined) {
                break;
            }

        }

        // Go on to next cell
        professorIndex++;
    }

}

/* This function returns true if there is a professor listed/if the professor listed is undefined or not yet announced */
function isValidName(name) {
    return (name !== "Staff" &&
        name !== "undefined" &&
        name !== "TBA" &&
        name !== "TBD" &&
        name !== "");
}

/* This function grabs professor names from the class search table */
function grabProfessorNames(professorIndex, cellsArray) {
    try {

        var names = [];

        for(var j = 0; j < cellsArray.length; j++) {
            if(cellsArray[j] !== null) {
                // Grab the professor text in the cell
                names[j] = cellsArray[j].firstChild.innerText.replace(/ *\([^)]*\) */g, " ");
            }
        }

        professorName = names[professorIndex];

        return professorName;

    } catch (err) {
        professorName = undefined;
    }

}

/* This method interacts with background.js to retrieve the search page needed to find the rating for a professor */
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

/* This function processes the response gotten from background.js */
function grabProfessorSearchPageCallback(response) {

    var responseText = response.response;

    // If the professor's name search on RMP brings up any results, go on to his/her page
    if (checkProfessorExists(responseText)) {
        var htmlDoc = getDOMFromString(responseText);
        var professorClass = htmlDoc.getElementsByClassName("listing PROFESSOR")[0].getElementsByTagName("a")[0];
        rmpSearchURL = "http://www.ratemyprofessors.com" + professorClass.getAttribute("href");

        // Open up the professor's RMP page to get the rating
        grabProfessorRating(response.professorIndex, rmpSearchURL);

    } else {
        // Do nothing if not found
        return;
    }


}

/* Only if we have found a result for the professor on RMP do we do anything */
function checkProfessorExists(text) {
    return (text.indexOf("Your search didn't return any results.") == -1);
}

/* Interacts with background.js to open the professor's personal RMP page */
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

/* Processes response gotten from background.js */
function grabProfessorRatingCallback(response) {

    var responseText = response.response;

    // Grab the professor's RMP page HTML
    var htmlDoc = getDOMFromString(responseText);

    // Grab professor's overall rating, difficulty rating, recent review, and more
    grabProfessorInfo(htmlDoc, response);
    
}

/* Grabs professor's info from the HTML of the professor's personal RMP page */
function grabProfessorInfo(htmlDoc, response) {

    var gradeElements = htmlDoc.getElementsByClassName("grade");

    // Grab all the professor's tags
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

        // Grab top three tags
        firstTag = tags[0].innerHTML.toLowerCase();
        secondTag = tags[1].innerHTML.toLowerCase();
        thirdTag = tags[2].innerHTML.toLowerCase();
        topThreeTags = [firstTag.substring(0, firstTag.indexOf("<b>")).trim(), secondTag.substring(0, secondTag.indexOf("<b>")).trim(), 
            thirdTag.substring(0, thirdTag.indexOf("<b>")).trim()];
    }

    // Grab the professor cell needed to inject the rating back in
    professorRetrieval = document.querySelectorAll("*[data-content='Instructor']")[response.professorIndex];

    addDataToPage(professorRetrieval, response.searchPageURL);
}

function getDOMFromString(textHTML) {

    var tempDiv = document.createElement("div");
    tempDiv.innerHTML = textHTML.replace(/<script(.|\s)*?\/script>/g, "");

    return tempDiv;
}

/* Injects the data into the page and adds tooltip on hover */
function addDataToPage(professorRetrieval, searchPageURL) {
    // Separates the professor name and rating
    var span = document.createElement("span"); 

    // Needed to add RMP link to rating 
    var link = document.createElement("a"); 

    // Contains the professor rating itself
    var professorRatingTextNode = document.createTextNode(professorRating); 

    // Set tooltip text
    span.setAttribute("title", "<h3 class = 'more-info'>" + fullName + " (" + numRatings + " Ratings)</h3><br /><p class = 'title'>" + title +
        "</p><hr>Would Take Again: <strong class = 'percentage'>" + wouldTakeAgain  +
        "</strong>, Difficulty Rating: <strong class = 'difficulty'>" + difficultyRating + 
        "</strong><hr><span class><strong>Tags:</strong></span> <span class = 'black'>" + topThreeTags[0] + "</span>  <span class = 'black'>" 
        + topThreeTags[1] + "</span> <span class = 'black'>" + topThreeTags[2] + "</span><hr><strong>Most Recent Review:</strong><br /><blockquote>" 
        + recentReview + "<cite>" +"Student who took " + className + "</cite></blockquote>");

    // Color-code the rating based on score
    colorCodeRating(span);

    
    // Create the tooltip itself using jQuery UI
    $(span).tooltip({
        content: function() {
            return $(this).attr('title');
        },
        classes: {
            "ui-tooltip": "tooltip"
        }
    });

    // Style the rating before adding
    span.style["border-radius"] = "2px";
    link.style.color = "white";
    span.style["margin-top"] = "2px";
    span.style.padding = "2px";
    span.style.display = "block";
    span.style.float = "left";
    span.style.clear = "left";
    link.style["text-decoration"] = "none";

    // Create the link to RMP page
    link.setAttribute("href", searchPageURL); 

    // Open a new tab when link is clicked
    link.target = "_blank"; 

    // Attach everything
    link.appendChild(professorRatingTextNode);
    span.appendChild(link);
    professorRetrieval.appendChild(span);

}

function colorCodeRating(span) {
    if (professorRating >= 1.0 && professorRating < 2) {
        span.style["background-color"] = "#B22222"; // red = bad
        span.style.border = "0px solid";
    } else if (professorRating >= 2.0 && professorRating < 3) {
        span.style["background-color"] = "#B22222"; // red = bad
        span.style.border = "0px solid";
    } else if (professorRating >= 3.0 && professorRating < 4) {
        span.style["background-color"] = "#FF8C00"; // yellow/orange = okay
        span.style.border = "0px solid";
    } else if (professorRating >= 4 && professorRating <= 5) {
        span.style["background-color"] = "#006400"; // green = good
        span.style.border = "0px solid";
    }
}