var sys = require('sys');

var xmlrpcClient = require('./xmlrpc-c');

var client = xmlrpcClient.create('radioradicale.local', 80, '/scripts/radicapi/radicapi.php');

client.addCallback(function(method, response) {
  sys.puts(method);
  sys.puts(sys.inspect(response));
});

client.addErrback(function(method, error) {
  sys.puts(method + " " + error);
});

client.call("archivio.getRecording", ["965e244ae976cf43900eb5ea04395809", 272793]);


