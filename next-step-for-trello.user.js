// ==UserScript==
// @name Next Step for Trello cards
// @version 0.6-alpha
// @homepage http://bit.ly/next-for-trello
// @description Appends the first unchecked checklist item to the title of each card, when visiting a Trello board.
// @match https://trello.com/*
// @match http://trello.com/*
// @run-at document-start
// ==/UserScript==

/***************************
 *
 * INSTALL THIS FROM THE CHROME WEB STORE:
 * --> https://chrome.google.com/webstore/detail/next-step-for-trello-card/iajhmklhilkjgabejjemfbhmclgnmamf?hl=en-US
 * 
 * ...or by downloading this script, and dragging it into chrome://extensions
 *
 ***************************/

var EMOJI = '◽️';
var STYLING = 'overflow: auto; padding-left: 18px; margin-top: 1em; font-size: 12px; line-height: 1.2em; color: #8c8c8c; font-family: Helvetica Neue, Arial, Helvetica, sans-serif;';

// basic helpers

const nonNull = (item) => !!item;

const byPos = (a, b) => a.pos > b.pos ? 1 : -1; // take order into account

const getFirstResult = (fct) => function() {
  return fct.apply(this, arguments)[0];
};

// trello checklist processors

const prefixChecklistName = (item) => 
  Object.assign(item, {
    name: item.checklistName + ': ' + item.name
  });

const sortedNextSteps = (checklist) => checklist.checkItems
  .sort(byPos)
  .filter((item) => item.state === 'incomplete')
  .map((item) => Object.assign(item, {
    checklistName: checklist.name
  }));

const getAllNextSteps = (checklists) => checklists
  .sort(byPos)
  .map(sortedNextSteps)
  .reduce((a, b) => a.concat(b), []);

const getAllNextStepsNamed = (checklists) => getAllNextSteps(checklists)
  .map(prefixChecklistName);

const getNextStepsOfChecklists = (checklists) => checklists
  .sort(byPos)
  .map(getFirstResult(sortedNextSteps))
  .filter(nonNull)
  .reduce((a, b) => a.concat(b), [])
  .map(prefixChecklistName);

const getNextStep = (checklists) => [ getAllNextSteps(checklists)[0] ]
    .filter(nonNull);

// trello data model

const fetchStepsThen = (cardElement, handler) => fetch(cardElement.href + '.json', {credentials: 'include'})
  .then((res) => res.json())
  .then((json) => {
    setCardContent(cardElement, handler(json.checklists));
  }); 

// UI helpers

function renderMarkdown(text) {
  return text
    .replace(/\[(.*)\]\(.*\)/g, '<span style="text-decoration:underline;">$1</span>')
    .replace(/https?\:\/\/([^\/ ]+)[^ ]+/g, '<span style="text-decoration:underline;">$1</span>')
    .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
}

function setCardContent(cardElement, items) {
  cardElement.innerHTML =
    cardElement.innerHTML.replace(/<p class="aj-next-step".*<\/p>/g, '')
    + (items || []).map((item) => '<p class="aj-next-step" style="position: relative; ' + STYLING + '">'
      + '<span class="aj-checkbox" style="position: absolute; top: 1px; left: 2px;">' + EMOJI + '</span>'
      + '<span>' + renderMarkdown(item.name) + '</span>'
      + '</p>'
    ).join('\n');
  var checkboxes = document.getElementsByClassName('aj-checkbox');
  for (var i=0; i<checkboxes.length; ++i) {
    checkboxes[i].addEventListener('click', onCheckItem);
  }
}

function updateCards() {
  document.getElementById('aj-nextstep-loading').style.display = 'inline-block';
  var cards = document.getElementsByClassName('list-card-title');
  var handler = (cardElement) => cardElement.href && MODES[currentMode].handler(cardElement);
  var promises = Array.prototype.map.call(cards, handler);
  Promise.all(promises).then(function(result) {
    //console.info('DONE ALL', result.length);
    document.getElementById('aj-nextstep-loading').style.display = 'none';
  }, function(err) {
    console.info('ERROR', err);
  });;
}

// extension modes

var MODES = [
  {
    label: 'Hidden',
    handler: setCardContent
  },
  {
    label: 'One per card',
    handler: (cardElement) => fetchStepsThen(cardElement, getNextStep)
  },
  {
    label: 'One per checklist',
    handler: (cardElement) => fetchStepsThen(cardElement, getNextStepsOfChecklists)
  },
  {
    label: 'Display all',
    handler: (cardElement) => fetchStepsThen(cardElement, getAllNextStepsNamed)
  },
];

var currentMode = 1;

function nextMode() {
  currentMode = (currentMode + 1) % MODES.length;
  updateCards();
  document.getElementById('aj-nextstep-mode').innerHTML = MODES[currentMode].label; 
}

// extension initialization

const isToolbarInstalled = () => document.getElementById('aj-nextstep-mode'); 

function installToolbar() {
  var headerElements = document.getElementsByClassName('board-header-btns');
  if (isToolbarInstalled() || !headerElements.length) {
    return false;
  } else {
    var btn = document.createElement('a');
    btn.href = '#';
    btn.id = 'aj-nextstep-btn';
    btn.className = 'board-header-btn board-header-btn-without-icon';
    btn.onclick = nextMode;
    btn.innerHTML = '<span class="board-header-btn-text">'
      + 'Next steps: <span id="aj-nextstep-mode">' + MODES[currentMode].label + '</span>'
      + '<div id="aj-nextstep-loading" class="uil-reload-css"><div></div></div>'
      + '</span>';
    headerElements[0].appendChild(btn);
    return true;
  }
}

function watchForChanges(handler) {
  // refresh on card name change
  document.body.addEventListener('DOMSubtreeModified', function(e){
    if ('list-card-details' == e.target.className) {
      handler();
    }
  }, false);
  // refresh after drag&dropping a card to another column
  document.body.addEventListener('DOMNodeInserted', function(e){
    if (e.target.className == 'list-card js-member-droppable active-card ui-droppable') {
      handler();
    }
  }, false);
}

function injectCss() {
  var style = document.createElement('style');
  style.innerText = `
  #aj-nextstep-loading {
    display: none;
  }
  @keyframes uil-reload-css {
    0% { transform: rotate(0deg); }
    50% { transform: rotate(180deg); }
    100% { transform: rotate(360deg); }
  }
  .uil-reload-css {
    position: relative;
    display: inline-block;
    top: -9px;
    margin-left: 5px;
    transform: scale(0.045);
  }
  .uil-reload-css > div {
    animation: uil-reload-css 1s linear infinite;
    position: absolute;
    width: 160px;
    height: 160px;
    border-radius: 100px;
    border: 20px solid #ffffff;
    border-top: 20px solid rgba(0,0,0,0);
    border-right: 20px solid #ffffff;
    border-bottom: 20px solid #ffffff;
  }
  .uil-reload-css > div:after {
    content: " ";
    width: 0px;
    height: 0px;
    border-style: solid;
    border-width: 0 30px 30px 30px;
    border-color: transparent transparent #ffffff transparent;
    display: block;
    transform: translate(-15px, 0) rotate(45deg);
  }`;
  document.head.appendChild(style);
}

const isOnBoardPage = () => window.location.href.indexOf('https://trello.com/b/') === 0;

var needsRefresh = true;
var token;
var onCheckItem; // will be bound to a function that needs token to be set

const INIT_STEPS = [
  // step 0: integrate the toolbar button (when page is ready)
  function initToolbar(callback) {
    if (installToolbar()) {
      callback();
    }
  },
  // step 1: watch DOM changes (one shot init)
  function initWatchers(callback) {
    watchForChanges(() => { needsRefresh = true; });
    injectCss();
    callback();
  },
  // step 2: get global token from Trello
  function getToken(callback) {
    callback(); // calling it right away, in case the following code crashes
    // wait for the message
    window.addEventListener("MyCustomEvent", function (e) {
      token = e.detail.passback;
      console.log('trello token:', token);
    });
    // inject code into the page's context (unrestricted)
    var scr = document.createElement('script');
    scr.textContent = ` 
      var event = document.createEvent("CustomEvent");  
      event.initCustomEvent("MyCustomEvent", true, true, {"passback": token});
      window.dispatchEvent(event);`;
    // (appending text to a function to convert it's src to string only works in Chrome)
    // add to document to make it run, then hide it 
    (document.head || document.documentElement).appendChild(scr);
    scr.parentNode.removeChild(scr);
  },
  // step 3: main loop
  function main() {
    if (!isToolbarInstalled()) {
      installToolbar();
      needsRefresh = true;
    }
    if (needsRefresh) {
      needsRefresh = false;
      updateCards();
    }
  }
];

function init(){
  var currentStep = 0;
  setInterval(() => {
    if (isOnBoardPage()) {
      INIT_STEPS[currentStep](() => { ++currentStep; });
    } else {
      needsRefresh = true;
    }
  }, 500);
  // define function to allow checking items directly from board.
  onCheckItem = function (evt) {
    evt.preventDefault();
    evt.stopPropagation();
    // let's check that item
    var urlEncodedData = 'state=complete&' + token.trim();
    var cardId = '5803b13f1dfb52d879ffa12d'; // TODO: un-hard-code this
    var checklistId = '580e0b72c9ad8d91d813f5cf'; // TODO: un-hard-code this
    var itemId = '5803b1a0163254022fe9c662'; // TODO: un-hard-code this
    fetch('https://trello.com/1/cards/' + cardId + '/checklist/' + checklistId + '/checkItem/' + itemId, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': urlEncodedData.length
      },
      body: urlEncodedData
    }).then(function() {
      needsRefresh = true;
    });
  };
}

console.log('[[ next-step-for-trello ]]');
init();
