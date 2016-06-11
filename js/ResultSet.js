
// Dependencies:
//  searsia.js
//  Test.js
//  TestIteration.js
var ResultSet = function(pServers, pResources) {    
    var _ = this; // Instance. Use '_' instead of 'this'.
    
    // *********************** Private properties. ***************************************
    var raw = [],
        results = {
            /**
             * Format:      results.accuracy[resource].property
             * Properties:  amountAccurate, amountInaccurate, accuracy
             * Use key _overall instead of a resource to get the data of that server.
             */
            accuracy: {},
            
            /**
             * Format:      results.responseTime[server][resource].property
             * Properties:  sum, amount (of datapoints), avg (average)
             * Use key _overall instead of a resource to get the data of that server.
             */
            responseTime: {},
            
            /**
             * Format:      results.responseTimeRatio[server][server]
             */
            responseTimeRatio: {},
            
            /**
             * Format:      results.temporalResponseTime[requestTime][server].property
             * Properties:  responseTime, updatedAvg (average with this response time included)
             */
            temporalResponseTime: {}
        },
        servers = {},
        resources = {},
        
        /**
         * Format: responseData[key].serverResponses[] = response data;
         * where key is the queryID and the resource concatenated. 
         */
        responseData = {},
        
        processed = true
    ;
    
    // *********************** Public properties. ****************************************
    
    // *********************** Constructor. **********************************************
    
    function constructor(pServers, pResources) {
        servers = pServers;
        resources = pResources;
        
        resetResults();
    }

    
    // *********************** Public methods. *******************************************
    
    
    _.add = function(queryID, query, server, resource, requestTime, responseData) {
        raw.push({
            query:          query,
            server:         server,
            resource:       resource,
            requestTime:    requestTime,
            responseTime:   new Date().getTime() - requestTime
        });
        storeResponseData(responseData, queryID, server, resource);
        processed = false;
    };
    
    _.getRawResults = function() {
        return raw;
    };

    _.getResults = function() {
        if (!processed) {
            processResults();
        }
        return results;
    };
    
    _.getResults1 = function() {
        return this.results1;
    };
    
    _.appendResultSet = function(resultSet) {
        
        // Make sure both result sets are processed.
        var rs = resultSet.getResults();
        if (!processed) {
            processResults();
        }
        
        // Response times.
        for (var s in servers) {
            for (var r in resources) {
                results.responseTime[s][r].sum    += rs.responseTime[s][r].sum;
                results.responseTime[s][r].amount += rs.responseTime[s][r].amount;
                results.responseTime[s][r].avg     = results.responseTime[s][r].sum / results.responseTime[s][r].amount;
            }
            results.responseTime[s]._overall.sum    += rs.responseTime[s]._overall.sum;
            results.responseTime[s]._overall.amount += rs.responseTime[s]._overall.amount;
            results.responseTime[s]._overall.avg = 
                results.responseTime[s]._overall.sum / results.responseTime[s]._overall.amount;
        }
        $.extend(true, results.temporalResponseTime, rs.temporalResponseTime);
        analyzeResponseTimeRatios();
        
        // Accuracies.
        for (var r in resources) {
            results.accuracy[r].amountAccurate   += rs.accuracy[r].amountAccurate;
            results.accuracy[r].amountInaccurate += rs.accuracy[r].amountInaccurate;
            results.accuracy[r].accuracy =
                results.accuracy[r].amountAccurate /
                (results.accuracy[r].amountAccurate + results.accuracy[r].amountInaccurate);
        }
        results.accuracy._overall.amountAccurate   += rs.accuracy._overall.amountAccurate;
        results.accuracy._overall.amountInaccurate += rs.accuracy._overall.amountInaccurate;
        results.accuracy._overall.accuracy =
            results.accuracy._overall.amountAccurate /
            (results.accuracy._overall.amountAccurate + results.accuracy._overall.amountInaccurate);
    };
    
    _.isProcessed = function() {
        return processed;
    }


    // *********************** Private methods. ******************************************
    
    var processResults = function() {
        resetResults();
        
        analyzeResponseTimes();
        analyzeResponseTimeRatios();
        analyzeAccuracy();
        
        processed = true;
    },
    
    resetResults = function() {
        results.accuracy = { _overall: {
            amountAccurate:     0,
            amountInaccurate:   0,
            accuracy:           null
        }};
        results.responseTime = {};
        results.temporalResponseTime = {};
        for (var r in resources) {
            results.accuracy[r] = {
                amountAccurate:     0,
                amountInaccurate:   0,
                accuracy:           null
            };
            for (var s in servers) {
                results.responseTime[s] = results.responseTime[s] || {_overall: {sum: 0, amount: 0, avg: 0}};
                results.responseTime[s][r] = {sum: 0, amount: 0, avg: 0};
            }
        }
        for (var s1 in servers) {
            results.responseTimeRatio[s1] = results.responseTimeRatio[s1] || {};
            for (var s2 in servers) {
                results.responseTimeRatio[s1][s2] = results.responseTimeRatio[s1][s2] || null;
            }
        }
    },
    
    analyzeResponseTimes = function() {
        for (var i = 0; i < raw.length; i++) {
            var s = raw[i].server;
            var r = raw[i].resource;
            results.responseTime[s][r].sum += raw[i].responseTime;
            results.responseTime[s][r].amount++;
            results.responseTime[s][r].avg = results.responseTime[s][r].sum / results.responseTime[s][r].amount;
            results.responseTime[s]._overall.sum += raw[i].responseTime;
            results.responseTime[s]._overall.amount++;
            results.responseTime[s]._overall.avg = 
                results.responseTime[s]._overall.sum / results.responseTime[s]._overall.amount;

            results.temporalResponseTime[raw[i].requestTime] = results.temporalResponseTime[raw[i].requestTime] || {};
            results.temporalResponseTime[raw[i].requestTime][s] = {
                responseTime: raw[i].responseTime,
                updatedAvg:   results.responseTime[s]._overall.avg 
            };
        }
    },
    
    analyzeResponseTimeRatios = function() {
        for (var s1 in servers) {
            for (var s2 in servers) {
                if (s1 === s2) { continue; }
                results.responseTimeRatio[s1][s2] = 
                    results.responseTime[s1]._overall.avg / results.responseTime[s2]._overall.avg;
            }
        }
    },
    
    analyzeAccuracy = function() {
        for (var k in responseData) {
            var r = responseData[k].resource;
            if (Object.keys(responseData[k].serverResponses).length === Object.keys(servers).length) {
                if (equalValues(responseData[k].serverResponses)) {
                    results.accuracy[r].amountAccurate++;
                    results.accuracy._overall.amountAccurate++;
                } else {
                    results.accuracy[r].amountInaccurate++;
                    results.accuracy._overall.amountInaccurate++;
                }
                results.accuracy[r].accuracy =
                    results.accuracy[r].amountAccurate /
                    (results.accuracy[r].amountAccurate + results.accuracy[r].amountInaccurate);
                results.accuracy._overall.accuracy =
                    results.accuracy._overall.amountAccurate /
                    (results.accuracy._overall.amountAccurate + results.accuracy._overall.amountInaccurate);
            }
        }
    },
    
    storeResponseData = function(pResponseData, queryID, server, resource) {
        var key = queryID + "-" + resource;
        
        responseData[key] = responseData[key] || { resource: resource, serverResponses: [] };
        responseData[key].serverResponses.push(pResponseData);
    },
    
    // If any value is null or undefined, false is returned.
    equalValues = function(a) {
        var equal = true;
        var baselineData = JSON.stringify(a[0]);
        for (var i = 1; i < a.length; i++) {
            if (typeof a[i] === "undefined" || a[i] === null || JSON.stringify(a[i]) !== baselineData) {
                equal = false;
            }
        }
        return equal;
    }
    
    ;
    constructor(pServers, pResources);
};

