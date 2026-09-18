# How the Forms Work — Deutsch am Abend

This website's Registration and Donation forms use **mailto links**, not a
third-party email service. There is nothing to sign up for and nothing to
configure — it works as-is, right out of the box.

## How it works

When a visitor fills out the Registration form (`registration.html`) or the
Donation form (`donate.html`) and clicks the submit button, their own email
app opens automatically (Gmail, Outlook, Apple Mail, whatever they have set
up on their device or browser) with a new message already filled in:

- **To:** info.deutschamabend@gmail.com
- **Subject:** a summary of their registration or donation enquiry
- **Body:** every field they filled in in the form

The visitor just needs to press **Send** in their own email app to complete
it. Nothing is sent automatically without their final confirmation.

## What you need to do

**Nothing.** This is the whole point of this approach — there's no account
to create, no API key to paste in, no template to set up. If you ever want
to change which email address the forms send to, you can edit one line in
each of these two files:

- `assets/registration-mailto.js` — look for the line near the top:
  `var EMAIL_TO = 'info.deutschamabend@gmail.com';`
- `assets/donation-mailto.js` — look for the line near the top:
  `var DONATION_EMAIL_TO = 'info.deutschamabend@gmail.com';`

Just change the email address inside the quotes and save the file.

## Limitations to be aware of

- **Requires an email app to be set up on the visitor's device.** On most
  phones and computers this works automatically. If someone's device has
  no email app configured at all, nothing will open — this is rare, but if
  a visitor reports trouble registering, suggest they email
  info.deutschamabend@gmail.com directly instead (a link for this is also
  shown on the form itself).
- **The visitor must press Send themselves.** This is intentional — it
  means nothing is ever sent without the visitor seeing and confirming the
  exact message first.
- **No copy is saved on the website itself.** Since there's no backend or
  third-party service involved, the only record of a submission is the
  email you receive once the visitor sends it.

## Testing it

Open `registration.html` (or `donate.html`) in a browser, fill out the
form, and click submit. Your email app should open with the message ready
to go. This works the same way whether the site is opened as a local file
or after uploading it to GitHub Pages or any other host.

---

**Questions?** Email info.deutschamabend@gmail.com
