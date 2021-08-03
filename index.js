const express = require('express')
const fs = require('fs');
const path = require('path')
const faker = require('faker/locale/zh_CN')
const basicAuth = require('express-basic-auth');
const app = express()
const port = process.env.PORT || 10985
const staticRes = express.static('static')
const { createLogger, format, transports } = require('winston')
const logFilename = "logs/" + (process.env.LOG_FILENAME || "combined.log")
const lineReader = require('reverse-line-reader')

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'fake-passport-bupt' },
  transports: [
    new transports.File({ filename: logFilename })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }));
}

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

      logger.info({
        message: "new_request",
        ip: req.ip,
        username: req.query?.name,
        school: req.query?.school,
        type: req.query?.type,
        userId: req.query?.id,
        endpoint: req.path,
      })
    }
  });
});

// add alert
app.post("/alert", basicAuth({ users: authUsers, challenge: true }), (req, res) => {
  if (!(customAlert = req?.body?.alert)) {
    res.status(400).send("Need field `alert` in the body!")
    return
  }

  logger.info({
    message: "create_alert",
    ip: req.ip,
    content: customAlert,
    endpoint: req.path,
  })

  res.status(201).send(`Created alert: ${customAlert}`)
})

// get alert
app.get("/alert", (req, res) => {
  res.status(200).send(customAlert || "No alerts set.")
})

// delete alert
app.delete("/alert", basicAuth({ users: authUsers, challenge: true }), (req, res) => {
  logger.info({
    message: "remove_alert",
    ip: req.ip,
    content: customAlert,
    endpoint: req.path,
  })

  customAlert = ""

  res.status(204).send("Removed alert.")
})

app.get("/logs", basicAuth({ users: authUsers, challenge: true }), (req, res) => {
  const limit = req.query?.limit || 100
  const logs = []
  let lineRead = 0

  lineReader.eachLine(logFilename, (line, last) => {
    line && logs.push(line)
    lineRead++

    if (lineRead > limit) {
      return false
    }
  }).then(() => {
    logger.info({
      message: "get_log",
      ip: req.ip,
      amount: limit,
      endpoint: req.path,
    })
    res.status(200).send(logs)
  })
})

app.use('/', staticRes)

app.enable('trust proxy')

app.listen(port, () => {
  logger.info({
    message: 'server_start',
    serverPort: port,
    authUsers: Object.keys(authUsers)
  })
})
