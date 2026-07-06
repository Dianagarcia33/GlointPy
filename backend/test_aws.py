import sys
from src.core.config import settings
print(f"AWS_ACCESS_KEY_ID: {settings.AWS_ACCESS_KEY_ID}")
try:
    import boto3
    textract = boto3.client('textract', region_name='us-east-1')
    print("Boto3 Textract client created successfully.")
except Exception as e:
    print(f"Boto3 error: {e}")
