const {CloudEvent, HTTPEmitter} = require("cloudevents-sdk");

let sendDuration = process.env['SEND_DURATION'];
if (!sendDuration) {
    console.log("SEND_DURATION env var is not defined");
    process.exit(-1);
}
// ignore exceptions
sendDuration = parseInt(sendDuration, 10);
const SEND_FREQUENCY = 10;	// N ms

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

console.log('Producer ready, sending events for ' + sendDuration + ' milliseconds');

let internal = setInterval(function () {
    let currentTime = new Date().getTime();
    console.log("Emitting event #" + ++eventIndex + ". Remaining time (in seconds): " + ((startTime + sendDuration - currentTime) / 1000));

    let myevent = new CloudEvent({
        source: "urn:event:from:my-api/resource/123",
        type: "your.event.source.type",
        id: "your-event-id",
        dataContentType: "application/json",
        data: {"hello": "" + eventIndex},
    });

    // Emit the event
    emitter.send(myevent)
        .then(response => {
            // Treat the response
            console.log("Event #" + eventIndex + " posted successfully");
            success++;
        })
        .catch(err => {
            // Deal with errors
            console.log("Error during event post");
            console.error(err);
            error++;
        });

    if (startTime + sendDuration <= currentTime) {
        clearInterval(internal);
        console.log("Stopped sending messages.");
        console.log("Sleeping for 5 seconds to finalize message sending.");
        setTimeout(function () {
            console.log("In " + (sendDuration / 1000) + " seconds, tried to send " + eventIndex + " messages");
            console.log("Success:" + success);
            console.log("Errors:" + error);
            console.log("Starting to sleep now");
        }, 5 * 1000);
        setInterval(function () {
            // sleep forever until killed
        }, 1000);
    }

}, SEND_FREQUENCY);

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
