var assert = require('assert'); 


var BigInteger = require("./index.js");
var ffi = require('ffi')
var ref = require('ref')
var ArrayType = require('ref-array');

var charPtr = ref.refType('char');
var StringArray = ArrayType('string');


var libDiscreteLogC = ffi.Library('./libDiscreteLogC1', {
  'array_discrete_pollard_rho': [ StringArray, [ StringArray, 'int', 'string' ,'string','string']  ],
  'random_safe_prime' : ['string', [ 'int' ] ],
  'generator_group_modP' : ['string', [ 'string','int' ] ],
  'random_uniform_int' : ['string' , [ 'string' ] ],
  'urandom_read' : [ 'string', [ 'int' ] ]
} )



describe("Pollard Rho test", function() {
	
	it("should find the discrete log of a list of 100 integers", function() {
		
		this.timeout(5000);

		var modulus = new BigInteger( libDiscreteLogC.random_safe_prime(16) );
		var g = new BigInteger( libDiscreteLogC.generator_group_modP( modulus.toString(), 2) );

		var one = BigInteger.ONE;
		var order = modulus.subtract(one).divide(one.add(one));

		var foo = [ ];
		N = 100 //order.toString();
		for (var i = 0; i <= N; i++) {
		   foo.push( new BigInteger( i.toString() ) );
		}

		var input = foo.map( function(i){ return g.modPow(i,modulus).toString();} );
		var length = input.length;

		//input length g order modulo
		var output = libDiscreteLogC.array_discrete_pollard_rho(input, length, 
																g.toString() , order.toString(), modulus.toString() );
		output.length = length;														 
		output = output.toArray();

		var compare = foo.map( function(i){ return output[i] == i } ) ;

		assert( compare.reduce( function(a, b) { return a && b } ) );
	})
});
