	var assert = require('assert'); 
	var elliptic = require("elliptic");
	var bn = require("bn.js");
	
	var p256 = elliptic.curves.p256;
	var curve = p256.curve;

	var g = curve.g;
	var ffi = require('ffi')
	var ref = require('ref')
	var ArrayType = require('ref-array');

	var charPtr = ref.refType('char');
	var StringArray = ArrayType('string');


	var libDiscreteLogC = ffi.Library('./libDiscreteLogC', {
	  'urandom_uniform' : ['string' , [ 'string' ] ],
	} )		
	
	var N = 2;
	var L = 392;
	
	// dealer key generation
	var X = [ ];
	var Y = [ ];
	for (var i = 0; i < N; i++) {
		do{	
			var x = new bn( libDiscreteLogC.urandom_uniform(curve.n.toString()).toString(), 10).toRed(bn.red());   		
			var y = g.mul(x)
		} while(y.isInfinity())
		
		X.push( x );
		Y.push( y );		
	}

	var shares = Y.map(function(a, idx, arr){ var tmp = arr.slice(0); tmp[idx] = curve.zero ; return tmp;})	
	
	var kl_array = [ ];
	for (var i = 0; i < N; i++) {
		var sub_array = [ ];
		var Y = shares[i];
		var x_i = X[i];
		var idx = Y.indexOf(curve.zero);
		for (var l = 0; l < L; l++) {					
			var kil = Y.reduce( function(sum, y, j) {
				var H = (idx!=j ? new bn( p256.hash().update( y.mul(X[idx]).toJSON().toString(16) + l.toString() ).digest('hex'), 16).toRed(bn.red()) : curve.zero );
				return sum.add( (idx > j ? H.neg() : H ) )  } , curve.zero );			
			sub_array.push(kil);		
		};
		
		kl_array[i] = sub_array;
	};
	
	console.log(kl_array);
	describe("Shared keys", function() {
		
		it("should sum up to zero accross all " + N + " users", function() {
			idx = 0;				
			for (var l = 0; l < L; l++) {
				var sum = kl_array.reduce( function(a, b){return a.add( b[idx] );}, curve.zero );
				idx++
				assert.equal(sum.toString(),curve.zero.toString());
			};
		})

	})