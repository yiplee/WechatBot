const {
  Wechaty,
  config,
  Friendship
} = require("wechaty")

const bot = new Wechaty({
  profile: config.default.DEFAULT_PROFILE
})

var moment = require('moment')
var momentDurationFormatSetup = require('moment-duration-format')
momentDurationFormatSetup(moment)

var redis = require("redis")
var sub = redis.createClient()
var pub = redis.createClient()

bot
  .on("scan", (url, code) => {
    if (!/201|200/.test(String(code))) {
      const loginUrl = url.replace(/\/qrcode\//, "/l/");
      require("qrcode-terminal").generate(loginUrl)
    }
  })

  .on("login", user => {
    console.log(`${user} login`)
    bot.userSelf()

    sub.on("message", async function (channel, message) {
      let reply = JSON.parse(message);
      if (reply.msg) {
        var receiver = null;
        if (reply.room) {
          receiver = await bot.Room.find({
            topic: reply.room
          });
        } else if (reply.user) {
          receiver = await bot.Contact.find({
            name: reply.user
          });
        }

        if (receiver) {
          receiver.say(reply.msg)
        }
      }
    });

    sub.subscribe("reply");
  })

  .on("friendship", async friendship => {
    try {
      if (friendship.type() == Friendship.Type.Receive && friendship.hello() == "yiplee") {
        await friendship.accept();
      }
    } catch (e) {
      console.error(e)
    }
  })

  .on("message", async m => {
    if (m.self() || m.type() != bot.Message.Type.Text) {
      return;
    }

    const payload = {
      user: m.from().name(),
      msg: m.text(),
      mention: await m.mentionSelf()
    };

    const room = m.room();
    if (room) {
      payload.room = await room.topic()
    } else if (payload.msg == "ping") {
      const time = process.uptime()
      self = bot.userSelf()
      m.say("wechat bot: " + self.name() + "\nuptime: " + moment.duration(time, "seconds").format())
    }

    pub.publish("reply", JSON.stringify(payload))
  })

  .start()
  .catch(async e => {
    console.error("Bot start() fail:", e)
    await bot.stop()
    process.exit(-1)
  })