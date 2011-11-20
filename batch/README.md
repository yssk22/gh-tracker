# Github Tracker Batch

The batch implementation for Github Tracker.

# Usage on CloudFoundry

    $ vmc push --no-start
    
    # comma seperated :user/:repo list for tracking targets.
    $ vmc env-add {yourappname} GH_TRACKER_TARGETS="cloudfoundry/vcap, cloudfoundry/vcap-services"
    
    # Then confirm your tracker configuration
    $ curl http://{yourappname}.cloudfoundry.com/
    {
        "cloudfoundry/vcap": {
            "initialized": "2011-11-19T10:39:15.921Z",
            "lastError": null,
            "lastExecuted": null,
            "lastTimeToTaken": null
        },
        "cloudfoundry/vcap-services": {
            "initialized": "2011-11-19T10:39:15.921Z",
            "lastError": null,
            "lastExecuted": null,
            "lastTimeToTaken": null
        }
    }
    
    # Execule first crawling.
    $ curl --X POST http://{yourappname}.cloudfoundry.com/_run
    {
        "cloudfoundry/vcap": {
            "ok": true
        },
        "cloudfoundry/vcap-services": {
            "ok": true
        }
    }

    # wait for a while, and then check the status.
    $ curl http://{yourappname}.cloudfoundry.com/
    {
        "cloudfoundry/vcap": {
            "initialized": "2011-11-19T10:41:42.783Z",
            "lastError": null,
            "lastExecuted": "2011-11-19T10:42:03.582Z",
            "lastTimeToTaken": 10953,
            "database": {
                "commits": 494,
                "issues": 144
            }
        },
        "cloudfoundry/vcap-services": {
            "initialized": "2011-11-19T10:41:42.784Z",
            "lastError": null,
            "lastExecuted": "2011-11-19T10:42:03.583Z",
            "lastTimeToTaken": 11809,
            "lastResult": {}
        }
    }


    # Then finally set cralwer to run periodically
    $ vmc env-add {yourappname} GH_TRACKER_JOB_INTERVAL_SEC=3600
