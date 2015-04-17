#!/usr/bin/env python
# encoding: utf-8

"""
cmsketch.py

An implementation of count-min sketching from the paper due to Cormode and
Muthukrishnan 2005

"""

import sys
import random
import numpy as np
import heapq

BIG_PRIME = 9223372036854775783

def random_parameter():
    return random.randrange(0, BIG_PRIME - 1)


class Sketch:
    def __init__(self, delta, epsilon, k):
        """
        Setup a new count-min sketch with parameters delta, epsilon and k

        The parameters delta and epsilon control the accuracy of the
        estimates of the sketch

        Cormode and Muthukrishnan prove that for an item i with count a_i, the
        estimate from the sketch a_i_hat will satisfy the relation

        a_hat_i <= a_i + epsilon * ||a||_1

        with probability at least 1 - delta, where a is the the vector of all
        all counts and ||x||_1 is the L1 norm of a vector x

        Parameters
        ----------
        delta : float
            A value in the unit interval that sets the precision of the sketch
        epsilon : float
            A value in the unit interval that sets the precision of the sketch
        k : int
            A positive integer that sets the number of top items counted

        Examples
        --------
        >>> s = Sketch(10**-7, 0.005, 40)

        Raises
        ------
        ValueError
            If delta or epsilon are not in the unit interval, or if k is
            not a positive integer

        """
        if delta <= 0 or delta >= 1:
            raise ValueError("delta must be between 0 and 1, exclusive")
        if epsilon <= 0 or epsilon >= 1:
            raise ValueError("epsilon must be between 0 and 1, exclusive")
        if k < 1:
            raise ValueError("k must be a positive integer")

	    self.k = k
        self.w = int(np.ceil(np.exp(1) / epsilon))
        self.d = int(np.ceil(np.log(k / delta)))
        
        self.hash_functions = [self.__generate_hash_function() for i in range(self.d)]
        self.count = np.zeros((self.d, self.w), dtype='int32')
        #self.heap, self.top_k = [], {} # top_k => [estimate, key] pairs

    def update(self, key, increment=1):
        """
        Updates the sketch for the item with name of key by the amount
        specified in increment

        Parameters
        ----------
        key : string
            The item to update the value of in the sketch
        increment : integer
            The amount to update the sketch by for the given key

        Examples
        --------
        >>> s = Sketch(10**-7, 0.005, 40)
        >>> s.update('http://www.cnn.com/', 1)

        """
        for row, hash_function in enumerate(self.hash_functions):
            column = hash_function(abs(hash(key)))
            self.count[row, column] += increment

    def getDimension(self):
    	print "rows: ",self.d
	print "columns: ",self.w
    	 		
    def query(self, key):
        """
        Fetches the sketch estimate for the given key

        Parameters
        ----------
        key : string
            The item to produce an estimate for

        Returns
        -------
        estimate : int
            The best estimate of the count for the given key based on the
            sketch

        Examples
        --------
        >>> s = Sketch(10**-7, 0.005, 40)
        >>> s.update('http://www.cnn.com/', 1)
        >>> s.query('http://www.cnn.com/')
        1

        """
        value = sys.maxint
        for row, hash_function in enumerate(self.hash_functions):
            column = hash_function(abs(hash(key)))
            value = min(self.count[row, column], value)

        return value

    def __generate_hash_function(self):
        """
        Returns a hash function from a family of pairwise-independent hash
        functions

        """
        a, b = random_parameter(), random_parameter()
        return lambda x: (a * x + b) % BIG_PRIME % self.w
