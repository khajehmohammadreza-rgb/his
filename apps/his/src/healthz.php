<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
echo json_encode([
    'ok' => true,
    'service' => 'Bastiyan HIS',
    'version' => '5.1.4',
    'build' => '514-1405-r24',
    'php' => PHP_VERSION,
    'time' => gmdate('c')
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
