/* 
 * xmlrpc-c module for node.js
 *
 * Copyright (c) 2009 Claudio Cicali <claudio.cicali@gmail.com>
 * See COPYING for licensing information.
 *
 * Snippets and inspiration credits to xmlrpc_lib.js by Gaetano Giunta
 *
 */

var http = require('http');
var https = require('https');
var libxml = require('libxmljs');

var headers = {
  "User-Agent": "NodeJS XML-RPC Client",
  "Content-Type": "text/xml",
  "Accept": "text/xml",
  "Accept-Charset": "UTF8"
}

var cookies;

var Client = function(port, host, path, shouldhttps) {  
  this.opts = {
    host: host,
    port: port,
    path: path,
    method: 'POST',
    headers: headers
  };
  
  this.request = shouldhttps ? https.request : http.request;
};

Client.prototype = new process.EventEmitter();

exports.createClient = function(port, host, path, shouldhttps) {
  var client = new Client(port, host, path, shouldhttps);
  return client;
}

Client.prototype.call = function(method, params, callback) {
  params = params || [];
  
  var doc = new libxml.Document();
  var body = doc.node('methodCall');
  body.node('methodName', method);
  body.node('params', function(p) {
    for (var i=0; i < params.length; i++) {
      _serialize(params[i], p.node('param'));
    }
    function _serialize(param, parent) {

      var value = parent.node('value');

      switch(param.constructor.name) {
        
        case 'Number':
          value.node(("" + param).match(/^\d*\.\d+$/) ? 'double' : 'int', "" + param);
          break;

        case 'Array':
          var data = value.node('array').node('data');
          for(var n=0; n < param.length; n++) {
            _serialize(param[n], data);
          }
          break;

        case 'Object':
          var data = value.node('struct');
          var member;
          for(var key in param) {
            if (param.hasOwnProperty(key)) {
              member = data.node('member');
              member.node('name', key)
              _serialize(param[key], member);
            }
          }
          break;

        case 'Boolean':
          value.node('boolean', "" + !!param);
          break;

        case 'Date':
          value.node('dateTime.iso8601', H.iso8601Encode(param));
          break;

        case 'String':
        default:
          value.node('string', param);
          break;
      }
      
    }

  });

  body = doc.toString();
  this.opts.headers['Content-Length'] = body.length;
  
  if (cookies) {
    var cookiehdr = '';
    for (var key in cookies) {
      cookiehdr += key + '=' + cookies[key] + '; ';
    }
    if (cookiehdr.length)
      cookiehdr = cookiehdr.substring(0, cookiehdr.length - 2);
    this.opts.headers['Cookie'] = cookiehdr;
  }
  
  var me = this;
  
  var req = this.request(this.opts, function(res) {
    var payload = "";
    res.setEncoding("utf8");

    if (res.statusCode != 200) {
      return me.emit("error", method, "Status is not 200: " + res.statusCode);
    }

    var set_cookie = res.headers['set-cookie'];
    if (set_cookie) {
      for (var i in set_cookie) {
        cookie = set_cookie[i];
        cookie = cookie.split(';')[0];
        cookie = cookie.split('=');
        if (!cookies)
          cookies = [];
        cookies[cookie[0]] = cookie[1];
      }
    }

    res.addListener("data", function(payload) {
      payload = H.trim(payload);

      // be tolerant of junk after methodResponse (e.g. javascript ads automatically inserted by free hosts)
      var pos = payload.lastIndexOf('</methodResponse>');
      if (pos >= 0) {
        payload = payload.slice(0, pos + 17);
      }

      if (payload == '') {
        me.emit('success', method, payload);
      }
      
      var doc, response, fault;
      try {
        doc = libxml.parseXmlString(payload);
        response = doc.root();
      } catch(e) {
        return me.emit('error', method, "Response seems not a regular XMLRPC one");
      }
      var fault;
      if (fault = H.getFault(response)) {
        return me.emit('error', method, "XMLRPC error: " + fault.faultString + " (" + fault.faultCode + ")");
      }

      var value = response.get('params/param/value');

      me.emit('success', method, H.parseValue(value));
    });
      
  });
  
  req.write(body);
  req.end();

  return this;
}

/* Various helpers */
var H = {
  
  getFault: function(response) {
    var fault;
    if (fault = response.get('fault')) {
      return H.parseValue(fault.get('value'));
    }
    return null;
  },
  
  parseValue: function(element) {

    // Segmentation fault using element.child(0)
    
    var container = H.getFirstChild(element);
    var val;

    switch(container.name()) {
      
      case 'struct':
        var struct = {};
        var members = container.find('member');
        var name;
        for (var i=0; i < members.length; i++) {
          name = members[i].get('name').text();
          struct[name] = H.parseValue(members[i].get('value'));
        }
        return struct;
      
      case 'i4':
      case 'int':
			  var val = container.text();
			  if (!val.match(/^[+-]?[0123456789 \t]+$/)) {
			    return 0;
			  }
        return parseInt(val);

      case 'array':
        var data = container.find('data/value');
        var array = [];
        for (var i=0; i < data.length; i++) {
          array.push(H.parseValue(data[i]));
        }
        return array;

      case 'float':
      case 'double':
        var val = container.text();
        if (!val.match(/^[+-]?[eE0123456789 \t.]+$/)) {
          return 0.0;
        }
        return parseFloat(val);

      case 'boolean':
        var val = container.text();
        if (val == '1' || val.match(/^true$/i)) {
          return true;
        }
        return false;

      case 'dateTime.iso8601':
        return H.iso8601Decode(container.text());

      case  'string':
      case  'base64':
      default:
        return container.text();
    }

  },

  iso8601Decode: function(time) {
    /* http://delete.me.uk/2005/03/iso8601.html */
    var regexp = "([0-9]{4})([-]?([0-9]{2})([-]?([0-9]{2})" +
                 "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?" +
                 "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";

    var d = time.match(new RegExp(regexp));

    var offset = 0;
    var date = new Date(d[1], 0, 1);

    if (d[3]) { date.setMonth(d[3] - 1); }
    if (d[5]) { date.setDate(d[5]); }
    if (d[7]) { date.setHours(d[7]); }
    if (d[8]) { date.setMinutes(d[8]); }
    if (d[10]) { date.setSeconds(d[10]); }
    if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }

    return date;
  },

  iso8601Encode: function(date) {
    return H.zeroPad(date.getFullYear(), 4) +
           H.zeroPad(date.getMonth() + 1, 2) +
           H.zeroPad(date.getDate(), 2) +
           "T" +
           H.zeroPad(date.getHours(), 2) +
           ":" +
           H.zeroPad(date.getMinutes(), 2) +
           ":" +
           H.zeroPad(date.getSeconds(), 2);
  },

  zeroPad: function(v, l) {
    var padded = "" + v;
    while(padded.length < l) {
      padded = "0" + padded;
    }
    return padded;
  },

  getFirstChild: function(element) {
    var children = element.childNodes();
    for (var i=0; i < children.length; i++) {
      if (children[i].type() != 'text') {
        return children[i];
      }
    }
    return children[0];
  },
  
  encodeEntities: function (data) {
    return new String(data).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  },

	trim: function(text) {
		return (text || "").replace( /^\s+|\s+$/g, "" );
	},
  
}
