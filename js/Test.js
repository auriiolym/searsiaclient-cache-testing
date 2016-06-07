
// Dependencies:
//  searsia.js
//  TestIteration.js
//  ResultSet.js
var Test = function(pSettings) {
    var _ = this;
    
    // *********************** Private properties. ***************************************
    var servers,
        resources,
        queries = [],
        confirmedResources = 0,
        status,
        resultSet
    ;
    
    // *********************** Public properties. ****************************************
    
    _.startTime = null;
    
    _.runtimeTimer = null;
    
    _.iterations = [];
    
    _.settings = {};
    
    // *********************** Constructor. **********************************************
    function constructor(ppSettings) {
        applySettings(ppSettings);
        resultSet = new ResultSet(servers, resources);
        $.ajaxSetup({
            type: "GET",
            timeout: 10000,
            dataType: 'json'
        });
    }
    
    // *********************** Public methods. *******************************************
    _.start = function() {
        checkResources();
    };
    
    /**
     * Return a complete resource object, built up from the resourceTemplate and resources settings.
     *
     * @param rid   string  the resource identifier
     * @return      object  the resource object
     */
    _.getResourceObject = function(rid) {
        return $.extend(true, {}, _.settings.resourceTemplate,
            { resource: { id: rid } },
            { resource: resources[rid] }
        );
    };

    _.getSearchTemplate = function(server) { 
        return servers[server] + "search?q={q?}&r={r?}";
    };
    
    _.incrementQueryCount = function(server) {
        $("#test-queries2server-"+server).html(parseInt($("#test-queries2server-"+server).html()) + 1);
        $("#test-queries").html(parseInt($("#test-queries").html()) + 1);
    };
    
    _.getTestQueryStrings = function() {
        return queries;
    };
    
    _.hasStatus = function(statusCheck) {
        return status === statusCheck;
    };
    
    _.iterationEnded = function(testIteration) {
        //TODO: check if results are right.
        console.log("Results of iteration " + _.iterations.length + ": ", testIteration.getResultSet().getResults());
        
        includeIterationResults(testIteration);
        startNewIteration();
    };
    
    _.updateIterationProgress = function(fraction) {
        outputCurrentIterationCompletion(Math.round(fraction * 100, 0));
    }

    // *********************** Private methods. ******************************************
    
    var applySettings = function(pSettings) {
        _.settings = pSettings || {};
        _.settings = {
            queryAmount:      _.settings.queryAmount      || 25,
            queryBase:        _.settings.queryBase        || "Query" + new Date().getTime(),
            runTime:          _.settings.runTime          || 30,
            delay:            _.settings.delay            || 200,
            servers:          _.settings.servers          || {sv1: "http://localhost:16842/searsia/"},
            resourceTemplate: _.settings.resourceTemplate || {resource:{},searsia:"v0.4.0"},
            resources:        _.settings.resources        || {}
        };
        
        // Shorthands.
        resources = _.settings.resources;
        servers   = _.settings.servers;
        
        outputSettings();
    },
    
    buildQueryStrings = function() {
        for (var i = 1; i <= _.settings.queryAmount; i++) {
            queries.push(_.settings.queryBase + i);
        }
    },
    
    getResourceCheckTemplate = function(server) { return servers[server] + "search?r={r?}"; },
    getUpdateTemplate        = function(server) { return servers[server] + "update/"; },
    
    checkResources = function() {
        for (var r in resources) {
            for (var s in servers) {
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
        if (confirmedResources !== Object.keys(servers).length * Object.keys(resources).length) {
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
        var id = _.iterations.length;
        testIteration.start();
        
        outputNewRunningIteration(id);
    },
    
    includeIterationResults = function(testIteration) {
        resultSet.appendResultSet(testIteration.getResultSet());
        
        outputNewIterationResults(testIteration);
        outputTestResults();
    },
    
    finishTest = function() {
        window.clearInterval(_.runtimeTimer);
        setStatus(Test.FINISHED);
        
        if (!_.iterations[_.iterations.length - 1].isComplete()) {
            console.log("Results of unfinished iteration " + _.iterations.length + ": ", _.iterations[_.iterations.length - 1].getResultSet().getResults());
            includeIterationResults(_.iterations[_.iterations.length - 1]);
            // This should happen in any case.
        }
        
        console.log("Test results: ", resultSet.getResults());
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
    
    outputResults = function(pResultSet, $tbody) {
        var results = pResultSet.getResults()
        
        $tbody.html('');
        
        var $row1 = $('<tr><td colspan="'+(Object.keys(servers).length+1)+'">Average response times</td><td>Accuracy</td></tr>');
        var $row2 = $('<tr><td /></tr>');
        for (var s in servers) {
            $row2.append("<td>"+s+"</td>");
        }
        $row2.append("<td />")
        $tbody.append($row1).append($row2);
        
        for (var r in resources) {
            var $row = $("<tr><td>"+r+"</td></tr>");
            for (var s in servers) {
                $row.append("<td>"+Math.round(results.responseTime[s][r].avg)+"</td>");
            }
            $row.append("<td>"+Math.round(results.accuracy[r].ratio * 100)+"%</td>");
            $tbody.append($row);
        }
        var $row = $("<tr><td>overall</td></tr>");
        for (var s in servers) {
            $row.append("<td>"+Math.round(results.responseTime[s]._overall.avg)+"</td>");
        }
        $row.append("<td>"+Math.round(results.accuracy._overall.ratio * 100)+"%</td>");
        $tbody.append($row);
        
        //TODO: add response time ratio (between different servers) table.
    },
    
    outputTestResults = function() {
        outputResults(resultSet, $('#test-results tbody').first());

        var results = resultSet.getResults();
        var $t = $('<table />');
        var $row1 = $('<tr><td>Resp. time ratio</td></tr>');
        for (var s in servers) {
            $row1.append('<td>'+s+'</td>');
        }
        $t.append($row1);
        for (var s1 in servers) {
            var $row = $('<tr><td>'+s1+'</td></tr>');
            for (var s2 in servers) {
                var ratio = s1 == s2 ? '-' : (results.responseTime[s1]._overall.avg / results.responseTime[s2]._overall.avg).toFixed(2); 
                $row.append('<td>'+ratio+'</td>')
            }
            $t.append($row);
        }
        $("#test-results-resptimeratio").html($t);
    },
    
    outputNewRunningIteration = function(id) {
        var $t = $('<table id="test-iterationresults-'+id+'"><caption>Iteration #'+id+' (<span id="test-iterationresults-'+id+'-completion">0</span>%)</caption><tbody></tbody></table>');
        $("caption", $t).css("white-space", "nowrap");
        $("tbody", $t).hide();
        $("caption", $t).click(function() {
            $(this).siblings("tbody").toggle();
        });
        $('#test-iterationresults').prepend($t);
    },
    
    outputNewIterationResults = function(testIteration) {
        var id = _.iterations.length;
        $('tbody', $('#test-iterationresults-'+(id-1))).hide();
        
        outputResults(testIteration.getResultSet(), $('#test-iterationresults-'+id+' tbody'));
    },
    
    outputCurrentIterationCompletion = function(percentage) {
        var id = _.iterations.length;
        $('#test-iterationresults-'+id+'-completion').html(percentage);
    }
    
    
    ;
    constructor(pSettings);
};

Test.NOTSTARTED = 0;
Test.RUNNING = 1;
Test.ABORTED = 2
Test.FINISHED = 3;


