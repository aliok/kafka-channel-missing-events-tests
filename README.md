# Kafka Source missing events tests

Created for https://issues.redhat.com/browse/SRVKE-927

## Info


```
┌────────────────┐
│                │
│  sender        │
│                │
└──────┬─────────┘
       │
       │
┌──────▼─────────┐
│                │
│  Kafka channel │
│                │
└──────┬─────────┘
       │
       │
┌──────▼────────┐
│               │
│  receiver     │
│               │
└───────────────┘
```

- Sender sends messages from KafkaChannel
- Kafka channel sends the messages to Kafka and later sends them to the receiver


The test is:
- Send events continuously over the pipeline
- Kill KafkaChannel adapter pods and see what happens

## Instructions

Install 0.23 stuff:
```bash
./hack/0.23/01-kn-serving.sh
./hack/0.23/02-kn-eventing.sh
./hack/0.23/03-strimzi.sh
./hack/0.23/04-kn-kafka.sh
```

Install 0.24 stuff:
```bash
./hack/0.24/01-kn-serving.sh
./hack/0.24/02-kn-eventing.sh
./hack/0.24/03-strimzi.sh
./hack/0.24/04-kn-kafka.sh
```


Reproduce:
```
k delete -f config/400-sender.yaml

# make sure to delete the channel, so that the topic and the consumergroup is deleted
k delete -f config/200-kafka-channel.yaml
k delete pod -l run=receiver

k apply -f config/400-sender.yaml

k apply -f config/200-kafka-channel.yaml
```


List offsets
```
kubectl -n kafka exec -it my-cluster-kafka-0 -- bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --all-groups
```

Output of sender:
```
...
sender-5d9458ccf9-7t4tm sender Emitting event #2600. Remaining time (in seconds): 3.454
sender-5d9458ccf9-7t4tm sender Emitting event #2700. Remaining time (in seconds): 2.43
sender-5d9458ccf9-7t4tm sender Emitting event #2800. Remaining time (in seconds): 1.414
sender-5d9458ccf9-7t4tm sender Emitting event #2900. Remaining time (in seconds): 0.393
sender-5d9458ccf9-7t4tm sender Stopped sending messages.
sender-5d9458ccf9-7t4tm sender Sleeping for 5 seconds to finalize message sending.
sender-5d9458ccf9-7t4tm sender In 30 seconds, tried to send 2940 messages
sender-5d9458ccf9-7t4tm sender Success:2940
sender-5d9458ccf9-7t4tm sender Errors:0
sender-5d9458ccf9-7t4tm sender Starting to sleep now
```

Output of receiver:
```
...
receiver-7649b9bdf6-p5tgb receiver Received message: {"hello":"2936"} with index extracted 2936
receiver-7649b9bdf6-p5tgb receiver Received message: {"hello":"2937"} with index extracted 2937
receiver-7649b9bdf6-p5tgb receiver Received message: {"hello":"2938"} with index extracted 2938
receiver-7649b9bdf6-p5tgb receiver Received message: {"hello":"2939"} with index extracted 2939
receiver-7649b9bdf6-p5tgb receiver Received message: {"hello":"2940"} with index extracted 2940
receiver-7649b9bdf6-p5tgb receiver Receiving duration has passed!
receiver-7649b9bdf6-p5tgb receiver Total received message count: 2778
receiver-7649b9bdf6-p5tgb receiver Latest message index: 2940
receiver-7649b9bdf6-p5tgb receiver Missing messages count: 162
receiver-7649b9bdf6-p5tgb receiver Missing messages: 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162
receiver-7649b9bdf6-p5tgb receiver Duplicate messages: {}
```




## OLD INFO

Create receiver, channel, subscription:

```bash
k apply -f config/100-receiver.yaml
k apply -f config/200-kafka-channel.yaml
k apply -f config/300-subscription.yaml
```

Start watching receiver logs:

```
stern receiver
```

Create sender and start watching logs:

```
k apply -f config/400-sender.yaml
stern sender
```

It will crash, that's fine.

Create the sinkBinding, which will make the sender send the messages to KafkaChannel.

```
k apply -f config/500-sender-sinkbinding.yaml
```

Sender will send messages for N minutes. You have N mins to kill pods and create chaos.

```
while kubectl delete pods -n knative-eventing -l messaging.knative.dev/role=dispatcher & sleep 1; do :; done
```

Restart

```

k delete -f config/500-sender-sinkbinding.yaml
k delete -f config/400-sender.yaml
k delete -f config/300-subscription.yaml
k delete -f config/200-kafka-channel.yaml
k delete -f config/100-receiver.yaml


k apply -f config/100-receiver.yaml
k apply -f config/200-kafka-channel.yaml
k apply -f config/300-subscription.yaml
k apply -f config/400-sender.yaml
k apply -f config/500-sender-sinkbinding.yaml
```
