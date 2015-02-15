ItemKNNprivacyJS
================

# install

With [npm](http://npmjs.org) do:
``` bash
$ npm install
```
from the project directory.

To compile `libDiscreteLogC.so` on Linux/Solaris/etc.:

``` bash
$ gcc -Wall -shared -fPIC -fopenmp logDiscreteRho.c -o libDiscreteLogC.so -lgmp -L/usr/local/lib
```

You need the [**gmp**](https://gmplib.org/) and [**openmp**](http://openmp.org/wp/) libraries properly installed on your system.

# usage

To start the web sever application with  [**nodejs**](http://nodejs.org/)
``` bash
$ node app.js
```

#test 

To test the discrete log module in `libDiscreteLogC.so` do:
``` bash
$ mocha test_pollard.js
```
