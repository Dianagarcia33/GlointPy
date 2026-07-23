import py_compile

files_to_check = [
    "backend/src/api/v1/endpoints/investments.py",
    "backend/src/services/investment_request_service.py"
]

for f in files_to_check:
    try:
        py_compile.compile(f, doraise=True)
        print(f"✓ {f} compiles clean!")
    except Exception as e:
        print(f"✗ {f} compilation error: {e}")
