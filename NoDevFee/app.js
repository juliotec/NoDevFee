require('dotenv').config()
const net = require('net')
const fs = require('fs')

process.on('uncaughtException', (err) =>
{
    console.error(err)
})

function getRandomInt(min, max)
{
    return Math.floor(Math.random() * (max - min) + min)
}

const remotehost = process.env.MINER_IP
const remoteport = process.env.MINER_PORT
const myEthaddress = process.env.ETH_ADDRESS
const ports = process.env.PORTS_TO_REDIRECT.split(',')

if (!remotehost || !remoteport || !myEthaddress || !ports)
{
    console.error('Error: check your arguments and try again!')
    process.exit(1)
}

for (var i = 0; i < ports.length; i++)
{
    const port = ports[i].trim();

    const server = net.createServer((localsocket) =>
    {
        const remotesocket = new net.Socket()

        remotesocket.connect(remoteport, remotehost)

        localsocket.on('connect', () =>
        {
            console.log(`>>> connection #${server.connections} from ${localsocket.remoteAddress}:${localsocket.remotePort}`)
        })

        localsocket.on('data', (data) =>
        {
            console.log(`${localsocket.remoteAddress}:${localsocket.remotePort} - writing data to remote`)

            const ethSubmitIndex = data.indexOf('eth_submitLogin')

            if (ethSubmitIndex >= 0)
            {
                const ethIndex = data.indexOf('0x');
                const ethAddress = data.toString('utf8', ethIndex, ethIndex + 42)

                if (myEthaddress != ethAddress)
                {
                    const date = new Date()

                    fs.appendFile("address_changed.txt", `${date.toISOString()} - old : ${data}`, (msg) =>
                    {
                        if (msg)
                        {
                            console.log(`\x1b[32m${msg}\x1b[0m`);
                        }
                    })
                    data.write(myEthaddress, ethIndex)
                    fs.appendFile("address_changed.txt", `${date.toISOString()} - new : ${data}`, (msg) =>
                    {
                        if (msg)
                        {
                            console.log(`\x1b[32m${msg}\x1b[0m`);
                        }
                    })
                }
            }

            console.log(`localsocket-data: ${data}`)

            const flushed = remotesocket.write(data)

            if (!flushed)
            {
                console.log(' remote not flused; pausing local')
                localsocket.pause()
            }
        })

        remotesocket.on('data', (data) =>
        {
            console.log(`${localsocket.remoteAddress}:${localsocket.remotePort} - writing data to local`)
            console.log(`remotesocket-data: ${data}`)

            const flushed = localsocket.write(data)

            if (!flushed)
            {
                console.log(' local not flushed; pausing remote')
                remotesocket.pause()
            }
        })

        localsocket.on('drain', () =>
        {
            console.log(`${localsocket.remoteAddress}:${localsocket.remotePort} - resuming remote`)
            remotesocket.resume()
        })

        localsocket.on('close', () =>
        {
            console.log(`${localsocket.remoteAddress}:${localsocket.remotePort} - closing local`)
            remotesocket.end()
        })

        remotesocket.on('close', () =>
        {
            console.log(`${localsocket.remoteAddress}:${localsocket.remotePort} - closing local`)
            localsocket.end()
        })
    })

    server.listen(port)

    console.log(`redirecting connections from 0.0.0.0:${port} to ${remotehost}:${remoteport}`)
}

