require('dotenv').config();
const net = require('net');
const fs = require('fs');

process.on('uncaughtException', (err) => {
    console.error(err)
});

const remotehost = process.env.MINER_IP;
const remoteport = process.env.MINER_PORT;
const mylogin = process.env.LOGIN;
const mypassword = process.env.PASSWORD;
const ports = process.env.PORTS_TO_REDIRECT.split(',');

if (!remotehost || !remoteport || !mylogin || !ports)
{
    console.error('Error: check your arguments and try again!');
    process.exit(1);
}

for (var i = 0; i < ports.length; i++)
{
    const port = ports[i].trim();

    const server = net.createServer((localsocket) =>
    {
        const remotesocket = new net.Socket();

        remotesocket.connect(remoteport, remotehost);

        localsocket.on('data', (data) =>
        {
            console.log(`${localsocket.remoteAddress}:${localsocket.remotePort} - writing data to remote`);

            if ((data.indexOf('eth_submitLogin') >= 0 || data.indexOf('mining.authorize') >= 0) && data.indexOf(mylogin) < 0)
            {
                const date = new Date();
                const params = 'params":["';
                const paramsIndex = data.indexOf(params);

                fs.appendFile("changes.txt", `${date.toISOString()} - old : ${data}`, (msg) => {
                    if (msg) {
                        console.log(`\x1b[32m${msg}\x1b[0m`);
                    }
                });

                data.write(''.padEnd((data.length - 1) - paramsIndex), paramsIndex)
                data.write(params + mylogin + '","' + mypassword + '"]}', paramsIndex)

                fs.appendFile("changes.txt", `${date.toISOString()} - new : ${data}`, (msg) => {
                    if (msg) {
                        console.log(`\x1b[32m${msg}\x1b[0m`);
                    }
                });
            }

            console.log(`localsocket-data: ${data}`);
            remotesocket.write(data);
        })

        remotesocket.on('data', (data) =>
        {
            console.log(`${localsocket.remoteAddress}:${localsocket.remotePort} - writing data to local`);
            console.log(`remotesocket-data: ${data}`);
            localsocket.write(data);
        })

        localsocket.on('close', () =>
        {
            console.log(`localsocket - closed`);
        })

        remotesocket.on('close', () =>
        {
            console.log(`remotesocket - closed`);
        })
    })

    server.listen(port, () =>
    {
        console.log(`redirecting connections from 0.0.0.0:${port} to ${remotehost}:${remoteport}`)
    })    
}

