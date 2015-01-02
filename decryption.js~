var sjcl = require("./sjcl.js");

function new_xab(d,alpha,beta,y,g,p){

	switch ( d%3 ){
		case 0: d = d.mulmod(d,p);	alpha = alpha.mulmod(new sjcl.bn(2),p.sub(1));	beta = beta.mulmod(new sjcl.bn(2),p.sub(1)); 	break
		case 1: d = d.mulmod(g,p);	alpha.addM(new sjcl.bn(1),p.sub(1));								break;
		case 2: d = d.mulmod(y,p);							beta.addM(new sjcl.bn(1),p.sub(1));		break;	
	}
	
	return {d: d, alpha: alpha,beta: beta};
}

function solve_discrete_alg(g,y,p){
	
	//case g==y
	if (g.equals(y)) return 1;
	
	var x = new sjcl.bn(1), a = new sjcl.bn(0), b = new sjcl.bn(0);
	var X = x.copy(), A = a.copy(), B = b.copy();
	var params = {};
		for (var i = 1; i < (p-1); i++){
			//slow
			var params = new_xab(x,a,b,y,g,p);
			x = params.d; a = params.alpha ; b = params.beta;
		
			//fast
			params = new_xab(X,A,B,y,g,p);
			X = params.d; A = params.alpha ; B = params.beta
			params = new_xab(X,A,B,y,g,p);
			X = params.d; A = params.alpha ; B = params.beta;
		
			console.log( "%d  %d %d %d  %d %d %d", i, x, a, b, X, A, B );
			if ( x.limbs[0] == X.limbs[0] ) break;
		}

	sb = b.sub(B);
	if ( sb.limbs[0] == 0 ) throw "Decryption Failure";
	sa = A.sub(a);
	//var d_alg = (sa.limbs[0] / sb.limbs[0] ) % (p-1)
	//return d_alg;		
  return sa.mulmod( sb.inverseMod(p) , p.sub(1)).limbs[0];
}



g = new sjcl.bn(5);
y = new sjcl.bn( Math.pow(5,5)%9696566471212430903 );
p = new sjcl.bn(9696566471212430903);

console.log(solve_discrete_alg(g,y,p))

//exports.solve_discrete_alg = solve_discrete_alg;

