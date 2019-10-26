#!/bin/bash
# script to upgrade db with sequelize migrations
cd ../iot-entities/postgresql;
npx sequelize-cli db:migrate
