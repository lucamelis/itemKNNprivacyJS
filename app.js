var express = require('express');
//var sjcl = require("./sjcl.js");
var BigInteger = require("./index.js");
var dec = require("./BNdecryption.js");

var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var fs = require('fs');
var port = 3002;

server.listen(port, function () {
  console.log('--Server listening at port %d', port);
});


app.use(express.static(__dirname + '/public'));

Array.prototype.vectorMultMod = function(other,p) { 
	for(var i = 0; i < this.length; i++) {
		var it = this[i];	
		this[i] = it.multiply( new BigInteger( other[i] ) ).mod( p )
	} 
    return this;
    };

function getRandomInt(max) {
    return Math.floor(Math.random() * (max + 1)) ;
}

function setup(file_path){

	var params = JSON.parse( fs.readFileSync(file_path) );
	
	params.g = new BigInteger(params.g);
	params.p = new BigInteger(params.p);
	params.samples = params.n_prog*params.n_prog/2;
	var intP = parseInt( params.p.toString( ) );
	//generating shares 
	for (var i= 0; i < (params.n_cli - 1) ; i++){
		var k = getRandomInt( Math.round( intP / params.n_cli ) );   
		params.shares.push(k)
	}
	var sum = 0;
	params.shares.forEach(function(val) {
	  sum += val;
	})
	params.shares.push(intP - sum)
	
	return params;
}


var clients = [ ] ;

var sockets = [ ];

var params = setup("data/data.json")


var i = 0, j = 0;
var aggregate = {'table': [ ],'width' : 0,'depth':0};   

//heartbeat options 
io.set('heartbeat interval', 30*60*Math.pow(10,3)); //30 minutes
io.set('heartbeat timeout', 4*30*60*Math.pow(10,3)); //1hour

io.sockets.on("connection", function (socket) {
    
    socket.on('add-user', function(data){
	    if (params.n_cli == i){
	    	io.sockets.connected[socket.id].emit("too-many-connections","null");
	    	socket.disconnect();
	    	return;
	    }
	    
	    clients[data.username] = {
	      "socket":	socket.id,
	      "share":	params.shares[i++]
	    };
	    
	    sockets.push(socket.id);
	    
	    var client_params = {"g" : params.g.toString(),
			"p" : params.p.toString(),
			"share" : clients[data.username].share.toString(),
			"accuracy" : params.accuracy, 
			"probIncorrect" : params.probIncorrect,
			"samples" : params.samples
			};
	    
	    //send the share
	    console.log("\t Added user id",socket.id)
	    io.sockets.connected[clients[data.username].socket].emit("share",{"data" : client_params });
	    
    }
    );
  
  
    socket.on('user-view', function(data){
	    j++
	    console.log("--User view received from",socket.id)
	    if (!aggregate.table.length){
	    	aggregate = data.sketch;
	    	aggregate.table = aggregate.table.map(function(a) { return new BigInteger(a);});
	    	}
	    else{    	
		aggregate.table = aggregate.table.vectorMultMod(data.sketch.table,params.p);
		}
		if ( j == params.n_cli ){
			var sketch_params = 
		    		{"accuracy" : params.accuracy, 
				"probIncorrect" : params.probIncorrect,
				"samples" : params.samples
				};
			console.log("--Decryption phase..")
			//var $l = 1;
			var start = new Date().getTime();
			aggregate.table = aggregate.table.map(function(a){
				//process.stdout.write("\t" + $l++ + "-th element decrypted\r");
				return dec.solve_discrete_alg(params.g,a,params.p); 
				})
			var end = new Date().getTime();
			console.log("\n--Whole sequence decrypted! in",(end - start),'milliseconds')
			
			sockets.forEach(function(sock){
				io.sockets.connected[sock].emit("model",{"params": sketch_params ,"data" : aggregate});
				console.log("--Decrypted data sent to the client",sock);
			})
		}
	});

	//Removing the socket on disconnect
	socket.on('disconnect', function() {
		console.log("--Socket disconnected:",socket.id)
	  	for(var name in clients) {
	  		if(clients[name].socket === socket.id) {
	  			delete clients[name];
	  			delete sockets[sockets.indexOf(socket.id)]
	  			break;
	  		}
	  	}	
	  })
	
});

