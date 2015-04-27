'use strict'
var assert = require('assert'); 

var ffi = require('ffi')
var ref = require('ref')
var ArrayType = require('ref-array');

var charPtr = ref.refType('char');
var StringArray = ArrayType('string');

var libDiscreteLogC = ffi.Library('./lib/libDiscreteLogC', {
  'urandom_uniform' : ['string' , [ 'string' ] ]
} )

var BN = require("bn.js");
var elliptic = require("elliptic");

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var fs = require('fs');

var port = 8080;

server.listen(port, function () {
  console.log('--Server listening at port %d..', port);
});


app.use( express.static(__dirname + '/public') );

var encode_ed_point = function(curve, point) {
	return ( point.isInfinity() ) ? [null] : [ point.toP().getY().mod(curve.two).isOdd(), point.toP().getX() ]
}

var encode_short_point = function(curve, point) {
	return ( point.isInfinity() ) ? [ null , null ] : [ point.getX() , point.getY() ]
}

var decode_ed_point = function(curve, p) {
	return (p[0] == null) ? curve.point(null,null,null) : curve.pointFromX(p[0], p[1]);
}

var decode_short_point = function(curve, p) {
	return curve.point(p[0], p[1]);
}
function check_LUT_log(h) {				
	if (params.table[h] == undefined)
		throw "Exception: Log not found"
	return params.table[h];
}

//default values for encode/decode functions
var encode_point = encode_ed_point;
var decode_point = decode_ed_point;

Array.prototype.vectorPointsAdd = function(other, curve) {
	for (var i = 0; i < this.length; i++) {
		var it = this[i];
		var p = decode_point(curve, other[i]);
		assert(p.validate());
		this[i] = it.add( p );
	} 
    return this;
};


function setup( params ){
	console.log("--Setup phase..");
		
	//chosen curve
	//params.curve = elliptic.curves.p256.curve;
	params.curve = elliptic.curves.ed25519.curve;
  	
  	params.samples = params.n_prog * params.n_prog / 2;
 
	// dealer key generation
	params.X = [ ];
	params.shares = [ ];
	for (var i = 0; i < params.n_cli; i++) {
		do{	
			var x = new BN( libDiscreteLogC.urandom_uniform(params.curve.n.toString()).toString(), 16).toRed(BN.red());   		
			var y = params.curve.g.mul(x)
		} while(y.isInfinity())
		
		params.X.push( x );
		params.shares.push( y );		
	}

	// params.shares = Y.map(function(a, idx, arr){ 
	// 	var tmp = arr.slice(0); tmp[idx] = decode_point(params.curve, [null] ) ; 
	// 	return tmp;
	// });
	
	console.log("Building the dlogs LUT..");
	var MAX_IDX = params.n_cli * 100
	params.table = new Object(MAX_IDX);
	for (var i = 0; i <= MAX_IDX; i++) {
		params.table[ encode_point(params.curve, params.curve.g.mul(new BN(i.toString(), 10)) ).toString() ] = i;
	};				

	return params;
}


var clients = [ ] ;

var sockets = [ ];

//init
var json_params = JSON.parse( fs.readFileSync("data/ec_data.json") );
var params = setup(json_params)

var userCounter = 0, viewCounter = 0;
var aggregate = {'table': [ ], 'width' : 0, 'depth':0 };   

//heartbeat options 
io.set('heartbeat interval', 2*60*Math.pow(10,3)); 
io.set('heartbeat timeout', 2*60*Math.pow(10,3)); 

var start; 
var aggregation_time = 0;

io.sockets.on("connection", function(socket) {

	function onDisconnect() {
		console.log("--Socket disconnected:",socket.id)
	  	for(var name in clients) {
	  		if(clients[name].socket === socket.id) {
	  			delete clients[name];
	  			delete sockets[sockets.indexOf(socket.id)]
	  			break;
	  		}
	  	}	
	}

	function onAddUser(data){
		    if (params.n_cli == userCounter){
		    	io.sockets.connected[socket.id].emit("too-many-connections","null");
		    	socket.disconnect();
		    	return;
		    }
		    
		    clients[data.username] = {
		      "socket":	socket.id
		    };

		    
		    sockets.push(socket.id);
		    

		    var client_params = {
  		    	"x": params.X[userCounter],
		      	"shares" : params.shares.map(function(p){ return encode_point(params.curve, p) }),
				"accuracy" : params.accuracy, 
				"probIncorrect" : params.probIncorrect,
				"samples" : params.samples,
				"n_prog" : params.n_prog
			};

		    client_params.shares[userCounter] = [null] ; 
		    
		    //send the share
		    console.log("\t Added user id",socket.id)
		    io.sockets.connected[clients[data.username].socket].emit("share",{"data" : client_params });
		    
		    //delete client params
		    client_params = null;

		    //update the user counter
		    userCounter++;
	}

	function onUserView(data){
	    
	    if ( !aggregate.table.length ){
			for (var i = data.sketch.table.length - 1; i >= 0; i--) {
				aggregate.table[i] = decode_point(params.curve, data.sketch.table[i]);
			};
	    } else{
	    	start = new Date().getTime();
			aggregate.table = aggregate.table.vectorPointsAdd(data.sketch.table, params.curve);
			aggregation_time += new Date().getTime() - start;
 		}

		aggregate.width = data.sketch.width;
		aggregate.depth = data.sketch.depth;

	    console.log("--User view received from",socket.id);
	    viewCounter++
		
		if ( viewCounter < params.n_cli ){
			return;
		}	

		console.log("\n--Aggregated sketches computed in",aggregation_time,'milliseconds');
		console.log("--Decryption phase..");
		
		start = new Date().getTime();			
		try{
			for (var i = aggregate.table.length - 1; i >= 0; i--) {
				aggregate.table[i] = check_LUT_log( encode_point(params.curve, aggregate.table[i] ).toString() );
			};	
		} 
		catch(err) { 				
			console.log(err);
			sockets.forEach(function(sock){
				io.sockets.connected[sock].disconnect();
			});

			process.exit(1);
		} 

		var decryption_time = new Date().getTime() - start;
		
		console.log("\n--Sequence decrypted in",decryption_time,'milliseconds');
		
		//sending back decrypted sketch
		var sketch_params = {
			"accuracy" : params.accuracy, 
			"probIncorrect" : params.probIncorrect,
			"samples" : params.samples
		};

		sockets.forEach(function(sock){
			io.sockets.connected[sock].emit("model",{"params": sketch_params ,"data" : aggregate});
			console.log("--Decrypted data sent to the client",sock);
		})

		//kill the web-server process
		process.exit(0);	
	}

	//add listeners
	
	//adds a new user
    socket.on('add-user', onAddUser );
  
    //aggregates and decrypts encrypted data
    socket.on('user-view', onUserView );

	//Removes the socket on disconnect
	socket.on('disconnect', onDisconnect );

});