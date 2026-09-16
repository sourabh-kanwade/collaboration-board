# User Session

We need to create a user session for where user can share his session with other users and it needs to be an anonymous user need not to be login on the side to share the session.
user will have shareable link that can be shared with other users and if users joins using that link then he can collaborate on the drawing board with the other users.

### Requirements

- When user clicks on live collaboration on sidebar a dialog a with name and copy link option.
- session will start as user clicks on like collaboration button.
- Take user name as input
- link will be auto-generated and read only
- We will also show the QR code of link.
- add button at the bottom to stop session
- show user icons with activity
- maintain sessions in detail in database

### Check when done

- new components compile without typescript errors
- no lint errors
- functionality must work correctly.
- use pnpm
