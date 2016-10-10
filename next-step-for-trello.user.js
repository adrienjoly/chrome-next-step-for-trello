// ==UserScript==
// @name Next Step for Trello cards
// @version 0.4.7
// @homepage http://bit.ly/next-for-trello
// @description Appends the first unchecked checklist item to the title of each card, when visiting a Trello board.
// @match https://trello.com/b/*
// @match http://trello.com/b/*
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

var EMOJI = '⭕';
var STYLING = 'margin-top: 1em; font-size: 0.8em; line-height: 1.2em; color: #4476d6;';

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
      if (item) {
        cardElement.innerHTML =
          cardElement.innerHTML.replace(/<p.*<\/p>/, '')
          + '<p style="' + STYLING + '">' + EMOJI + ' ' + item.name + '</p>';
      }
    });
}

function updateCards() {
  var cards = document.getElementsByClassName('list-card-title');
  var promises = Array.prototype.map.call(cards, updateCard);
  Promise.all(promises).then(function(result) {
    console.info('DONE ALL', result.length);
  }, function(err) {
    console.info('ERROR', err);
  });;
}

function init(){
  var headerElements = document.getElementsByClassName('board-header-btns')
  var btn = document.createElement('a');
  btn.href = '#';
  btn.id = 'aj-nextstep-btn';
  btn.className = 'board-header-btn board-header-btn-without-icon';
  btn.onclick = updateCards;
  btn.innerHTML = '<span class="board-header-btn-text">'
    + EMOJI + ' Refresh Next Actions'
    + '</span>';
  headerElements[0].appendChild(btn);
  updateCards();
}

console.log('[[ next-step-for-trello ]]', document.readyState);

window.onload = init;

if (document.readyState === 'complete') init();
