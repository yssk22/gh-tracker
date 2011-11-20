var assert = require('assert');
var database = require('../lib/database');
var Job = require('../lib/job').Job;

module.exports = {
  'test run': function(){
    database.open(function(err, db){
      var job = new Job('cloudfoundry', 'vcap');
      job.run(function(err, results){
        assert.isNotNull(results.issues);
        assert.isNotNull(results.commits);
        db.close();
      });
    });
  }
};