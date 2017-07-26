const express = require('express');
const app = express();

app.use(express.static('public'));

app.use((req, res, next) => {
  // Forward to HTTPS
  if (!req.get('X-Forwarded-Proto').includes('https')) {
    // TODO: fix this
    //res.redirect(301, 'https://f1-start.glitch.me');
    return;
  }
  res.set('Cache-Control', 'no-cache');
  next();
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
