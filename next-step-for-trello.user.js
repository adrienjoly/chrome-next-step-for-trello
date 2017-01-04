// ==UserScript==
// @name Next Step for Trello
// @version 1.5.3
// @homepage http://adrienjoly.com/chrome-next-step-for-trello
// @description Check tasks directly from your Trello boards.
// @match https://trello.com/*
// @match http://trello.com/*
// @run-at document-start
// ==/UserScript==

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

// announcement/cookie helper

const Announcement = (announcementId) => {
  const COOKIE_NAME = 'aj-nextstep';
  const cookieValue = 'seen-' + announcementId;
  const setCookie = (name, value, days = 7, path = '/') => {
    const expires = new Date(Date.now() + days * 864e5).toGMTString();
    document.cookie = name + `=${encodeURIComponent(value)}; expires=${expires}; path=` + path;
  };
  const getCookie = (name) =>
    document.cookie.split('; ').reduce((r, v) => {
      const parts = v.split('=');
      return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, '');
  const deleteCookie = (name, path) => {
    setCookie(name, '', -1, path);
  };
  const notSeenYet = getCookie(COOKIE_NAME).indexOf(cookieValue) === -1;
  if (notSeenYet) {
    document.body.classList.add('aj-nextstep-display-' + announcementId);
  }
  return {
    notSeenYet: notSeenYet,
    setAsSeen: () => {
      setCookie(COOKIE_NAME, cookieValue);
      document.body.classList.remove('aj-nextstep-display-' + announcementId);
    }
  };
};

// app state

var MENU_ITEMS;
var MODES;
var currentMode = 1;
var needsRefresh = true;
var refreshing = false;
var onCheckItem;
var token; // needed by onCheckItem
var announcement;

function setMode(modeIndex) {
  currentMode = modeIndex;
  needsRefresh = true;
}

// UI helpers

function initToolbarButton() {
  var btn = document.createElement('a');
  btn.href = 'http://adrienjoly.com/chrome-next-step-for-trello';
  btn.title = 'Click to toggle display of next task(s)';
  btn.id = 'aj-nextstep-btn';
  btn.className = 'board-header-btn board-header-btn-without-icon';
  btn.innerHTML = '<span class="board-header-btn-text">'
    + '<span class="aj-nextstep-icon">↑↓&nbsp;&nbsp;</span>' // ⇟⇵⇅↿⇂
    + '<span class="aj-nextstep-ant-icon" style="display: none;">♥</span>' // announcement
    + 'Next steps: <span id="aj-nextstep-mode">' + MODES[currentMode].label + '</span>'
    + '<div id="aj-nextstep-loading" class="uil-reload-css"><div></div></div>'
    + '</span>';
  announcement = Announcement('ant3');
  return btn;
}

const renderSelectorOption = (menuItem, i) => `
  <li>
    <a id="aj-nextstep-menuitem-${ i }" class="js-select light-hover ${ menuItem.className || '' }" href="#" name="org">
      ${ menuItem.label }
      ${ currentMode === menuItem.modeIndex ? '<span class="icon-sm icon-check"></span>' : '' }
      <span class="sub-name">${ menuItem.description }</span>
    </a>
  </li>`;

const renderToolbarSelector = (selectorId, innerHTML) => `
  <div class="pop-over-header js-pop-over-header">
    <span class="pop-over-header-title">Next Step - Display mode</span>
    <a
      href="#"
      class="pop-over-header-close-btn icon-sm icon-close"
      onclick="document.getElementById('${selectorId}').classList.remove('is-shown');">
    </a>
  </div>
  <div>
    <div class="pop-over-content js-pop-over-content u-fancy-scrollbar js-tab-parent" style="max-height: 599px;">
      <div>
        <ul class="pop-over-list" id="aj-nextstep-modes">
          ${innerHTML}
        </ul>
      </div>
    </div>
  </div>`;

function initToolbarSelector(btn) {
  const node = document.createElement('div');
  node.id = 'aj-nextstep-selector';
  node.className = 'pop-over';
  node.hide = () => {
    node.classList.remove('is-shown');
  };
  node.show = () => {
    node.innerHTML = renderToolbarSelector(node.id, MENU_ITEMS.map(renderSelectorOption).join('\n'));
    setTimeout(() => {
      MENU_ITEMS.forEach((menuItem, i) =>
        document.getElementById('aj-nextstep-menuitem-' + i).onclick = function() {
          menuItem.onClick.apply(this, arguments);
          node.hide();
        });
    }, 1);
    node.style = 'top: 84px; left: ' + (btn.offsetLeft + btn.parentNode.offsetLeft) + 'px;';
    node.classList.add('is-shown');
  };
  node.toggle = function(evt) {
    evt.preventDefault();
    this[ this.classList.contains('is-shown') ? 'hide' : 'show' ]();
  };
  return node;
}

function getUserName() {
  let userName = document
    .getElementsByClassName('header-user')[0]
    .getElementsByClassName('member-avatar')[0].title;
  return userName.slice(userName.indexOf('(') + 1, userName.indexOf(')'));
}

function renderAtMention(userName) {
  let meClass = userName === '@' + getUserName() ? ' me' : '';
  return '<span class="atMention' + meClass + '">' + userName + '</span>';
}

const renderMarkdown = (text) => text
  // 1) turn plain URLs (non-markdown links) into markdown links
  .replace(/([^\]][^\(])(https?\:\/\/([^\/ ]+)[^ ]+)/g, '$1[$2]($2)')
  // 2) turn markdown links into hyperlinks
  .replace(/\[(.*)\]\((.*)\)/g, '<a href="$2" class="aj-md-hyperlink">$1</a>')
  .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
  .replace(/__(.*)__/g, '<strong>$1</strong>')
  .replace(/\*(?!\*)(.*)\*(?!\*)/g, '<em>$1</em>')
  .replace(/_(?!_)(.*)_(?!_)/g, '<em>$1</em>')
  .replace(/`{3}(.*)`{3}|`{1}(.*)`{1}/g, '<code>$1$2</code>')
  .replace(/~~(.*)~~/g, '<del>$1</del>')
  .replace(/@\w+/g, renderAtMention);

const renderItem = (item) => `
  <p class="aj-next-step"
     data-card-id="${item.cardId}"
     data-checklist-id="${item.checklistId}"
     data-item-id="${item.id}" >
        <span class="aj-checkbox checklist-item-checkbox"></span>
        <span class="aj-checkbox-tick"></span>
        <span class="aj-item-name"> ${renderMarkdown(item.name)} </span>
  </p>`;

function setCardContent(cardTitleElement, items) {
  var cardElement = cardTitleElement.parentNode;
  var taskList = cardElement.getElementsByClassName('aj-task-list')[0];
  // if task list div does not exist => create it
  if (!taskList) {
    taskList = document.createElement('div');
    taskList.className = 'aj-task-list';
    const badgesEl = cardTitleElement.parentNode.getElementsByClassName('badges')[0];
    cardElement.insertBefore(taskList, badgesEl);
    // rely on the .badges element to avoid conflict with plus-for-trello
  }
  taskList.innerHTML = (items || []).map(renderItem).join('\n');
  // attach click handlers on checkboxes
  var checkboxes = taskList.getElementsByClassName('aj-checkbox-tick');
  for (var i=0; i<checkboxes.length; ++i) {
    checkboxes[i].addEventListener('click', onCheckItem);
  }
}

function updateCardElements(cardElements) {
  // cardElements must be an array of a.list-card-title elements (with a href)
  refreshing = true;
  document.getElementById('aj-nextstep-mode').innerHTML = MODES[currentMode].label; 
  document.getElementById('aj-nextstep-loading').style.display = 'inline-block';
  var handler = (cardElement) => cardElement.href && MODES[currentMode].handler(cardElement);
  var promises = Array.prototype.map.call(cardElements, handler);
  Promise.all(promises).then(function(result) {
    refreshing = false;
    document.getElementById('aj-nextstep-loading').style.display = 'none';
  });
}

function updateCards() {
  // extract only one .list-card-title per .list-card (e.g. with Plus for Trello)
  const lastTitle = (listCard) => Array.from(listCard.getElementsByClassName('list-card-title')).pop();
  const cardLinks = [].map.call(document.getElementsByClassName('list-card'), lastTitle);
  updateCardElements(cardLinks);
}

// trello data model

const fetchStepsThen = (cardElement, handler) => fetch(cardElement.href + '.json', {credentials: 'include'})
  .then((res) => res.json())
  .then((json) => {
    setCardContent(cardElement, handler(json.checklists));
  }); 

// extension modes

MODES = [
  {
    label: 'Hidden',
    description: 'Don\'t display next steps',
    handler: setCardContent
  },
  {
    label: 'One per card',
    description: 'Display first next step of each card',
    handler: (cardElement) => fetchStepsThen(cardElement, getNextStep)
  },
  {
    label: 'One per checklist',
    description: 'Display first next step of each checklist',
    handler: (cardElement) => fetchStepsThen(cardElement, getNextStepsOfChecklists)
  },
  {
    label: 'Display all',
    description: 'Display all unchecked checklist items',
    handler: (cardElement) => fetchStepsThen(cardElement, getAllNextStepsNamed)
  },
];

MENU_ITEMS = [
  /*
  {
    label: '✍ Any feedback to share?',
    description: 'Let me know how I can help, or give us some stars!',
    onClick: () => {
      window.open('https://chrome.google.com/webstore/detail/next-step-for-trello/iajhmklhilkjgabejjemfbhmclgnmamf');
    }
  },
  {
    label: '📢 Love Next Step? You can help!',
    description: 'Support the development of v2.0 on Kickstarter!',
    className: 'aj-nextstep-ant2-menuitem',
    onClick: () => {
      window.open('http://bit.ly/kickstarter-nextstep-from-ant2');
      announcement.setAsSeen();
    }
  },
  */
  {
    label: 'You ❤️ Next Step?',
    description: 'Tell us why, be featured on its website!',
    className: 'aj-nextstep-ant3-menuitem',
    onClick: () => {
      window.open('http://bit.ly/tweet-nextstep-from-ant3');
      announcement.setAsSeen();
    }
  },

].concat(MODES.map((mode, i) => {
  return Object.assign(mode, {
    modeIndex: i,
    onClick: () => setMode(i)
  });
}));

// extension initialization

const isToolbarInstalled = () => document.getElementById('aj-nextstep-mode'); 

function installToolbar() {
  var headerElements = document.getElementsByClassName('board-header-btns');
  var myCardsPageWrapper = document.getElementsByClassName('tabbed-pane-main-col-wrapper'); // for /my/cards page
  if (myCardsPageWrapper.length) {
    headerElements = myCardsPageWrapper[0].children; // toolbar is the first child
  }
  if (isToolbarInstalled() || !headerElements.length) {
    return false;
  } else {
    const btn = initToolbarButton();
    const popover = initToolbarSelector(btn);
    headerElements[0].appendChild(btn);
    document.body.appendChild(popover);
    btn.onclick = popover.toggle.bind(popover);
    return true;
  }
}

function watchForChanges() {
  /*
  // refresh on card name change
  document.body.addEventListener('DOMSubtreeModified', function(e){
    if ('list-card-details' === e.target.className) {
      needsRefresh = true;
    }
  }, false);
  // TODO: re-activate name change detection without interfering with drag&drop with single ajax request, below:
  */
  // refresh after drag&dropping a card to another column
  document.body.addEventListener('DOMNodeInserted', function(e){
    if (e.target.className === 'list-card js-member-droppable active-card ui-droppable') {
      var cardLink = Array.from(e.target.getElementsByClassName('list-card-title')).pop();
      updateCardElements([cardLink]);
    }
  }, false);
}

function injectCss() {
  var style = document.createElement('style');
  style.innerHTML = `
  /* next step item */

  .aj-next-step {
    position: relative;
    padding-left: 18px;
    margin-top: 1em;
    font-size: 12px;
    line-height: 1.2em;
    color: #8c8c8c;
    font-family: Helvetica Neue, Arial, Helvetica, sans-serif;
  }
  .aj-next-step > .aj-checkbox {
    position: absolute;
    top: -5px;
    left: 2px;
    box-shadow: none;
    height: 10px;
    width: 10px;
  }
  .aj-next-step > .aj-item-name > .aj-md-hyperlink {
    text-decoration: underline;
  }
  .aj-next-step > .aj-checkbox-tick {
    opacity: 0;
    position: absolute;
    top: -1px;
    left: 4px;
  }
  .aj-next-step > .aj-checkbox-tick::before {
        content: "\\2714"; /* ✔ Checkmark */
  }
  .aj-next-step > .aj-checkbox-tick:hover {
    opacity: 0.5;
  }
  .aj-next-step.aj-checking {
    transform: translate3d(0, 0, 0); /* to enable hardware acceleration of transition */
    display: block;
  }
  .aj-next-step.aj-checking > .aj-checkbox-tick {
    opacity: 1;
  }
  .aj-next-step.aj-checking > .aj-item-name {
    text-decoration: line-through;
  }
  .aj-next-step.aj-checked {
    overflow: hidden;
    transition: all 0.5s ease;
    height: 0px !important;
    margin: 0;
  }

  /* next step toolbar button */

  #aj-nextstep-mode {
    font-weight: 100;
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
  .aj-nextstep-icon {
    position: relative;
    top: -1px;
  }

  /* next step toolbar button - loading animation */

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

  /* next step toolbar button - announcements */

  @keyframes pulse {
    0% {
      opacity: 0.5;
    }
    100% {
      opacity: 1.0;
    }
  }

  .aj-nextstep-ant-icon {
    display: none;
    transform: translate3d(0, 0, 0);
    animation: pulse 1s linear infinite;
  }

  body.aj-nextstep-display-ant3 .aj-nextstep-ant-icon {
    display: inline !important;
    background: red;
    color: white;
    font-weight: bold;
    padding: 0 3px 0 3px;
    border: 1px solid white;
    font-size: 12px;
    position: relative;
    top: -1px;
    margin-right: 4px;
  }

  body.aj-nextstep-display-ant3 .aj-nextstep-icon {
    display: none;
  }

  body.aj-nextstep-display-ant3 .aj-nextstep-ant3-menuitem {
    background-color: rgba(255, 0, 0, 0.1);
  }
  `;
  document.head.appendChild(style);
}

const isOnBoardPage = () => window.location.href.indexOf('https://trello.com/b/') === 0;
const isOnMyCardsPage = () => /https\:\/\/trello.com\/[^/]*\/cards/.test(window.location.href);

// define function to allow checking items directly from board.
onCheckItem = function(evt) {
  evt.preventDefault();
  evt.stopPropagation();
  // let's check that item
  var item = evt.currentTarget.parentNode;
  item.classList.add('aj-checking');
  item.style.height = item.offsetHeight + 'px';
  // let's tell trello
  var url = 'https://trello.com/1/cards/' + item.getAttribute('data-card-id')
    + '/checklist/' + item.getAttribute('data-checklist-id')
    + '/checkItem/' + item.getAttribute('data-item-id');
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
    item.classList.add('aj-checked');
    // will make the list of tasks refresh
    needsRefresh = true;
  });
};

const INIT_STEPS = [
  // step 0: integrate the toolbar button (when page is ready)
  function initToolbar(callback) {
    if (installToolbar()) {
      callback();
    }
  },
  // step 1: watch DOM changes (one shot init)
  function initWatchers(callback) {
    watchForChanges();
    injectCss();
    callback();
  },
  // step 2: get global token from Trello
  function getToken(callback) {
    callback(); // calling it right away, in case the following code crashes
    // wait for the message
    window.addEventListener("MyCustomEvent", function (e) {
      token = e.detail.passback;
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
    if (needsRefresh && !refreshing) {
      needsRefresh = false;
      updateCards();
    }
  }
];

function init(){
  var currentStep = 0;
  setInterval(() => {
    if (isOnBoardPage() || isOnMyCardsPage()) {
      INIT_STEPS[currentStep](() => { ++currentStep; });
    } else {
      needsRefresh = true;
    }
  }, 500);
}

init();
