<?php 

function CountUnreadMail($host, $login, $passwd) {
    $mbox = imap_open($host, $login, $passwd);
    $count = 0;
    if (!$mbox) {
        echo "Error";
    } else {
        $headers = imap_headers($mbox);
        foreach ($headers as $mail) {
            $flags = substr($mail, 0, 4);
            $isunr = (strpos($flags, "U") !== false);
            if ($isunr)
            $count++;
        }
    }

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
			foreach ($servers as $key=>$server) {
				if ( strpos($server, 'imap.gmail.com') ) {
					$count = CountUnreadMail('{' . $server . '/novalidate-cert:993/imap/ssl}INBOX', $users[$key], $passwords[$key]);
				}
				else {
					$count = CountUnreadMail('{' . $server . ':993/imap/ssl}INBOX', $users[$key], $passwords[$key]);
				}
				
				$countTotal = $countTotal + $count;
			}
		}
		else {
			echo "Some values missing";
		}

	}
	else {
		if ( strpos($_GET['servers'], 'imap.gmail.com') ) {
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