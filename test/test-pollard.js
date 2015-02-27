	var assert = require('assert'); 


	var BigInteger = require("../index.js");
	var ffi = require('ffi')
	var ref = require('ref')
	var ArrayType = require('ref-array');

	var charPtr = ref.refType('char');
	var StringArray = ArrayType('string');


	var libDiscreteLogC = ffi.Library('./libDiscreteLogC', {
	  'array_discrete_pollard_rho': [ StringArray, [ StringArray, 'int', 'string' ,'string','string']  ],
	  'random_safe_prime' : ['string', [ 'int' ] ],
	  'generator_group_modP' : ['string', [ 'string','int' ] ],
	  'urandom_uniform' : ['string' , [ 'string' ] ],
	  'urandom_read' : [ 'string', [ 'int' ] ]
	} )


	var n_bits = 16;
	var modulus = new BigInteger( libDiscreteLogC.random_safe_prime(n_bits) );
	var g = new BigInteger( libDiscreteLogC.generator_group_modP( modulus.toString(), 2) );

	var one = BigInteger.ONE;
	var order = modulus.subtract(one).divide(one.add(one));

	var foo = [ ];
	N = 700 //order.toString();
	for (var i = 0; i <= N; i++) {
		foo.push( new BigInteger( i.toString() ) );
	}

	var input = foo.map( function(i){ return g.modPow(i,modulus).toString();} );
	var length = input.length;

	describe("Pollard Rho test on integers", function() {
	
	it("should find the discrete log of a list of "+ N +" integers", function() {
		
		this.timeout(5000);

		//input length g order modulo
		var output = libDiscreteLogC.array_discrete_pollard_rho(input, length, 
																g.toString() , order.toString(), modulus.toString() );
		output.length = length;														 
		output = output.toArray();

		var compare = foo.map( function(i){ return output[i] == i } ) ;

		assert( compare.reduce( function(a, b) { return a && b } ) );
	})
});
