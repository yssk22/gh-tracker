/**
 * Crawler Job implementation
 *
 * @author Yohei Sasaki <yssk22@gmail.com>
 *
 */

var async = require('async');
var logger = require('log4js').getLogger('job');

var Crawler = require('./crawler').Crawler;
var database = require('./database');
function Job(user, repo, credential){
  this._user = user;
  this._repo = repo;
  this._db = database.db;
  this._crawler = new Crawler(user, repo, credential);
  this._status = {
    initialized: new Date(),
    lastError: null,
    lastExecuted: null,
    lastTimeToTaken: null
  };
}

var URL_PREFIX = "https://github.com";
var URL_PREFIX_LENGTH = URL_PREFIX.length;

Job.prototype.__defineGetter__('url', function(){
  return [URL_PREFIX, this._user, this._repo].join('/');
});

Job.prototype.__defineGetter__('namespace', function(){
  return [this._user, this._repo].join('::');
});

Job.prototype.__defineGetter__('collection', function(){
  return {
    issues:  [this._user, this._repo, 'issues'].join('::'),
    commits: [this._user, this._repo, 'commits'].join('::')
  };
});


Job.prototype.__defineGetter__('user', function(){
  return this._user;
});

Job.prototype.__defineGetter__('repo', function(){
  return this._repo;
});

Job.prototype.__defineGetter__('status', function(){
  return this._status;
});

Job.prototype.run = function(callback){
  var self = this;
  var db = this._db;
  var crawler = this._crawler;
  var status = this._status;
  var logger = require('log4js').getLogger(self.namespace);
  logger.info('start', this.url);
  status.lastExecuted = new Date();
  function exit(err){
    status.lastTimeToTaken = (new Date().getTime() - status.lastExecuted.getTime());
    if( err ){
      logger.info('finished with error - %s (Time: %s)', self.url, err, status.lastTimeToTaken);
    }else{
      logger.info('finished (Time: %s)', self.url, status.lastTimeToTaken);
    }
    callback && callback(err);
  }

  async.parallel({
    commitsAfter: function(callback){
      // get the last commited_date
      db.collection(self.collection.commits, function(err, collection){
        if( err ){
          callback(err);
        }else{
          collection
            .find()
            .sort({"committed_date": -1})
            .limit(1).toArray(function(err, results){
              if( err ){
                callback(err, false);
              }else{
                if( results.length > 0 ){
                  callback(err, results[0].committed_date);
                }else{
                  callback(err, false);
                }
              }
            });
        }
      });
    }
  }, function(err, result){
    if( err ){
      status.lastError = err;
      exit(err);
    }else{
      logger.info("Crawling option: %j", result);
      crawler.run(result, function(err, result){
        async.parallel({
          issues: function(callback){
            db.collection(self.collection.issues, function(err, collection){
              if( err ){
                callback(err);
              }else{
                var issues = result.issues;
                for(var i=0, len=issues.length; i<len; i++){
                  var issue = issues[i];
                  // normalize
                  normalizeDates(issue, ['created_at', 'updated_at', 'closed_at']);
                  issue._id = issue.html_url.substr(URL_PREFIX_LENGTH);
                }
                issues = ensureUniqueness(issues);
                logger.debug("%s issues are to be stored.", issues.length);
                collection.insert(issues, function(err, r){
                  if( !err ){
                    if( r.length > 0 ){
                      logger.info("%s issues are stored.", r.length);
                    }else{
                      logger.info("No issues are stored.");
                    }
                  }
                  callback(err, issues);
                });
              }
            });
          },
          commits: function(callback){
            db.collection(self.collection.commits, function(err, collection){
              if( err ){
                callback(err);
              }else{
                var commits = result.commits;
                var commit_ids = {};
                for(var i=0, len=commits.length; i<len; i++){
                  var commit = result.commits[i];
                  normalizeDates(commit, ['committed_date', 'authored_date']);
                  delete(commit.id);
                  commit._id = commit.url;
                }
                commits = ensureUniqueness(commits);
                logger.debug("%s commits are to be stored.", commits.length);
                collection.insert(commits, function(err, r){
                  if( !err ){
                    if( commits.length > 0 ){
                      logger.info("%s commits are stored.", r.length);
                    }else{
                      logger.info("No commits are stored.");
                    }
                  }
                  callback(err, commits);
                });
              }
            });
          }
        }, function(err, results){
          if( err ){
            status.lastError = err;
          }else{
            status.lastError = null;
            // finally collect the database status (collection count)
            function countFun(name){
              return function(callback){
                db.collection(name, function(err, collection){
                  collection.count(callback);
                });
              };
            }
            function ensureIndex(name, fieldOrSpec, options, callback){
              db.collection(name, function(err, collection){
                collection.ensureIndex(fieldOrSpec, options, function(err){
                  logger.info("Index for %s is ensured: %j", name, fieldOrSpec);
                });
              });
            }

            async.parallel({
              issues: countFun(self.collection.issues),
              commits: countFun(self.collection.commits)
            },function(err, results){
              if( !err ){
                logger.info("Database Colleciton State: %j", results);
                // if count is zero, create index on background.
                if( results.issues == 0 ){
                  logger.info("Ensure index for issues");
                  ensureIndex(self.collection.issues, {state: 1, created_at: 1});
                  ensureIndex(self.collection.issues, {state: 1, updated_at: 1});
                }
                if( results.commits == 0 ){
                  logger.info("Ensure index for issues");
                  ensureIndex(self.collection.issues, {committed_date: 1});
                }
              }
              status.database = results;
              exit(err, results);
            });
          }
        });
      });
    }
  });
};

function ensureUniqueness(recordList){
  var ids = {};
  return recordList.filter(function(e){
    if( ids[e._id] ){
      return false;
    }else{
      ids[e._id] = true;
      return true;
    }
  });
}

function normalizeDates(obj, fieldNames){
  for(var i in fieldNames){
    var fname = fieldNames[i];
    if( obj[fname] ){
      try{
        obj[fname] = new Date(obj[fname]);
      }catch(e){
        logger.warning('Could not normalize date: %s of %j', fname, obj);
        obj[fname] = null;
      }
    }
  }
  return obj;
}


module.exports = {
  Job: Job
};