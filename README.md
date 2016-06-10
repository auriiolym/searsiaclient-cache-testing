Searsia server tester
=====================
http://searsia.org

A custom resource script is added in searsia-customresource/index.php. This can be used to simulate fast-changing resources. The script returns the same results, optionally with a specified delay, for the same query, but only within the specified time-to-live period.

## Usage: 
1. Increase your Searsia server's maximum queries per day. This can be done by increasing `org.searsia.engine.Resource.java`'s static `defaultRATE` and/or `defaultPER` fields. Rebuild the jar or make sure you can run the server in an IDE such as Eclipse.
2. Start two (or more) Searsia servers. These have to have different names (`--name` argument) and ports (`--url` argument) and need to be open (`--open` argument) for changes if they don't have the resources you want to test yet (see the next step). For more information on this, look [here](http://searsia.org/start.html).
3. Open `tester.html` in any text editor and edit the settings to what you want. Make sure you set the servers to the URLs with which you just started them.
4. Open `tester.html` in a web browser and wait for the results to come in.

## Queries:
The query strings have a few properties. They are unique for each test instance, because they include the timestamp of the test's start. They are made unique by appending an index between zero and uniqueQueries - 1. While generating the list of query strings, they are chosen at random from the list of unique queries. There are two ditribution to be chosen: uniformly and zipf. Zipf more closely resembles real world scenarios and to make the distribution even more flexible, the value of the exponent characterizing the zipf distribution (`s` in the [mathematical formula](https://en.wikipedia.org/wiki/Zipf%27s_law#Theoretical_review)) can be set (also to fractions). 

## Results:
It checks the response time. It also checks the accuracy between the servers: if the same query is sent to the same resource on different servers, the result is accurate if the results of all servers are identical.

## Workflow:
1. Check if each server has the specified resources available. If not, add them.
2. Start a TestIteration.
3. Iterate over all resource, server and (generated) query string permutations and store results.
4. Go to step 2.
5. If the run time has elapsed, stop the test.
Results are displayed and updated after each iteration and after the test ends.

## Settings:
- `uniqueQueries`: the amount of unique queries that are sent per resource-server permutation, per iteration.
- `queryAmount`: the total amount of queries that are sent per iteration. These are chosen from the list of unique queries.
- `queryDistribution`: the type of distribution among the list of query strings. Available are uniformly and zipf (default).
- `zipf_s`: the value of the exponent characterizing the [zipf distribution](https://en.wikipedia.org/wiki/Zipf%27s_law#Theoretical_review). It can be a fraction and defaults to 1.
- `runTime`: the time the test runs (in seconds).
- `delay`: the amount of milliseconds the script waits after each request. This give the servers some time to breathe.
- `servers`: the servers to test. Each key corresponds to their ID and the string value is the base URL.
- `resourceTemplate`: the template for any resource object.
- `resources`: the different resources to be tested. Each key should correspond to the resource ID.

###### Dependencies:
The Searsia client javascript with jQuery included.