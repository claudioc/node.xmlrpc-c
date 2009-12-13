

var sys = require('sys');

var xmlrpclib = require('./xmlrpc-c');

var client = xmlrpclib.createClient(80, 'radioradicale.local', '/scripts/radicapi/xmlrpctestserver.php');

client.addListener('success', function(method, response) {
  sys.puts(method);
  if (response) {
    if (response.constructor.name == 'Date') {
      sys.print(response);
    } else {
      sys.print(sys.inspect(response));
    }
  }
  sys.puts("\n");
});

client.addListener('error', function(method, error) {
  sys.print(method + " " + error);
  sys.puts("\n");
});

client.call("not_exists");

client.call("return_nothing");
client.call("return_int");
client.call("return_double");
client.call("return_string");
client.call("return_array_simple");
client.call("return_array_multi");
client.call("return_struct");
client.call("return_boolean");
client.call("return_date");

client.call("accept_nothing");
client.call("accept_int", [42]);
client.call("accept_double", [42.33]);
client.call("accept_string", ["Hello"]);
client.call("accept_array", [[10,20,[30]]]);
client.call("accept_struct", [{field1: "Claudio", field2: "Cicali", field3: [33,44,55], field4: {innerField1: "deep"}}]);
client.call("accept_boolean", [false]);

var d = new Date();
client.call("accept_date", [d]);

client.call("accept_many", [42, "Hello", [10,20,30], {field1: 33}, false]);

