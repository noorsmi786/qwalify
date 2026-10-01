import urllib.request, ssl, json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(
    'https://127.0.0.1/instance/fetchInstances',
    headers={'apikey': 'Zainab$1212Noor@1212', 'Host': 'api.nexwa.online'}
)

try:
    with urllib.request.urlopen(req, context=ctx) as r:
        print('HTTP Status:', r.status)
        print('Response:', r.read().decode())
except Exception as e:
    print('Error:', e)
