'use strict';

var args = require('args')

args
    .option('lport', 'The http port', 9080)
    .option('port', 'The http port', 3000)
    .option('protocol', 'The mqtt protocol', 'ssl')
    .option('host', 'The mqtt host', "localhost")
    .option('username', 'The mqtt username', "username")
    .option('password', 'The mqtt password', "password")

const flags = args.parse(process.argv)

if (flags.port) {
    console.log(`Remote port ${flags.port}`)
}

if (flags.host) {
    console.log(`Remote host ${flags.host}`)
}

var mqtt = require('mqtt');

/**
 * remote connect
 */
var remote = mqtt.connect({
    "host": `${flags.host}`,
    "port": `${flags.port}`,
    "protocol": `${flags.protocol}`,
    "username": `${flags.username}`,
    "password": `${flags.password}`
});

remote.on('connect', function () {
    console.log('Remote running ...');
});

const got = require('got');
const crypto = require('crypto');

var express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    port = `${flags.lport}`;

app.use(bodyParser.json());

app.post('/*', function (req, res) {
    // Publish
	hook(req, res);
});

var server = app.listen(port, function () {

    var host = server.address().address
    var port = server.address().port

    console.log('Webhook listening at http://%s:%s', host, port)
});

process.on('uncaughtException', function (message) {
    console.log(message);
    if (!remote.connected) remote.reconnect()
});

function hook(req, res) {
    var body = req.body;
    remote.publish('/' + req.params[0], JSON.stringify(req.body, "", "\t"))

    // Return result
    res.json(req.body);
}
