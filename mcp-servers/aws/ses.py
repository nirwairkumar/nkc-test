"""
Amazon SES for every TestoZa email (backend: services/mailer.py, routers/email_broadcast.py).

Signs in with the [testoza] profile in .credentials next to this file (an IAM user limited to
SES, SNS topics named testoza-* and IAM users under /ses-smtp/: see README in this folder).

  .venv/Scripts/python.exe ses.py status      identities (testoza.com, mail., send.), DKIM, MAIL FROM, quota
  .venv/Scripts/python.exe ses.py identities  notify. + news. sending subdomains; prints their DNS records
  .venv/Scripts/python.exe ses.py setup       SNS topic + bounce/complaint feedback + SMTP sign-in
  .venv/Scripts/python.exe ses.py subscribe   point the topic at the backend (after SES_SNS_TOPIC_ARN is live)

Secrets never print: setup writes them to .secrets.env (git-ignored) for Cloud Run.
"""

import argparse
import base64
import hashlib
import hmac
import json
import os
import sys
from pathlib import Path

# The sign-in lives next to this script (git-ignored), not in ~/.aws.
os.environ.setdefault("AWS_SHARED_CREDENTIALS_FILE", str(Path(__file__).with_name(".credentials")))

import boto3  # noqa: E402  (reads AWS_SHARED_CREDENTIALS_FILE on first use)

PROFILE = "testoza"
REGION = "ap-southeast-2"  # where SES production access was granted (29 Oct 2026)
OTHER_REGIONS = ("ap-northeast-1",)  # send.testoza.com's MAIL FROM points at Tokyo
DOMAIN = "testoza.com"
# Sending subdomains (2026-11-02): automatic emails and broadcasts each keep their own reputation,
# away from the people-to-people mailboxes on testoza.com (Zoho). Each gets its own bounce domain.
STREAMS = {
    "notify.testoza.com": "bounce.notify.testoza.com",  # automatic emails: no-reply@notify.testoza.com
    "news.testoza.com": "bounce.news.testoza.com",      # broadcasts: nirwair@news.testoza.com
}
TOPIC = "testoza-ses-events"
SMTP_USER = "testoza-broadcasts"
SMTP_PATH = "/ses-smtp/"
ENDPOINT = "https://apigcp.testoza.com/api/email-broadcast/ses-events"
SECRETS = Path(__file__).with_name(".secrets.env")


def session():
    return boto3.Session(profile_name=PROFILE)


def smtp_password(secret_key: str, region: str) -> str:
    """AWS's documented derivation of an SES SMTP password from an IAM secret key."""
    def sign(key: bytes, msg: str) -> bytes:
        return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()

    sig = sign(("AWS4" + secret_key).encode("utf-8"), "11111111")
    for part in (region, "ses", "aws4_request", "SendRawEmail"):
        sig = sign(sig, part)
    return base64.b64encode(bytes([0x04]) + sig).decode("utf-8")


def status() -> None:
    s = session()
    print("account", s.client("sts").get_caller_identity()["Account"])
    for region in (REGION, *OTHER_REGIONS):
        v2 = s.client("sesv2", region_name=region)
        acct = v2.get_account()
        quota = acct.get("SendQuota", {})
        print(f"\n== {region}: production={acct.get('ProductionAccessEnabled')} sending={acct.get('SendingEnabled')} "
              f"quota={quota.get('Max24HourSend')}/day rate={quota.get('MaxSendRate')}/s "
              f"suppression={acct.get('SuppressionAttributes', {}).get('SuppressedReasons')}")
        for ident in v2.list_email_identities().get("EmailIdentities", []):
            d = v2.get_email_identity(EmailIdentity=ident["IdentityName"])
            dkim = d.get("DkimAttributes", {})
            mf = d.get("MailFromAttributes", {})
            print(f"  {ident['IdentityName']:<28} {ident['IdentityType']:<13} verified={d.get('VerifiedForSendingStatus')} "
                  f"dkim={dkim.get('Status')} mail_from={mf.get('MailFromDomain') or '-'} ({mf.get('MailFromDomainStatus') or '-'})")
        notes = s.client("ses", region_name=region).get_identity_notification_attributes(Identities=[DOMAIN])
        n = notes.get("NotificationAttributes", {}).get(DOMAIN)
        if n:
            print(f"  feedback for {DOMAIN}: bounce={n.get('BounceTopic') or '-'} complaint={n.get('ComplaintTopic') or '-'}"
                  f" email_forwarding={n.get('ForwardingEnabled')}")
    for t in s.client("sns", region_name=REGION).list_topics().get("Topics", []):
        if TOPIC in t["TopicArn"]:
            subs = s.client("sns", region_name=REGION).list_subscriptions_by_topic(TopicArn=t["TopicArn"])["Subscriptions"]
            print(f"\ntopic {t['TopicArn']}: " + (", ".join(f"{x['Endpoint']} [{x['SubscriptionArn'][:30]}]" for x in subs) or "no subscriptions"))


def identities() -> None:
    """Create the sending subdomains in SES (Easy DKIM + custom MAIL FROM) and print the DNS records."""
    v2 = session().client("sesv2", region_name=REGION)
    rows = []
    for domain, mail_from in STREAMS.items():
        try:
            v2.get_email_identity(EmailIdentity=domain)
            print(f"{domain}: already in SES")
        except v2.exceptions.NotFoundException:
            v2.create_email_identity(EmailIdentity=domain, DkimSigningAttributes={"NextSigningKeyLength": "RSA_2048_BIT"})
            print(f"{domain}: created")
        v2.put_email_identity_mail_from_attributes(EmailIdentity=domain, MailFromDomain=mail_from,
                                                    BehaviorOnMxFailure="USE_DEFAULT_VALUE")
        d = v2.get_email_identity(EmailIdentity=domain)
        for t in d["DkimAttributes"].get("Tokens", []):
            rows.append(("CNAME", f"{t}._domainkey.{domain}", f"{t}.dkim.amazonses.com"))
        rows.append(("MX", mail_from, f"10 feedback-smtp.{REGION}.amazonses.com"))
        rows.append(("TXT", mail_from, "v=spf1 include:amazonses.com ~all"))
        # No _dmarc record needed: subdomains inherit testoza.com's DMARC policy and its reports.
    print()
    print("DNS records for Cloudflare (CNAMEs: DNS only, grey cloud):")
    for kind, name, value in rows:
        print(f"{kind:<6} {name:<62} {value}")


def setup() -> None:
    s = session()
    account = s.client("sts").get_caller_identity()["Account"]
    sns = s.client("sns", region_name=REGION)
    topic_arn = sns.create_topic(Name=TOPIC)["TopicArn"]  # idempotent
    sns.set_topic_attributes(TopicArn=topic_arn, AttributeName="Policy", AttributeValue=json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "SesPublishesFeedback", "Effect": "Allow",
            "Principal": {"Service": "ses.amazonaws.com"}, "Action": "sns:Publish", "Resource": topic_arn,
            "Condition": {"StringEquals": {"AWS:SourceAccount": account}},
        }],
    }))
    print("topic", topic_arn)

    ses = s.client("ses", region_name=REGION)
    for ident in (DOMAIN, *STREAMS):
        for kind in ("Bounce", "Complaint"):
            ses.set_identity_notification_topic(Identity=ident, NotificationType=kind, SnsTopic=topic_arn)
        print(f"{ident}: bounces and complaints → topic")

    iam = s.client("iam")
    # Create, don't look up: IAM checks a lookup by name against user/<name> (no path), which the
    # policy (users under /ses-smtp/ only) doesn't cover.
    try:
        iam.create_user(UserName=SMTP_USER, Path=SMTP_PATH)
    except iam.exceptions.EntityAlreadyExistsException:
        pass
    iam.put_user_policy(UserName=SMTP_USER, PolicyName="ses-send-raw-email", PolicyDocument=json.dumps({
        "Version": "2012-10-17",
        "Statement": [{"Effect": "Allow", "Action": "ses:SendRawEmail", "Resource": "*"}],
    }))
    lines = SECRETS.read_text(encoding="utf-8").splitlines() if SECRETS.exists() else []
    if any(l.startswith("SMTP_PASSWORD=") for l in lines):
        print(f"SMTP sign-in already in {SECRETS.name}; delete it to make a new one")
    else:
        if len(iam.list_access_keys(UserName=SMTP_USER)["AccessKeyMetadata"]) >= 2:
            sys.exit(f"{SMTP_USER} already has 2 access keys: delete one in IAM first")
        key = iam.create_access_key(UserName=SMTP_USER)["AccessKey"]
        # Since 2026-11-02 SES carries every email (automatic + broadcasts): plain SMTP_* on Cloud Run.
        lines += [f"SMTP_HOST=email-smtp.{REGION}.amazonaws.com", "SMTP_PORT=587",
                  f"SMTP_USER={key['AccessKeyId']}",
                  f"SMTP_PASSWORD={smtp_password(key['SecretAccessKey'], REGION)}",
                  "SMTP_FROM=no-reply@notify.testoza.com", "BROADCAST_FROM=nirwair@news.testoza.com"]
        print(f"SMTP sign-in for {SMTP_USER} written to {SECRETS.name}")
    lines = [l for l in lines if not l.startswith("SES_SNS_TOPIC_ARN=")] + [f"SES_SNS_TOPIC_ARN={topic_arn}"]
    SECRETS.write_text("\n".join(lines) + "\n", encoding="utf-8")


def subscribe() -> None:
    sns = session().client("sns", region_name=REGION)
    topic_arn = next(t["TopicArn"] for t in sns.list_topics()["Topics"] if t["TopicArn"].endswith(":" + TOPIC))
    sub = sns.subscribe(TopicArn=topic_arn, Protocol="https", Endpoint=ENDPOINT, ReturnSubscriptionArn=True)
    print("subscription", sub["SubscriptionArn"], "(the backend confirms it within a minute; run status)")


if __name__ == "__main__":
    commands = {"status": status, "identities": identities, "setup": setup, "subscribe": subscribe}
    parser = argparse.ArgumentParser(description="Amazon SES setup for TestoZa broadcasts")
    parser.add_argument("cmd", choices=list(commands))
    commands[parser.parse_args().cmd]()
