import json
from datetime import datetime

# API'den gelen JSON'u parse et
api_data = json.loads(jsoninput)

# En güncel dosyayı bul (dateModified'e göre)
target_document = None
if api_data['documents']:
    # dateModified'e göre en güncel olanı bul
    target_document = max(api_data['documents'], key=lambda x: x['dateModified'])

# Eğer hiç doküman yoksa
if not target_document:
    template = {
        "image_url": "",
        "document_id": "",
        "request_id": "",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "create_in_plm": True
    }
    jsonoutput = json.dumps(template)
else:
    # Yeni format
    template = {
        "image_url": target_document['url'],
        "document_id": target_document['key'],
        "request_id": target_document['id'],
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "create_in_plm": True
    }
    jsonoutput = json.dumps(template, indent=2, ensure_ascii=False)

