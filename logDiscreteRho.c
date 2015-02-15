#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <gmp.h>
#include <limits.h>
#include <time.h>

#if defined(WIN32) || defined(_WIN32)
#define EXPORT __declspec(dllexport)
#else
#define EXPORT
#endif

#define MAX_RESTART 100

void random_uniform_mpz(mpz_t* res, mpz_t n){
	
	gmp_randstate_t r_state;
	
	gmp_randinit_mt(r_state);
	
	struct timeval tval;
	gettimeofday(&tval, NULL);	
	gmp_randseed_ui (r_state, tval.tv_usec);

	mpz_urandomm(*res, r_state, n);
	
	gmp_randclear(r_state);
}

EXPORT char * urandom_read(int byte_count){
	FILE *fp;
	char * data = (char*) malloc(byte_count * sizeof(char));
	printf("%d\n",(int)sizeof(data) );
	fp = fopen("/dev/urandom", "r");
	fread(data, 1, sizeof(data)	, fp);
	fclose(fp);
	return data;
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
	 //then restart with a randomized initialization		
	RESTART:
		k++;
		//avoid infinite loops
		if(k ==MAX_RESTART)
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


EXPORT char * random_uniform_int(char * n_str){
	mpz_t uInt, n;
	mpz_init(uInt);
	mpz_init(n);
	
	gmp_randstate_t r_state;
	char * result = NULL;
	
	mpz_init_set_str(n, n_str, 10);

	gmp_randinit_mt(r_state);
	
	struct timeval tval;
	gettimeofday(&tval, NULL);	
	gmp_randseed_ui (r_state, tval.tv_usec);

	mpz_urandomm(uInt, r_state, n);
	
	result = mpz_get_str(result,10,uInt);
	
	gmp_randclear(r_state);

	mpz_clear(uInt);
	mpz_clear(n);
	return result;
}
