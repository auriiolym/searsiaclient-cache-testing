
// Dependencies:
//  
var ResultSet = (function() {
    
    var _; // Instance. Use '_' instead of 'this'.
    
    // *********************** Private properties. ***************************************
    var raw = [],
        results = {
            accuracy: {},            // format: [resource].amountAccurate, etc.
            responseTime: {},        // format: [server][resource].avg, etc.
            temporalResponseTime: {} // format: [server][requestTime] = response time
        },
        servers = {},
        resources = {},
        responseData = {},
        processed = true
    ;
    
    // *********************** Constructor. **********************************************
    var ResultSet = function(pServers, pResources) {
        _ = this;
        
        servers = pServers;
        resources = pResources;
    }
    
    // *********************** Public properties. ****************************************
    

    
    // *********************** Public methods. *******************************************
    
    
    ResultSet.prototype.add = function(query, server, resource, requestTime, responseData) {
        raw.push({
            query:          query,
            server:         server,
            resource:       resource,
            requestTime:    requestTime,
            responseTime:   new Date().getTime() - requestTime
        });
        storeResponseData(responseData, query, server, resource);
        processed = false;
    };
    
    ResultSet.prototype.getRawResults = function() {
        return raw;
    };

    ResultSet.prototype.getResults = function() {
        if (!processed) {
            processResults();
        }
        return results;
    };
    
    ResultSet.prototype.appendResultSet = function(resultSet) {
        
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
        $.extend(true, results.temporalResponse, rs.temporalResponse);
        
        // Accuracies.
        for (var r in resources) {

            results.accuracy[r].amountAccurate   += rs.accuracy[r].amountAccurate;
            results.accuracy[r].amountInaccurate += rs.accuracy[r].amountInccurate;
            results.accuracy[r].ratio =
                results.accuracy[r].amountAccurate /
                (results.accuracy[r].amountAccurate + results.accuracy[r].amountInaccurate);
        }
        results.accuracy._overall.amountAccurate   += rs.accuracy._overall.amountAccurate;
        results.accuracy._overall.amountInaccurate += rs.accuracy._overall.amountInaccurate;
        results.accuracy._overall.ratio =
            results.accuracy._overall.amountAccurate /
            (results.accuracy._overall.amountAccurate + results.accuracy._overall.amountInaccurate);
        
        // Raw results (minus response data).
        
        
    };
    
    ResultSet.prototype.isProcessed = function() {
        return processed;
    }


    // *********************** Private methods. ******************************************
    
    var processResults = function() {
        resetResults();
        
        analyzeResponseTimes();
        analyzeAccuracy();
        
        processed = true;
    },
    
    resetResults = function() {
        results.accuracy = { _overall: {
            amountAccurate:     0,
            amountInaccurate:   0,
            ratio:              0
        }};
        results.responseTime = {};
        results.temporalResponseTime = {};
        for (var r in resources) {
            results.accuracy[r] = {
                amountAccurate:     0,
                amountInaccurate:   0,
                ratio:              0
            };
            for (var s in servers) {
                results.responseTime[s] = results.responseTime[s] || {_overall: {sum: 0, amount: 0, avg: 0}};
                results.responseTime[s][r] = {sum: 0, amount: 0, avg: 0};
                results.temporalResponseTime[s] = results.temporalResponseTime[s] || {};
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
            
            results.temporalResponseTime[s][raw[i].requestTime] = raw[i].responseTime;
        }
    },
    
    analyzeAccuracy = function() {
        
        for (var k in responseData) {
            var r = responseData[k].resource;
            if (Object.keys(responseData[k].serverResponses).length === servers.length) {
                if (equalValues(responseData[k].serverResponses)) {
                    results.accuracy[r].amountAccurate++;
                    results.accuracy._overall.amountAccurate++;
                } else {
                    results.accuracy[r].amountInaccurate++;
                    results.accuracy._overall.amountInaccurate++;
                }
                results.accuracy[r].ratio =
                    results.accuracy[r].amountAccurate /
                    (results.accuracy[r].amountAccurate + results.accuracy[r].amountInaccurate);
                results.accuracy._overall.ratio =
                    results.accuracy._overall.amountAccurate /
                    (results.accuracy._overall.amountAccurate + results.accuracy._overall.amountInaccurate);
            }
        }
    },
    
    storeResponseData = function(pResponseData, query, server, resource) {
        var key = query + "-" + resource;
        
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
    return ResultSet;
}());

