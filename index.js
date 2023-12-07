// ============= Server code for web page ================
const express = require("express");
const path = require('path');
const cors = require('cors')
const bodyParser = require('body-parser');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors())
app.use(bodyParser.text()); // parse plain text body
const port = 3000; // server port number

// Initialize Runtime data
let reminders = []
let contact = ""

function loadActiveRemindersFromFile() {
    reminders = []
    const fileContent = fs.readFileSync('reminders.txt', 'utf-8');
    const lines = fileContent.split('\n');
    lines.splice(0,1) // get rid of the first line email address
    for (let line of lines) {
        let tmp = line.split(",")
        if (tmp[5] === "true") {
            reminders.push(tmp)
        }
    }
    console.log("Updated Reminders Loaded, Ready to Serve")
}
function loadContactFromFile(){
    let file = fs.readFileSync('reminders.txt', 'utf-8');
    let lines = file.split('\n');
    contact = lines[0].toString().trim();
}

// save new data from front-end, which contains reminders and contact email address
function saveAndUpdateNewData(dataToSave){
    const filePath = 'reminders.txt';
    fs.writeFileSync(filePath, dataToSave)
    // once data is updated, the new data need to be updated to runtime
    loadActiveRemindersFromFile()
    loadContactFromFile()
}

// Initialize run time data
loadActiveRemindersFromFile()
loadContactFromFile()

// ============= Server code for communicating with front end for data exchange ================
app.get("/data", function (req, res) {
    const options = {
        root: path.join(__dirname)
    };
    const fileName = 'reminders.txt'; // Specify the path to your file
    console.log('[Front End]: Reminder Data Request');
    res.sendFile(fileName, options, (err) => {
        if (err) {
            console.error('[Back End]: Error Sending Data\n', err);
        } else {
            console.log('[Back End]: Data Sent\n');
        }
    });
});
app.post("/update", function (req){
    const data = req.body;
    if (data) {
        console.log('[Front End]: Reminder Data Update Request');
        saveAndUpdateNewData(data) // save the reminder data to file
        console.log('[Back End]: Reminder Data Updated\n');
    } else {
        console.log("[Back End]: Data not received\n")
    }
});
app.listen(port, function() {
    console.log(`Listening to front end at port: ${port}`);
});


// ============= Server code for sending emails (ESP32-1) ================
let emailAddress = process.env.EMAIL_ADDRESS;
let app_password = process.env.APP_PASSWORD
const net = require('net');
const port2 = 7070;
const host = '10.18.7.90';
const nodemailer = require('nodemailer');

function sendEmail(){
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailAddress.toString(),
            pass: app_password.toString()
        }
    });
    const mailOptions = {
        from: emailAddress.toString(),
        to: contact,
        subject: 'Assistance',
        text: 'Need some help here!'
    };
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}
const server = net.createServer((socket)=>{
    console.log('client connected')

    socket.on('data', (data)=>{
        console.log(`Message Received: ${data}`)
        if (data.toString() === 'Send Email'){
            sendEmail()
        }
    })
    socket.on('end', ()=>{
        console.log('client disconnected')
    })
})
server.listen(port2, host, ()=>{
    console.log(`Listening to send email request at port: ${port2}`)
})


//============= Server code for sending Reminders (ESP32-2) ================
const client = new net.Socket();
client.connect(8000,'10.18.8.7')
function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}
function getDateTime(){
    const currentDate = new Date();
    const formattedDateTime =
        currentDate.getFullYear() +
        '-' +
        ('0' + (currentDate.getMonth() + 1)).slice(-2) +
        '-' +
        ('0' + currentDate.getDate()).slice(-2) +
        ' ' +
        ('0' + currentDate.getHours()).slice(-2) +
        ':' +
        ('0' + currentDate.getMinutes()).slice(-2);
    return [formattedDateTime.slice(0,10).toString(), formattedDateTime.slice(11, 20).toString()]
}
async function start(){
    while (true){
        await sleep(2000)
        try {
            let dateAndTime = getDateTime()
            console.log(dateAndTime)
            let currentDate = dateAndTime[0]
            let currentTime = dateAndTime[1]
            for (let item of reminders) {
                if (item[2] === "Once") {
                    if (item[3] === currentTime && item[4] === currentDate) {
                        client.write(`${item[0]},${item[1]}`)
                        await sleep(60000)
                    }
                } else {
                    if (item[3] === currentTime) {
                        client.write(`${item[0]},${item[1]}`)
                        await sleep(60000)
                    }
                }
            }
        }catch(err){
            console.log(err)
            break
        }
    }
}
console.log(`Ready to notify device at 10.18.8.7:8000`)
start().then(r => console.log(r))







