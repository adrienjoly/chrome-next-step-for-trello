// ==UserScript==
// @name Next Step for Trello cards
// @version 0.5.0
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

function setCardContent(cardElement, items) {
  cardElement.innerHTML =
    cardElement.innerHTML.replace(/<p class="aj-next-step".*<\/p>/g, '')
    + (items || []).map((item) => '<p class="aj-next-step" style="position: relative; ' + STYLING + '">'
      + '<span style="position: absolute; top: 1px; left: 2px;">' + EMOJI + '</span>'
      + '<span>' + item.name + '</span>'
      + '</p>'
    ).join('\n');
}

function updateCards() {
  console.log('[[ next-step-for-trello ]] updateCards()...');
  var cards = document.getElementsByClassName('list-card-title');
  var handler = (cardElement) => cardElement.href && MODES[currentMode].handler(cardElement);
  var promises = Array.prototype.map.call(cards, handler);
  Promise.all(promises).then(function(result) {
    //console.info('DONE ALL', result.length);
  }, function(err) {
    console.info('ERROR', err);
  });;
}

// extension modes

var MODES = [
  {
    label: 'One step per card',
    handler: (cardElement) => fetchStepsThen(cardElement, getNextStep)
  },
  {
    label: 'Hide next steps',
    handler: setCardContent
  },
  {
    label: 'All next steps',
    handler: (cardElement) => fetchStepsThen(cardElement, getAllNextStepsNamed)
  },
  {
    label: 'First step of each checklist',
    handler: (cardElement) => fetchStepsThen(cardElement, getNextStepsOfChecklists)
  },
];

var currentMode = 0;

function nextMode() {
  currentMode = (currentMode + 1) % MODES.length;
  updateCards();
  document.getElementById('aj-nextstep-mode').innerHTML = MODES[currentMode].label; 
}

// extension initialization

function installToolbar() {
  var headerElements = document.getElementsByClassName('board-header-btns')
  var btn = document.createElement('a');
  btn.href = '#';
  btn.id = 'aj-nextstep-btn';
  btn.className = 'board-header-btn board-header-btn-without-icon';
  btn.onclick = nextMode;
  btn.innerHTML = '<span class="board-header-btn-text">'
    + 'Mode: <span id="aj-nextstep-mode">' + MODES[currentMode].label + '</span>'
    + '</span>';
  headerElements[0].appendChild(btn);
}

function init(){
  var needsRefresh = true;
  setInterval(function() {
    if (window.location.href.indexOf('https://trello.com/b/') === 0) {
      if (!document.getElementById('aj-nextstep-btn')) {
        installToolbar();
      }
      if (needsRefresh) {
        needsRefresh = false;
        updateCards();
      }
    } else {
      needsRefresh = true;
    }
  }, 500);
}

console.log('[[ next-step-for-trello ]]', document.readyState);

window.onload = init;

if (document.readyState === 'complete') init();
