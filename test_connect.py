import urllib.request, ssl, json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

api_key = 'Zainab$1212Noor@1212'

connect_req = urllib.request.Request(
    'https://127.0.0.1/instance/connect/qwalify-main',
    headers={'apikey': api_key, 'Host': 'api.nexwa.online'}
)

try:
    with urllib.request.urlopen(connect_req, context=ctx) as r:
        print('Connect Status:', r.status)
        resp = json.loads(r.read().decode())
        print('QR Code available:', 'base64' in resp or 'code' in resp)
        print('Keys in response:', list(resp.keys()))
except Exception as e:
    print('Connect Error:', e)
