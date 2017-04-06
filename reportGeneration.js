var fs = require('fs');
var path = require('path');
var newmanReport = './newman/';

  fs.readdir(newmanReport, function(err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    filenames.forEach(function(filename) {
    	var ext = path.extname(filename);
    	if(ext === '.json') {
    		fs.readFile(newmanReport+filename, 'utf-8', function(err, content) {
        		if (err) {
          			onError(err);
          			return err;
        		}
        		var newmanJsonReport = JSON.parse(content);
        		console.log(newmanJsonReport.run.failures);
      		});
    	}
    });
  });
