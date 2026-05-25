import os, sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)
port = int(os.environ.get('PORT', 3456))
HTTPServer(('', port), SimpleHTTPRequestHandler).serve_forever()
