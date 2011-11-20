var env = process.env;
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

exports.database = database;