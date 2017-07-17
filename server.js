// server.js
// where your node app starts

// init project
const express = require('express');
const app = express();

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

app.get("/sw.js", function (request, response) {
  response.set('Cache-Control', 'no-cache');
  response.sendFile(__dirname + '/public/sw.js');
});

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  if (!request.get('X-Forwarded-Proto').includes('https')) {
    response.redirect(301, 'https://f1-start.glitch.me');
    return;
  }
  response.set('Cache-Control', 'no-cache');
  response.sendFile(__dirname + '/views/index.html');
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
