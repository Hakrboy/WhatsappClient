/* --------------------------------- SERVER --------------------------------- */
require('dotenv').config()
const express = require("express");
const { json, urlencoded }  = require("express");
const app = express();
const cors = require("cors");
const {uptime,totalMemory,freeMemory,memoryUsage,hostname,cpucount, release,type,loadavg,winDetail,getOSInfo}=require('./Controllers/osInfo')
const routes  = require('./routes')
const {handler} =require('./middlewares/error')
// const deleteFolderRecursive = require('./Controllers/deleteRecursive')
const DeleteAuth = require('./Controllers/DeleteAuthInfo')


app.use(json())
app.use(json({ limit: '50mb' }))
app.use(urlencoded({ extended: true }))
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const port = process.env.APP_PORT || 8080;
global.WhatsAppInstances = {}
app.listen(port, () => {
  console.warn(`Wastsapp-server running on http://localhost:${port}`);
});

app.use(cors());
app.use('/api', routes)
app.use(handler)

app.get("/", async (req, res) => {
  console.log("Get request to /");
  try {
    const osInfo = await getOSInfo();
    res.render("index", {uptime, memoryUsage, cpucount, hostname,productName:osInfo.productName,version:osInfo.version , loadavg });
  } catch (error) {
    console.error(error);
  }
 
});


app.get('/refresh', (req, res) => {
  // deleteFolderRecursive(__dirname+'/auth_info_baileys');
  DeleteAuth()
  res.send('Flushed Auth State');
});

// const { connectToWhatsApp, logout, sendTestMessage, reconnect } = require('./Controllers/Baileye');
// const whatsapp = require('./class/Whatsapp')
// const {init,getqr,send,sendButton}=require('./Controllers/instance.controller')



// app.get('/generateQRCode', async (req, res) => {
//     await connectToWhatsApp();
//     res.send('QR Code Generated in Ternminal');
// });

// app.get('/generateQRCode', async (req, res) => {
//   try {
//     const qrCodeDataURL = await connectToWhatsApp();
//     console.log(qrCodeDataURL)
//     res.send(qrCodeDataURL);
//       // res.send(qrCodeDataURL);
//   } catch (err) {
//       res.status(500).send(err.message);
//   }
// });


// app.get('/logout', async (req, res) => {
//     await logout();
//     res.send('Logged Out');
// });

// app.get('/retry', async (req, res) => {
//     await reconnect();
//     res.send('Connecting ...');
// });


// app.get('/send/:userId', async (req, res) => {
//   const userId = req.params.userId // get the value of userId parameter from the request
  
//     await sendTestMessage(userId);
//     res.send(`Retrieving data for user ${userId}`)
// })

// const myClassInstance = new whatsapp();
// myClassInstance.init();

// app.get('/init', async (req, res) => {
//   await init();
//   const qr = await getqr()
//   res.send({'msg':'initializing done', qr:qr})
// });

// app.get('/getcode', async (req, res) => {
//   const qr = await getqr()
//   console.log(qr)
//   res.send(qr)
// });

// app.get('/send/:id/:text', async (req, res) => {
//   // console.log(req)
//   const data = await send(req.params)
//   res.send(data)
// });

// app.get('/sendbutton/:id/', async (req, res) => {
//   // console.log(req)
//   // send a buttons message!
//   const data = await sendButton(req.params)
//   res.send(data)
// });
