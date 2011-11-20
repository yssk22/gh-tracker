var env = process.env;
var targets = [];

(env.GH_TRACKER_TARGETS || '')
  .split(',')
  .forEach(function(s){
    var path = s.replace(/^\s+|\s+$/g, "").split('/');
    if( path.length == 2 &&
        path[0].length > 0 && path[1].length > 0 ){
      targets.push({
        user: path[0],
        repo: path[1]
      });
    }
  });

var database = {
  host: 'localhost',
  port: 27017,
  db: 'gh-tracker'
};

if( process.env.VCAP_SERVICES ){
  var vcapdb = JSON.parse(process.env.VCAP_SERVICES)["mongodb-1.8"][0];
  database.host = vcapdb.credentials.host;
  database.port = vcapdb.credentials.port;
  database.auth = {
    username : vcapdb.credentials.username,
    password : vcapdb.credentials.password
  };
  database.db = vcapdb.credentials.db;
}

exports.targets = targets;
exports.jobIntervalSec = parseInt(env.GH_TRACKER_JOB_INTERVAL_SEC);
exports.database = database;