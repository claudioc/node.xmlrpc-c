/* 
 * xmlrpc-c module for node.js
 *
 * Copyright (c) 2009 Claudio Cicali <claudio.cicali@gmail.com>
 * See COPYING for licensing information.
 *
 * Snippets and inspiration credits to xmlrpc_lib.js by Gaetano Giunta
 *
 */

var sys = require('sys');
var http = require('http');

var libxml = require('./libxmljs');

var timeout = 5000;

var Client = function(hostname, port, path) {
  this.hostname = hostname || 'localhost';
  this.port = port || 80;
  this.path = path;
};

Client.prototype = new process.Promise();

exports.create = function(hostname, port, path) {
  var client = new Client(hostname, port, path);
  client.timeout(timeout);
  return client;
}

Client.prototype.call = function(method, params) {

  params = params || [];
  
  sys.debug("Connecting to " + this.hostname + ":" + this.port + this.path);
  
  var client = http.createClient(this.port, this.hostname);

  var headers = {
    "User-Agent": "NodeJS XML-RPC Client",
    "Content-Type": "application/x-www-form-urlencoded'",
    "Connection": "close",
    "Keep-Alive": "",
    "host": this.hostname,
    "Accept": "text/xml",
    "Accept-Charset": "UTF8"
  }

  var doc = new libxml.Document()
  var payload = doc.node('methodCall');
  payload.node('methodName', method);
  payload.node('params', function(p) {
    for(var i=0; i < params.length; i++) {
      var el, val;
      switch(params[i].constructor.name) {
        case 'Number':
          if (("" + params[i]).match(/\d+\.\d+/)) {
            el = 'double';
            val = parseFloat(params[i]);
          } else {
            el = 'int';
            val = parseInt(params[i]);
          }
          break;
          
        case 'String':
        default:
          el = 'string';
          val = "" + params[i];
          break;
      }
      p.node('param').node("value").node(el, val);
    }
  });
  
  sys.puts(doc.toString());
  
  var req = client.post(this.path, headers);

  req.sendBody(doc.toString(), 'utf8');
  
  var me = this;
  
  req.finish(function(res) {
    var payload = "";
    res.setBodyEncoding("utf8");

    if (res.statusCode != 200) {
      return me.emitError(method, "Status is not 200: " + res.statusCode);
    }

    res.addListener("body", function (chunk) {
      payload += chunk;
    });

    res.addListener("complete", function() {
      sys.puts(payload);
      
      // be tolerant of extra whitespace in response body
      payload = payload.replace(/^\s/, '').replace(/\s$/, '');
      // be tolerant of junk after methodResponse (e.g. javascript ads automatically inserted by free hosts)
      var pos = payload.lastIndexOf('</methodResponse>');
      if (pos >= 0) {
        payload = payload.slice(0, pos + 17);
      }

      var doc, response, fault;
      try {
        doc = libxml.parseString(payload);
        response = doc.root();
      } catch(e) {
        return me.emitError(method, "Response seems not a regular XMLRPC one");
      }

      var fault;
      if (fault = tools.getFault(response)) {
        return me.emitError(method, "XMLRPC error: " + fault.faultString + " (" + fault.faultCode + ")");
      }

      var values = response.find('params/param/value');
      
      for (var i=0; i < values.length; i++) {
        sys.puts(sys.inspect(tools.parseValue(values[i])));
      }
      
      me.emitSuccess(method);
    });
      
  });
}

var tools = {
  
  getFault: function(response) {
    var fault;
    if (fault = response.get('fault')) {
      return tools.parseValue(fault.get('value'));
    }
    return null;
  },
  
  parseValue: function(element) {

    // Segmentation fault using element.child(0)
    
    var container = tools.getFirstChild(element);
    
    switch(container.name()) {
      
      case 'struct':
        var struct = {};
        var members = container.find('member');
        var name;
        for (var i=0; i < members.length; i++) {
          name = members[i].get('name').text();
          struct[name] = tools.parseValue(members[i].get('value'));
        }
        return struct;
      
      case 'i4':
      case 'int':
        return parseInt(container.text());

      case  'string':
        return container.text();

      case  'array':
        var data = container.find('data/value');
        var array = [];
        for (var i=0; i < data.length; i++) {
          array.push(tools.parseValue(data[i]));
        }
        return array;
        
      case 'boolean':
        var txt = container.text();
        if (txt == '1' || txt.search(/^true$/i) != -1) {
          return true;
        }
        return false;
    }

  },
  
  getFirstChild: function(element) {
    var children = element.children();
    for (var i=0; i < children.length; i++) {
      // TODO is this the right way to test for a TEXT node type?
      if (children[i].name() !='text') {
        return children[i];
      }
    }
    return children[0];
  },
  
  encodeEntities: function (data) {
    return new String(data).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  
}


