<?php 
error_reporting(E_ALL & ~E_NOTICE);

header('Access-Control-Allow-Origin: *'); 

imap_timeout(IMAP_OPENTIMEOUT, 5);
imap_timeout(IMAP_READTIMEOUT, 5);
imap_timeout(IMAP_WRITETIMEOUT, 5);
imap_timeout(IMAP_CLOSETIMEOUT, 5);

function CountUnreadMail($host, $login, $passwd, $retry = 1) {
    $mbox = @imap_open($host, $login, $passwd, 0, 1, [
        'DISABLE_AUTHENTICATOR' => 'GSSAPI'
    ]);

    if (!$mbox) {
        if ($retry > 0) {
            usleep(500000); // 0,5 Sekunden
            return CountUnreadMail($host, $login, $passwd, $retry - 1);
        }
        return 0;
    }

    $mails = imap_search($mbox, 'UNSEEN');
    $count = is_array($mails) ? count($mails) : 0;

    imap_close($mbox);
    return $count;
}

$countTotal = 0;

if ( isset($_GET['servers']) && isset($_GET['users']) && isset($_GET['passwords']) ) {
	
	if (strpos($_GET['servers'], 'splitMarker') && strpos($_GET['users'], 'splitMarker') && strpos($_GET['passwords'], 'splitMarker')) { //Check for multiple accounts
		$servers = explode("splitMarker", $_GET['servers']);
		$users = explode("splitMarker", $_GET['users']);
		$passwords = explode("splitMarker", $_GET['passwords']);
		
		if ( (count($servers) == count($users)) && (count($users) == count($passwords)) ){
			foreach ($servers as $key => $server) {

				if (strpos($server, '.gmail.com') !== false) {
					$host = '{' . $server . '/novalidate-cert:993/imap/ssl}INBOX';
				} else {
					$host = '{' . $server . ':993/imap/ssl}INBOX';
				}

				$countTotal += CountUnreadMail(
					$host,
					$users[$key],
					$passwords[$key]
				);

				usleep(300000); // 0,3 Sekunden Pause zwischen Accounts
			}
		}
		else {
			echo "Some values missing";
		}

	}
	else {
		if ( strpos($_GET['servers'], '.gmail.com') ) {
			$count = CountUnreadMail('{' . $_GET['servers'] . '/novalidate-cert:993/imap/ssl}INBOX', $_GET['users'], $_GET['passwords']);
		}
		else {
			$count = CountUnreadMail('{' . $_GET['servers'] . ':993/imap/ssl}INBOX', $_GET['users'], $_GET['passwords']);
		}
		
		$countTotal = $countTotal + $count;
	}

	echo $countTotal; 
}
else {
	echo "Parameter<br>missing";
}


?>