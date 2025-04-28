import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/styles.css";

const categoryOptions = {
    groceries: ["Vegetables", "Meat", "Dairy"],
    gas: ["Regular", "Premium", "Diesel"],
    furniture: ["Chairs", "Tables", "Beds"]
};

const Main = () => {
    const [formData, setFormData] = useState({
        category: "groceries",
        subcategory: "Vegetables",
        store: "",
        items: []
    });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log(formData);
        try {
            const response = await fetch("http://127.0.0.1:5000/manual-receipt", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(formData)
            });
    
            if (response.ok) {
                alert("Expense submitted successfully!");
                window.location.reload();
            } else {
                const errorText = await response.text();
                console.log('Backend error:', errorText);
                alert("Error submitting expense.");
            }
        } catch (error) {
            alert("Failed to connect to the server.");
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const addNewItem = () => {
        setFormData({ ...formData, items: [...formData.items, { name: "", amount: "" }] });
    };

    const uploadReceipt = async (file) => {
        if (!file) return;

        const formData = new FormData();
        formData.append("receipt", file);

        try {
            const response = await fetch("http://127.0.0.1:5000/upload-receipt", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                alert("Receipt uploaded successfully!");
                // Autofill the form with extracted data
                setFormData((prevData) => ({
                    ...prevData,
                    store: data.extracted_data.vendor || "",
                    items: [{
                        name: "Extracted Item",  
                        amount: data.extracted_data.amount || ""
                    }]
                }));
                
            } else {
                alert("Upload failed: " + data.error);
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Error uploading receipt.");
        }
    };


        // Fetch Audit Logs
    const fetchAuditLogs = async () => {
        try {
            const response = await fetch("http://127.0.0.1:5000/audit-logs", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            const data = await response.json();
            console.log(data.audit_logs);
            alert(JSON.stringify(data.audit_logs, null, 2));
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        }
    };

    // Change Password
    const changePassword = async (currentPassword, newPassword) => {
        try {
            const response = await fetch("http://127.0.0.1:5000/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            const data = await response.json();
            if (response.ok) {
                alert(data.message);
            } else {
                alert("Error: " + data.error);
            }
        } catch (error) {
            console.error("Password change error:", error);
        }
    };
    
    return (
        <div>
            <div className="logout-container">
                <button 
                    className="logout-button"
                    onClick={() => {
                        localStorage.removeItem("token");
                        navigate("/");
                    }}
                >
                    Logout
                </button>
            </div>

            <div className="main-container">
                <div className="form-section">
                    <h2>Expense Form</h2>
                    <form onSubmit={handleSubmit}>
                        <label htmlFor="category">Category</label>
                        <select 
                            id="category" 
                            className="input-field" 
                            value={formData.category} 
                            onChange={(e) => setFormData({ 
                                ...formData, 
                                category: e.target.value, 
                                subcategory: categoryOptions[e.target.value][0] 
                            })}
                        >
                            {Object.keys(categoryOptions).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        <label htmlFor="subcategory">Subcategory</label>
                        <select
                            id="subcategory"
                            className="input-field"
                            value={formData.subcategory}
                            onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                        >
                            {categoryOptions[formData.category].map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>

                        <label htmlFor="store">Store Name</label>
                        <input 
                            type="text" 
                            id="store" 
                            className="input-field" 
                            placeholder="Enter store name" 
                            value={formData.store} 
                            onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                            required 
                        />

                        <label>Receipt Items</label>
                        <div className="items-container">
                            {formData.items.map((item, index) => (
                                <div key={index} className="item-row">
                                    <input
                                        type="text"
                                        className="input-field item-name"
                                        placeholder="Item Name"
                                        value={item.name}
                                        onChange={(e) => handleItemChange(index, "name", e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        className="input-field item-amount"
                                        placeholder="Amount"
                                        value={item.amount}
                                        onChange={(e) => handleItemChange(index, "amount", e.target.value)}
                                    />
                                </div>
                            ))}
                            <button type="button" onClick={addNewItem} className="add-item-button">Add Item</button>
                        </div> 

                        <button type="submit">Submit</button>
                    </form>
                </div>
                <div className="upload-section">
                    <h2>Upload File</h2>
                    <input type="file" className="input-field" onChange={(e) => uploadReceipt(e.target.files[0])} />
                </div>
            </div>
            <button onClick={() => navigate("/history")} className="input-field previous-uploads-button">
                Previous Uploads
            </button>
                        {localStorage.getItem("role") === "admin" && (
                <button 
                    className="input-field previous-uploads-button"
                    onClick={() => navigate("/admin")}
                >
                    Admin Panel
                </button>
            )}

        </div>
    );
};

export default Main;
