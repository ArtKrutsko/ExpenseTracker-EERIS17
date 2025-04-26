from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS  # ✅ NEW: Allow cross-origin requests
import bcrypt
import pytesseract
import cv2
import os
import re
from datetime import datetime, timedelta

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)  # ✅ NEW: Enable CORS so frontend can reach backend

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:rhenmrj@localhost/eeris'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your_secret_key'
app.config['JWT_IDENTITY_CLAIM'] = 'identity'


db = SQLAlchemy(app)
jwt = JWTManager(app)

UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Models
class UserRole(db.Model):
    __tablename__ = 'user_roles'
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(20), unique=True, nullable=False)
    description = db.Column(db.Text)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('user_roles.id'), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

class Receipt(db.Model):
    __tablename__ = 'receipts'   # <-- ADD this
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    category = db.Column(db.String(50), default='Unknown', nullable=False)
    amount = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(20), default='Pending', nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    extracted_text = db.Column(db.Text, nullable=True)
    store_name = db.Column(db.String(50), default='Unknown')


class ReceiptAudit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    receipt_id = db.Column(db.Integer, db.ForeignKey('receipt.id'), nullable=False)
    supervisor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(20), nullable=False)
    action_timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    comments = db.Column(db.Text, nullable=True)

class Expense(db.Model):
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer)
    store = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    subcategory = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class ExpenseItem(db.Model):
    __tablename__ = 'expense_items'
    
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expenses.id', ondelete="CASCADE"), nullable=False)
    item_name = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)

# OCR text extractor
def extract_text(image_path):
    image = cv2.imread(image_path)
    text = pytesseract.image_to_string(image)

    amount_match = re.search(r"\$\s?(\d+\.\d{2})", text)
    amount = float(amount_match.group(1)) if amount_match else None

    date_match = re.search(r"(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{1,2}-\d{1,2})", text)
    extracted_date = date_match.group(0) if date_match else None

    vendor_name = "\n".join(text.split("\n")[:3]).strip()

    return {
        "raw_text": text,
        "amount": amount,
        "date": extracted_date,
        "vendor": vendor_name
    }

# Routes
@app.route('/')
def home():
    return jsonify({"message": "EERIS Backend Running"})

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

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email, password = data.get('email'), data.get('password')

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user.id))

    return jsonify({"message": "Login successful", "token": token})

@app.route('/upload-receipt', methods=['POST'])
@jwt_required()
def upload_receipt():
    if 'receipt' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['receipt']
    user_id = int(get_jwt_identity())

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    extracted_data = extract_text(file_path)

    new_receipt = Receipt(
        user_id=user_id,
        amount=extracted_data["amount"],
        extracted_text=extracted_data["raw_text"],
        store_name=extracted_data["vendor"],  # ✅ Save the vendor as store name
    )
    db.session.add(new_receipt)
    db.session.commit()

    return jsonify({"message": "Receipt uploaded successfully!", "extracted_data": extracted_data})


@app.route('/expenses', methods=['POST'])
@jwt_required()
def create_expense():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Invalid or missing JSON data"}), 400
    # Get the user info from JWT token
    user_id = get_jwt_identity()

    # 1. Insert new Expense record
    expense = Expense(
        user_id=int(user_id),  # <--- cast back to int
        store=data.get('store'),
        category=data.get('category'),
        subcategory=data.get('subcategory')
    )

    db.session.add(expense)
    db.session.flush()  # flush to get expense.id before inserting items

    # 2. Insert each item linked to that expense
    items = data.get('items', [])
    for item in items:
        expense_item = ExpenseItem(
            expense_id=expense.id,
            item_name=item.get('name'),
            amount=float(item.get('amount'))  # careful: convert string to float
        )
        db.session.add(expense_item)

    # 3. Finalize transaction
    db.session.commit()

    return jsonify({"message": "Expense submitted successfully!"}), 201

@app.route('/fetch-receipts', methods=['GET'])
@jwt_required()
def fetch_receipts():
    identity = get_jwt_identity()
    user_id = int(identity)  # Assuming now JWT identity is just user id

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    role = UserRole.query.get(user.role_id)
    if not role:
        return jsonify({"error": "User role not found"}), 404

    # Supervisor sees all receipts, Employee sees only their own
    if role.role.lower() == 'supervisor':
        receipts = Receipt.query.all()
    else:
        receipts = Receipt.query.filter_by(user_id=user_id).all()

    receipt_list = []
    for receipt in receipts:
        receipt_list.append({
            "id": receipt.id,
            "user": receipt.user_id,
            "uploadDate": receipt.uploaded_at.isoformat(),
            "amount": str(receipt.amount) if receipt.amount else "0.00",
            "category": receipt.category,
            "storeName": receipt.store_name if receipt.store_name else "Unknown Store"  # ✅ Use real store name
        })

    return jsonify(receipt_list), 200

# App Runner
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
