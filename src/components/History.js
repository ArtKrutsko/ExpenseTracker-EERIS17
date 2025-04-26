import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/history.css";


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
                const response = await fetch("http://127.0.0.1:5000/fetch-receipts", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    }
                });
    
                if (response.ok) {
                    const data = await response.json();
                    setReceipts(data);
                    console.log(data);
                } else {
                    console.error("Failed to fetch receipts");
                }
            } catch (error) {
                console.error("Error fetching receipts:", error);
            }
        };
    
        fetchReceipts();
    }, []);

    const localUser = parseInt(localStorage.getItem("userId"), 10);


    return (
        <div>
            <div className="history-container">
                <div className="history-left">
                    <h2>Previous Uploads</h2>
                    <div className="receipts-listt">
                        {receipts.length > 0 ? (
                            receipts.map((receipt) => <ReceiptTile key={receipt.id} receipt={receipt} />)
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
