var net = require('net');
var hl7 = require('hl7');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var http = require("http");

var VT = String.fromCharCode(0x0b);
var FS = String.fromCharCode(0x1c);
var CR = String.fromCharCode(0x0d);

function MLLPServer(host, port, logger) {

    var self = this;
    this.message = '';
    var HOST = host || '127.0.0.1';
    var PORT = port || 6969;
    logger = logger || console.log;

    var Server = net.createServer(function (sock) {

        logger('Connection established......: ' + sock.remoteAddress + ':' + sock.remotePort);

        function ackn(data, ack_type) {
            //get message ID
            var msg_id = data[0][10];

            var header = [data[0]];

            //switch around sender/receiver names
            header[0][3] = data[0][5];
            header[0][4] = data[0][6];
            header[0][5] = data[0][3];
            header[0][6] = data[0][4];

            var result = hl7.serializeJSON(header);
            result = result + "\r" + "MSA|" + ack_type + "|" + msg_id;

            return result;
        }

        sock.on('data', function (data) {
            data = data.toString();
            //strip separators
            logger("DATA:\nfrom " + sock.remoteAddress + ':\n' + data.split("\r").join("\n"));
            if (data.indexOf(VT) > -1) {
                self.message = '';
            }

            self.message += data.replace(VT, '');
            if (data.indexOf(FS + CR) > -1) {
                self.message = self.message.replace(FS + CR, '');
                var data2 = hl7.parseString(self.message);
                logger("Message:\r\n" + self.message + "\r\n\r\n");
                //POST this data to the converter
                let data_array = self.message.split("\r")
                let t, t_name
                let data_json = '{'
                for(value of data_array) {
                    var v = value.split("|")
                    var header = v[0].toLowerCase()
                    if(data_json == '{') {
                       // data_json += '"' + v[0].toLowerCase() + '": "' + value + '"'
			            data_json += '"' + v[0].toLowerCase() + '": "' + value.replace("&", "\\&") + '"'
                    } else if (header == 'obx'){
                        t = v[3]
                        t_name = t.split("^")
                        if(t_name[0] == "S.GR")
                           t_name[0]= "SGR"
                       // data_json += ', "' + t_name[0].toLowerCase() + '": "' + value.replace("\\S\\3", "S3") + '"'
                        //data_json += ', "' + t_name[0].toLowerCase() + '": "' + v[5] + '"'
                        data_json += ', "' + "obx_" + t_name[0].toLowerCase() + '": "' + value.replace("\\S\\3", "S3") + '"'
                    } else if (header == 'obr'){
                        t = v[4]
                        t_name = t.split("^")
                        if(t_name[0] == "CBC B")
                           t_name[0]= "CBC_B"
                        data_json += ', "' + "obr_" + v[1] + '": "' + value + '"'
                    } else if ((header == 'pid') || (header == 'pv1') || (header == 'orc')){
                        data_json += ', "' + v[0].toLowerCase() + '": "' + value + '"'
                    }

                }
                data_json += '}'
                // An object of options to indicate where to post to
                console.log('Data Json\n' + data_json)
                
                var post_options = {
                    host: '192.168.0.163',
                    port: '3001',
                    path: '/labresult',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(data_json)
                    }
                };
                // Set up the request
                var post_req = http.request(post_options, function(res) {
                    res.setEncoding('utf8');
                    res.on('data', function (chunk) {
                        console.log('Response : ' + chunk);
                    });
                });
                // post the data
                post_req.write(data_json);
                //post_req.write(JSON.parse(data_json));
                post_req.end();         
                self.emit('hl7', self.message);
                var ack = ackn(data2, "AA");
                sock.write(VT + ack + FS + CR);
            }
        });

        sock.on('end', function () {
            logger('Server disconnected.....: ' + sock.remoteAddress + ' ' + sock.remotePort);
        });

    });

    self.send = function (receivingHost, receivingPort, hl7Data, callback, retries = 4) {
        var sendingClient = new net.connect({
           host: receivingHost,
           port: receivingPort
        }, function () {
            logger('Sending data to ' + receivingHost + ':' + receivingPort);
            logger(VT + hl7Data + FS + CR);
            sendingClient.write(VT + hl7Data + FS + CR);
        });

        var _terminate = function () {
            logger('closing connection with ' + receivingHost + ':' + receivingPort);
            sendingClient.end();
        };

        sendingClient.on('data', function (rawAckData) {
            logger('raw ack data', rawAckData);
            logger(receivingHost + ':' + receivingPort + ' ACKED data');

            var ackData = rawAckData
                .toString() // Buffer -> String
                .replace(VT, '')
                .split('\r')[1] // Ack data
                .replace(FS, '')
                .replace(CR, '');
            logger('processed raw ack data', ackData);
            callback(null, ackData);
            _terminate();
        });

        sendingClient.on('error', function (error) {
            logger(receivingHost + ':' + receivingPort + ' couldn\'t process data');
            if(retries > 0) {
                self.send(receivingHost, receivingPort, hl7Data, callback, retries-1)
            } else {
                callback(error, null);
                _terminate();
            }
        });
    };

    Server.listen(PORT, HOST,function(){ console.log('MLLP server started listening on ...' + HOST + ':' + PORT);} );
}

util.inherits(MLLPServer, EventEmitter);

exports.MLLPServer = MLLPServer;
