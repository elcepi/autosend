// ==UserScript==
// @name        Autosend Thrutext
// @version     2
// @description Change the way Thrutext website speed up sending the text
// @auton       Jose Espinosa
// @grant       GM_log
// @require     https://code.jquery.com/jquery-3.5.1.js
// @require     https://greasyfork.org/scripts/2199-waitforkeyelements/code/waitForKeyElements.js?version=6349
// @match       *://*.thrutext.io/client/assignments/*/*
// ==/UserScript==

/* globals jQuery, $, waitForKeyElements */

//     GM_log((new Error()).stack);
//     GM_log(arguments.callee.name);

'use strict';
// Mass Send Texts using Thrutext

// document.querySelector(".v2-conversations-list__list").children.length

//Utils
if(typeof $ === 'undefined') {
    function addScript( srcs = ["https://code.jquery.com/jquery-3.5.1.js",
                                "https://greasyfork.org/scripts/2199-waitforkeyelements/code/waitForKeyElements.js?version=6349",
                               ]) {
        srcs.forEach((src) => {
            var s = document.createElement( 'script' );
            s.type = 'text/javascript';
            s.src = src;
            document.body.appendChild( s );
        })
    }

    addScript();
}

if(!GM_log) {
    var GM_log = console.log;
}

if (typeof waitForKeyElements !== "function") {
    function waitForKeyElements(selector, f) {f()};
}

String.prototype.trim = function(charlist = "\\s:.!") {
    return this.trimLeft(charlist).trimRight(charlist);
};

String.prototype.ltrim = function(charlist = "\\s:.!") { // trim and toLowerCase
    return this.trim(charlist).toLowerCase();
};

String.prototype.trimRight = function(charlist) {
    if (charlist === undefined) {
        charlist = "\s";
    }

    return this.replace(new RegExp("[" + charlist + "]+$"), "");
};

String.prototype.trimLeft = function(charlist) {
    if (charlist === undefined) {
        charlist = "\s";
    }

    return this.replace(new RegExp("^[" + charlist + "]+"), "");
};

const REPLY_TO_SURVEY = {
    "yes":               ["yes"],
    "y":                 ["yes"],
    "no":                ["no"],
    "n":                 ["no"],
    "maybe":             ["maybe"],
    "no (hostile)":      ["no", "hostile"],
    "wrong number":      ["wrong number"],
    "(remove response)": ["(remove response)"],
}

const TIMEOUT= 300;
const NUM_CHECKS_FOR_WORK = 125;

function getReplies() {
    return $(".v2-conversations-list__indicator-dot");
}

function haveWordkingMessageChanged(workingLink) {
   return workingLink !== getNMessage(1).attr("href");
}

//Goto next message automatically after clicking send or archiving a messaage
var count = 0;
function goNextMessage() {
    var oldLink = getNMessage(1).attr("href");
    if(getToSendCount() <= 0 && haveWordkingMessageChanged(oldLink)
       || !getReplies().length
       || (count++) > NUM_CHECKS_FOR_WORK) {
        setTimeout(goNextMessage, TIMEOUT);
    } else {
        count = 0;
        clickNMessage(1);
        setSendMessageEvents();
    };
}

function setSendMessageEvents() {
//    setClickEvent();

    setHandleOptOut();
//    setArchivePopUpEvent();

    setKeypress();

//    setFillCannedResponse();
//    setFillSurvayEvent();

    setHandleOptOut();
//    setArchivePopUpEvent();
}

function getToSend() {
    return $(".v2-conversations-list__number-tag");
}

function getToSendCount() {
    var count = getToSend();
    if(!count || !count.length) {
        return 0;
    } else {
        return parseInt(count.text());
    }
}

function getNMessage(n) {
    return $(".v2-conversations-list__list > li:nth-child(" + n + ") > a:nth-child(1)")
}

function getConversationList() {
    return $(".v2-conversations-list__list > li")
}

function isNReply(n) {
    return $(".v2-conversations-list__list > li").eq(n).hasClass(".v2-conversations-list__indicator-dot--blue")
}

function getToolHeader(number) {
    if(number) {
        return $(".v2-conversation-tools__header > ul > li:nth-child(" + number + ")");
    } else {
        return $(".v2-conversation-tools__header");
    }
}

function clickNMessage(n) {
    var msg = getNMessage(n);

    if(!msg.is($("a.active"))) {
        //msg.click();
        // Why .click does not work on jQuery land?
        if(msg[0]) {
            msg[0].click();
            msg[0].onclick();
            setTimeout(function() { clickNMessage(n) }, TIMEOUT / 5);
        }
    }
}

function sendMessage() {
    var elm = $(".button--primary");

    if(elm.text() !== "Request Conversations") {
        elm.click();
    }
}

var i = 0;
const MESSAGES_AS_ONCE = 450;
function sendOneSMS() {
    if (++i >= MESSAGES_AS_ONCE) {
	    window.location.reload();
    }
    sendMessage();

    //GM_log(getToSend().text() != "", getConversationList().length == 0, getToSend().text() != "" && getConversationList().length == 0);
    if(getToSend().text() != "") {
        if(getConversationList().length) {
            setTimeout(sendOneSMS,TIMEOUT);
        }
    }else {
        getToolHeader(2).click();
        setTimeout(setSendMessageEvents, TIMEOUT * 3);
    }

    clickNMessage(1);
}

function handleSendReply() {
    setTimeout(function() {
        GM_log((new Error()).stack);
        clickNMessage(1);
        setSendMessageEvents();
    }, TIMEOUT * 3);
}

function setHandleOptOut() {
    $(".button--opt-out").off('click').on("click", handleOptOut);
}

function handleOptOut() {
    fillSurvayText("(remove response)");
}

function setKeypress() {
    $(document).off('keyup').on("keyup",pressKey);
}

function pressKey(event) {
    if (event.key == "Enter" && $(".v2-conversation-tools__header").find(".active").text() == "Survey") {
        $(".button--primary").click();
            handleSendReply();
    }
}

function setClickEvent() {
    $(".button--primary").off('click').on("click", goNextMessage);
}

function fillSurvayText(text) {
    var survayAnswer = REPLY_TO_SURVEY[text.ltrim()];

    setTimeout(function () {
        getToolHeader(1).click(); // Go to the survay tab
        if(survayAnswer) {
            document.querySelectorAll(".v2-survey-question--multiple_choice").forEach(function(elm) {
                if(!elm.querySelector(":checked")) {
                    elm.querySelectorAll("label").forEach(function(elm2) {
                        if(survayAnswer.includes(elm2.lastChild.textContent.ltrim())) {
                            elm2.click();
                        }
                    })
                }
            })
        }
    }, TIMEOUT);
}

function sendInitialMesages() {
    clickNMessage(1);
    sendOneSMS();
}

function clickInPopUp() {
    $(".form__actions--primary-button").click();
    setTimeout( function() {
        getToolHeader(2).click();
    }, TIMEOUT);
    setTimeout(handleSendReply, TIMEOUT * 2);
}

waitForKeyElements("textarea",sendInitialMesages, true);
waitForKeyElements(".form__actions--primary-button", clickInPopUp, false);

