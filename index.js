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
    if (req.params[0].startsWith('travis')) {
	travis(req, res);
    } else {
	hook(req, res);
    }
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

function hook(req) {
    var body = req.body;
    remote.publish('/' + req.params[0], JSON.stringify(req.body, "", "\t"))

    // Return result
    res.json(req.body);
}

function travis(req, res) {
    var body = req.body;
    let travisSignature = Buffer.from(req.headers.signature, 'base64');
    let payload = req.body.payload;
    let status = false;

    got('https://api.travis-ci.org/config', {
        timeout: 10000
    })
        .then(response => {
            let travisPublicKey =
                JSON.parse(response.body).config.notifications.webhook.public_key;
            let verifier = crypto.createVerify('sha1');
            verifier.update(payload);
            status = verifier.verify(travisPublicKey, travisSignature);
        })
        .catch(error => {
            remote.publish('/' + req.params[0], JSON.stringify(req.body, "", "\t"))
        })
        .then(() => {
            if (status) {
                remote.publish('/' + req.params[0], JSON.stringify(req.body, "", "\t"))
            }
            // Return result
            res.json(req.body);
        });
}
