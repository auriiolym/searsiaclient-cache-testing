
// Dependencies:
//  searsia.js
var Test = (function() {
    
    var _; // Instance. Use '_' instead of 'this'.
    
    // *********************** Private properties. ***************************************
    var servers,   ss,
        resources, rs,
        queries = [],
        confirmedResources = 0,
        status,
        results
    ;
    
    // *********************** Constructor. **********************************************
    var Test = function(settings) {
        _ = this;
        
        applySettings(settings);
        
        results = new ResultSet(servers, resources);
    
        // Set default request settings.
        $.ajaxSetup({
            type: "GET",
            timeout: 10000,
            dataType: 'json'
        });
    }
    
    // *********************** Public properties. ****************************************
    Test.prototype.settings = {};
    
    Test.prototype.startTime = null;
    
    Test.prototype.runtimeTimer = null;
    
    Test.prototype.iterations = [];
    
    // *********************** Public methods. *******************************************
    Test.prototype.start = function() {
        checkResources();
    };
    
    /**
     * Return a complete resource object, built up from the resourceTemplate and resources settings.
     *
     * @param rid   string  the resource identifier
     * @return      object  the resource object
     */
    Test.prototype.getResourceObject = function(rid) {
        return $.extend(true, {}, _.settings.resourceTemplate,
            { resource: { id: rid } },
            { resource: rs[rid] }
        );
    };

    Test.prototype.getSearchTemplate = function(server) { 
        return ss[server] + "search?q={q?}&r={r?}";
    };
    
    Test.prototype.incrementQueryCount = function(server) {
        $("#test-queries2server-"+server).html(parseInt($("#test-queries2server-"+server).html()) + 1);
        $("#test-queries").html(parseInt($("#test-queries").html()) + 1);
    };
    
    Test.prototype.getTestQueryStrings = function() {
        return queries;
    };
    
    Test.prototype.hasStatus = function(statusCheck) {
        return status === statusCheck;
    };
    
    Test.prototype.iterationEnded = function(testIteration) {
        includeIterationResults(testIteration);
        startNewIteration();

        //TODO: results aren't right.
        console.log("Iteration results:", testIteration.getResultSet().getResults());
    };
    
    Test.prototype.updateIterationProgress = function(fraction) {
        outputCurrentIterationCompletion(Math.round(fraction * 100, 0));
    }

    // *********************** Private methods. ******************************************
    
    var applySettings = function(settings) {
        settings = settings || {};
        _.settings = {
            queryAmount:      settings.queryAmount      || 25,
            queryBase:        settings.queryBase        || "Query" + new Date().getTime(),
            runTime:          settings.runTime          || 30,
            delay:            settings.delay            || 200,
            servers:          settings.servers          || {sv1: "http://localhost:16842/searsia/"},
            resourceTemplate: settings.resourceTemplate || {resource:{},searsia:"v0.4.0"},
            resources:        settings.resources        || {}
        };
        
        // Shorthands.
        resources = rs = _.settings.resources;
        servers   = ss = _.settings.servers;
        
        outputSettings();
    },
    
    buildQueryStrings = function() {
        for (var i = 1; i <= _.settings.queryAmount; i++) {
            queries.push(_.settings.queryBase + i);
        }
    },
    
    getResourceCheckTemplate = function(server) { return ss[server] + "search?r={r?}"; },
    getUpdateTemplate        = function(server) { return ss[server] + "update/"; },
    
    checkResources = function() {
        for (var r in rs) {
            for (var s in ss) {
                checkResource(s, r);
            }
        }
    },
    
    checkResource = function(server, resource) {
        $.ajax({
            url: fillUrlTemplate(_.getSearchTemplate(server), "", resource),
            success: function() { confirmResourceExistence(); },
            error:   function() { tryToAddResource(server, resource); }
        });
        _.incrementQueryCount(server);
    },
    
    confirmResourceExistence = function() {
        confirmedResources++;
        tryToStartTest();
    },
    
    tryToAddResource = function(server, resource) {
        $.ajax({
            url: getUpdateTemplate(server) + resource, 
            type: 'PUT',
            contentType: 'application/searsia+json; charset=utf-8',
            data: JSON.stringify(_.getResourceObject(resource)),
            success: function() { 
                console.log("Resource " + resource + " was added to server " + server + ".");
                confirmResourceExistence(); 
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log("Update failed.\n" + jqXHR.status + " " + jqXHR.statusText + ".\n");
                console.log(jqXHR.responseJSON);
                // Now the test won't be started because confirmResourceExistence() isn't called.
            }
        });
        _.incrementQueryCount(server);
    },
    
    // Start test if the preconditions are met. 
    tryToStartTest = function() {
        // Check if all resources are confirmed on the servers.
        if (confirmedResources !== Object.keys(ss).length * Object.keys(rs).length) {
            return;
        }
        startTest();
    },
    
    setStatus = function(newStatus) {
        switch (newStatus) {
            case Test.NOTSTARTED: $('#test-status').html("not started"); break;
            case Test.RUNNING: $('#test-status').html("running"); break;
            case Test.ABORTED: $('#test-status').html("aborted"); break;
            case Test.FINISHED: $('#test-status').html("finished"); break;
        }
        status = newStatus;
    },
    
    startTest = function() {
        buildQueryStrings();
        _.startTime = new Date().getTime();
        
        // Start timer. If the run time has passed, it shuts down the test.
        _.runtimeTimer = window.setInterval(function(){
            $('#test-runtime').html(Math.round((new Date().getTime() - _.startTime) / 1000));
            $('#test-completion').html(Math.round(Math.round((new Date().getTime() - _.startTime) / 1000) / _.settings.runTime * 100) + "%");
            if (new Date().getTime() >= _.startTime + _.settings.runTime * 1000) {
                finishTest();
            }
        }, 1000);
        
        setStatus(Test.RUNNING);
        startNewIteration();
    },
    
    startNewIteration = function() {
        if (!_.hasStatus(Test.RUNNING)) {
            return;
        }
        var testIteration = new TestIteration(_);
        _.iterations.push(testIteration);
        testIteration.start();
    },
    
    includeIterationResults = function(testIteration) {
        results.appendResultSet(testIteration.getResultSet());
        
        outputNewIterationResults(testIteration);
        outputTestResults();
    },
    
    finishTest = function() {
        window.clearInterval(_.runtimeTimer);
        setStatus(Test.FINISHED);
        
        if (!_.iterations[_.iterations.length - 1].isComplete()) {
            includeIterationResults(_.iterations[_.iterations.length - 1]);
            // This should happen in any case.
        }
    },
    abortTest = function() {
        window.clearInterval(_.runtimeTimer);
        setStatus(Test.ABORTED);
    },
    
    outputSettings = function() {
        $("#test-setting-runtime").html(_.settings.runTime + " seconds");//TODO: replace this with minutes, hours, etc.
        $("#test-settings-queries").html(_.settings.queryAmount);
        $('#test-setting-delay').html(_.settings.delay);
        
        for (s in servers) {
            $("#test-queries2servers").after(
                $("<tr><td>Queries to server "+s+"</td><td id=\"test-queries2server-"+s+"\">0</td></tr>")
            );
        }
        $("#test-queries2servers").remove();
    },
    
    outputNewIterationResults = function(testIteration) {
        
    },
    
    outputTestResults = function() {
        var is = Object.keys(servers).length;
        var res = results.getResults();
        var $t = $('#test-results tbody');
        $t.html('');
        
        $row1 = $('<tr><td colspan="'+(is+1)+'">Response times</td><td>Accuracy</td></tr>');
        $row2 = $("<tr><td /></tr>");
        for (var s in servers) {
            $row2.append("<td>"+s+"</td>");
        }
        $row2.append("<td />")
        $t.append($row1).append($row2);
        
        for (var r in resources) {
            var $row = $("<tr><td>"+r+"</td></tr>");
            for (var s in servers) {
                $row.append("<td>"+Math.round(res.responseTime[s][r].avg)+"</td>");
            }
            $row.append("<td>"+Math.round(res.accuracy[r].ratio * 100)+"%</td>");
            $t.append($row);
        }
        var $row = $("<tr><td>overall</td></tr>");
        for (var s in servers) {
            $row.append("<td>"+Math.round(res.responseTime[s]._overall.avg)+"</td>");
        }
        $row.append("<td>"+Math.round(res.accuracy._overall.ratio * 100)+"%</td>");
        $t.append($row);
        
        //TODO: add response time ratio (between different servers) table.
        
    },
    
    outputCurrentIterationCompletion = function(percentage) {
        
    }
    
    
    ;
    return Test;
}());

Test.NOTSTARTED = 0;
Test.RUNNING = 1;
Test.ABORTED = 2
Test.FINISHED = 3;



