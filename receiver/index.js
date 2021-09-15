const express = require('express');
const bodyParser = require('body-parser');

let receiveDuration = process.env['RECEIVE_DURATION'];
if (!receiveDuration) {
    console.log("RECEIVE_DURATION env var is not defined");
    process.exit();
}
// ignore exceptions
receiveDuration = parseInt(receiveDuration, 10);
console.log("receiveDuration: " + receiveDuration);

const app = express();

app.use(bodyParser.raw({
    inflate: true, limit: '1000kb', type: function (req) {
        return true
    }
}));

let receivedMessageCount = 0;
let latestEventIndex = 0;
const receivedMessages = [];

app.all('*', function (req, res) {
    latestEventIndex = req.body.toString('utf8');
    if (receivedMessages[latestEventIndex]) {
        receivedMessages[latestEventIndex] = receivedMessages[latestEventIndex] + 1;
    } else {
        receivedMessages[latestEventIndex] = 1;
    }
    if (receivedMessageCount === 0) {
        setTimeout(function () {
            console.log("Receiving duration has passed!");
            // keep the server running. timing of sender should be adjusted properly
            doAnalysis();
        }, receiveDuration);
    }
    console.log("Received message: " + String(req.body));
    receivedMessageCount++;

    res.status(202).send('');
});

function doAnalysis() {
    const missingMessages = findMissingMessages();
    const duplicateMessagesWithCounts = findDuplicateMessagesWithCounts();

    console.log("Total received message count: " + receivedMessageCount);
    console.log("Latest message index: " + latestEventIndex);
    console.log("Missing messages count: " + missingMessages.length);
    console.log("Missing messages: " + missingMessages);
    console.log("Duplicate messages: " + JSON.stringify(duplicateMessagesWithCounts));
}

function findMissingMessages() {
    const misses = [];
    // first event starts from 1
    for (let i = 1; i <= latestEventIndex; i++) {
        if (!receivedMessages[i]) {
            misses.push(i);
        }
    }
    return misses;
}

function findDuplicateMessagesWithCounts() {
    const res = {};
    for (let i = 0; i <= latestEventIndex; i++) {
        if (receivedMessages[i] && receivedMessages[i] > 1) {
            res[i] = receivedMessages[i];
        }
    }
    return res;
}


app.listen(8080, () => {
    console.log('https://github.com/aliok/request-logger');
    console.log('App listening on :8080');
});


registerGracefulExit();

function registerGracefulExit() {
    let logExit = function () {
        console.log("Exiting");
        process.exit();
    };

    process.on('uncaughtException', function (err) {
        console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
        console.error(err.stack)
        logExit();
    })

    // handle graceful exit
    //do something when app is closing
    process.on('exit', logExit);
    //catches ctrl+c event
    process.on('SIGINT', logExit);
    process.on('SIGTERM', logExit);
    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', logExit);
    process.on('SIGUSR2', logExit);
}
