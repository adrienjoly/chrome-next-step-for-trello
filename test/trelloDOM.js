var vm = require('vm');
var fs = require('fs');
var chrome = require('sinon-chrome');
var assert = require('assert');

// Stop the DEV_MODE const from causing an error
chrome.runtime.getManifest.returns([]);

// Fake up a browser to stop calls that access the DOM from causing errors
var MockBrowser = require('mock-browser').mocks.MockBrowser;
var mock = new MockBrowser();
var document = mock.getDocument();
var window = mock.getWindow();
var setInterval = function () {}

// This is the context our tests will run in
var sandbox = {
  chrome,
  document,
  setInterval,
  returnValue: null
};
var context = vm.createContext(sandbox);

// Load the next-step-for-trello code
var code = fs.readFileSync('next-step-for-trello.user.js')
const script = new vm.Script(code);
script.runInContext(context)

// Mock the getUserName function
var mockGetUserName = 'getUserName = function () { return "test"; }';
const mockGetUserNameScript = new vm.Script(mockGetUserName);
mockGetUserNameScript.runInContext(context)

// Load the mocked broswer document with the card HTML we expect to see
var myDiv = document.createElement('div');
myDiv.innerHTML = fs.readFileSync('test/expectedCard.html');
document.body.appendChild(myDiv);

// Set up and run our test cases
describe('getCardElementByShortUrl', function() {
  it('returns undefined if URL does not exist', function() {
    var testScript = new vm.Script(
      'returnValue = getCardElementByShortUrl("https://trello.com/c/invalid")'
    );
    testScript.runInContext(context);
    assert.equal(sandbox.returnValue, undefined);
  });

  it('returns card element if URL does exist', function() {
    var testScript = new vm.Script(
      'returnValue = getCardElementByShortUrl("https://trello.com/c/1234abcd")'
    );
    testScript.runInContext(context);
    assert.equal(sandbox.returnValue instanceof window.HTMLSpanElement, true);
  });
});

describe('getCardUrlFromTitleElement', function() {
  it('gets the correct URL', function() {
    var testScript = new vm.Script(
      'var titleElement = document.getElementsByClassName("list-card-title")[0];'
      + 'returnValue = getCardUrlFromTitleElement(titleElement)'
    );
    testScript.runInContext(context);
    assert.equal(sandbox.returnValue, '/c/1234abcd/1-tests');
  });
});
