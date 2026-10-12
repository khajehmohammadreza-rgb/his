<?php
/**
 * Bastiyan HIS 3.0.1 - Browser runtime vendor cache.
 * Downloads pinned ESM packages during first setup and rewrites the dependency graph
 * to local same-origin files so the application does not depend on a CDN at runtime.
 *
 * Fix r8: negative lookbehind on from-rewriter prevents false matches on
 *         Array.from("str") and similar minified JS method calls.
 *         JS-syntax guard on $isPackage prevents treating data strings as package names.
 */
function bastianVendorDefinitions(): array {
    $t='?target=es2020';
    return [
        'react'           => ['url'=>'https://esm.sh/react@19.0.1'.$t,                                               'file'=>'react.js'],
        'react/jsx-runtime'=> ['url'=>'https://esm.sh/react@19.0.1/jsx-runtime'.$t,                                  'file'=>'react-jsx-runtime.js'],
        'react-dom/client' => ['url'=>'https://esm.sh/react-dom@19.0.1/client?deps=react@19.0.1&target=es2020',       'file'=>'react-dom-client.js'],
        'jsbarcode'        => ['url'=>'https://esm.sh/jsbarcode@3.12.3'.$t,                                           'file'=>'jsbarcode.js'],
        'lucide-react'     => ['url'=>'https://esm.sh/lucide-react@0.546.0?deps=react@19.0.1&target=es2020',          'file'=>'lucide-react.js'],
        'motion/react'     => ['url'=>'https://esm.sh/motion@12.23.24/react?deps=react@19.0.1,react-dom@19.0.1&target=es2020', 'file'=>'motion-react.js'],
        'qrcode.react'     => ['url'=>'https://esm.sh/qrcode.react@4.2.0?deps=react@19.0.1&target=es2020',            'file'=>'qrcode-react.js'],
        'recharts'         => ['url'=>'https://esm.sh/recharts@3.10.0?deps=react@19.0.1,react-dom@19.0.1&target=es2020','file'=>'recharts.js'],
        'xlsx'             => ['url'=>'https://esm.sh/xlsx@0.18.5'.$t,                                                'file'=>'xlsx.js'],
    ];
}

function bastianVendorDir(): string {
    return defined('BASTIAN_VENDOR_ROOT')
        ? rtrim((string)BASTIAN_VENDOR_ROOT, '/\\')
        : dirname(__DIR__).'/vendor';
}
function bastianVendorManifestPath(): string { return bastianVendorDir().'/manifest.json'; }

function bastianVendorReady(): bool {
    $m = bastianVendorManifestPath();
    if (!is_file($m)) return false;
    $d = json_decode((string)@file_get_contents($m), true);
    if (!is_array($d) || empty($d['complete'])) return false;
    if (($d['resolverVersion'] ?? '') !== '2026-08-08-r8') return false;
    foreach (bastianVendorDefinitions() as $v)
        if (!is_file(bastianVendorDir().'/'.$v['file'])) return false;
    return true;
}

function bastianHttpGet(string $url): string {
    if (!extension_loaded('curl'))
        throw new RuntimeException('افزونه cURL برای دریافت پیش‌نیازهای مرورگر فعال نیست.');
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 8,
        CURLOPT_CONNECTTIMEOUT => 12,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_ENCODING       => '',
        CURLOPT_USERAGENT      => 'Bastiyan-HIS/3.0 VendorSetup',
        CURLOPT_HTTPHEADER     => ['Accept: application/javascript,text/javascript,*/*;q=0.8'],
    ]);
    $body  = curl_exec($ch);
    $code  = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err   = curl_error($ch);
    curl_close($ch);
    if ($body === false || $code < 200 || $code >= 300)
        throw new RuntimeException("دریافت وابستگی ناموفق بود (HTTP {$code}): {$url} {$err}");
    return (string)$body;
}

function bastianResolveUrl(string $base, string $spec): ?string {
    $spec = trim($spec);
    if ($spec === '') return null;
    if (str_starts_with($spec, 'https://')) return $spec;
    if (str_starts_with($spec, 'http://'))  return 'https://'.substr($spec, 7);

    $p = parse_url($base);
    if (!$p || empty($p['host'])) return null;
    $scheme   = $p['scheme'] ?? 'https';
    $origin   = $scheme.'://'.$p['host'].(isset($p['port']) ? ':'.$p['port'] : '');
    $basePath = $p['path'] ?? '/';

    if (str_starts_with($spec, '?')) return $origin.$basePath.$spec;
    if (str_starts_with($spec, '#')) {
        $q = isset($p['query']) ? '?'.$p['query'] : '';
        return $origin.$basePath.$q.$spec;
    }
    if (str_starts_with($spec, '/')) return $origin.$spec;
    if (!str_starts_with($spec, '.')) return null;

    $dir = preg_replace('~/[^/]*$~', '/', $basePath);
    $raw = $dir.$spec;
    $query = '';
    if (($qpos = strpos($raw, '?')) !== false) {
        $query = substr($raw, $qpos);
        $raw   = substr($raw, 0, $qpos);
    }
    $parts = [];
    foreach (explode('/', $raw) as $part) {
        if ($part === '' || $part === '.') continue;
        if ($part === '..') array_pop($parts);
        else $parts[] = $part;
    }
    return $origin.'/'.implode('/', $parts).$query;
}

function bastianPrepareVendor(bool $force = false): array {
    @set_time_limit(0);
    $dir   = bastianVendorDir();
    $cache = $dir.'/cache';
    @mkdir($cache, 0755, true);

    if (!$force && bastianVendorReady())
        return ['success'=>true, 'cached'=>true, 'files'=>count(glob($cache.'/*.js') ?: [])];

    foreach (glob($cache.'/*') ?: [] as $f) @unlink($f);

    $defs      = bastianVendorDefinitions();
    $urlToPath = [];
    foreach ($defs as $def) $urlToPath[$def['url']] = $def['file'];

    $queue     = [];
    foreach ($defs as $def) $queue[] = $def['url'];
    $processed = [];
    $limit     = 1400;

    $localFor = function(string $url) use (&$urlToPath, $cache) {
        if (isset($urlToPath[$url])) return $urlToPath[$url];
        $name = 'cache/'.hash('sha256', $url).'.js';
        $urlToPath[$url] = $name;
        return $name;
    };

    $count = 0;
    while ($queue) {
        $url = array_shift($queue);
        if (isset($processed[$url])) continue;
        if (++$count > $limit)
            throw new RuntimeException('تعداد وابستگی‌های مرورگر بیش از حد مجاز شد.');
        $processed[$url] = true;
        $rel = $localFor($url);

        if ($rel === 'motion-react.js') {
            $body = <<<'JS'
import * as React from './react.js';

const OMIT = new Set([
  'initial','animate','exit','transition','variants','whileHover','whileTap',
  'whileFocus','whileInView','viewport','layout','layoutId','custom',
  'drag','dragConstraints','dragElastic','dragMomentum','onAnimationStart',
  'onAnimationComplete'
]);

function cleanProps(input) {
  const out = {};
  for (const [k, v] of Object.entries(input || {})) {
    if (OMIT.has(k)) continue;
    out[k] = v;
  }
  return out;
}

const componentCache = new Map();
export const motion = new Proxy({}, {
  get(_target, tag) {
    if (componentCache.has(tag)) return componentCache.get(tag);
    const C = React.forwardRef((props, ref) => {
      const p = cleanProps(props);
      return React.createElement(tag, { ...p, ref }, props?.children);
    });
    C.displayName = 'BastiyanMotion(' + String(tag) + ')';
    componentCache.set(tag, C);
    return C;
  }
});

export function AnimatePresence({ children }) {
  return React.createElement(React.Fragment, null, children);
}
JS;
            $path = $dir.'/'.$rel;
            @mkdir(dirname($path), 0755, true);
            if (@file_put_contents($path, $body, LOCK_EX) === false)
                throw new RuntimeException('امکان نوشتن Motion shim وجود ندارد.');
            continue;
        }

        $body = bastianHttpGet($url);

        $rewrite = function($spec) use ($url, &$queue, $localFor, $defs) {
            $targetLocal = null;
            if (isset($defs[$spec])) {
                $targetLocal = $defs[$spec]['file'];
            } else {
                $abs = bastianResolveUrl($url, $spec);
                if (!$abs) {
                    $candidate  = trim((string)$spec);
                    $isPackage  = $candidate !== ''
                        && !preg_match('~^(?:[./?#]|https?://|data:|blob:)~i', $candidate)
                        && !preg_match('~[;()=\[\],{}\s\\\\]~',               $candidate)
                        && preg_match(
                               '~^(?:@[A-Za-z0-9._~-]+/[A-Za-z0-9._~-]+|[A-Za-z0-9._~-]+)'
                              .'(?:@[^/?#]+)?(?:/[^?#]*)?(?:[?#].*)?$~',
                               $candidate);
                    if ($isPackage) {
                        $abs = 'https://esm.sh/'.ltrim($candidate, '/');
                        if (!str_contains($abs, 'target='))
                            $abs .= str_contains($abs, '?') ? '&target=es2020' : '?target=es2020';
                    }
                }
                if (!$abs) return $spec;
                $targetLocal = $localFor($abs);
                $queue[]     = $abs;
            }
            $fromDir   = dirname($localFor($url));
            $prefix    = $fromDir === '.' ? '' : $fromDir.'/';
            $fromAbs   = '/'.$prefix;
            $targetAbs = '/'.$targetLocal;
            $a = array_values(array_filter(explode('/', trim($fromAbs,   '/'))));
            $b = array_values(array_filter(explode('/', trim($targetAbs, '/'))));
            while ($a && $b && $a[0] === $b[0]) { array_shift($a); array_shift($b); }
            $r = str_repeat('../', count($a)).implode('/', $b);
            if ($r === '' || !str_starts_with($r, '.')) $r = './'.$r;
            return $r;
        };

        // from "..." with negative lookbehind to skip .from("str") method calls
        $body = preg_replace_callback(
            '~(?<![.\w])(\bfrom\s*)(["\'])([^"\']+)\2~',
            fn($m) => $m[1].$m[2].$rewrite($m[3]).$m[2],
            $body
        );
        $body = preg_replace_callback(
            '~(\bimport\s*\(\s*)(["\'])([^"\']+)\2(\s*\))~',
            fn($m) => $m[1].$m[2].$rewrite($m[3]).$m[2].$m[4],
            $body
        );
        $body = preg_replace_callback(
            '~(\bimport\s*)(["\'])([^"\']+)\2~',
            fn($m) => $m[1].$m[2].$rewrite($m[3]).$m[2],
            $body
        );

        $checkPatterns = [
            '~(?<![.\w])\bfrom\s*["\']([^"\']+)["\']~',
            '~\bimport\s*\(\s*["\']([^"\']+)["\']\s*\)~',
            '~\bimport\s*["\']([^"\']+)["\']~',
        ];
        foreach ($checkPatterns as $cp) {
            if (preg_match_all($cp, $body, $mm)) {
                foreach ($mm[1] as $left) {
                    $left = trim((string)$left);
                    if ($left === '') continue;
                    if (str_starts_with($left, '.'))     continue;
                    if (str_starts_with($left, 'data:')) continue;
                    if (str_starts_with($left, 'blob:')) continue;
                    if (preg_match('~[;()=\[\],{}\s\\\\]~', $left)) continue;
                    throw new RuntimeException('وابستگی ESM حل‌نشده در '.$rel.': '.$left);
                }
            }
        }

        $path = $dir.'/'.$rel;
        @mkdir(dirname($path), 0755, true);
        if (@file_put_contents($path, $body, LOCK_EX) === false)
            throw new RuntimeException('امکان نوشتن فایل Vendor وجود ندارد: '.$rel);
    }

    $manifest = [
        'complete'        => true,
        'resolverVersion' => '2026-08-08-r8',
        'createdAt'       => date('c'),
        'entries'         => array_map(fn($v) => $v['file'], $defs),
        'files'           => $count,
    ];
    file_put_contents(
        bastianVendorManifestPath(),
        json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
        LOCK_EX
    );
    file_put_contents(
        $dir.'/.htaccess',
        "Options -Indexes\n<IfModule mod_headers.c>\n<FilesMatch \"\\.(js|json)$\">\n  Header set Cache-Control \"no-cache, must-revalidate\"\n</FilesMatch>\n</IfModule>\n",
        LOCK_EX
    );
    return ['success'=>true, 'cached'=>false, 'files'=>$count];
}
