var assert = require('assert');
var Crawler = require('../lib/crawler').Crawler;

module.exports = {
  'test run': function(){
    var crawler = new Crawler('cloudfoundry', 'vcap');
    crawler.run({
      allIssues: true
    },function(err, results){
      assert.isUndefined(err);
      assert.isNotNull(results.issues);
      assert.isNotNull(results.commits);
    });
  }
};