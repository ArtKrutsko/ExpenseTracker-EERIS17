import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Plot from "react-plotly.js";
import "../styles/history.css";
import ReceiptTile from "./ReceiptTile";


const categoryColors = {
    groceries: "#d4edda",
    gas: "#d1ecf1",
    furniture: "#fff3cd"
};
const categoryColorsPie = {
    groceries: "#8bc34a",    // darker green
    gas: "#03a9f4",          // darker blue
    furniture: "#ff9800"     // darker orange
};


const History = () => {
    const [receipts, setReceipts] = useState([]);
    const [categoryData, setCategoryData] = useState(null);
    const [storeData, setStoreData] = useState(null);
    const [storeCategories, setStoreCategories] = useState(null);
    const [userTotals, setUserTotals] = useState(null);
    const [isSupervisor, setIsSupervisor] = useState(false);

    const navigate = useNavigate();

    // TODO: write API request to database. Sample below:
    
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
                setReceipts(data.receipts);
                setIsSupervisor(data.role === "supervisor");
                if (data.user_totals) { // ✅ Supervisor-only extra chart
                    setUserTotals(data.user_totals);
                }
            } else {
                console.error("Failed to fetch receipts");
            }
        } catch (error) {
            console.error("Error fetching receipts:", error);
        }
    };

    
    useEffect(() => {
    
        const fetchStatistics = async () => {
            try {
                const response = await fetch("http://127.0.0.1:5000/statistics", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setCategoryData(data.category_totals);
                    if (data.store_totals) {
                        setStoreData(data.store_totals);
                        setStoreCategories(data.store_main_categories);  // NEW
                    }
                } else {
                    console.error("Failed to fetch statistics");
                }
            } catch (error) {
                console.error("Error fetching statistics:", error);
            }
        };

        fetchReceipts();
        fetchStatistics();
    }, []);



    // const localUser = parseInt(localStorage.getItem("userId"), 10);
    console.log(localStorage.getItem("token"))

    return (
        <div>
            <div className="history-container">
                <div className="history-left">
                    <h2>Previous Uploads</h2>
                    <div className="receipts-listt">
                        {receipts.length > 0 ? (
                            receipts.map((receipt) => (
                                <ReceiptTile 
                                    key={receipt.id} 
                                    receipt={receipt} 
                                    isSupervisor
                                    refreshReceipts={fetchReceipts} 
                                />
                            ))
                        ) : (
                            <p>No receipts found.</p>
                        )}
                    </div>
                </div>
                <div className="history-right">
                    <h2>Statistics</h2>

                    {categoryData && (
                        <Plot
                            data={[
                                {
                                    type: 'pie',
                                    labels: Object.keys(categoryData),
                                    values: Object.values(categoryData),
                                    hole: 0.3,
                                    marker: {
                                        colors: Object.keys(categoryData).map(category =>
                                            categoryColorsPie[category.toLowerCase()] || "#c0c0c0"  // fallback color darker
                                        ),
                                        line: {
                                            color: 'black',
                                            width: 2
                                        }
                                    },  
                                    hoverinfo: 'label+percent+value'
                                }
                            ]}
                            layout={{
                                title: 'Spending by Category',
                                margin: { t: 50, l: 10, r: 10, b: 10 },
                                autosize: true,
                                legend: { orientation: "h", y: -0.2 },
                                paper_bgcolor: "rgba(0,0,0,0)",
                                plot_bgcolor: "rgba(0,0,0,0)"
                            }}
                            useResizeHandler={true}
                            style={{ width: "100%", height: "300px" }}
                            config={{ displayModeBar: false }}
                        />
                    )}

                    {storeData && storeCategories && (
                        <Plot
                            data={[
                                {
                                    type: 'bar',
                                    x: Object.keys(storeData),
                                    y: Object.values(storeData),
                                    marker: {
                                        color: Object.keys(storeData).map(store =>
                                            categoryColorsPie[
                                                storeCategories[store]?.toLowerCase() || "unknown"
                                            ] || "#c0c0c0"
                                        ),
                                        line: {
                                            color: 'black',
                                            width: 2
                                        }
                                    }
                                }
                            ]}
                            layout={{
                                title: 'Total Spendings by Store',
                                margin: { t: 50, l: 30, r: 10, b: 50 },
                                autosize: true,
                                xaxis: {
                                    title: "Stores",
                                    tickangle: -45,
                                    automargin: true
                                },
                                yaxis: {
                                    title: "Amount ($)",
                                },
                                paper_bgcolor: "rgba(0,0,0,0)",
                                plot_bgcolor: "rgba(0,0,0,0)",
                                bargap: 0.3
                            }}
                            useResizeHandler={true}
                            style={{ width: "100%", height: "300px" }}
                            config={{ displayModeBar: false }}
                        />
                    )}

                    {userTotals && (
                        <Plot
                            data={[
                                {
                                    type: 'pie',
                                    labels: Object.keys(userTotals),
                                    values: Object.values(userTotals),
                                    textinfo: "label+percent",
                                    insidetextorientation: "radial",
                                    marker: {
                                        line: {
                                            color: 'black',
                                            width: 2
                                        }
                                    }
                                }
                            ]}
                            layout={{
                                title: 'Spending by Users',
                                autosize: true,
                                margin: { t: 50, l: 30, r: 10, b: 50 },
                                paper_bgcolor: "rgba(0,0,0,0)",
                                plot_bgcolor: "rgba(0,0,0,0)",
                            }}
                            useResizeHandler={true}
                            style={{ width: "100%", height: "300px" }}
                            config={{ displayModeBar: false }}
                        />
                    )}



                </div>
            </div>
            <button onClick={() => navigate("/main")} className="input-field previous-uploads-button">
                Go to upload page
            </button>
        </div>
    );
};

export default History;
