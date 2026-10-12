<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
$dir=__DIR__.'/data'; $write=is_dir($dir)?is_writable($dir):is_writable(__DIR__);
echo json_encode(['ok'=>extension_loaded('pdo_sqlite')&&$write,'runtime'=>'php','php'=>PHP_VERSION,'pdo'=>extension_loaded('pdo'),'pdo_sqlite'=>extension_loaded('pdo_sqlite'),'openssl'=>extension_loaded('openssl'),'json'=>extension_loaded('json'),'curl'=>extension_loaded('curl'),'mbstring'=>extension_loaded('mbstring'),'dataWritable'=>$write,'database'=>'embedded-sqlite','externalDatabaseRequired'=>false],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT);
