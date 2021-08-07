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
let isRandomIdentityEnabled = (process.env.RANDOM_INFO === "true")
let customAlert = ""


const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss.SSS"
    }),
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
        .replace('__name__', req.query?.name || (isRandomIdentityEnabled ? getRandomName() : "<请填写姓名>"))
        .replace('__school__', req.query?.school || (isRandomIdentityEnabled ? getRandomSchool() : "<请填写学院>"))
        .replace('__type__', req.query?.type || (isRandomIdentityEnabled ? '入' : "<请填写出入校类型>"))
        .replace('__id__', req.query?.id || (isRandomIdentityEnabled ? getRandomId() : "<请填写学号>"))
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


// enable/disable random info generation
app.put("/random-identity", basicAuth({ users: authUsers, challenge: true }), (req, res) => {
  const enabled = req?.body?.enabled

  if (enabled === undefined) {
    res.status(400).send("Field `enabled` is not present.")
    return
  }

  logger.info({
    message: enabled ? "enable_random_identity" : "disable_random_identity",
    ip: req.ip,
    content: customAlert,
    endpoint: req.path,
  })

  isRandomIdentityEnabled = enabled

  res.status(201).send(`${enabled ? "Enabled" : "Disabled"} random identity.`)
})

// get config
app.get("/config", (req, res) => {
  const response = {
    randomIdentity: isRandomIdentityEnabled,
    alert: customAlert
  }

  res.status(200).send(response)
})


app.get("/logs", basicAuth({ users: authUsers, challenge: true }), (req, res) => {
  const limit = req.query?.limit
  const logs = []
  let lineRead = 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  lineReader.eachLine(logFilename, (line, last) => {
    if (!line) {
      return true
    }

    const lineParsed = JSON.parse(line)

    if (limit) {
      lineRead++
      if (lineRead > limit) {
        return false
      }
    } else {
      if ((new Date(lineParsed.timestamp)).getTime() < today.getTime()) {
        return false
      }
    }

    logs.push(lineParsed)
  }).then(() => {
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
