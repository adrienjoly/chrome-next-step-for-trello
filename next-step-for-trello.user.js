// ==UserScript==
// @name Next Step for Trello cards
// @version 0.4.4
// @homepage http://bit.ly/next-for-trello
// @description Appends the first unchecked checklist item to the title of each card, when visiting a Trello board.
// @match https://trello.com/b/*
// @match http://trello.com/b/*
// ==/UserScript==

/***
 * How to Install in Chrome or Chromium:
 * 1. Download this script.
 * 2. Open chrome://extensions/ in the browser.
 * 3. Drag the downloaded file to the browser window.
 * 
 * Please star my gist if you like it :-)
 */

var EMOJI = '⭕';
var STYLING = 'margin-top: 1em; font-size: 0.8em; line-height: 1.2em; color: #4476d6;';

function getFirstIncompleteItem(checklists) {
  var checkItems = checklists.reduce((a, b) => a.concat(b.checkItems), []);
  checkItems.sort((a, b) => a.pos > b.pos); // take order into account
  return checkItems.filter((item) => item.state === 'incomplete')[0];
}

function updateCard(cardElement) {
  console.info('doing', cardElement.href, '...');
  return fetch(cardElement.href + '.json', {credentials: 'include'})
    .then((res) => res.json())
    .then((json) => {
      var item = getFirstIncompleteItem(json.checklists);
      if (item) {
        cardElement.innerHTML =
          cardElement.innerHTML.replace(/<p.*<\/p>/, '')
          + '<p style="' + STYLING + '">' + EMOJI + ' ' + item.name + '</p>';
      }
      console.info('done', cardElement.href);
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
  if (!headerElements.length) {
    console.info('Trello is still not ready... => Will retry to init "next step" in 1 second.');
    setTimeout(init, 500);
  } else {
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
}

setTimeout(init, 100);
