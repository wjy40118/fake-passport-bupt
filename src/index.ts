import {Application} from "express";
import {Config}      from "./types";

require('dotenv').config()

const express                              = require('express')
const fs                                   = require('fs');
const path                                 = require('path')
const faker                                = require('faker/locale/zh_CN')
const basicAuth                            = require('express-basic-auth');
const {createLogger, format, transports}   = require('winston')
const lineReader                           = require('reverse-line-reader')
const logFilename                          = "logs/" + (process.env.LOG_FILENAME || "combined.log")
const configFilename                       = "config/" + (process.env.CONFIG_FILENAME || "config.json")
const port                                 = process.env.PORT || 10985
const app: Application                     = express()
const staticRes                            = express.static('static')
const authUsers: { [key: string]: string } = {}
let config: Config

const writeConfig = () => {
  fs.writeFile(path.join(__dirname, "..", configFilename), JSON.stringify(config, null, 4), err => {
    if (err) {
      logger.error({
        message: "save_config_error",
        filename: configFilename,
        content: config
      })
    }
  })
}

const init = () => {
  fs.readFile(path.join(__dirname, "..", configFilename), function (err, data) {
    if (err) {
      throw new Error("Unable to load config file: " + configFilename)
    } else {
      const configString = data.toString()

      config = JSON.parse(configString)

      logger.info({
        message: "load_config",
        content: config
      })
    }
  });
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
  const randomYear  = (Math.floor(Math.random() * 5) + currentYear - 4) * 1000000
  const randomId    = Math.floor(Math.random() * 200000) + 100000
  return randomYear + randomId
}


init()

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss.SSS"
    }),
    format.errors({stack: true}),
    format.splat(),
    format.json()
  ),
  defaultMeta: {service: 'fake-passport-bupt'},
  transports: [
    new transports.File({filename: logFilename})
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


// read username and password for basic auth from environment variables
process.env?.AUTH_USERNAME && (authUsers[process.env.AUTH_USERNAME] = process.env?.AUTH_PASSWORD)


app.use(express.json())


app.get("/", (req, res) => {
  // if anonymous access is disabled
  if (!config?.isAnonymousAccessEnabled) {
    // if not all the fields are provided
    if (!req.query?.name ||
      !req.query?.school ||
      !req.query?.id) {
      logger.info({
        message: "request_refused",
        reason: "incomplete identity",
        ip: req.ip,
        username: req.query?.name,
        school: req.query?.school,
        type: req.query?.type,
        userId: req.query?.id,
        endpoint: req.path,
      })

      return res.status(400).send("400 Bad Request. Identity not complete.")
    }
    // if white list is enabled
    if (config?.isWhitelistEnabled && !config?.whitelist.includes(req.query?.name.toString())) {
      logger.info({
        message: "request_refused",
        reason: "name not in whitelist",
        ip: req.ip,
        username: req.query?.name,
        school: req.query?.school,
        type: req.query?.type,
        userId: req.query?.id,
        endpoint: req.path,
      })

      return res.status(400).send("403 Forbidden")
    }
  }


  fs.readFile(path.join(__dirname, "..", 'static', 'index.html'), function (err, data) {
    if (err) {
      res.sendStatus(404);
    } else {
      let htmlString = data.toString()
      const date     = new Date(Date.now() + 8 * 60 * 60 * 1000)
      htmlString     = htmlString
        .replace('__name__', req.query?.name || (config?.isRandomIdentityEnabled ? getRandomName() : "<请填写姓名>"))
        .replace('__school__', req.query?.school || (config?.isRandomIdentityEnabled ? getRandomSchool() : "<请填写学院>"))
        .replace('__type__', req.query?.type || (config?.isRandomIdentityEnabled ? '入' : "<请填写出入校类型>"))
        .replace('__id__', req.query?.id || (config?.isRandomIdentityEnabled ? getRandomId() : "<请填写学号>"))
        .replace('__time__', date.toISOString().replace("T", " ").slice(0, -5))
      config?.alert && (htmlString = htmlString.replace('__alert__', config?.alert))

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

app.get("/index.html", (req, res) => {
  return res.status(400).send("403 Forbidden")
})


// add alert
app.post("/config/alert", basicAuth({users: authUsers, challenge: true}), (req, res) => {
  if (!req?.body?.alert) {
    res.status(400).send("Need field `alert` in the body!")
    return
  }

  config.alert = req?.body?.alert

  res.status(201).send(`Created alert: ${config.alert}`)

  logger.info({
    message: "create_alert",
    ip: req.ip,
    content: config.alert,
    endpoint: req.path,
  })

  writeConfig()
})


// delete alert
app.delete("/config/alert", basicAuth({users: authUsers, challenge: true}), (req, res) => {

  if (!config.alert) {
    res.status(204).send("No alerts to remove.")
    return
  }

  config.alert = ""

  res.status(204).send("Removed alert.")

  logger.info({
    message: "remove_alert",
    ip: req.ip,
    content: config.alert,
    endpoint: req.path,
  })

  writeConfig()
})


// enable/disable random info generation
app.put("/config/random-identity", basicAuth({users: authUsers, challenge: true}), (req, res) => {
  const enabled = req?.body?.enabled

  if (enabled === undefined) {
    res.status(400).send("Field `enabled` is not present.")
    return
  }

  if (config.isRandomIdentityEnabled === enabled) {
    res.status(200).send(`Already ${enabled ? "enabled" : "disabled"}`)
    return
  }

  config.isRandomIdentityEnabled = enabled

  res.status(201).send(`${enabled ? "Enabled" : "Disabled"} random identity.`)

  logger.info({
    message: "edit_random_identity",
    ip: req.ip,
    enabled: enabled,
    endpoint: req.path,
  })

  writeConfig()
})

// enable/disable anonymous access
app.put("/config/anonymous-access", basicAuth({users: authUsers, challenge: true}), (req, res) => {
  const enabled = req?.body?.enabled

  if (enabled === undefined) {
    res.status(400).send("Field `enabled` is not present.")
    return
  }

  if (config.isAnonymousAccessEnabled === enabled) {
    res.status(200).send(`Already ${enabled ? "enabled" : "disabled"}`)
    return
  }

  config.isAnonymousAccessEnabled = enabled

  res.status(201).send(`${enabled ? "Enabled" : "Disabled"} anonymous access.`)

  logger.info({
    message: "edit_anonymous_access",
    ip: req.ip,
    enabled: enabled,
    endpoint: req.path,
  })

  writeConfig()
})

app.post("/config/whitelist", basicAuth({users: authUsers, challenge: true}), (req, res) => {
  if (!(req.body?.whitelist instanceof Array) || req.body?.enabled === undefined) {
    res.status(400).send("Invalid request fields.")
    return
  }

  config.isWhitelistEnabled = req.body.enabled
  config.whitelist = req.body.whitelist as string[]

  res.status(201).send({
    whitelist: config.whitelist,
    enabled: config.isWhitelistEnabled
  })

  logger.info({
    message: "edit_whitelist",
    ip: req.ip,
    enabled: config.isWhitelistEnabled,
    content: config.whitelist,
    endpoint: req.path,
  })

  writeConfig()
})

app.put("/config/whitelist", basicAuth({users: authUsers, challenge: true}), (req, res) => {
  if (!(req.body?.whitelist instanceof Array)) {
    res.status(400).send("Invalid field `whitelist`")
    return
  }

  (req.body.whitelist as string[]).forEach(item => {
    if (config.whitelist.includes(item)) {
      return
    }
    
    config.whitelist.push(item)
  })

  res.status(201).send(config.whitelist)


  logger.info({
    message: "append_whitelist",
    ip: req.ip,
    content: req.body.whitelist,
    endpoint: req.path,
  })

  writeConfig()
})

// get config
app.get("/config", basicAuth({users: authUsers, challenge: true}), (req, res) => {
  res.status(200).send(config)
})


app.get("/logs", basicAuth({users: authUsers, challenge: true}), (req, res) => {
  const limit  = +req.query?.limit
  const logs   = []
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
















