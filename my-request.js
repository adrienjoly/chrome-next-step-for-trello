check a checklist item

fetch(
'https://trello.com/1/cards/5803b13f1dfb52d879ffa12d/checklist/580e0b72c9ad8d91d813f5cf/checkItem/5803b1a0163254022fe9c662'
, {
method: 'PUT',
credentials: 'include',
body: 'state=complete' //new FormData(document.getElementById('comment-form'))
})

var body = new FormData();
body.append('state', 'complete');
body.append('token', token.split('=').pop());
fetch(
'https://trello.com/1/cards/5803b13f1dfb52d879ffa12d/checklist/580e0b72c9ad8d91d813f5cf/checkItem/5803b1a0163254022fe9c662'
, {
method: 'PUT',
credentials: 'include',
body: body
})

var urlEncodedData = 'state=complete&' + token.trim();
fetch(
'https://trello.com/1/cards/5803b13f1dfb52d879ffa12d/checklist/580e0b72c9ad8d91d813f5cf/checkItem/5803b1a0163254022fe9c662'
, {
  method: 'PUT',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': urlEncodedData.length
  },
  body: urlEncodedData
})
