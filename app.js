const express = require('express')
const socketIO = require('socket.io')
const fs = require('fs')
const moment = require('moment')
const bodyParser = require('body-parser')
let Tesseract = require('tesseract.js').TesseractWorker


const port = process.env.PORT || 3000


const app = express()
const httpServer = require('http').Server(app)
const io = socketIO(httpServer)

const worker = new Tesseract()


app.use(express.static('public'))

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())


io.on('connection', function (socket) {
    console.info('client connected')

    socket.on('capture', data => {

        let image = data.data

        var cleanedimage = image.replace(/^data:image\/\w+;base64,/, '')
        var filename = `${__dirname}/image.png`

        fs.writeFileSync(filename, cleanedimage, { encoding: 'base64' })

        let totaltext = []

        worker
            .recognize(__dirname+'/envelope.png')
            // .recognize(filename)
            .progress(p => {
                console.log('progress', p)
            })
            .then(({ text }) => {
                if (text && text != '') {
                    console.log(text)
                    totaltext.push(text.split('\n').filter(tx => tx != ''))

                    totaltext = totaltext[0]

                    let flg = totaltext[0] == 'To,' ? 'From,' : 'To,'

                    totaltext = totaltext.join('\n').split(flg)

                    totaltext[1] = flg + totaltext[1]

                    let ind = flg == 'To,' ? 1 : 0
                    let finalobjct = {
                        to: totaltext[ind],
                        from: totaltext[(ind + 1) % 2]
                    }
                    // console.log(totaltext)
                    console.log(finalobjct)
                    socket.emit('text detected', finalobjct)

                    fs.unlinkSync(filename)
                } else {
                    socket.emit('text detected', { to: "error", from: "error" })
                }
            }).catch(err => {
                socket.emit('text detected', { to: "error", from: "error" })
            })
    })
    // .then(() => {


    socket.on('disconnect', () => {
        console.info('client disconnected')
    })
})

httpServer.listen(port, function () {
    console.log('listening to request on port ' + port)
})
