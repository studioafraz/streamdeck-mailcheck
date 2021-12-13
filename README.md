# streamdeck-mailcheck
Display total number of unread e-mails in IMAP accounts (including Gmail).

## Hints
- The plugin title in your Stream Deck App must be enabled and empty to display contents.
- You need a PHP server to run this plugin. You can use local solutions like XAMPP (free) as well as shared hosting providers. **If you work with XAMPP you must activate its PHP IMAP extension first.**
- To use a Gmail inbox you need to enable IMAP in your Gmail settings first. After that you must set up the 2-Step-Verification in your Google account settings and define an *App Password* to set up this plugin, because **your regular password doesn't work here.**


## Setup
1. Install Plugin using *com.studioafraz.mailcheck.streamDeckPlugin* from *MailCheck* folder
2. Upload *mailcount.php* from *streamdeck-companions* folder to your PHP server
3. Enter public URL to PHP file (e. g. https://example.com/mailcount.php or http://localhost/mailcount.php) and your credentials into plugin settings