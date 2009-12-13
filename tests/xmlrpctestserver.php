<?php

include('IXR_Library.inc.php');

class xmlrpcverver extends IXR_IntrospectionServer {
  /**
   * @ignore
   */
  function xmlrpcverver() {
    $this->IXR_IntrospectionServer();

    $this->addCallback(
      'return_nothing',
      'this:return_nothing',
      array(),''
    );

    $this->addCallback(
      'return_int',
      'this:return_int',
      array('int'),''
    );

    $this->addCallback(
      'return_double',
      'this:return_double',
      array('double'),''
    );

    $this->addCallback(
      'return_string',
      'this:return_string',
      array('string'),''
    );

    $this->addCallback(
      'return_array_simple',
      'this:return_array_simple',
      array('array'),''
    );

    $this->addCallback(
      'return_array_multi',
      'this:return_array_multi',
      array('array'),''
    );

    $this->addCallback(
      'return_struct',
      'this:return_struct',
      array('struct'),''
    );

    $this->addCallback(
      'return_boolean',
      'this:return_boolean',
      array('boolean'),''
    );

    $this->addCallback(
      'return_date',
      'this:return_date',
      array('dateTime.iso8601'),''
    );

    $this->addCallback(
      'accept_nothing',
      'this:accept_nothing',
      array('string'),''
    );
    
    $this->addCallback(
      'accept_int',
      'this:accept_int',
      array('string', 'int'),''
    );
    
    $this->addCallback(
      'accept_double',
      'this:accept_double',
      array('string', 'double'),''
    );
    
    $this->addCallback(
      'accept_string',
      'this:accept_string',
      array('string', 'string'),''
    );
    
    $this->addCallback(
      'accept_array',
      'this:accept_array',
      array('string', 'array'),''
    );
    
    $this->addCallback(
      'accept_struct',
      'this:accept_struct',
      array('string', 'struct'),''
    );
    
    $this->addCallback(
      'accept_boolean',
      'this:accept_boolean',
      array('string', 'boolean'),''
    );
    
    $this->addCallback(
      'accept_date',
      'this:accept_date',
      array('string', 'dateTime.iso8601'),''
    );
    
    $this->addCallback(
      'accept_many',
      'this:accept_many',
      array('string', 'int', 'string', 'array', 'struct', 'boolean'),''
    );
    
    $this->serve();
  }
  
  function return_nothing() {
  }

  function return_int() {
    return 42;
  }
  
  function return_double() {
    return 42.42;
  }
  
  function return_string() {
    return "hello";
  }

  function return_array_simple() {
    return array(10,20,30);
  }
  
  function return_array_multi() {
    return array(array(10,20,"a"), array(40, 50, "b"));
  }
  
  function return_struct() {
    return array("field1" => 1, 
                 "field2" => 2, 
                 "field3" => array(10,20,"a"),
                 "field4" => array("subfield1" => 1, "subfield2" => 2));
  }
  
  function return_boolean() {
    return true; 
  }
  
  function return_date() {
    return new IXR_Date(time());
  }
  
  function accept_nothing() {
    return "OK"; 
  }
  
  function accept_int($_param) {
    return "OK {$_param}";
  }
  
  function accept_double($_param) {
    return "OK {$_param}";
  }
  
  function accept_string($_param) {
    return "OK {$_param}";
  }
  
  function accept_array($_param) {
    return "OK " . print_r($_param, true);
  }
  
  function accept_struct($_param) {
    return "OK " . print_r($_param, true);
  }

  function accept_boolean($_param) {
    return "OK {$_param}";
  }
  
  function accept_date($_param) {
    return "OK " . print_r($_param, true);
  }
  
  function accept_many($_params) {
    return print_r($_params, true) .  "\n";
  }
  
  
}

$server = new xmlrpcverver();

