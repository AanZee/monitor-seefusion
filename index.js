exports.isMonitoringModule = true;
exports.hasCron = true;

var request = require("request");
var responseMessaging = require('monitor-response');
var parseString = require('xml2js').parseString;

exports.executeCron = function (callback) {
    getSeeFusionData(function(err, data){
        if(err)
            callback(err);
        else
            callback(null, data);
    });
}
var parseRequests = function(requests) {

    var parsed = [];

    if(!requests[0].page) {
        requests[0].page = [];
    }

    for(var i=0;i<requests[0].page.length;i++) {
        
        var request = {
            url: requests[0].page[i].url[0],
            ip: requests[0].page[i].ip[0],
            duration: parseInt(requests[0].page[i].time[0]),
            totalQueryTime: parseInt(requests[0].page[i].querytime[0]),
            queryCount: parseInt(requests[0].page[i].querycount[0])
        }

        if(requests[0].page[i].query) {
            request.query = requests[0].page[i].query[0].sql[0];
            request.queryDuration = parseInt(requests[0].page[i].query[0].elapsed[0]);
            request.queryRows = parseInt(requests[0].page[i].query[0].rows[0]);
        }

        parsed.push(request);

    }

    return parsed;
}

var parseCounters = function(counters,type) {
    for (var i=0;i<counters.length;i++) {
        var foundType = parseInt(counters[i].duration[0]);

        if(foundType == type) {
           var counter = {
                pageCount : parseInt(counters[i].pageCount[0]),
                avgPageTimeMs: parseInt(counters[i].avgPageTimeMs[0]),
                queryCount : parseInt(counters[i].queryCount[0]),
                avgQueryTimeMs: parseInt(counters[i].avgQueryTimeMs[0]),
                activeRequests: parseInt(counters[i].activeRequests[0])                
            }
            return counter;
        }
       
    }
}

var getSeeFusionData = function(callback){
   
    request({
        method: 'GET',
        url: exports.config.endpoint || 'http://localhost:9002/xml'
    },
    function (err, response, data) {
        
        if (!err && response.statusCode == 200) {
            parseString(data, function (err, result) {

                var seefusion = result.seefusioninfo;
                var server = seefusion.server[0];
                var memory = seefusion.memory[0];
               
                var returnObj = {
                    "server": server.name,
                    "uptime": seefusion.uptime[0],
                    "requests": {
                        "running": parseRequests(server.runningRequests),
                        "completed": parseRequests(server.completedRequests),
                        "slow": parseRequests(server.slowRequests)
                    },
                    "counters": {
                        "1": parseCounters(seefusion.counters,1),
                         "10": parseCounters(seefusion.counters,10),
                         "60": parseCounters(seefusion.counters,60)
                    },
                    "totalMemory": memory.currentmax[0],
                    "totalAvailable": memory.available[0],
                }

                callback(returnObj);

            });
        }
    });
}