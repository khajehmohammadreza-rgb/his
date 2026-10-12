<?php
declare(strict_types=1);

/**
 * Bastiyan HIS R19 — reliable JavaScript runtime transport for Chabokan.
 * Critical rule: NEVER send Content-Length for streamed runtime assets.
 */
ini_set('display_errors', '0');
ini_set('zlib.output_compression', '0');
@ini_set('output_buffering', '0');

$file = (string)($_GET['file'] ?? '');
$file = str_replace('\\', '/', $file);

if ($file === '' ||
    str_contains($file, '..') ||
    !preg_match('#^(?:app|client-vendor)/[A-Za-z0-9_./-]+\.js$#', $file)) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'INVALID_RUNTIME_ASSET';
    exit;
}

$projectRoot = realpath(__DIR__ . '/..');
$target = realpath($projectRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $file));

if ($projectRoot === false || $target === false || !is_file($target)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'RUNTIME_ASSET_NOT_FOUND';
    exit;
}

$appRoot = realpath($projectRoot . DIRECTORY_SEPARATOR . 'app');
$vendorRoot = realpath($projectRoot . DIRECTORY_SEPARATOR . 'client-vendor');
$allowed = ($appRoot && str_starts_with($target, $appRoot . DIRECTORY_SEPARATOR))
        || ($vendorRoot && str_starts_with($target, $vendorRoot . DIRECTORY_SEPARATOR));
if (!$allowed) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'RUNTIME_ASSET_FORBIDDEN';
    exit;
}

while (ob_get_level() > 0) {
    @ob_end_clean();
}

header_remove('Content-Length');
header_remove('Content-Encoding');
header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, no-transform, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Content-Type-Options: nosniff');
header('X-Accel-Buffering: no');
header('X-Bastiyan-Runtime-Stream: r19');
header('X-Bastiyan-Asset-Bytes: ' . (string)filesize($target));
header('X-Bastiyan-Asset-SHA256: ' . hash_file('sha256', $target));

$fh = fopen($target, 'rb');
if ($fh === false) {
    http_response_code(500);
    echo 'RUNTIME_ASSET_OPEN_FAILED';
    exit;
}

while (!feof($fh)) {
    $chunk = fread($fh, 65536);
    if ($chunk === false) {
        fclose($fh);
        exit;
    }
    echo $chunk;
    if (function_exists('fastcgi_finish_request')) {
        // Do NOT call fastcgi_finish_request here: it would terminate streaming.
    }
    @flush();
}
fclose($fh);
exit;
