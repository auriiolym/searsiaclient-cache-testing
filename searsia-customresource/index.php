<?php
/**
 * Custom resource, built for testing with Searsia, a federated web search engine.
 *
 * Parameters:
 *  q       string      required    the query
 *  ttl     int         required    the time-to-live value of a resultset (in seconds)
 *  delay   int         optional    the delay added to simulate a higher network load (in milliseconds)
 */
if (!isset($_GET['q']) || strlen($_GET['q']) < 1 || !isset($_GET['ttl']) || strlen($_GET['ttl']) < 1 || intval($_GET['ttl']) <= 0) {
    
    echo "The parameters were not properly filled. Make sure a query is set (parameter q) and the time-to-live value is set in seconds (parameter ttl).";
    exit;
}

$sQuery = $_GET['q'];
$iTTL   = intval($_GET['ttl']);
$iDelay = isset($_GET['delay']) && intval($_GET['delay']) >= 0 ? intval($_GET['delay']) : 0;

// Get the time period start.
$iPeriodStart = round(time() / $iTTL, 0) * $iTTL;

// Generate a result set.
$sResultSetHash = sha1($sQuery . " - " . $iPeriodStart);
$sResultSet = $sResultSetHash . sha1($sResultSetHash); // Just to make it longer.
$aResultSet = str_split($sResultSet, strlen($sResultSet) / 10);


// Format the result set.
foreach ($aResultSet as $v) {
    $aResultsHTML[] = "<li>".$v."</li>";
}
$sResultsHTML = implode("\n    ", $aResultsHTML);

// Sleep.
usleep($iDelay * 1000);


// Output result.
?>
<html>
<body>
<ol>
    <?=$sResultsHTML?>

</ol>
</body>
</html>