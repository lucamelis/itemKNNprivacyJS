#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <gmp.h>
#include <limits.h>
#include <sys/time.h>

#include <openssl/ec.h>
#include <openssl/bn.h>
#include <openssl/obj_mac.h> // for NID_secp256k1

#define POLLARD_SET_COUNT 16

#if defined(WIN32) || defined(_WIN32)
#define EXPORT __declspec(dllexport)
#else
#define EXPORT
#endif

#define MAX_RESTART 100

int ec_point_partition(const EC_GROUP *ecgrp, const EC_POINT *x) {	
	
	size_t len = EC_POINT_point2oct( ecgrp, x, POINT_CONVERSION_UNCOMPRESSED, NULL, 0, NULL );
  	unsigned char ret[len]; 
  	EC_POINT_point2oct( ecgrp, x, POINT_CONVERSION_UNCOMPRESSED, ret, len, NULL );

	int id = ( ret[len - 1] & 0xFF ) % POLLARD_SET_COUNT;
	
	return id;
}

// P generator 
// Q result*P
// order of the curve
// result
//Reference: J. Sattler and C. P. Schnorr, "Generating random walks in groups"

int elliptic_pollard_rho_dlog(const EC_GROUP *group, const EC_POINT *P, const EC_POINT *Q, const BIGNUM *order, BIGNUM *res) {
	
	printf("Pollard rho discrete log algorithm... \n");
	
	BN_CTX* ctx;
    ctx = BN_CTX_new();

	int i, j;
	int iterations = 0;

	if ( !EC_POINT_is_on_curve(group, P, ctx ) || !EC_POINT_is_on_curve(group, Q, ctx ) ) return 1;

	EC_POINT *X1 = EC_POINT_new(group);
	EC_POINT *X2 = EC_POINT_new(group);

	BIGNUM *c1 = BN_new();
	BIGNUM *d1 = BN_new();
	BIGNUM *c2 = BN_new();
	BIGNUM *d2 = BN_new();
	
	BIGNUM* a[POLLARD_SET_COUNT];
	BIGNUM* b[POLLARD_SET_COUNT];
	EC_POINT* R[POLLARD_SET_COUNT];
	
	BN_zero(c1); BN_zero(d1);
	BN_zero(c2); BN_zero(d2);


	for (i = 0; i < POLLARD_SET_COUNT; i++) {	

		a[i] = BN_new();
		b[i] = BN_new();
		R[i] = EC_POINT_new(group);

		BN_rand_range(a[i], order);		
		BN_rand_range(b[i], order);
				
		// R = aP + bQ

		EC_POINT_mul(group, R[i], a[i], Q, b[i], ctx);
		//ep_norm(R[i], R[i]);
	}

	BN_rand_range(c1, order);		
	BN_rand_range(d1, order);		


	// X1 = c1*P + d1*Q
	EC_POINT_mul(group, X1, c1, Q, d1,  ctx);  
	//ep_norm(X1, X1);

	BN_copy(c2, c1);
	BN_copy(d2, d1);
	EC_POINT_copy(X2, X1);


	double work_time = (double) clock();
	do {
		j = ec_point_partition(group, X1);
		EC_POINT_add(group, X1, X1, R[j], ctx);

		BN_mod_add(c1, c1, a[j], order, ctx); 
		
		BN_mod_add(d1, d1, b[j], order, ctx); 
		
		for (i = 0; i < 2; i++) {
			j = ec_point_partition(group, X2);

			EC_POINT_add(group, X2, X2, R[j], ctx);

			BN_mod_add(c2, c2, a[j], order, ctx); 
			
			BN_mod_add(d2, d2, b[j], order, ctx);
		}
		
		iterations++;
		printf("Iteration %d \r",iterations );
	} while ( EC_POINT_cmp(group, X1, X2, ctx) != 0 ) ;
	

	printf("\n ");

	work_time = ( (double) clock() - work_time ) / (double)CLOCKS_PER_SEC;

	printf("Number of iterations %d %f\n",iterations, work_time );

	BN_mod_sub(c1, c1, c2, order, ctx);
	BN_mod_sub(d2, d2, d1, order, ctx);

	if (BN_is_zero(d2) == 1) return 1;
	

	//d1 = d2^-1 mod order	
	BN_mod_inverse(d1, d2, order, ctx);
			
	BN_mod_mul(res, c1, d1, order, ctx);

	for (int k = 0; k < POLLARD_SET_COUNT; ++k) {
		BN_free(a[k]); 
		BN_free(b[k]);
		EC_POINT_free(R[k]);
	}
	BN_free(c1); BN_free(d1);
	BN_free(c2); BN_free(d2);
	EC_POINT_free(X1); EC_POINT_free(X2);

	BN_CTX_free(ctx);
	return 0;
}


EXPORT char ** array_elliptic_pollard_rho(char **strPtr, int length, int id) { 
  // check that the size is large enough, and that the
  // arr pointer is not null, use the return value to
  // signal errors
	const EC_POINT *g;
	BIGNUM * ord = BN_new(); 
	
	int i = 0;
	
	char ** res_str_array = malloc(length * sizeof(char*));

	// create group
	EC_GROUP *ecgrp = EC_GROUP_new_by_curve_name( id );

	g = EC_GROUP_get0_generator( (const EC_GROUP *) ecgrp);
	
	printf("%s\n",EC_POINT_point2hex(ecgrp, g,POINT_CONVERSION_UNCOMPRESSED, NULL ) );

	EC_GROUP_get_order(ecgrp, ord, NULL);

	#pragma omp parallel
	{
		BIGNUM *alpha = BN_new(); 
		EC_POINT *beta = EC_POINT_new(ecgrp);
		int res = 1;
			#pragma omp for private(i)
			for (i = 0; i < length; i++){

				res_str_array[i] = NULL;

				EC_POINT_hex2point(ecgrp, strPtr[i], beta, NULL);

				res = elliptic_pollard_rho_dlog(ecgrp, g, beta, ord, alpha);

				if (res) 
					res_str_array[i] = "NULL";
				else
					res_str_array[i] = BN_bn2hex(alpha);
			}
		BN_free(alpha);
		EC_POINT_free(beta);
	}
	
	EC_GROUP_free( ecgrp );

	return res_str_array; // asume 0 is OK, use enums or defines for that
}




EXPORT char * urandom_read(int byte_count){
	FILE *fp;
	char * data = (char*) malloc(byte_count * sizeof(char));
	fp = fopen("/dev/urandom", "r");
	fread(data, 1, sizeof(data)	, fp);
	fclose(fp);
	return data;
}

void random_uniform_mpz(mpz_t* res, mpz_t n){
		
	char * a = urandom_read(20);
	mpz_import(*res, 20, 1, sizeof(a[0]), 0, 0, a);
	mpz_mod(*res, *res, n);

	free(a);
}

EXPORT char * urandom_uniform(char * n_str){
	mpz_t uInt, n;
	mpz_init(uInt);
	mpz_init(n);
	char * result = NULL;

	mpz_init_set_str(n, n_str, 16);
	
	char * a = urandom_read(20);
	mpz_import(uInt, 20, 1, sizeof(a[0]), 0, 0, a);
	mpz_mod(uInt, uInt, n);
	
	result = mpz_get_str(result,16,uInt);
	
	free(a);

	mpz_clear(uInt);
	mpz_clear(n);
	return result;
}

 void new_xab( mpz_t* x, mpz_t* a, mpz_t* b,mpz_t ord, mpz_t P, mpz_t g, mpz_t beta) {
	mpz_t tmp;
	mpz_init(tmp);
	int partition = mpz_mod_ui(tmp, *x, 3);

	 switch ( partition ) {
		 case 0: 
			mpz_mul(*x,*x,g);
			mpz_mod(*x,*x,P); 
			
			mpz_add_ui(*a,*a,1);
			mpz_mod(*a,*a,ord); 

			break;
		 case 1: 
			mpz_mul(*x,*x,*x);
			mpz_mod(*x,*x,P); 

			mpz_mul_ui(*a,*a,2);
			mpz_mod(*a,*a,ord);

			mpz_mul_ui(*b,*b,2);
			mpz_mod(*b,*b,ord);
			
			break;		 		 
		 case 2: 
			mpz_mul(*x,*x,beta);
			mpz_mod(*x,*x,P); 
			
			mpz_add_ui(*b,*b,1);
			mpz_mod(*b,*b,ord);

			break;		 
	}
 
	 mpz_clear(tmp);
 }
 
 int discrete_pollard_rho(mpz_t *res, mpz_t g, mpz_t beta, mpz_t ord, mpz_t P) {
	 
 	if (mpz_cmp_si(beta,0) == 0){
 		mpz_init_set_ui(*res,0);
 		return 0;
 	}

	 mpz_t x, a, b;
	 mpz_t X, A, B;
	 mpz_t r, n;
	 mpz_t d;
	 mpz_init(d);

	 int k = 0;
	 mpz_init(r);
	 mpz_init(n);

	 mpz_init_set_ui(x,1);
	 mpz_init_set_ui(a,0);
	 mpz_init_set_ui(b,0);
	 
	 mpz_init_set_ui(X,1);
	 mpz_init_set_ui(A,0);
	 mpz_init_set_ui(B,0);
	
	//skip the random initialization the first time 
	goto START;
	
	 //if the first initialization fails to find the Dlog
	 //then RESTART with a randomized initialization		
	RESTART:
		k++;
		//avoid infinite loops
		if(k == MAX_RESTART)
			return 1;
		 //randomized initialization
		 mpz_t temp;
		 mpz_init(temp);

		 random_uniform_mpz(&temp,ord);
		 mpz_init_set(a,temp);
		 
		 random_uniform_mpz(&temp,ord);
		 mpz_init_set(b,temp);
		 
		 mpz_powm(x,g,a,P);
		 mpz_powm(temp,beta,b,P);
		 mpz_mul(x,x,temp);
		 mpz_mod(x,x,P);
		 
		 mpz_init_set(X,x);
		 mpz_init_set(A,a);
		 mpz_init_set(B,b);

		 mpz_clear(temp);
	 
	START:;

	 int i= 1;	

	 for (i = 1; i < (mpz_get_ui(P) - 1); ++i ) {
		 new_xab( &x, &a, &b, ord, P, g, beta );
		 new_xab( &X, &A, &B, ord, P, g, beta ); 
		 new_xab( &X, &A, &B, ord, P, g, beta ); 
		 //gmp_printf( "%3d  %Zd %Zd %Zd  %Zd %Zd %Zd\n", i, x, a, b, X, A, B );
		 if ( mpz_cmp(x,X) == 0 ) break;
	 }

	 mpz_sub(r,B,b);
	 mpz_mod(r,r,ord);

	 if (mpz_cmp_si(r,0) == 0 ) 
		goto RESTART;
	
	 mpz_sub(n,a,A);
	 mpz_mod(n,n,ord);

	 do{
		 mpz_gcd(d,r,ord);
		 int is_divisible = mpz_divisible_p(n,d);
		 int is_gcd_one = mpz_cmp_si(d,1);
		 
		 if (is_gcd_one == 0)
			break;
		 if( is_divisible > 0 ){
			mpz_divexact(n,n,d);
			mpz_mod(n,n,ord);

			mpz_divexact(r,r,d);
			mpz_mod(r,r,ord);
			
			mpz_divexact(ord,ord,d);

		 } else {
			return 1;
		 }
	}while(1);

	 mpz_invert(r,r,ord);
	 mpz_mul(*res,n,r);
	 mpz_mod(*res,*res,ord);

	 mpz_clear(n); mpz_clear(r); mpz_clear(d); 
	 mpz_clear(X); mpz_clear(A); mpz_clear(B);
	 mpz_clear(x); mpz_clear(a); mpz_clear(b);
	 
	 return 0;
}



EXPORT char ** array_discrete_pollard_rho(char **strPtr, int length, char * g_str, char * ord_str , char * P_str ) { 
  // check that the size is large enough, and that the
  // arr pointer is not null, use the return value to
  // signal errors
	mpz_t g, ord, P;
	mpz_init_set_str(g, g_str, 10 );
	mpz_init_set_str(ord, ord_str, 10 );
	mpz_init_set_str(P, P_str, 10 );
	int i = 0;
	
	char ** res_str_array = malloc(length * sizeof(char*));

	#pragma omp parallel
	{
		mpz_t alpha, beta;
		mpz_init(alpha);
		mpz_init(beta);
		int res = 1;
			#pragma omp for private(i)
			for (i = 0; i < length; i++){

				res_str_array[i] = NULL;

				mpz_init_set_str(beta, strPtr[i], 10);

				res = discrete_pollard_rho(&alpha, g, beta, ord, P);

				if (res) 
					res_str_array[i] = "NULL";
				else
					res_str_array[i] = mpz_get_str(res_str_array[i], 10, alpha);
			}
		mpz_clear(alpha);
		mpz_clear(beta);
	}
	return res_str_array; // asume 0 is OK, use enums or defines for that
}


EXPORT char * random_safe_prime(int n_bits){
	int is_prime = 0;
	mpz_t p,randomInt;
	gmp_randstate_t r_state;
	
	mpz_init(randomInt);
	mpz_init(p);
	
	char * result = NULL;

	gmp_randinit_mt(r_state);		
	gmp_randseed_ui (r_state, time(0));
	mpz_urandomb(randomInt,r_state,n_bits);

	do{		
		mpz_nextprime(p,randomInt);
		
		mpz_init_set(randomInt,p);

		mpz_mul_ui(p,p,2);
		mpz_add_ui(p,p,1);
		
		is_prime = mpz_probab_prime_p(p,25);		
	} while ( (is_prime == 0) ) ;

	result = mpz_get_str(result,10,p);

	mpz_clear(randomInt);
	mpz_clear(p);
	gmp_randclear(r_state);

	return result;
} 

EXPORT char * generator_group_modP(char * p_str,int n_bits){
	mpz_t ord,g,p,check1,check2;
	mpz_init(check1);
	mpz_init(check2);
	mpz_init(g);
	mpz_init(ord);


	mpz_init_set_str(p, p_str, 10 );

	//mpz_sub_ui(p,p,1);
	//mpz_divexact_ui(p,p,2);
	
	gmp_randstate_t r_state;
	char * result = NULL;

	struct timeval tval;

	mpz_sub_ui(ord,p,1);
	mpz_divexact_ui(ord,ord,2);
	
	do{
		gmp_randinit_mt(r_state);		
		
		//seed with microseconds
		gettimeofday(&tval, NULL);
		gmp_randseed_ui (r_state, tval.tv_usec);

		mpz_urandomb(g,r_state,n_bits);

		mpz_powm_sec(check1,g,ord,p);
		mpz_powm_ui(check2,g,2,p);
		
	} while( !( mpz_cmp_ui(check1,1) == 0 && mpz_cmp_ui(check2,1) > 0 ) );

	result = mpz_get_str(result,10,g);

	gmp_randclear(r_state);
	mpz_clear(check1);
	mpz_clear(check2);
	mpz_clear(g);
	mpz_clear(p);
	mpz_clear(ord);

	return result;
}
