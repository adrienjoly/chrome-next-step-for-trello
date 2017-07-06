var vm = require('vm');
var fs = require('fs');
var chrome = require('sinon-chrome');

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

module.exports = {
  document: document,
  context: context,
  sandbox: sandbox,
  window: window
}
