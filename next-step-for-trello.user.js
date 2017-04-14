// ==UserScript==
// @name Next Step for Trello
// @version 1.7.0
// @homepage http://adrienjoly.com/chrome-next-step-for-trello
// @description Check tasks directly from your Trello boards.
// @match https://trello.com/*
// @match http://trello.com/*
// @run-at document-start
// ==/UserScript==

const URL_PREFIX = 'https://adrienjoly.com/chrome-next-step-for-trello'

const DEV_MODE = !('update_url' in chrome.runtime.getManifest())

const ANNOUNCEMENT_URL = DEV_MODE
  ? chrome.extension.getURL('/docs/assets/announcement.json') // load locally
  : `${URL_PREFIX}/assets/announcement.json` // load from official website

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

// user preferences / cookie helper

const userPrefs = new (function UserPrefs(COOKIE_NAME) {
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
  return Object.assign(this, {
    get: () => JSON.parse(getCookie(COOKIE_NAME) || '{}'),
    getValue: (key, defaultVal) => {
      let val = this.get()[key];
      return typeof val === 'undefined' ? defaultVal : val;
    },
    set: (obj) => setCookie(COOKIE_NAME, JSON.stringify(Object.assign(this.get(), obj))),
    setValue: (key, val) => {
      let obj = {};
      obj[key] = val;
      this.set(obj);
    },
  });
})('aj-nextstep-json');

// announcement helper

const Announcement = (announcementId) => {
  const SEEN_PROP = 'seen-' + announcementId;
  const getCheckCount = () => userPrefs.getValue('checkCounter', 0);
  const shouldDisplay = () => !userPrefs.getValue(SEEN_PROP) && getCheckCount() > 5;
  const displayIfNecessary = () =>
    document.body.classList.toggle('aj-nextstep-display-ant', shouldDisplay());
  displayIfNecessary();
  return {
    incrementCheckCounter: () => {
      userPrefs.set({ checkCounter: getCheckCount() + 1 });
      displayIfNecessary();
    },
    setAsSeen: () => {
      userPrefs.setValue(SEEN_PROP, true);
      displayIfNecessary();
    }
  };
};

// app state

var MENU_ITEMS;
var MODES;
var currentMode = userPrefs.getValue('defaultMode', 1);
var needsRefresh = true; // true = all, or { cardUrls }
var refreshing = false;
var onCheckItem;
var token; // needed by onCheckItem
var announcement;
var version;

function setMode(modeIndex) {
  currentMode = modeIndex;
  needsRefresh = true;
  userPrefs.setValue('defaultMode', modeIndex);
}

try {
  version = chrome.runtime.getManifest().version;
} catch(e) {}

// UI helpers

function initToolbarButton() {
  var btn = document.createElement('a');
  btn.href = 'http://adrienjoly.com/chrome-next-step-for-trello';
  btn.title = 'Click to toggle display of next task(s)';
  btn.id = 'aj-nextstep-btn';
  btn.className = 'board-header-btn board-header-btn-without-icon';
  btn.innerHTML = '<span class="board-header-btn-text">'
    + '<span class="aj-nextstep-icon">↑↓&nbsp;&nbsp;</span>'
    + '<span class="aj-nextstep-ant-icon" style="display: none;">1</span>' // announcement
    + 'Next steps: <span id="aj-nextstep-mode">Loading...</span>'
    + '<div id="aj-nextstep-loading" class="uil-reload-css"><div></div></div>'
    + '</span>';
  announcement = Announcement('ant4');
  return btn;
}

const renderSelectorOption = (menuItem, i) => `
  <li>
    <a id="aj-nextstep-menuitem-${ i }" class="js-select light-hover ${ menuItem.className || '' }"
       href="${ menuItem.href || '#' }" ${ menuItem.href ? 'target="_blank"' : '' } name="org">
      ${ menuItem.label }
      ${ currentMode === menuItem.modeIndex ? '<span class="icon-sm icon-check"></span>' : '' }
      <span class="sub-name">${ menuItem.description }</span>
    </a>
  </li>`;

const renderToolbarSelector = (selectorId, innerHTML) => `
  <div class="pop-over-header js-pop-over-header">
    <a
      class="pop-over-header-title"
      href="${URL_PREFIX}/"
      target="_blank">ℹ️ Next Step for Trello ${ version }</a>
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
    //heap.track('Click on toolbar button', {});
  };
  node.toggle = function(evt) {
    evt.preventDefault();
    this[ this.classList.contains('is-shown') ? 'hide' : 'show' ]();
  };
  return node;
}

function getUserName() {
  let userName = (document
    .getElementsByClassName('header-user')[0]
    .getElementsByClassName('member-avatar')[0] || {}).title || 'me';
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
  .replace(/\[([^\]]*)\]\(([^\)]*)\)/g, '<a href="$2" class="aj-md-hyperlink">$1</a>')
  .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
  .replace(/__(.*)__/g, '<strong>$1</strong>')
  .replace(/\*(?!\*)(.*)\*(?!\*)/g, '<em>$1</em>')
  .replace(/_(?!_)(.*)_(?!_)/g, '<em>$1</em>')
  .replace(/`{3}(.*)`{3}|`{1}(.*)`{1}/g, '<code>$1$2</code>')
  .replace(/~~(.*)~~/g, '<del>$1</del>')
  .replace(/@\w+/g, renderAtMention);

const renderItem = (item) => `
  <p class="aj-next-step"
     data-card-url="${item.cardUrl}"
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
  taskList.innerHTML = (items || [])
    .map((item) => Object.assign(item, { cardUrl: cardTitleElement.href }))
    .map(renderItem).join('\n');
  // attach click handlers on checkboxes
  var checkboxes = taskList.getElementsByClassName('aj-checkbox-tick');
  for (var i=0; i<checkboxes.length; ++i) {
    checkboxes[i].addEventListener('click', onCheckItem);
  }
}

// extract only one .list-card-title per .list-card (e.g. with Plus for Trello)
const getCardElementByParent = (parentElement) =>
  Array.from(parentElement.getElementsByClassName('list-card-title')).pop()

const getCardElementByShortUrl = (shortUrl) =>
  Array.from(document.querySelectorAll(`.list-card-title[href^="${shortUrl.split('.com')[1]}"]`)).pop()

// TODO: remove promise?
const updateCardElements = (cards) => Promise.all(cards
  .map((card) => {
    const cardElement = getCardElementByShortUrl(card.shortUrl)
    //console.log('-', card.shortUrl, cardElement)
    return cardElement && setCardContent(cardElement, MODES[currentMode].handler(card.checklists))
  })
)

const extractId = (url = window.location.href) => url.split('/')[4] // ooooh! this is dirty!

const shortUrl = (url) => url.split('/', 5).join('/')

const fetchBoardChecklists = (boardId = extractId()) =>
  fetch(`https://trello.com/1/boards/${boardId}/checklists?cards=all&card_fields=shortUrl`, {credentials: 'include'})
    .then((res) => res.json())

function updateCards(toRefresh) {
  refreshing = true;
  document.getElementById('aj-nextstep-mode').innerHTML = MODES[currentMode].label.replace('Mode: ', '');
  document.getElementById('aj-nextstep-loading').style.display = 'inline-block';
  // TODO: create a function to toggle the loading UI
  fetchBoardChecklists().then((checklists) => {
    //let cards = cardLinks.map((cardLink) => ({ href: cardLink.href }))
    // 1. filter cards that contain checklists
    let cards = checklists.reduce((cards, checklist) => {
      const shortUrl = checklist.cards[0].shortUrl
      cards[shortUrl] = cards[shortUrl] || { shortUrl: shortUrl, checklists: [] }
      cards[shortUrl].checklists.push(checklist)
      return cards
    }, {})
    console.log('cards:', cards)
    //const hasChecklists = (card) => !!cardUrls[shortUrl(card.href)]
    //cards = cards.filter(hasChecklists)
    /*
    // 2. only refresh specified cards (e.g. when checking an item of a card)
    if ((toRefresh || {}).cardUrls) {
      cards = cards.filter((card) => toRefresh.cardUrls.includes(card.href))
    }
    */
    // TODO: re-enable filter #2 above
    updateCardElements(Object.values(cards)).then(function(result) {
      refreshing = false
      document.getElementById('aj-nextstep-loading').style.display = 'none'
    })
  })
}

// extension modes

MODES = [
  {
    label: 'Mode: Hidden',
    description: 'Don\'t display next steps',
    handler: (checklists) => ([]),
  },
  {
    label: 'Mode: One per card',
    description: 'Display first next step of each card',
    handler: getNextStep,
  },
  {
    label: 'Mode: One per checklist',
    description: 'Display first next step of each checklist',
    handler: getNextStepsOfChecklists,
  },
  {
    label: 'Mode: All steps',
    description: 'Display all unchecked checklist items',
    handler: getAllNextStepsNamed,
  },
];

MENU_ITEMS = MODES.map((mode, i) => {
  return Object.assign(mode, {
    modeIndex: i,
    onClick: () => setMode(i)
  });
});

// extension initialization

const isToolbarInstalled = () => document.getElementById('aj-nextstep-mode'); 

function installToolbar() {
  var headerElements = document.getElementsByClassName('board-header-btns');
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
      needsRefresh = true; // TODO: use { cardUrls } instead
    }
  }, false);
  // TODO: re-activate name change detection without interfering with drag&drop with single ajax request, below:
  */
  // refresh after drag&dropping a card to another column
  document.body.addEventListener('DOMNodeInserted', function(e){
    if (e.target.className === 'list-card js-member-droppable active-card ui-droppable') {
      var cardLink = getCardElementByParent(e.target)
      updateCards({ cardUrls: cardLink.href })
    }
  }, false);
}

/*
function injectCss() {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${URL_PREFIX}/assets/extension.css` // or chrome.extension.getURL('/next-step-for-trello.css')
  document.head.appendChild(link);
}
*/

const isOnBoardPage = () => window.location.href.indexOf('https://trello.com/b/') === 0;

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
    needsRefresh = {
      cardUrls: [ item.getAttribute('data-card-url') ],
    }
    // increment check counter
    announcement.incrementCheckCounter();
  });
};

// inject code into the page's context (unrestricted)
function injectJs(jsString, options) {
  options = options || {};
  var scr = document.createElement('script');
  scr.id = options.id;
  scr.textContent = jsString;
  // (appending text to a function to convert it's src to string only works in Chrome)
  // add to document to make it run, then hide it 
  (document.head || document.documentElement).appendChild(scr);
  if (options.thenRemove) {
    scr.parentNode.removeChild(scr);
  }
}

const INIT_STEPS = [
  // step 0: integrate the toolbar button (when page is ready)
  function initToolbar(callback) {
    if (installToolbar()) {
      callback();
      fetch(ANNOUNCEMENT_URL)
        .then((response) => response.json())
        .catch(() => ({
          label: '✍ Any feedback on Next Step for Trello?',
          description: 'Let me know how I can help, or give us some stars!',
          className: 'aj-nextstep-ant-menuitem aj-nextstep-ant-feedback',
          href: 'https://chrome.google.com/webstore/detail/next-step-for-trello/iajhmklhilkjgabejjemfbhmclgnmamf',
        }))
        .then((json) => MENU_ITEMS.push(Object.assign(json, {
          onClick: (evt) => announcement.setAsSeen()
        })))
    }
  },
  // step 1: watch DOM changes (one shot init)
  function initWatchers(callback) {
    watchForChanges();
    //injectCss(); // now loaded from package (see manifest.json)
    callback();
    // inject analytics
    injectJs(` 
      window.heap=window.heap||[],heap.load=function(e,t){window.heap.appid=e,window.heap.config=t=t||{};var r=t.forceSSL||"https:"===document.location.protocol,a=document.createElement("script");a.type="text/javascript",a.async=!0,a.src=(r?"https:":"http:")+"//cdn.heapanalytics.com/js/heap-"+e+".js";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(a,n);for(var o=function(e){return function(){heap.push([e].concat(Array.prototype.slice.call(arguments,0)))}},p=["addEventProperties","addUserProperties","clearEventProperties","identify","removeEventProperty","setEventProperties","track","unsetEventProperty"],c=0;c<p.length;c++)heap[p[c]]=o(p[c])};
        heap.load("3050518868");
    `);
  },
  // step 2: get global token from Trello
  function getToken(callback) {
    callback(); // calling it right away, in case the following code crashes
    // wait for the message
    window.addEventListener("MyCustomEvent", function (e) {
      token = e.detail.passback;
    });
    // inject code into the page's context (unrestricted)
    injectJs(` 
      var event = document.createEvent("CustomEvent");  
      event.initCustomEvent("MyCustomEvent", true, true, {"passback": token});
      window.dispatchEvent(event);`, { thenRemove: true });
  },
  // step 3: main loop
  function main() {
    if (!isToolbarInstalled()) {
      installToolbar();
      needsRefresh = true;
    }
    if (needsRefresh && !refreshing) {
      updateCards(needsRefresh);
      needsRefresh = false;
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

init();
