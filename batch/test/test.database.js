var async = require('async');
var assert = require('assert');
var database = require('../lib/database');
module.exports = {
  'test db': function(){
    database.open(function(err, db){
      assert.isNotNull(database.db);
      db.close();
    });
  }
}