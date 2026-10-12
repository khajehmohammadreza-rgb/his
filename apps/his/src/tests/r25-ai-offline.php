<?php
/** Offline, side-effect-isolated tests for R25 AI integration; NO live API calls. */
$dir=sys_get_temp_dir().'/bastiyan-r25-ai-'.bin2hex(random_bytes(5));
mkdir($dir,0700,true);
define('DATA_DIR',$dir.'/');
function readJsonFileSafe($path,$default=[]){if(!is_file($path))return $default;$v=json_decode((string)file_get_contents($path),true);return is_array($v)?$v:$default;}
function writeJsonFileAtomic($path,$data){return file_put_contents($path,json_encode($data))!==false;}
require __DIR__.'/../api/chabokan_ai_lib.php';
function verify($cond,$message){if(!$cond)throw new RuntimeException($message);}
try {
    verify(bastianAiEndpoint()==='https://ai.chabokan.net/v1','official AI endpoint');
    verify(bastianAiPickModel(['models'=>[['id'=>'openai/foo'],['id'=>'gemini/bar']]],'gemini/bar')==='gemini/bar','exact preferred id');
    verify(bastianAiPickModel(['models'=>[['id'=>'openai/foo'],['id'=>'gemini/bar']]],'other')==='openai/foo','safe catalog fallback');
    verify(bastianAiPickModel(['models'=>[['id'=>'audio/tts'],['id'=>'openai/chat']]])==='openai/chat','exclude non chat model');
    $secret='NOT_A_REAL_CHABOKAN_KEY_TEST_ONLY';
    bastianAiRecord('test_center','smoke_test','openai/sample',200,['prompt_tokens'=>7,'completion_tokens'=>11],'example-request');
    bastianAiRecord('test_center','lilian','openai/sample',0,[]);
    $usage=bastianAiRecentUsage('test_center');
    verify($usage['todayRequests']===2,'accurate persisted requests');
    verify($usage['todayInputTokens']===7 && $usage['todayOutputTokens']===11,'token accounting');
    verify(count($usage['recent'])===2,'recent logs');
    $log=(string)file_get_contents(bastianAiLogPath('test_center'));
    verify(!str_contains($log,$secret),'no credential in usage log');
    $quota=['dailyRequestLimit'=>2];
    $blocked=false;
    try {bastianAiCheckQuota('test_center',$quota);}catch(RuntimeException $e){$blocked=true;}
    verify($blocked,'quota enforced');
    $quota=['dailyRequestLimit'=>0];bastianAiCheckQuota('test_center',$quota);
    echo "R25 AI offline tests: PASS (8 checks)\n";
} finally {
    foreach(glob($dir.'/*')?:[] as $file)unlink($file);
    rmdir($dir);
}
