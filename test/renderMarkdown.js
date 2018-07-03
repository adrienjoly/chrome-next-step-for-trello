/* global describe, it */

var vm = require('vm')
var assert = require('assert')
var test = require('./testEnvironment.js')

// Mock the getUserName function
var mockGetUserName = 'getUserName = function () { return "test"; }'
const mockGetUserNameScript = new vm.Script(mockGetUserName)
mockGetUserNameScript.runInContext(test.context)

// Set up and run our test cases
describe('renderMarkdown', function () {
  var tests = [
    {name: 'url',
      cases: [
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
    {name: 'markdown link',
      cases: [
        {
          input: '[test](http://test.com)',
          expected: '<a href="http://test.com" class="aj-md-hyperlink">test</a>'
        }
      ]},
    {name: 'strong',
      cases: [
      {input: '**test**', expected: '<strong>test</strong>'},
      {input: '__test__', expected: '<strong>test</strong>'}
      ]},
    {name: 'emphasis',
      cases: [
      {input: '*test*', expected: '<em>test</em>'},
      {input: '_test_', expected: '<em>test</em>'}
      ]},
    {name: 'code',
      cases: [
      {input: '```test```', expected: '<code>test</code>'},
      {input: '`test`', expected: '<code>test</code>'}
      ]},
    {name: 'strike',
      cases: [
      {input: '~~test~~', expected: '<del>test</del>'}
      ]},
    {name: 'user',
      cases: [
      {input: '@notme', expected: '<span class="atMention">@notme</span>'},
      {input: '@test', expected: '<span class="atMention me">@test</span>'}
      ]},
    {name: 'issue 34',
      cases: [
        {
          input: "implementer [l'algo combineEventsWithTasks](https://gist.github.com/adrienjoly/96493349571e2d7166c558ac56fd4d8a) en différenciel => input: tableau d'events (CRUD sur un item), output: tableau d'ordres TableView (deletes, puis updates, puis inserts), cf [Calendar class](https://developer.apple.com/reference/foundation/calendar)",
          expected: "implementer <a href=\"https://gist.github.com/adrienjoly/96493349571e2d7166c558ac56fd4d8a\" class=\"aj-md-hyperlink\">l'algo combineEventsWithTasks</a> en différenciel => input: tableau d'events (CRUD sur un item), output: tableau d'ordres TableView (deletes, puis updates, puis inserts), cf <a href=\"https://developer.apple.com/reference/foundation/calendar\" class=\"aj-md-hyperlink\">Calendar class</a>"
        }
      ]},
    {name: 'issue 41',
      cases: [
      {input: '`*test*.sh`', expected: '<code>*test*.sh</code>'},
      {input: '`**test**.sh`', expected: '<code>**test**.sh</code>'},
      {input: '`./run_my_test_.sh`', expected: '<code>./run_my_test_.sh</code>'},
      {input: '`__init__.py`', expected: '<code>__init__.py</code>'}
      ]},
    {name: 'issue 43',
      cases: [
        {
          input: 'créer une landing page en suivant [ce guide](https://medium.com/@cliffordoravec/the-no-bs-approach-to-building-your-saas-startups-launch-list-part-2-of-the-epic-guide-to-8cc371be772c)',
          expected: 'créer une landing page en suivant <a href="https://medium.com/@cliffordoravec/the-no-bs-approach-to-building-your-saas-startups-launch-list-part-2-of-the-epic-guide-to-8cc371be772c" class="aj-md-hyperlink">ce guide</a>'
        }
      ]},
    {name: 'code and url',
      cases: [
        {
          input: '`wget http://test.com/`',
          expected: `<code>wget http://test.com/</code>`
        },
        {
          input: '[this site](http://test.com) not working with `wget`',
          expected: '<a href="http://test.com" class="aj-md-hyperlink">this site</a> not working with <code>wget</code>'
        }
      ]},
    {name: 'greedy matching',
      cases: [
      {input: '*test1* and *test2*', expected: '<em>test1</em> and <em>test2</em>'},
      {input: '_test1_ and _test2_', expected: '<em>test1</em> and <em>test2</em>'},
      {input: '**test1** and **test2**', expected: '<strong>test1</strong> and <strong>test2</strong>'},
      {input: '__test1__ and __test2__', expected: '<strong>test1</strong> and <strong>test2</strong>'},
      {input: '~~test1~~ and ~~test2~~', expected: '<del>test1</del> and <del>test2</del>'},
      {input: '`test1` and `test2`', expected: '<code>test1</code> and <code>test2</code>'},
      {input: '```test1``` and ```test2```', expected: '<code>test1</code> and <code>test2</code>'},
        {
          input: '[url1](http://url1.com) and [url2](http://url2.com)',
          expected: '<a href="http://url1.com" class="aj-md-hyperlink">url1</a> and <a href="http://url2.com" class="aj-md-hyperlink">url2</a>'}
      ]}
  ]

  tests.forEach(function (testCase) {
    describe(testCase.name, function () {
      testCase.cases.forEach(function (testCase) {
        // Reset this in case something goes wrong during the script run
        test.sandbox.returnValue = null

        it('correctly handles ' + testCase.input, function () {
          var testScript = new vm.Script(
            'returnValue = renderMarkdown("' + testCase.input + '")'
          )
          testScript.runInContext(test.context)
          assert.equal(test.sandbox.returnValue, testCase.expected)
        })
      })
    })
  })
})
