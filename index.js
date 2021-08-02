const express   = require('express')
const fs        = require('fs');
const path      = require('path')
const app       = express()
const port      = process.env.PORT || 10985
const staticRes = express.static('static')

app.get("/", function (req, res) {
  fs.readFile(path.join(__dirname, 'static', 'index.html'), function (err, data) {
    if (err) {
      res.sendStatus(404);
    } else {
      let htmlString = data.toString()
      const date     = new Date(Date.now() + 8 * 60 * 60 * 1000)
      htmlString     = htmlString
        .replace('__name__', req.query?.name || '吴铭实')
        .replace('__school__', req.query?.school || '计算机学院（国家示范性软件学院）')
        .replace('__type__', req.query?.type || '入')
        .replace('__id__', req.query?.id || '2019211915')
        .replace('__time__', date.toISOString().replace("T", " ").slice(0, -5))
      res.setHeader('Content-Type', 'text/html')
      res.send(htmlString);
    }
  });
});

app.use('/', staticRes)


app.listen(port, () => {
  console.log(`App listening at ${port}`)
})
