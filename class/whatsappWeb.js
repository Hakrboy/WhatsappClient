const qrcode = require('qrcode-terminal');
const { toDataURL } = require('qrcode');
const { Client } = require('whatsapp-web.js');
const { instanceQr, webhookUrl: _webhookUrl, webhookEnabled, markMessagesRead, webhookAllowedEvents, webhookBase64 } = require('../config/config')
const Firestore = require('../helper/firebaseClient');
const { create, get } = require('axios')
const { useFirestoreAuthState } = require('../helper/firebaseAuthState')
// const client = new Client();


class whatsappWeb {

    key = ''
    allowWebhook = null
    webhook = null
    instance = {
        key: this.key,
        chats: [],
        qr: '',
        messages: [],
        qrRetry: 0,
        customWebhook: '',
    }

    constructor(key, allowWebhook, webhook) {
        this.key = key ? key : uuidv4()
        this.instance.customWebhook = this.webhook ? this.webhook : webhook
        this.allowWebhook = webhookEnabled
            ? webhookEnabled
            : allowWebhook
        if (this.allowWebhook && this.instance.customWebhook !== null) {
            this.allowWebhook = true
            this.instance.customWebhook = webhook
            this.axiosInstance = create({
                baseURL: webhook,
            })
        }
    }

    axiosInstance = create({
        baseURL: _webhookUrl,
    })

    async SendWebhook(type, body, key) {
        if (!this.allowWebhook) return
        // this.axiosInstance
        //     .get('', {
        //         type,
        //         body,
        //         instanceKey: key,
        //     })
        //     .catch(() => { })
        console.log(`type=====>${type}`)
        console.log(`body===========>${JSON.stringify(body)}`)
    }

    async init() {
        this.instance.sock = new Client();
        this.instance.sock.initialize();
        this.setHandler()
        return this;
    }

    setHandler() {
        console.log('calling sethandler')
        const client = this.instance.sock
        client.on('ready', () => {
            console.log('Client is ready!');
            const chatId = '919586227220@c.us';
            const listMessage = {
                listType: 1,
                title: 'List Title',
                description: 'List Description',
                buttonText: 'Button Text',
                sections: [
                    {
                        rows: [
                            {
                                title: 'Row Title',
                                description: 'Row Description',
                                rowId: 'rowId1',
                                imageUrl: 'https://via.placeholder.com/150',
                                buttons: [
                                    {
                                        buttonText: 'Button Text',
                                        buttonId: 'buttonId1'
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };
            client.sendMessage(chatId, listMessage);
            console.log('msg sent')
        })

        client.on('qr', (qr) => {
            console.log('QR RECEIVED', qr);
            qrcode.generate(qr, { small: true });
            toDataURL(qr).then((url) => {
                this.instance.qr = url
                this.instance.qrRetry++

            })
        });

        client.on('authenticated', (session) => {
            // Save the session object however you prefer.
            // Convert it to json, save it to a file, store it in a database...
        });

        client.on('message', message => {
            console.log(message.body);
        });



        //Reply to this message
        // client.on('message', message => {
        //     if(message.body === '!ping') {
        //         message.reply('pong');
        //     }
        // });

        //Send a new chat message 
        // client.on('message', message => {
        //     if(message.body === '!ping') {
        //         client.sendMessage(message.from, 'pong');
        //     }
        // });

    }



}

module.exports = whatsappWeb