const http = require('http');
const express = require('express');
const app = express();

app.use(express.static('public'));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  next();
});

app.get("/", (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(__dirname + '/public/index.html');
});

app.use("/lit/", express.static('node_modules/lit-html'));

app.get("/feed", (req, res) => {
  res.set('Content-Type', 'text/xml');
  const httpReq = http.request('http://feeds.feedburner.com/Http203Podcast', (httpRes) => {
    res.status(httpRes.statusCode);
    httpRes.pipe(res);
  });
  
  httpReq.on('error', (e) => {
    res.status(500).end();
  });
  
  httpReq.end();
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
