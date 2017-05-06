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
var setInterval = function () {}

// This is the context our tests will run in
var sandbox = {
  chrome: chrome,
  document: document,
  setInterval: setInterval,
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

// Set up and run our test cases
describe('renderMarkdown', function() {

  var tests = [
    {name: 'url', cases: [
      {
        input: 'http://test.com',
        expected: '<a href="http://test.com" class="aj-md-hyperlink">http://test.com</a>'
      },
      {
        input: 'See http://test.com',
        expected: 'See <a href="http://test.com" class="aj-md-hyperlink">http://test.com</a>'
      },
      {
        input: 'See https://test.com for details',
        expected: 'See <a href="https://test.com" class="aj-md-hyperlink">https://test.com</a> for details'
      }
    ]},
    {name: 'markdown link', cases: [
      {
        input: '[test](http://test.com)',
        expected: '<a href="http://test.com" class="aj-md-hyperlink">test</a>'
      }
    ]},
    {name: 'strong', cases: [
      {input: '**test**', expected: '<strong>test</strong>'},
      {input: '__test__', expected: '<strong>test</strong>'}
    ]},
    {name: 'emphasis', cases: [
      {input: '*test*', expected: '<em>test</em>'},
      {input: '_test_', expected: '<em>test</em>'}
    ]},
    {name: 'code', cases: [
      {input: '```test```', expected: '<code>test</code>'},
      {input: '`test`', expected: '<code>test</code>'}
    ]},
    {name: 'strike', cases: [
      {input: '~~test~~', expected: '<del>test</del>'}
    ]},
    {name: 'user', cases: [
      {input: '@notme', expected: '<span class="atMention">@notme</span>'},
      {input: '@test', expected: '<span class="atMention me">@test</span>'}
    ]},
    {name: 'issue 34',cases: [
      {
        input: "implementer [l'algo combineEventsWithTasks](https://gist.github.com/adrienjoly/96493349571e2d7166c558ac56fd4d8a) en différenciel => input: tableau d'events (CRUD sur un item), output: tableau d'ordres TableView (deletes, puis updates, puis inserts), cf [Calendar class](https://developer.apple.com/reference/foundation/calendar)",
        expected: "implementer <a href=\"https://gist.github.com/adrienjoly/96493349571e2d7166c558ac56fd4d8a\" class=\"aj-md-hyperlink\">l'algo combineEventsWithTasks</a> en différenciel => input: tableau d'events (CRUD sur un item), output: tableau d'ordres TableView (deletes, puis updates, puis inserts), cf <a href=\"https://developer.apple.com/reference/foundation/calendar\" class=\"aj-md-hyperlink\">Calendar class</a>"
      }
    ]},
    {name: 'issue 41', cases: [
      {input: '`*test*.sh`', expected: '<code>*test*.sh</code>'},
      {input: '`**test**.sh`', expected: '<code>**test**.sh</code>'},
      {input: '`./run_my_test_.sh`', expected: '<code>./run_my_test_.sh</code>'},
      {input: '`__init__.py`', expected: '<code>__init__.py</code>'}
    ]},
    {name: 'issue 43', cases: [
      {
        input: 'créer une landing page en suivant [ce guide](https://medium.com/@cliffordoravec/the-no-bs-approach-to-building-your-saas-startups-launch-list-part-2-of-the-epic-guide-to-8cc371be772c)',
        expected: 'créer une landing page en suivant <a href="https://medium.com/@cliffordoravec/the-no-bs-approach-to-building-your-saas-startups-launch-list-part-2-of-the-epic-guide-to-8cc371be772c" class="aj-md-hyperlink">ce guide</a>'
      }
    ]},
    {name: 'code and url', cases: [
      {
        input: '`wget http://test.com/`',
        expected: `<code>wget http://test.com/</code>`
      },
      {
        input: '[this site](http://test.com) not working with `wget`',
        expected: '<a href="http://test.com" class="aj-md-hyperlink">this site</a> not working with <code>wget</code>'
      }
    ]}
  ];

  tests.forEach(function(testCase) {
    describe(testCase.name, function() {
      testCase.cases.forEach(function(test) {
        // Reset this in case something goes wrong during the script run
        sandbox.returnValue = null;

        it('correctly handles ' + test.input, function() {
          var testScript = new vm.Script(
            'returnValue = renderMarkdown("' + test.input + '")'
          );
          testScript.runInContext(context);
          assert.equal(sandbox.returnValue, test.expected);
        });
      });
    });
  });
});
