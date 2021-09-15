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

Create the sinkBinding, which will make the sender send the messages to KafkaChannel.

```
k apply -f config/500-sender-sinkbinding.yaml
```

Sender will send messages for N minutes. You have N mins to kill pods and create chaos.

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
