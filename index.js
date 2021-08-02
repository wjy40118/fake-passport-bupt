const express = require('express')
const fs = require('fs');
const path = require('path')
const faker = require('faker/locale/zh_CN')
const basicAuth = require('express-basic-auth');
const app = express()
const port = process.env.PORT || 10985
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
  const currentYear = (new Date()).getFullYear()
  const randomYear = (Math.floor(Math.random() * 5) + currentYear - 4) * 1000000
  const randomId = Math.floor(Math.random() * 200000) + 100000
  return randomYear + randomId
}

let customAlert = ""

// read username and password for basic auth from environment variables
const authUsers = {}
process.env?.AUTH_USERNAME && (authUsers[process.env?.AUTH_USERNAME] = process.env?.AUTH_PASSWORD)

app.use(express.json())

app.get("/", (req, res) => {
  fs.readFile(path.join(__dirname, 'static', 'index.html'), function (err, data) {
    if (err) {
      res.sendStatus(404);
    } else {
      let htmlString = data.toString()
      const date = new Date(Date.now() + 8 * 60 * 60 * 1000)
      htmlString = htmlString
        .replace('__name__', req.query?.name || getRandomName())
        .replace('__school__', req.query?.school || getRandomSchool())
        .replace('__type__', req.query?.type || '入')
        .replace('__id__', req.query?.id || getRandomId())
        .replace('__time__', date.toISOString().replace("T", " ").slice(0, -5))
      customAlert && (htmlString = htmlString.replace('__alert__', customAlert))

      res.setHeader('Content-Type', 'text/html')
      res.send(htmlString);

      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
      console.log(`${date.toISOString()},${clientIp},${req.query?.name || ""},${req.query?.school || ""},${req.query?.type || ""},${req.query?.id || ""}`)
    }
  });
});

// add alert
app.post("/alert", basicAuth({ users: authUsers, challenge: true }), (req, res) => {
  if (!(customAlert = req?.body?.alert)) {
    res.status(400).send("Need field `alert` in the body!")
    return
  }
  res.status(201).send(`Created alert: ${customAlert}`)
})

// get alert
app.get("/alert", (req, res) => {
  res.status(200).send(customAlert || "No alerts set.")
})

// delete alert
app.delete("/alert", basicAuth({ users: authUsers, challenge: true }), (req, res) => {
  customAlert = ""
  res.status(204).send("Removed alert.")
})

app.use('/', staticRes)

app.listen(port, () => {
  console.log(`App listening at ${port}, basic auth user: ${Object.keys(authUsers)}`)
  console.log(`time,ip,name,school,type,id`)
})
