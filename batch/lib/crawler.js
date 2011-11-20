var async = require('async');
var GitHubApi = require('github').GitHubApi;

var env = process.env;

function Crawler(user, repo, credential){
  this._target = {
    user: user,
    repo: repo
  };
  this._credential = credential;

  this._github = new GitHubApi(false);
  if( credential ){
    this._github.authenticate(credential.user, credential.token);
  }
};

Crawler.prototype.run = function(options, callback){
  if( typeof(options) == 'function' ){
    callback = options;
    options = {
      allIssues: true,
      commitsAfter: false
    };
  }

  var self = this;
  var gh = this._github;
  var target = this._target;
  async.parallel({
    issues: function(callback){
      self._fetchIssues(options.allIssues, callback);
    },
    commits: function(callback){
      self._fetchCommits(options.commitsAfter || "1970-01-01T00:00:00-00:00", callback);
    }
  }, callback);
};

Crawler.prototype._fetchIssues = function(allIssues, callback){
  var gh = this._github;
  var target = this._target;
  if( allIssues ){
    async.parallel({
      open: function(callback){
        gh.getIssueApi().getList(target.user, target.repo, 'open', callback);
      },
      closed: function(callback){
        gh.getIssueApi().getList(target.user, target.repo, 'closed', callback);
      }
    }, function(err, results){
      if( err ){
        callback(err, []);
      }else{
        callback(err, results.open.concat(results.closed));
      }
    });
  }else{
    gh.getIssueApi().getList(target.user, target.repo, 'open', callback);
  }
};

Crawler.prototype._fetchCommits = function(commitsAfter, callback){
  var gh = this._github;
  var target = this._target;
  var list = [];
  function __fetch(page){
    var path = page > 0 ? 'master?page=' + page : "master";
    gh.getCommitApi()
      .getBranchCommits(target.user, target.repo, path, function(err, commits){
        if( err ){
          if( err.status == 404 ){
            callback(null, list);
          }else{
            callback(err, list);
          }
        }else{
          if( commits.length > 0 ){
            if( commits.length == 0 ){
              callback(err, list);
            }else{
              var filtered = commits.filter(function(c){
                return c.committed_date >= commitsAfter;
              });
              list = list.concat(filtered);
              if( filtered.length < commits.length ){
                callback(err, list);
              }else{
                __fetch(++page);
              }
            }
          }else{
            callback(err, list);
          }
        }
      });
  }
  __fetch(0);
};

module.exports = {
  Crawler: Crawler
};
