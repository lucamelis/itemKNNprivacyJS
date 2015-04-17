BROWSERIFY ?= ./node_modules/.bin/browserify

all: public/NNclassifier.js public/count-min.js lib/logDiscreteRho.c

public/NNclassifier.js: lib/NNclassifier.js
	$(BROWSERIFY) --standalone NNclassifier $< -o $@

lib/logDiscreteRho.c: lib/logDiscreteRho.c 	
	gcc -std=c99 -Wall -shared -fPIC -fopenmp logDiscreteRho.c -o libDiscreteLogC.so -lgmp -lcrypto -L/usr/local/lib

.PHONY: all