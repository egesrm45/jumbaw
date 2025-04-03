import requests
from bs4 import BeautifulSoup
import json
import sys

def validate_tc_identity(tc_no, first_name, last_name, year_of_birth):
    """
    TC kimlik numarası doğrulama fonksiyonu.
    """
    try:
        # TC kimlik numarası algoritma kontrolü
        if not validate_tc_algorithm(tc_no):
            return {"success": False, "message": "TC kimlik algoritma kontrolü başarısız"}

        # NVI (Nüfus ve Vatandaşlık İşleri) servisi URL
        url = "https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx"

        # SOAP request
        headers = {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'http://tckimlik.nvi.gov.tr/WS/TCKimlikNoDogrula'
        }

        body = f"""<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <TCKimlikNoDogrula xmlns="http://tckimlik.nvi.gov.tr/WS">
      <TCKimlikNo>{tc_no}</TCKimlikNo>
      <Ad>{first_name.upper()}</Ad>
      <Soyad>{last_name.upper()}</Soyad>
      <DogumYili>{year_of_birth}</DogumYili>
    </TCKimlikNoDogrula>
  </soap12:Body>
</soap12:Envelope>"""

        response = requests.post(url, headers=headers, data=body.encode('utf-8'), verify=True, timeout=30)

        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'lxml-xml')
            result = soup.find('TCKimlikNoDogrulaResult')

            if result and result.text.lower() == 'true':
                return {"success": True, "message": "TC kimlik doğrulama başarılı"}
            else:
                return {"success": False, "message": "TC kimlik bilgileri eşleşmiyor"}
        else:
            return {"success": False, "message": f"Servis hatası: {response.status_code}"}

    except Exception as e:
        return {"success": False, "message": f"Doğrulama hatası: {str(e)}"}

def validate_tc_algorithm(tc_no):
    """
    TC kimlik numarası algoritma kontrolü
    """
    if not tc_no.isdigit() or len(tc_no) != 11 or tc_no[0] == '0':
        return False

    digits = [int(d) for d in tc_no]

    # 10. hane kontrolü
    odd_sum = sum(digits[0:9:2])
    even_sum = sum(digits[1:8:2])
    tenth_digit = (odd_sum * 7 - even_sum) % 10

    if tenth_digit != digits[9]:
        return False

    # 11. hane kontrolü
    if sum(digits[:10]) % 10 != digits[10]:
        return False

    return True

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print(json.dumps({"success": False, "message": "Eksik parametre"}))
        sys.exit(1)

    result = validate_tc_identity(
        sys.argv[1],  # tc_no
        sys.argv[2],  # first_name
        sys.argv[3],  # last_name
        sys.argv[4]   # year_of_birth
    )
    print(json.dumps(result))