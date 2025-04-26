from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
import bcrypt
import pytesseract
import cv2
import os
import re
from datetime import datetime, timedelta

# Set JWT token to expire in 1 day

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)

app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:rhenmrj@localhost/eeris'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your_secret_key'
app.config['JWT_IDENTITY_CLAIM'] = 'identity'

db = SQLAlchemy(app)
jwt = JWTManager(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Models
class UserRole(db.Model):
    __tablename__ = 'user_roles'
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(20), unique=True, nullable=False)
    description = db.Column(db.Text)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('user_roles.id'), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

class Receipt(db.Model):
    __tablename__ = 'receipts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    category = db.Column(db.String(50), default='Unknown', nullable=False)
    amount = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(20), default='Pending', nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    extracted_text = db.Column(db.Text)
    store_name = db.Column(db.String(50), default='Unknown')

class ReceiptItem(db.Model):
    __tablename__ = 'receipt_items'
    id = db.Column(db.Integer, primary_key=True)
    receipt_id = db.Column(db.Integer, db.ForeignKey('receipts.id', ondelete="CASCADE"), nullable=False)
    item_name = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)

class ReceiptAudit(db.Model):
    __tablename__ = 'receipt_audit'
    id = db.Column(db.Integer, primary_key=True)
    receipt_id = db.Column(db.Integer, db.ForeignKey('receipts.id', ondelete="CASCADE"), nullable=False)
    supervisor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete="SET NULL"))
    action = db.Column(db.String(20), nullable=False)
    action_timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    comments = db.Column(db.Text)

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
        store_name=extracted_data["vendor"],
    )
    db.session.add(new_receipt)
    db.session.commit()

    return jsonify({"message": "Receipt uploaded successfully!", "extracted_data": extracted_data})


@app.route('/manual-receipt', methods=['POST'])
@jwt_required()
def create_receipt_with_items():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Invalid or missing JSON data"}), 400

    user_id = int(get_jwt_identity())

    # ✅ Safely filter items before processing
    items = data.get('items', [])
    valid_items = [
        item for item in items
        if item.get('amount') not in [None, '', 0]
    ]

    # ✅ Sum only valid items
    total_amount = sum(
        float(item['amount']) for item in valid_items
    )

    # 1. Insert new Receipt record
    new_receipt = Receipt(
        user_id=user_id,
        store_name=data.get('store'),
        category=data.get('category'),
        amount=total_amount
    )
    db.session.add(new_receipt)
    db.session.flush()  # Get new_receipt.id before inserting items

    # 2. Insert Receipt Items
    for item in valid_items:
        receipt_item = ReceiptItem(
            receipt_id=new_receipt.id,
            item_name=item.get('name', 'Unknown Item'),
            amount=float(item.get('amount'))
        )
        db.session.add(receipt_item)

    # 3. Commit everything
    db.session.commit()

    return jsonify({"message": "Receipt and items submitted successfully!"}), 201


@app.route('/fetch-receipts', methods=['GET'])
@jwt_required()
def fetch_receipts():
    identity = get_jwt_identity()
    user_id = int(identity)

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    role = UserRole.query.get(user.role_id)
    if not role:
        return jsonify({"error": "User role not found"}), 404

    if role.role.lower() == 'supervisor':
        receipts = Receipt.query.all()
    else:
        receipts = Receipt.query.filter_by(user_id=user_id).all()

    receipt_list = [{
        "id": receipt.id,
        "user": receipt.user_id,
        "uploadDate": receipt.uploaded_at.isoformat(),
        "amount": str(receipt.amount) if receipt.amount else "0.00",
        "category": receipt.category,
        "storeName": receipt.store_name or "Unknown Store",
        "status": receipt.status
    } for receipt in receipts]

    return jsonify({
        "receipts": receipt_list,
        "role": role.role.lower()
    }), 200


@app.route('/statistics', methods=['GET'])
@jwt_required()
def get_statistics():
    identity = get_jwt_identity()
    user_id = int(identity)

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    role = UserRole.query.get(user.role_id)
    if not role:
        return jsonify({"error": "User role not found"}), 404

    # Supervisor sees all receipts, employee sees only their own
    if role.role.lower() == 'supervisor':
        receipts = Receipt.query.all()
    else:
        receipts = Receipt.query.filter_by(user_id=user_id).all()

    # ✅ EXCLUDE rejected receipts from calculations
    valid_receipts = [r for r in receipts if r.status.lower() != 'rejected']

    # Group and Sum by Category
    category_totals = {}
    for r in valid_receipts:
        if r.category not in category_totals:
            category_totals[r.category] = 0.0
        if r.amount:
            category_totals[r.category] += float(r.amount)

    response = {
        "category_totals": category_totals
    }

    # Supervisor extras: by store and by user
    if role.role.lower() == 'supervisor':
        # Group and Sum by Store
        store_totals = {}
        store_categories = {}

        for r in valid_receipts:
            store = r.store_name or "Unknown Store"
            if store not in store_totals:
                store_totals[store] = 0.0
                store_categories[store] = {}

            if r.amount:
                store_totals[store] += float(r.amount)

                cat = r.category
                if cat not in store_categories[store]:
                    store_categories[store][cat] = 0.0
                store_categories[store][cat] += float(r.amount)

        # Find the main (max) category for each store
        store_main_categories = {}
        for store, cats in store_categories.items():
            if cats:  # ✅ only if there are categories
                main_cat = max(cats.items(), key=lambda x: x[1])[0]
                store_main_categories[store] = main_cat
            else:
                store_main_categories[store] = "unknown"  # ✅ fallback if no categories

        response["store_totals"] = store_totals
        response["store_main_categories"] = store_main_categories

    # ✅ NEW: Group and Sum by User
    user_totals = {}
    for r in valid_receipts:
        user_obj = User.query.get(r.user_id)
        user_name = user_obj.name if user_obj else "Unknown User"

        if user_name not in user_totals:
            user_totals[user_name] = 0.0
        if r.amount:
            user_totals[user_name] += float(r.amount)

    response["user_totals"] = user_totals

    return jsonify(response), 200


@app.route('/receipt-details/<int:receipt_id>', methods=['GET'])
@jwt_required()
def get_receipt_details(receipt_id):
    receipt = Receipt.query.get(receipt_id)

    if not receipt:
        return jsonify({"error": "Receipt not found"}), 404

    # Fetch items
    items = ReceiptItem.query.filter_by(receipt_id=receipt_id).all()

    # Fetch user who submitted
    user = User.query.get(receipt.user_id)

    return jsonify({
        "items": [{"item_name": item.item_name, "amount": str(item.amount)} for item in items],
        "user_name": user.name if user else "Unknown User"
    }), 200

@app.route('/update-receipt-status/<int:receipt_id>', methods=['POST'])
@jwt_required()
def update_receipt_status(receipt_id):
    data = request.get_json()
    new_status = data.get('status')

    if new_status not in ['Approved', 'Rejected']:
        return jsonify({"error": "Invalid status"}), 400

    receipt = Receipt.query.get(receipt_id)
    if not receipt:
        return jsonify({"error": "Receipt not found"}), 404

    receipt.status = new_status
    db.session.commit()

    return jsonify({"message": f"Receipt status updated to {new_status}!"}), 200



# App Runner
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
