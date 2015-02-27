var assert = require('assert'); 

var ffi = require('ffi')
var ref = require('ref')
var ArrayType = require('ref-array');

var charPtr = ref.refType('char');
var StringArray = ArrayType('string');


var libDiscreteLogC = ffi.Library('./libDiscreteLogC', {
  'urandom_uniform' : ['string' , [ 'string' ] ]
} )

var express = require('express');

var bn = require("bn.js");
var elliptic = require("elliptic");

var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var fs = require('fs');


var port = 3002;

server.listen(port, function () {
  console.log('--Server listening at port %d..', port);
});


app.use(express.static(__dirname + '/public'));


function encode_point(curve, point) {
	switch (curve.type){ 
		case "edwards":
			point = point.toP();
			return ( point.isInfinity() ) ? [null] : [ point.getY().mod(curve.two).isOdd(), point.getX() ]
		default:
			return ( point.isInfinity() ) ? [ null , null ] : [ point.getX() , point.getY() ]
	}
}

function decode_point(curve, p) {
	switch (curve.type){ 
		case "edwards":
			return (p[0] == null) ? curve.point(null,null,null) : curve.pointFromX(p[0], p[1])
		default:
			return curve.point(p[0], p[1])
	}
}

Array.prototype.vectorPointsAdd = function(other, curve) {
	for (var i = 0; i < this.length; i++) {
		var it = this[i];
		var p = decode_point(curve, other[i]);
		assert(p.validate());
		this[i] = it.add( p );
	} 
    return this;
};


function setup( file_path ){
	console.log("--Setup phase..");
	var params = JSON.parse( fs.readFileSync(file_path) );
	
	//chosen curve
	params.curve = elliptic.curves.p256.curve;
	params.curve = elliptic.curves.ed25519.curve;
  	
  	params.samples = params.n_prog * params.n_prog / 2;

 	var order = params.curve.n;
 
	// dealer key generation
	params.X = [ ];
	var Y = [ ];
	for (var i = 0; i < params.n_cli; i++) {
		do{	
			var x = new bn( libDiscreteLogC.urandom_uniform(params.curve.n.toString()).toString(), 16).toRed(bn.red());   		
			var y = params.curve.g.mul(x)
		} while(y.isInfinity())
		
		params.X.push( x );
		Y.push( y );		
	}

	params.shares = Y.map(function(a, idx, arr){ 
		var tmp = arr.slice(0); tmp[idx] = decode_point(params.curve, [null] ) ; 
		return tmp;
	})	
	return params;
}


var clients = [ ] ;

var sockets = [ ];

var params = setup("data/ec_data.json")


var userCounter = 0, viewCounter = 0;
var aggregate = {'table': [ ],'width' : 0,'depth':0};   

//heartbeat options 
io.set('heartbeat interval', 2*60*Math.pow(10,3)); 
io.set('heartbeat timeout', 2*60*Math.pow(10,3)); 

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
		      	"shares" : params.shares[userCounter].map(function(p){ return encode_point(params.curve, p) }),
				"accuracy" : params.accuracy, 
				"probIncorrect" : params.probIncorrect,
				"samples" : params.samples,
				"n_prog" : params.n_prog
			};
		    
		    //send the share
		    console.log("\t Added user id",socket.id)
		    io.sockets.connected[clients[data.username].socket].emit("share",{"data" : client_params });
		    
		    //update the user counter
		    userCounter++;
	}

	function onUserView(data){
	    
	    if ( !aggregate.table.length ){
	    	aggregate.table = data.sketch.table.map(function(a) { 
	    		var p = decode_point(params.curve, a); 
	    		assert(p.validate());
	    		return p;
	    	} );
	    } else{
			aggregate.table = aggregate.table.vectorPointsAdd(data.sketch.table, params.curve);
 		}
		aggregate.width = data.sketch.width;
		aggregate.depth = data.sketch.depth;

	    console.log("--User view received from",socket.id);
	    viewCounter++
		
		if ( viewCounter < params.n_cli ){
			return;
		}	
			console.log("--Decryption phase..");

			var start = new Date().getTime();
			
			var table;
			function check_LUT_log(h){
				if (table == undefined){
					table = { }
					for (var i = 0; i <= 1000; i++) {
						table[ encode_point(params.curve, params.curve.g.mul(new bn(i.toString(), 10)) ) ] = i;
					};				
				}
				if (table[h] == undefined)
					throw "Exception: Log not found"
				return table[h];
			}
			try{
				aggregate.table = aggregate.table.map( function( item ) { 
					return check_LUT_log( encode_point(params.curve, item) ); 
				} );			
			} 
			catch(err) { 				
				console.log(err);
				sockets.forEach(function(sock){
					io.sockets.connected[sock].disconnect();
				});

				process.exit(1);
			} 
			
			var end = new Date().getTime();
			console.log("\n--Sequence decrypted in",(end - start),'milliseconds')
			
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
		
	
	}

	//adds a new user
    socket.on('add-user', onAddUser );
  
    //aggregates and decrypts encrypted data
    socket.on('user-view', onUserView );

	//Removes the socket on disconnect
	socket.on('disconnect', onDisconnect );
  

	
});