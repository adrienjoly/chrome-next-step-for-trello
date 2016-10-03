// ==UserScript==
// @name Next Step for Trello cards
// @version 0.2.0
// @homepage (( TBD ))
// @description Appends the first unchecked checklist item to the title of each card, when visiting a Trello board.
// @match https://trello.com/b/*
// @match http://trello.com/b/*
// ==/UserScript==

/***
 * How to Install in Chrome or Chromium:
 * 1. Download this script.
 * 2. Open chrome://extensions/ in the browser.
 * 3. Drag the downloaded file to the browser window.
 */

var EMOJI = '⭕';
var STYLING = 'margin-top: 1em; font-size: 0.8em; line-height: 1.2em; color: #4476d6;';

function getFirstIncompleteItem(checklists) {
  var checkItems = checklists.reduce((a, b) => a.concat(b.checkItems), []);
  return checkItems.filter((item) => item.state === 'incomplete')[0];
}

function updateCard(cardElement) {
  fetch(cardElement.href + '.json', {credentials: 'same-origin'})
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
  for (var i = 0; i < cards.length; i++) {
    updateCard(cards[i]);
  }
}

var btn = document.createElement('a');
btn.href = '#';
btn.id = 'aj-nextstep-btn';
btn.className = 'board-header-btn board-header-btn-without-icon';
btn.onclick = updateCards;
btn.innerHTML = '<span class="board-header-btn-text">'
  + EMOJI + ' Refresh Next Actions'
  + '</span>';
document.getElementsByClassName('board-header-btns')[0].appendChild(btn);

updateCards();
