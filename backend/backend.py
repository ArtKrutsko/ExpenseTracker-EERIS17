from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import bcrypt
import pytesseract
import cv2
import os
import re
from datetime import datetime, timedelta

# Initialize Flask app
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://your_user:your_password@localhost/eeris'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your_secret_key'  # Change this to a strong secret key

db = SQLAlchemy(app)
jwt = JWTManager(app)

UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('user_roles.id'), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

class Receipt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    category = db.Column(db.String(50), default='Unknown', nullable=False)
    amount = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(20), default='Pending', nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    extracted_text = db.Column(db.Text, nullable=True)

class ReceiptAudit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    receipt_id = db.Column(db.Integer, db.ForeignKey('receipt.id'), nullable=False)
    supervisor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(20), nullable=False)
    action_timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    comments = db.Column(db.Text, nullable=True)

# Extract structured data from OCR
def extract_text(image_path):
    image = cv2.imread(image_path)
    text = pytesseract.image_to_string(image)

    # Extract amount (dollar currency format)
    amount_match = re.search(r"\$\s?(\d+\.\d{2})", text)
    amount = float(amount_match.group(1)) if amount_match else None

    # Extract date (MM/DD/YYYY or YYYY-MM-DD)
    date_match = re.search(r"(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{1,2}-\d{1,2})", text)
    extracted_date = date_match.group(0) if date_match else None

    # Extract possible vendor (first 3 lines)
    vendor_name = "\n".join(text.split("\n")[:3]).strip()

    return {
        "raw_text": text,
        "amount": amount,
        "date": extracted_date,
        "vendor": vendor_name
    }

@app.route('/')
def home():
    return jsonify({"message": "EERIS Backend Running"})

# Register User
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    name, email, password, role_id = data.get('name'), data.get('email'), data.get('password'), data.get('role_id')

    if not (name and email and password and role_id):
        return jsonify({"error": "All fields are required"}), 400

    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    new_user = User(name=name, email=email, password_hash=hashed_pw, role_id=role_id)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully!"})

# Login User
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email, password = data.get('email'), data.get('password')

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity={'id': user.id, 'role_id': user.role_id}, expires_delta=timedelta(hours=2))

    return jsonify({"message": "Login successful", "token": token})

# Upload receipt
@app.route('/upload-receipt', methods=['POST'])
@jwt_required()
def upload_receipt():
    if 'receipt' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['receipt']
    user = get_jwt_identity()

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    extracted_data = extract_text(file_path)

    new_receipt = Receipt(
        user_id=user['id'],
        amount=extracted_data["amount"],
        extracted_text=extracted_data["raw_text"]
    )
    db.session.add(new_receipt)
    db.session.commit()

    return jsonify({"message": "Receipt uploaded successfully!", "extracted_data": extracted_data})

if __name__ == '__main__':
    db.create_all()
    app.run(debug=True)
