
// Dependencies:
//  searsia.js
//  TestIteration.js
//  ResultSet.js
//  Randomizer.js
//  Google Chart API
var Test = function(pSettings) {
    var _ = this;
    
    // *********************** Private properties. ***************************************
    var servers,
        resources,
        queries = [],
        confirmedResources = 0,
        status,
        resultSet,
        startTime = null,
        runtimeTimer = null,
        chart,
        chartDataTable = null,
        chartDataView,
        chartOptions = {
            chart: {
                title: 'Response time per server'
            },
            explorer: {},
            legend: { position: 'in' },
            //curveType: 'function',
            hAxis: { title: 'time' },
            vAxis: { title: 'response time (ms)' },
            interpolateNulls: true,
            series: [
                {color: '#3366CC'},
                {color: '#33A8CC', lineWidth: 2, lineDashStyle: [7,3]},
                {color: '#DC3912'},
                {color: '#DC8412', lineWidth: 2, lineDashStyle: [7,3]},
                {color: '#FF9900'},
                {color: '#FFD900', lineWidth: 2, lineDashStyle: [7,3]},
            ]
        }
    ;
    
    // *********************** Public properties. ****************************************
    
    _.settings = {};
    
    _.iterations = [];
    
    // *********************** Constructor. **********************************************
    function constructor(ppSettings) {
        applySettings(ppSettings);
        resultSet = new ResultSet(servers, resources);
        $.ajaxSetup({
            type: 'GET',
            timeout: 10000,
            dataType: 'json'
        });
        google.charts.load('current', {packages: ['corechart']}); // Do this only once.
        google.charts.setOnLoadCallback(outputPreparedResponseTimeChart);
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
        return servers[server] + 'search?q={q?}&r={r?}';
    };
    
    _.incrementQueryCount = function(server) {
        $('#test-queries2server-'+server).html(parseInt($('#test-queries2server-'+server).html()) + 1);
        $('#test-queries').html(parseInt($('#test-queries').html()) + 1);
    };
    
    _.getTestQueryStrings = function() {
        return queries;
    };
    
    _.hasStatus = function(statusCheck) {
        return status === statusCheck;
    };
    
    _.iterationEnded = function(testIteration) {
        console.log('Results of iteration ' + _.iterations.length + ': ',
                {startTime: {date: new Date(testIteration.startTime), stamp: testIteration.startTime}},
                testIteration.getResultSet().getResults());
        
        includeIterationResults(testIteration);
        startNewIteration();
    };
    
    _.updateIterationProgress = function(fraction) {
        outputCurrentIterationCompletion(Math.round(fraction * 100, 0));
    };

    _.indicateError = function() {
        $('#test-error').html('An error has occured. Check the developers console.');
    };
    
    // *********************** Private methods. ******************************************
    
    var applySettings = function(pSettings) {
        _.settings = pSettings || {};
        _.settings = {
            queryAmount:      _.settings.queryAmount      || 25,
            uniqueQueries:    _.settings.uniqueQueries    || 25,
            queryDistribution:_.settings.queryDistribution|| 'zipf',
            zipf_s:           _.settings.zipf_s           || 1,
            queryBase:        _.settings.queryBase        || 'Query' + new Date().getTime(),
            runTime:          _.settings.runTime          || 30,
            delay:            _.settings.delay            || 200,
            servers:          _.settings.servers          || {sv1: 'http://localhost:16842/searsia/'},
            resourceTemplate: _.settings.resourceTemplate || {resource:{},searsia:'v0.4.0'},
            resources:        _.settings.resources        || {}
        };
        
        if (_.settings.uniqueQueries > _.settings.queryAmount) {
            _.settings.uniqueQueries = _.settings.queryAmount;
        }
        
        // Shorthands.
        resources = _.settings.resources;
        servers   = _.settings.servers;
        
        outputSettings();
    },
    
    buildQueryStrings = function() {
        var ls = [];
        
        // Check correct settings.
        switch (_.settings.queryDistribution) {
        case "uniformly":
        case "zipf":break;
        default: throw 'invalid distribution selected'; 
        }
        
        // Build unique queries.
        var uniqueQueries = [];
        for (var i = 0; i < _.settings.uniqueQueries; i++) {
            uniqueQueries.push(_.settings.queryBase + "u" + i);
        }

        // Build query list.
        if (_.settings.queryDistribution === "uniformly") {
            // Uniform distribution.
            for (var i = 0; i < _.settings.queryAmount; i++) {
                ls.push(Randomizer.getRandomItem(uniqueQueries));
            }
        } else if (_.settings.queryDistribution === "zipf") {
            // Zipf distribution. First get list of weights, then select based on that.
            var weightList = Randomizer.getZipfWeightList(_.settings.zipf_s, _.settings.uniqueQueries);
            for (var i = 0; i < _.settings.queryAmount; i++) {
                ls.push(Randomizer.getWeighedRandomItem(uniqueQueries, weightList));
            }
        }
        return ls;
    },
    
    getResourceCheckTemplate = function(server) { return servers[server] + 'search?r={r?}'; },
    getUpdateTemplate        = function(server) { return servers[server] + 'update/'; },
    
    checkResources = function() {
        for (var r in resources) {
            for (var s in servers) {
                checkResource(s, r);
            }
        }
    },
    
    checkResource = function(server, resource) {
        $.ajax({
            url: fillUrlTemplate(_.getSearchTemplate(server), '', resource),
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
                console.log('Resource ' + resource + ' was added to server ' + server + '.');
                confirmResourceExistence(); 
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log("Update failed.\n" + jqXHR.status + ' ' + jqXHR.statusText + ".\n");
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
            case Test.NOTSTARTED: $('#test-status').html('not started'); break;
            case Test.RUNNING: $('#test-status').html('running'); break;
            case Test.ABORTED: $('#test-status').html('aborted'); break;
            case Test.FINISHED: $('#test-status').html('finished'); break;
        }
        status = newStatus;
    },
    
    startTest = function() {
        queries = buildQueryStrings(); // Or should this be generated per TestIteration?
        startTime = new Date().getTime();
        
        // Start timer. If the run time has passed, it shuts down the test.
        runtimeTimer = window.setInterval(function(){
            $('#test-runtime').html(Test.formatDuration(Math.round((new Date().getTime() - startTime) / 1000)));
            $('#test-completion').html(Math.round(Math.round((new Date().getTime() - startTime) / 1000) / _.settings.runTime * 100) + '%');
            if (new Date().getTime() >= startTime + _.settings.runTime * 1000) {
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
        outputResultsOnChart();
        outputTestResults();
    },
    
    finishTest = function() {
        window.clearInterval(runtimeTimer);
        setStatus(Test.FINISHED);
        var iteration = _.iterations[_.iterations.length - 1];
        
        if (!iteration.isComplete()) {
            console.log('Results of unfinished iteration ' + _.iterations.length + ': ',
                    {startTime: {date: new Date(iteration.startTime), stamp: iteration.startTime}},
                    iteration.getResultSet().getResults());
            includeIterationResults(iteration);
            // This should happen in any case.
        }

        $('#test-results-json').html(JSON.stringify(resultSet.getResults()));
        
        console.log('Test results: ', resultSet.getResults());
    },
    
    outputSettings = function() {
        $('#test-setting-runtime').html(Test.formatDuration(_.settings.runTime));
        $('#test-setting-delay').html(_.settings.delay);
        $('#test-settings-queries').html(_.settings.queryAmount);
        $('#test-settings-uniquequeries').html(_.settings.uniqueQueries);
        $('#test-settings-querydistribution').html(_.settings.queryDistribution);
        if (_.settings.queryDistribution === 'zipf') {
            $('#test-settings-querydistribution').html(
                $('#test-settings-querydistribution').html() + 
                ' (s = ' + _.settings.zipf_s + ')'
            );
        }
        
        for (s in servers) {
            $('#test-queries2servers').after(
                $('<tr><td>Queries to server '+s+'</td><td id=\'test-queries2server-'+s+'\'>0</td></tr>')
            );
        }
        $('#test-queries2servers').remove();
        
        outputGraphLineSelection();
    },
    
    outputResults = function(pResultSet, $tbody) {
        var results = pResultSet.getResults()
        
        $tbody.html('');
        
        var $row1 = $('<tr><td colspan="'+(Object.keys(servers).length+1)+'">Average response times (ms)</td><td>Accuracy</td></tr>');
        var $row2 = $('<tr><td /></tr>');
        for (var s in servers) {
            $row2.append('<td>'+s+'</td>');
        }
        $row2.append('<td />')
        $tbody.append($row1).append($row2);
        
        for (var r in resources) {
            var $row = $('<tr><td>'+r+'</td></tr>');
            for (var s in servers) {
                $row.append('<td>'+Math.round(results.responseTime[s][r].avg)+'</td>');
            }
            $row.append('<td>' + 
                    (results.accuracy[r].accuracy === 1 ? '100' : (results.accuracy[r].accuracy*100).toFixed(2))
                    + '%</td>');
            $tbody.append($row);
        }
        var $row = $('<tr><td>overall</td></tr>');
        for (var s in servers) {
            $row.append('<td>'+Math.round(results.responseTime[s]._overall.avg)+'</td>');
        }
        $row.append('<td>' + 
                (results.accuracy._overall.accuracy === 1 ? '100' : (results.accuracy._overall.accuracy*100).toFixed(2))
                +'%</td>');
        $tbody.append($row);
    },
    
    outputTestResults = function() {
        outputResults(resultSet, $('#test-results tbody').first());

        // Response time ratio table.
        var results = resultSet.getResults();
        var $t = $('#test-results-responsetimeratio tbody');
        $t.html('');
        var $row1 = $('<tr><td /></tr>');
        for (var s in servers) {
            $row1.append('<td>'+s+'</td>');
        }
        $t.append($row1);
        for (var s1 in servers) {
            var $row = $('<tr><td>'+s1+'</td></tr>');
            for (var s2 in servers) {
                var ratio = results.responseTimeRatio[s1][s2]; 
                $row.append('<td>' + (ratio === null ? '-' : ratio.toFixed(3)) + '</td>');
            }
            $t.append($row);
        }
    },
    
    outputNewRunningIteration = function(id) {
        var $t = $('<table id="test-iterationresults-'+id+'"><caption>Iteration #'+id+' (<span id="test-iterationresults-'+id+'-completion">0</span>%)</caption><tbody></tbody></table>');
        $('tbody', $t).hide();
        $('caption', $t).click(function() {
            $(this).siblings('tbody').toggle();
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
    },
    
    drawChart = function() {
        if (chart === null || chartDataTable === null || chartDataTable.getNumberOfColumns() === 0) {
            return;
        }
        // Check which columns should be hidden.
        chartDataView = new google.visualization.DataView(chartDataTable);
        var hiddenColumns = [];
        $('#test-results-temporalresponsetimes-lineselection input:checkbox:not(:checked)').each(function(){
            hiddenColumns.push(parseInt($(this).data('column')));
        });
        chartDataView.hideColumns(hiddenColumns);
        // Draw.
        chart.draw(chartDataView, chartOptions);
    },
    
    outputPreparedResponseTimeChart = function() {
        $container = $('#test-results-temporalresponsetimes');
        
        chart = new google.visualization.LineChart($container[0]);
        chartDataTable = new google.visualization.DataTable();
        chartDataTable.addColumn('datetime', 'Time');
        // Loop through sorted servers.
        for (var i = 0, ss = Object.keys(servers).sort(); i < ss.length; i++) {
            chartDataTable.addColumn('number', ss[i]);
            chartDataTable.addColumn('number', ss[i] + ' (average)');
        }
        drawChart();
    },
    
    outputGraphLineSelection = function() {
        var id = '#test-results-temporalresponsetimes-lineselection';
        var $tbody = $('tbody', $(id));
        for (var i = 0, c = 1, ss = Object.keys(servers).sort(); i < ss.length; i++) {
            // this is the same loop as is used in outputPreparedResponseTimeChart()
            var a = [ss[i], ss[i] + ' (average)'];
            for (var j = 0; j < a.length; j++, c++) {
                var $input = $('<input type="checkbox" id="'+id+'-column'+c+'" />');
                $input.attr('checked', 'checked');
                $input.data('column', c);
                $tbody.append(
                    $('<tr />')
                        .append($('<td />').append($input))
                        .append($('<td />')
                            .append($('<label for="'+id+'-column'+c+'">'+a[j]+'</label>'))));
            }
        }
        $('input:checkbox', $tbody).change(function(){
            drawChart();
        });
    },
    
    outputResultsOnChart = function() {
        var results = resultSet.getResults(),
            requestTimes = Object.keys(results.temporalResponseTime).sort(),
            ss = Object.keys(servers).sort(),
            rows = [];
        // Reset data.
        chartDataTable.removeRows(0, chartDataTable.getNumberOfRows());
        // Loop through each request time.
        for (var i = 0; i < requestTimes.length; i++) {
            var requestTime = requestTimes[i],
                row = [new Date(parseInt(requestTime))];
            // Loop through each server.
            for (var j = 0; j < ss.length; j++) {
                var data = results.temporalResponseTime[requestTime][ss[j]];
                row.push(data === undefined ? null : data.responseTime);
                row.push(data === undefined ? null : data.runningAvg);
            }
            rows.push(row);
        }
        chartDataTable.addRows(rows);
        drawChart();
    }
    
    
    ;
    constructor(pSettings);
};

// *********************** Static methods and properties *********************************

Test.formatDuration = function(s) {
    var ss = function(i){return i===1?'':'s';}, 
        d = Math.floor(s / 86400),
        h = Math.floor((s-d*86400) / 3600),
        m = Math.floor((s-d*86400 - h*3600) / 60),
        s = s % 60, 
        o = '';
    
    o += d > 0 ? ', ' + d + ' day'    + ss(d) :'';
    o += h > 0 ? ', ' + h + ' hour'   + ss(h) :'';
    o += m > 0 ? ', ' + m + ' minute' + ss(m) :'';
    o += s > 0 ? ', ' + s + ' second' + ss(s) :'';
    return o.substr(2);
};

Test.NOTSTARTED = 0;
Test.RUNNING = 1;
Test.ABORTED = 2; // Unused as of yet.
Test.FINISHED = 3;

