<?php
/**
 * Saman Kish (SEP) PC-POS Driver Library - Protocol SSP1126 over TCP/IP LAN
 * Bastiyan HIS Professional POS Subsystem
 */

if (!defined('SAMANKISH_DEFAULT_IP')) define('SAMANKISH_DEFAULT_IP', '192.168.1.142');
if (!defined('SAMANKISH_DEFAULT_PORT')) define('SAMANKISH_DEFAULT_PORT', 1197);
if (!defined('SAMANKISH_DEFAULT_TERMINAL_ID')) define('SAMANKISH_DEFAULT_TERMINAL_ID', '21638385');

/**
 * Format Saman Kish SSP1126 Purchase Packet
 * Format: [STX][Length][Message Type][TerminalID][Amount][InvoiceNo][AdditionalData][ETX][LRC]
 */
function buildSsp1126SalePacket(string $terminalId, int $amountRials, string $invoiceNo = ''): string {
    $stx = "\x02";
    $etx = "\x03";
    $msgType = "01"; // 01 = Sale / Purchase
    $term = str_pad(substr($terminalId, 0, 8), 8, '0', STR_PAD_LEFT);
    $amt = str_pad((string)$amountRials, 12, '0', STR_PAD_LEFT);
    $inv = str_pad(substr($invoiceNo ?: (string)time(), -6), 6, '0', STR_PAD_LEFT);
    $add = "00"; // Additional data length 00

    $body = $msgType . $term . $amt . $inv . $add;
    $len = str_pad((string)strlen($body), 4, '0', STR_PAD_LEFT);
    $packetWithoutLrc = $stx . $len . $body . $etx;

    // Calculate XOR LRC
    $lrc = 0;
    for ($i = 1; $i < strlen($packetWithoutLrc); $i++) {
        $lrc ^= ord($packetWithoutLrc[$i]);
    }

    return $packetWithoutLrc . chr($lrc);
}

/**
 * Parse Saman Kish SSP1126 Response Packet
 */
function parseSsp1126Response(string $raw): array {
    if (strlen($raw) < 10) {
        return [
            'success' => false,
            'responseCode' => '99',
            'message' => 'پاسخ نامعتبر یا کوتاه از کارتخوان سامان‌کیش دریافت شد.',
            'raw' => bin2hex($raw)
        ];
    }

    // Strip STX / ETX / LRC
    $clean = trim($raw, "\x00..\x1F");
    
    // Look for standard response code in payload (00 = Success)
    // Common SEP format: [Type 2B][RespCode 2B][TermID 8B][RRN 12B][Trace 6B][MaskedPan 16B]...
    $isSuccess = substr($clean, 2, 2) === '00';
    
    // Extract RRN (12 digits) if present
    $rrn = '';
    if (preg_match('/\b(\d{12})\b/', $clean, $matches)) {
        $rrn = $matches[1];
    }

    // Extract Masked Card Number (e.g. 603799******1234 or 16 digits)
    $maskedPan = '';
    if (preg_match('/(\d{6}\*{4,6}\d{4})/', $clean, $panMatches)) {
        $maskedPan = $panMatches[1];
    }

    return [
        'success' => $isSuccess,
        'responseCode' => $isSuccess ? '00' : 'E1',
        'message' => $isSuccess ? 'تراکنش با موفقیت انجام شد.' : 'تراکنش ناموفق بود یا توسط کاربر لغو گردید.',
        'rrn' => $rrn,
        'traceNumber' => $rrn !== '' ? substr($rrn, -6) : '',
        'maskedPan' => $maskedPan,
        'terminalId' => SAMANKISH_DEFAULT_TERMINAL_ID,
        'date' => date('Y-m-d H:i:s'),
        'rawHex' => bin2hex($raw)
    ];
}

/**
 * Perform Saman Kish TCP Socket Sale Call
 */
function executeSamanKishSale(string $ip, int $port, string $terminalId, int $amountRials, string $invoiceNo, int $timeout = 65): array {
    // Normalize IP (e.g. 192.168.001.142 -> 192.168.1.142)
    $normalizedIp = implode('.', array_map('intval', explode('.', trim($ip))));
    if (!filter_var($normalizedIp, FILTER_VALIDATE_IP)) {
        return ['success' => false, 'error' => 'آدرس IP کارتخوان سامان‌کیش نامعتبر است: ' . $ip];
    }

    $packet = buildSsp1126SalePacket($terminalId, $amountRials, $invoiceNo);

    $errno = 0;
    $errstr = '';
    $fp = @fsockopen($normalizedIp, $port, $errno, $errstr, 5); // 5 sec connection timeout

    if (!$fp) {
        return [
            'success' => false,
            'connected' => false,
            'error' => "امکان برقراری ارتباط با پوز سامان‌کیش در {$normalizedIp}:{$port} وجود ندارد ({$errstr} - کد {$errno}). اگر HIS روی چابکان ابری است و کارتخوان IP خصوصی 192.168.x.x دارد، سرور ابری به شبکه داخلی مرکز دسترسی مستقیم ندارد و باید بین چابکان و LAN مرکز VPN/تونل امن یا Bridge محلی برقرار باشد. در شبکه محلی نیز کابل، IP و فعال بودن SSP1126 را بررسی کنید.",
            'networkHint' => str_starts_with($normalizedIp,'192.168.') || str_starts_with($normalizedIp,'10.') ? 'private_lan_requires_secure_tunnel_or_local_bridge_when_his_is_cloud' : 'check_route_and_firewall',
            'terminalId' => $terminalId,
            'ip' => $normalizedIp,
            'port' => $port
        ];
    }

    // Set read/write stream timeout for PIN entry (e.g. 60 seconds)
    stream_set_timeout($fp, $timeout);

    // Send packet
    $written = @fwrite($fp, $packet);
    if ($written === false) {
        @fclose($fp);
        return ['success' => false, 'error' => 'خطا در ارسال بسته اطلاعاتی به کارتخوان سامان‌کیش.'];
    }

    // Wait for response
    $response = '';
    $meta = stream_get_meta_data($fp);
    while (!feof($fp) && !$meta['timed_out']) {
        $chunk = @fread($fp, 512);
        if ($chunk === false || $chunk === '') break;
        $response .= $chunk;
        if (strpos($response, "\x03") !== false) {
            // End of text received
            $response .= @fread($fp, 1); // read LRC
            break;
        }
        $meta = stream_get_meta_data($fp);
    }
    @fclose($fp);

    if ($meta['timed_out'] && empty($response)) {
        return [
            'success' => false,
            'timedOut' => true,
            'error' => 'زمان انتظار برای کشیدن کارت یا ورود رمز در کارتخوان سامان‌کیش به پایان رسید (Timeout).'
        ];
    }

    return parseSsp1126Response($response);
}

/**
 * Ping / Handshake Saman Kish POS
 */
function pingSamanKishPos(string $ip, int $port, int $timeout = 3): array {
    $normalizedIp = implode('.', array_map('intval', explode('.', trim($ip))));
    if (!filter_var($normalizedIp, FILTER_VALIDATE_IP)) {
        return ['success' => false, 'connected' => false, 'error' => 'آدرس IP نامعتبر است.'];
    }

    $errno = 0;
    $errstr = '';
    $start = microtime(true);
    $fp = @fsockopen($normalizedIp, $port, $errno, $errstr, $timeout);
    $latency = round((microtime(true) - $start) * 1000, 1);

    if (!$fp) {
        return [
            'success' => false,
            'connected' => false,
            'ip' => $normalizedIp,
            'port' => $port,
            'error' => "عدم پاسخگویی پوز در {$normalizedIp}:{$port} ({$errstr})",
            'latencyMs' => $latency
        ];
    }

    @fclose($fp);
    return [
        'success' => true,
        'connected' => true,
        'ip' => $normalizedIp,
        'port' => $port,
        'message' => "ارتباط شبکه با کارتخوان سامان‌کیش برقرار است ({$latency}ms).",
        'latencyMs' => $latency
    ];
}
