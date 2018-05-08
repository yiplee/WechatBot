// import { Wechaty, Room, Contact, config, Message } from "wechaty"
const { Wechaty, Room ,Contact, config, Message, MsgType} = require('wechaty')

bot = Wechaty.instance({ profile: config.default.DEFAULT_PROFILE })

var open = require('amqplib').connect('amqp://localhost');

bot
	.on('scan', (url, code) => {
		if (!/201|200/.test(String(code))) {
			const loginUrl = url.replace(/\/qrcode\//, '/l/')
			require('qrcode-terminal').generate(loginUrl)
		}
	})

	.on('login', (user) => {
        console.log(`${user} login`)

        open.then(function(conn) {
            return conn.createChannel();
          }).then(function(ch) {
            let q = "wechat_send"
            return ch.assertQueue(q,{durable: false}).then(function(ok) {
              return ch.consume(q, async function(msg) {
                if (msg !== null) {
                    let obj = JSON.parse(msg.content.toString())
                    let content = obj.msg
                    let from = obj.from
                    let room = obj.room

                    if (content) {
                        if (room) {
                            let receiver = await Room.find({topic:room})
                            if (receiver) {
                                receiver.say(content)
                            }
                        } else if (from) {
                            let receiver = await Contact.find({name:from})
                            if (receiver) {
                                receiver.say(content)
                            }
                        } 
                    }
                    ch.ack(msg)
                }
              });
            });
          }).catch(console.warn);
	})

	.on('friend', async function (contact, request) {
		if (request) {
			await request.accept()
		}
	})

	.on('message', (m) => {
		const contact = m.from()
		const content = m.content()
		const room = m.room()

		if (m.self() || m.type() != MsgType.TEXT) {
			return
        }
        
        const payload = {
            "msg":content,
            "from":contact.name(),
        }

        if (room) {
            payload.room = room.topic()
        }

        message = JSON.stringify(payload)
        console.log(message)

        open.then(function(conn) {
            return conn.createChannel()
        }).then(function(ch) {
            let q = "wechat_get"
            return ch.assertQueue(q,{durable: false}).then(function(ok) {
              return ch.sendToQueue(q, new Buffer.from(message,'utf-8'))
            })
        }).catch(console.warn)
	})

    .start()
    .catch(e => console.error(e))
