const {CloudEvent, HTTPEmitter} = require("cloudevents-sdk");
const axios = require('axios');

const CancelToken = axios.CancelToken;

let sendDuration = process.env['SEND_DURATION'];
if (!sendDuration) {
    console.log("SEND_DURATION env var is not defined");
    process.exit(-1);
}
// ignore exceptions
sendDuration = parseInt(sendDuration, 10);

let sendFrequency = process.env['SEND_FREQUENCY'];
if (!sendFrequency) {
    console.log("SEND_FREQUENCY env var is not defined");
    process.exit(-1);
}
// ignore exceptions
sendFrequency = parseInt(sendFrequency, 10);

let sinkUrl = process.env['K_SINK'];
if (!sinkUrl) {
    console.log("K_SINK env var is not defined");
    process.exit(-1);
}

console.log("Sink URL is " + sinkUrl);

let emitter = new HTTPEmitter({
    url: sinkUrl
});

let startTime = new Date().getTime();

let eventIndex = 0;
let success = 0;
let error = 0;
let trialsMap = {};

console.log('Producer ready, sending events for ' + sendDuration + ' milliseconds');

let internal = setInterval(function () {
    let currentTime = new Date().getTime();

    eventIndex++;

    if (eventIndex % 100 === 0) {
        console.log("Emitting event #" + eventIndex + ". Remaining time (in seconds): " + ((startTime + sendDuration - currentTime) / 1000));
    }

    let myevent = new CloudEvent({
        source: "urn:event:from:my-api/resource/123",
        type: "your.event.source.type",
        id: "your-event-id",
        dataContentType: "application/json",
        data: {"hello": "" + eventIndex},
    });

    sendEventWithRetry(emitter, myevent, 1);

    if (startTime + sendDuration <= currentTime) {
        clearInterval(internal);
        console.log("Stopped sending messages.");
        console.log("Sleeping for 5 seconds to finalize message sending.");
        setTimeout(function () {
            console.log("In " + (sendDuration / 1000) + " seconds, tried to send " + eventIndex + " messages");
            console.log("Success:" + success);
            console.log("Errors:" + error);
            console.log("Starting to sleep now");
        }, 10 * 1000);
        setInterval(function () {
            // sleep forever until killed
        }, 1000);
    }

}, sendFrequency);

registerGracefulExit();

function sendEventWithRetry(emitter, e, tries) {
    let cancel;
    let cancelTimeout;
    let axiosOpts = {
        cancelToken: new CancelToken(function executor(c) {
            // An executor function receives a cancel function as a parameter
            cancel = c;
        })
    };
    cancelTimeout = setTimeout(function () {
        cancel();
    }, 100);

    emitter.send(e, axiosOpts)
        .then(response => {
            // Treat the response
            // console.log("Event #" + JSON.stringify(e.data) + " posted successfully");
            clearTimeout(cancelTimeout);
            success++;
        })
        .catch(err => {
            // Deal with errors
            if (tries < 100) {
                console.log("Error during event post try #" + tries + " , gonna retry: " + JSON.stringify(e.data));
                let currentTime = new Date().getTime();
                if (startTime + sendDuration <= currentTime) {
                    // then sending is over, but retries continue
                    console.error(err);
                }
                // error++;
                setTimeout(function () {
                    sendEventWithRetry(emitter, e, tries + 1);
                }, sendFrequency);
            } else {
                console.log("Error during event post try #" + tries + " , won't retry : " + JSON.stringify(e.data));
                console.error(err);
                error++;
            }
        });
}

function registerGracefulExit() {
    let logExit = function () {
        console.log("Exiting");
        process.exit();
    };

    process.on('uncaughtException', function (err) {
        console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
        console.error(err.stack)
        logExit();
    });

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
