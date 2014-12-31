var BigInteger = require("./index.js");

function new_xab(d,alpha,beta,y,g,p,P){
	
	var one = new BigInteger('1');
	var two = one.add(one);
	
	switch ( d%3 ){
		case 0: d = d.multiply(d).mod(P);				alpha = alpha.multiply(two).mod(p);	
			beta = beta.multiply(two).mod(p); 	break
		case 1: d = d.multiply(g).mod(P);	alpha = alpha.add(one).mod(p);			break;
		case 2: d = d.multiply(y).mod(P);	beta = beta.add(one).mod(p);			break;	
	}
	
	return {d: d, alpha: alpha,beta: beta};
}

function solve_discrete_alg(g,y,P){
	
	//case g==y
	if (g.equals(y)) return 1;
	
	var p = P.subtract(new BigInteger('1')).divide(new BigInteger('2'));

	var x = new BigInteger('1'), a = new BigInteger('0'), b = new BigInteger('0');
	var X = x.clone(), A = a.clone(), B = b.clone();
	
	var params = {};
		for (var i = 1; i < ( p.intValue() - 1); i++){
			//slow
			var params = new_xab(x,a,b,y,g,p,P);
			x = params.d; a = params.alpha ; b = params.beta;
		
			//fast
			params = new_xab(X,A,B,y,g,p,P);
			X = params.d; A = params.alpha ; B = params.beta
			params = new_xab(X,A,B,y,g,p,P);
			X = params.d; A = params.alpha ; B = params.beta;
		
			//console.log( "%d  %d %d %d  %d %d %d", i, x, a, b, X, A, B );
			if ( x.intValue() == X.intValue() ) {
				//console.log("Number of steps:",i);
				break;
			}
		}

	sb = b.subtract(B).mod(p);
	if ( sb.intValue() == 0 ) throw "Decryption Failure";
	sa = A.subtract(a);
	
  	var result = sa.multiply(sb.modInverse(p)).mod(p).intValue();
  	return result
}

exports.solve_discrete_alg = solve_discrete_alg;

//var beta = Math.pow(2,50) % 1019;
//var g = new BigInteger('2');
//var y  = new BigInteger( beta.toString() );
//var P = new BigInteger('1019');


//console.log(solve_discrete_alg(g,y,P))



