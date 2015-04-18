ItemKNNprivacyJS
================

# install

With [**npm**](http://npmjs.org) do:
``` bash
$ npm install
```
from the project directory.

To compile `lib/libDiscreteLogC.so` on Linux/Solaris/etc.:
``` bash
$ cd lib
$ gcc -std=c99 -Wall -shared -fPIC -fopenmp logDiscreteRho.c -o libDiscreteLogC.so -lgmp -lcrypto -L/usr/local/lib
```

You need the [**gmp**](https://gmplib.org/) and [**openmp**](http://openmp.org/wp/) libraries installed on your system.

# usage

To start the web sever application with  [**nodejs**](http://nodejs.org/):
``` bash
$ node app.js
```
To start the browser client go [here](http://localhost:3002/client.html)
#test 

To test the discrete log module in `libDiscreteLogC.so` do:
``` bash
$ mocha test_pollard.js
```
