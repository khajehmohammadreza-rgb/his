<?php
/**
 * Bastiyan AI gateway: Chabokan AI credentials are unrelated to Chabokan platform API keys.
 * All outbound HTTP calls are fixed to the documented AI gateway, not a user-supplied URL.
 * This library never sends patient records by itself.
 */

declare(strict_types=1);

function bastianAiEndpoint(): string { return 'https://ai.chabokan.net/v1'; }

function bastianAiConfig(string $centerId): array {
    $stored = $centerId !== '' ? bastianDbIntegrationConfig($centerId, 'chabokan_ai') : [];
    if (empty($stored['apiKey'])) $stored['apiKey'] = getenv('CHABOKAN_AI_API_KEY') ?: '';
    if (!isset($stored['dailyRequestLimit'])) $stored['dailyRequestLimit'] = '100';
    return $stored;
}

function bastianAiLogPath(string $centerId): string {
    return DATA_DIR . 'ai-usage-' . hash('sha256', $centerId) . '.json';
}

function bastianAiDailyPath(string $centerId): string {
    return DATA_DIR . 'ai-daily-' . hash('sha256',$centerId) . '.json';
}

function bastianAiRecentUsage(string $centerId): array {
    $records = readJsonFileSafe(bastianAiLogPath($centerId), []);
    if (!is_array($records)) $records = [];
    $today = date('Y-m-d');
    $todayEvents = array_values(array_filter($records, static fn($r) => is_array($r) && ($r['date'] ?? '') === $today));
    $daily = readJsonFileSafe(bastianAiDailyPath($centerId), []);
    $day = ($daily['date']??'')===$today ? $daily : [];
    return [
        'todayRequests' => (int)($day['requests'] ?? count($todayEvents)),
        'todayInputTokens' => (int)($day['inputTokens'] ?? array_sum(array_map(static fn($r) => (int)($r['inputTokens'] ?? 0), $todayEvents))),
        'todayOutputTokens' => (int)($day['outputTokens'] ?? array_sum(array_map(static fn($r) => (int)($r['outputTokens'] ?? 0), $todayEvents))),
        'recent' => array_slice($records, 0, 15),
        'note' => 'آمار محلی درخواست‌های ثبت‌شده HIS است؛ لزوماً معادل صورتحساب چابکان نیست.'
    ];
}

function bastianAiRecord(string $centerId, string $operation, string $model, int $status, array $usage = [], string $requestId = ''): void {
    // Never record prompts, AI replies, API keys, raw provider errors or identifiable patient data.
    try {
        $path = bastianAiLogPath($centerId);
        $fh = @fopen($path, 'c+');
        if (!$fh) return;
        try {
            if (!flock($fh, LOCK_EX)) return;
            $raw = stream_get_contents($fh);
            $rows = json_decode($raw ?: '[]', true);
            if (!is_array($rows)) $rows = [];
            $rows = array_slice($rows, 0, 299);
            array_unshift($rows, [
                'date' => date('Y-m-d'), 'at' => date('c'),
                'operation' => preg_replace('/[^a-z_]/', '', $operation),
                'model' => substr(preg_replace('/[^A-Za-z0-9_:\/.\-]/', '', $model), 0, 100),
                'status' => $status,
                'inputTokens' => (int)($usage['prompt_tokens'] ?? $usage['input_tokens'] ?? 0),
                'outputTokens' => (int)($usage['completion_tokens'] ?? $usage['output_tokens'] ?? 0),
                'requestId' => substr(preg_replace('/[^A-Za-z0-9_.:-]/','', $requestId), 0, 100),
            ]);
            rewind($fh);ftruncate($fh, 0);
            fwrite($fh, json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            fflush($fh);
        } finally {flock($fh, LOCK_UN);fclose($fh);}
    } catch (Throwable $ignored) { /* Metrics must never take HIS offline */ }
    // Persistent day-level totals remain accurate even when the recent-history ring rotates.
    try {
        $fh=@fopen(bastianAiDailyPath($centerId),'c+');
        if(!$fh)return;
        try {
            if(!flock($fh,LOCK_EX))return;
            $old=json_decode(stream_get_contents($fh)?:'{}',true);
            $today=date('Y-m-d');
            if(!is_array($old)||($old['date']??'')!==$today) $old=['date'=>$today,'requests'=>0,'inputTokens'=>0,'outputTokens'=>0];
            $old['requests']=(int)$old['requests']+1;
            $old['inputTokens']=(int)$old['inputTokens']+(int)($usage['prompt_tokens']??$usage['input_tokens']??0);
            $old['outputTokens']=(int)$old['outputTokens']+(int)($usage['completion_tokens']??$usage['output_tokens']??0);
            rewind($fh);ftruncate($fh,0);fwrite($fh,json_encode($old));fflush($fh);
        } finally {flock($fh,LOCK_UN);fclose($fh);}
    } catch(Throwable $ignored) { }
}

function bastianAiCheckQuota(string $centerId, array $cfg): void {
    $limit = max(0, min(10000, (int)($cfg['dailyRequestLimit'] ?? 100)));
    if ($limit > 0 && bastianAiRecentUsage($centerId)['todayRequests'] >= $limit) {
        throw new RuntimeException('سقف روزانه درخواست‌های هوش مصنوعی این مرکز تکمیل شده است.');
    }
}

function bastianAiHttp(string $method, string $path, string $apiKey, ?array $payload = null): array {
    if (!function_exists('curl_init')) throw new RuntimeException('افزونه cURL در PHP فعال نیست.');
    if (!in_array($path, ['/models','/chat/completions'], true)) throw new InvalidArgumentException('مسیر هوش مصنوعی مجاز نیست.');
    if (!in_array($method, ['GET', 'POST'], true)) throw new InvalidArgumentException('متد هوش مصنوعی معتبر نیست.');
    if ($apiKey === '') throw new RuntimeException('کلید مستقل هوش مصنوعی چابکان تنظیم نشده است.');
    $requestId = '';
    $ch = curl_init(bastianAiEndpoint() . $path);
    $headers = [ 'Authorization: Bearer ' . $apiKey, 'Accept: application/json' ];
    if ($method === 'POST') $headers[] = 'Content-Type: application/json';
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CONNECTTIMEOUT => 7, CURLOPT_TIMEOUT => 28,
        CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HEADERFUNCTION => static function ($curl, string $header) use (&$requestId): int {
            if (stripos($header,'x-request-id:')===0) $requestId = trim(substr($header, 13));
            return strlen($header);
        },
    ]);
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    if ($body === false) throw new RuntimeException('اتصال شبکه به درگاه هوش مصنوعی برقرار نشد: ' . substr($curlError,0,100));
    $data = json_decode($body, true);
    if ($status < 200 || $status >= 300) {
        $description = match($status) {
            401,403 => 'کلید AI نامعتبر است یا مجوز لازم را ندارد.',
            402 => 'اعتبار سرویس AI کافی نیست یا سقف مصرف فعال است.',
            404 => 'مدل انتخابی یا مسیر API در دسترس نیست.',
            429 => 'تعداد درخواست‌ها بیش از محدودیت سرویس است.',
            default => $status >= 500 ? 'سرویس AI موقتاً پاسخ نمی‌دهد.' : 'درخواست AI پذیرفته نشد.'
        };
        throw new RuntimeException($description . ' (HTTP ' . $status . ')');
    }
    if (!is_array($data)) throw new RuntimeException('پاسخ JSON معتبر از سرویس دریافت نشد.');
    return ['status'=>$status, 'data'=>$data, 'requestId'=>$requestId];
}

function bastianAiModels(string $centerId, bool $refresh = false): array {
    $cfg = bastianAiConfig($centerId);
    if (trim((string)($cfg['apiKey']??'')) === '') throw new RuntimeException('کلید API هوش مصنوعی چابکان تنظیم نشده است.');
    $cacheFile = DATA_DIR . 'ai-models-' . hash('sha256', $centerId . ':' . (string)$cfg['apiKey']) . '.json';
    if (!$refresh && is_file($cacheFile) && filemtime($cacheFile) >= time()-300) {
        $cache = readJsonFileSafe($cacheFile, []);
        if (isset($cache['models']) && is_array($cache['models'])) return $cache;
    }
    $response = bastianAiHttp('GET', '/models', (string)$cfg['apiKey']);
    $models = [];
    foreach (($response['data']['data']??[]) as $row) {
        if (!is_array($row) || empty($row['id'])) continue;
        $model = [ 'id' => (string)$row['id'] ];
        foreach (['name','context_length','max_completion_tokens','supported_parameters','architecture','pricing'] as $field) {
            if (isset($row[$field])) $model[$field] = $row[$field];
        }
        $models[]=$model;
    }
    $result = ['models'=>$models, 'count'=>count($models), 'fetchedAt'=>date('c'), 'requestId'=>$response['requestId']];
    writeJsonFileAtomic($cacheFile, $result);
    return $result;
}

function bastianAiPickModel(array $catalog, string $preferred = ''): string {
    $models = (array)($catalog['models'] ?? []);
    foreach ($models as $model) if (($model['id'] ?? '') === $preferred && $preferred !== '') return $preferred;
    // Prefer a model explicitly configured by admin. If unavailable, choose from live model catalog.
    foreach ($models as $model) {
        if (!empty($model['id']) && !preg_match('/(embed|audio|image|video|rerank)/i', $model['id'])) return (string)$model['id'];
    }
    return (string)($models[0]['id'] ?? '');
}

function bastianAiChat(string $centerId, string $model, array $messages, int $maxTokens = 450, string $operation = 'chat'): array {
    $cfg = bastianAiConfig($centerId);
    bastianAiCheckQuota($centerId, $cfg);
    if (trim($model)==='') throw new InvalidArgumentException('مدل معتبر انتخاب نشده است.');
    $payload=['model'=>$model,'messages'=>$messages];
    // Not all models accept the same token-budget parameter; use advertised capability.
    $catalog=bastianAiModels($centerId);
    foreach (($catalog['models']??[]) as $modelInfo) {
        if (($modelInfo['id']??'')!==$model)continue;
        $supported=(array)($modelInfo['supported_parameters']??[]);
        if (in_array('max_completion_tokens',$supported,true)) $payload['max_completion_tokens']=min(max($maxTokens,32),1000);
        elseif(in_array('max_tokens',$supported,true)) $payload['max_tokens']=min(max($maxTokens,32),1000);
        break;
    }
    try {
        $resp = bastianAiHttp('POST','/chat/completions', (string)($cfg['apiKey']??''), $payload);
    } catch(Throwable $e) {
        bastianAiRecord($centerId,$operation,$model,0,[]);
        throw $e;
    }
    bastianAiRecord($centerId,$operation,$model,(int)$resp['status'], (array)($resp['data']['usage']??[]),(string)$resp['requestId']);
    return $resp;
}
