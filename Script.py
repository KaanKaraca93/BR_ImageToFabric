import json

# API'den gelen JSON'u parse et
api_data = json.loads(jsoninput)

# Approved olan ve Sezon bilgisi olan dosyaları filtrele
approved_docs = []
for doc in api_data['documents']:
    if (doc['attributes']['File_Status'] == 'Approved' and 
        doc['attributes']['Sezon'] is not None):
        approved_docs.append(doc)

# En güncel dosyayı bul (dateModified'e göre)
target_document = None
if approved_docs:
    # dateModified'e göre sırala (en büyük = en güncel)
    latest_doc = max(approved_docs, key=lambda x: x['dateModified'])
    target_document = latest_doc

# Eğer uygun dosya bulunamazsa
if not target_document:
    template = {
        "season": "",
        "excelUrl": ""
    }
    jsonoutput = json.dumps(template)
else:
    # Heroku'ya gönderilecek format
    template = {
        "season": target_document['attributes']['Sezon'],
        "excelUrl": target_document['url']
    }
    jsonoutput = json.dumps(template, indent=2, ensure_ascii=False)