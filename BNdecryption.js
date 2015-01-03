var BigInteger = require("./index.js");

function new_xab(x,a,b,alpha,beta,p,P){
	
	var one = BigInteger.ONE;
	var two = one.add(one);
	
	switch ( x % 3 ){
		case 0: x = x.multiply(x).mod(P);	a = a.multiply(two).mod(p);	b = b.multiply(two).mod(p); 	break;
		case 1: x = x.multiply(alpha).mod(P);	a = a.add(one).mod(p);			break;
		case 2: x = x.multiply(beta).mod(P);	b = b.add(one).mod(p);			break;	
	}
	return {x: x, a: a,b: b};
}

function solve_discrete_alg(g,y,P){
	
	//case g==y
	if (g.equals(y)) return 1;
	var one = BigInteger.ONE;
	var p = P.subtract(one).divide(one.add(one));

	var x = one, a = BigInteger.ZERO, b = BigInteger.ZERO;
	var X = x.clone(), A = a.clone(), B = b.clone();
	var intP = parseInt( p.toString( ) );
	
	var params = { };
		for (var i = 1; i < ( intP - 1); i++){
			//slow
			var params = new_xab(x,a,b,g,y,p,P);
			x = params.x; a = params.a ; b = params.b;
		
			//fast
			params = new_xab(X,A,B,g,y,p,P);
			X = params.x; A = params.a ; B = params.b
			params = new_xab(X,A,B,g,y,p,P);
			X = params.x; A = params.a ; B = params.b
		
//			console.log( "%d  %d %d %d  %d %d %d", i, x, a, b, X, A, B );
			if ( x.equals(X) ) {
				//console.log("Number of steps:",i);
				break;
			}
		}

	sb = b.subtract(B).mod(p);
	if ( sb.equals(BigInteger.ZERO)  ) throw "Decryption Failure";
	sa = A.subtract(a);
	
  	var result = parseInt( sa.multiply(sb.modInverse(p)).mod(p).toString() );
  	return result
}

exports.solve_discrete_alg = solve_discrete_alg;

// var g = new BigInteger('2');

// var P = new BigInteger('8589935363');
// var y = g.modPow(new BigInteger('12000000'),P);

// console.log(solve_discrete_alg(g,y,P))