#!/usr/bin/python

import random
import bisect
import math


class ZipfGenerator:

    def __init__(self, n, alpha):
        # Calculate Zeta values from 1 to n:
        tmp = [1. / (math.pow(float(i), alpha)) for i in range(1, n + 1)]
        zeta = reduce(lambda sums, x: sums + [sums[-1] + x], tmp, [0])
        # Store the translation map:
        self.distMap = [x / zeta[-1] for x in zeta]

    def next(self):
        # Take a uniform 0-1 pseudo-random value:
        u = random.random()
        # Translate the Zipf variable:
        return bisect.bisect(self.distMap, u) - 1


def chunks(l, n):
    for i in xrange(0, len(l), n):
        yield l[i:i + n]


from cmsketch import Sketch
import numpy as np

from plotly.graph_objs import *

import plotly.plotly as py
py.sign_in('lucamelis', 'wuwziylws6')

n_prog = 700
n = n_prog ** 2 / 2
k = 50

delta = 10 ** -2
epsilon_values = [0.01, 0.05, 0.1]
N_REP = 10
clients = [10 ** i for i in range(2, 7)]

averages = []
std_devs = []
for epsilon in epsilon_values:
    for n_cli in clients:
        true_epsilon = np.array([])
        for iteration in range(N_REP):
            true_counters = np.zeros(n)
            estimates = np.zeros(n)

            #true_counters = np.random.geometric(p=0.3, size=n) - 1
            #true_counters = np.random.zipf( 2 , n ) - 1
            zipf = ZipfGenerator(n_cli, 2)

            sketch = Sketch(delta, epsilon, n)
            #aggregation
            for i in range(0, n):
                true_counters[i] = zipf.next()
                sketch.update(i, true_counters[i])

                #estimation
            for j in range(0, n):
                estimates[j] = sketch.query(j)

            error = abs(true_counters - estimates)

            #idx = np.argsort(true_counters)
            idx = sorted(range(len(true_counters)),
                         key=true_counters.__getitem__)

            top_k = idx[:len(true_counters) - (k + 1):-1]

            true_epsilon = np.append(true_epsilon, float(error[top_k].sum()) /
                                     (k * true_counters[top_k].sum()))
        print '--Average error for', n_cli, 'clients: (epsilon): ', true_epsilon.mean()
        print '--Std deviation error for', n_cli, 'clients: (epsilon): ', true_epsilon.std()
        averages.append(true_epsilon.mean())
        std_devs.append(true_epsilon.std())

averages_arr = list(chunks(averages, len(clients)))
std_devs_arr = list(chunks(std_devs, len(clients)))

print averages_arr

eps0 = Scatter(x=clients,
               y=averages_arr[0],
               name="$ \epsilon=" + str(epsilon_values[0]) + "$",
               error_y=ErrorY(type='data',
                              array=std_devs_arr[0],
                              visible=True))

eps1 = Scatter(x=clients,
               y=averages_arr[1],
               name="$ \epsilon=" + str(epsilon_values[1]) + "$",
               error_y=ErrorY(type='data',
                              array=std_devs_arr[1],
                              visible=True))

eps2 = Scatter(x=clients,
               y=averages_arr[2],
               name="$ \epsilon=" + str(epsilon_values[2]) + "$",
               error_y=ErrorY(type='data',
                              array=std_devs_arr[2],
                              visible=True))

data = Data([eps0, eps1, eps2])

layout = Layout(title='Top 50 items',
                xaxis=XAxis(title='Average error over top-50 items',
                            type='log',
                            autorange=True),
                yaxis=YAxis(title='Number of users (N)'))

fig = Figure(data=data, layout=layout)
plot_url = py.plot(fig, filename='sketch_err_std')

exit

#Top50 accuracy
true = Bar(x=np.arange(k), y=true_counters[top_k], name='True Counters')

est = Bar(x=np.arange(k), y=estimates[top_k], name='Estimated Counters')

data = Data([true, est])

layout = Layout(title='Top 50 items',
                yaxis=YAxis(title='Occurrences'),
                barmode='group')

fig = Figure(data=data, layout=layout)

suffix = [delta, epsilon]
plot_url = py.plot(fig, filename='Error-estimate')
