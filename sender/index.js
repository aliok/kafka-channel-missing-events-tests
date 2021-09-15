const kafka = require('kafka-node');

const kafkaHost = process.env['KAFKA_HOST'];
if (!kafkaHost) {
    console.log("KAFKA_HOST env var is not defined");
    process.exit();
}

const kafkaTopic = process.env['KAFKA_TOPIC'];
if (!kafkaTopic) {
    console.log("KAFKA_TOPIC env var is not defined");
    process.exit();
}

let sendDuration = process.env['SEND_DURATION'];
if (!sendDuration) {
    console.log("SEND_DURATION env var is not defined");
    process.exit();
}
// ignore exceptions
sendDuration = parseInt(sendDuration, 10);

console.log("Creating Kafka client");
const client = new kafka.KafkaClient({
    kafkaHost: kafkaHost
});

console.log("Creating producer");
const producer = new kafka.HighLevelProducer(client, {
    requireAcks: 0,     // disabled to send many messages at once
});

producer.on('error', function (err) {
    console.log("Producer error");
    console.log(err);
    process.exit();
});

const SEND_FREQUENCY = 10;	// N ms

producer.on('ready', function (err) {
    if (err) {
        console.error('Error waiting for producer to be ready', err);
    } else {
        console.log('Producer ready, sending events for ' + sendDuration + ' milliseconds');

        let startTime = new Date().getTime();

        let eventIndex = 0;
        let success = 0;
        let error = 0;

        let interval = setInterval(function () {
            let currentTime = new Date().getTime();
            console.log("Emitting event #" + ++eventIndex + ". Remaining time (in seconds): " + ((startTime + sendDuration - currentTime) / 1000));

            producer.send([{
                topic: kafkaTopic,
                messages: '' + eventIndex
            }], function (err) {
                if (err) {
                    console.log('Error sending message ');
                    console.error(err);
                    error++;
                } else {
                    // Treat the response
                    console.log("Event #" + eventIndex + " posted successfully");
                    success++;
                }
            });

            if (startTime + sendDuration <= currentTime) {
                clearInterval(interval);
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
    }
});

registerGracefulExit();

function registerGracefulExit() {
    let logExit = function () {
        console.log("Exiting");
        process.exit();
    };

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
