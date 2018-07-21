const TelegramBot = require('node-telegram-bot-api');
const config = require('./config')
const _ = require('lodash')
const token = config.token;
const cron = require('node-cron')
const axios = require('axios')
const bot = new TelegramBot(token, {
    polling: true
})
const img_url = 'https://raw.githubusercontent.com/niawjunior/telegram-crypto-alert/master/welcome.png'
const firebase = require('firebase')
const firebase_config = config.firebase_config;
firebase.initializeApp(firebase_config);

async function main() {
    return await axios.get(`https://api.coinmarketcap.com/v2/ticker/?convert=THB&limit=50`)
}

bot.onText(/\/start/, (msg) => {
    bot.sendPhoto(msg.chat.id, img_url, {
        caption: "😍😍 ยินดีต้อนรับ 😍😍 \n "
    }).then(() => {
        var option = {
            "reply_markup": {
                "keyboard": [
                    ["เช็คราคา 🔎"],
                    ["Top 10 อันดับแรก 🚀"],
                    ["รับการแจ้งเตือน 💌"],
                    ["ยกเลิกการแจ้งเตือน ❌"]
                ]
            }
        }
        user_id = msg.from.id
        bot.sendMessage(msg.chat.id, "\n⚔️⚔️ สิ่งที่บอทสามารถทำได้ ⚔️⚔️\n\n 1. ตรวจสอบราคาของเหรียญสกุลต่างๆ (รองรับ 50 อันดับแรก) \n 2. Top 10 อันดับแรก \n 3. แจ้งเตือน ทุกๆ 10 นาที (รองรับ 50 อันดับแรก) \n\n", option)
    })
})

bot.on('message', (msg) => {
    const check_price = msg.text
    if (check_price.toString().indexOf('เช็คราคา 🔎') === 0) {
        bot.sendMessage(msg.chat.id, "พิมพ์ชื่อสกุลเหรียญที่ต้องการตรวจสอบ\n")
    }
})

bot.on('message', (msg) => {
    const symbol = (msg.text).toUpperCase()
    const input_name_upper = (msg.text).toUpperCase()
    main().then(data => {
        for (let i in data.data.data) {
            let symbol_upper = data.data.data[i].symbol
            let name = data.data.data[i].name
            let name_upper = (data.data.data[i].name).toUpperCase()

            if (symbol == symbol_upper || input_name_upper == name_upper) {
                let price_thb = data.data.data[i].quotes.THB.price
                let price_usd = data.data.data[i].quotes.USD.price
                let percent_change_24h = data.data.data[i].quotes.USD.percent_change_24h
                bot.sendMessage(msg.chat.id, `❤️❤️ ${symbol_upper} (${name}) ❤️❤️ \n\n THB = ${price_thb.toLocaleString()} \n USD = ${price_usd} \n Change(24) = ${percent_change_24h}%`)
            }
        }
    })
})

bot.on('message', (msg) => {
    const rank = msg.text
    if (rank.toString().indexOf('Top 10 อันดับแรก 🚀') === 0) {
        var data_rank = []
        main().then(data => {
            for (let i in data.data.data) {
                data_rank.push({
                    rank: data.data.data[i].rank,
                    name: data.data.data[i].name,
                    thb: data.data.data[i].quotes.THB.price,
                    usd: data.data.data[i].quotes.USD.price,
                    percent_change_24h: data.data.data[i].quotes.USD.percent_change_24h
                })
            }
        }).then(() => {
            data_rank = _.orderBy(data_rank, ['rank'], ['asc'])
            data_rank.splice(-40)
            var table = ''
            data_rank.map(item => {
                var price_thb = Number(item.thb).toFixed(0)
                var price_usd = Number(item.usd).toFixed(2)
                if (item.rank == 1) {
                    var icon = '🥇'
                } else if (item.rank == 2) {
                    var icon = '🥈'
                } else if (item.rank == 3) {
                    var icon = '🥉'
                } else {
                    var icon = '🎗'
                }
                if (item.percent_change_24h.toString().charAt(0) == '-') {
                    var icon_percent = '🔻'
                } else {
                    var icon_percent = '🔺'
                }
                return table += `${item.rank}. ${icon} ${item.name} THB: ${price_thb.toLocaleString()} บาท USD: ${price_usd.toLocaleString()} ดอลลาร์ Change(24h): ${item.percent_change_24h}% ${icon_percent} \n\n`
            })
            bot.sendMessage(msg.chat.id, `\n ${table} \n`)
        })
    }
})

bot.on('message', (msg) => {
    const set_time = msg.text
    if (set_time.toString().indexOf('รับการแจ้งเตือน 💌') === 0) {
        bot.sendMessage(msg.chat.id, "\n พิมพ์เครื่องหมาย / แล้วตามด้วยชื่อเหรียญที่ต้องการ (ยกตัวอย่างเช่น /btc หรือ /Bitcoin) \n")
    }
})
bot.on('message', (msg) => {
    const input_coin = msg.text
    if (input_coin.toString().charAt(0) === '/' && input_coin.toString().includes('/start') === false) {

        let coin = (msg.text.substr(1)).toUpperCase()
        main().then((data) => {
            var coin_name = []
            var coin_symbol = []
            for (let i in data.data.data) {
                const name = (data.data.data[i].name).toUpperCase()
                const symbol = (data.data.data[i].symbol).toUpperCase()
                coin_name.push(name)
                coin_symbol.push(symbol)
            }

            if (coin_name.includes(coin) === true || coin_symbol.includes(coin) === true) {
                firebase.database().ref('Users').child(msg.from.id).update({
                    updated_At: Date.now(),
                    telegram_id: msg.from.id,
                    status: true,
                    coin: coin
                }).then(() => {
                    bot.sendMessage(msg.chat.id, `\n สมัครรับการแจ้งเตือนราคา ${coin} แล้ว 🎉\n`)
                })
            } else {
                bot.sendMessage(msg.chat.id, `\n ไม่พบเหรียญที่คุณต้องการ กรุณาลองใหม่อีกครั้ง \n`)
            }
        })
    }
})

bot.on('message', (msg) => {
    const set_cancel = msg.text
    if (set_cancel.toString().indexOf('ยกเลิกการแจ้งเตือน ❌') === 0) {
        firebase.database().ref('Users').child(msg.from.id).update({
            updated_At: Date.now(),
            telegram_id: msg.from.id,
            status: false
        }).then(() => {
            bot.sendMessage(msg.chat.id, "\n ยกเลิกรับการแจ้งเตือนแล้ว \n")
            get_profile(msg.from.id)
        })
    }
})

cron.schedule('0 */10 * * * * ', function () {
    firebase.database().ref('Users').on('child_added', snap => {
        if (snap.val().status === true) {
            const id = snap.val().telegram_id
            const select_coin = snap.val().coin
            main().then(data => {
                for (let i in data.data.data) {
                    const name = (data.data.data[i].name).toUpperCase()
                    const symbol = (data.data.data[i].symbol).toUpperCase()
                    if (select_coin === name || select_coin === symbol) {
                        let price_thb = data.data.data[i].quotes.THB.price
                        let price_usd = data.data.data[i].quotes.USD.price
                        let percent_change_24h = data.data.data[i].quotes.USD.percent_change_24h
                        bot.sendMessage(id, `🔔 ${symbol} (${name}) 🔔 \n\n THB = ${price_thb.toLocaleString()} บาท \n USD = ${price_usd.toLocaleString()} ดอลลาร์ \n Change(24) = ${percent_change_24h}%`)
                    }
                }
            })
        }
    })
})