from flask import Flask
app = Flask(__name__)

@app.get("/items")
def items():
    return {"items": []}
