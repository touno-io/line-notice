const express = require('express')
const querystring = require('querystring')
const bodyParser = require('body-parser')
const sdk = require('@line/bot-sdk')
const request = require('request-promise')
const port = process.env.PORT || 4000
const app = express()
 
const client = require('./bot-client')

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
 
// parse application/json
app.use(bodyParser.json())

app.put('/:bot/:to?', async (req, res) => {
  let { bot, to } = req.params
  try {
    if (!client[bot]) throw new Error('LINE API bot is undefined.')
    if (client[bot].party !== 'slack') {
      if (!req.body.type) throw new Error('LINE API fail formatter.')
      
      let { channelAccessToken, channelSecret } = client[bot]
      if (!channelAccessToken || !channelSecret) throw new Error('LINE Channel AccessToken is undefined.')
      
      const line = new sdk.Client({ channelAccessToken, channelSecret })
      if (!/^[RUC]{1}/g.test(to)) {
        await line.replyMessage(to, req.body)
      } else {
        await line.pushMessage(to, req.body)
      }
    } else {
      let { hooks } = client[bot]
      if (!hooks) throw new Error('Slack Hooks API is undefined.')
      let result = await request({ url: hooks, method: 'POST', body: req.body, json: true })
      if (result !== 'ok') throw new Error(result)
    }
    res.json({ error: null })
  } catch (ex) {
    console.error(ex.message)
    res.json({ error: ex.message || ex.toString(), type: req.body.type })
  } finally {
    res.end()
  }
})

app.post('/:bot', async (req, res) => {
  let { bot } = req.params
  let { events } = req.body
  if (!events) return res.end()
  try {
    if (!client[bot]) throw new Error('LINE API bot is undefined.')
    let { onEvents, onCommands, onPostBack, channelAccessToken, channelSecret } = client[bot]
    if (!channelAccessToken || !channelSecret) throw new Error('LINE Channel AccessToken is undefined.')

    const line = new sdk.Client({ channelAccessToken, channelSecret })
    const lineSenderObj = msg => typeof msg === 'string' ? { type: 'text', text: msg } : typeof msg === 'function' ? msg() : msg
    const linePushId = ({ source }) => source.type === 'room' ? source.roomId : source.type === 'group' ? source.groupId : source.userId
    const lineMessage = async (e, sender) => {
      if (!sender) return

      if (typeof e === 'string') {
        await line.pushMessage(e, lineSenderObj(sender))
      } else if (e.replyToken) {
        await line.replyMessage(e.replyToken, lineSenderObj(sender))
      } else {
        await line.pushMessage(linePushId(e), lineSenderObj(sender))
      }
    }

    if (events.length > 0) {
      for (const e of events) {
        // console.log(e)
        if (e.type === 'message' && e.message.type === 'text') {
          let { text } = e.message
          let { groups } = /^\/(?<name>[-_a-zA-Z]+)(?<arg>\W.*|)/ig.exec(text) || {}
          // console.log(!groups, groups.name, !onCommands[groups.name])
          if (!e.replyToken || !groups || !onCommands[groups.name]) continue
          let result = await onCommands[groups.name].call(this, groups.arg.split(' '), e, line)
          await lineMessage(e, result)
        } else if (typeof onEvents[e.type] === 'function') {
          let result = await onEvents[e.type].call(this, e, line)
          await lineMessage(e, result)
        } else if (e.type === 'postback') {
          let data = querystring.parse(e.postback.data)
          if (!!data.func) {
            if (!onPostBack[data.func]) continue
            let result = await onPostBack[data.func].call(this, e, data, line)
            await lineMessage(e, result)
          } else {
            console.log(data, e)
          }
        } else {
          console.log('e: ', e)
        }
      }
    } else {
      console.log('events: ', events)
    }
  } catch (ex) {
    console.log(ex.statusCode === 400 ? ex.statusMessage :  ex)
  } finally {
    res.end()
  }
  // U9e0a870c01ca97da20a4ec462bf72991
//   if (events.length > 0) {
//     const cmds = [ 'profile', 'sick', 'leave', 'watch', 'help' ]
//     for (const event of events) {
//       if (event.type === 'message' && event.message.type === 'text') {
//         let { text } = event.message
//         let cmdFound = false
//         for (const cmd of cmds) {
// //           let command = new RegExp(`^/${cmd}(?<arg>\\W.*|)`, 'ig')
// //           let exec = command.exec(text)
// //           if (!exec) continue

// //           cmdFound = true
// //           let sender = { type: 'text', text: `*CMD* ${cmd} \`${exec.groups.arg.trim()}\`` }

// //           if (cmd === 'help') {
// //             sender.text = `*Command*
// // \`/help\` ดูคำสั่งที่มีทั้งหมด
// // \`/sick\` [date] แจ้งขอลาป่วย \`/sick today\`
// // \`/leave\` [date-range] ดูข้อมูลส่วนตัวของเมมเบอร์ \`/leave 2019-01-01|2019-12-31\`
// // \`/profile\` ดูข้อมูลของ chat`
// //             client.replyMessage(event.replyToken, sender)
// //           } else if (cmd === 'sick') {
// //             let { userId } = event.source
// //             if (!exec.groups.arg.trim()) {
// //               client.pushMessage(userId, {
// //                 type: 'text',
// //                 text: 'รับทราบครับ คุณต้องการลาวันที่เท่าไหร่?',
// //                 quickReply: {
// //                  items: [
// //                   {
// //                    type: 'action',
// //                    action: { type: 'datetimepicker', label: 'Select Date', data: 'sick=1', mode: 'date', initial: '2018-09-11' }
// //                   }
// //                  ]
// //                 }
// //                })
// //             } else {
// //               client.getProfile(userId).then(p => {
// //                 sender.text = `คุณ _${p.displayName}_ แจ้งขอลาป่วย *${exec.groups.arg.trim()}*`
// //                 return client.pushMessage(groupAlert, sender)
// //               })
// //             }
// //           } else if (cmd === 'leave') {
// //             let { userId } = event.source
// //             if (!exec.groups.arg.trim()) {
// //               client.pushMessage(userId, {
// //                 type: 'text',
// //                 text: 'รับทราบครับ คุณต้องการลาวันที่เท่าไหร่?',
// //                 quickReply: {
// //                  items: [
// //                   {
// //                    type: 'action',
// //                    action: { type: 'datetimepicker', label: 'Select Date', data: 'leave=1', mode: 'date', initial: '2018-09-11' }
// //                   }
// //                  ]
// //                 }
// //                })
// //             } else {
// //               client.getProfile(userId).then(p => {
// //                 sender.text = `คุณ _${p.displayName}_ แจ้งขอลาพักร้อน *${exec.groups.arg.trim()}*`
// //                 return client.pushMessage(groupAlert, sender)
// //               })
// //             }
// //           } else if (cmd === 'watch') {
// //           } else if (cmd === 'profile') {
// //             let { userId, type, groupId, roomId } = event.source
// //             if (type === 'room') {
// //               sender.text = `*RoomId:* \`${roomId}\``
// //               return client.replyMessage(event.replyToken, sender)
// //             } else if (type === 'group') {
// //               sender.text = `*GroupId:* \`${groupId}\``
// //               return client.replyMessage(event.replyToken, sender)
// //             } else {
// //               client.getProfile(userId).then(p => {
// //                 sender.text = `*${p.displayName}* - ${p.statusMessage}\n\`${p.userId}\`\n\`${p.pictureUrl}\``
// //                 return client.replyMessage(event.replyToken, sender)
// //               })
// //             }
// //           }
// //           console.log(`${getId(event)}::${cmd}`)
// //           break
//         }
//         if (!cmdFound) {
//           let sender = { type: 'text', text: event.message.text }
//           client.pushMessage(getId(event), sender)
//           console.log(`${getId(event)}::${event.message.text}`)
//         }
//       } else if (event.type === 'postback') {
//         // { type: 'postback',
//         // replyToken: '3c8a1c7077664cf396db73883c1adeb2',
//         // source: { userId: 'U9e0a870c01ca97da20a4ec462bf72991', type: 'user' },
//         // timestamp: 1551941106824,
//         // postback: { data: 'sick=1', params: { date: '2018-09-28' } } }
//         console.log(event)
//       }
//     }
//   } else if (events.type === 'join') {
//     let { groupId } = events.source
//     console.log(`${groupId}::joined`)
    
//   } else if (events.type === 'leave') {
//     let { groupId } = events.source
//     console.log(`${groupId}::leaved`)
//   } else {
//     console.log(events)
//   }
//   res.end()
})

app.get('/', (req, res) => res.end('LINE Messenger Bot Endpoint.'))
app.listen(port, () => {
  console.log(`LINE Messenger Bot Endpoint listening on port ${port}!`)
})
