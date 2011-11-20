var async = require('async');
/*
 * GET home page.
 */
var logger = require('log4js').getLogger('router/index');
function defaultFilterOptions(){
  var now = new Date();
  return {
    to: new Date(now.getFullYear(),
                 now.getMonth(),
                 now.getDate()),
    from: new Date(now.getFullYear(),
                   now.getMonth() - 1,
                   now.getDate())
  };
}

function strToDate(str){
  if( str ){
    var splits = str.split('-');
    var d = new Date(parseInt(splits[0]), parseInt(splits[1]) - 1, parseInt(splits[2]));
    if( d.toString() != 'Invalid Date' ){
      return d;
    }else{
      throw new Error('Invalid Date: ' + str);
    }
  }else{
    throw new Error("Empty string");
  }
}

exports.index = function(req, res){
  var filterOptions = defaultFilterOptions();
  execFilter(filterOptions, function(err, data){
    res.render('index', {
      filterOptions: filterOptions,
      data: data,
      options: {
        googleAnalytics: process.env.GOOGLE_ANALYTICS_CODE
      }
    });
  });
};

exports.q = function(req, res){
  var filterOptions = defaultFilterOptions();
  try{
    filterOptions.to = strToDate(req.query.to);
    filterOptions.from = strToDate(req.query.from);
    execFilter(filterOptions, function(err, data){
      res.render('index', {
        filterOptions: filterOptions,
        data: data,
        options: {
          googleAnalytics: process.env.GOOGLE_ANALYTICS_CODE
        }
      });
    });
  }catch(e){
    res.redirect('/');
  }
}

function execFilter(filterOptions, callback){
  findTargets(function(err, targets){
    var funcs = {};
    for(var i in targets){
      var t = targets[i];
      (function(target){
        funcs[i] = function(callback){
          // issues
          async.parallel({
            updatedIssues: function(cb){
              target.collections.issues.find({
                updated_at: {
                  $gte: filterOptions.from,
                  $lte: filterOptions.to
                },
                created_at: {
                  $lte: filterOptions.from
                },
                state: {
                  $ne: 'closed'
                }
              }).sort({updated_at: -1}).toArray(cb);
            },
            closedIssues: function(cb){
              target.collections.issues.find({
                closed_at: {
                  $gte: filterOptions.from,
                  $lte: filterOptions.to
                }
              }).sort({closed_at: -1}).toArray(cb);
            },
            createdIssues: function(cb){
              target.collections.issues.find({
                created_at: {
                  $gte: filterOptions.from,
                  $lte: filterOptions.to
                }
              }).sort({created_at: -1}).toArray(cb);
            },
            commits: function(cb){
              target.collections.commits.find({
                committed_date: {
                  $gte: filterOptions.from,
                  $lte: filterOptions.to
                }
              }).sort({commited_date: -1}).toArray(cb);
            }
          }, callback);
        };
      })(t);
    }
    async.parallel(funcs, callback);
  });
};

function findTargets(callback){
  var db = require('../lib/database').db;
  db.collections(function(err, collections){
    if( err ){
      callback(err);
    }else{
      var targets = {};
      for(var i in collections){
        var colName = collections[i].collectionName;
        var colPaths = colName.split('::'); // namespace
        if( colPaths.length == 3 &&
            (colPaths[2] == 'issues' || colPaths[2] == 'commits' )){
          var tid = [colPaths[0], colPaths[1]].join('/');
          if( !targets[tid] ){
            var target = {
              user: colPaths[0],
              repo: colPaths[1],
              collections: {}
            };
            targets[tid] = target;
          }
          targets[tid].collections[[colPaths[2]]] = collections[i];
        }
      }
      callback(null, targets);
    }
  });
}