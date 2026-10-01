import urllib.request, ssl, json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

api_key = 'Zainab$1212Noor@1212'

for integ in ['BAILEYS', 'WHATSAPP-BAILEYS', 'whatsapp-baileys', 'baileys']:
    try:
        create_data = json.dumps({
            'instanceName': 'qwalify-main',
            'token': 'qwalify-secret-token',
            'qrcode': True,
            'integration': integ
        }).encode('utf-8')

        create_req = urllib.request.Request(
            'https://127.0.0.1/instance/create',
            data=create_data,
            headers={
                'apikey': api_key,
                'Host': 'api.nexwa.online',
                'Content-Type': 'application/json'
            }
        )
        with urllib.request.urlopen(create_req, context=ctx) as r:
            print(f'SUCCESS with integration={integ}:', r.status)
            print(r.read().decode()[:200])
            break
    except urllib.error.HTTPError as e:
        print(f'Failed for {integ}:', e.code, e.read().decode())
