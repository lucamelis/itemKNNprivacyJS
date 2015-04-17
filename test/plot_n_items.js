var BN = require("bn.js");
var elliptic = require("elliptic");
var countsketch = require("../public/count-min.js");
var ffi = require('ffi')
var fs = require('fs')
var libDiscreteLogC = ffi.Library('../lib/libDiscreteLogC', {
  'urandom_uniform' : ['string' , [ 'string' ] ]
} )

function check_LUT_log(h) {				
	if (params.table[h] == undefined)
		throw "Exception: Log not found"
	return params.table[h];
}

Array.prototype.vectorPointsAdd = function(other, curve) {
	for (var i = 0; i < this.length; i++) {
		var it = this[i];
		this[i] = it.add( other[i] );
	} 
    return this;
};



var encode_point = function(curve, point) {
	return ( point.isInfinity() ) ? [null] : [ point.toP().getY().mod(curve.two).isOdd(), point.toP().getX() ]
}

function generate_keys(mycurve, shares, x, L){
	var sub_array =[];
	var idx = -1;
			
	for (var i = 0; i < shares.length; i++) {
		var point = shares[i];
		if (point.isInfinity()) idx = i;
		shares[i] = encode_point(mycurve.curve, point.mul(x)).join(16); 		 	
	}; 

	console.assert(idx >= 0);
	
	for (var l = 0; l < L; l++) {					
		var kil = mycurve.curve.zero;
		for (var i = 0; i < idx; i++) {
			kil.add( new BN( mycurve.hash().update( shares[i] + l ).digest('hex')).toRed(BN.red()) );
		};
		for (var i = idx+1; i < shares.length ; i++) {
			kil.add( new BN( mycurve.hash().update( shares[i] + l ).digest('hex')).toRed(BN.red()).neg() );
		};			
		sub_array.push(kil);		
	};

	return sub_array;
}

function setup( params ){
	var build = false;
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

	params.table = { };

	if ( build ) {		
		console.log("Building the dlogs LUT..");
		var MAX_IDX = params.n_cli * 30
		//params.table = new Object(MAX_IDX);
		for (var i = 0; i <= MAX_IDX; i++) {
			params.table[ encode_point(params.curve, params.curve.g.mul(new BN(i.toString(), 10)) ).toString() ] = i;
		};				

		fs.writeFileSync("dlogs.txt", JSON.stringify(params.table) );
	
	} else {
		console.log("Reading the dlogs LUT from the file..");		
		params.table = fs.readFileSync("dlogs.txt");
		params.table = JSON.parse(params.table);
	}
	
	return params;
}


function ec_encrypt(values, keys, curve){
	
	console.assert(values.length == keys.length);
	var encrypted = [ ];
	for (var i = 0; i < keys.length; i++) {
		encrypted[i] = curve.g.mul( keys[i].add( new BN(values[i].toString(), 10) ).mod(curve.n) ); 
		//encrypted[i] = encode_point(curve, point); 			
	}

	return encrypted;
}

var plotly = require('plotly')('lucamelis','wuwziylws6');

//SETUP
var preset_params = {	
	"n_cli" : 100,
	"accuracy" : 0.1, 
	"probIncorrect" : 0.01,
	"n_prog" : 10
}

init = 100
step = 100;
fin = 1000;
N_REP = 1;

x=[];i=init;while(i <= fin ) { x.push(i); i+=step};
var data = {
	"aggregation_time" : {"x": x, "y": [ ], type: "scatter", name: "Aggregation"}, 
	"key_gen_time" : {"x": x, "y": [ ], type: "scatter", name: "Key generation"}, 
	"encryption_time": {"x": x, "y": [ ], type: "scatter", name: "Encryption"}, 
	"decryption_time"  : {"x": x, "y": [ ], type: "scatter", name: "Decryption"}  
} ;

var params = setup(preset_params);

for (var j = init; j <= fin; j += step) {
	
	params.n_prog = j;
	params.samples = params.n_prog * params.n_prog / 2;

	//CLIENT SIDE
	var sketches = [ ];

	function sample_geom(p) { return Math.ceil( Math.log( 1 - Math.random() ) / Math.log( 1 - p ) ) };

	key_gen_time = 0;
	encryption_time = 0;
	aggregation_time = 0;
	decryption_time = 0;

	console.log(j);
	for (var k = 0; k < N_REP; k++) {	
		for (var userCounter = 0; userCounter < params.n_cli; userCounter++) {
			var client_params = null;

			client_params = {
			    "x": params.X[userCounter],
			  	"shares" : params.shares.slice(0),
				"accuracy" : params.accuracy, 
				"probIncorrect" : params.probIncorrect,
				"samples" : params.samples,
				"n_prog" : params.n_prog
			};

			client_params.mycurve = elliptic.curves.ed25519;
			client_params.shares[userCounter] = client_params.mycurve.curve.point(null,null,null)

			var sketch = countsketch.createCountMinSketch(parseFloat(client_params.accuracy), 
									parseFloat(client_params.probIncorrect), parseInt(client_params.samples));

			for (var i = 0; i < client_params.n_prog; i++ )
				sketch.update(i, sample_geom(0.3) % 2 );

			var json_sketch = sketch.toJSON();
			
			start = new Date().getTime();
			var keys = generate_keys(client_params.mycurve, client_params.shares, client_params.x, json_sketch.width * json_sketch.depth);
			key_gen_time += new Date().getTime() - start;


			start = new Date().getTime();
			sketches[userCounter] = ec_encrypt(json_sketch.table, keys, client_params.mycurve.curve );
			encryption_time += new Date().getTime() - start;
			
			};


		//DECRYPTION
		var aggregate = [ ];

		start = new Date().getTime();
		aggregate = sketches[0];
		for (var i = 1; i < params.n_cli; i++) {
			aggregate = aggregate.vectorPointsAdd(sketches[i], params.curve);
		};
		aggregation_time += new Date().getTime() - start;


		decrypted = [ ];
		start = new Date().getTime();
		for (var i = aggregate.length - 1; i >= 0; i--) {
			decrypted[i] = check_LUT_log( encode_point(params.curve, aggregate[i] ).toString() );
		};	
		decryption_time += new Date().getTime() - start;

	};

	data.key_gen_time.y.push( Math.round(key_gen_time/(N_REP*params.n_cli)) );
	data.encryption_time.y.push( Math.round(encryption_time/(N_REP*params.n_cli)) );
	data.aggregation_time.y.push( Math.round(aggregation_time/(N_REP))  );
	data.decryption_time.y.push(Math.round(decryption_time/(N_REP)) ) ;

};
console.log(data);

var layout = {
	title: "Client", 
	xaxis: { title: "Number of programs" },
	yaxis: { title: "Time (ms)" }
}
var graphOptions = {layout: layout, filename: "Client_programs2", fileopt: "overwrite"};
plotly.plot([data.key_gen_time, data.encryption_time], graphOptions, function (err, msg) {
    console.log(msg);
});

var layout = {
	title: "Server", 
	xaxis: { title: "Number of programs" },
	yaxis: { title: "Time (ms)" }
}
var graphOptions = {layout: layout, filename: "Server_programs2", fileopt: "overwrite"};
plotly.plot([data.aggregation_time, data.decryption_time], graphOptions, function (err, msg) {
    console.log(msg);
});