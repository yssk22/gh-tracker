
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes')

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes
var database = require('./lib/database');
var config = require('./lib/config');
var logger = require('log4js').getLogger('app');
database.open(function(err){
  if( err ){
    logger.fatal("Could not open database: %s", err);
    process.exit(1);
  }else{
    app.helpers(require('./lib/helpers'));
    app.get('/', routes.index);
    app.get('/q', routes.q);
    app.listen(process.env.VCAP_APP_PORT || 3001);
    logger.info("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
  }
});
