/**
 * Copyright (c) 2014-2020 Intel Corporation
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
var { Kafka, logLevel } = require('kafkajs'),
    config = require('../../../config'),
    logger = require('../../../lib/logger').init(),
    rules = require("../../../iot-entities/postgresql/rules"),
    kafkaProducer = null,
    kafkaAdmin = null,
    syncCheckTimer = null;

var send = async function() {
    if (kafkaProducer) {
        return kafkaProducer.send({
            topic: config.drsProxy.kafka.topicsRuleEngine,
            messages: [{key: "", value: "updated"}]
        })
        .catch(async (e) => {
            logger.error("Error while sending to topic " + topic + " error: " + e);
            await kafkaProducer.disconnect();
        });
    }
};

exports.notify = async function () {
    if ( syncCheckTimer != null ) {
        clearInterval(syncCheckTimer);
        syncCheckTimer = null;
    }

    if ( kafkaProducer === null ) {
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
      });
      try {
          kafkaProducer = kafka.producer();
          kafkaAdmin    = kafka.admin();
      } catch (exception) {
          logger.error("Exception occured creating Kafka Producer: " + exception);
      }
      await kafkaProducer.connect();
      await kafkaAdmin.createTopics({
        topics: [{topic: config.drsProxy.kafka.topicsRuleEngine, replicationFactor: config.drsProxy.kafka.replication }]
      });
    }
    send();
};
