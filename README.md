Searsia server tester
=====================
http://searsia.org

A custom resource script is added in searsia-customresource/index.php. This can be used to simulate fast-changing resources. The script returns the same results, optionally with a specified delay, for the same query, but only within the specified time-to-live period.

## Usage: 
1. Open `tester.html` in any text editor and edit the settings to what you want.
2. Open `tester.html` in a web browser and wait for the results to come in.

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
- queryAmount: the amount of different queries that are sent per resource-server permutation.
- runTime: the time the test runs (in seconds).
- delay: the amount of milliseconds the script waits after each request. This give the servers some time to breathe.
- servers: the servers to test. Each key corresponds to their ID and the string value is the base URL.
- resourceTemplate: the template for any resource object.
- resources: the different resources to be tested. Each key should correspond to the resource ID.

###### Dependencies:
The Searsia client javascript with jQuery included.