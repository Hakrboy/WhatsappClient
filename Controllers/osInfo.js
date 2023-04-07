const os = require('os');
const regedit = require('regedit');

// Get the server uptime in seconds
const uptime = os.uptime();

// Get the total memory and free memory in bytes
const totalMemory = os.totalmem();
const freeMemory = os.freemem();
const memoryUsage = ((os.totalmem() - os.freemem())/1e9).toFixed(2);

// Get the server hostname in seconds
const hostname = os.hostname();

// Get the CPU usage
const cpucount = os.cpus().length;

// Get The server’s operating system: 
const release = os.version();
const type = os.type();
const loadavg = os.loadavg(); 
const winDetail = `${type} : ${release}`


const { exec } = require('child_process');




function getOSInfo() {
    return new Promise((resolve, reject) => {
      exec('systeminfo | findstr /B /C:"OS Name" /C:"OS Version"', (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        const lines = stdout.split('\n');
        const productName = lines[0].split(':')[1].trim();
        const version = lines[1].split(':')[1].trim();
        resolve({ productName, version });
      });
    });
}

async function getdetails() {
    try {
        const osInfo = await getOSInfo();
        console.log(`Product Name: ${osInfo.productName}`);
        console.log(`Version: ${osInfo.version}`);
      } catch (error) {
        console.error(error);
      }
}

  
module.exports = {uptime,totalMemory,freeMemory,memoryUsage,hostname,cpucount, release,type,loadavg,winDetail,getOSInfo}

