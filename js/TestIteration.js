
// Dependencies:
//  searsia.js
//  Test.js
//  ResultSet.js
var TestIteration = (function() {
    
    var _; // Instance. Use '_' instead of 'this'.
    
    // *********************** Private properties. ***************************************
    var t,
        results,
        queries = [],
        sIDs = [], // server IDs
        rIDs = [],  // resource IDs
        iterator = {
            max: null,
            current: 0,
            indices: []
        }
    ;
    
    // *********************** Constructor. **********************************************
    var TestIteration = function(testObject) {
        _ = this;
        
        t = testObject;
        queries = t.getTestQueryStrings();
        sIDs = Object.keys(t.settings.servers);
        rIDs = Object.keys(t.settings.resources);

        results = new ResultSet(t.settings.servers, t.settings.resources);
        
        iterator.indices = buildIndicesList();
        iterator.max = iterator.indices.length - 1;
    }
    
    // *********************** Public properties. ****************************************


    
    // *********************** Public methods. *******************************************
    
    TestIteration.prototype.start = function() {
        execute();
    };
    
    TestIteration.prototype.isComplete = function() {
        return iterator.current >= iterator.max;
    };
    
    TestIteration.prototype.getResultSet = function() {
        return results;
    }

    // *********************** Private methods. ******************************************
    
    var execute = function() {
        
        // Don't continue if the test isn't running.
        if (!t.hasStatus(Test.RUNNING) || _.isComplete()) {
            return;
        }

        var server = sIDs[iterator.indices[iterator.current].s];
        var resource = rIDs[iterator.indices[iterator.current].r];
        var query  = queries[iterator.indices[iterator.current].q];
        
        var requestTime = new Date().getTime();
        $.ajax({
            url: fillUrlTemplate(t.getSearchTemplate(server), query, resource),
            success: function(responseData) {
                results.add(query, server, resource, requestTime, responseData);
                next();
            },
            error: function(xhr, options, err) {
                // Ignore result and continue.
                //results.addError(query, server, resource, requestTime, responseData);
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
        iterator.current++;
        t.updateIterationProgress(iterator.current / iterator.max);
        
        if (_.isComplete()) {
            end();
            return;
        }
        
        window.setTimeout(execute, t.settings.delay);
    },

    end = function() {
        t.iterationEnded(_);
    }
    
    ;
    return TestIteration;
}());

