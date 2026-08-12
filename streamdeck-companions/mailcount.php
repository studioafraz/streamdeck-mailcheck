<?php 
error_reporting(E_ALL & ~E_NOTICE);

header('Access-Control-Allow-Origin: *'); 

imap_timeout(IMAP_OPENTIMEOUT, 5);
imap_timeout(IMAP_READTIMEOUT, 5);
imap_timeout(IMAP_WRITETIMEOUT, 5);
imap_timeout(IMAP_CLOSETIMEOUT, 5);

function CountUnreadMail($host, $login, $passwd, &$failed, $retry = 1) {
    // n_retries = 0: the c-client's own retry is skipped, our $retry loop below handles it instead
    $mbox = @imap_open($host, $login, $passwd, 0, 0, [
        'DISABLE_AUTHENTICATOR' => 'GSSAPI'
    ]);

    if (!$mbox) {
        if ($retry > 0) {
            usleep(500000); // 0,5 Sekunden
            return CountUnreadMail($host, $login, $passwd, $failed, $retry - 1);
        }
        $failed = true;
        return 0;
    }

    $mails = imap_search($mbox, 'UNSEEN');
    $count = is_array($mails) ? count($mails) : 0;

    imap_close($mbox);
    return $count;
}

$countTotal = 0;
$startTime = microtime(true);
$timeBudget = 12; // Sekunden - bleibt unter dem 15s-Timeout auf Plugin-Seite

if ( isset($_POST['servers']) && isset($_POST['users']) && isset($_POST['passwords']) ) {

	if (strpos($_POST['servers'], 'splitMarker') !== false && strpos($_POST['users'], 'splitMarker') !== false && strpos($_POST['passwords'], 'splitMarker') !== false) { //Check for multiple accounts
		$servers = explode("splitMarker", $_POST['servers']);
		$users = explode("splitMarker", $_POST['users']);
		$passwords = explode("splitMarker", $_POST['passwords']);

		if ( (count($servers) == count($users)) && (count($users) == count($passwords)) ){
			foreach ($servers as $key => $server) {

				if ((microtime(true) - $startTime) >= $timeBudget) {
					break; // Zeitbudget aufgebraucht: lieber Teilergebnis liefern als das Client-Timeout reißen
				}

				if (strpos($server, '.gmail.com') !== false) {
					$host = '{' . $server . '/novalidate-cert:993/imap/ssl}INBOX';
				} else {
					$host = '{' . $server . ':993/imap/ssl}INBOX';
				}

				$failed = false;
				$countTotal += CountUnreadMail(
					$host,
					$users[$key],
					$passwords[$key],
					$failed
				);

				if ($failed) {
					usleep(300000); // Pause nur nach einem fehlgeschlagenen Konto, um den Server nicht zu hämmern
				}
			}
		}
		else {
			echo "Some values missing";
		}

	}
	else {
		$failed = false;
		if ( strpos($_POST['servers'], '.gmail.com') ) {
			$count = CountUnreadMail('{' . $_POST['servers'] . '/novalidate-cert:993/imap/ssl}INBOX', $_POST['users'], $_POST['passwords'], $failed);
		}
		else {
			$count = CountUnreadMail('{' . $_POST['servers'] . ':993/imap/ssl}INBOX', $_POST['users'], $_POST['passwords'], $failed);
		}

		$countTotal = $countTotal + $count;
	}

	echo $countTotal;
}
else {
	echo "Parameter<br>missing";
}


?>