# GitHub LGTM Chrome Extension

Automatically adds a random approval comment when you approve a GitHub pull request.

## What and why?

This extension saves you time during GitHub code reviews by automatically adding a random, pre-set approval comment (like “Ship it!” or “Zero notes — approved!”) whenever you click the Approve button on a pull request. No need to type the same generic responses over and over—just approve, and the extension handles the rest.

Give it a try and let me know what you think!

## Customising the messages

Don't like the built-in messages? Right-click the extension icon and choose **Options** to add, edit or remove them — one is picked at random each time you approve. Edits save automatically (a failed save is retried up to three times), and **Restore defaults** brings back the built-in list — click it twice to confirm. Your list is saved with Chrome sync, which is the only storage this extension uses.

Messages can also contain the `<AUTHOR>` placeholder, which is replaced with the pull request author's @username — for example “Nice work, `<AUTHOR>`” becomes “Nice work, @john-paul”. The options page's **Insert author tag** button drops the placeholder into the selected message for you.

## Credits

Developed by [Clyde D'Souza](https://clydedsouza.net/)
