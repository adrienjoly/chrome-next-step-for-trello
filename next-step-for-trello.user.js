// ==UserScript==
// @name Next Step for Trello cards
// @version 0.4.91
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

function getFirstIncompleteItem(checklists) {
  var byPos = (a, b) => a.pos > b.pos ? 1 : -1; // take order into account
  var checkItems = checklists
    .sort(byPos)
    .reduce((a, b) => a.concat(b.checkItems.sort(byPos)), []);
  return checkItems.filter((item) => item.state === 'incomplete')[0];
}

function updateCard(cardElement) {
  if (!cardElement.href) console.warn('empty href!')
  return fetch(cardElement.href + '.json', {credentials: 'include'})
    .then((res) => res.json())
    .then((json) => {
      var item = getFirstIncompleteItem(json.checklists);
      cardElement.innerHTML =
        cardElement.innerHTML.replace(/<p class="aj-next-step".*<\/p>/, '')
        + (!item ? '' : ('<p class="aj-next-step" style="position: relative; ' + STYLING + '">'
        + '<span style="position: absolute; top: 1px; left: 2px;">' + EMOJI + '</span>'
        + '<span>' + item.name + '</span>'
        + '</p>'));
    });
}

function updateCards() {
  console.log('[[ next-step-for-trello ]] updateCards()...');
  var cards = document.getElementsByClassName('list-card-title');
  var promises = Array.prototype.map.call(cards, updateCard);
  Promise.all(promises).then(function(result) {
    //console.info('DONE ALL', result.length);
  }, function(err) {
    console.info('ERROR', err);
  });;
}

function cleanCard(cardElement) {
  if (!cardElement.href) console.warn('empty href!')
  cardElement.innerHTML = cardElement.innerHTML.replace(/<p class="aj-next-step".*<\/p>/, '');
}

function cleanCards() {
  console.log('[[ next-step-for-trello ]] cleanCards()...');
  var cards = document.getElementsByClassName('list-card-title');
  Array.prototype.forEach.call(cards, cleanCard);
}

var MODES = [
  {
    label: 'One step per card',
    activate: updateCards
  },
  {
    label: 'Hide next steps',
    activate: cleanCards
  },
];

var currentMode = 0;

function nextMode() {
  console.log('old mode', currentMode);
  currentMode = (currentMode + 1) % MODES.length;
  MODES[currentMode].activate();
  console.log('new mode', currentMode);
  document.getElementById('aj-nextstep-mode').innerHTML = MODES[currentMode].label; 
}

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
