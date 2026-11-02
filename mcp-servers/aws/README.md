# Amazon SES (all TestoZa email)

`ses.py` sets up Amazon SES, which sends every TestoZa email (automatic emails, help replies, broadcasts). It uses the `[testoza]` profile in
`.credentials` (this folder, git-ignored): an IAM user called `claude-ses-setup` with the inline
policy `claude-ses-setup-policy.json`. That policy covers SES, SNS topics named `testoza-*`,
and IAM users under `/ses-smtp/` only.

```
.venv/Scripts/python.exe ses.py status      # what's verified, quota, feedback topic
.venv/Scripts/python.exe ses.py setup       # SNS topic, bounce/complaint feedback, SMTP sign-in → .secrets.env
.venv/Scripts/python.exe ses.py subscribe   # after SES_SNS_TOPIC_ARN is live on Cloud Run
```

`.secrets.env` (git-ignored) holds `SMTP_HOST/PORT/USER/PASSWORD/FROM` and `SES_SNS_TOPIC_ARN` for the
Cloud Run service `nkc-test-2-0-backend-git` (asia-northeast1). The old Brevo values move to
`FALLBACK_SMTP_*` (the backup in backend/app/services/mailer.py).
When setup is done, deactivate the `claude-ses-setup` access key in IAM.
