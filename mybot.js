const { Wechaty, Room, Contact, config } = require('wechaty')

bot = Wechaty.instance({ profile: config.default.DEFAULT_PROFILE })

bot
	.on('scan', (url, code) => {
		if (!/201|200/.test(String(code))) {
			const loginUrl = url.replace(/\/qrcode\//, '/l/')
			require('qrcode-terminal').generate(loginUrl)
		}
	})

	.on('login', (user) => {
        console.log(`${user} login`)
        
        var amqp = require('amqplib/callback_api')
        amqp.connect('amqp://localhost', function(err, conn) {
            conn.createChannel(function(err, ch) {
            var q = 'stargazers'
            ch.assertQueue(q, {durable: false})
            ch.consume(q, async function(msg) {
                let obj = JSON.parse(msg.content.toString())
                let name = obj.name
                let content = obj.msg
                if (name.length > 0 && content.length > 0) {
                    let receiver = await Contact.find({name:name})
                    if (receiver) {
                        receiver.say(content)
                    }
                }
            }, {noAck: true})})
        })
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

		if (m.self()) {
			return
		}

		if (/ping/.test(content)) {
			m.say("pong")
		}
	})

    .start()
    .catch(e => console.error(e))
