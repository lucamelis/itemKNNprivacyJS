//server

function sample_geom(p){return Math.ceil( Math.log(1-Math.random()) / Math.log(1-p) ) };
var samples = 5000;
var createCountMinSketch = require('./count-min.js').createCountMinSketch;
var sketch = new createCountMinSketch(0.1, 0.01, samples);

for (var i = 0; i < samples; i++ )
	sketch.update(i, sample_geom(0.3)%2);
	
for (var i = 0; i < samples; i++ )
	sketch.update(i, sample_geom(0.3)%2);
	

var json_sketch = sketch.toJSON();


var net = require('net'),
    JsonSocket = require('json-socket');

//server
var port = 9808;
var server = net.createServer();
server.listen(port);
server.on('connection', function(socket) { //This is a standard net.Socket
    
    socket = new JsonSocket(socket); //Now we've decorated the net.Socket to be a JsonSocket    
    socket.on('message', function(message) {
       console.log(message);
       //socket.sendEndMessage("ok");
    });
});


var json_sketch = sketch.toJSON();

// client
var host = '127.0.0.1';
var socket = new JsonSocket(new net.Socket()); //Decorate a standard net.Socket with JsonSocket
socket.connect(port, host);
socket.on('connect', function() { //Don't send until we're connected
    
    socket.sendMessage(json_sketch);
    
    socket.on('message', function(message) {
        console.log('The result is: '+message);
    });
});



