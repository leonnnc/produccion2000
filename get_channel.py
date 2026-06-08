import urllib.request, re
try:
    html = urllib.request.urlopen('https://www.youtube.com/@CatedraldeFeCDF').read().decode('utf-8')
    m = re.search(r'\"externalId\":\"(UC[a-zA-Z0-9_-]+)\"', html)
    print(m.group(1) if m else 'Not found')
except Exception as e:
    print(e)
