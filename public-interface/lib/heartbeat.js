/**
 * Copyright (c) 2014 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
var { Kafka, CompressionTypes, logLevel } = require('kafkajs'),
    config = require('../config'),
    logger = require('./logger').init(),
    rulesUpdateNotifier = require('../engine/api/helpers/rules-update-notifier'),
    heartBeatInterval = null;
//var kafkaClient = null;
var kafkaProducer = null;
var kafkaAdmin = null;

const heartbeat = (producer, partition, topic) => {
  return producer
    .send({
      topic,
      messages: [{key: "heartbeat", value:"dashboard", partition: partition}]
    })
    .then(console.log("--------------------Sending heartbeat ..."))
    .catch(async (e) => {
      logger.error("Error while sending to topic " + topic + " error: " + e);
      await kafkaProducer.disconnect();
    })
}

exports.start = function () {

    //kafkaClient = new Kafka.KafkaClient({kafkaHost: config.drsProxy.kafka.uri, requestTimeout: 5000, connectTimeout: 8000});
    var brokers = config.drsProxy.kafka.uri.split(',');
    const kafka = new Kafka({
        logLevel: logLevel.INFO,
        brokers: brokers,
        clientId: 'frontend-heartbeat',
        requestTimeout: 2000,
        retry: {
            maxRetryTime: 2000,
            retries: 1
          }
    })
    kafkaProducer = kafka.producer();//new Kafka.HighLevelProducer(kafkaClient, { requireAcks: 1, ackTimeoutMs: 500 });
    kafkaAdmin    = kafka.admin();
    const { CONNECT, DISCONNECT, REQUEST_TIMEOUT } = kafkaProducer.events

    /*kafkaClient.on('error',function(err) {
        logger.warn("Heartbeat Kafka Client reports error: " + err);
    })
    kafkaProducer.on('error', function(err) {
        logger.warn("Heartbeat Kafka Producer reports error: " + err);
    });
    kafkaProducer.on('close', function(err) {
        logger.warn("Heartbeat Kafka Producer closing: " + err);
    });*/
    const run = async () => {
        await kafkaProducer.connect()
        var topic = config.drsProxy.kafka.topicsHeartbeatName;
        var interval = parseInt(config.drsProxy.kafka.topicsHeartbeatInterval);
        var partition = 0;
        await kafkaAdmin.createTopics({
            topics: [{topic: topic}]
        })
        heartBeatInterval = setInterval( function (producer, partition, topic) {
            heartbeat(producer, partition, topic);
        }, interval, kafkaProducer, partition, topic );
        rulesUpdateNotifier.notify();
    }

    run().catch(e => console.error("Kafka runtime error " + e))

    kafkaProducer.on(DISCONNECT, e => {
        console.log(`Disconnected !!!!!!!!!: ${e.timestamp}`);
        kafkaProducer.connect();
    })
    kafkaProducer.on(CONNECT, e => console.log("Marcel533: Connected!!!!"))
    kafkaProducer.on(REQUEST_TIMEOUT, e => console.log("Marcel534: REQUEST_TIMEOUT!!!!"))
    /*kafkaProducer.on('ready', function () {
        var topic = config.drsProxy.kafka.topicsHeartbeatName;
        var interval = parseInt(config.drsProxy.kafka.topicsHeartbeatInterval);
        var partition = 0;

        kafkaProducer.createTopics([topic], true, function (error, data) {
            if (!error) {

                heartBeat(kafkaProducer, partition, topic);
                heartBeatInterval = setInterval( function (producer, partition, topic) {
                    heartBeat(producer, partition, topic);
                }, interval, kafkaProducer, partition, topic );
                rulesUpdateNotifier.notify();
            }
        });
    });*/
};

exports.stop = function () {
    if ( heartBeatInterval != null ) {
        clearInterval(heartBeatInterval);
    }
};
