var express = require('express');
var logger = require('log4js').getLogger('app');
var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

var database = require('./lib/database');
var config = require('./lib/config');

if( config.targets.length == 0 ){
  var errmsg =
    logger.error('You need to setup GH_TRACKER_TARGETS as an environment variable');
  app.get('/', function(req, res){
    res.writeHead(500);
    res.end(JSON.stringify({
      error: 'no_target',
      reason: 'No targets are configured.'
    }, null, 4) + "\n");
  });
}else{
  logger.info("Targets:");
  logger.info(JSON.stringify(config.targets, null, 4));
  database.open(function(err){
    if( err ){
      logger.error(err);
      throw err;
    }else{
      var Job = require('./lib/job').Job;
      var jobs = {};
      config.targets.forEach(function(t){
        jobs[t.user + '/' + t.repo] = new Job(t.user, t.repo);
      });
      function findJob(req, res, next){
        var job = jobs[[req.params.user, req.params.repo].join('/')];
        if( job ){
          req.job = job;
          next();
        }else{
          res.writeHead(404);
          res.end(JSON.stringify({
            error: 'not_found',
            reason: 'user or repository is not tracked.'
          }, null, 4) + "\n");
        }
      }
      app.get('/', function(req, res){
        var list = {};
        for(var k in jobs){
          list[k] = jobs[k].status;
        }
        res.end(JSON.stringify(list, null, 4) + '\n');
      });
      app.post('/_run', function(req, res){
        var list = {};
        for(var k in jobs){
          jobs[k].run();
          list[k] = {
            "ok": true
          };
        }
        res.end(JSON.stringify(list, null, 4) + '\n');
      });

      app.get('/:user/:repo', findJob,
              function(req, res, next){
                res.end(JSON.stringify(req.job.status, null, 4) + "\n");
              });
      app.post('/:user/:repo/_run', findJob,
               function(req, res){
                 var job = req.job;
                 logger.info("Requested crawl for %s", job.url);
                 job.run(function(){});
                 res.end('{"ok": "true"}' + "\n");
               });

      if( config.jobIntervalSec > 0 ){
        if( config.jobIntervalSec < 60 ){
          logger.warn('GH_TRACKER_JOB_INTERVAL_SEC must be more than 60. Ignored. crawl periodically.');
        }else{
          setInterval(function(){
            for(var k in jobs){
              var job = jobs[k];
              job.run();
            }
          }, config.jobIntervalSec * 1000);
        }
      }else{
        logger.warn('You need to setup GH_TRACKER_JOB_INTERVAL_SEC to crawl periodically.');
      }
    }
  });
}

app.listen(process.env.VCAP_APP_PORT || 3000, function(){
  logger.info("Express server listening on port %d in %s mode",
              app.address().port, app.settings.env);
});


