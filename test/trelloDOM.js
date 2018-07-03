/* global describe, it */

var fs = require('fs')
var vm = require('vm')
var assert = require('assert')
var test = require('./testEnvironment.js')

// Load the mocked broswer document with the card HTML we expect to see
var myDiv = test.document.createElement('div')
myDiv.innerHTML = fs.readFileSync('test/expectedList.html')
test.document.body.appendChild(myDiv)

// Set up and run our test cases
describe('getCardElementByShortUrl', function () {
  it('returns undefined if URL does not exist', function () {
    var testScript = new vm.Script(
      'returnValue = getCardElementByShortUrl("https://trello.com/c/invalid")'
    )
    testScript.runInContext(test.context)
    assert.equal(test.sandbox.returnValue, null)
  })

  it('returns card element if URL does exist', function () {
    var testScript = new vm.Script(
      'returnValue = getCardElementByShortUrl("https://trello.com/c/1234")'
    )
    testScript.runInContext(test.context)
    assert.equal(test.sandbox.returnValue instanceof test.window.HTMLSpanElement, true)
  })
})

describe('getCardUrlFromTitleElement', function () {
  it('gets the correct URL', function () {
    var testScript = new vm.Script(
      'var titleElement = document.getElementsByClassName("list-card-title")[0];' +
      'returnValue = getCardUrlFromTitleElement(titleElement)'
    )
    testScript.runInContext(test.context)
    assert.equal(test.sandbox.returnValue, '/c/1234/1-test-1')
  })
})

describe('elementIsTrelloCard', function () {
  it('returns false for non-card', function () {
    var testScript = new vm.Script(
      'returnValue = elementIsTrelloCard(document.body)'
    )
    testScript.runInContext(test.context)
    assert.equal(test.sandbox.returnValue, false)
  })

  it('returns false for inactive card', function () {
    var testScript = new vm.Script(
      'var card = document.getElementsByClassName("list-card")[0];' +
      'returnValue = elementIsTrelloCard(card)'
    )
    testScript.runInContext(test.context)
    assert.equal(test.sandbox.returnValue, false)
  })

  it('returns true for active card', function () {
    var testScript = new vm.Script(
      'var card = document.getElementsByClassName("list-card")[1];' +
      'returnValue = elementIsTrelloCard(card)'
    )
    testScript.runInContext(test.context)
    assert.equal(test.sandbox.returnValue, true)
  })

  it('returns true for active card with cover', function () {
    var testScript = new vm.Script(
      'var card = document.getElementsByClassName("list-card")[2];' +
      'returnValue = elementIsTrelloCard(card)'
    )
    testScript.runInContext(test.context)
    assert.equal(test.sandbox.returnValue, true)
  })
})
