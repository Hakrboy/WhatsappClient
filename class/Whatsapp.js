const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    Browsers,MessageType
} = require('@adiwajshing/baileys');
const { v4: uuidv4 } = require('uuid')
const { toDataURL } = require('qrcode');
const { instanceQr, webhookUrl: _webhookUrl, webhookEnabled, markMessagesRead, webhookAllowedEvents, webhookBase64 } = require('../config/config')
const Firestore = require('../helper/firebaseClient');
const { downloadMessage } = require('../helper/downloadHelper')
const { processButton } = require('../helper/processButton')
const { create, get } = require('axios')
const { useFirestoreAuthState } = require('../helper/firebaseAuthState')

const firebase = new Firestore();
class whatsapp {

    socketConfig = {
        version: null,
        syncFullHistory: true,
        printQRInTerminal: false,
        browser: Browsers.appropriate('Desktop'),
        auth: null,
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.listMessage
            );
    
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {},
                            },
                            ...message,
                        },
                    },
                };
            }
            return message;
        }
    };
    authState
    key = ''
    allowWebhook = null
    webhook = null
    instance = {
        key: this.key,
        chats: [],
        qr:'',
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
        const { version, isLatest } = await fetchLatestBaileysVersion();
        this.collection = await firebase.addCollection(this.key)
        // const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
        const { state, saveCreds } = await useFirestoreAuthState(this.collection)

        this.authState = { state, saveCreds }
        this.socketConfig.auth = this.authState.state;
        this.socketConfig.version = version;
        this.instance.sock = makeWASocket(this.socketConfig);
        this.setHandler();
        return this;
    }

    setHandler() {
        const sock = this.instance.sock

        // on credentials update save state
        sock.ev.on('creds.update', this.authState.saveCreds)

        // on socket closed, opened, connecting
        sock?.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update

            if (connection === 'connecting') return

            if (connection === 'close') {

                // reconnect if not logged out
                if (
                    lastDisconnect?.error?.output?.statusCode !==
                    DisconnectReason.loggedOut
                ) {
                    await this.init()
                } else {
                    firebase.deleteCollection(this.key)
                    this.instance.online = false
                }
                if (['all', 'connection', 'connection.update'].some((e) => webhookAllowedEvents.includes(e)))
                    await this.SendWebhook('connection', {
                        connection: connection,
                    }, this.key)
            } else if (connection === 'open') {
                firebase.SaveChat(this.key)

                this.instance.online = true
                if (['all', 'connection', 'connection.update', 'connection:open'].some((e) => webhookAllowedEvents.includes(e)))
                    await this.SendWebhook('connection', {
                        connection: connection,
                    }, this.key)
            }

            if (qr) {
                toDataURL(qr).then((url) => {
                    this.instance.qr=url
                    this.instance.qrRetry++
                    if (this.instance.qrRetry >= instanceQr.maxRetryQr) {
                        // close WebSocket connection
                        this.instance.sock.ws.close()
                        // remove all events
                        this.instance.sock.ev.removeAllListeners()
                        // this.instance.qr = ' '
                    }
                })
            }


        })

        // sending presence
        sock?.ev.on('presence.update', async (json) => {
            if (['all', 'presence', 'presence.update'].some((e) => webhookAllowedEvents.includes(e)))
                await this.SendWebhook('presence', json, this.key)
        })

        // on receive all chats
        sock?.ev.on('chats.set', async ({ chats }) => {
            this.instance.chats = []
            const recivedChats = chats.map((chat) => {
                return {
                    ...chat,
                    messages: [],
                }
            })
            this.instance.chats.push(...recivedChats)
            await this.updateDb(this.instance.chats)
            await this.updateDbGroupsParticipants()
        })

        // on recive new chat
        sock?.ev.on('chats.upsert', (newChat) => {
            //console.log('chats.upsert')
            //console.log(newChat)
            const chats = newChat.map((chat) => {
                return {
                    ...chat,
                    messages: [],
                }
            })
            this.instance.chats.push(...chats)
        })

        // on chat change
        sock?.ev.on('chats.update', (changedChat) => {
            //console.log('chats.update')
            //console.log(changedChat)
            changedChat.map((chat) => {
                const index = this.instance.chats.findIndex(
                    (pc) => pc.id === chat.id
                )
                const PrevChat = this.instance.chats[index]
                this.instance.chats[index] = {
                    ...PrevChat,
                    ...chat,
                }
            })
        })

        // on chat delete
        sock?.ev.on('chats.delete', (deletedChats) => {
            //console.log('chats.delete')
            //console.log(deletedChats)
            deletedChats.map((chat) => {
                const index = this.instance.chats.findIndex(
                    (c) => c.id === chat
                )
                this.instance.chats.splice(index, 1)
            })
        })

        // on new mssage
        sock?.ev.on('messages.upsert', async (m) => {
            //console.log('messages.upsert')
            //console.log(m)
            if (m.type === 'prepend')
                this.instance.messages.unshift(...m.messages)
            if (m.type !== 'notify') return

            // https://adiwajshing.github.io/Baileys/#reading-messages
            if (markMessagesRead) {
                const unreadMessages = m.messages.map(msg => {
                    return {
                        remoteJid: msg.key.remoteJid,
                        id: msg.key.id,
                        participant: msg.key?.participant
                    }
                })
                await sock.readMessages(unreadMessages)
            }

            this.instance.messages.unshift(...m.messages)

            m.messages.map(async (msg) => {
                if (!msg.message) return

                const messageType = Object.keys(msg.message)[0]
                if (
                    [
                        'protocolMessage',
                        'senderKeyDistributionMessage',
                    ].includes(messageType)
                )
                    return

                const webhookData = {
                    key: this.key,
                    ...msg,
                }

                if (messageType === 'conversation') {
                    webhookData['text'] = m
                }
                if (webhookBase64) {
                    switch (messageType) {
                        case 'imageMessage':
                            webhookData['msgContent'] = await downloadMessage(
                                msg.message.imageMessage,
                                'image'
                            )
                            break
                        case 'videoMessage':
                            webhookData['msgContent'] = await downloadMessage(
                                msg.message.videoMessage,
                                'video'
                            )
                            break
                        case 'audioMessage':
                            webhookData['msgContent'] = await downloadMessage(
                                msg.message.audioMessage,
                                'audio'
                            )
                            break
                        default:
                            webhookData['msgContent'] = ''
                            break
                    }
                }
                if (['all', 'messages', 'messages.upsert'].some((e) => webhookAllowedEvents.includes(e)))
                    await this.SendWebhook('message', webhookData, this.key)
            })
        })

        // on group change
        sock?.ev.on('groups.upsert', async (newChat) => {
            //console.log('groups.upsert')
            //console.log(newChat)
            this.createGroupByApp(newChat)
            if (['all', 'groups', 'groups.upsert'].some((e) => webhookAllowedEvents.includes(e)))
                await this.SendWebhook('group_created', {
                    data: newChat,
                }, this.key)
        })

        // on group change
        sock?.ev.on('groups.update', async (newChat) => {
            //console.log('groups.update')
            //console.log(newChat)
            this.updateGroupSubjectByApp(newChat)
            if (['all', 'groups', 'groups.update'].some((e) => webhookAllowedEvents.includes(e)))
                await this.SendWebhook('group_updated', {
                    data: newChat,
                }, this.key)
        })

        // on group perticipants change
        sock?.ev.on('group-participants.update', async (newChat) => {
            //console.log('group-participants.update')
            //console.log(newChat)
            this.updateGroupParticipantsByApp(newChat)
            if (['all', 'groups', 'group_participants', 'group-participants.update'].some((e) => webhookAllowedEvents.includes(e)))
                await this.SendWebhook('group_participants_updated', {
                    data: newChat,
                }, this.key)
        })

    }

    async deleteInstance(key) {
        try {
            await firebase.deleteCollection(key)
        } catch (e) {
            logger.error('Error updating document failed')
        }
    }

    async getInstanceDetail(key) {
        return {
            instance_key: key,
            phone_connected: this.instance?.online,
            webhookUrl: this.instance.customWebhook,
            user: this.instance?.online ? this.instance.sock?.user : {},
        }
    }

    getWhatsAppId(id) {
        if (id.includes('@g.us') || id.includes('@s.whatsapp.net')) return id
        return id.includes('-') ? `${id}@g.us` : `${id}@s.whatsapp.net`
    }

    async verifyId(id) {
        if (id.includes('@g.us')) return true
        const [result] = await this.instance.sock?.onWhatsApp(id)
        if (result?.exists) return true
        throw new Error('no account exists')
    }

    async sendTextMessage(to, message) {
        console.log('message', to, message)
        await this.verifyId(this.getWhatsAppId(to))
        const data = await this.instance.sock?.sendMessage(
            this.getWhatsAppId(to),
            { text: message }
        )
        return data
    }

    async sendMediaFile(to, file, type, caption = '', filename) {
        await this.verifyId(this.getWhatsAppId(to))
        const data = await this.instance.sock?.sendMessage(
            this.getWhatsAppId(to),
            {
                mimetype: file.mimetype,
                [type]: file.buffer,
                caption: caption,
                ptt: type === 'audio' ? true : false,
                fileName: filename ? filename : file.originalname,
            }
        )
        return data
    }

    async sendUrlMediaFile(to, url, type, mimeType, caption = '') {
        await this.verifyId(this.getWhatsAppId(to))

        const data = await this.instance.sock?.sendMessage(
            this.getWhatsAppId(to),
            {
                [type]: {
                    url: url,
                },
                caption: caption,
                mimetype: mimeType,
            }
        )
        return data
    }

    async sendButtonMessage(to, data) {
        // console.log(data)
        // const msg = {
        //     templateButtons: processButton(data.buttons),
        //     text: data.text ?? '',
        //     footer: data.footerText ?? '',
        //     viewOnce: true
        // }
        // console.log(JSON.stringify(msg.templateButtons))
        await this.verifyId(this.getWhatsAppId(to))
        const result = await this.instance.sock?.sendMessage(
            this.getWhatsAppId(to), {
                templateButtons: processButton(data.buttons),
                text: data.text ?? '',
                footer: data.footerText ?? '',
                viewOnce: true
            }
        )
        console.log(result)
        return result
    }

    async sendListMessage(to, data) {
        await this.verifyId(this.getWhatsAppId(to))
        console.log(to)
        const result = await this.instance.sock?.sendMessage(
            this.getWhatsAppId(to),
            {
                text: data.text,
                sections: data.sections,
                buttonText: data.buttonText,
                footer: data.description,
                title: data.title,
                viewOnce: true
            }
        )
        return result
    }

    logToConsole(message) {
        console.log(this.instance);
    }
}

module.exports = whatsapp;