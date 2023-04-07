const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion, Browsers
} = require("@adiwajshing/baileys");
const fs = require("fs");
const pino = require("pino");
const QRCode = require('qrcode');
let sock

// async function connectToWhatsApp() {
//     const { version, isLatest } = await fetchLatestBaileysVersion();
//     const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
//     sock = makeWASocket({
//         // provide additional config here
//         version,
//         auth: state,
//         printQRInTerminal: true,
//         syncFullHistory: true,
//         // browser: Browsers.macOS('Desktop')
//     })

//     sock.ev.on('creds.update', saveCreds)

//     sock.ev.on('connection.update', (update) => {
//         const { connection, lastDisconnect } = update
//         console.warn(connection)
//         if(connection === 'close') {
//             const shouldReconnect = lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
//             console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
//             // reconnect if not logged out
//             if(shouldReconnect) {
//                 connectToWhatsApp()
//             }
//         } else if(connection === 'open') {
//             console.log('opened connection')
//         }
//     })

//     sock.ev.on('messages.upsert', async m => {
//         console.log(JSON.stringify(m, undefined, 2))
//         console.log('replying to', m.messages.key.remoteJid)
//         await sock.sendMessage(m.messages.key.remoteJid, { text: 'Hello there!' })
//     })
// }

async function connectToWhatsApp() {
    return new Promise(async (resolve, reject) => {
        const { version, isLatest } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
        sock = makeWASocket({
            // provide additional config here
            version,
            auth: state,
            printQRInTerminal: true,
            syncFullHistory: true,
            browser: Browsers.macOS('Desktop')
        })

        sock.ev.on('creds.update', saveCreds)

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update
            console.warn(connection)
            if (connection === 'connecting') return
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
                console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
                // reconnect if not logged out
                if (shouldReconnect) {
                    connectToWhatsApp()
                }
            } else if (connection === 'open') {
                console.log('opened connection')
            }

            if ('qr', qr => {
                console.log(qr)
                // Generate QR code data URL
                // QRCode.toDataURL(qr, (err, url) => {
                //     console.log(url);
                //     if (err) {
                //         reject(err);
                //     } else {
                //         console.log('QR code generated');
                //         console.log(url);
                //         resolve(url);
                //     }
                // });
            });
        })

        sock.ev.on('messages.upsert', async m => {
            console.log(JSON.stringify(m, undefined, 2))
            console.log('replying to', m.messages.key.remoteJid)
            await sock.sendMessage(m.messages.key.remoteJid, { text: 'Hello there!' })
        })


    });
}

async function logout() {
    await sock.logout()
}

async function sendTestMessage(id) {
    console.log(sock)
    const jid = id + '@s.whatsapp.net'
    await sock.sendMessage(jid, { text: 'This is a test message!' })
}

async function reconnect() {

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    sock = makeWASocket({ auth: state })
    sock.ev.on('creds.update', saveCreds)
}

// // run in main file
// connectToWhatsApp()
module.exports = { connectToWhatsApp, sendTestMessage, logout, reconnect }