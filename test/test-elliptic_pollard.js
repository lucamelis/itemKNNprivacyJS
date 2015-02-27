	var assert = require('assert'); 

	var BN = require("bn.js");
	var elliptic = require("elliptic");
	
	var ffi = require('ffi')
	var ref = require('ref')
	var ArrayType = require('ref-array');

	var charPtr = ref.refType('char');
	var StringArray = ArrayType('string');


	var libDiscreteLogC = ffi.Library('./libDiscreteLogC', {
	  'array_elliptic_pollard_rho': [StringArray, [ StringArray, 'int', 'int' ]  ]
	} )

	curve = elliptic.curves.p256.curve;

	var g = curve.g;
	var order = curve.n;
	
	var k = new BN("0", 10);

	var input = [ ];
	var foo = [ ];
	N = 70 //order.toString();
	for (var i = 0; i <= N; i++) {
		
		idx = new BN( i.toString(), 10); 
		foo.push(idx);

		idx = g.mul( idx.add(k) ).toJSON() ;
		idx = curve.pointFromJSON( idx );
		idx = idx.add( g.mul( order.sub( k ) ) );

		input.push(idx);
	}

	var table;	
	function check_LUT_log(h) {
		if (table == undefined) {
			table = { }
			for (var i = 0; i <= N; i++) {
				table[ g.mul(new BN( i.toString(), 10 )).toJSON() ] = i;
			};				
		}		
		if (table[h] == undefined)
			throw "Exception: log not found"
		return table[h];
	}


	//var NID_secp256k1 = 714;
	describe("LUT test on elliptic curve", function() {
	
	it("should find the discrete log of a list of "+ N + " points", function() {
		
		this.timeout(5000);

		//input length g order modulo
		//var output = libDiscreteLogC.array_elliptic_pollard_rho(input, length, NID_secp256k1);
		
		output = input.map( function(i){ return check_LUT_log( i.toJSON() );});

		//output = output.toArray();

		var compare = foo.map( function(i){ return output[i] == i } ) ;

		assert( compare.reduce( function(a, b) { return a && b } ) );
	})
});

