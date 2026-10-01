import urllib.request, ssl, json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

api_key = 'Zainab$1212Noor@1212'
instance_name = 'qwalify-main'

# 1. Create Instance
create_data = json.dumps({
    'instanceName': instance_name,
    'qrcode': True,
    'integration': 'WHATSAPP_BAILEYS'
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

try:
    with urllib.request.urlopen(create_req, context=ctx) as r:
        print('Create Status:', r.status)
        print('Create Response:', r.read().decode())
except Exception as e:
    print('Create Note:', e)

# 2. Fetch Connect QR
connect_req = urllib.request.Request(
    f'https://127.0.0.1/instance/connect/{instance_name}',
    headers={'apikey': api_key, 'Host': 'api.nexwa.online'}
)

try:
    with urllib.request.urlopen(connect_req, context=ctx) as r:
        print('Connect Status:', r.status)
        resp = json.loads(r.read().decode())
        if 'base64' in resp or 'code' in resp:
            print('SUCCESS: QR Code generated and available!')
        else:
            print('Connect Response:', resp)
except Exception as e:
    print('Connect Error:', e)
