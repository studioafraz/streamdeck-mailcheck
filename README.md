# streamdeck-mailcheck
Display total number of unread e-mails in IMAP accounts (including Gmail).

## Setup
To keep this script lightweight and fast you need a PHP server. You can use local solutions like XAMPP as well as shared hosting providers. **If you work with XAMPP you must activate its PHP IMAP extension first.**
1. Install Plugin using *.streamDeckPlugin* file from *build* folder.
2. Put *mailcount.php* from *streamdeck-companions* folder to your PHP server.
3. Copy public URL to companion script (e. g. https://example.com/mailcount.php or http://localhost/mailcount.php) and your credentials into plugin settings.