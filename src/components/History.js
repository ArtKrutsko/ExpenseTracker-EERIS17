import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/history.css";

let sampleObject = [
    {
      "id": 1,
      "user": 101,
      "uploadDate": "2025-03-10T14:30:00Z",
      "amount": "13.99",
      "category": "groceries",
      "storeName": "Publix"
    },
    {
      "id": 2,
      "user": 102,
      "uploadDate": "2025-03-12T09:15:00Z",
      "amount": "45.50",
      "category": "gas",
      "storeName": "Shell"
    },
    {
      "id": 3,
      "user": 101,
      "uploadDate": "2025-03-08T18:45:00Z",
      "amount": "299.99",
      "category": "furniture",
      "storeName": "IKEA"
    },
    {
      "id": 4,
      "user": 101,
      "uploadDate": "2025-03-14T12:00:00Z",
      "amount": "22.89",
      "category": "groceries",
      "storeName": "Whole Foods"
    },
    {
      "id": 5,
      "user": 101,
      "uploadDate": "2025-03-15T16:20:00Z",
      "amount": "59.99",
      "category": "gas",
      "storeName": "BP"
    }
  ]

const categoryColors = {
    groceries: "#d4edda",
    gas: "#d1ecf1",
    furniture: "#fff3cd"
};

const ReceiptTile = ({ receipt }) => {
    const formattedDate = new Date(receipt.uploadDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    return (
        <div className="receipt-tile" style={{ backgroundColor: categoryColors[receipt.category] || "#f8f9fa" }}>
            <div className="receipt-header">
                <span className="receipt-id">#{receipt.id}</span>
                <span className="receipt-date">{formattedDate}</span>
            </div>
            <div className="receipt-store">
                <strong>{receipt.storeName}</strong>
            </div>
            <div className="receipt-amount">
                <span>${receipt.amount}</span>
            </div>
        </div>
    );
};

const History = () => {
    const [receipts, setReceipts] = useState([]);
    const navigate = useNavigate();

    // TODO: write API request to database. Sample below:
    
    
    useEffect(() => {
        const fetchReceipts = async () => {
            try {
                // const response = await fetch("http://localhost:3000/receipts");
                let response = sampleObject
                setReceipts(sampleObject)
                
                if (response.ok) {
                    const data = await response.json();
                    setReceipts(data);
                } else {
                    console.error("Failed to fetch uploads");
                }
            } catch (error) {
                console.error("Error fetching uploads:", error);
            }
        };

        fetchReceipts();
    }, []);

    const localUser = parseInt(localStorage.getItem("userId"), 10);
    const userReceipts = receipts.filter((receipt) => receipt.user === localUser);


    return (
        <div>
            <div className="history-container">
                <div className="history-left">
                    <h2>Previous Uploads</h2>
                    <div className="receipts-listt">
                        {userReceipts.length > 0 ? (
                            userReceipts.map((receipt) => <ReceiptTile key={receipt.id} receipt={receipt} />)
                        ) : (
                            <p>No receipts found.</p>
                            // TODO: once the receipt is clicked it will expand to show all items
                        )}
                    </div>
                </div>
                <div className="history-right">
                    <h2>Statistics</h2>
                    {/* we will decide what graphs/stats to insert here */}
                </div>
            </div>
            <button onClick={() => navigate("/main")} className="input-field previous-uploads-button">
                Go to upload page
            </button>
        </div>
    );
};

export default History;
