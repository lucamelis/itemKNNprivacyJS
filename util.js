var sjcl = require("./sjcl.js");
var BigInteger = require("./public/index.js");

Array.prototype.vectorMultMod = function(other,p) { 
	for(var i = 0; i < this.length; i++) {
		console.log(i)
		var it = new sjcl.bn(this[i]);	
		this[i] = it.mulmod(new sjcl.bn(other[i]), p )
	} 
    return this;
    };


function isPrimitiveRoot(g, p) {
        //return true if g is primitive root of p
        var o = new sjcl.bn(1),
            k = g.powermod(o, p);
        while (k > 1) {
            o++;
            k = k.mulmod(g,p);
        }
        if (o.equals(p - 1)) {
            return true;
        }
        return false;
    };
   
   

function fromBnToValues(array){
	return array.map(function(a){return a.limbs[0]})
}

function BNencrypt(array,g,k,p){
	
	return array.map( function( a ){ return g.modPow( k.add( a ) , p ); } )
}    

function encrypt(array,g,k,p){
	
	return array.map( function( a ){ var e = k.add( a );console.log(e); return g.power( e ); } )
}    


var beta = Math.pow(2,1)%1019;
var g = new BigInteger('2');
var y = new BigInteger( beta.toString() );
var k = new BigInteger('-9');
var p = new BigInteger('1019');

//var g = new sjcl.bn(1);
//var y = new sjcl.bn( 3 );
//var k = new sjcl.bn( 2 );
//var p = new sjcl.bn(7);

var array = [y,y,y,y,y,y,y];

console.log(BNencrypt(array,g,k,p));
//  
//sketch.table.map( function( a ){ return new sjcl.bn(a) } )
// 
//sketch.table.map( function (a) {return   } ) 

exports.fromBnToValues = fromBnToValues;

