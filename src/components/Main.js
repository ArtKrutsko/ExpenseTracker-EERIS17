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
        console.log(JSON.stringify(formData))
        try {
            const response = await fetch("http://localhost:3000/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                alert("Form submitted successfully!");
            } else {
                alert("Error submitting form.");
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

    return (
        <div>
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
                    <input type="file" className="input-field" />
                </div>
            </div>
            <button onClick={() => navigate("/history")} className="input-field previous-uploads-button">
                Previous Uploads
            </button>
        </div>
    );
};

export default Main;
