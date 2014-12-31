var sjcl = require("./sjcl.js");
//var dec = require("./decryption.js")

Array.prototype.vectorMultMod = function(other,p) { 
	for(var i = 0; i < this.length; i++) {
		console.log(i)
		var it = new sjcl.bn(this[i]);	
		this[i] = it.mulmod(new sjcl.bn(other[i]), p )
	} 
    return this;
    };
    
Array.prototype.bisect = function (val) {
    var idx;
    if (this.length === 0) {
        return 0;
    }
    for (idx=0; idx < this.length; idx++) {
        if (val < this[idx]) {
            return idx;
        }
    }
    return idx;
};

    
function sample_zpfian(n,alpha){	    
	var tmp = [ ]
	for (var i=1; i<n+1 ; i++ )
	    	tmp.push( 1 / Math.pow(i,alpha) )    	
	var zeta = tmp.reduce(function(a,b){ return a.concat( a[a.length -1 ] + b)    } , [0] );
	
	var dist =  zeta.map( function(a){ return a / zeta[n] } );
	var sample = [ ];
	
	for (var i = 0; i < n ; i++ ) 
		sample.push( dist.bisect ( Math.random() ) ) 
	
	return sample; 
}    
    

function isPrimitiveRoot(g, p) {
        //return true if g is primitive root of p
        var o = new sjcl.bn(1),
            k = g.powermod(o, p);
        while (k > 1) {
            o.add(1);
            k = k.mulmod(g,p);
        }
        if (o == (p -1)) {
            return true;
        }
        return false;
    };

//g = new sjcl.bn(2);
//y = new sjcl.bn(Math.pow(2,10)%1019);
//p = new sjcl.bn(1019);

console.log(sample_zpfian(25,2))


