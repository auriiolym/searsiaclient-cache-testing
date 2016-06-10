
// Dependencies:
//  searsia.js
//  Test.js
//  ResultSet.js
var TestIteration = function(testObject) {
    var _ = this; // Instance. Use '_' instead of 'this'.
    
    // *********************** Private properties. ***************************************
    
    var t,
        resultSet,
        queries = [],
        sIDs = [], // server IDs
        rIDs = [],  // resource IDs
        iterator = {
            max: null,
            current: 0,
            indices: []
        }
    ;
    
    // *********************** Public properties. ****************************************
    
    // *********************** Constructor. **********************************************
    function constructor(testObject) {
        t = testObject;
        queries = t.getTestQueryStrings();
        sIDs = Object.keys(t.settings.servers);
        rIDs = Object.keys(t.settings.resources);
    
        resultSet = new ResultSet(t.settings.servers, t.settings.resources);
        
        iterator.indices = buildIndicesList();
        iterator.max = iterator.indices.length - 1;
    }
    


    
    // *********************** Public methods. *******************************************
    
    _.start = function() {
        execute(iterator.current);
    };
    
    _.isComplete = function() {
        return iterator.current > iterator.max;
    };
    
    _.getResultSet = function() {
        return resultSet;
    }

    // *********************** Private methods. ******************************************
    
    var execute = function(currentIteration) {
        
        // Don't continue if the test isn't running.
        if (!t.hasStatus(Test.RUNNING) || _.isComplete()) {
            return;
        }

        var server = sIDs[iterator.indices[currentIteration].s];
        var resource = rIDs[iterator.indices[currentIteration].r];
        var queryID = iterator.indices[currentIteration].q;
        var query  = queries[queryID];
        
        var requestTime = new Date().getTime();
        $.ajax({
            url: fillUrlTemplate(t.getSearchTemplate(server), query, resource),
            success: function(responseData) {
                resultSet.add(queryID, query, server, resource, requestTime, responseData);
                next();
            },
            error: function(xhr, options, err) {
                // Ignore result and continue.
                //resultSet.addError(query, server, resource, requestTime, responseData);
                next();
            }
        });
        t.incrementQueryCount(server);
    },
    
    buildIndicesList = function() {
        var list = [];
        for (var i = 0; i < queries.length; i++) {
            for (var j = 0; j < rIDs.length; j++) {
                for (var k = 0; k < sIDs.length; k++) {
                    list.push({
                        q: i,
                        r: j,
                        s: k
                    });
                }
            }
        }
        return list;
    },
    
    next = function() {
        // Increase iterator.
        t.updateIterationProgress(Math.min(iterator.current, iterator.max) / iterator.max);
        iterator.current++;
        
        if (_.isComplete()) {
            end();
            return;
        }
        
        window.setTimeout(function() {
            execute(iterator.current);
        }, t.settings.delay);
    },

    end = function() {
        t.iterationEnded(_);
    }
    
    ;
    constructor(testObject);
};

