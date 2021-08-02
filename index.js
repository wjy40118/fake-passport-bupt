const express   = require('express')
const fs        = require('fs');
const path      = require('path')
const faker     = require('faker/locale/zh_CN')
const app       = express()
const port      = process.env.PORT || 10985
const staticRes = express.static('static')

const schoolList = [
  '信息与通信工程学院',
  '电子工程学院',
  '计算机学院（国家示范性软件学院）',
  '网络空间安全学院',
  '人工智能学院',
  '现代邮政学院（自动化学院）',
  '经济管理学院',
  '理学院',
  '人文学院',
  '数字媒体与设计艺术学院',
  '马克思主义学院',
  '国际学院'
]

const getRandomSchool = () => {
  const randomIndex = Math.floor(Math.random() * schoolList.length)
  return schoolList[randomIndex]
}

const getRandomName = () => {
  return faker.name.lastName() + faker.name.firstName()
}

const getRandomId = () => {
  // 2019 2119 15
  const currentYear = (new Date()).getFullYear()
  const randomYear = Math.floor(Math.random() * (currentYear - 2016)) * 1000000 + 2017000000
  const randomId = Math.floor(Math.random() * 200000) + 100000
  return randomYear + randomId
}

app.get("/", function (req, res) {
  fs.readFile(path.join(__dirname, 'static', 'index.html'), function (err, data) {
    if (err) {
      res.sendStatus(404);
    } else {
      let htmlString = data.toString()
      const date     = new Date(Date.now() + 8 * 60 * 60 * 1000)
      htmlString     = htmlString
        .replace('__name__', req.query?.name || getRandomName())
        .replace('__school__', req.query?.school || getRandomSchool())
        .replace('__type__', req.query?.type || '入')
        .replace('__id__', req.query?.id || getRandomId())
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
