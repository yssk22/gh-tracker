var config  = require('./config');
var logger  = require('log4js').getLogger('database');
var mongodb = require('mongodb');
var options = {
  'auto_reconnect': true,
  'poolSize': 4
};

var server = new mongodb.Server(config.database.host, config.database.port, options);
var db = new mongodb.Db(config.database.db, server);

module.exports = exports = {
  options: options,
  open: function(callback){
    db.open(function(err){
      if( err ){
        callback(err, db);
      }else{
        if( config.database.auth ){
          logger.info('Database authentication with %s/*********', config.database.auth.username);
          db.authenticate(config.database.auth.username,
                          config.database.auth.password, function(err){
                            callback(err, db);
                          });
        }else{
          logger.info('Database connected without authentication');
          callback(err, db);
        }
      }
    });
  }
};

exports.__defineGetter__('db', function(){
  if( server.connected ){
    return db;
  }else{
    throw new Error("Call 'open' before using database object.");
  }
});
