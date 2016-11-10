// ==UserScript==
// @name Next Step for Trello
// @version 1.0.1
// @homepage http://adrienjoly.com/chrome-next-step-for-trello
// @description Check tasks directly from your Trello boards.
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

// this function is used by all modes, to flatten item lists
const sortedNextSteps = (checklist) => checklist.checkItems
  .sort(byPos)
  .filter((item) => item.state === 'incomplete')
  .map((item) => Object.assign(item, {
    cardId: checklist.idCard,
    checklistId: checklist.id,
    checklistName: checklist.name
  }));

const getAllNextSteps = (checklists) => checklists
  .sort(byPos)
  .map(sortedNextSteps)
  .reduce((a, b) => a.concat(b), []);

// functions called by differents modes:

// display all next steps
const getAllNextStepsNamed = (checklists) => getAllNextSteps(checklists)
  .map(prefixChecklistName);

// display one next step per checklist
const getNextStepsOfChecklists = (checklists) => checklists
  .sort(byPos)
  .map(getFirstResult(sortedNextSteps))
  .filter(nonNull)
  .reduce((a, b) => a.concat(b), [])
  .map(prefixChecklistName);

// display the first next step only
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

const renderItem = (item) => `
  <p class="aj-next-step"
     style="position: relative; ${STYLING}"
     data-card-id="${item.cardId}"
     data-checklist-id="${item.checklistId}"
     data-item-id="${item.id}"
  >
        <span class="aj-checkbox" style="position: absolute; top: 1px; left: 2px;">◽️</span>
        <span class="aj-item-name"> ${renderMarkdown(item.name)} </span>
  </p>`;

function setCardContent(cardElement, items) {
  cardElement.innerHTML =
    cardElement.innerHTML.replace(/<p class="aj-next-step"(.|[\r\n])*<\/p>/g, '')
    + (items || []).map(renderItem).join('\n');
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
      + '<span style="position: relative; top: -1px;">↑↓&nbsp;&nbsp;</span>' // ⇟⇵⇅↿⇂
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
  }
  #aj-nextstep-mode {
    color: #bfbfbf;
  }
  #aj-nextstep-btn {
    transform: translate3d(0, 0, 0);
    animation: highlight 2s ease-out;
  }
  @keyframes highlight {
    0% {
      background-color: rgba(255, 255, 128, 0.5);
    }
    100% {
      background-color: rgba(255, 255, 128, 0);
    }
  }
  `;
  document.head.appendChild(style);
}

const isOnBoardPage = () => window.location.href.indexOf('https://trello.com/b/') === 0;

var needsRefresh = true;
var token; // needed by onCheckItem

// define function to allow checking items directly from board.
function onCheckItem(evt) {
  evt.preventDefault();
  evt.stopPropagation();
  // let's check that item
  var item = evt.currentTarget.parentNode;
  var check = document.createElement('span');
  check.innerHTML = '✔';
  check.style = 'position: absolute; top: -1px; left: 5px;';
  item.appendChild(check); 
  item.style.display = 'block';
  item.style.height = item.offsetHeight + 'px';
  item.style.transform = 'translate3d(0, 0, 0)'; // to enable hardware acceleration of transition
  item.getElementsByClassName('aj-item-name')[0]
    .style.textDecoration = 'line-through';
  // let's tell trello
  var url = 'https://trello.com/1/cards/' + item.getAttribute('data-card-id')
    + '/checklist/' + item.getAttribute('data-checklist-id')
    + '/checkItem/' + item.getAttribute('data-item-id')
  var urlEncodedData = 'state=complete&' + token.trim();
  fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': urlEncodedData.length
    },
    body: urlEncodedData
  }).then(function() {
    // hide the task progressively
    item.style.overflow = 'hidden';
    item.style.transition = 'all 0.5s ease';
    item.style.height = '0px';
    item.style.margin = '0';
    // will make the list of tasks refresh
    needsRefresh = true;
  });
}

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
}

console.log('[[ next-step-for-trello ]]');
init();
